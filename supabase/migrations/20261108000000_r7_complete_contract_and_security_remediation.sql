-- ======================================================================================
-- FilmCollab R7 Complete Contract, Schema, Privacy & Security Forward Migration
-- Migration: 20261108000000_r7_complete_contract_and_security_remediation.sql
-- Addresses: R7-01, R7-02, R7-03, R7-04, R7-05, R7-06, R7-07, R7-08, R7-09, R7-10
-- Preserves: M01 through M28
-- ======================================================================================

-- ======================================================================================
-- 1. MISSING PRODUCTION TABLES & SEED CONTRACTS (R7-01, R7-10)
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    department TEXT DEFAULT 'Production',
    slug TEXT,
    description TEXT,
    icon TEXT,
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Production';
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

INSERT INTO public.categories (name, department, is_active, display_order)
VALUES
    ('Director', 'Direction', true, 1),
    ('Producer', 'Production', true, 2),
    ('Cinematographer', 'Camera & Lighting', true, 3),
    ('Editor', 'Post-Production', true, 4),
    ('Writer', 'Writing', true, 5),
    ('Actor', 'Performers', true, 6),
    ('Sound Designer', 'Sound & Music', true, 7),
    ('Music Composer', 'Sound & Music', true, 8),
    ('VFX Artist', 'Post-Production', true, 9),
    ('Production Designer', 'Art & Design', true, 10),
    ('Casting Director', 'Casting', true, 11),
    ('Costume Designer', 'Art & Design', true, 12),
    ('Colorist', 'Post-Production', true, 13),
    ('Gaffer', 'Camera & Lighting', true, 14),
    ('Stunt Coordinator', 'Action & Stunts', true, 15),
    ('Animator', 'Post-Production', true, 16),
    ('Line Producer', 'Production', true, 17),
    ('Art Director', 'Art & Design', true, 18)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.property_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.property_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;

INSERT INTO public.property_types (name, description)
VALUES
    ('Studio Stage', 'Soundproof indoor filming stages and cycloramas'),
    ('Heritage Bungalow', 'Vintage and period residential properties'),
    ('Modern Apartment', 'Contemporary urban flats and penthouses'),
    ('Warehouse / Industrial', 'Raw industrial spaces and factories'),
    ('Outdoor / Nature', 'Farms, forests, beaches, and scenic landscapes'),
    ('Palace / Fort', 'Historical palaces and royal estates'),
    ('Office / Corporate', 'Boardrooms, coworking floors, and commercial towers'),
    ('Cafe / Restaurant', 'Hospitality venues, diners, and lounges'),
    ('Farmhouse / Villa', 'Luxury villas and gated retreats'),
    ('Rooftop', 'Open-air terraces with skyline views')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.industry_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL,
    content TEXT,
    category TEXT NOT NULL,
    author TEXT NOT NULL,
    image_url TEXT,
    read_time TEXT DEFAULT '5 min read',
    featured BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.industry_news ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.industry_news ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.industry_news ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.industry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    type TEXT NOT NULL,
    attendees INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    description TEXT,
    image_url TEXT,
    registration_link TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.industry_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.industry_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.industry_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    instructor TEXT NOT NULL,
    duration TEXT NOT NULL,
    students INTEGER DEFAULT 0,
    rating NUMERIC(3, 1) DEFAULT 5.0,
    price TEXT NOT NULL,
    level TEXT NOT NULL,
    category TEXT NOT NULL,
    featured BOOLEAN DEFAULT FALSE,
    description TEXT,
    image_url TEXT,
    syllabus JSONB DEFAULT '[]'::jsonb,
    website_link TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.industry_courses ADD COLUMN IF NOT EXISTS website_link TEXT;
ALTER TABLE public.industry_courses ADD COLUMN IF NOT EXISTS syllabus JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.industry_courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.industry_courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Studio / Company Followers & Reviews (R7-10)
CREATE TABLE IF NOT EXISTS public.company_followers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.company_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;

-- ======================================================================================
-- 2. MISSING COLUMNS, FOREIGN KEYS & NORMALIZATION TRIGGERS (R7-01, R7-05, R7-07, R7-08)
-- ======================================================================================

-- 2A. Profiles Columns (R7-01, R7-05, R7-06, R7-08)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_key_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_experience TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS available_for_travel BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS availability TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_per_day NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_per_hour NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS eye_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hair_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_tone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_state TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Backfill account_status from legacy role = 'blocked'
UPDATE public.profiles
SET account_status = 'blocked'
WHERE LOWER(COALESCE(role, '')) = 'blocked'
  AND COALESCE(account_status, 'active') != 'blocked';

-- 2B. Directory Files Columns & Storage Metadata (R7-01, R7-07)
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS additional_urls TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'directory_assets';
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS additional_paths TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.directory_files ADD COLUMN IF NOT EXISTS cover_storage_path TEXT;

ALTER TABLE public.directory_files DROP CONSTRAINT IF EXISTS directory_files_status_check;
ALTER TABLE public.directory_files
    ADD CONSTRAINT directory_files_status_check
    CHECK (status IN ('active', 'archived', 'draft', 'approved', 'pending', 'rejected', 'blocked'));

-- Helper to extract storage object path from a Supabase Storage URL or storage:// URI
CREATE OR REPLACE FUNCTION public.extract_storage_object_path(p_url TEXT, p_bucket TEXT DEFAULT 'directory_assets')
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_idx INT;
    v_prefix TEXT;
    v_cleaned TEXT;
BEGIN
    IF p_url IS NULL OR BTRIM(p_url) = '' THEN
        RETURN NULL;
    END IF;

    IF p_url LIKE 'storage://' || p_bucket || '/%' THEN
        RETURN SUBSTRING(p_url FROM LENGTH('storage://' || p_bucket || '/') + 1);
    END IF;

    v_prefix := '/object/public/' || p_bucket || '/';
    v_idx := POSITION(v_prefix IN p_url);
    IF v_idx > 0 THEN
        v_cleaned := SUBSTRING(p_url FROM v_idx + LENGTH(v_prefix));
        RETURN SPLIT_PART(v_cleaned, '?', 1);
    END IF;

    v_prefix := '/object/sign/' || p_bucket || '/';
    v_idx := POSITION(v_prefix IN p_url);
    IF v_idx > 0 THEN
        v_cleaned := SUBSTRING(p_url FROM v_idx + LENGTH(v_prefix));
        RETURN SPLIT_PART(v_cleaned, '?', 1);
    END IF;

    v_prefix := '/object/authenticated/' || p_bucket || '/';
    v_idx := POSITION(v_prefix IN p_url);
    IF v_idx > 0 THEN
        v_cleaned := SUBSTRING(p_url FROM v_idx + LENGTH(v_prefix));
        RETURN SPLIT_PART(v_cleaned, '?', 1);
    END IF;

    IF p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%' AND p_url NOT LIKE '/%' THEN
        RETURN SPLIT_PART(p_url, '?', 1);
    END IF;

    RETURN NULL;
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
    v_elem TEXT;
    v_extracted TEXT;
    v_paths TEXT[] := '{}'::text[];
