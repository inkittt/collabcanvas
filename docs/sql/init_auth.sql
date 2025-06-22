-- Create a table for user profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE, 
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Set up RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create a trigger to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a table for projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Set up RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create a table for project members (for permissions)
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Set up RLS for project members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
-- Users can view projects they are members of or public projects
CREATE POLICY "Users can view their projects and public projects" 
  ON public.projects 
  FOR SELECT 
  USING (
    is_public OR 
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

-- Users can create projects
CREATE POLICY "Users can create projects" 
  ON public.projects 
  FOR INSERT 
  WITH CHECK (true);

-- Users can update projects they own
CREATE POLICY "Users can update projects they own" 
  ON public.projects 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- Users can delete projects they own
CREATE POLICY "Users can delete projects they own" 
  ON public.projects 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- Create policies for project members

-- Users can view members of projects they belong to
CREATE POLICY "Users can view members of their projects" 
  ON public.project_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id AND pm.user_id = auth.uid()
    )
  );

-- Project owners can manage members
CREATE POLICY "Project owners can manage members" 
  ON public.project_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = project_id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- Create a function to automatically add a user as owner when creating a project
CREATE OR REPLACE FUNCTION public.add_project_owner() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (new.id, auth.uid(), 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE PROCEDURE public.add_project_owner(); 