-- ======================================================================================
-- FilmCollab Initial Clean Bootstrap: Profiles & Identity Baseline
-- Migration: 20250108000000_bootstrap_profiles_and_auth.sql
-- Enables reproducible fresh reset prior to posts, jobs, discovery, and foreign keys.
-- ======================================================================================

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