BEGIN
    -- Normalize user_id to profiles.id if caller passed auth.users.id
    SELECT id, COALESCE(privacy_show_directory, true)
    INTO v_owner_profile_id, v_owner_show_dir
    FROM public.profiles
    WHERE id = NEW.user_id OR user_id = NEW.user_id
    LIMIT 1;

    IF v_owner_profile_id IS NOT NULL THEN
        NEW.user_id := v_owner_profile_id;
    END IF;

    NEW.storage_bucket := COALESCE(NULLIF(NEW.storage_bucket, ''), 'directory_assets');
    NEW.storage_path := COALESCE(
        NULLIF(NEW.storage_path, ''),
        public.extract_storage_object_path(NEW.file_url, NEW.storage_bucket)
    );
    NEW.cover_storage_path := COALESCE(
        NULLIF(NEW.cover_storage_path, ''),
        public.extract_storage_object_path(NEW.cover_image_url, NEW.storage_bucket),
        public.extract_storage_object_path((NEW.stats->>'coverUrl')::text, NEW.storage_bucket)
    );

    IF NEW.additional_urls IS NOT NULL AND array_length(NEW.additional_urls, 1) > 0 THEN
        FOREACH v_elem IN ARRAY NEW.additional_urls LOOP
            v_extracted := public.extract_storage_object_path(v_elem, NEW.storage_bucket);
            IF v_extracted IS NOT NULL THEN
                v_paths := array_append(v_paths, v_extracted);
            END IF;
        END LOOP;
        IF array_length(v_paths, 1) > 0 THEN
            NEW.additional_paths := v_paths;
        END IF;
    END IF;

    IF LOWER(COALESCE(NEW.status, 'active')) = 'blocked'
       OR ('Blocked' = ANY(COALESCE(NEW.tags, '{}')))
       OR NOT COALESCE(v_owner_show_dir, true) THEN
        NEW.is_public := false;
    ELSE
        NEW.is_public := COALESCE(NEW.is_public, true);
    END IF;

    -- Replace raw public storage URLs with canonical storage:// URIs when file is private
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

DROP TRIGGER IF EXISTS trg_sync_directory_file_storage_metadata ON public.directory_files;
CREATE TRIGGER trg_sync_directory_file_storage_metadata
BEFORE INSERT OR UPDATE ON public.directory_files
FOR EACH ROW EXECUTE FUNCTION public.sync_directory_file_storage_metadata();

-- Backfill existing directory_files records
UPDATE public.directory_files
SET updated_at = COALESCE(updated_at, NOW());

-- Keep directory_files.is_public synced when a user toggles profiles.privacy_show_directory
CREATE OR REPLACE FUNCTION public.sync_profile_directory_privacy_to_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.privacy_show_directory IS DISTINCT FROM OLD.privacy_show_directory THEN
        UPDATE public.directory_files
        SET is_public = CASE
                WHEN COALESCE(NEW.privacy_show_directory, true) = false THEN false
                WHEN LOWER(COALESCE(status, 'active')) = 'blocked' OR ('Blocked' = ANY(COALESCE(tags, '{}'))) THEN false
                ELSE true
            END,
            updated_at = NOW()
        WHERE user_id = NEW.id OR user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_directory_privacy_to_files ON public.profiles;
CREATE TRIGGER trg_sync_profile_directory_privacy_to_files
AFTER UPDATE OF privacy_show_directory ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_directory_privacy_to_files();

-- 2C. Shooting Locations Columns & Sync Trigger (R7-01, R7-03)
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS map_url TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS timings TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.shooting_locations ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;

UPDATE public.shooting_locations
SET property_type = COALESCE(property_type, type, location_type, category),
    type = COALESCE(type, property_type, location_type, category),
    location_type = COALESCE(location_type, property_type, type, category),
    media_urls = COALESCE(media_urls, images, '{}'::text[]),
    images = COALESCE(images, media_urls, '{}'::text[]),
    phone = COALESCE(phone, contact_phone),
    contact_phone = COALESCE(contact_phone, phone),
    email = COALESCE(email, contact_email),
    contact_email = COALESCE(contact_email, email);

CREATE OR REPLACE FUNCTION public.sync_shooting_location_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.property_type := COALESCE(NEW.property_type, NEW.type, NEW.location_type, NEW.category);
    NEW.type := COALESCE(NEW.type, NEW.property_type, NEW.location_type, NEW.category);
    NEW.location_type := COALESCE(NEW.location_type, NEW.property_type, NEW.type, NEW.category);
    NEW.media_urls := COALESCE(NEW.media_urls, NEW.images, '{}'::text[]);
    NEW.images := COALESCE(NEW.images, NEW.media_urls, '{}'::text[]);
    NEW.phone := COALESCE(NEW.phone, NEW.contact_phone);
    NEW.contact_phone := COALESCE(NEW.contact_phone, NEW.phone);
    NEW.email := COALESCE(NEW.email, NEW.contact_email);
    NEW.contact_email := COALESCE(NEW.contact_email, NEW.email);
    NEW.price := COALESCE(NEW.price, NEW.daily_rate);
    NEW.daily_rate := COALESCE(NEW.daily_rate, NEW.price);
    NEW.price_hour := COALESCE(NEW.price_hour, NEW.hourly_rate);
    NEW.hourly_rate := COALESCE(NEW.hourly_rate, NEW.price_hour);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_shooting_location_columns ON public.shooting_locations;
CREATE TRIGGER trg_sync_shooting_location_columns
BEFORE INSERT OR UPDATE ON public.shooting_locations
FOR EACH ROW EXECUTE FUNCTION public.sync_shooting_location_columns();

-- 2D. Projects name, title, project_tags & tags Synchronization (R7-01, R7-02)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_tags TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

UPDATE public.projects
SET name = COALESCE(name, title),
    title = COALESCE(title, name),
    project_tags = COALESCE(project_tags, tags, '{}'::text[]),
    tags = COALESCE(tags, project_tags, '{}'::text[]);

CREATE OR REPLACE FUNCTION public.sync_project_tags()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.title := COALESCE(NEW.title, NEW.name, 'Untitled Project');
    NEW.name := COALESCE(NEW.name, NEW.title, 'Untitled Project');
    IF TG_OP = 'INSERT' THEN
        NEW.project_tags := COALESCE(NEW.project_tags, NEW.tags, '{}'::text[]);
        NEW.tags := COALESCE(NEW.tags, NEW.project_tags, '{}'::text[]);
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.project_tags IS DISTINCT FROM OLD.project_tags AND NEW.tags IS NOT DISTINCT FROM OLD.tags THEN
            NEW.tags := COALESCE(NEW.project_tags, '{}'::text[]);
        ELSIF NEW.tags IS DISTINCT FROM OLD.tags AND NEW.project_tags IS NOT DISTINCT FROM OLD.project_tags THEN
            NEW.project_tags := COALESCE(NEW.tags, '{}'::text[]);
        ELSE
            NEW.project_tags := COALESCE(NEW.project_tags, NEW.tags, '{}'::text[]);
            NEW.tags := COALESCE(NEW.tags, NEW.project_tags, '{}'::text[]);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_tags ON public.projects;
CREATE TRIGGER trg_sync_project_tags
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.sync_project_tags();

-- 2E. Tickets Columns, Profile Normalization & Explicit Foreign Keys (R7-01)
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.tickets ALTER COLUMN user_id DROP NOT NULL;

-- Migrate any existing tickets.user_id / tickets.assigned_to from auth.users.id to profiles.id
UPDATE public.tickets t
SET user_id = p.id,
    profile_id = COALESCE(t.profile_id, p.id)
FROM public.profiles p
WHERE t.user_id = p.user_id AND t.user_id != p.id;

UPDATE public.tickets t
SET profile_id = t.user_id
WHERE t.profile_id IS NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.user_id);

UPDATE public.tickets t
SET assigned_to = p.id
FROM public.profiles p
WHERE t.assigned_to = p.user_id AND t.assigned_to != p.id;

-- Null out any orphaned user_id / assigned_to that do not exist in public.profiles
UPDATE public.tickets t
SET user_id = t.profile_id
WHERE t.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.user_id)
  AND t.profile_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.profile_id);

UPDATE public.tickets t
SET user_id = NULL
WHERE t.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.user_id);

UPDATE public.tickets t
SET assigned_to = NULL
WHERE t.assigned_to IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.assigned_to);

DO $$
BEGIN
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_user_id_fkey;
    ALTER TABLE public.tickets
        ADD CONSTRAINT tickets_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;
    ALTER TABLE public.tickets
        ADD CONSTRAINT tickets_assigned_to_fkey
        FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Automatically normalize tickets.user_id and tickets.assigned_to from auth.users.id -> profiles.id BEFORE FK check
