-- Enable realtime for the required tables

-- First, let's create a publication for all tables we want to track in real-time
BEGIN;

-- If the publication already exists, drop it to recreate
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.profiles,
  public.canvases,
  public.canvas_collaborators,
  public.elements;

-- You can add more tables to the publication as needed

COMMIT;

-- Test by updating the schema.graphql to include the realtime subscriptions
COMMENT ON TABLE public.elements IS E'@graphql({"subscription": true})';
COMMENT ON TABLE public.canvas_collaborators IS E'@graphql({"subscription": true})';

-- Enable row level security on all tables (if not already enabled)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.canvas_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.elements ENABLE ROW LEVEL SECURITY; 