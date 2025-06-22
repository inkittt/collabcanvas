# How to Fix the Canvas Creation Issue

You're encountering an error: "Failed to create canvas: infinite recursion detected in policy for relation 'canvas_collaborators'" when trying to create a new canvas.

This is caused by a recursive Row Level Security (RLS) policy in Supabase. Here are the steps to fix it:

## Option 1: Fix via Supabase SQL Editor (Recommended)

1. Log in to your Supabase dashboard at [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to the SQL Editor (left sidebar)
4. Create a new query
5. Copy and paste the following SQL code:

```sql
-- Fix for the infinite recursion in canvas_collaborators RLS policy

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Canvas owners can manage collaborators" ON public.canvas_collaborators;

-- Create separate policies for each operation
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
```

6. Run the query
7. Restart your application

## Option 2: Run the Fix Script

If you don't have direct access to the Supabase dashboard, you can run the fix script:

1. Install the required dependency:
```bash
npm install @supabase/supabase-js
```

2. Run the fix script:
```bash
node fix-canvas-policy.js
```

3. Restart your application

## What Was the Problem?

The issue was caused by a policy with `FOR ALL` operations that was creating an infinite recursion:

1. When creating a canvas, the app tries to check if you have permission
2. The permission check involves looking at `canvas_collaborators`
3. But to access `canvas_collaborators`, it needs to check the same permission again
4. This creates an infinite loop

The fix breaks this loop by creating separate policies for each operation type (INSERT, UPDATE, DELETE) instead of using a single policy for ALL operations.

## After the Fix

After applying the fix, you should be able to create canvases without any issues. If you're still having problems, please check the browser console for any additional error messages. 