CREATE OR REPLACE FUNCTION public.normalize_ticket_profile_references()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prof_id UUID;
    v_assigned_prof_id UUID;
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        SELECT id INTO v_prof_id
        FROM public.profiles
        WHERE id = NEW.user_id OR user_id = NEW.user_id
        ORDER BY CASE WHEN id = NEW.user_id THEN 0 ELSE 1 END
        LIMIT 1;

        IF v_prof_id IS NOT NULL THEN
            NEW.user_id := v_prof_id;
            NEW.profile_id := COALESCE(NEW.profile_id, v_prof_id);
        END IF;
    ELSIF NEW.profile_id IS NOT NULL THEN
        SELECT id INTO v_prof_id
        FROM public.profiles
        WHERE id = NEW.profile_id OR user_id = NEW.profile_id
        ORDER BY CASE WHEN id = NEW.profile_id THEN 0 ELSE 1 END
        LIMIT 1;

        IF v_prof_id IS NOT NULL THEN
            NEW.profile_id := v_prof_id;
            NEW.user_id := v_prof_id;
        END IF;
    END IF;

    IF NEW.assigned_to IS NOT NULL THEN
        SELECT id INTO v_assigned_prof_id
        FROM public.profiles
        WHERE id = NEW.assigned_to OR user_id = NEW.assigned_to
        ORDER BY CASE WHEN id = NEW.assigned_to THEN 0 ELSE 1 END
        LIMIT 1;

        IF v_assigned_prof_id IS NOT NULL THEN
            NEW.assigned_to := v_assigned_prof_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_ticket_profile_references ON public.tickets;
CREATE TRIGGER trg_normalize_ticket_profile_references
BEFORE INSERT OR UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.normalize_ticket_profile_references();

-- Normalize ticket_messages.author_id and ticket_updates.author_id from auth.users.id -> profiles.id BEFORE FK check
CREATE OR REPLACE FUNCTION public.normalize_ticket_author_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prof_id UUID;
BEGIN
    IF NEW.author_id IS NOT NULL THEN
        SELECT id INTO v_prof_id
        FROM public.profiles
        WHERE id = NEW.author_id OR user_id = NEW.author_id
        ORDER BY CASE WHEN id = NEW.author_id THEN 0 ELSE 1 END
        LIMIT 1;

        IF v_prof_id IS NOT NULL THEN
            NEW.author_id := v_prof_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_ticket_message_author ON public.ticket_messages;
CREATE TRIGGER trg_normalize_ticket_message_author
BEFORE INSERT OR UPDATE ON public.ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.normalize_ticket_author_reference();

DROP TRIGGER IF EXISTS trg_normalize_ticket_update_author ON public.ticket_updates;
CREATE TRIGGER trg_normalize_ticket_update_author
BEFORE INSERT OR UPDATE ON public.ticket_updates
FOR EACH ROW EXECUTE FUNCTION public.normalize_ticket_author_reference();

-- ======================================================================================
-- 3. STORAGE BUCKETS & STORAGE OBJECT POLICIES (R7-01, R7-07)
-- ======================================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('avatars', 'avatars', true),
    ('location_media', 'location_media', true),
    ('post-media', 'post-media', true),
    ('post_media', 'post_media', true),
    ('site_assets', 'site_assets', true),
    ('directory_assets', 'directory_assets', false),
    ('directory_private', 'directory_private', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- ======================================================================================
-- 4. ACCOUNT BLOCKING & SCOPED STAFF AUTHORIZATION HELPERS (R7-04, R7-05)
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.is_caller_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid() IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.profiles p
           WHERE (p.user_id = auth.uid() OR p.id = auth.uid())
             AND (
                 LOWER(COALESCE(p.account_status, 'active')) IN ('blocked', 'suspended')
                 OR LOWER(COALESCE(p.role, 'user')) = 'blocked'
             )
       );
$$;

CREATE OR REPLACE FUNCTION public.is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_caller_active()
       AND EXISTS (
           SELECT 1
           FROM public.user_roles ur
           WHERE ur.user_id = auth.uid()
             AND ur.role = 'admin'::public.app_role
       );
$$;

