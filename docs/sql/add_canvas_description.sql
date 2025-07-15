-- Add description column to canvases table
-- This allows users to provide a description for their canvas rooms
-- so other users can understand what the canvas is for

-- Add the description column with a default empty string
ALTER TABLE public.canvases 
ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Update the column comment for documentation
COMMENT ON COLUMN public.canvases.description IS 'Description of what this canvas room is for, visible to other users';

-- Create an index on description for search functionality (optional for future use)
CREATE INDEX IF NOT EXISTS idx_canvases_description ON public.canvases USING gin(to_tsvector('english', description));
