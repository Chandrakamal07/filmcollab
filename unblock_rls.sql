-- Secured Repair Script (M05)
-- Replaces insecure legacy open policies with authoritative scoped policies

-- 1. Ticket updates (Only active staff and administrators)
DROP POLICY IF EXISTS "Anyone can insert ticket updates" ON public.ticket_updates;
DROP POLICY IF EXISTS "Only admins can insert ticket updates" ON public.ticket_updates;
DROP POLICY IF EXISTS "ticket_updates_insert" ON public.ticket_updates;
CREATE POLICY "ticket_updates_insert" ON public.ticket_updates 
  FOR INSERT TO authenticated 
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_team_members atm 
      WHERE atm.user_id = auth.uid() AND atm.status = 'Active'
    )
  );

-- 2. Ticket modification (Participants and administrators)
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE TO authenticated 
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE (p.id = tickets.user_id OR p.id = tickets.profile_id) AND p.user_id = auth.uid()
    )
    OR auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
  );

-- 3. Ticket messages (Enforce participant and authenticated author check)
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_participant_insert" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_insert" ON public.ticket_messages 
  FOR INSERT TO authenticated 
  WITH CHECK (
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
  
DROP POLICY IF EXISTS "Anyone can read ticket messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_participant_read" ON public.ticket_messages;
CREATE POLICY "ticket_messages_participant_read" ON public.ticket_messages 
  FOR SELECT TO authenticated 
  USING (
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

-- Reload schema so changes take effect immediately
NOTIFY pgrst, 'reload schema';