CREATE OR REPLACE FUNCTION public.has_staff_permission(_resource TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_caller_active()
       AND (
           EXISTS (
               SELECT 1
               FROM public.user_roles ur
               WHERE ur.user_id = auth.uid()
                 AND ur.role = 'admin'::public.app_role
           )
           OR EXISTS (
               SELECT 1
               FROM public.admin_team_members atm
               WHERE (
                   atm.user_id = auth.uid()
                   OR atm.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
               )
                 AND atm.status = 'Active'
                 AND (
                     LOWER(COALESCE(atm.role, '')) = 'admin'
                     OR COALESCE(
                         (atm.permissions->_resource->>_action)::boolean,
                         (atm.permissions->LOWER(_resource)->>LOWER(_action))::boolean,
                         (atm.permissions->INITCAP(_resource)->>LOWER(_action))::boolean,
                         false
                     ) = true
                 )
           )
       );
$$;

GRANT EXECUTE ON FUNCTION public.is_caller_active() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_global_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(TEXT, TEXT) TO anon, authenticated;

-- Admin Team Members Policies: allow active staff to read their own permission row (R7-04)
DROP POLICY IF EXISTS "admin_team_members_select" ON public.admin_team_members;
CREATE POLICY "admin_team_members_select" ON public.admin_team_members
    FOR SELECT USING (
        public.is_global_admin()
        OR (
            public.is_caller_active()
            AND (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = admin_team_members.profile_id
                      AND p.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "admin_team_members_manage" ON public.admin_team_members;
CREATE POLICY "admin_team_members_manage" ON public.admin_team_members
    FOR ALL USING (
        public.is_global_admin()
    ) WITH CHECK (
        public.is_global_admin()
    );

-- Guard Profiles Updates: prevent self-unblock, role escalation, and preserve public_key_history (R7-05, R7-08)
CREATE OR REPLACE FUNCTION public.guard_profile_updates_and_key_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_can_edit_users BOOLEAN;
BEGIN
    -- Allow system/migration context when auth.uid() is NULL
    IF auth.uid() IS NOT NULL THEN
        v_is_admin := public.is_global_admin();
        v_can_edit_users := public.has_staff_permission('Users', 'edit');

        -- Blocked callers cannot mutate profiles (including self-unblocking)
        IF NOT v_is_admin AND NOT v_can_edit_users THEN
            IF LOWER(COALESCE(OLD.account_status, 'active')) IN ('blocked', 'suspended')
               OR LOWER(COALESCE(OLD.role, 'user')) = 'blocked'
               OR NOT public.is_caller_active() THEN
                RAISE EXCEPTION 'Blocked accounts cannot modify profile records' USING ERRCODE = '42501';
            END IF;

            IF NEW.role IS DISTINCT FROM OLD.role
               OR NEW.account_status IS DISTINCT FROM OLD.account_status
               OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
               OR NEW.tags IS DISTINCT FROM OLD.tags THEN
                RAISE EXCEPTION 'Only authorized administrators can modify account status, role, verification, or moderation tags' USING ERRCODE = '42501';
            END IF;
        ELSIF v_can_edit_users AND NOT v_is_admin THEN
            -- Scoped moderator with Users.edit cannot grant admin role or modify an admin account
            IF LOWER(COALESCE(NEW.role, '')) = 'admin' OR LOWER(COALESCE(OLD.role, '')) = 'admin' THEN
                RAISE EXCEPTION 'Only global administrators can assign or modify administrator accounts' USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    -- Keep account_status and legacy role='blocked' synchronized
    IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
        IF LOWER(COALESCE(NEW.account_status, 'active')) = 'blocked' THEN
            NEW.account_status := 'blocked';
            IF LOWER(COALESCE(NEW.role, 'user')) != 'admin' THEN
                NEW.role := 'blocked';
            END IF;
        ELSIF LOWER(COALESCE(NEW.account_status, 'active')) = 'active' AND LOWER(COALESCE(OLD.role, 'user')) = 'blocked' THEN
            NEW.role := CASE WHEN LOWER(COALESCE(NEW.role, 'blocked')) = 'blocked' THEN 'user' ELSE NEW.role END;
        END IF;
    ELSIF NEW.role IS DISTINCT FROM OLD.role THEN
        IF LOWER(COALESCE(NEW.role, 'user')) = 'blocked' THEN
            NEW.account_status := 'blocked';
        ELSIF LOWER(COALESCE(OLD.role, 'user')) = 'blocked' AND LOWER(COALESCE(NEW.role, 'user')) != 'blocked' THEN
            NEW.account_status := 'active';
        END IF;
    END IF;

    -- Preserve retired public keys in public_key_history for historical message decryption (R7-08)
    IF OLD.public_key IS NOT NULL
       AND BTRIM(OLD.public_key) != ''
       AND NEW.public_key IS DISTINCT FROM OLD.public_key THEN
        NEW.public_key_history := COALESCE(NEW.public_key_history, OLD.public_key_history, '[]'::jsonb);
        IF NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(NEW.public_key_history) AS elem
            WHERE elem->>'publicKey' = OLD.public_key
               OR elem->>'key' = OLD.public_key
        ) THEN
            NEW.public_key_history := NEW.public_key_history || jsonb_build_array(
                jsonb_build_object(
                    'publicKey', OLD.public_key,
                    'retiredAt', NOW()
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_updates_and_key_history ON public.profiles;
CREATE TRIGGER trg_guard_profile_updates_and_key_history
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_updates_and_key_history();

-- ======================================================================================
-- 5. LOCATION PRIVACY FLAG ENFORCEMENT ON PROFILES & PUBLIC_PROFILES (R7-06)
-- ======================================================================================

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() = id
        OR public.is_global_admin()
        OR public.has_staff_permission('Users', 'view')
        OR public.has_staff_permission('Tickets', 'view')
        OR (
            COALESCE(allow_profile_views, true) = true
            AND COALESCE(privacy_show_email, true) = true
            AND COALESCE(privacy_show_phone, true) = true
            AND COALESCE(privacy_show_dob, true) = true
            AND COALESCE(privacy_show_location, true) = true
        )
    );

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (
        (public.is_caller_active() AND auth.uid() = user_id)
        OR public.is_global_admin()
        OR public.has_staff_permission('Users', 'add')
    );

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
        OR public.has_staff_permission('Users', 'edit')
    );

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE USING (
        public.is_global_admin()
        OR public.has_staff_permission('Users', 'delete')
    );

-- Recreate public.public_profiles view masking ALL location/city/state/country columns when privacy_show_location = false (R7-06)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles WITH (security_barrier = true) AS
SELECT 
    id,
    user_id,
    full_name,
    first_name,
    last_name,
    username,
    avatar_url,
    cover_image_url,
    bio,
    profession,
    category,
    skills,
    experience,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN city
        ELSE NULL
    END AS city,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN state
        ELSE NULL
    END AS state,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN country
        ELSE NULL
    END AS country,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN location
        ELSE NULL
    END AS location,
    website,
    company,
    portfolio_url,
    imdb_url,
    linkedin_url,
    instagram_url,
    youtube_url,
    twitter_url,
    social_links,
    pricing_rate,
    pricing_unit,
    pricing_currency,
    role,
    short_id,
    public_key,
    is_verified,
    allow_messages_from,
    allow_connections_from,
    allow_profile_views,
    privacy_show_phone,
    privacy_show_email,
    privacy_show_dob,
    privacy_show_directory,
    privacy_show_location,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_phone, true) = true
        THEN phone 
        ELSE NULL 
    END AS phone,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_email, true) = true
        THEN email 
        ELSE NULL 
    END AS email,
    CASE 
        WHEN auth.uid() = user_id 
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_dob, true) = true
        THEN date_of_birth 
        ELSE NULL 
    END AS date_of_birth,
    followers_count,
    following_count,
    projects_count,
    posts_count,
    created_at,
    updated_at,
    tags,
    account_status,
    public_key_history,
    github_url,
    experiences,
    education,
    achievements,
    portfolio,
    languages,
    gender,
    nationality,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN birth_city
        ELSE NULL
    END AS birth_city,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN birth_state
        ELSE NULL
    END AS birth_state,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN birth_country
        ELSE NULL
    END AS birth_country,
    total_experience,
    available_for_travel,
    availability,
    price_per_day,
    price_per_hour,
    price_negotiable,
    height,
    weight,
    eye_color,
    hair_color,
    skin_tone,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN current_city
        ELSE NULL
    END AS current_city,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN current_state
        ELSE NULL
    END AS current_state,
    CASE
        WHEN auth.uid() = user_id
             OR auth.uid() = id
             OR public.is_global_admin()
             OR public.has_staff_permission('Users', 'view')
             OR COALESCE(privacy_show_location, true) = true
        THEN current_country
        ELSE NULL
    END AS current_country,
    likes_count
FROM public.profiles
WHERE COALESCE(allow_profile_views, true) = true
   OR auth.uid() = user_id
   OR auth.uid() = id
   OR public.is_global_admin()
   OR public.has_staff_permission('Users', 'view')
   OR public.has_staff_permission('Tickets', 'view');

GRANT SELECT ON public.public_profiles TO anon, authenticated;

DO $$
BEGIN
    REVOKE SELECT (email, phone, date_of_birth, location, city, state, country, birth_city, birth_state, birth_country, current_city, current_state, current_country) ON public.profiles FROM anon;
    REVOKE SELECT ON public.profiles FROM anon;
    GRANT SELECT (
        id, user_id, full_name, first_name, last_name, username, avatar_url, cover_image_url,
        bio, profession, category, skills, experience,
        website, company, portfolio_url, imdb_url, linkedin_url, instagram_url, youtube_url, twitter_url,
        social_links, pricing_rate, pricing_unit, pricing_currency, role, short_id, public_key, public_key_history,
        is_verified, allow_messages_from, allow_connections_from, allow_profile_views,
        privacy_show_phone, privacy_show_email, privacy_show_dob, privacy_show_directory, privacy_show_location,
        followers_count, following_count, projects_count, posts_count, tags, account_status, created_at, updated_at
    ) ON public.profiles TO anon;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ======================================================================================
-- 6. SECURITY DEFINER NOTIFICATION TRIGGERS & PRIVACY GATING (R7-02, R7-03)
-- ======================================================================================

