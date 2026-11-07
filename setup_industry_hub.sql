-- Create industry_news table
CREATE TABLE IF NOT EXISTS public.industry_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'Industry Contributor',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for industry_news
ALTER TABLE public.industry_news ENABLE ROW LEVEL SECURITY;

-- Create public access policies for industry_news
DROP POLICY IF EXISTS "Allow public read access for industry_news" ON public.industry_news;
CREATE POLICY "Allow public read access for industry_news" ON public.industry_news
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert industry_news" ON public.industry_news;
CREATE POLICY "Allow authenticated users to insert industry_news" ON public.industry_news
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Allow users to update their own industry_news" ON public.industry_news;
CREATE POLICY "Allow users to update their own industry_news" ON public.industry_news
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own industry_news" ON public.industry_news;
CREATE POLICY "Allow users to delete their own industry_news" ON public.industry_news
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create industry_events table
CREATE TABLE IF NOT EXISTS public.industry_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT NOT NULL,
    is_online BOOLEAN DEFAULT false,
    attendees INTEGER DEFAULT 0,
    price TEXT NOT NULL DEFAULT 'Free',
    created_by TEXT NOT NULL DEFAULT 'Event Organizer',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    google_maps_link TEXT,
    meeting_link TEXT,
    registration_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure columns exist if table is already created
ALTER TABLE public.industry_events ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE public.industry_events ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.industry_events ADD COLUMN IF NOT EXISTS registration_link TEXT;

-- Enable RLS for industry_events
ALTER TABLE public.industry_events ENABLE ROW LEVEL SECURITY;

-- Create public access policies for industry_events
DROP POLICY IF EXISTS "Allow public read access for industry_events" ON public.industry_events;
CREATE POLICY "Allow public read access for industry_events" ON public.industry_events
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert industry_events" ON public.industry_events;
CREATE POLICY "Allow authenticated users to insert industry_events" ON public.industry_events
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Allow users to update their own industry_events" ON public.industry_events;
CREATE POLICY "Allow users to update their own industry_events" ON public.industry_events
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own industry_events" ON public.industry_events;
CREATE POLICY "Allow users to delete their own industry_events" ON public.industry_events
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create industry_courses table
CREATE TABLE IF NOT EXISTS public.industry_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration TEXT NOT NULL,
    instructor TEXT NOT NULL,
    price TEXT NOT NULL,
    enrolled INTEGER DEFAULT 0,
    level TEXT NOT NULL DEFAULT 'Intermediate',
    category TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'Course Instructor',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for industry_courses
ALTER TABLE public.industry_courses ENABLE ROW LEVEL SECURITY;

-- Create public access policies for industry_courses
DROP POLICY IF EXISTS "Allow public read access for industry_courses" ON public.industry_courses;
CREATE POLICY "Allow public read access for industry_courses" ON public.industry_courses
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert industry_courses" ON public.industry_courses;
CREATE POLICY "Allow authenticated users to insert industry_courses" ON public.industry_courses
    FOR INSERT TO authenticated WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

DROP POLICY IF EXISTS "Allow users to update their own industry_courses" ON public.industry_courses;
CREATE POLICY "Allow users to update their own industry_courses" ON public.industry_courses
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own industry_courses" ON public.industry_courses;
CREATE POLICY "Allow users to delete their own industry_courses" ON public.industry_courses
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.industry_news TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.industry_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.industry_courses TO authenticated;

GRANT SELECT ON public.industry_news TO anon;
GRANT SELECT ON public.industry_events TO anon;
GRANT SELECT ON public.industry_courses TO anon;

-- Populate with some Initial Mock Data
INSERT INTO public.industry_news (title, description, category, created_by)
VALUES 
('New Film Technology Revolutionizes Production', 'Latest advancements in film technology are changing how movies are made, offering new creative possibilities for filmmakers.', 'Technology', 'Tech News Team'),
('Streaming Platforms Invest in Regional Content', 'Major streaming platforms are increasing investments in regional language content to capture diverse audiences.', 'Industry', 'Industry Analyst'),
('Virtual Production Takes Center Stage', 'Virtual production techniques are becoming mainstream, offering cost-effective alternatives to traditional filming.', 'Production', 'Production Expert'),
('AI Tools Transform Post-Production', 'Artificial intelligence is revolutionizing post-production workflows, making editing faster and more efficient.', 'Technology', 'AI Specialist')
ON CONFLICT DO NOTHING;

INSERT INTO public.industry_events (title, description, date, location, is_online, price, created_by, attendees)
VALUES 
('Film Industry Networking Event', 'Connect with industry professionals and explore collaboration opportunities in film production.', '2024-12-20', 'Mumbai, India', false, '₹500', 'Film Producers Guild', 45),
('Digital Content Creation Workshop', 'Learn the latest techniques in digital content creation and social media marketing.', '2024-12-25', 'Online', true, '₹1,000', 'Digital Creators Hub', 120),
('VFX Masterclass', 'Advanced VFX techniques and industry insights from leading professionals.', '2024-12-30', 'Bangalore, India', false, '₹2,500', 'VFX Society', 30),
('Screenwriting Workshop', 'Master the art of storytelling and script development with industry experts.', '2025-01-05', 'Delhi, India', false, '₹3,000', 'Screenwriters Association', 25)
ON CONFLICT DO NOTHING;

INSERT INTO public.industry_courses (title, description, duration, instructor, price, enrolled, level, category, created_by)
VALUES 
('Advanced Cinematography', 'Master the art of cinematography with hands-on training and industry insights.', '8 weeks', 'Rajesh Kumar', '₹15,000', 85, 'Advanced', 'Cinematography', 'Film Academy India'),
('Screenwriting Fundamentals', 'Learn the basics of screenwriting and storytelling for film and television.', '6 weeks', 'Priya Sharma', '₹8,000', 120, 'Beginner', 'Writing', 'Creative Writing Institute'),
('Digital Marketing for Filmmakers', 'Essential digital marketing strategies for promoting films and building audience.', '4 weeks', 'Amit Patel', '₹6,000', 95, 'Intermediate', 'Marketing', 'Digital Marketing Pro'),
('Film Production Management', 'Comprehensive course on managing film productions from pre to post-production.', '10 weeks', 'Deepak Verma', '₹20,000', 45, 'Advanced', 'Production', 'Production Management Institute')
ON CONFLICT DO NOTHING;
