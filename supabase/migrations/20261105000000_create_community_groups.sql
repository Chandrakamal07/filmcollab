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

-- RLS Policies for community_groups
CREATE POLICY "community_groups_read" ON public.community_groups
    FOR SELECT USING (
        privacy = 'public' OR
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.community_group_members
            WHERE community_group_members.group_id = community_groups.id
            AND community_group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "community_groups_insert" ON public.community_groups
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "community_groups_update" ON public.community_groups
    FOR UPDATE USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM public.community_group_members
            WHERE community_group_members.group_id = community_groups.id
            AND community_group_members.user_id = auth.uid()
            AND community_group_members.role IN ('Owner', 'Admin')
        )
    );

CREATE POLICY "community_groups_delete" ON public.community_groups
    FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for community_group_members
CREATE POLICY "community_group_members_read" ON public.community_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_groups
            WHERE community_groups.id = community_group_members.group_id
            AND (
                community_groups.privacy = 'public' OR
                EXISTS (
                    SELECT 1 FROM public.community_group_members m2
                    WHERE m2.group_id = community_group_members.group_id
                    AND m2.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "community_group_members_insert" ON public.community_group_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_group_members_delete" ON public.community_group_members
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.community_groups
            WHERE community_groups.id = community_group_members.group_id
            AND community_groups.created_by = auth.uid()
        )
    );

-- RLS Policies for community_group_messages
CREATE POLICY "community_group_messages_read" ON public.community_group_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.community_group_members
            WHERE community_group_members.group_id = community_group_messages.group_id
            AND community_group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "community_group_messages_insert" ON public.community_group_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.community_group_members
            WHERE community_group_members.group_id = community_group_messages.group_id
            AND community_group_members.user_id = auth.uid()
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_groups_created_by ON public.community_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_community_group_members_user ON public.community_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_group_members_group ON public.community_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_community_group_messages_group ON public.community_group_messages(group_id, created_at);