CREATE OR REPLACE FUNCTION public.handle_new_project_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Private projects must NEVER broadcast titles or links to non-members (R7-02)
    IF LOWER(COALESCE(NEW.visibility, 'public')) != 'public'
       OR LOWER(COALESCE(NEW.project_status, 'public')) != 'public' THEN
        INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
        SELECT DISTINCT
            p.id,
            'Private Project Workspace',
            'You have been added to project: ' || COALESCE(NEW.name, NEW.title, 'Untitled Project') || '.',
            'project',
            'medium',
            '/projects'
        FROM public.project_members pm
        JOIN public.profiles p ON (p.id = pm.user_id OR p.user_id = pm.user_id)
        WHERE pm.project_id = NEW.id
          AND pm.role != 'Applicant'
          AND p.id != NEW.created_by
          AND COALESCE(p.user_id, p.id) != NEW.created_by;

        RETURN NEW;
    END IF;

    -- Public projects notify active non-creator profiles safely via SECURITY DEFINER
    INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
    SELECT 
        p.id,
        'New Project Announced',
        'A new project is looking for collaborators: ' || COALESCE(NEW.name, NEW.title, 'Untitled Project') || '.',
        'project',
        'medium',
        '/projects'
    FROM public.profiles p
    WHERE p.id != NEW.created_by
      AND COALESCE(p.user_id, p.id) != NEW.created_by
      AND LOWER(COALESCE(p.account_status, 'active')) = 'active'
    ORDER BY COALESCE(p.updated_at, '1970-01-01'::timestamptz) DESC
    LIMIT 50;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_location_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF LOWER(COALESCE(NEW.status, 'active')) != 'active'
       OR ('Blocked' = ANY(COALESCE(NEW.tags, '{}'))) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
    SELECT 
        p.id,
        'New Filming Location',
        'Check out the new location available for shoots: ' || COALESCE(NEW.name, 'Secret Location') || '.',
        'location',
        'low',
        '/locations/' || NEW.id
    FROM public.profiles p
    WHERE (NEW.created_by IS NULL OR (p.id != NEW.created_by AND COALESCE(p.user_id, p.id) != NEW.created_by))
      AND LOWER(COALESCE(p.account_status, 'active')) = 'active'
    ORDER BY COALESCE(p.updated_at, '1970-01-01'::timestamptz) DESC
    LIMIT 50;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_job_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF LOWER(COALESCE(NEW.status, 'active')) != 'active' THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
    SELECT 
        p.id,
        'New Job Opportunity',
        'A new job position has been posted: ' || COALESCE(NEW.job_title, 'New Job Position') || ' at ' || COALESCE(NEW.company_name, 'a Film Studio') || '.',
        'job',
        'high',
        '/jobs'
    FROM public.profiles p
    WHERE (NEW.user_id IS NULL OR (p.id != NEW.user_id AND COALESCE(p.user_id, p.id) != NEW.user_id))
      AND LOWER(COALESCE(p.account_status, 'active')) = 'active'
    ORDER BY COALESCE(p.updated_at, '1970-01-01'::timestamptz) DESC
    LIMIT 50;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_welcome_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
    VALUES (
        NEW.id,
        'Welcome to FilmCollab! 🎬',
        'We are thrilled to have you here. Complete your profile, explore directories, and connect with other creators to get started.',
        'system',
        'high',
        '/profile'
    );
    RETURN NEW;
END;
$$;

-- ======================================================================================
-- 7. EVENT-BOUND CROSS-USER NOTIFICATION RPC (R7-09)
-- ======================================================================================

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
    v_is_staff BOOLEAN := false;
    v_authorized BOOLEAN := false;
    v_norm_type TEXT;
    v_final_title TEXT;
    v_final_desc TEXT;
    v_final_url TEXT;
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

    v_norm_type := LOWER(BTRIM(COALESCE(p_type, 'general')));
    v_final_title := COALESCE(NULLIF(BTRIM(p_title), ''), 'Notification');
    v_final_desc := COALESCE(p_message, p_description, '');
    v_final_url := COALESCE(p_link, p_action_url);

    v_is_staff := public.is_global_admin() OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_caller_auth_id
          AND ur.role::text IN ('admin', 'moderator', 'support')
    );

    -- 1. Self or active Staff notification
    IF v_caller_auth_id = v_recipient_auth_id
       OR (v_caller_profile_id IS NOT NULL AND v_caller_profile_id = v_recipient_profile_id)
       OR v_is_staff THEN
        v_authorized := true;

    -- 2. Strict event-bound validation by notification type (R7-09)
    ELSIF v_norm_type IN ('connection', 'connection_request', 'connection_accepted') THEN
        IF EXISTS (
            SELECT 1 FROM public.connections c
            WHERE (c.user_id IN (v_caller_profile_id, v_caller_auth_id) AND c.connected_user_id IN (v_recipient_profile_id, v_recipient_auth_id))
               OR (c.user_id IN (v_recipient_profile_id, v_recipient_auth_id) AND c.connected_user_id IN (v_caller_profile_id, v_caller_auth_id))
        ) THEN
            v_authorized := true;
            v_norm_type := 'connection';
        END IF;

    ELSIF v_norm_type IN ('like', 'user_like', 'post_like') THEN
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
        END IF;

    ELSIF v_norm_type IN ('comment', 'post_comment') THEN
        IF EXISTS (
            SELECT 1 FROM public.post_comments pc
            JOIN public.posts po ON po.id = pc.post_id
            WHERE pc.user_id IN (v_caller_profile_id, v_caller_auth_id)
              AND po.author_id IN (v_recipient_profile_id, v_recipient_auth_id)
        ) THEN
            v_authorized := true;
        END IF;

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

    ELSIF v_norm_type IN ('project', 'project_application', 'project_invite', 'task') THEN
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

    ELSIF v_norm_type IN ('message', 'location', 'site_visit') THEN
        IF EXISTS (
            SELECT 1 FROM public.messages m
            WHERE (m.sender_id IN (v_caller_profile_id, v_caller_auth_id) AND m.receiver_id IN (v_recipient_profile_id, v_recipient_auth_id))
               OR (m.sender_id IN (v_recipient_profile_id, v_recipient_auth_id) AND m.receiver_id IN (v_caller_profile_id, v_caller_auth_id))
        ) OR EXISTS (
            SELECT 1 FROM public.property_site_visits psv
            WHERE (psv.user_id IN (v_caller_auth_id, v_caller_profile_id) AND psv.owner_id IN (v_recipient_auth_id, v_recipient_profile_id))
               OR (psv.user_id IN (v_recipient_auth_id, v_recipient_profile_id) AND psv.owner_id IN (v_caller_auth_id, v_caller_profile_id))
        ) THEN
            v_authorized := true;
        END IF;

    ELSIF v_norm_type IN ('profile_view', 'profile') THEN
        IF v_allow_profile_views = true THEN
            v_authorized := true;
            -- Enforce canonical server-side text for profile view notifications so callers cannot spoof arbitrary content
            v_norm_type := 'profile';
            v_final_title := 'Profile View';
            v_final_desc := 'Someone viewed your profile.';
            v_final_url := '/profile/' || COALESCE(v_caller_profile_id, v_caller_auth_id)::text;
        END IF;
    END IF;

    IF NOT v_authorized THEN
        RAISE EXCEPTION 'Unauthorized notification recipient or missing relationship event for type %', v_norm_type USING ERRCODE = '42501';
    END IF;

    -- Deduplicate repeated unread notifications for the same event within 60s (or 24h for profile views)
    SELECT n.id INTO v_notification_id
    FROM public.notifications n
    WHERE n.user_id = v_recipient_profile_id
      AND n.type = v_norm_type
      AND n.title = v_final_title
      AND n.description = v_final_desc
      AND COALESCE(n.action_url, '') = COALESCE(v_final_url, '')
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
-- 8. STUDIO / COMPANY FOLLOWERS & REVIEWS TRIGGERS & POLICIES (R7-10)
-- ======================================================================================

ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS followers INTEGER DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) DEFAULT 0;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.sync_company_followers_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_count INTEGER;
BEGIN
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);
    SELECT COUNT(*) INTO v_count
    FROM public.company_followers
    WHERE company_id = v_company_id;

    UPDATE public.companies
    SET followers = v_count,
        followers_count = v_count,
        updated_at = NOW()
    WHERE id = v_company_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_followers_summary ON public.company_followers;
CREATE TRIGGER trg_sync_company_followers_summary
AFTER INSERT OR DELETE ON public.company_followers
FOR EACH ROW EXECUTE FUNCTION public.sync_company_followers_summary();

CREATE OR REPLACE FUNCTION public.sync_company_reviews_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_company_id UUID;
    v_count INTEGER;
    v_avg NUMERIC(3, 1);
    v_reviews_json JSONB;
