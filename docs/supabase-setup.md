# Setting Up Supabase for CollabCanvas

This guide provides instructions for setting up Supabase to support CollabCanvas features.

## 1. Create a Supabase Project

1. Sign up or log in at [supabase.com](https://supabase.com)
2. Create a new project
3. Choose a name, set a database password, and select your region
4. Wait for the project to be created (usually takes a few minutes)

## 2. Authentication Setup

### Email Authentication

1. Go to Authentication > Settings
2. Make sure "Email" provider is enabled
3. Configure site URL (e.g., `http://localhost:3000` for development)
4. Set up redirect URLs (add `http://localhost:3000` and your production URL)
5. Optionally customize email templates

### Google OAuth

1. Go to Authentication > Providers
2. Enable Google provider
3. Follow instructions to set up Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Configure OAuth consent screen
   - Create OAuth client ID credentials
   - Add authorized JavaScript origins (`http://localhost:3000`, your production URL)
   - Add authorized redirect URIs (`https://<your-supabase-ref>.supabase.co/auth/v1/callback`)
4. Copy Client ID and Client Secret to Supabase

## 3. Database Schema Setup

1. Go to SQL Editor
2. Create a new query
3. Copy and paste the SQL from `docs/sql/init_auth.sql`
4. Run the query to create all necessary tables, functions and triggers

This will create:
- Profiles table linked to auth.users
- Projects table
- Project members table with roles
- Row Level Security policies
- Triggers for automatic profile creation and project ownership

## 4. Enable Realtime

For the collaborative features to work, enable Supabase Realtime:

1. Go to Database > Replication
2. Enable duplicated publication
3. Add the following tables to the publication:
   - profiles
   - projects
   - project_members
   - (any other tables that need realtime functionality)

## 5. Environment Variables

Get your Supabase credentials:

1. Go to Project Settings > API
2. Find your "Project URL" and "anon/public" key
3. Create a `.env.local` file in your project root with:

```
REACT_APP_SUPABASE_URL=your_project_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
```

## 6. Storage Setup (Optional)

If you plan to use file storage (for avatars, exported images, etc.):

1. Go to Storage
2. Create a new bucket (e.g., "avatars", "canvas-exports")
3. Configure bucket permissions:
   - For public buckets: Enable "Public bucket" option
   - For private buckets: Use Row Level Security

## 7. Row Level Security (RLS) Explained

Supabase uses PostgreSQL's Row Level Security to control access to your data. The SQL setup script has already configured basic policies:

- **Profiles**: Everyone can view profiles, users can update their own
- **Projects**: Users can see public projects and those they're members of
- **Project Members**: Project owners can manage members

You can modify these policies in the Database > Policies section if needed.

## 8. Testing the Setup

After completing these steps:

1. Create a test user through your application's signup form
2. Verify the user appears in Authentication > Users
3. Check that a profile was automatically created in the Database > Table Editor > profiles
4. Try creating a project and verify the appropriate project_members entry is created

## Troubleshooting

- **Authentication issues**: Check redirect URLs and site URL in Supabase settings
- **Database errors**: Review SQL logs in Database > Logs
- **RLS problems**: Temporarily disable RLS for testing, then address policy issues
- **Realtime not working**: Make sure tables are added to the publication 