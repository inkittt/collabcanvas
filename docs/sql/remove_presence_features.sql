-- Migration: Remove all presence-related features from canvas_collaborators table
-- This migration removes presence tracking fields and functions

-- Step 1: Drop presence-related database functions
DROP FUNCTION IF EXISTS join_canvas_room(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS leave_canvas_room(UUID, UUID);
DROP FUNCTION IF EXISTS update_user_presence(UUID, UUID, JSONB, TEXT);
DROP FUNCTION IF EXISTS get_canvas_active_users(UUID);
DROP FUNCTION IF EXISTS cleanup_inactive_users();

-- Step 2: Drop presence-related indexes
DROP INDEX IF EXISTS idx_canvas_collaborators_status;
DROP INDEX IF EXISTS idx_canvas_collaborators_last_seen;

-- Step 3: Remove presence-related columns from canvas_collaborators table
ALTER TABLE public.canvas_collaborators 
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS last_seen,
DROP COLUMN IF EXISTS cursor_position,
DROP COLUMN IF EXISTS user_color;

-- Step 4: Update realtime publication to remove canvas_collaborators if not needed for other features
-- Note: Only run this if canvas_collaborators is not used for other realtime features
-- BEGIN;
-- DROP PUBLICATION IF EXISTS supabase_realtime;
-- CREATE PUBLICATION supabase_realtime FOR TABLE
--   public.profiles,
--   public.canvases,
--   public.elements;
-- COMMIT;

-- Step 5: Remove graphql subscription comment if not needed
-- COMMENT ON TABLE public.canvas_collaborators IS NULL;

-- Verification: Check that presence fields are removed
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'canvas_collaborators' 
-- AND table_schema = 'public';
