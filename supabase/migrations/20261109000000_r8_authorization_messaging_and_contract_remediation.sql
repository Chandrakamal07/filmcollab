-- ======================================================================================
-- FILMCOLLAB PR #1 — R8 AUTHORIZATION, MESSAGING & CONTRACT REMEDIATION MIGRATION
-- Target Baseline: 41cae58fac0d31d1c1059bc1dc6335d3b85e4db7
-- Remediates: R8-01, R8-02, R8-04, R8-05, R8-06, R8-07
-- All previously released migrations (20250108000000..20261108000000) remain frozen.
-- ======================================================================================

-- ======================================================================================
-- 1. R8-01: STRICT DIRECTORY METADATA & STORAGE OBJECT OWNERSHIP VALIDATION
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.is_authorized_directory_object_reference(
    p_file_id UUID,
    p_bucket TEXT,
    p_path TEXT,
    p_owner_auth_id UUID,
    p_owner_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_path TEXT;
    v_first_seg TEXT;
    v_obj_owner UUID;
    v_obj_exists BOOLEAN := false;
BEGIN
    IF p_path IS NULL OR BTRIM(p_path) = '' THEN
        RETURN TRUE;
    END IF;

    v_clean_path := BTRIM(p_path);

    -- Reject path traversal or leading slash
    IF v_clean_path LIKE '%..%' OR LEFT(v_clean_path, 1) = '/' THEN
        RETURN FALSE;
    END IF;

    -- 1. If the object exists in storage.objects, its owner MUST match the directory_files record owner
    SELECT TRUE, so.owner
    INTO v_obj_exists, v_obj_owner
    FROM storage.objects so
    WHERE so.bucket_id = COALESCE(NULLIF(BTRIM(p_bucket), ''), 'directory_assets')
      AND so.name = v_clean_path
    LIMIT 1;

    IF v_obj_exists AND v_obj_owner IS NOT NULL THEN
        IF v_obj_owner IS DISTINCT FROM p_owner_auth_id
           AND v_obj_owner IS DISTINCT FROM p_owner_profile_id THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- 2. Reject if another user's directory_files row already owns this storage path
    IF EXISTS (
        SELECT 1
        FROM public.directory_files df
        WHERE (p_file_id IS NULL OR df.id != p_file_id)
          AND df.user_id IS DISTINCT FROM p_owner_profile_id
          AND df.user_id IS DISTINCT FROM p_owner_auth_id
          AND (
              df.storage_path = v_clean_path
              OR df.cover_storage_path = v_clean_path
              OR v_clean_path = ANY(COALESCE(df.additional_paths, '{}'::text[]))
          )
    ) THEN
        RETURN FALSE;
    END IF;

    -- 3. Validate folder namespace ownership
    v_first_seg := (storage.foldername(v_clean_path))[1];

    IF v_first_seg IS NOT NULL THEN
        IF v_first_seg IN (COALESCE(p_owner_auth_id::text, ''), COALESCE(p_owner_profile_id::text, '')) THEN
            RETURN TRUE;
        ELSIF v_first_seg = 'covers' THEN
            -- Covers folder requires either verified storage.objects ownership or owner-prefixed filename
            IF (v_obj_exists AND v_obj_owner IS NOT NULL AND v_obj_owner IN (p_owner_auth_id, p_owner_profile_id))
               OR SPLIT_PART(v_clean_path, '/', 2) LIKE COALESCE(p_owner_auth_id::text, '___') || '%'
               OR SPLIT_PART(v_clean_path, '/', 2) LIKE COALESCE(p_owner_profile_id::text, '___') || '%' THEN
                RETURN TRUE;
            END IF;
            RETURN FALSE;
        ELSE
            RETURN FALSE;
        END IF;
    END IF;

    -- Root-level object name without folder prefix is only allowed if storage.objects explicitly proves ownership
    IF v_obj_exists AND v_obj_owner IS NOT NULL AND v_obj_owner IN (p_owner_auth_id, p_owner_profile_id) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_directory_file_storage_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_show_dir BOOLEAN := true;
    v_owner_profile_id UUID;
    v_owner_auth_id UUID;
    v_url_path TEXT;
    v_cover_url_path TEXT;
    v_stats_cover_path TEXT;
    v_elem TEXT;
    v_extracted TEXT;
    v_paths TEXT[] := '{}'::text[];
BEGIN
    -- Resolve canonical owner profile ID and auth user ID
    SELECT id, user_id, COALESCE(privacy_show_directory, true)
    INTO v_owner_profile_id, v_owner_auth_id, v_owner_show_dir
    FROM public.profiles
    WHERE id = NEW.user_id OR user_id = NEW.user_id
    ORDER BY CASE WHEN id = NEW.user_id THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_owner_profile_id IS NULL THEN
        RAISE EXCEPTION 'Directory file owner profile not found for user_id %', NEW.user_id USING ERRCODE = '42501';
    END IF;

    NEW.user_id := v_owner_profile_id;
    NEW.storage_bucket := COALESCE(NULLIF(BTRIM(NEW.storage_bucket), ''), 'directory_assets');

    IF NEW.storage_bucket NOT IN ('directory_assets', 'directory_private') THEN
        RAISE EXCEPTION 'Invalid directory storage bucket: %', NEW.storage_bucket USING ERRCODE = '42501';
    END IF;

    -- Extract path from file_url if it points into a storage bucket
    v_url_path := public.extract_storage_object_path(NEW.file_url, NEW.storage_bucket);
    IF v_url_path IS NULL AND NEW.file_url LIKE 'storage://%' THEN
        RAISE EXCEPTION 'Cross-bucket or malformed storage URI in file_url' USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.file_url IS DISTINCT FROM OLD.file_url AND NEW.storage_path IS NOT DISTINCT FROM OLD.storage_path THEN
        NEW.storage_path := v_url_path;
    ELSE
        NEW.storage_path := COALESCE(NULLIF(BTRIM(NEW.storage_path), ''), v_url_path);
    END IF;

    IF v_url_path IS NOT NULL AND NEW.storage_path IS DISTINCT FROM v_url_path THEN
        RAISE EXCEPTION 'Mismatched storage_path and file_url object reference' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_authorized_directory_object_reference(
        NEW.id, NEW.storage_bucket, NEW.storage_path, v_owner_auth_id, v_owner_profile_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized primary storage_path reference: %', NEW.storage_path USING ERRCODE = '42501';
    END IF;

    -- Extract and validate cover paths
    v_cover_url_path := public.extract_storage_object_path(NEW.cover_image_url, NEW.storage_bucket);
    v_stats_cover_path := public.extract_storage_object_path((NEW.stats->>'coverUrl')::text, NEW.storage_bucket);

    IF v_cover_url_path IS NOT NULL AND NOT public.is_authorized_directory_object_reference(
        NEW.id, NEW.storage_bucket, v_cover_url_path, v_owner_auth_id, v_owner_profile_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized cover_image_url storage reference: %', v_cover_url_path USING ERRCODE = '42501';
    END IF;

    IF v_stats_cover_path IS NOT NULL AND NOT public.is_authorized_directory_object_reference(
        NEW.id, NEW.storage_bucket, v_stats_cover_path, v_owner_auth_id, v_owner_profile_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized stats.coverUrl storage reference: %', v_stats_cover_path USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE'
       AND (NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url OR (NEW.stats->>'coverUrl') IS DISTINCT FROM (OLD.stats->>'coverUrl'))
       AND NEW.cover_storage_path IS NOT DISTINCT FROM OLD.cover_storage_path THEN
        NEW.cover_storage_path := COALESCE(v_cover_url_path, v_stats_cover_path);
    ELSE
        NEW.cover_storage_path := COALESCE(
            NULLIF(BTRIM(NEW.cover_storage_path), ''),
            v_cover_url_path,
            v_stats_cover_path
        );
    END IF;

    IF NOT public.is_authorized_directory_object_reference(
        NEW.id, NEW.storage_bucket, NEW.cover_storage_path, v_owner_auth_id, v_owner_profile_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized cover_storage_path reference: %', NEW.cover_storage_path USING ERRCODE = '42501';
    END IF;

    -- Validate any explicitly provided additional_paths
    IF NEW.additional_paths IS NOT NULL AND array_length(NEW.additional_paths, 1) > 0 THEN
        FOREACH v_elem IN ARRAY NEW.additional_paths LOOP
            IF v_elem IS NOT NULL AND BTRIM(v_elem) != '' THEN
                IF NOT public.is_authorized_directory_object_reference(
                    NEW.id, NEW.storage_bucket, BTRIM(v_elem), v_owner_auth_id, v_owner_profile_id
                ) THEN
                    RAISE EXCEPTION 'Unauthorized additional_paths reference: %', v_elem USING ERRCODE = '42501';
                END IF;
                IF NOT (BTRIM(v_elem) = ANY(v_paths)) THEN
                    v_paths := array_append(v_paths, BTRIM(v_elem));
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- Validate and extract any additional_urls
    IF NEW.additional_urls IS NOT NULL AND array_length(NEW.additional_urls, 1) > 0 THEN
        FOREACH v_elem IN ARRAY NEW.additional_urls LOOP
            v_extracted := public.extract_storage_object_path(v_elem, NEW.storage_bucket);
            IF v_extracted IS NOT NULL THEN
                IF NOT public.is_authorized_directory_object_reference(
                    NEW.id, NEW.storage_bucket, v_extracted, v_owner_auth_id, v_owner_profile_id
                ) THEN
                    RAISE EXCEPTION 'Unauthorized additional_urls storage reference: %', v_extracted USING ERRCODE = '42501';
                END IF;
                IF NOT (v_extracted = ANY(v_paths)) THEN
                    v_paths := array_append(v_paths, v_extracted);
                END IF;
            END IF;
        END LOOP;
    END IF;

    NEW.additional_paths := v_paths;

    IF LOWER(COALESCE(NEW.status, 'active')) = 'blocked'
       OR ('Blocked' = ANY(COALESCE(NEW.tags, '{}')))
       OR NOT COALESCE(v_owner_show_dir, true) THEN
        NEW.is_public := false;
    ELSE
        NEW.is_public := COALESCE(NEW.is_public, true);
    END IF;

    IF NOT NEW.is_public THEN
        IF NEW.storage_path IS NOT NULL AND NEW.file_url LIKE '%/object/public/%' THEN
            NEW.file_url := 'storage://' || NEW.storage_bucket || '/' || NEW.storage_path;
        END IF;
        IF NEW.cover_storage_path IS NOT NULL AND NEW.cover_image_url LIKE '%/object/public/%' THEN
            NEW.cover_image_url := 'storage://' || NEW.storage_bucket || '/' || NEW.cover_storage_path;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Replace storage.objects SELECT policy for directory_assets & directory_private:
-- 1. Remove URL-substring LIKE matching completely.
-- 2. Require that any directory_files row granting public visibility belongs to the actual owner of the storage object.
DROP POLICY IF EXISTS "directory_assets_select_policy" ON storage.objects;
CREATE POLICY "directory_assets_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('directory_assets', 'directory_private')
        AND (
            auth.uid() = owner
            OR (
                owner IS NULL
                AND (storage.foldername(name))[1] = auth.uid()::text
            )
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid()
                  AND (
                      storage.objects.owner = p.id
                      OR (
                          storage.objects.owner IS NULL
                          AND (storage.foldername(storage.objects.name))[1] = p.id::text
                      )
                  )
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'view')
            OR (
                bucket_id = 'directory_assets'
                AND EXISTS (
                    SELECT 1 FROM public.directory_files df
                    JOIN public.profiles p ON (p.id = df.user_id OR p.user_id = df.user_id)
                    WHERE (
                        df.storage_path = storage.objects.name
                        OR df.cover_storage_path = storage.objects.name
                        OR storage.objects.name = ANY(COALESCE(df.additional_paths, '{}'::text[]))
                    )
                      AND (
                          storage.objects.owner = p.user_id
                          OR storage.objects.owner = p.id
                          OR (
                              storage.objects.owner IS NULL
                              AND (storage.foldername(storage.objects.name))[1] IN (p.user_id::text, p.id::text)
                          )
                      )
                      AND LOWER(COALESCE(df.status, 'active')) != 'blocked'
                      AND NOT ('Blocked' = ANY(COALESCE(df.tags, '{}')))
                      AND COALESCE(df.is_public, true) = true
                      AND COALESCE(p.privacy_show_directory, true) = true
                      AND LOWER(COALESCE(p.account_status, 'active')) = 'active'
                      AND LOWER(COALESCE(p.role, 'user')) != 'blocked'
                )
            )
        )
    );

-- ======================================================================================
-- 2. R8-02: ACTIVE CALLER & PROTECTED ADMIN TARGET ENFORCEMENT IN RPCS, TRIGGERS & RLS
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.is_protected_admin_account(
    p_profile_id UUID,
    p_auth_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id IN (p_auth_user_id, p_profile_id)
          AND ur.role = 'admin'::public.app_role
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE (p.id = p_profile_id OR p.user_id = p_auth_user_id)
          AND LOWER(COALESCE(p.role, '')) = 'admin'
    )
    OR EXISTS (
        SELECT 1
        FROM public.admin_team_members atm
        WHERE (atm.user_id IN (p_auth_user_id, p_profile_id) OR atm.profile_id = p_profile_id)
          AND atm.status = 'Active'
          AND LOWER(COALESCE(atm.role, '')) = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_protected_admin_account(UUID, UUID) TO anon, authenticated;

-- Harden has_role helper so blocked accounts never evaluate as holding active privileged roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT _user_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.profiles p
           WHERE (p.user_id = _user_id OR p.id = _user_id)
             AND (
                 LOWER(COALESCE(p.account_status, 'active')) IN ('blocked', 'suspended')
                 OR LOWER(COALESCE(p.role, 'user')) = 'blocked'
             )
       )
       AND EXISTS (
           SELECT 1
           FROM public.user_roles ur
           WHERE ur.user_id = _user_id
             AND ur.role = _role
       );
$$;

-- Harden provision_admin_team_member to enforce public.is_global_admin() (active caller + admin role)
DROP FUNCTION IF EXISTS public.provision_admin_team_member(UUID, UUID, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.provision_admin_team_member(
    p_user_id UUID DEFAULT NULL,
    p_profile_id UUID DEFAULT NULL,
    p_role TEXT DEFAULT 'Admin',
    p_status TEXT DEFAULT 'Active',
    p_permissions JSONB DEFAULT '{}'::jsonb
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
    IF NOT public.is_global_admin() THEN
        RAISE EXCEPTION 'Only active global administrators can provision team members' USING ERRCODE = '42501';
    END IF;

    IF p_user_id IS NULL AND p_profile_id IS NOT NULL THEN
        SELECT p.user_id INTO p_user_id
        FROM public.profiles p
        WHERE p.id = p_profile_id;
    END IF;

    IF p_profile_id IS NULL AND p_user_id IS NOT NULL THEN
        SELECT p.id INTO p_profile_id
        FROM public.profiles p
        WHERE p.user_id = p_user_id;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE (p.user_id = p_user_id OR p.id = p_profile_id OR p.id = p_user_id)
          AND (
              LOWER(COALESCE(p.account_status, 'active')) IN ('blocked', 'suspended')
              OR LOWER(COALESCE(p.role, 'user')) = 'blocked'
          )
    ) THEN
        RAISE EXCEPTION 'Cannot provision a blocked or suspended account' USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_member_id
    FROM public.admin_team_members
    WHERE (user_id = p_user_id AND p_user_id IS NOT NULL)
       OR (profile_id = p_profile_id AND p_profile_id IS NOT NULL)
    LIMIT 1;

    IF v_member_id IS NOT NULL THEN
        UPDATE public.admin_team_members
        SET profile_id = COALESCE(p_profile_id, profile_id),
            user_id = COALESCE(p_user_id, user_id),
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

    IF p_user_id IS NOT NULL THEN
        DELETE FROM public.user_roles
        WHERE user_id = p_user_id
          AND role::text IN ('admin', 'moderator', 'support');

        IF p_status = 'Active' THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (p_user_id, v_db_role::public.app_role)
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    END IF;

    RETURN v_member_id;
END;
$$;

-- Harden revoke_admin_team_member to enforce public.is_global_admin()
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
    IF NOT public.is_global_admin() THEN
        RAISE EXCEPTION 'Only active global administrators can revoke team members' USING ERRCODE = '42501';
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

-- Lock down direct mutations on public.user_roles to active global admins only
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
    FOR SELECT USING (
        auth.uid() = user_id
        OR public.is_global_admin()
        OR public.has_staff_permission('Users', 'view')
    );

CREATE POLICY "user_roles_manage" ON public.user_roles
    FOR ALL USING (
        public.is_global_admin()
    ) WITH CHECK (
        public.is_global_admin()
    );

-- Harden guard_profile_updates_and_key_history to protect global admins identified via user_roles / admin_team_members
CREATE OR REPLACE FUNCTION public.guard_profile_updates_and_key_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_can_edit_users BOOLEAN;
    v_hist JSONB;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        v_is_admin := public.is_global_admin();
        v_can_edit_users := public.has_staff_permission('Users', 'edit');

        IF NOT v_is_admin AND NOT v_can_edit_users THEN
            IF LOWER(COALESCE(OLD.account_status, 'active')) IN ('blocked', 'suspended')
               OR LOWER(COALESCE(OLD.role, 'user')) = 'blocked'
               OR NOT public.is_caller_active() THEN
                RAISE EXCEPTION 'Blocked accounts cannot modify profile records' USING ERRCODE = '42501';
            END IF;

            IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.id IS DISTINCT FROM OLD.id THEN
                RAISE EXCEPTION 'Profile identity columns are immutable' USING ERRCODE = '42501';
            END IF;

            IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
                RAISE EXCEPTION 'Only administrators can change account_status' USING ERRCODE = '42501';
            END IF;

            IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
                RAISE EXCEPTION 'Only administrators can change verification status' USING ERRCODE = '42501';
            END IF;

            IF NEW.role IS DISTINCT FROM OLD.role THEN
                IF LOWER(COALESCE(NEW.role, 'user')) IN ('admin', 'moderator', 'support', 'blocked')
                   OR LOWER(COALESCE(OLD.role, 'user')) IN ('admin', 'moderator', 'support', 'blocked') THEN
                    RAISE EXCEPTION 'Cannot self-assign privileged or blocked roles' USING ERRCODE = '42501';
                END IF;
            END IF;
        ELSIF v_can_edit_users AND NOT v_is_admin THEN
            -- Scoped moderator/staff with Users.edit CANNOT modify a Global Admin (regardless of display role)
            IF public.is_protected_admin_account(OLD.id, OLD.user_id)
               OR LOWER(COALESCE(NEW.role, '')) = 'admin'
               OR LOWER(COALESCE(OLD.role, '')) = 'admin' THEN
                RAISE EXCEPTION 'Only global administrators can modify administrator accounts' USING ERRCODE = '42501';
            END IF;

            -- Scoped staff also cannot block/modify another active staff member
            IF OLD.user_id IS DISTINCT FROM auth.uid() AND (
                EXISTS (
                    SELECT 1 FROM public.user_roles ur
                    WHERE ur.user_id IN (OLD.user_id, OLD.id)
                      AND ur.role::text IN ('admin', 'moderator', 'support')
                )
                OR EXISTS (
                    SELECT 1 FROM public.admin_team_members atm
                    WHERE (atm.user_id IN (OLD.user_id, OLD.id) OR atm.profile_id = OLD.id)
                      AND atm.status = 'Active'
                )
            ) THEN
                RAISE EXCEPTION 'Only global administrators can modify staff accounts' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    -- Synchronize role='blocked' and account_status='blocked'
    IF NEW.role IS DISTINCT FROM OLD.role AND LOWER(COALESCE(NEW.role, '')) = 'blocked' THEN
        NEW.account_status := 'blocked';
    ELSIF NEW.account_status IS DISTINCT FROM OLD.account_status AND LOWER(COALESCE(NEW.account_status, '')) = 'blocked' THEN
        IF LOWER(COALESCE(NEW.role, 'user')) NOT IN ('admin', 'moderator', 'support') THEN
            NEW.role := 'blocked';
        END IF;
    ELSIF NEW.account_status IS DISTINCT FROM OLD.account_status
          AND LOWER(COALESCE(OLD.account_status, '')) = 'blocked'
          AND LOWER(COALESCE(NEW.account_status, '')) = 'active'
          AND LOWER(COALESCE(NEW.role, '')) = 'blocked' THEN
        NEW.role := 'user';
    ELSIF NEW.role IS DISTINCT FROM OLD.role
          AND LOWER(COALESCE(OLD.role, '')) = 'blocked'
          AND LOWER(COALESCE(NEW.role, '')) != 'blocked'
          AND LOWER(COALESCE(NEW.account_status, '')) = 'blocked' THEN
        NEW.account_status := 'active';
    END IF;

    -- Append retired public_key to public_key_history on rotation (R7-08)
    IF OLD.public_key IS NOT NULL
       AND BTRIM(OLD.public_key) != ''
       AND NEW.public_key IS DISTINCT FROM OLD.public_key THEN
        v_hist := COALESCE(OLD.public_key_history, '[]'::jsonb);
        IF jsonb_typeof(v_hist) != 'array' THEN
            v_hist := '[]'::jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(v_hist) AS elem
            WHERE elem->>'publicKey' = OLD.public_key
        ) THEN
            v_hist := v_hist || jsonb_build_array(
                jsonb_build_object(
                    'publicKey', OLD.public_key,
                    'retiredAt', NOW()
                )
            );
        END IF;
        NEW.public_key_history := v_hist;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_updates_and_key_history ON public.profiles;
CREATE TRIGGER trg_guard_profile_updates_and_key_history
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_updates_and_key_history();

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = user_id
        OR auth.uid() = id
        OR public.is_global_admin()
        OR public.has_staff_permission('Users', 'edit')
    ) WITH CHECK (
        (public.is_caller_active() AND (auth.uid() = user_id OR auth.uid() = id))
        OR public.is_global_admin()
        OR (
            public.has_staff_permission('Users', 'edit')
            AND NOT public.is_protected_admin_account(profiles.id, profiles.user_id)
        )
    );

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE USING (
        public.is_global_admin()
        OR (
            public.has_staff_permission('Users', 'delete')
            AND NOT public.is_protected_admin_account(profiles.id, profiles.user_id)
        )
    );

-- Enforce public.is_caller_active() on casting_applicants, casting_call_saves, and company_applications (R8-02)
DROP POLICY IF EXISTS "casting_applicants_insert" ON public.casting_applicants;
DROP POLICY IF EXISTS "Users can insert applications" ON public.casting_applicants;
DROP POLICY IF EXISTS "Users can insert their own applications" ON public.casting_applicants;
CREATE POLICY "casting_applicants_insert" ON public.casting_applicants
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles AS p 
                WHERE p.id = casting_applicants.user_id 
                  AND (p.user_id = auth.uid() OR p.id = auth.uid())
            )
            OR auth.uid() = casting_applicants.user_id
        )
        AND EXISTS (
            SELECT 1 FROM public.casting_calls AS cc 
            WHERE cc.id = casting_applicants.casting_call_id 
              AND LOWER(COALESCE(cc.status, 'open')) IN ('open', 'active')
              AND (
                  COALESCE(cc.deadline, cc.last_date_to_apply) IS NULL 
                  OR COALESCE(cc.deadline, cc.last_date_to_apply) >= CURRENT_DATE
              )
        )
    );