BEGIN
    v_company_id := COALESCE(NEW.company_id, OLD.company_id);

    SELECT
        COUNT(*),
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'user_id', user_id,
                    'profile_id', profile_id,
                    'author', author_name,
                    'rating', rating,
                    'comment', comment,
                    'date', TO_CHAR(created_at, 'YYYY-MM-DD')
                )
                ORDER BY created_at DESC
            ),
            '[]'::jsonb
        )
    INTO v_count, v_avg, v_reviews_json
    FROM public.company_reviews
    WHERE company_id = v_company_id;

    UPDATE public.companies
    SET reviews_count = v_count,
        rating = v_avg,
        reviews = v_reviews_json,
        updated_at = NOW()
    WHERE id = v_company_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_company_reviews_summary ON public.company_reviews;
CREATE TRIGGER trg_sync_company_reviews_summary
AFTER INSERT OR UPDATE OR DELETE ON public.company_reviews
FOR EACH ROW EXECUTE FUNCTION public.sync_company_reviews_summary();

DROP POLICY IF EXISTS "company_followers_select" ON public.company_followers;
CREATE POLICY "company_followers_select" ON public.company_followers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "company_followers_insert" ON public.company_followers;
CREATE POLICY "company_followers_insert" ON public.company_followers
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND auth.uid() = user_id
    );

DROP POLICY IF EXISTS "company_followers_delete" ON public.company_followers;
CREATE POLICY "company_followers_delete" ON public.company_followers
    FOR DELETE USING (
        public.is_caller_active()
        AND (auth.uid() = user_id OR public.is_global_admin())
    );

DROP POLICY IF EXISTS "company_reviews_select" ON public.company_reviews;
CREATE POLICY "company_reviews_select" ON public.company_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "company_reviews_insert" ON public.company_reviews;
CREATE POLICY "company_reviews_insert" ON public.company_reviews
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND auth.uid() = user_id
        AND rating >= 1 AND rating <= 5
        AND LENGTH(BTRIM(comment)) > 0
    );

DROP POLICY IF EXISTS "company_reviews_update" ON public.company_reviews;
CREATE POLICY "company_reviews_update" ON public.company_reviews
    FOR UPDATE USING (
        public.is_caller_active()
        AND (auth.uid() = user_id OR public.is_global_admin())
    ) WITH CHECK (
        public.is_caller_active()
        AND (auth.uid() = user_id OR public.is_global_admin())
        AND rating >= 1 AND rating <= 5
        AND LENGTH(BTRIM(comment)) > 0
    );

DROP POLICY IF EXISTS "company_reviews_delete" ON public.company_reviews;
CREATE POLICY "company_reviews_delete" ON public.company_reviews
    FOR DELETE USING (
        public.is_caller_active()
        AND (auth.uid() = user_id OR public.is_global_admin())
    );

-- ======================================================================================
-- 9. COMPREHENSIVE RLS POLICIES FOR NEW TABLES, SCOPED STAFF & BLOCKED ACCOUNTS
--    (R7-01, R7-03, R7-04, R7-05, R7-07)
-- ======================================================================================

-- 9A. Categories & Property Types
DROP POLICY IF EXISTS "categories_read_public" ON public.categories;
CREATE POLICY "categories_read_public" ON public.categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_staff_manage" ON public.categories;
CREATE POLICY "categories_staff_manage" ON public.categories
    FOR ALL USING (
        public.is_global_admin() OR public.has_staff_permission('Users', 'edit')
    ) WITH CHECK (
        public.is_global_admin() OR public.has_staff_permission('Users', 'edit')
    );

DROP POLICY IF EXISTS "property_types_read_public" ON public.property_types;
CREATE POLICY "property_types_read_public" ON public.property_types
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "property_types_admin_manage" ON public.property_types;
CREATE POLICY "property_types_admin_manage" ON public.property_types
    FOR ALL USING (
        public.is_global_admin()
        OR public.has_staff_permission('Locations', 'add')
        OR public.has_staff_permission('Locations', 'edit')
    ) WITH CHECK (
        public.is_global_admin()
        OR public.has_staff_permission('Locations', 'add')
        OR public.has_staff_permission('Locations', 'edit')
    );

-- 9B. Industry Hub (News, Events, Courses)
DROP POLICY IF EXISTS "Public can view industry news" ON public.industry_news;
DROP POLICY IF EXISTS "industry_news_select" ON public.industry_news;
CREATE POLICY "industry_news_select" ON public.industry_news
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage industry news" ON public.industry_news;
DROP POLICY IF EXISTS "industry_news_manage" ON public.industry_news;
CREATE POLICY "industry_news_manage" ON public.industry_news
    FOR ALL USING (
        public.is_global_admin()
        OR public.has_staff_permission('Posts', 'add')
        OR public.has_staff_permission('Posts', 'edit')
    ) WITH CHECK (
        public.is_global_admin()
        OR public.has_staff_permission('Posts', 'add')
        OR public.has_staff_permission('Posts', 'edit')
    );

DROP POLICY IF EXISTS "Public can view industry events" ON public.industry_events;
DROP POLICY IF EXISTS "industry_events_select" ON public.industry_events;
CREATE POLICY "industry_events_select" ON public.industry_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage industry events" ON public.industry_events;
DROP POLICY IF EXISTS "industry_events_manage" ON public.industry_events;
CREATE POLICY "industry_events_manage" ON public.industry_events
    FOR ALL USING (
        public.is_global_admin()
        OR public.has_staff_permission('Posts', 'add')
        OR public.has_staff_permission('Posts', 'edit')
    ) WITH CHECK (
        public.is_global_admin()
        OR public.has_staff_permission('Posts', 'add')
        OR public.has_staff_permission('Posts', 'edit')
    );

DROP POLICY IF EXISTS "Public can view industry courses" ON public.industry_courses;
DROP POLICY IF EXISTS "industry_courses_select" ON public.industry_courses;
CREATE POLICY "industry_courses_select" ON public.industry_courses
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage industry courses" ON public.industry_courses;
DROP POLICY IF EXISTS "industry_courses_manage" ON public.industry_courses;
CREATE POLICY "industry_courses_manage" ON public.industry_courses
    FOR ALL USING (
        public.is_global_admin()
        OR public.has_staff_permission('Posts', 'add')
        OR public.has_staff_permission('Posts', 'edit')
    ) WITH CHECK (
        public.is_global_admin()
        OR public.has_staff_permission('Posts', 'add')
        OR public.has_staff_permission('Posts', 'edit')
    );

-- 9C. Reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
CREATE POLICY "reports_insert" ON public.reports
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = reporter_id
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = reports.reporter_id AND p.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "reports_select" ON public.reports;
CREATE POLICY "reports_select" ON public.reports
    FOR SELECT USING (
        auth.uid() = reporter_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = reports.reporter_id AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Users', 'view')
        OR public.has_staff_permission('Tickets', 'view')
    );

DROP POLICY IF EXISTS "reports_update_staff" ON public.reports;
CREATE POLICY "reports_update_staff" ON public.reports
    FOR UPDATE USING (
        public.is_global_admin()
        OR public.has_staff_permission('Users', 'edit')
        OR public.has_staff_permission('Tickets', 'edit')
    );

-- 9D. Shooting Locations (R7-03, R7-04, R7-05)
DROP POLICY IF EXISTS "shooting_locations_read" ON public.shooting_locations;
CREATE POLICY "shooting_locations_read" ON public.shooting_locations
    FOR SELECT USING (
        (status != 'blocked' AND NOT ('Blocked' = ANY(COALESCE(tags, '{}'))))
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = shooting_locations.created_by AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Locations', 'view')
    );

DROP POLICY IF EXISTS "shooting_locations_insert" ON public.shooting_locations;
CREATE POLICY "shooting_locations_insert" ON public.shooting_locations
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = shooting_locations.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Locations', 'add')
        )
    );

DROP POLICY IF EXISTS "shooting_locations_update" ON public.shooting_locations;
CREATE POLICY "shooting_locations_update" ON public.shooting_locations
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = shooting_locations.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Locations', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = shooting_locations.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Locations', 'edit')
        )
    );

