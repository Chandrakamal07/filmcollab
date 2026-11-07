-- Migration: 20261105000002_create_contact_submissions.sql
-- Create contact_submissions table for public inquiries

CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'unread'
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous/authenticated insertion of contact submissions
CREATE POLICY "contact_submissions_insert_public" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);

-- Allow only administrators to read contact submissions
CREATE POLICY "contact_submissions_admin_read" ON public.contact_submissions
    FOR SELECT USING (
        auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