DROP POLICY IF EXISTS "casting_applicants_update" ON public.casting_applicants;
CREATE POLICY "casting_applicants_update" ON public.casting_applicants
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = casting_applicants.user_id AND p.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.casting_calls cc
                WHERE cc.id = casting_applicants.casting_call_id
                  AND (
                      cc.creator_id = auth.uid()
                      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cc.creator_id AND p.user_id = auth.uid())
                  )
            )
            OR public.is_global_admin()
        )
    );

DROP POLICY IF EXISTS "casting_call_saves_insert" ON public.casting_call_saves;
DROP POLICY IF EXISTS "Users can insert saves" ON public.casting_call_saves;
DROP POLICY IF EXISTS "Users can insert their own saves" ON public.casting_call_saves;
CREATE POLICY "casting_call_saves_insert" ON public.casting_call_saves
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles AS p 
                WHERE p.id = casting_call_saves.user_id 
                  AND (p.user_id = auth.uid() OR p.id = auth.uid())
            )
            OR auth.uid() = casting_call_saves.user_id
        )
    );

DROP POLICY IF EXISTS "company_applications_insert_auth" ON public.company_applications;
DROP POLICY IF EXISTS "company_applications_insert" ON public.company_applications;
CREATE POLICY "company_applications_insert_auth" ON public.company_applications
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = company_applications.user_id
                  AND p.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "company_applications_update_owner_or_admin" ON public.company_applications;
