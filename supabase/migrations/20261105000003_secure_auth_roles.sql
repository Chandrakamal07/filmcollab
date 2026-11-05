-- Migration: 20261105000003_secure_auth_roles.sql
-- Fix B04: Prevent privilege escalation via raw_user_meta_data on public signup.
-- Self-registered users must always receive 'user' role by default.
-- Privileged roles ('admin') must be provisioned through server-controlled workflows or direct database administrative actions.

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always default new signups to 'user'. Untrusted client metadata must NEVER grant 'admin'.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

