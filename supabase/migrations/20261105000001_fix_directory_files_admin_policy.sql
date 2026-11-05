-- Migration: 20261105000001_fix_directory_files_admin_policy.sql
-- Fix directory_files delete policy to match auth.uid() with user_roles.user_id rather than user_roles.id

DROP POLICY IF EXISTS "directory_files_delete_auth" ON public.directory_files;

CREATE POLICY "directory_files_delete_auth" ON public.directory_files
  FOR DELETE USING (
    auth.uid() = user_id 
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