CREATE POLICY "company_applications_update_owner_or_admin" ON public.company_applications
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            EXISTS (
                SELECT 1 FROM public.companies c 
                WHERE c.id = company_applications.company_id 
                  AND c.user_id = auth.uid()
            )
            OR public.is_global_admin()
        )
    );

DROP POLICY IF EXISTS "companies_update_owner_or_admin" ON public.companies;
CREATE POLICY "companies_update_owner_or_admin" ON public.companies
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR public.is_global_admin()
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR public.is_global_admin()
        )
    );

-- Enforce public.is_caller_active() across remaining interactive write policies
DROP POLICY IF EXISTS "property_site_visits_insert_visitor" ON public.property_site_visits;
DROP POLICY IF EXISTS "property_site_visits_insert" ON public.property_site_visits;
CREATE POLICY "property_site_visits_insert_visitor" ON public.property_site_visits
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id 
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = property_site_visits.user_id OR profiles.user_id = property_site_visits.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "project_members_insert_applicant" ON public.project_members;
DROP POLICY IF EXISTS "Users can join projects" ON public.project_members;
CREATE POLICY "project_members_insert_applicant" ON public.project_members
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            (
                (
                    auth.uid() = user_id 
                    OR EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE (profiles.id = project_members.user_id OR profiles.user_id = project_members.user_id)
                          AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
                    )
                )
                AND role = 'Applicant'
            )
            OR EXISTS (
                SELECT 1 FROM public.projects 
                WHERE projects.id = project_members.project_id 
                  AND (
                      projects.created_by = auth.uid()
                      OR EXISTS (
                          SELECT 1 FROM public.profiles p
                          WHERE p.id = projects.created_by AND p.user_id = auth.uid()
                      )
                  )
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Projects', 'edit')
        )
    );

