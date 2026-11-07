-- ======================================================================================
-- FilmCollab R10 Security, Schema & Trigger Remediation
-- Migration: 20261111000000_r10_ticket_boundary_and_crypto_readiness.sql
--
-- R10-01: Ticket message ticket_id immutability & chat restriction enforcement:
--         - Forbid reassigning ticket_id on ticket_messages and ticket_updates (42501)
--         - Enforce destination ticket access and chat_enabled = true in UPDATE policy
-- R10-02: Normalize blank/whitespace public_key strings in public.profiles to NULL:
--         - Backfill existing blank strings to NULL
--         - Add trigger trg_normalize_profile_public_key to ensure blank is always NULL
-- ======================================================================================

-- 1. R10-02: Normalize blank public_key strings to NULL in public.profiles
UPDATE public.profiles
SET public_key = NULL
WHERE public_key IS NOT NULL AND BTRIM(public_key) = '';

CREATE OR REPLACE FUNCTION public.normalize_profile_public_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.public_key IS NOT NULL AND BTRIM(NEW.public_key) = '' THEN
        NEW.public_key := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_profile_public_key ON public.profiles;
CREATE TRIGGER trg_normalize_profile_public_key
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_profile_public_key();


-- 2. R10-01: Table-specific trigger function for ticket_messages with ticket_id immutability
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

    IF TG_OP = 'UPDATE' THEN
        -- R10-01: Strictly forbid moving message to a different ticket
        IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id THEN
            RAISE EXCEPTION 'Ticket message ticket_id cannot be reassigned' USING ERRCODE = '42501';
        END IF;

        IF v_caller_auth_id IS NOT NULL THEN
            IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
                -- Allow legitimate ON DELETE SET NULL referential cleanup when the old profile is deleted
                IF NEW.author_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.author_id) THEN
                    RETURN NEW;
                END IF;
                RAISE EXCEPTION 'Ticket author_id cannot be reassigned' USING ERRCODE = '42501';
            END IF;
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

-- Table-specific trigger function for ticket_updates with ticket_id immutability
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

    IF TG_OP = 'UPDATE' THEN
        -- R10-01: Strictly forbid moving update to a different ticket
        IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id THEN
            RAISE EXCEPTION 'Ticket update ticket_id cannot be reassigned' USING ERRCODE = '42501';
        END IF;

        IF v_caller_auth_id IS NOT NULL THEN
            IF NEW.author_id IS DISTINCT FROM OLD.author_id THEN
                -- Allow legitimate ON DELETE SET NULL referential cleanup when the old profile is deleted
                IF NEW.author_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = OLD.author_id) THEN
                    RETURN NEW;
                END IF;
                RAISE EXCEPTION 'Ticket author_id cannot be reassigned' USING ERRCODE = '42501';
            END IF;
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

-- 3. R10-01: Hardened ticket_messages_participant_update RLS policy enforcing ticket access and chat_enabled
DROP POLICY IF EXISTS "ticket_messages_participant_update" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_update" ON public.ticket_messages
    FOR UPDATE
    USING (
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
        AND (
            public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
            OR EXISTS (
                SELECT 1 FROM public.tickets t
                WHERE t.id = ticket_messages.ticket_id
                  AND COALESCE(t.chat_enabled, true) = true
                  AND (
                      t.user_id = auth.uid()
                      OR EXISTS (
                          SELECT 1 FROM public.profiles p2
                          WHERE p2.id = t.user_id
                            AND p2.user_id = auth.uid()
                      )
                  )
            )
        )
    )
    WITH CHECK (
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
        AND (
            public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
            OR EXISTS (
                SELECT 1 FROM public.tickets t
                WHERE t.id = ticket_messages.ticket_id
                  AND COALESCE(t.chat_enabled, true) = true
                  AND (
                      t.user_id = auth.uid()
                      OR EXISTS (
                          SELECT 1 FROM public.profiles p2
                          WHERE p2.id = t.user_id
                            AND p2.user_id = auth.uid()
                      )
                  )
            )
        )
    );