DROP POLICY IF EXISTS "shooting_locations_delete" ON public.shooting_locations;
CREATE POLICY "shooting_locations_delete" ON public.shooting_locations
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = shooting_locations.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Locations', 'delete')
        )
    );

-- 9E. Posts, Likes, Saves, Comments (R7-04, R7-05)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::text[];

DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
CREATE POLICY "posts_select_policy" ON public.posts
    FOR SELECT USING (
        (
            is_published = true
            AND NOT ('Blocked' = ANY(COALESCE(hashtags, '{}')))
            AND NOT ('Blocked' = ANY(COALESCE(tags, '{}')))
        )
        OR auth.uid() = author_id
        OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
              AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Posts', 'view')
    );

DROP POLICY IF EXISTS "posts_insert_policy" ON public.posts;
CREATE POLICY "posts_insert_policy" ON public.posts
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'add')
        )
    );

DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
CREATE POLICY "posts_update_policy" ON public.posts
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'edit')
        )
    );

DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;
CREATE POLICY "posts_delete_policy" ON public.posts
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            auth.uid() = author_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = posts.author_id OR profiles.user_id = posts.author_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'delete')
        )
    );

DROP POLICY IF EXISTS "post_comments_insert_policy" ON public.post_comments;
CREATE POLICY "post_comments_insert_policy" ON public.post_comments
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "post_comments_update_policy" ON public.post_comments;
CREATE POLICY "post_comments_update_policy" ON public.post_comments
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'edit')
        )
    );

DROP POLICY IF EXISTS "post_comments_delete_policy" ON public.post_comments;
CREATE POLICY "post_comments_delete_policy" ON public.post_comments
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = post_comments.user_id OR profiles.user_id = post_comments.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Posts', 'delete')
        )
    );

-- 9F. Projects & Project Members & Messages (R7-02, R7-04, R7-05)
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
CREATE POLICY "projects_select_policy" ON public.projects
    FOR SELECT USING (
        (
            LOWER(COALESCE(visibility, 'public')) = 'public'
            AND LOWER(COALESCE(project_status, 'public')) = 'public'
            AND NOT ('Blocked' = ANY(COALESCE(project_tags, '{}')))
            AND NOT ('Blocked' = ANY(COALESCE(tags, '{}')))
        )
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = projects.created_by AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.project_members pm 
            WHERE pm.project_id = projects.id 
              AND (
                  pm.user_id = auth.uid()
                  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pm.user_id AND p.user_id = auth.uid())
              )
              AND pm.role != 'Applicant'
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Projects', 'view')
    );

DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
CREATE POLICY "projects_insert_policy" ON public.projects
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = projects.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Projects', 'add')
        )
    );

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can update their projects" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
CREATE POLICY "projects_update_policy" ON public.projects
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = projects.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Projects', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = projects.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Projects', 'edit')
        )
    );

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Project creators can delete their projects" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;
CREATE POLICY "projects_delete_policy" ON public.projects
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = projects.created_by AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Projects', 'delete')
        )
    );

-- 9G. Jobs & Job Applications (R7-04, R7-05)
DROP POLICY IF EXISTS "Users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_insert_policy" ON public.jobs;
CREATE POLICY "jobs_insert_policy" ON public.jobs
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = jobs.user_id AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Jobs', 'add')
        )
    );

DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON public.jobs;
CREATE POLICY "jobs_update_policy" ON public.jobs
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = jobs.user_id AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Jobs', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = jobs.user_id AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Jobs', 'edit')
        )
    );

DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_delete_policy" ON public.jobs;
CREATE POLICY "jobs_delete_policy" ON public.jobs
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = jobs.user_id AND p.user_id = auth.uid()
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Jobs', 'delete')
        )
    );

DROP POLICY IF EXISTS "job_applications_insert" ON public.job_applications;
CREATE POLICY "job_applications_insert" ON public.job_applications
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
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
            OR public.is_global_admin()
        )
    );

DROP POLICY IF EXISTS "job_applications_read" ON public.job_applications;
CREATE POLICY "job_applications_read" ON public.job_applications
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = job_applications.profile_id AND p.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.jobs j
            WHERE j.id = job_applications.job_id AND j.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Jobs', 'view')
    );

-- 9H. Directory Files & Storage Objects (R7-04, R7-05, R7-07)
DROP POLICY IF EXISTS "directory_files_select_all" ON public.directory_files;
CREATE POLICY "directory_files_select_all" ON public.directory_files
    FOR SELECT USING (
        (
            LOWER(COALESCE(status, 'active')) != 'blocked'
            AND NOT ('Blocked' = ANY(COALESCE(tags, '{}')))
            AND COALESCE(is_public, true) = true
            AND EXISTS (
                SELECT 1 FROM public.profiles p 
                WHERE (p.id = directory_files.user_id OR p.user_id = directory_files.user_id)
                  AND COALESCE(p.privacy_show_directory, true) = true
                  AND LOWER(COALESCE(p.account_status, 'active')) = 'active'
            )
        )
        OR user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = directory_files.user_id OR p.user_id = directory_files.user_id)
              AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Directory', 'view')
    );

DROP POLICY IF EXISTS "directory_files_insert_auth" ON public.directory_files;
CREATE POLICY "directory_files_insert_auth" ON public.directory_files
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id 
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = directory_files.user_id OR profiles.user_id = directory_files.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'add')
        )
    );

DROP POLICY IF EXISTS "directory_files_update_auth" ON public.directory_files;
CREATE POLICY "directory_files_update_auth" ON public.directory_files
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = directory_files.user_id OR profiles.user_id = directory_files.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = directory_files.user_id OR profiles.user_id = directory_files.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'edit')
        )
    );

DROP POLICY IF EXISTS "directory_files_delete_auth" ON public.directory_files;
CREATE POLICY "directory_files_delete_auth" ON public.directory_files
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = directory_files.user_id OR profiles.user_id = directory_files.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'delete')
        )
    );

-- Storage policies for directory_assets & directory_private (R7-07)
DROP POLICY IF EXISTS "directory_assets_public_access" ON storage.objects;
DROP POLICY IF EXISTS "directory_assets_select_policy" ON storage.objects;
CREATE POLICY "directory_assets_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('directory_assets', 'directory_private')
        AND (
            auth.uid() = owner
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid()
                  AND (storage.foldername(storage.objects.name))[1] = p.id::text
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
                        OR storage.objects.name = ANY(COALESCE(df.additional_paths, '{}'))
                        OR df.file_url LIKE '%' || storage.objects.name || '%'
                    )
                      AND LOWER(COALESCE(df.status, 'active')) != 'blocked'
                      AND NOT ('Blocked' = ANY(COALESCE(df.tags, '{}')))
                      AND COALESCE(df.is_public, true) = true
                      AND COALESCE(p.privacy_show_directory, true) = true
                      AND LOWER(COALESCE(p.account_status, 'active')) = 'active'
                )
            )
        )
    );

DROP POLICY IF EXISTS "directory_assets_auth_insert" ON storage.objects;
CREATE POLICY "directory_assets_auth_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('directory_assets', 'directory_private')
        AND public.is_caller_active()
        AND (
            (storage.foldername(name))[1] IN (auth.uid()::text, 'covers')
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid()
                  AND (storage.foldername(storage.objects.name))[1] = p.id::text
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'add')
        )
    );

DROP POLICY IF EXISTS "directory_assets_owner_update" ON storage.objects;
CREATE POLICY "directory_assets_owner_update" ON storage.objects
    FOR UPDATE USING (
        bucket_id IN ('directory_assets', 'directory_private')
        AND public.is_caller_active()
        AND (
            auth.uid() = owner
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid()
                  AND (storage.foldername(storage.objects.name))[1] = p.id::text
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'edit')
        )
    );

