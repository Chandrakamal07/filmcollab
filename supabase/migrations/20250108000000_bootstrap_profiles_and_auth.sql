-- ======================================================================================
-- FilmCollab Initial Clean Bootstrap: Profiles & Identity Baseline
-- Migration: 20250108000000_bootstrap_profiles_and_auth.sql
-- Enables reproducible fresh reset prior to posts, jobs, discovery, and foreign keys.
-- ======================================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    email TEXT,
    avatar_url TEXT,
    cover_image_url TEXT,
    bio TEXT,
    profession TEXT,
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

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_short_id ON public.profiles(short_id);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read of profiles
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT USING (true);

-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Bootstrap shooting_locations and notifications tables required by 20251006000000_add_notification_triggers.sql
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

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    status TEXT NOT NULL DEFAULT 'unread',
    priority TEXT NOT NULL DEFAULT 'medium',
    action_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

