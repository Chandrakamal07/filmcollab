-- Complete Posts Database Fix
-- Run this script in Supabase SQL Editor to fix all posts-related issues

-- 1. First, let's check what tables exist
SELECT 'Checking existing tables:' as info;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('posts', 'post_likes', 'post_comments', 'post_saves', 'profiles')
ORDER BY table_name;

-- 2. Create posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_urls TEXT[],
    media_types TEXT[],
    hashtags TEXT[],
    is_published BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create post_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 4. Create post_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create post_saves table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.post_saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- 6. Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies if they exist
DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;

DROP POLICY IF EXISTS "post_likes_select_policy" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert_policy" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete_policy" ON public.post_likes;

DROP POLICY IF EXISTS "post_comments_select_policy" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_insert_policy" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_update_policy" ON public.post_comments;
DROP POLICY IF EXISTS "post_comments_delete_policy" ON public.post_comments;

DROP POLICY IF EXISTS "post_saves_select_policy" ON public.post_saves;
DROP POLICY IF EXISTS "post_saves_insert_policy" ON public.post_saves;
DROP POLICY IF EXISTS "post_saves_delete_policy" ON public.post_saves;

-- 8. Create RLS policies for posts
CREATE POLICY "posts_select_policy" ON public.posts 
FOR SELECT 
USING (true);

CREATE POLICY "posts_insert_policy" ON public.posts 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = author_id
    )
);

CREATE POLICY "posts_update_policy" ON public.posts 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = author_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = author_id
    )
);

CREATE POLICY "posts_delete_policy" ON public.posts 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = author_id
    )
);

-- 9. Create RLS policies for post_likes
CREATE POLICY "post_likes_select_policy" ON public.post_likes 
FOR SELECT 
USING (true);

CREATE POLICY "post_likes_insert_policy" ON public.post_likes 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

CREATE POLICY "post_likes_delete_policy" ON public.post_likes 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

-- 10. Create RLS policies for post_comments
CREATE POLICY "post_comments_select_policy" ON public.post_comments 
FOR SELECT 
USING (true);

CREATE POLICY "post_comments_insert_policy" ON public.post_comments 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

CREATE POLICY "post_comments_update_policy" ON public.post_comments 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

CREATE POLICY "post_comments_delete_policy" ON public.post_comments 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

-- 11. Create RLS policies for post_saves
CREATE POLICY "post_saves_select_policy" ON public.post_saves 
FOR SELECT 
USING (true);

CREATE POLICY "post_saves_insert_policy" ON public.post_saves 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

CREATE POLICY "post_saves_delete_policy" ON public.post_saves 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = auth.uid() AND id = user_id
    )
);

-- 12. Create triggers to update counts
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts 
        SET likes_count = likes_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts 
        SET likes_count = likes_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.posts 
        SET comments_count = comments_count + 1 
        WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.posts 
        SET comments_count = comments_count - 1 
        WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 13. Create triggers
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON public.post_likes;
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON public.post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

DROP TRIGGER IF EXISTS trigger_update_post_comments_count ON public.post_comments;
CREATE TRIGGER trigger_update_post_comments_count
    AFTER INSERT OR DELETE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- 14. Create storage bucket for post media if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- 15. Create storage policies
CREATE POLICY "post_media_select_policy" ON storage.objects
FOR SELECT USING (bucket_id = 'post-media');

CREATE POLICY "post_media_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "post_media_update_policy" ON storage.objects
FOR UPDATE USING (
    bucket_id IN ('post-media', 'post_media') AND (
        auth.uid() = owner
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND (storage.foldername(storage.objects.name))[1] = p.id::text
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    )
);

CREATE POLICY "post_media_delete_policy" ON storage.objects
FOR DELETE USING (
    bucket_id IN ('post-media', 'post_media') AND (
        auth.uid() = owner
        OR (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = auth.uid()
              AND (storage.foldername(storage.objects.name))[1] = p.id::text
        )
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    )
);

-- 16. Test the setup
SELECT 'Database setup completed successfully!' as status;

-- 17. Check current user profile
SELECT 'Current user profile:' as info;
SELECT id, full_name, user_id FROM public.profiles WHERE user_id = auth.uid();

-- 18. Test post creation (uncomment to test)
/*
DO $$
DECLARE
    profile_id uuid;
    post_id uuid;
BEGIN
    -- Get the current user's profile ID
    SELECT id INTO profile_id FROM public.profiles WHERE user_id = auth.uid();
    
    IF profile_id IS NOT NULL THEN
        -- Create a test post
        INSERT INTO public.posts (
            title,
            content,
            author_id,
            is_published
        ) VALUES (
            'Test Post',
            'This is a test post to verify the database setup.',
            profile_id,
            true
        ) RETURNING id INTO post_id;
        
        RAISE NOTICE 'Test post created successfully with ID: %', post_id;
    ELSE
        RAISE NOTICE 'No profile found for current user: %', auth.uid();
    END IF;
END $$;
*/
