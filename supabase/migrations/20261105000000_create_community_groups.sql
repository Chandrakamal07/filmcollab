-- Migration: Create community groups, group members, and group messages
-- Generated: 2026-11-05
-- Purpose: Support real multi-user community groups, membership, settings, and group messaging

-- 1. Community Groups Table
CREATE TABLE IF NOT EXISTS public.community_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Filmmaking',
    tags TEXT[] DEFAULT '{}',
    privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private')),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{"allowMemberInvites": true, "allowMemberPosts": true, "requireApproval": false, "notifications": true}'::jsonb
);

-- Enable RLS
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;

-- 2. Community Group Members Table
CREATE TABLE IF NOT EXISTS public.community_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Member' CHECK (role IN ('Owner', 'Admin', 'Moderator', 'Member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;

-- 3. Community Group Messages Table
CREATE TABLE IF NOT EXISTS public.community_group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.community_group_messages ENABLE ROW LEVEL SECURITY;

-- 4. Non-recursive SECURITY DEFINER Helper Functions
CREATE OR REPLACE FUNCTION public.is_community_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.community_group_members
        WHERE group_id = _group_id AND user_id = _user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.is_community_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.community_group_members
        WHERE group_id = _group_id AND user_id = _user_id AND role IN ('Owner', 'Admin')
    );
$$;

-- RLS Policies for community_groups
CREATE POLICY "community_groups_read" ON public.community_groups
    FOR SELECT USING (
        privacy = 'public' 
        OR auth.uid() = created_by 
        OR public.is_community_group_member(id, auth.uid())
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE POLICY "community_groups_insert" ON public.community_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "community_groups_update" ON public.community_groups
    FOR UPDATE USING (
        auth.uid() = created_by 
        OR public.is_community_group_admin(id, auth.uid())
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE POLICY "community_groups_delete" ON public.community_groups
    FOR DELETE USING (
        auth.uid() = created_by 
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- RLS Policies for community_group_members
CREATE POLICY "community_group_members_read" ON public.community_group_members
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.community_groups g
            WHERE g.id = community_group_members.group_id
            AND g.privacy = 'public'
        )
        OR public.is_community_group_member(group_id, auth.uid())
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- Privilege check: self-join allows 'Member' only on public groups; group creator can create 'Owner'
CREATE POLICY "community_group_members_insert" ON public.community_group_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            (role = 'Member' AND EXISTS (
                SELECT 1 FROM public.community_groups g
                WHERE g.id = group_id AND g.privacy = 'public'
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

CREATE POLICY "community_group_members_update" ON public.community_group_members
    FOR UPDATE USING (
        public.is_community_group_admin(group_id, auth.uid())
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE POLICY "community_group_members_delete" ON public.community_group_members
    FOR DELETE USING (
        auth.uid() = user_id 
        OR public.is_community_group_admin(group_id, auth.uid())
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

-- RLS Policies for community_group_messages
CREATE POLICY "community_group_messages_read" ON public.community_group_messages
    FOR SELECT USING (
        public.is_community_group_member(group_id, auth.uid())
        OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    );

CREATE POLICY "community_group_messages_insert" ON public.community_group_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND (
            public.is_community_group_member(group_id, auth.uid())
            OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_groups_created_by ON public.community_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_community_group_members_user ON public.community_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_group_members_group ON public.community_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_community_group_messages_group ON public.community_group_messages(group_id, created_at);
