-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'job', 'connection', 'project', 'event', 'system', 'profile'
  status TEXT NOT NULL DEFAULT 'unread', -- 'unread', 'read'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
  action_url TEXT NULL, -- e.g. /connections, /jobs, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;

-- Create policies that respect profiles user_id mapping
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = notifications.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = notifications.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = notifications.user_id 
      AND profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_insert_policy"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin')
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = notifications.user_id OR p.user_id = notifications.user_id)
        AND (p.user_id = auth.uid() OR p.id = auth.uid())
    )
  );

-- Create indexes for speed
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);


-- 2. CREATE AUTOMATIC TRIGGER FOR CONNECTION REQUESTS (Notify receiver)
CREATE OR REPLACE FUNCTION public.handle_connection_request_notification()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get the sender's name
  SELECT COALESCE(full_name, username, 'Someone') INTO sender_name
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Insert notification for the receiver (connected_user_id)
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
    VALUES (
      NEW.connected_user_id,
      'New Connection Request',
      sender_name || ' wants to connect with you.',
      'connection',
      'medium',
      '/connections'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_connection_request_notification ON public.connections;
CREATE TRIGGER trigger_connection_request_notification
  AFTER INSERT ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_connection_request_notification();


-- 3. CREATE AUTOMATIC TRIGGER FOR CONNECTION ACCEPTANCE (Notify sender)
CREATE OR REPLACE FUNCTION public.handle_connection_accepted_notification()
RETURNS TRIGGER AS $$
DECLARE
  receiver_name TEXT;
BEGIN
  -- Get the receiver's name (the one who accepted)
  SELECT COALESCE(full_name, username, 'Someone') INTO receiver_name
  FROM public.profiles
  WHERE id = NEW.connected_user_id;

  -- Only trigger when status changes to 'accepted' from 'pending'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
    VALUES (
      NEW.user_id, -- Notify the original sender
      'Connection Request Accepted',
      receiver_name || ' accepted your connection request.',
      'connection',
      'high',
      '/connections'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_connection_accepted_notification ON public.connections;
CREATE TRIGGER trigger_connection_accepted_notification
  AFTER UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_connection_accepted_notification();


-- 4. CREATE AUTOMATIC TRIGGER FOR NEW JOBS (Notify profiles)
CREATE OR REPLACE FUNCTION public.handle_new_job_notifications()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a system/job notification for active profiles (limited to 50 to prevent timeout)
  INSERT INTO public.notifications (user_id, title, description, type, priority, action_url)
  SELECT 
    p.id,
    'New Job Opportunity',
    'A new job position has been posted: ' || NEW.title || ' at ' || COALESCE(NEW.company_name, 'a Film Studio') || '.',
    'job',
    'high',
    '/jobs'
  FROM public.profiles p
  ORDER BY COALESCE(p.updated_at, '1970-01-01'::timestamp) DESC
  LIMIT 50;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_new_job_notification ON public.jobs;
CREATE TRIGGER trigger_new_job_notification
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_job_notifications();
