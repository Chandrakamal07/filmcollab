-- ======================================================================================
-- FilmCollab R9 Security, Schema & Trigger Remediation
-- Migration: 20261110000000_r9_ticket_project_and_crypto_remediation.sql
--
-- R9-01: Separate ticket_messages vs ticket_updates author triggers:
--        - ticket_messages does NOT contain author_name; row access was crashing with 42703
--        - Narrow UPDATE immutability to allow legitimate ON DELETE SET NULL FK cleanup
--          when an author profile is deleted by an admin.
-- R9-02: Fix log_project_member_event on project deletion CASCADE:
--        - Check IF EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id)
--          before inserting a member rejection event, avoiding FK violation 23503.
-- ======================================================================================

-- 1. R9-01: Table-specific trigger function for ticket_messages
CREATE OR REPLACE FUNCTION public.normalize_ticket_message_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_auth_id UUID;
    v_caller_prof_id UUID;
BEGIN
    v_caller_auth_id := auth.uid();

    IF v_caller_auth_id IS NOT NULL THEN
        SELECT id
        INTO v_caller_prof_id
        FROM public.profiles
        WHERE user_id = v_caller_auth_id OR id = v_caller_auth_id
        ORDER BY CASE WHEN user_id = v_caller_auth_id THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;

    IF TG_OP = 'UPDATE' AND v_caller_auth_id IS NOT NULL THEN
        IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
            -- Allow legitimate ON DELETE SET NULL referential cleanup when the old profile is deleted
            IF NEW.author_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.author_id) THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Ticket author_id cannot be reassigned' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    -- When executed by an authenticated user on INSERT, strictly bind author_id to caller profile
    IF TG_OP = 'INSERT' AND v_caller_auth_id IS NOT NULL THEN
        NEW.author_id := COALESCE(v_caller_prof_id, v_caller_auth_id);
    END IF;

    RETURN NEW;
END;
$$;

-- 2. R9-01: Table-specific trigger function for ticket_updates (has author_name column)
CREATE OR REPLACE FUNCTION public.normalize_ticket_update_author()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_auth_id UUID;
    v_caller_prof_id UUID;
    v_caller_name TEXT;
BEGIN
    v_caller_auth_id := auth.uid();

    IF v_caller_auth_id IS NOT NULL THEN
        SELECT id, COALESCE(NULLIF(BTRIM(full_name), ''), NULLIF(BTRIM(username), ''), 'Support Agent')
        INTO v_caller_prof_id, v_caller_name
        FROM public.profiles
        WHERE user_id = v_caller_auth_id OR id = v_caller_auth_id
        ORDER BY CASE WHEN user_id = v_caller_auth_id THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;

    IF TG_OP = 'UPDATE' AND v_caller_auth_id IS NOT NULL THEN
        IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
            -- Allow legitimate ON DELETE SET NULL referential cleanup when the old profile is deleted
            IF NEW.author_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.author_id) THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Ticket author_id cannot be reassigned' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    -- When executed by an authenticated user/staff on INSERT, strictly bind author_id and author_name
    IF TG_OP = 'INSERT' AND v_caller_auth_id IS NOT NULL THEN
        NEW.author_id := COALESCE(v_caller_prof_id, v_caller_auth_id);
        IF NEW.author_name IS NULL OR BTRIM(NEW.author_name) = '' THEN
            NEW.author_name := v_caller_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Keep legacy normalize_ticket_author_reference delegating cleanly by table name
CREATE OR REPLACE FUNCTION public.normalize_ticket_author_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'ticket_messages' THEN
        RETURN public.normalize_ticket_message_author();
    ELSE
        RETURN public.normalize_ticket_update_author();
    END IF;
END;
$$;

-- Reattach triggers to dedicated functions
DROP TRIGGER IF EXISTS trg_normalize_ticket_message_author ON public.ticket_messages;
CREATE TRIGGER trg_normalize_ticket_message_author
BEFORE INSERT OR UPDATE ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.normalize_ticket_message_author();

DROP TRIGGER IF EXISTS trg_normalize_ticket_update_author ON public.ticket_updates;
CREATE TRIGGER trg_normalize_ticket_update_author
BEFORE INSERT OR UPDATE ON public.ticket_updates
FOR EACH ROW EXECUTE FUNCTION public.normalize_ticket_update_author();

-- Allow legitimate message editing by author/staff while trigger enforces author_id immutability
DROP POLICY IF EXISTS "ticket_messages_participant_update" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_update" ON public.ticket_messages
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = ticket_messages.author_id
                  AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
        )
    );



-- ======================================================================================
-- 3. R9-02: Project Member Event Logging Lifecycle Resilience
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.log_project_member_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.project_member_events (project_id, user_id, actor_id, event_type, previous_role, new_role)
        VALUES (
            NEW.project_id,
            NEW.user_id,
            auth.uid(),
            CASE WHEN COALESCE(NEW.role, 'Applicant') = 'Applicant' THEN 'applied' ELSE 'accepted' END,
            NULL,
            NEW.role
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            INSERT INTO public.project_member_events (project_id, user_id, actor_id, event_type, previous_role, new_role)
            VALUES (
                NEW.project_id,
                NEW.user_id,
                auth.uid(),
                CASE WHEN COALESCE(NEW.role, 'Member') != 'Applicant' THEN 'accepted' ELSE 'updated' END,
                OLD.role,
                NEW.role
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Only insert rejection event if parent project still exists.
        -- When a project is deleted with CASCADE, members are deleted along with it;
        -- inserting into project_member_events for a deleted project causes FK violation 23503.
        IF EXISTS (SELECT 1 FROM public.projects WHERE id = OLD.project_id) THEN
            INSERT INTO public.project_member_events (project_id, user_id, actor_id, event_type, previous_role, new_role)
            VALUES (
                OLD.project_id,
                OLD.user_id,
                auth.uid(),
                'rejected',
                OLD.role,
                NULL
            );
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_project_member_event ON public.project_members;
CREATE TRIGGER trg_log_project_member_event
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.log_project_member_event();