-- ======================================================================================
-- 3. R8-04: TRANSACTIONAL PROJECT MEMBER EVENTS & NOTIFICATION TRANSITION VALIDATION
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.project_member_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    actor_id UUID,
    event_type TEXT NOT NULL CHECK (event_type IN ('applied', 'accepted', 'rejected', 'updated')),
    previous_role TEXT,
    new_role TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_member_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_member_events_select" ON public.project_member_events;
CREATE POLICY "project_member_events_select" ON public.project_member_events
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() = actor_id
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_member_events.project_id
              AND (
                  p.created_by = auth.uid()
                  OR EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = p.created_by AND pr.user_id = auth.uid())
              )
        )
        OR public.is_global_admin()
    );

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
        INSERT INTO public.project_member_events (project_id, user_id, actor_id, event_type, previous_role, new_role)
        VALUES (
            OLD.project_id,
            OLD.user_id,
            auth.uid(),
            'rejected',
            OLD.role,
            NULL
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_project_member_event ON public.project_members;
CREATE TRIGGER trg_log_project_member_event
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.log_project_member_event();

-- Expand notifications_type_check constraint if present so all canonical notification types are permitted
DO $$
BEGIN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

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
    v_caller_name TEXT;
    v_target_recipient UUID;
    v_recipient_profile_id UUID;
    v_recipient_auth_id UUID;
    v_allow_profile_views BOOLEAN := true;
    v_is_staff BOOLEAN := false;
    v_authorized BOOLEAN := false;
    v_norm_type TEXT;
    v_final_title TEXT;
    v_final_desc TEXT;
    v_final_url TEXT;
    v_dedup_key_title TEXT := NULL;
    v_notification_id UUID;
BEGIN
    v_caller_auth_id := auth.uid();
    IF v_caller_auth_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to send notifications' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_caller_active() THEN
        RAISE EXCEPTION 'Blocked accounts cannot send notifications' USING ERRCODE = '42501';
    END IF;

    v_target_recipient := COALESCE(p_recipient_id, p_user_id);

    SELECT id, COALESCE(NULLIF(BTRIM(full_name), ''), NULLIF(BTRIM(username), ''), 'Someone')
    INTO v_caller_profile_id, v_caller_name
    FROM public.profiles
    WHERE user_id = v_caller_auth_id OR id = v_caller_auth_id
    ORDER BY CASE WHEN user_id = v_caller_auth_id THEN 0 ELSE 1 END
    LIMIT 1;

    SELECT id, user_id, COALESCE(allow_profile_views, true)
    INTO v_recipient_profile_id, v_recipient_auth_id, v_allow_profile_views
    FROM public.profiles 
    WHERE id = v_target_recipient OR user_id = v_target_recipient
    ORDER BY CASE WHEN id = v_target_recipient THEN 0 ELSE 1 END
    LIMIT 1;

    IF v_recipient_profile_id IS NULL THEN
        RAISE EXCEPTION 'Recipient profile not found' USING ERRCODE = '23503';
    END IF;

    v_norm_type := LOWER(BTRIM(COALESCE(p_type, 'general')));
    v_final_title := COALESCE(NULLIF(BTRIM(p_title), ''), 'Notification');
    v_final_desc := COALESCE(p_message, p_description, '');
    v_final_url := COALESCE(p_link, p_action_url);

    v_is_staff := public.is_global_admin() OR (
        public.is_caller_active()
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = v_caller_auth_id
              AND ur.role::text IN ('admin', 'moderator', 'support')
        )
    );

    -- 1. Self or active Staff notification
    IF v_caller_auth_id = v_recipient_auth_id
       OR (v_caller_profile_id IS NOT NULL AND v_caller_profile_id = v_recipient_profile_id)
       OR v_is_staff THEN
        v_authorized := true;

    -- 2. Connection notifications: validate pending request vs actual accepted transition (R8-04)
    ELSIF v_norm_type IN ('connection', 'connection_request', 'connection_accepted') THEN
        IF v_norm_type = 'connection_accepted'
           OR LOWER(v_final_title) LIKE '%accept%'
           OR LOWER(v_final_desc) LIKE '%accepted%' THEN
            IF EXISTS (
                SELECT 1 FROM public.connections c
                WHERE (
                    (c.user_id IN (v_recipient_profile_id, v_recipient_auth_id) AND c.connected_user_id IN (v_caller_profile_id, v_caller_auth_id))
                    OR
                    (c.user_id IN (v_caller_profile_id, v_caller_auth_id) AND c.connected_user_id IN (v_recipient_profile_id, v_recipient_auth_id))
                )
                  AND LOWER(COALESCE(c.status, '')) = 'accepted'
            ) THEN
                v_authorized := true;
                v_norm_type := 'connection';
                v_final_title := 'Connection Accepted';
                v_final_desc := v_caller_name || ' accepted your connection request.';
                v_final_url := COALESCE(v_final_url, '/profile/' || COALESCE(v_caller_profile_id, v_caller_auth_id)::text);
                v_dedup_key_title := v_final_title;
            END IF;
        ELSE
            IF EXISTS (
                SELECT 1 FROM public.connections c
                WHERE c.user_id IN (v_caller_profile_id, v_caller_auth_id)
                  AND c.connected_user_id IN (v_recipient_profile_id, v_recipient_auth_id)
                  AND LOWER(COALESCE(c.status, 'pending')) = 'pending'
            ) THEN
                v_authorized := true;
                v_norm_type := 'connection';
                v_final_title := 'New Connection Request';
                v_final_desc := v_caller_name || ' sent you a connection request.';
                v_final_url := COALESCE(v_final_url, '/profile/' || COALESCE(v_caller_profile_id, v_caller_auth_id)::text);
                v_dedup_key_title := v_final_title;
            END IF;
        END IF;

    -- 3. Likes (user_likes or post_likes, including discover page p_type='profile' with Like title)
    ELSIF v_norm_type IN ('like', 'user_like', 'post_like')
          OR (v_norm_type = 'profile' AND (LOWER(v_final_title) LIKE '%like%' OR LOWER(v_final_desc) LIKE '%liked your profile%')) THEN
        IF EXISTS (
            SELECT 1 FROM public.user_likes ul
            WHERE ul.user_id IN (v_caller_profile_id, v_caller_auth_id)
              AND ul.liked_user_id IN (v_recipient_profile_id, v_recipient_auth_id)
        ) OR EXISTS (
            SELECT 1 FROM public.post_likes pl
            JOIN public.posts po ON po.id = pl.post_id
            WHERE pl.user_id IN (v_caller_profile_id, v_caller_auth_id)
              AND po.author_id IN (v_recipient_profile_id, v_recipient_auth_id)
        ) THEN
            v_authorized := true;
            v_final_url := COALESCE(v_final_url, '/profile/' || COALESCE(v_caller_profile_id, v_caller_auth_id)::text);
        END IF;

    -- 4. Comments
    ELSIF v_norm_type IN ('comment', 'post_comment') THEN
        IF EXISTS (
            SELECT 1 FROM public.post_comments pc
            JOIN public.posts po ON po.id = pc.post_id
            WHERE pc.user_id IN (v_caller_profile_id, v_caller_auth_id)
              AND po.author_id IN (v_recipient_profile_id, v_recipient_auth_id)
        ) THEN
            v_authorized := true;
        END IF;

    -- 5. Jobs & Job Applications
    ELSIF v_norm_type IN ('job', 'job_application') THEN
        IF EXISTS (
            SELECT 1 FROM public.job_applications ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE (
                (j.user_id IN (v_recipient_auth_id, v_recipient_profile_id) AND (ja.user_id = v_caller_auth_id OR ja.profile_id = v_caller_profile_id))
                OR
                (j.user_id IN (v_caller_auth_id, v_caller_profile_id) AND (ja.user_id = v_recipient_auth_id OR ja.profile_id = v_recipient_profile_id))
            )
        ) THEN
            v_authorized := true;
        END IF;

    -- 6. Project applications, acceptances, rejections & tasks (R8-04)
    ELSIF v_norm_type IN ('application_update', 'project', 'project_application', 'project_invite', 'task') THEN
        IF v_norm_type = 'application_update' THEN
            IF LOWER(v_final_title) LIKE '%accept%'
               OR (LOWER(v_final_desc) LIKE '%accepted%' AND LOWER(v_final_desc) NOT LIKE '%not accepted%') THEN
                -- Acceptance: caller must be project creator and recipient must be an accepted non-Applicant member
                IF EXISTS (
                    SELECT 1 FROM public.projects p
                    JOIN public.project_members pm ON pm.project_id = p.id
                    WHERE p.created_by IN (v_caller_auth_id, v_caller_profile_id)
                      AND pm.user_id IN (v_recipient_auth_id, v_recipient_profile_id)
                      AND COALESCE(pm.role, 'Member') != 'Applicant'
                      AND (v_final_url IS NULL OR v_final_url = '/projects' OR v_final_url LIKE '%' || p.id::text || '%')
                ) THEN
                    v_authorized := true;
                    v_final_title := 'Application Accepted';
                    v_dedup_key_title := v_final_title;
                END IF;
            ELSE
                -- Rejection / Status Update: caller must be project creator and recipient must have a recorded rejection event (or pending Applicant row)
                IF EXISTS (
                    SELECT 1 FROM public.projects p
                    WHERE p.created_by IN (v_caller_auth_id, v_caller_profile_id)
                      AND (v_final_url IS NULL OR v_final_url = '/projects' OR v_final_url LIKE '%' || p.id::text || '%')
                      AND (
                          EXISTS (
                              SELECT 1 FROM public.project_member_events pme
                              WHERE pme.project_id = p.id
                                AND pme.user_id IN (v_recipient_auth_id, v_recipient_profile_id)
                                AND pme.event_type = 'rejected'
                          )
                          OR EXISTS (
                              SELECT 1 FROM public.project_members pm
                              WHERE pm.project_id = p.id
                                AND pm.user_id IN (v_recipient_auth_id, v_recipient_profile_id)
                                AND pm.role = 'Applicant'
                          )
                      )
                ) THEN
                    v_authorized := true;
                    v_final_title := 'Application Status Update';
                    v_dedup_key_title := v_final_title;
                END IF;
            END IF;
        ELSE
            IF EXISTS (
                SELECT 1 FROM public.projects p
                LEFT JOIN public.project_members pm ON pm.project_id = p.id
                LEFT JOIN public.project_tasks pt ON pt.project_id = p.id
                WHERE (
                    (p.created_by IN (v_recipient_auth_id, v_recipient_profile_id) AND pm.user_id IN (v_caller_auth_id, v_caller_profile_id))
                    OR
                    (p.created_by IN (v_caller_auth_id, v_caller_profile_id) AND (
                        pm.user_id IN (v_recipient_auth_id, v_recipient_profile_id)
                        OR pt.assigned_to IN (v_recipient_auth_id, v_recipient_profile_id)
                        OR pt.assigned_to_profile_id = v_recipient_profile_id
                    ))
                    OR
                    (pm.user_id IN (v_recipient_auth_id, v_recipient_profile_id) AND EXISTS (
                        SELECT 1 FROM public.project_members pm2
                        WHERE pm2.project_id = p.id AND pm2.user_id IN (v_caller_auth_id, v_caller_profile_id)
                    ))
                )
            ) THEN
                v_authorized := true;
            END IF;
        END IF;

    -- 7. Messages, Bookings, Locations & Site Visits (R8-04)
    ELSIF v_norm_type IN ('message', 'booking', 'location', 'site_visit') THEN
        IF v_norm_type IN ('booking', 'site_visit', 'location') THEN
            IF EXISTS (
                SELECT 1 FROM public.property_site_visits psv
                LEFT JOIN public.shooting_locations sl ON sl.id = psv.location_id
                WHERE (
                    psv.user_id IN (v_caller_auth_id, v_caller_profile_id)
                    AND (
                        psv.owner_id IN (v_recipient_auth_id, v_recipient_profile_id)
                        OR sl.created_by IN (v_recipient_auth_id, v_recipient_profile_id)
                    )
                )
                OR (
                    (
                        psv.owner_id IN (v_caller_auth_id, v_caller_profile_id)
                        OR sl.created_by IN (v_caller_auth_id, v_caller_profile_id)
                    )
                    AND psv.user_id IN (v_recipient_auth_id, v_recipient_profile_id)
                )
            ) THEN
                v_authorized := true;
            END IF;
        END IF;

        IF NOT v_authorized AND v_norm_type IN ('message', 'location') THEN
            IF EXISTS (
                SELECT 1 FROM public.messages m
                WHERE (m.sender_id IN (v_caller_profile_id, v_caller_auth_id) AND m.receiver_id IN (v_recipient_profile_id, v_recipient_auth_id))
                   OR (m.sender_id IN (v_recipient_profile_id, v_recipient_auth_id) AND m.receiver_id IN (v_caller_profile_id, v_caller_auth_id))
            ) THEN
                v_authorized := true;
            END IF;
        END IF;

    -- 8. Profile Views
    ELSIF v_norm_type IN ('profile_view', 'profile') THEN
        IF v_allow_profile_views = true THEN
            v_authorized := true;
            v_norm_type := 'profile';
            v_final_title := 'Profile View';
            v_final_desc := 'Someone viewed your profile.';
            v_final_url := '/profile/' || COALESCE(v_caller_profile_id, v_caller_auth_id)::text;
            v_dedup_key_title := v_final_title;
        END IF;
    END IF;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'Unauthorized notification recipient or missing relationship event for type %', v_norm_type USING ERRCODE = '42501';
    END IF;

    -- Event-key deduplication: independent of arbitrary caller message text variations (R8-04)
    SELECT n.id INTO v_notification_id
    FROM public.notifications n
    WHERE n.user_id = v_recipient_profile_id
      AND n.type = v_norm_type
      AND COALESCE(n.action_url, '') = COALESCE(v_final_url, '')
      AND (v_dedup_key_title IS NULL OR n.title = v_dedup_key_title)
      AND n.status = 'unread'
      AND n.created_at >= CASE
          WHEN v_norm_type = 'profile' THEN NOW() - INTERVAL '24 hours'
          ELSE NOW() - INTERVAL '60 seconds'
      END
    ORDER BY n.created_at DESC
    LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
        RETURN v_notification_id;
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
        v_final_title,
        v_final_desc,
        v_norm_type,
        'unread',
        COALESCE(p_priority, 'medium'),
        v_final_url,
        NOW()
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_authorized_notification TO authenticated;

