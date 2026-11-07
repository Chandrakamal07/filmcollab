-- ======================================================================================
-- FilmCollab Complete Remediation Convergence Forward Migration
-- Migration: 20261107000000_complete_remediation_convergence.sql
-- Addresses: M02, M03, M04, M05, M06, M08, M09, M10, M11, M13
-- Ensures environments that already applied 20261106000000 receive all schema, privacy,
-- enum, RPC, trigger, and policy remediations idempotently.
-- ======================================================================================

-- 1. PROFILES & PUBLIC_PROFILES PRIVACY ENFORCEMENT (M02, M11)
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS short_id VARCHAR(10);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_messages_from TEXT DEFAULT 'everyone';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_connections_from TEXT DEFAULT 'everyone';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allow_profile_views BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_phone BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_email BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_dob BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_directory BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_show_location BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Drop restrictive category check constraint so professional categories work
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_category_check;

-- Restrict raw public.profiles SELECT so rows with disabled privacy flags cannot be read directly by non-owner/non-admin callers
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() = id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        OR (
            COALESCE(allow_profile_views, true) = true
            AND COALESCE(privacy_show_email, true) = true
            AND COALESCE(privacy_show_phone, true) = true
            AND COALESCE(privacy_show_dob, true) = true
        )
    );

CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT 
    id, user_id, full_name, first_name, last_name, username, avatar_url, cover_image_url,
    bio, profession, category, skills, experience, city, state, country,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_location, true) = true
        THEN location
        ELSE NULL
    END AS location,
    website, company, portfolio_url, imdb_url, linkedin_url, instagram_url, youtube_url, twitter_url,
    social_links, pricing_rate, pricing_unit, pricing_currency, role, short_id, public_key,
    is_verified, allow_messages_from, allow_connections_from, allow_profile_views,
    privacy_show_phone, privacy_show_email, privacy_show_dob, privacy_show_directory, privacy_show_location,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() = id
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_phone, true) = true
        THEN phone 
        ELSE NULL 
    END AS phone,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() = id
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_email, true) = true
        THEN email 
        ELSE NULL 
    END AS email,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() = id
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_dob, true) = true
        THEN date_of_birth 
        ELSE NULL 
    END AS date_of_birth,
    followers_count, following_count, projects_count, posts_count, created_at, updated_at
FROM public.profiles
WHERE COALESCE(allow_profile_views, true) = true
   OR auth.uid() = user_id
   OR auth.uid() = id
   OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin');

GRANT SELECT ON public.public_profiles TO anon, authenticated;
DO $$
BEGIN
    REVOKE SELECT (email, phone, date_of_birth) ON public.profiles FROM anon;
    REVOKE SELECT ON public.profiles FROM anon;
    GRANT SELECT (
        id, user_id, full_name, first_name, last_name, username, avatar_url, cover_image_url,
        bio, profession, category, skills, experience, city, state, country, location,
        website, company, portfolio_url, imdb_url, linkedin_url, instagram_url, youtube_url, twitter_url,
        social_links, pricing_rate, pricing_unit, pricing_currency, role, short_id, public_key,
        is_verified, allow_messages_from, allow_connections_from, allow_profile_views,
        privacy_show_phone, privacy_show_email, privacy_show_dob, privacy_show_directory, privacy_show_location,
        followers_count, following_count, projects_count, posts_count, created_at, updated_at
    ) ON public.profiles TO anon;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. TICKET MESSAGES AUTHOR_ID FOREIGN KEY TO PROFILES (M02)
ALTER TABLE public.ticket_messages ALTER COLUMN author_id DROP NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ticket_messages_author_id_fkey'
    ) THEN
        ALTER TABLE public.ticket_messages
        ADD CONSTRAINT ticket_messages_author_id_fkey
        FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. PROJECT VISIBILITY BACKFILL, SYNC TRIGGER & SELECT POLICY (M03)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'Public';

UPDATE public.projects
SET visibility = CASE
    WHEN project_status IS NOT NULL AND LOWER(project_status) != 'public' THEN LOWER(project_status)
    WHEN visibility IS NOT NULL AND LOWER(visibility) != 'public' THEN LOWER(visibility)
    ELSE COALESCE(LOWER(project_status), LOWER(visibility), 'public')
END,
project_status = CASE
    WHEN project_status IS NOT NULL AND LOWER(project_status) != 'public' THEN INITCAP(project_status)
    WHEN visibility IS NOT NULL AND LOWER(visibility) != 'public' THEN INITCAP(visibility)
    ELSE COALESCE(INITCAP(project_status), INITCAP(visibility), 'Public')
END;

