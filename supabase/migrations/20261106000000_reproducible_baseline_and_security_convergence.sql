-- ======================================================================================
-- FilmCollab Master Schema Convergence & Security Forward Migration
-- Migration: 20261106000000_reproducible_baseline_and_security_convergence.sql
-- Addresses: M02, M03, M04, M05, M07, M08, M09, M11, M13, M20, M21, M22, M23, M24
-- ======================================================================================

-- 1. BASE REPRODUCIBILITY: PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    profession TEXT,
    category TEXT,
    skills TEXT[],
    experience TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    location TEXT,
    phone TEXT,
    website TEXT,
    portfolio_url TEXT,
    imdb_url TEXT,
    linkedin_url TEXT,
    instagram_url TEXT,
    youtube_url TEXT,
    twitter_url TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    pricing_rate NUMERIC,
    pricing_unit TEXT,
    pricing_currency TEXT DEFAULT 'INR',
    role TEXT DEFAULT 'user',
    short_id VARCHAR(10) UNIQUE,
    public_key TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    allow_messages_from TEXT DEFAULT 'everyone',
    allow_connections_from TEXT DEFAULT 'everyone',
    allow_profile_views BOOLEAN DEFAULT TRUE,
    privacy_show_phone BOOLEAN DEFAULT TRUE,
    privacy_show_email BOOLEAN DEFAULT TRUE,
    privacy_show_dob BOOLEAN DEFAULT TRUE,
    privacy_show_directory BOOLEAN DEFAULT TRUE,
    privacy_show_location BOOLEAN DEFAULT TRUE,
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_short_id ON public.profiles(short_id);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. REPRODUCIBILITY: SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    privacy_settings JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. REPRODUCIBILITY: ADMIN TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'Moderator',
    status TEXT NOT NULL DEFAULT 'Active',
    permissions JSONB DEFAULT '{}'::jsonb,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_team_members ENABLE ROW LEVEL SECURITY;

-- 4. REPRODUCIBILITY: SHOOTING LOCATIONS & LIKES
CREATE TABLE IF NOT EXISTS public.shooting_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    location_type TEXT,
    category TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    daily_rate NUMERIC,
    hourly_rate NUMERIC,
    price NUMERIC,
    price_hour NUMERIC,
    price_type TEXT DEFAULT 'per_day',
    security_deposit NUMERIC,
    amenities TEXT[],
    rules TEXT[],
    image_url TEXT,
    images TEXT[],
    owner_name TEXT,
    contact_person TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    contact_phone_whatsapp TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    tags TEXT[] DEFAULT '{}'::text[],
    featured BOOLEAN DEFAULT FALSE,
    rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.shooting_locations ENABLE ROW LEVEL SECURITY;

-- Ensure required columns exist on shooting_locations if already created earlier
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS price NUMERIC;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS price_hour NUMERIC;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'per_day';
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS security_deposit NUMERIC;

CREATE TABLE IF NOT EXISTS public.shooting_location_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.shooting_locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(location_id, user_id)
);
ALTER TABLE public.shooting_location_likes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES public.shooting_locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    selected_day TEXT,
    selected_time TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.property_site_visits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.property_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

-- 5. REPRODUCIBILITY: PROJECT TASKS & MISSING COLUMNS
CREATE TABLE IF NOT EXISTS public.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_to UUID,
    assigned_to_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- 6. REPRODUCIBILITY: SUPPORT TICKETS & MESSAGES
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 7. REPRODUCIBILITY: DIRECTORY CATEGORIES, GLOBAL TAGS, SUBSCRIPTION PLANS
CREATE TABLE IF NOT EXISTS public.directory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.directory_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.global_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.global_tags ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    billing_cycle TEXT DEFAULT 'monthly',
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 8. FORWARD UPGRADES ON EXISTING TABLES (M21, M22, M08)
-- Ensure all workspace columns exist on companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS jobs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS auditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS internships JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS team JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS banner TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Ensure requirements column exists on jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS requirements TEXT;

-- Ensure missing columns exist on casting_calls
ALTER TABLE public.casting_calls ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE public.casting_calls ADD COLUMN IF NOT EXISTS script_attachment_url TEXT;

-- Ensure profile_id relationship exists on job_applications (M22)
ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS profile_id UUID;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_profile_id_fkey'
    ) THEN
        ALTER TABLE public.job_applications
        ADD CONSTRAINT job_applications_profile_id_fkey
        FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Backfill profile_id on job_applications where matching profile exists
UPDATE public.job_applications ja
SET profile_id = p.id
FROM public.profiles p
WHERE ja.profile_id IS NULL AND (ja.user_id = p.user_id OR ja.user_id = p.id);

-- 9. STRICT RLS POLICIES & SECURITY FIXES (M03, M04, M05, M07, M21, M23, M24)

-- Companies Policies (M21: Drop legacy permissive policy and enforce user ownership / admin)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_auth" ON public.companies;
CREATE POLICY "companies_insert_auth" ON public.companies
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.companies;
DROP POLICY IF EXISTS "companies_update_owner" ON public.companies;
CREATE POLICY "companies_update_owner" ON public.companies
    FOR UPDATE USING (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Directory Files Policies (M24: Allow insert with profile ID or auth ID)
DROP POLICY IF EXISTS "directory_files_insert_auth" ON public.directory_files;
CREATE POLICY "directory_files_insert_auth" ON public.directory_files
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = directory_files.user_id OR profiles.user_id = directory_files.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Shooting Locations Policies (M23: Check both status != 'blocked' AND NOT 'Blocked' = ANY(tags))
DROP POLICY IF EXISTS "shooting_locations_read" ON public.shooting_locations;
CREATE POLICY "shooting_locations_read" ON public.shooting_locations
    FOR SELECT USING (
        (status != 'blocked' AND NOT ('Blocked' = ANY(COALESCE(tags, '{}'))))
        OR created_by = auth.uid() 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Project Members Policies (M03: Prevent arbitrary privilege escalation on self-join)
DROP POLICY IF EXISTS "Users can join projects" ON public.project_members;
CREATE POLICY "Users can join projects" ON public.project_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            role = 'Applicant' 
            OR EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_members.project_id AND created_by = auth.uid()
            )
            OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        )
    );

-- Project Messages Policies (M03, M07: Bind sender_id to authenticated profile)
DROP POLICY IF EXISTS "Users can insert project messages" ON public.project_messages;
CREATE POLICY "Users can insert project messages" ON public.project_messages
    FOR INSERT WITH CHECK (
        (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = project_messages.sender_id OR profiles.user_id = project_messages.sender_id)
                AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR auth.uid() = sender_id
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.projects 
                WHERE id = project_messages.project_id AND created_by = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.project_members 
                WHERE project_id = project_messages.project_id AND user_id = auth.uid() AND role != 'Applicant'
            )
            OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        )
    );

-- Direct Messages Policies (M07: Profile FK vs Auth UID mapping)
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
CREATE POLICY "Users can read their own messages" ON public.messages
    FOR SELECT USING (
        auth.uid() = sender_id 
        OR auth.uid() = receiver_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = messages.sender_id OR profiles.user_id = messages.sender_id 
                   OR profiles.id = messages.receiver_id OR profiles.user_id = messages.receiver_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id 
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = messages.sender_id OR profiles.user_id = messages.sender_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Social Connections & Saves Policies (M04)
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
    );

DROP POLICY IF EXISTS "user_saves_select_policy" ON public.user_saves;
CREATE POLICY "user_saves_select_policy" ON public.user_saves
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = user_saves.user_id OR profiles.user_id = user_saves.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Posts Policies (M04: Unpublished visibility & Author binding)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.posts;
CREATE POLICY "Enable insert for authenticated users only" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
CREATE POLICY "posts_select_policy" ON public.posts
    FOR SELECT USING (
        is_published = true
        OR auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Site Settings Policy (M05: Restrict updates to Admin only)
DROP POLICY IF EXISTS "Allow authenticated to update site_settings" ON public.site_settings;
CREATE POLICY "site_settings_admin_update" ON public.site_settings
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Ticket Messages Policies (M05: Restrict reads to ticket participants/admins)
DROP POLICY IF EXISTS "Anyone can read ticket messages" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_read" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.id = ticket_messages.ticket_id 
            AND (t.user_id = auth.uid() OR t.assigned_to = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Notification Triggers & Job Posting Trigger Repair (M09)
CREATE OR REPLACE FUNCTION public.handle_new_job_notifications()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
  SELECT 
    p.id,
    'New Job Opportunity',
    'A new job position has been posted: ' || COALESCE(NEW.job_title, 'New Job Position') || ' at ' || COALESCE(NEW.company_name, 'a Film Studio') || '.',
    'job',
    'high',
    '/jobs'
  FROM public.profiles p
  ORDER BY COALESCE(p.updated_at, '1970-01-01'::timestamp) DESC
  LIMIT 50;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Community Groups Creator Membership Trigger (M20: idempotent on conflict)
CREATE OR REPLACE FUNCTION public.handle_community_group_creator()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.community_group_members (group_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'Owner')
        ON CONFLICT (group_id, user_id) 
        DO UPDATE SET role = 'Owner';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Casting Calls Actor/Profile Policies (M08: resolve creator_id through profiles)
DROP POLICY IF EXISTS "Users can insert casting calls" ON public.casting_calls;
CREATE POLICY "Users can insert casting calls" ON public.casting_calls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = creator_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Users can update their own casting calls" ON public.casting_calls;
CREATE POLICY "Users can update their own casting calls" ON public.casting_calls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = creator_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Users can delete their own casting calls" ON public.casting_calls;
CREATE POLICY "Users can delete their own casting calls" ON public.casting_calls
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = creator_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Users can insert applications" ON public.casting_applicants;
CREATE POLICY "Users can insert applications" ON public.casting_applicants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = user_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Users can view relevant applications" ON public.casting_applicants;
CREATE POLICY "Users can view relevant applications" ON public.casting_applicants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = user_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.casting_calls c
            JOIN public.profiles p ON p.id = c.creator_id
            WHERE c.id = casting_call_id AND (p.user_id = auth.uid() OR p.id = auth.uid() OR c.creator_id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Users can manage applications" ON public.casting_applicants;
CREATE POLICY "Users can manage applications" ON public.casting_applicants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.casting_calls c
            JOIN public.profiles p ON p.id = c.creator_id
            WHERE c.id = casting_call_id AND (p.user_id = auth.uid() OR p.id = auth.uid() OR c.creator_id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Users can delete applications" ON public.casting_applicants;
CREATE POLICY "Users can delete applications" ON public.casting_applicants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = user_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.casting_calls c
            JOIN public.profiles p ON p.id = c.creator_id
            WHERE c.id = casting_call_id AND (p.user_id = auth.uid() OR p.id = auth.uid() OR c.creator_id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Users can insert saves" ON public.casting_call_saves;
CREATE POLICY "Users can insert saves" ON public.casting_call_saves
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = user_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = user_id
    );

DROP POLICY IF EXISTS "Users can delete saves" ON public.casting_call_saves;
CREATE POLICY "Users can delete saves" ON public.casting_call_saves
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = user_id AND (user_id = auth.uid() OR id = auth.uid())
        )
        OR auth.uid() = user_id
    );

-- Property Site Visits & Location Likes Policies (M15)
DROP POLICY IF EXISTS "property_site_visits_insert" ON public.property_site_visits;
CREATE POLICY "property_site_visits_insert" ON public.property_site_visits
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
    );

DROP POLICY IF EXISTS "property_site_visits_select" ON public.property_site_visits;
CREATE POLICY "property_site_visits_select" ON public.property_site_visits
    FOR SELECT USING (
        auth.uid() = user_id 
        OR auth.uid() = owner_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "property_site_visits_update" ON public.property_site_visits;
CREATE POLICY "property_site_visits_update" ON public.property_site_visits
    FOR UPDATE USING (
        auth.uid() = owner_id 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "shooting_location_likes_select" ON public.shooting_location_likes;
CREATE POLICY "shooting_location_likes_select" ON public.shooting_location_likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "shooting_location_likes_insert" ON public.shooting_location_likes;
CREATE POLICY "shooting_location_likes_insert" ON public.shooting_location_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "shooting_location_likes_delete" ON public.shooting_location_likes;
CREATE POLICY "shooting_location_likes_delete" ON public.shooting_location_likes
    FOR DELETE USING (auth.uid() = user_id);