-- ======================================================================================
-- 4. R8-05: BIND TICKET UPDATES & MESSAGES AUTHOR_ID TO AUTHENTICATED ACTOR
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.normalize_ticket_author_reference()
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
            RAISE EXCEPTION 'Ticket author_id cannot be reassigned' USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    -- When executed by an authenticated user/staff on INSERT, strictly bind author_id to caller profile (R8-05)
    IF TG_OP = 'INSERT' AND v_caller_auth_id IS NOT NULL THEN
        NEW.author_id := COALESCE(v_caller_prof_id, v_caller_auth_id);
        IF NEW.author_name IS NULL OR BTRIM(NEW.author_name) = '' THEN
            NEW.author_name := v_caller_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "ticket_updates_insert" ON public.ticket_updates;
CREATE POLICY "ticket_updates_insert" ON public.ticket_updates
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = ticket_updates.author_id
                  AND p.user_id = auth.uid()
            )
        )
        AND (
            public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
            OR public.has_staff_permission('Tickets', 'add')
        )
    );

DROP POLICY IF EXISTS "ticket_updates_update" ON public.ticket_updates;
CREATE POLICY "ticket_updates_update" ON public.ticket_updates
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = ticket_updates.author_id
                  AND p.user_id = auth.uid()
            )
        )
        AND (
            public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = ticket_updates.author_id
                  AND p.user_id = auth.uid()
            )
        )
        AND (
            public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
        )
    );