CREATE OR REPLACE FUNCTION public.sync_project_visibility()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.project_status IS NOT NULL AND LOWER(NEW.project_status) != 'public' THEN
            NEW.visibility := LOWER(NEW.project_status);
            NEW.project_status := INITCAP(NEW.project_status);
        ELSIF NEW.visibility IS NOT NULL AND LOWER(NEW.visibility) != 'public' THEN
            NEW.visibility := LOWER(NEW.visibility);
            NEW.project_status := INITCAP(NEW.visibility);
        ELSE
            NEW.visibility := LOWER(COALESCE(NEW.visibility, NEW.project_status, 'public'));
            NEW.project_status := INITCAP(NEW.visibility);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.project_status IS DISTINCT FROM OLD.project_status AND NEW.visibility IS NOT DISTINCT FROM OLD.visibility THEN
            NEW.visibility := LOWER(COALESCE(NEW.project_status, 'public'));
            NEW.project_status := INITCAP(NEW.visibility);
        ELSIF NEW.visibility IS DISTINCT FROM OLD.visibility AND NEW.project_status IS NOT DISTINCT FROM OLD.project_status THEN
            NEW.visibility := LOWER(COALESCE(NEW.visibility, 'public'));
            NEW.project_status := INITCAP(NEW.visibility);
        ELSE
            IF LOWER(COALESCE(NEW.project_status, 'public')) != 'public' THEN
                NEW.visibility := LOWER(NEW.project_status);
            ELSIF LOWER(COALESCE(NEW.visibility, 'public')) != 'public' THEN
                NEW.project_status := INITCAP(NEW.visibility);
            ELSE
                NEW.visibility := LOWER(COALESCE(NEW.visibility, NEW.project_status, 'public'));
                NEW.project_status := INITCAP(NEW.visibility);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_project_visibility ON public.projects;
CREATE TRIGGER trg_sync_project_visibility
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.sync_project_visibility();

DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
CREATE POLICY "projects_select_policy" ON public.projects
    FOR SELECT USING (
        (
            LOWER(COALESCE(visibility, 'public')) = 'public'
            AND LOWER(COALESCE(project_status, 'public')) = 'public'
        )
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members pm 
            WHERE pm.project_id = projects.id 
              AND pm.user_id = auth.uid()
              AND pm.role != 'Applicant'
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 4. CONNECTIONS UPDATE IMMUTABILITY & POST_COMMENTS AUTHOR BINDING (M04, M10)
DROP POLICY IF EXISTS "connections_update_policy" ON public.connections;
CREATE POLICY "connections_update_policy" ON public.connections
    FOR UPDATE USING (
        auth.uid() = connected_user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = connections.connected_user_id OR profiles.user_id = connections.connected_user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    ) WITH CHECK (
        auth.uid() = connected_user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = connections.connected_user_id OR profiles.user_id = connections.connected_user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE OR REPLACE FUNCTION public.check_connection_update_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') THEN
        RETURN NEW;
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR
       NEW.connected_user_id IS DISTINCT FROM OLD.connected_user_id THEN
        RAISE EXCEPTION 'Cannot modify connection requester or recipient identity' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_connection_update_immutability ON public.connections;
CREATE TRIGGER trg_check_connection_update_immutability
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.check_connection_update_immutability();

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert_policy" ON public.post_comments;
CREATE POLICY "post_comments_insert_policy" ON public.post_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Enable update for users who created the comment" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_update_policy" ON public.post_comments;
CREATE POLICY "post_comments_update_policy" ON public.post_comments
    FOR UPDATE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    ) WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Enable delete for users who created the comment" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_delete_policy" ON public.post_comments;
CREATE POLICY "post_comments_delete_policy" ON public.post_comments
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE OR REPLACE FUNCTION public.check_post_comment_update_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') THEN
        RETURN NEW;
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR
       NEW.post_id IS DISTINCT FROM OLD.post_id THEN
        RAISE EXCEPTION 'Cannot modify comment author or post association' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_post_comment_update_immutability ON public.post_comments;
CREATE TRIGGER trg_check_post_comment_update_immutability
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.check_post_comment_update_immutability();

-- 5. COMMUNITY GROUPS BACKFILL, SYNC TRIGGER & PENDING READ RESTRICTION (M13)
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS require_approval BOOLEAN;
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS allow_member_posts BOOLEAN;

UPDATE public.community_groups
SET require_approval = COALESCE((settings->>'requireApproval')::boolean, require_approval, false),
    allow_member_posts = COALESCE((settings->>'allowMemberPosts')::boolean, allow_member_posts, true);

ALTER TABLE public.community_groups ALTER COLUMN require_approval SET DEFAULT FALSE;
ALTER TABLE public.community_groups ALTER COLUMN allow_member_posts SET DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.sync_community_group_settings()
RETURNS TRIGGER AS $$
DECLARE
    v_json_req BOOLEAN;
    v_json_posts BOOLEAN;
BEGIN
    v_json_req := (NEW.settings->>'requireApproval')::boolean;
    v_json_posts := (NEW.settings->>'allowMemberPosts')::boolean;

    IF TG_OP = 'INSERT' THEN
        IF v_json_req IS NOT NULL AND (NEW.require_approval IS NULL OR NEW.require_approval = false) THEN
            NEW.require_approval := v_json_req;
        ELSE
            NEW.require_approval := COALESCE(NEW.require_approval, v_json_req, false);
        END IF;

        IF v_json_posts IS NOT NULL AND (NEW.allow_member_posts IS NULL OR NEW.allow_member_posts = true) THEN
            NEW.allow_member_posts := v_json_posts;
        ELSE
            NEW.allow_member_posts := COALESCE(NEW.allow_member_posts, v_json_posts, true);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.require_approval IS DISTINCT FROM OLD.require_approval AND v_json_req IS NOT DISTINCT FROM (OLD.settings->>'requireApproval')::boolean THEN
            NEW.require_approval := COALESCE(NEW.require_approval, false);
        ELSIF v_json_req IS DISTINCT FROM (OLD.settings->>'requireApproval')::boolean THEN
            NEW.require_approval := COALESCE(v_json_req, NEW.require_approval, false);
        ELSE
            NEW.require_approval := COALESCE(NEW.require_approval, v_json_req, false);
        END IF;

        IF NEW.allow_member_posts IS DISTINCT FROM OLD.allow_member_posts AND v_json_posts IS NOT DISTINCT FROM (OLD.settings->>'allowMemberPosts')::boolean THEN
            NEW.allow_member_posts := COALESCE(NEW.allow_member_posts, true);
        ELSIF v_json_posts IS DISTINCT FROM (OLD.settings->>'allowMemberPosts')::boolean THEN
            NEW.allow_member_posts := COALESCE(v_json_posts, NEW.allow_member_posts, true);
        ELSE
            NEW.allow_member_posts := COALESCE(NEW.allow_member_posts, v_json_posts, true);
        END IF;
    END IF;

    NEW.settings := jsonb_set(
        jsonb_set(
            COALESCE(NEW.settings, '{}'::jsonb),
            '{requireApproval}',
            to_jsonb(NEW.require_approval)
        ),
        '{allowMemberPosts}',
        to_jsonb(NEW.allow_member_posts)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_community_group_settings ON public.community_groups;
CREATE TRIGGER trg_sync_community_group_settings
BEFORE INSERT OR UPDATE ON public.community_groups
FOR EACH ROW EXECUTE FUNCTION public.sync_community_group_settings();

CREATE OR REPLACE FUNCTION public.is_community_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.community_group_members
        WHERE group_id = _group_id AND user_id = _user_id AND role != 'Pending'
    );
$$;

DROP POLICY IF EXISTS "community_group_messages_read" ON public.community_group_messages;
DROP POLICY IF EXISTS "community_group_messages_select" ON public.community_group_messages;
CREATE POLICY "community_group_messages_select" ON public.community_group_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_groups g
            WHERE g.id = community_group_messages.group_id AND g.created_by = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.community_group_members m
            WHERE m.group_id = community_group_messages.group_id
              AND m.user_id = auth.uid()
              AND m.role != 'Pending'
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 6. NOTIFICATIONS & SEND_AUTHORIZED_NOTIFICATION SCHEMA + EVENT AUTHORIZATION (M09)
CREATE OR REPLACE FUNCTION public.send_authorized_notification(
    p_recipient_id UUID DEFAULT NULL,
    p_title TEXT DEFAULT 'Notification',
    p_message TEXT DEFAULT NULL,
    p_type TEXT DEFAULT 'general',
    p_link TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium',
    p_action_url TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_auth_id UUID;
    v_caller_profile_id UUID;
    v_target_recipient UUID;
    v_recipient_profile_id UUID;
    v_recipient_auth_id UUID;
    v_allow_profile_views BOOLEAN := true;
    v_authorized BOOLEAN := false;
    v_notification_id UUID;
BEGIN
    v_caller_auth_id := auth.uid();
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to send notifications' USING ERRCODE = '42501';
    END IF;

    v_target_recipient := COALESCE(p_recipient_id, p_user_id);

    SELECT id INTO v_caller_profile_id
    FROM public.profiles
    WHERE user_id = v_caller_auth_id OR id = v_caller_auth_id
    LIMIT 1;

    SELECT id, user_id, COALESCE(allow_profile_views, true)
    INTO v_recipient_profile_id, v_recipient_auth_id, v_allow_profile_views
    FROM public.profiles 
    WHERE id = v_target_recipient OR user_id = v_target_recipient
    LIMIT 1;

    IF v_recipient_profile_id IS NULL THEN
        RAISE EXCEPTION 'Recipient profile not found' USING ERRCODE = '23503';
    END IF;

    IF v_caller_auth_id = v_recipient_auth_id
       OR v_caller_profile_id = v_recipient_profile_id
       OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_caller_auth_id AND role::text IN ('admin', 'moderator', 'support')) THEN
        v_authorized := true;
    ELSIF EXISTS (
        SELECT 1 FROM public.job_applications ja
        JOIN public.jobs j ON j.id = ja.job_id
        WHERE (
            (j.user_id IN (v_recipient_auth_id, v_recipient_profile_id) AND (ja.user_id = v_caller_auth_id OR ja.profile_id = v_caller_profile_id))
            OR
            (j.user_id IN (v_caller_auth_id, v_caller_profile_id) AND (ja.user_id = v_recipient_auth_id OR ja.profile_id = v_recipient_profile_id))
        )
    ) THEN
        v_authorized := true;
    ELSIF EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_members pm ON pm.project_id = p.id
        WHERE (
            (p.created_by IN (v_recipient_auth_id, v_recipient_profile_id) AND pm.user_id IN (v_caller_auth_id, v_caller_profile_id))
            OR
            (p.created_by IN (v_caller_auth_id, v_caller_profile_id) AND pm.user_id IN (v_recipient_auth_id, v_recipient_profile_id))
            OR
            (pm.user_id IN (v_recipient_auth_id, v_recipient_profile_id) AND EXISTS (
                SELECT 1 FROM public.project_members pm2
                WHERE pm2.project_id = p.id AND pm2.user_id IN (v_caller_auth_id, v_caller_profile_id)
            ))
        )
    ) THEN
        v_authorized := true;
    ELSIF EXISTS (
        SELECT 1 FROM public.messages m
        WHERE (m.sender_id IN (v_caller_profile_id, v_caller_auth_id) AND m.receiver_id IN (v_recipient_profile_id, v_recipient_auth_id))
           OR (m.sender_id IN (v_recipient_profile_id, v_recipient_auth_id) AND m.receiver_id IN (v_caller_profile_id, v_caller_auth_id))
    ) OR EXISTS (
        SELECT 1 FROM public.property_site_visits psv
        WHERE (psv.user_id IN (v_caller_auth_id, v_caller_profile_id) AND psv.owner_id IN (v_recipient_auth_id, v_recipient_profile_id))
           OR (psv.user_id IN (v_recipient_auth_id, v_recipient_profile_id) AND psv.owner_id IN (v_caller_auth_id, v_caller_profile_id))
    ) THEN
        v_authorized := true;
    ELSIF EXISTS (
        SELECT 1 FROM public.connections c
        WHERE (c.user_id IN (v_caller_profile_id, v_caller_auth_id) AND c.connected_user_id IN (v_recipient_profile_id, v_recipient_auth_id))
           OR (c.user_id IN (v_recipient_profile_id, v_recipient_auth_id) AND c.connected_user_id IN (v_caller_profile_id, v_caller_auth_id))
    ) OR EXISTS (
        SELECT 1 FROM public.user_likes ul
        WHERE ul.user_id IN (v_caller_profile_id, v_caller_auth_id) AND ul.liked_user_id IN (v_recipient_profile_id, v_recipient_auth_id)
    ) OR EXISTS (
        SELECT 1 FROM public.post_likes pl
        JOIN public.posts po ON po.id = pl.post_id
        WHERE pl.user_id IN (v_caller_profile_id, v_caller_auth_id) AND po.author_id IN (v_recipient_profile_id, v_recipient_auth_id)
    ) OR EXISTS (
        SELECT 1 FROM public.post_comments pc
        JOIN public.posts po ON po.id = pc.post_id
        WHERE pc.user_id IN (v_caller_profile_id, v_caller_auth_id) AND po.author_id IN (v_recipient_profile_id, v_recipient_auth_id)
    ) OR (
        LOWER(COALESCE(p_type, '')) IN ('profile_view', 'profile', 'connection', 'like') AND v_allow_profile_views = true
    ) THEN
        v_authorized := true;
    END IF;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'Unauthorized notification recipient or missing relationship event' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.notifications (
        id,
        user_id,
        title,
        description,
        type,
        status,
        priority,
        action_url,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_recipient_profile_id,
        p_title,
        COALESCE(p_message, p_description, ''),
        COALESCE(p_type, 'system'),
        'unread',
        COALESCE(p_priority, 'medium'),
        COALESCE(p_link, p_action_url),
        NOW()
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_authorized_notification TO authenticated;

-- 7. APP_ROLE ENUM & ATOMIC STAFF RPCS (M06)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';

CREATE OR REPLACE FUNCTION public.provision_admin_team_member(
    p_user_id UUID,
    p_profile_id UUID,
    p_role TEXT,
    p_status TEXT,
    p_permissions JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_member_id UUID;
    v_db_role TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Only administrators can provision team members' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_member_id
    FROM public.admin_team_members
    WHERE user_id = p_user_id
    LIMIT 1;

    IF v_member_id IS NOT NULL THEN
        UPDATE public.admin_team_members
        SET profile_id = COALESCE(p_profile_id, profile_id),
            role = p_role,
            status = p_status,
            permissions = COALESCE(p_permissions, permissions),
            updated_at = NOW()
        WHERE id = v_member_id;
    ELSE
        INSERT INTO public.admin_team_members (
            user_id,
            profile_id,
            role,
            status,
            permissions
        ) VALUES (
            p_user_id,
            p_profile_id,
            p_role,
            p_status,
            p_permissions
        ) RETURNING id INTO v_member_id;
    END IF;

    v_db_role := CASE 
        WHEN LOWER(p_role) = 'admin' THEN 'admin'
        WHEN LOWER(p_role) = 'moderator' THEN 'moderator'
        ELSE 'support'
    END;

    DELETE FROM public.user_roles
    WHERE user_id = p_user_id
      AND role::text IN ('admin', 'moderator', 'support');

    IF p_status = 'Active' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, v_db_role::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN v_member_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_admin_team_member(p_member_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_role TEXT;
    v_db_role TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Only administrators can revoke team members' USING ERRCODE = '42501';
    END IF;

    SELECT user_id, role INTO v_user_id, v_role 
    FROM public.admin_team_members 
    WHERE id = p_member_id;

    IF v_user_id IS NOT NULL THEN
        DELETE FROM public.admin_team_members WHERE id = p_member_id;

        v_db_role := CASE 
            WHEN LOWER(v_role) = 'admin' THEN 'admin'
            WHEN LOWER(v_role) = 'moderator' THEN 'moderator'
            ELSE 'support'
        END;

        DELETE FROM public.user_roles 
        WHERE user_id = v_user_id AND role = v_db_role::public.app_role;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_admin_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_team_member TO authenticated;

-- 8. CASTING CAPACITY CHECK SECURITY DEFINER & FOR UPDATE LOCKING (M08)
CREATE OR REPLACE FUNCTION public.check_casting_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_max INT;
    v_current INT;
BEGIN
    SELECT max_applications INTO v_max 
    FROM public.casting_calls 
    WHERE id = NEW.casting_call_id
    FOR UPDATE;

    IF v_max IS NOT NULL AND v_max > 0 THEN
        SELECT COUNT(*) INTO v_current 
        FROM public.casting_applicants 
        WHERE casting_call_id = NEW.casting_call_id;

        IF v_current >= v_max THEN
            RAISE EXCEPTION 'Casting call has reached maximum applicant capacity' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_casting_capacity ON public.casting_applicants;
CREATE TRIGGER trg_check_casting_capacity
BEFORE INSERT ON public.casting_applicants
FOR EACH ROW EXECUTE FUNCTION public.check_casting_capacity();

-- 9. STORAGE POLICIES FOR POST_MEDIA (M05)
DROP POLICY IF EXISTS "Anyone can delete post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete post media" ON storage.objects;
DROP POLICY IF EXISTS "post_media_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "post_media_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "post_media_upload_policy" ON storage.objects;

CREATE POLICY "post_media_upload_policy"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id IN ('post_media', 'post-media')
    AND auth.role() = 'authenticated'
);

CREATE POLICY "post_media_update_policy"
ON storage.objects FOR UPDATE
USING (
    bucket_id IN ('post_media', 'post-media')
    AND (
        auth.uid() = owner
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND (storage.foldername(storage.objects.name))[1] = p.id::text
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    )
);

CREATE POLICY "post_media_delete_policy"
ON storage.objects FOR DELETE
USING (
    bucket_id IN ('post_media', 'post-media')
    AND (
        auth.uid() = owner
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND (storage.foldername(storage.objects.name))[1] = p.id::text
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    )
);
