# CollabCanvas

CollabCanvas is a real-time collaborative image editing platform designed for both amateurs and professionals. It enables seamless teamwork with real-time updates using Supabase's Realtime features to maintain data consistency across users.

## Features

- global real-time chatting that all users can access for shared anything 
- Real-time collaborative canvas editing with Fabric.js
- User authentication with email/password and Google OAuth
- Role-based permissions (owner, editor, viewer)
- Live chat for communication during collaboration
- Multi-user cursor tracking
- Canvas history and undo/redo functionality
- Project management with public/private options

## Tech Stack

- **Frontend:** React.js with Material UI
- **Backend:** Supabase (Authentication, PostgreSQL Database, Realtime)
- **Drawing Engine:** Fabric.js for canvas manipulation

## Setup and Installation

### Prerequisites

- Node.js >= 12.x
- npm or yarn
- A Supabase account and project

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/collabcanvas.git
cd collabcanvas
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Set Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run the SQL in `docs/init_auth.sql` and `docs/enable_realtime.sql`
4. Enable authentication methods (Email, Google OAuth) in Authentication → Settings
5. Enable Realtime features in Database → Realtime

### Step 4: Configure Database Schema

Run the following SQL in your Supabase SQL editor to create the necessary tables and policies:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canvases table
CREATE TABLE public.canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create canvas_collaborators table
CREATE TABLE public.canvas_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES public.canvases(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'editor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create elements table
CREATE TABLE public.elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canvas_id UUID REFERENCES public.canvases(id) NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  element_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setup RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elements ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Canvases policies
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

CREATE POLICY "Canvas owners can manage collaborators" 
  ON public.canvas_collaborators 
  USING (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid()
    )
  );

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
```

### Step 5: Configure Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project under Settings → API.

### Step 6: Start the Development Server

```bash
npm start
# or
yarn start
```

The application will be available at http://localhost:3000.

## Project Structure

- `src/auth/` - Authentication components and context
- `src/components/` - UI components
  - `src/components/Auth/` - Authentication forms 
  - `src/components/Canvas/` - Canvas-related components
  - `src/components/Examples/` - Example components for demonstration
- `src/lib/` - Utility functions and Supabase client
  - `src/lib/supabase.js` - Supabase client configuration
  - `src/lib/realtime.js` - Real-time collaboration functions
- `src/services/` - Service classes for API interactions
  - `src/services/canvasService.js` - Canvas CRUD operations
  - `src/services/profileService.js` - User profile management
- `docs/` - Documentation and SQL migration files

## Connecting to Supabase Realtime

This project uses Supabase Realtime for collaborative features:

1. **Real-time Canvas Updates:** When users make changes to the canvas, others see them instantly
2. **User Presence:** Shows who is currently viewing or editing the canvas
3. **Cursor Tracking:** Displays the position of all users' cursors
4. **Chat Messaging:** Allows users to communicate in real-time

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 