-- ======================================================================================
-- 5. R8-06: OLD/NEW-AWARE SHOOTING LOCATIONS ALIAS SYNCHRONIZATION
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.sync_shooting_location_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_type TEXT;
    v_media TEXT[];
    v_phone TEXT;
    v_email TEXT;
    v_price NUMERIC;
    v_price_hour NUMERIC;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_type := COALESCE(
            NULLIF(BTRIM(NEW.property_type), ''),
            NULLIF(BTRIM(NEW.type), ''),
            NULLIF(BTRIM(NEW.location_type), ''),
            NULLIF(BTRIM(NEW.category), '')
        );
        NEW.property_type := v_type;
        NEW.type := v_type;
        NEW.location_type := v_type;
        NEW.category := COALESCE(NULLIF(BTRIM(NEW.category), ''), v_type);

        IF NEW.media_urls IS NOT NULL THEN
            v_media := NEW.media_urls;
        ELSIF NEW.images IS NOT NULL THEN
            v_media := NEW.images;
        ELSE
            v_media := '{}'::text[];
        END IF;
        NEW.media_urls := v_media;
        NEW.images := v_media;
        IF NEW.image_url IS NULL AND array_length(v_media, 1) > 0 THEN
            NEW.image_url := v_media[1];
        END IF;

        v_phone := COALESCE(NEW.phone, NEW.contact_phone);
        NEW.phone := v_phone;
        NEW.contact_phone := v_phone;

        v_email := COALESCE(NEW.email, NEW.contact_email);
        NEW.email := v_email;
        NEW.contact_email := v_email;

        v_price := COALESCE(NEW.price, NEW.daily_rate, 0);
        NEW.price := v_price;
        NEW.daily_rate := v_price;

        v_price_hour := COALESCE(NEW.price_hour, NEW.hourly_rate);
        NEW.price_hour := v_price_hour;
        NEW.hourly_rate := v_price_hour;
    ELSE
        -- UPDATE: propagate whichever alias column actually changed relative to OLD
        IF NEW.type IS DISTINCT FROM OLD.type THEN
            v_type := NEW.type;
        ELSIF NEW.property_type IS DISTINCT FROM OLD.property_type THEN
            v_type := NEW.property_type;
        ELSIF NEW.location_type IS DISTINCT FROM OLD.location_type THEN
            v_type := NEW.location_type;
        ELSIF NEW.category IS DISTINCT FROM OLD.category THEN
            v_type := NEW.category;
        ELSE
            v_type := COALESCE(NEW.property_type, NEW.type, NEW.location_type, NEW.category);
        END IF;
        NEW.property_type := v_type;
        NEW.type := v_type;
        NEW.location_type := v_type;
        IF NEW.category IS NOT DISTINCT FROM OLD.category THEN
            NEW.category := COALESCE(v_type, NEW.category);
        END IF;

        IF NEW.media_urls IS DISTINCT FROM OLD.media_urls THEN
            v_media := COALESCE(NEW.media_urls, '{}'::text[]);
        ELSIF NEW.images IS DISTINCT FROM OLD.images THEN
            v_media := COALESCE(NEW.images, '{}'::text[]);
        ELSE
            v_media := COALESCE(NEW.media_urls, NEW.images, '{}'::text[]);
        END IF;
        NEW.media_urls := v_media;
        NEW.images := v_media;
        IF NEW.image_url IS NOT DISTINCT FROM OLD.image_url
           AND (NEW.media_urls IS DISTINCT FROM OLD.media_urls OR NEW.images IS DISTINCT FROM OLD.images) THEN
            NEW.image_url := CASE WHEN array_length(v_media, 1) > 0 THEN v_media[1] ELSE NULL END;
        END IF;

        IF NEW.phone IS DISTINCT FROM OLD.phone THEN
            v_phone := NEW.phone;
        ELSIF NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN
            v_phone := NEW.contact_phone;
        ELSE
            v_phone := COALESCE(NEW.phone, NEW.contact_phone);
        END IF;
        NEW.phone := v_phone;
        NEW.contact_phone := v_phone;

        IF NEW.email IS DISTINCT FROM OLD.email THEN
            v_email := NEW.email;
        ELSIF NEW.contact_email IS DISTINCT FROM OLD.contact_email THEN
            v_email := NEW.contact_email;
        ELSE
            v_email := COALESCE(NEW.email, NEW.contact_email);
        END IF;
        NEW.email := v_email;
        NEW.contact_email := v_email;

        IF NEW.price IS DISTINCT FROM OLD.price THEN
            v_price := NEW.price;
        ELSIF NEW.daily_rate IS DISTINCT FROM OLD.daily_rate THEN
            v_price := NEW.daily_rate;
        ELSE
            v_price := COALESCE(NEW.price, NEW.daily_rate);
        END IF;
        NEW.price := v_price;
        NEW.daily_rate := v_price;

        IF NEW.price_hour IS DISTINCT FROM OLD.price_hour THEN
            v_price_hour := NEW.price_hour;
        ELSIF NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate THEN
            v_price_hour := NEW.hourly_rate;
        ELSE
            v_price_hour := COALESCE(NEW.price_hour, NEW.hourly_rate);
        END IF;
        NEW.price_hour := v_price_hour;
        NEW.hourly_rate := v_price_hour;
    END IF;

    RETURN NEW;
