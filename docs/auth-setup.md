# CollabCanvas Authentication Setup

This document provides instructions for setting up authentication in CollabCanvas using Supabase.

## Prerequisites

1. A Supabase account (https://supabase.com)
2. A Supabase project

## Setting Up Supabase Authentication

### 1. Create a Supabase Project

1. Sign in to your Supabase account
2. Create a new project
3. Give your project a name, set a password, and select your region
4. Wait for the database to be created

### 2. Configure Authentication Providers

#### Email Auth

1. Go to Authentication > Settings
2. Enable Email Auth
3. Configure site URL (your app's URL)
4. Configure redirect URLs (e.g., `http://localhost:3000`)
5. Configure email templates (optional)

#### Google OAuth

1. Go to Authentication > Providers
2. Enable Google
3. Follow the instructions to set up Google OAuth credentials
   - Create a project in Google Cloud Console
   - Set up OAuth consent screen
   - Create OAuth client ID 
   - Set authorized redirect URIs (should include `https://your-project-ref.supabase.co/auth/v1/callback`)
4. Enter your Client ID and Client Secret in Supabase

### 3. Set Up Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project settings > API.

## User Roles and Permissions

CollabCanvas uses role-based access control to manage user permissions:

- **Owner**: Can create, edit, delete, and manage permissions
- **Editor**: Can edit and collaborate
- **Viewer**: Can only view the canvas
- **Guest**: Limited access with temporary sessions

To implement these roles, we'll need to create a `profiles` table in our database.

### Setting Up User Profiles

Create a SQL migration for the profiles table:

```sql
-- Create a table for user profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
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
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Project Structure

The authentication system in CollabCanvas consists of:

- `src/auth/AuthContext.js`: Authentication context for user state
- `src/components/Auth/Login.js`: Login form
- `src/components/Auth/SignUp.js`: Sign up form
- `src/components/Auth/AuthForm.js`: Combines login and signup forms
- `src/lib/supabase.js`: Supabase client setup

## Testing Authentication

1. Start your development server (`npm start` or `yarn start`)
2. Try signing up with email and password
3. Verify email confirmation process
4. Try signing in
5. Test Google OAuth integration

## Troubleshooting

- Check Supabase dashboard > Authentication for user registrations and sign-ins
- Verify OAuth configuration if social login fails
- Check browser console for error messages
- Ensure environment variables are correctly set up 