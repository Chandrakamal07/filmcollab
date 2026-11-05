-- Migration: 20261105000001_fix_directory_files_admin_policy.sql
-- Fix B10: Add directory_files status column for moderation, enforce non-blocked visibility, and allow admin update/delete

-- 1. Ensure status column exists for directory moderation
ALTER TABLE public.directory_files 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'flagged'));

-- 2. Non-blocked visibility policy (blocked items are hidden from public except owner and admins)
DROP POLICY IF EXISTS "directory_files_select_all" ON public.directory_files;

CREATE POLICY "directory_files_select_all" ON public.directory_files
  FOR SELECT USING (
    status != 'blocked' 
    OR auth.uid() = user_id 
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- 3. Update policy allowing file owner and admins to update (status, tags, metadata)
DROP POLICY IF EXISTS "directory_files_update_auth" ON public.directory_files;

CREATE POLICY "directory_files_update_auth" ON public.directory_files
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- 4. Delete policy matching auth.uid() with user_roles.user_id
DROP POLICY IF EXISTS "directory_files_delete_auth" ON public.directory_files;

CREATE POLICY "directory_files_delete_auth" ON public.directory_files
  FOR DELETE USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );
