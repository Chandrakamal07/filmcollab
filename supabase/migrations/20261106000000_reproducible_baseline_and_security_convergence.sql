-- ======================================================================================
-- FilmCollab Master Schema Convergence & Security Forward Migration
-- Migration: 20261106000000_reproducible_baseline_and_security_convergence.sql
-- Addresses: M02, M03, M04, M05, M07, M08, M09, M11, M13, M15, M20, M21, M22, M23, M24, M26
-- ======================================================================================

-- 1. BASE REPRODUCIBILITY: PROFILES TABLE (M02)
-- Must support independent profile ID default and auth.users reference
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    bio TEXT,
    profession TEXT,
    category TEXT DEFAULT 'user',
    skills TEXT[],
    experience TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    location TEXT,
    phone TEXT,
    website TEXT,
    company TEXT,
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
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    projects_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure id default exists on existing profiles table
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Explicitly drop legacy foreign key on profiles.id if pointing to auth.users (M02)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
          AND contype = 'f' 
          AND conkey = ARRAY[1]::smallint[]
    ) LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_short_id ON public.profiles(short_id);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies (M02, M11)
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT USING (true);

-- Controlled Public Profile Projection (M11: Privacy enforcement)
CREATE OR REPLACE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT 
    id, user_id, full_name, first_name, last_name, username, avatar_url, cover_image_url,
    bio, profession, category, skills, experience, city, state, country, location,
    website, company, portfolio_url, imdb_url, linkedin_url, instagram_url, youtube_url, twitter_url,
    social_links, pricing_rate, pricing_unit, pricing_currency, role, short_id, public_key,
    is_verified, allow_messages_from, allow_connections_from, allow_profile_views,
    privacy_show_phone, privacy_show_email, privacy_show_dob, privacy_show_directory, privacy_show_location,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_phone, false) = true
        THEN phone 
        ELSE NULL 
    END AS phone,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_email, false) = true
        THEN email 
        ELSE NULL 
    END AS email,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
             OR COALESCE(privacy_show_dob, false) = true
        THEN date_of_birth 
        ELSE NULL 
    END AS date_of_birth,
    followers_count, following_count, projects_count, posts_count, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;
DO $$
BEGIN
    REVOKE SELECT (email, phone, date_of_birth) ON public.profiles FROM anon;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    ) WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 2. REPRODUCIBILITY: SETTINGS TABLE (M02, M12)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    privacy_settings JSONB DEFAULT '{}'::jsonb,
    notification_settings JSONB DEFAULT '{}'::jsonb,
    appearance_settings JSONB DEFAULT '{}'::jsonb,
    security_settings JSONB DEFAULT '{}'::jsonb,
    visible_to_categories TEXT[] DEFAULT '{}'::text[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS visible_to_categories TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_own" ON public.settings;
CREATE POLICY "settings_select_own" ON public.settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = settings.profile_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "settings_insert_own" ON public.settings;
CREATE POLICY "settings_insert_own" ON public.settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = settings.profile_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "settings_update_own" ON public.settings;
CREATE POLICY "settings_update_own" ON public.settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = settings.profile_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 3. REPRODUCIBILITY: ADMIN TEAM MEMBERS TABLE (M06)
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

DROP POLICY IF EXISTS "admin_team_members_select" ON public.admin_team_members;
CREATE POLICY "admin_team_members_select" ON public.admin_team_members
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "admin_team_members_manage" ON public.admin_team_members;
CREATE POLICY "admin_team_members_manage" ON public.admin_team_members
    FOR ALL USING (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 4. REPRODUCIBILITY: SHOOTING LOCATIONS & LIKES (M15, M23)
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

DROP POLICY IF EXISTS "property_types_read_public" ON public.property_types;
CREATE POLICY "property_types_read_public" ON public.property_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "property_types_admin_manage" ON public.property_types;
CREATE POLICY "property_types_admin_manage" ON public.property_types FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- 5. REPRODUCIBILITY: PROJECT TASKS & MISSING COLUMNS (M02, M03)
CREATE TABLE IF NOT EXISTS public.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    assigned_to UUID,
    assigned_to_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS assigned_to_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_tasks_select" ON public.project_tasks;
CREATE POLICY "project_tasks_select" ON public.project_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_tasks.project_id 
            AND (p.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid()))
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "project_tasks_insert" ON public.project_tasks;
CREATE POLICY "project_tasks_insert" ON public.project_tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_tasks.project_id 
            AND (p.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role != 'Applicant'))
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "project_tasks_update" ON public.project_tasks;
CREATE POLICY "project_tasks_update" ON public.project_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_tasks.project_id 
            AND (p.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.role != 'Applicant'))
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "project_tasks_delete" ON public.project_tasks;
CREATE POLICY "project_tasks_delete" ON public.project_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_tasks.project_id AND p.created_by = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- 6. REPRODUCIBILITY: SUPPORT TICKETS & MESSAGES & UPDATES (M02, M05, M28)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT UNIQUE,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    user_id UUID NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
-- Drop legacy user_id foreign key constraint if existing from historical schema (M02)
DO $$
BEGIN
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can read tickets" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id) AND p.user_id = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id) AND p.user_id = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets
    FOR UPDATE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id) AND p.user_id = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE TABLE IF NOT EXISTS public.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$