END;
$$;

-- Re-synchronize any existing shooting_locations rows where aliases diverged
UPDATE public.shooting_locations
SET property_type = COALESCE(type, property_type, location_type, category),
    type = COALESCE(type, property_type, location_type, category),
    location_type = COALESCE(type, property_type, location_type, category),
    media_urls = COALESCE(media_urls, images, '{}'::text[]),
    images = COALESCE(media_urls, images, '{}'::text[]),
    phone = COALESCE(phone, contact_phone),
    contact_phone = COALESCE(phone, contact_phone),
    email = COALESCE(email, contact_email),
    contact_email = COALESCE(email, contact_email),
    price = COALESCE(price, daily_rate, 0),
    daily_rate = COALESCE(price, daily_rate, 0),
    price_hour = COALESCE(price_hour, hourly_rate),
    hourly_rate = COALESCE(price_hour, hourly_rate);

-- ======================================================================================
-- 6. R8-07: TRUTHFUL PROJECT LIKES_COUNT & TEAM_SIZE DATABASE SYNC TRIGGERS
-- ======================================================================================

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_size INTEGER NOT NULL DEFAULT 1;

-- Backfill existing projects with truthful counts from project_likes and accepted project_members
UPDATE public.projects p
SET likes_count = COALESCE((
        SELECT COUNT(*)
        FROM public.project_likes pl
        WHERE pl.project_id = p.id
    ), 0),
    team_size = 1 + COALESCE((
        SELECT COUNT(*)
        FROM public.project_members pm
        WHERE pm.project_id = p.id
          AND COALESCE(pm.role, 'Member') != 'Applicant'
          AND pm.user_id IS DISTINCT FROM p.created_by
          AND NOT EXISTS (
              SELECT 1 FROM public.profiles pr
              WHERE pr.id = pm.user_id AND pr.user_id = p.created_by
          )
          AND NOT EXISTS (
              SELECT 1 FROM public.profiles pr
              WHERE pr.user_id = pm.user_id AND pr.id = p.created_by
          )
    ), 0);

