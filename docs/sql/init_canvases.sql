-- Create a table for canvases
CREATE TABLE public.canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canvas elements table
CREATE TABLE public.elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES public.canvases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  element_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create a table for canvas collaborators
CREATE TABLE public.canvas_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES public.canvases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(canvas_id, user_id)
);

-- Enable RLS on tables
ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- Set up RLS policies for canvases
CREATE POLICY "Users can view their own or public canvases" 
  ON public.canvases FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    is_public = true OR 
    id IN (
      SELECT canvas_id FROM public.canvas_collaborators 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own canvases" 
  ON public.canvases FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own canvases" 
  ON public.canvases FOR UPDATE 
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own canvases" 
  ON public.canvases FOR DELETE 
  USING (owner_id = auth.uid());

-- Canvas collaborators policies
CREATE POLICY "Users can view collaborators of canvases they have access to" 
  ON public.canvas_collaborators FOR SELECT 
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

-- Replace the ALL policy with individual policies to avoid recursive policy
DROP POLICY IF EXISTS "Canvas owners can manage collaborators" ON public.canvas_collaborators;

CREATE POLICY "Canvas owners can insert collaborators" 
  ON public.canvas_collaborators FOR INSERT
  WITH CHECK (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Canvas owners can update collaborators" 
  ON public.canvas_collaborators FOR UPDATE
  USING (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Canvas owners can delete collaborators" 
  ON public.canvas_collaborators FOR DELETE
  USING (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid()
    )
  );

-- Elements policies
CREATE POLICY "Users can view elements of canvases they have access to" 
  ON public.elements FOR SELECT 
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

CREATE POLICY "Users can create elements in canvases they can edit" 
  ON public.elements FOR INSERT 
  WITH CHECK (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid() OR 
      id IN (
        SELECT canvas_id FROM public.canvas_collaborators 
        WHERE user_id = auth.uid() AND permission_level = 'editor'
      )
    )
  );

CREATE POLICY "Users can update their own elements" 
  ON public.elements FOR UPDATE 
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own elements"
  ON public.elements FOR DELETE
  USING (user_id = auth.uid());

-- Performance indexes
CREATE INDEX idx_elements_canvas_id ON public.elements(canvas_id);
CREATE INDEX idx_elements_created_at ON public.elements(created_at);
CREATE INDEX idx_canvas_collaborators_canvas_id ON public.canvas_collaborators(canvas_id);
CREATE INDEX idx_canvas_collaborators_user_id ON public.canvas_collaborators(user_id);
CREATE INDEX idx_canvases_owner_id ON public.canvases(owner_id);
CREATE INDEX idx_canvases_is_public ON public.canvases(is_public);

-- Enable realtime
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.profiles,
  public.canvases,
  public.canvas_collaborators,
  public.elements;
COMMIT;

-- Add graphql subscriptions
COMMENT ON TABLE public.elements IS E'@graphql({"subscription": true})';
COMMENT ON TABLE public.canvas_collaborators IS E'@graphql({"subscription": true})';
COMMENT ON TABLE public.canvases IS E'@graphql({"subscription": true})'; 