BEGIN
    ALTER TABLE public.ticket_messages DROP CONSTRAINT IF EXISTS ticket_messages_author_id_fkey;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Anyone can insert ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_participant_read" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_read" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.id = ticket_messages.ticket_id 
            AND (
                t.user_id = auth.uid() 
                OR EXISTS (SELECT 1 FROM public.profiles p WHERE (p.id = t.user_id OR p.id = t.profile_id) AND p.user_id = auth.uid())
                OR t.assigned_to = auth.uid()
            )
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "ticket_messages_participant_insert" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_insert" ON public.ticket_messages
    FOR INSERT WITH CHECK (
        (
            auth.uid() = author_id 
            OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = ticket_messages.author_id AND p.user_id = auth.uid())
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.tickets t 
                WHERE t.id = ticket_messages.ticket_id 
                AND (
                    t.user_id = auth.uid() 
                    OR EXISTS (SELECT 1 FROM public.profiles p WHERE (p.id = t.user_id OR p.id = t.profile_id) AND p.user_id = auth.uid())
                    OR t.assigned_to = auth.uid()
                )
            )
            OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        )
    );

CREATE TABLE IF NOT EXISTS public.ticket_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT,
    message TEXT,
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ticket_updates ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.ticket_updates ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.ticket_updates ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.ticket_updates ADD COLUMN IF NOT EXISTS author_name TEXT;

-- Synchronize content and message fields (M02)
UPDATE public.ticket_updates SET content = COALESCE(content, message);
UPDATE public.ticket_updates SET message = COALESCE(message, content);

CREATE OR REPLACE FUNCTION public.sync_ticket_update_content()
RETURNS TRIGGER AS $$
BEGIN
    NEW.content := COALESCE(NEW.content, NEW.message);
    NEW.message := COALESCE(NEW.message, NEW.content);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ticket_update_content ON public.ticket_updates;
CREATE TRIGGER trg_sync_ticket_update_content
BEFORE INSERT OR UPDATE ON public.ticket_updates
FOR EACH ROW EXECUTE FUNCTION public.sync_ticket_update_content();

ALTER TABLE public.ticket_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert ticket updates" ON public.ticket_updates;
DROP POLICY IF EXISTS "ticket_updates_select" ON public.ticket_updates;
CREATE POLICY "ticket_updates_select" ON public.ticket_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.id = ticket_updates.ticket_id 
            AND (
                t.user_id = auth.uid() 
                OR EXISTS (SELECT 1 FROM public.profiles p WHERE (p.id = t.user_id OR p.id = t.profile_id) AND p.user_id = auth.uid())
                OR t.assigned_to = auth.uid()
            )
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "ticket_updates_insert" ON public.ticket_updates;
CREATE POLICY "ticket_updates_insert" ON public.ticket_updates
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        OR EXISTS (
            SELECT 1 FROM public.admin_team_members atm 
            WHERE atm.user_id = auth.uid() AND atm.status = 'Active'
        )
    );