CREATE OR REPLACE FUNCTION public.sync_project_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
    v_count INTEGER;
BEGIN
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);
    SELECT COUNT(*) INTO v_count
    FROM public.project_likes
    WHERE project_id = v_project_id;

    UPDATE public.projects
    SET likes_count = v_count
    WHERE id = v_project_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_likes_count ON public.project_likes;
CREATE TRIGGER trg_sync_project_likes_count
AFTER INSERT OR DELETE ON public.project_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_project_likes_count();

CREATE OR REPLACE FUNCTION public.sync_project_team_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_project_id UUID;
    v_creator_id UUID;
    v_count INTEGER;
BEGIN
    v_project_id := COALESCE(NEW.project_id, OLD.project_id);
    SELECT created_by INTO v_creator_id
    FROM public.projects
    WHERE id = v_project_id;

    SELECT COUNT(*) INTO v_count
    FROM public.project_members pm
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.role, 'Member') != 'Applicant'
      AND pm.user_id IS DISTINCT FROM v_creator_id
      AND NOT EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = pm.user_id AND pr.user_id = v_creator_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.user_id = pm.user_id AND pr.id = v_creator_id
      );

    UPDATE public.projects
    SET team_size = 1 + COALESCE(v_count, 0)
    WHERE id = v_project_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_team_size ON public.project_members;
CREATE TRIGGER trg_sync_project_team_size
AFTER INSERT OR UPDATE OR DELETE ON public.project_members
FOR EACH ROW EXECUTE FUNCTION public.sync_project_team_size();

GRANT SELECT ON public.project_member_events TO authenticated;
GRANT ALL ON public.project_member_events TO service_role;
