-- Migration: 20261105000004_comprehensive_security_and_contracts.sql
-- Description: Forward migration for C01-C10 security, atomicity, and schema contracts
-- 1. Companies & Company Applications tables with RLS
-- 2. Job Applications table with RLS
-- 3. Directory Files project_id association and profile-mapped RLS owner checks
-- 4. Shooting Locations non-blocked RLS policy and created_by owner checks
-- 5. Atomic Community Group Creator membership trigger

-- 1. Ensure public.companies table exists with RLS
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Film Studio',
    description TEXT,
    founder TEXT,
    established_year INTEGER,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    website TEXT,
    maps_location TEXT,
    working_hours TEXT,
    gst_number TEXT,
    services TEXT[] DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified BOOLEAN DEFAULT FALSE,
    logo TEXT,
    banner TEXT,
    jobs JSONB DEFAULT '[]'::jsonb,
    auditions JSONB DEFAULT '[]'::jsonb,
    internships JSONB DEFAULT '[]'::jsonb,
    projects JSONB DEFAULT '[]'::jsonb,
    team JSONB DEFAULT '[]'::jsonb,
    gallery TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_read_all" ON public.companies;
CREATE POLICY "companies_read_all" ON public.companies
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "companies_insert_auth" ON public.companies;
CREATE POLICY "companies_insert_auth" ON public.companies
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "companies_update_owner_or_admin" ON public.companies;
CREATE POLICY "companies_update_owner_or_admin" ON public.companies
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "companies_delete_owner_or_admin" ON public.companies;
CREATE POLICY "companies_delete_owner_or_admin" ON public.companies
    FOR DELETE USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 2. Ensure public.company_applications table exists with RLS
CREATE TABLE IF NOT EXISTS public.company_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    portfolio TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Reviewed', 'Shortlisted', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.company_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_applications_insert" ON public.company_applications;
CREATE POLICY "company_applications_insert" ON public.company_applications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR user_id IS NULL
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "company_applications_read" ON public.company_applications;
CREATE POLICY "company_applications_read" ON public.company_applications
    FOR SELECT USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.companies WHERE id = company_applications.company_id)
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "company_applications_update" ON public.company_applications;
CREATE POLICY "company_applications_update" ON public.company_applications
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM public.companies WHERE id = company_applications.company_id)
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 3. Ensure public.job_applications table exists with RLS
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    phone TEXT,
    experience TEXT,
    skills TEXT[] DEFAULT '{}',
    resume_url TEXT,
    portfolio_url TEXT,
    cover_letter TEXT,
    status TEXT NOT NULL DEFAULT 'Under Review' CHECK (status IN ('Under Review', 'Interview Scheduled', 'Shortlisted', 'Rejected', 'Hired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_applications_insert" ON public.job_applications;
CREATE POLICY "job_applications_insert" ON public.job_applications
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "job_applications_read" ON public.job_applications;
CREATE POLICY "job_applications_read" ON public.job_applications
    FOR SELECT USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.jobs WHERE id = job_applications.job_id)
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "job_applications_update" ON public.job_applications;
CREATE POLICY "job_applications_update" ON public.job_applications
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM public.jobs WHERE id = job_applications.job_id)
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 4. Directory Files: ensure project_id column and profile-mapped RLS owner checks
ALTER TABLE public.directory_files 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_directory_files_project_id ON public.directory_files(project_id);

-- Drop previous policies to replace with profile-mapped ownership check
DROP POLICY IF EXISTS "directory_files_select_all" ON public.directory_files;
CREATE POLICY "directory_files_select_all" ON public.directory_files
    FOR SELECT USING (
        status != 'blocked' 
        OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "directory_files_update_auth" ON public.directory_files;
CREATE POLICY "directory_files_update_auth" ON public.directory_files
    FOR UPDATE USING (
        user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "directory_files_delete_auth" ON public.directory_files;
CREATE POLICY "directory_files_delete_auth" ON public.directory_files
    FOR DELETE USING (
        user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 5. Shooting Locations: enforce non-blocked visibility and created_by owner checks
DROP POLICY IF EXISTS "shooting_locations_read" ON public.shooting_locations;
CREATE POLICY "shooting_locations_read" ON public.shooting_locations
    FOR SELECT USING (
        status != 'blocked' 
        OR created_by = auth.uid() 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "shooting_locations_update" ON public.shooting_locations;
CREATE POLICY "shooting_locations_update" ON public.shooting_locations
    FOR UPDATE USING (
        created_by = auth.uid() 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "shooting_locations_delete" ON public.shooting_locations;
CREATE POLICY "shooting_locations_delete" ON public.shooting_locations
    FOR DELETE USING (
        created_by = auth.uid() 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 6. Atomic Community Group Creator Membership Trigger
-- Automatically registers the creator as 'Owner' in community_group_members upon group insert
CREATE OR REPLACE FUNCTION public.handle_community_group_creator_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.community_group_members (group_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'Owner')
        ON CONFLICT (group_id, user_id) 
        DO UPDATE SET role = 'Owner';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_community_group_creator_membership ON public.community_groups;
CREATE TRIGGER tr_community_group_creator_membership
AFTER INSERT ON public.community_groups
FOR EACH ROW
EXECUTE FUNCTION public.handle_community_group_creator_membership();