-- 7. REPRODUCIBILITY: DIRECTORY CATEGORIES, GLOBAL TAGS, SUBSCRIPTION PLANS (M02)
CREATE TABLE IF NOT EXISTS public.directory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT,
    file_type TEXT,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.directory_categories ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.directory_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "directory_categories_read_public" ON public.directory_categories;
CREATE POLICY "directory_categories_read_public" ON public.directory_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "directory_categories_admin_manage" ON public.directory_categories;
CREATE POLICY "directory_categories_admin_manage" ON public.directory_categories FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.global_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.global_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_tags_read_public" ON public.global_tags;
CREATE POLICY "global_tags_read_public" ON public.global_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "global_tags_admin_manage" ON public.global_tags;
CREATE POLICY "global_tags_admin_manage" ON public.global_tags FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    monthly_price NUMERIC,
    yearly_price NUMERIC,
    billing_cycle TEXT DEFAULT 'monthly',
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscription_plans ALTER COLUMN price SET DEFAULT 0;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS monthly_price NUMERIC;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS yearly_price NUMERIC;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS final_monthly_price NUMERIC;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS final_yearly_price NUMERIC;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_plans_read_public" ON public.subscription_plans;
CREATE POLICY "subscription_plans_read_public" ON public.subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "subscription_plans_admin_manage" ON public.subscription_plans;
CREATE POLICY "subscription_plans_admin_manage" ON public.subscription_plans FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
);

-- 8. FORWARD UPGRADES ON EXISTING TABLES (M21, M22, M08, M25, M26)
-- Ensure all workspace columns exist on companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS jobs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS auditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS internships JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS team JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS courses JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS banner TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Ensure requirements column exists on jobs
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS requirements TEXT;

-- Ensure missing columns exist on casting_calls (M08)
ALTER TABLE public.casting_calls ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE public.casting_calls ADD COLUMN IF NOT EXISTS script_attachment_url TEXT;
ALTER TABLE public.casting_calls ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE;
UPDATE public.casting_calls SET deadline = COALESCE(deadline, last_date_to_apply);

-- Ensure client_message_id exists on messages for idempotent delivery (M26)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_message_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_message_id ON public.messages(client_message_id) WHERE client_message_id IS NOT NULL;

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

-- 9. STRICT RLS POLICIES & SECURITY FIXES (M03, M04, M05, M07, M21, M22, M23, M24)

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

-- Directory Files Policies (M11, M23, M24)
DROP POLICY IF EXISTS "directory_files_select_all" ON public.directory_files;
CREATE POLICY "directory_files_select_all" ON public.directory_files
    FOR SELECT USING (
        (
            status != 'blocked' 
            AND NOT ('Blocked' = ANY(COALESCE(tags, '{}')))
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE (p.id = directory_files.user_id OR p.user_id = directory_files.user_id)
                  AND COALESCE(p.privacy_show_directory, true) = true
            )
        )
        OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Storage objects policy for directory_assets bucket (M11)
DROP POLICY IF EXISTS "directory_assets_public_access" ON storage.objects;
DROP POLICY IF EXISTS "directory_assets_select_policy" ON storage.objects;
CREATE POLICY "directory_assets_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'directory_assets' AND (
            auth.uid() = owner
            OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
            OR EXISTS (
                SELECT 1 FROM public.directory_files df
                JOIN public.profiles p ON (p.id = df.user_id OR p.user_id = df.user_id)
                WHERE df.file_url LIKE '%' || storage.objects.name || '%'
                  AND df.status != 'blocked'
                  AND NOT ('Blocked' = ANY(COALESCE(df.tags, '{}')))
                  AND COALESCE(p.privacy_show_directory, true) = true
            )
        )
    );

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

