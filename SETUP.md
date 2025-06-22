# CollabCanvas Setup Guide

This guide will walk you through setting up the CollabCanvas project for development.

## Prerequisites

- Node.js >= 12.x
- npm or yarn
- A Supabase account and project

## Step 1: Set Up Supabase

1. Create a Supabase account at [supabase.com](https://supabase.com) if you don't have one
2. Create a new project
3. Once your project is created, you'll need to set up the database schema

### Database Setup

Run the following SQL scripts in the Supabase SQL Editor:

1. First, run `docs/sql/init_auth.sql` to create the profiles table and authentication triggers
2. Then, run `docs/sql/init_canvases.sql` to create the canvas-related tables and policies
3. Finally, run `docs/sql/enable_realtime.sql` to enable realtime functionality

### Authentication Setup

1. Go to Authentication → Settings in your Supabase project
2. Enable Email auth provider
3. Set "Site URL" to `http://localhost:3000` (or your production URL)
4. Optional: Configure additional providers like Google OAuth

## Step 2: Configure Environment Variables

For local development, CollabCanvas uses fallback Supabase credentials. However, for your own setup:

1. Create a `.env.local` file in the project root with:

```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project under Settings → API.

## Step 3: Install Dependencies

```bash
npm install
# or
yarn install
```

## Step 4: Start the Development Server

```bash
npm start
# or
yarn start
```

The application should be available at http://localhost:3000.

## Troubleshooting

### Canvas Creation Issues

If you encounter issues creating a canvas:

1. Check the browser console for error messages
2. Verify that you're properly authenticated
3. Make sure the database schema is correctly set up in Supabase
4. Check that your user has a valid profile in the `profiles` table

### Database Setup Issues

If you're having issues with the database setup:

1. Make sure you run the SQL scripts in the correct order
2. Verify that Row Level Security (RLS) policies are enabled
3. Check that the database tables match what the application expects

### Authentication Issues

If you're having trouble signing in:

1. Make sure the authentication providers are properly configured in Supabase
2. Check if the site URL is correctly set
3. Verify that the Supabase URL and anon key are correct 