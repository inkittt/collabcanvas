-- Create community chat messages table
-- This table stores messages for the global community chat feature

CREATE TABLE IF NOT EXISTS public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canvas-specific chat messages table
CREATE TABLE IF NOT EXISTS public.canvas_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES public.canvases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_messages
-- Everyone can view community messages (public chat)
CREATE POLICY "Everyone can view community messages" 
  ON public.community_messages FOR SELECT 
  USING (true);

-- Authenticated users can insert community messages
CREATE POLICY "Authenticated users can send community messages" 
  ON public.community_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages (for editing)
CREATE POLICY "Users can update their own community messages" 
  ON public.community_messages FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete their own community messages" 
  ON public.community_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for canvas_messages
-- Users can view messages in canvases they have access to
CREATE POLICY "Users can view canvas messages they have access to" 
  ON public.canvas_messages FOR SELECT 
  USING (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid() OR 
      is_public = true OR 
      id IN (
        SELECT canvas_id FROM public.canvas_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can send messages in canvases they have access to
CREATE POLICY "Users can send messages in accessible canvases" 
  ON public.canvas_messages FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid() OR 
      is_public = true OR 
      id IN (
        SELECT canvas_id FROM public.canvas_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can update their own canvas messages
CREATE POLICY "Users can update their own canvas messages" 
  ON public.canvas_messages FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own canvas messages
CREATE POLICY "Users can delete their own canvas messages" 
  ON public.canvas_messages FOR DELETE 
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_messages_created_at ON public.community_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_community_messages_user_id ON public.community_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_messages_canvas_id ON public.canvas_messages(canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvas_messages_created_at ON public.canvas_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_canvas_messages_user_id ON public.canvas_messages(user_id);

-- Add tables to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_messages;

-- Add comments for documentation
COMMENT ON TABLE public.community_messages IS 'Global community chat messages visible to all users';
COMMENT ON TABLE public.canvas_messages IS 'Canvas-specific chat messages for collaboration';
COMMENT ON COLUMN public.community_messages.content IS 'The message content/text';
COMMENT ON COLUMN public.canvas_messages.content IS 'The message content/text';