DROP POLICY IF EXISTS "directory_files_update_auth" ON public.directory_files;
CREATE POLICY "directory_files_update_auth" ON public.directory_files
    FOR UPDATE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = directory_files.user_id OR profiles.user_id = directory_files.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "directory_files_delete_auth" ON public.directory_files;
CREATE POLICY "directory_files_delete_auth" ON public.directory_files
    FOR DELETE USING (
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

-- Project Members Policies (M03: Prevent arbitrary privilege escalation on self-join, creator approval)
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

DROP POLICY IF EXISTS "project_members_update_creator" ON public.project_members;
CREATE POLICY "project_members_update_creator" ON public.project_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "project_members_delete_creator" ON public.project_members;
CREATE POLICY "project_members_delete_creator" ON public.project_members
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.projects p 
            WHERE p.id = project_members.project_id AND p.created_by = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Project Privacy & Visibility (M03)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_status TEXT DEFAULT 'Public';
UPDATE public.projects SET visibility = COALESCE(visibility, LOWER(project_status), 'public');
UPDATE public.projects SET project_status = COALESCE(project_status, INITCAP(visibility), 'Public');

DROP POLICY IF EXISTS "Anyone can view projects" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
CREATE POLICY "projects_select_policy" ON public.projects
    FOR SELECT USING (
        (LOWER(COALESCE(visibility, project_status, 'public')) = 'public')
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.project_members pm 
            WHERE pm.project_id = projects.id 
              AND pm.user_id = auth.uid()
              AND pm.role != 'Applicant'
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
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

-- Direct Messages Policies (M07: Profile FK vs Auth UID mapping, Read Receipt UPDATE)
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

DROP POLICY IF EXISTS "Users can update received messages" ON public.messages;
DROP POLICY IF EXISTS "messages_update_received" ON public.messages;
CREATE POLICY "messages_update_received" ON public.messages
    FOR UPDATE USING (
        auth.uid() = receiver_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = messages.receiver_id OR profiles.user_id = messages.receiver_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    ) WITH CHECK (
        auth.uid() = receiver_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = messages.receiver_id OR profiles.user_id = messages.receiver_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Enforce immutability of message content and identity on UPDATE (M07)
CREATE OR REPLACE FUNCTION public.check_message_update_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') THEN
        RETURN NEW;
    END IF;

    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR
       NEW.receiver_id IS DISTINCT FROM OLD.receiver_id OR
       NEW.content IS DISTINCT FROM OLD.content OR
       NEW.type IS DISTINCT FROM OLD.type OR
       NEW.client_message_id IS DISTINCT FROM OLD.client_message_id THEN
        RAISE EXCEPTION 'Cannot modify message content, sender, or receiver identity' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_message_update_immutability ON public.messages;
CREATE TRIGGER trg_check_message_update_immutability
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.check_message_update_immutability();

-- Social Connections & Saves Policies (M04)
DROP POLICY IF EXISTS "connections_insert_policy" ON public.connections;
CREATE POLICY "connections_insert_policy" ON public.connections
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = connections.user_id OR profiles.user_id = connections.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

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

DROP POLICY IF EXISTS "connections_delete_policy" ON public.connections;
CREATE POLICY "connections_delete_policy" ON public.connections
    FOR DELETE USING (
        auth.uid() = user_id
        OR auth.uid() = connected_user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = connections.user_id OR profiles.user_id = connections.user_id
                   OR profiles.id = connections.connected_user_id OR profiles.user_id = connections.connected_user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_saves;
DROP POLICY IF EXISTS "user_saves_insert_policy" ON public.user_saves;
CREATE POLICY "user_saves_insert_policy" ON public.user_saves
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = user_saves.user_id OR profiles.user_id = user_saves.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
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

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.user_likes;
DROP POLICY IF EXISTS "user_likes_insert_policy" ON public.user_likes;
CREATE POLICY "user_likes_insert_policy" ON public.user_likes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = user_likes.user_id OR profiles.user_id = user_likes.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "user_likes_delete_policy" ON public.user_likes;
CREATE POLICY "user_likes_delete_policy" ON public.user_likes
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = user_likes.user_id OR profiles.user_id = user_likes.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

-- Posts Policies (M04, M10, M23)
-- Must drop the original permissive policy from create_posts_table.sql
DROP POLICY IF EXISTS "Enable read access for all users" ON public.posts;
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

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON public.posts;
CREATE POLICY "posts_insert_policy" ON public.posts
    FOR INSERT WITH CHECK (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Enable update for users who created the post" ON public.posts;
DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
CREATE POLICY "posts_update_policy" ON public.posts
    FOR UPDATE USING (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Enable delete for users who created the post" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;
CREATE POLICY "posts_delete_policy" ON public.posts
    FOR DELETE USING (
        auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Post Likes Policies (M10: Profile PK vs Auth ID compatibility)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert_policy" ON public.post_likes;
CREATE POLICY "post_likes_insert_policy" ON public.post_likes
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_likes.user_id OR profiles.user_id = post_likes.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "post_likes_delete_policy" ON public.post_likes;
CREATE POLICY "post_likes_delete_policy" ON public.post_likes
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_likes.user_id OR profiles.user_id = post_likes.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

-- Post Saves Policies (M10)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.post_saves;
DROP POLICY IF EXISTS "post_saves_insert_policy" ON public.post_saves;
CREATE POLICY "post_saves_insert_policy" ON public.post_saves
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_saves.user_id OR profiles.user_id = post_saves.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "post_saves_delete_policy" ON public.post_saves;
CREATE POLICY "post_saves_delete_policy" ON public.post_saves
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = post_saves.user_id OR profiles.user_id = post_saves.user_id)
            AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
    );

-- Job Applications Policies (M22: Strict profile_id binding to auth applicant)
DROP POLICY IF EXISTS "job_applications_insert" ON public.job_applications;
CREATE POLICY "job_applications_insert" ON public.job_applications
    FOR INSERT WITH CHECK (
        (
            auth.uid() = user_id 
            AND (
                profile_id IS NULL 
                OR EXISTS (
                    SELECT 1 FROM public.profiles AS p 
                    WHERE p.id = job_applications.profile_id 
                      AND p.user_id = auth.uid()
                )
            )
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Enforce immutability of job applicant identity and job association on UPDATE (M22)
CREATE OR REPLACE FUNCTION public.check_job_application_update_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin') THEN
        RETURN NEW;
    END IF;

    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR
       NEW.profile_id IS DISTINCT FROM OLD.profile_id OR
       NEW.job_id IS DISTINCT FROM OLD.job_id THEN
        RAISE EXCEPTION 'Cannot alter candidate identity or job association' USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_job_application_update_immutability ON public.job_applications;
CREATE TRIGGER trg_check_job_application_update_immutability
BEFORE UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.check_job_application_update_immutability();

DROP POLICY IF EXISTS "job_applications_read" ON public.job_applications;
CREATE POLICY "job_applications_read" ON public.job_applications
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_applications.job_id AND j.user_id = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Community Group Join & Post Policies (M13)
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE public.community_groups ADD COLUMN IF NOT EXISTS allow_member_posts BOOLEAN DEFAULT TRUE;

ALTER TABLE public.community_group_members DROP CONSTRAINT IF EXISTS community_group_members_role_check;
ALTER TABLE public.community_group_members ADD CONSTRAINT community_group_members_role_check CHECK (role IN ('Owner', 'Admin', 'Moderator', 'Member', 'Pending'));

-- Keep settings JSONB and columns synchronized (M13)
CREATE OR REPLACE FUNCTION public.sync_community_group_settings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.require_approval := COALESCE(NEW.require_approval, (NEW.settings->>'requireApproval')::boolean, false);
    NEW.allow_member_posts := COALESCE(NEW.allow_member_posts, (NEW.settings->>'allowMemberPosts')::boolean, true);
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

DROP POLICY IF EXISTS "community_group_members_insert" ON public.community_group_members;
CREATE POLICY "community_group_members_insert" ON public.community_group_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            (role = 'Member' AND EXISTS (
                SELECT 1 FROM public.community_groups g
                WHERE g.id = group_id AND g.privacy = 'public' AND COALESCE(g.require_approval, (g.settings->>'requireApproval')::boolean, false) = false
            ))
            OR
            (role = 'Pending' AND EXISTS (
                SELECT 1 FROM public.community_groups g
                WHERE g.id = group_id AND COALESCE(g.require_approval, (g.settings->>'requireApproval')::boolean, false) = true
            ))
            OR
            (role = 'Owner' AND EXISTS (
                SELECT 1 FROM public.community_groups g
                WHERE g.id = group_id AND g.created_by = auth.uid()
            ))
            OR
            (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
        )
    );

DROP POLICY IF EXISTS "community_group_members_update_owner" ON public.community_group_members;
CREATE POLICY "community_group_members_update_owner" ON public.community_group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.community_groups g
            WHERE g.id = community_group_members.group_id AND g.created_by = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "community_group_messages_insert" ON public.community_group_messages;
CREATE POLICY "community_group_messages_insert" ON public.community_group_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            EXISTS (
                SELECT 1 FROM public.community_groups g
                WHERE g.id = group_id 
                AND (
                    g.created_by = auth.uid()
                    OR (
                        COALESCE(g.allow_member_posts, (g.settings->>'allowMemberPosts')::boolean, true) = true 
                        AND EXISTS (
                            SELECT 1 FROM public.community_group_members m 
                            WHERE m.group_id = g.id AND m.user_id = auth.uid() AND m.role != 'Pending'
                        )
                    )
                )
            )
            OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        )
    );

-- Site Settings Policy (M05: Restrict updates to Admin only)
DROP POLICY IF EXISTS "Allow authenticated to update site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Allow authenticated to insert site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
CREATE POLICY "site_settings_admin_insert" ON public.site_settings
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
CREATE POLICY "site_settings_admin_update" ON public.site_settings
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Notification Policies & Functions (M09: Restrict arbitrary forgery)
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        OR auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = notifications.user_id OR p.user_id = notifications.user_id)
            AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
    );

-- Authorized Cross-Account Notification RPC (M09)
CREATE OR REPLACE FUNCTION public.send_authorized_notification(
    p_recipient_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'general',
    p_link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recipient_auth_id UUID;
    v_notification_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required to send notifications' USING ERRCODE = '42501';
    END IF;

    SELECT COALESCE(user_id, id) INTO v_recipient_auth_id 
    FROM public.profiles 
    WHERE id = p_recipient_id OR user_id = p_recipient_id
    LIMIT 1;

    IF v_recipient_auth_id IS NULL THEN
        v_recipient_auth_id := p_recipient_id;
    END IF;

    INSERT INTO public.notifications (
        id,
        user_id,
        title,
        message,
        type,
        link,
        is_read,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_recipient_auth_id,
        p_title,
        p_message,
        COALESCE(p_type, 'general'),
        p_link,
        false,
        NOW()
    ) RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_authorized_notification TO authenticated;

-- Atomic Admin Team Provisioning & Revocation (M06)
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
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Only administrators can provision team members' USING ERRCODE = '42501';
    END IF;

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

    v_db_role := CASE 
        WHEN LOWER(p_role) = 'admin' THEN 'admin'
        WHEN LOWER(p_role) = 'moderator' THEN 'moderator'
        ELSE 'support'
    END;

    IF p_status = 'Active' THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (p_user_id, v_db_role)
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
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
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
        WHERE user_id = v_user_id AND role = v_db_role;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provision_admin_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_admin_team_member TO authenticated;

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

-- Casting Calls Correlated Policies (M08: Qualified table aliases preventing shadow binding)
DROP POLICY IF EXISTS "Users can insert casting calls" ON public.casting_calls;
CREATE POLICY "Users can insert casting calls" ON public.casting_calls
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = casting_calls.creator_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Users can update their own casting calls" ON public.casting_calls;
CREATE POLICY "Users can update their own casting calls" ON public.casting_calls
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = casting_calls.creator_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Users can delete their own casting calls" ON public.casting_calls;
CREATE POLICY "Users can delete their own casting calls" ON public.casting_calls
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = casting_calls.creator_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
        )
        OR auth.uid() = creator_id
    );

DROP POLICY IF EXISTS "Users can insert their own applications" ON public.casting_applicants;
DROP POLICY IF EXISTS "Users can insert applications" ON public.casting_applicants;
DROP POLICY IF EXISTS "Users can manage their own applications" ON public.casting_applicants;
DROP POLICY IF EXISTS "Users can view their own applications" ON public.casting_applicants;
CREATE POLICY "Users can insert applications" ON public.casting_applicants
    FOR INSERT WITH CHECK (
        (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles AS p 
                WHERE p.id = casting_applicants.user_id 
                  AND p.user_id = auth.uid()
            )
        )
        AND EXISTS (
            SELECT 1 FROM public.casting_calls cc
            WHERE cc.id = casting_applicants.casting_call_id
              AND (LOWER(COALESCE(cc.status, 'open')) IN ('open', 'active'))
              AND (COALESCE(cc.deadline, cc.last_date_to_apply) IS NULL OR COALESCE(cc.deadline, cc.last_date_to_apply) >= CURRENT_DATE)
        )
    );