DROP POLICY IF EXISTS "directory_assets_owner_delete" ON storage.objects;
CREATE POLICY "directory_assets_owner_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id IN ('directory_assets', 'directory_private')
        AND public.is_caller_active()
        AND (
            auth.uid() = owner
            OR (storage.foldername(name))[1] = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.user_id = auth.uid()
                  AND (storage.foldername(storage.objects.name))[1] = p.id::text
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Directory', 'delete')
        )
    );

-- Storage policies for avatars, location_media, and site_assets (R7-01)
DROP POLICY IF EXISTS "public_buckets_select_policy" ON storage.objects;
CREATE POLICY "public_buckets_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('avatars', 'location_media', 'post-media', 'post_media', 'site_assets')
    );

DROP POLICY IF EXISTS "avatars_location_upload_policy" ON storage.objects;
CREATE POLICY "avatars_location_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('avatars', 'location_media')
        AND public.is_caller_active()
    );

DROP POLICY IF EXISTS "avatars_location_modify_policy" ON storage.objects;
CREATE POLICY "avatars_location_modify_policy" ON storage.objects
    FOR DELETE USING (
        bucket_id IN ('avatars', 'location_media')
        AND public.is_caller_active()
        AND (
            auth.uid() = owner
            OR public.is_global_admin()
        )
    );

DROP POLICY IF EXISTS "site_assets_admin_manage" ON storage.objects;
CREATE POLICY "site_assets_admin_manage" ON storage.objects
    FOR ALL USING (
        bucket_id = 'site_assets'
        AND public.is_global_admin()
    ) WITH CHECK (
        bucket_id = 'site_assets'
        AND public.is_global_admin()
    );

-- 9I. Tickets, Ticket Messages & Ticket Updates with Scoped Staff Support (R7-01, R7-04, R7-05)
-- Note: Blocked users ARE permitted to create/read their own support tickets to appeal account blocks.
DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
CREATE POLICY "tickets_select" ON public.tickets
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() = assigned_to
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id OR p.id = tickets.assigned_to)
              AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'view')
    );

DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
CREATE POLICY "tickets_insert" ON public.tickets
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id)
              AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'add')
    );

DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets
    FOR UPDATE USING (
        auth.uid() = user_id
        OR auth.uid() = assigned_to
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id OR p.id = tickets.assigned_to)
              AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'edit')
    ) WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() = assigned_to
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id OR p.id = tickets.assigned_to)
              AND p.user_id = auth.uid()
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'edit')
    );

DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;
CREATE POLICY "tickets_delete" ON public.tickets
    FOR DELETE USING (
        public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'delete')
    );

DROP POLICY IF EXISTS "ticket_messages_participant_read" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_read" ON public.ticket_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.id = ticket_messages.ticket_id 
              AND (
                  t.user_id = auth.uid() 
                  OR t.assigned_to = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.profiles p
                      WHERE (p.id = t.user_id OR p.id = t.profile_id OR p.id = t.assigned_to)
                        AND p.user_id = auth.uid()
                  )
              )
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'view')
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
                  AND COALESCE(t.chat_enabled, true) = true
                  AND (
                      t.user_id = auth.uid() 
                      OR t.assigned_to = auth.uid()
                      OR EXISTS (
                          SELECT 1 FROM public.profiles p
                          WHERE (p.id = t.user_id OR p.id = t.profile_id OR p.id = t.assigned_to)
                            AND p.user_id = auth.uid()
                      )
                  )
            )
            OR public.is_global_admin()
            OR public.has_staff_permission('Tickets', 'edit')
        )
    );

DROP POLICY IF EXISTS "ticket_updates_select" ON public.ticket_updates;
CREATE POLICY "ticket_updates_select" ON public.ticket_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tickets t 
            WHERE t.id = ticket_updates.ticket_id 
              AND (
                  t.user_id = auth.uid() 
                  OR t.assigned_to = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.profiles p
                      WHERE (p.id = t.user_id OR p.id = t.profile_id OR p.id = t.assigned_to)
                        AND p.user_id = auth.uid()
                  )
              )
        )
        OR public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'view')
    );

DROP POLICY IF EXISTS "ticket_updates_insert" ON public.ticket_updates;
CREATE POLICY "ticket_updates_insert" ON public.ticket_updates
    FOR INSERT WITH CHECK (
        public.is_global_admin()
        OR public.has_staff_permission('Tickets', 'edit')
        OR public.has_staff_permission('Tickets', 'add')
    );

-- 9J. Community Groups & Messages Scoped Staff & Active Caller Checks (R7-04, R7-05)
DROP POLICY IF EXISTS "community_groups_insert" ON public.community_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.community_groups;
CREATE POLICY "community_groups_insert" ON public.community_groups
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR public.is_global_admin()
            OR public.has_staff_permission('Communities', 'add')
        )
    );

DROP POLICY IF EXISTS "community_groups_update" ON public.community_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.community_groups;
CREATE POLICY "community_groups_update" ON public.community_groups
    FOR UPDATE USING (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR public.is_global_admin()
            OR public.has_staff_permission('Communities', 'edit')
        )
    ) WITH CHECK (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR public.is_global_admin()
            OR public.has_staff_permission('Communities', 'edit')
        )
    );

DROP POLICY IF EXISTS "community_groups_delete" ON public.community_groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.community_groups;
CREATE POLICY "community_groups_delete" ON public.community_groups
    FOR DELETE USING (
        public.is_caller_active()
        AND (
            created_by = auth.uid()
            OR public.is_global_admin()
            OR public.has_staff_permission('Communities', 'delete')
        )
    );

DROP POLICY IF EXISTS "community_group_messages_insert" ON public.community_group_messages;
CREATE POLICY "community_group_messages_insert" ON public.community_group_messages
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND auth.uid() = user_id
        AND (
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
            OR public.is_global_admin()
            OR public.has_staff_permission('Communities', 'edit')
        )
    );

-- 9K. Direct Messages, Connections, Casting Calls & Companies Active Caller Enforcement (R7-05)
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = sender_id 
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = messages.sender_id OR profiles.user_id = messages.sender_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
            OR public.is_global_admin()
        )
    );

DROP POLICY IF EXISTS "connections_insert_policy" ON public.connections;
CREATE POLICY "connections_insert_policy" ON public.connections
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE (profiles.id = connections.user_id OR profiles.user_id = connections.user_id)
                  AND (profiles.user_id = auth.uid() OR profiles.id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Users can insert casting calls" ON public.casting_calls;
CREATE POLICY "Users can insert casting calls" ON public.casting_calls
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles p WHERE p.id = casting_calls.creator_id AND (p.user_id = auth.uid() OR p.id = auth.uid())
            )
            OR auth.uid() = creator_id
        )
    );

DROP POLICY IF EXISTS "companies_insert_auth" ON public.companies;
CREATE POLICY "companies_insert_auth" ON public.companies
    FOR INSERT WITH CHECK (
        public.is_caller_active()
        AND (
            auth.uid() = user_id 
            OR public.is_global_admin()
        )
    );

-- ======================================================================================
-- 10. GRANTS FOR PUBLIC & STORAGE SCHEMAS (R7-01, R7-10, R7-11)
-- ======================================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO authenticated;

GRANT SELECT ON public.property_types TO anon, authenticated;
GRANT ALL ON public.property_types TO authenticated;

GRANT SELECT ON public.industry_news TO anon, authenticated;
GRANT ALL ON public.industry_news TO authenticated;

GRANT SELECT ON public.industry_events TO anon, authenticated;
GRANT ALL ON public.industry_events TO authenticated;

GRANT SELECT ON public.industry_courses TO anon, authenticated;
GRANT ALL ON public.industry_courses TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;

GRANT SELECT ON public.company_followers TO anon, authenticated;
GRANT INSERT, DELETE ON public.company_followers TO authenticated;

GRANT SELECT ON public.company_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_reviews TO authenticated;