-- Atomic Casting Capacity Check Trigger (M08)
CREATE OR REPLACE FUNCTION public.check_casting_capacity()
RETURNS TRIGGER AS $$
DECLARE
    v_max INT;
    v_current INT;
BEGIN
    SELECT max_applications INTO v_max 
    FROM public.casting_calls 
    WHERE id = NEW.casting_call_id;

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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_casting_capacity ON public.casting_applicants;
CREATE TRIGGER trg_check_casting_capacity
BEFORE INSERT ON public.casting_applicants
FOR EACH ROW EXECUTE FUNCTION public.check_casting_capacity();

DROP POLICY IF EXISTS "Users can view relevant applications" ON public.casting_applicants;
CREATE POLICY "Users can view relevant applications" ON public.casting_applicants
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles AS p 
            WHERE p.id = casting_applicants.user_id 
              AND p.user_id = auth.uid()
        )
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
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles AS p 
            WHERE p.id = casting_applicants.user_id 
              AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.casting_calls c
            JOIN public.profiles p ON p.id = c.creator_id
            WHERE c.id = casting_call_id AND (p.user_id = auth.uid() OR p.id = auth.uid() OR c.creator_id = auth.uid())
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Users can insert saves" ON public.casting_call_saves;
DROP POLICY IF EXISTS "Users can manage their own saves" ON public.casting_call_saves;
DROP POLICY IF EXISTS "Users can view their own saves" ON public.casting_call_saves;
DROP POLICY IF EXISTS "casting_call_saves_select" ON public.casting_call_saves;
CREATE POLICY "casting_call_saves_select" ON public.casting_call_saves
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles AS p 
            WHERE p.id = casting_call_saves.user_id 
              AND p.user_id = auth.uid()
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE POLICY "Users can insert saves" ON public.casting_call_saves
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles AS p 
            WHERE p.id = casting_call_saves.user_id 
              AND p.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete saves" ON public.casting_call_saves;
CREATE POLICY "Users can delete saves" ON public.casting_call_saves
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles AS p 
            WHERE p.id = casting_call_saves.user_id 
              AND p.user_id = auth.uid()
        )
    );

-- Drop unsafe legacy repair storage policies (M05)
DROP POLICY IF EXISTS "Anyone can delete post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete post media" ON storage.objects;

DROP POLICY IF EXISTS "Users can delete saves" ON public.casting_call_saves;
CREATE POLICY "Users can delete saves" ON public.casting_call_saves
    FOR DELETE USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles AS p 
            WHERE p.id = casting_call_saves.user_id 
              AND p.user_id = auth.uid()
        )
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
