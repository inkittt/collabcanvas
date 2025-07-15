-- Create the join_canvas_with_invite_code RPC function
-- This function allows users to join a canvas using an invite code

-- First, ensure the invite_code column exists in the canvases table
ALTER TABLE public.canvases ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Create a unique index on invite_code for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_canvases_invite_code ON public.canvases(invite_code) WHERE invite_code IS NOT NULL;

-- Create the RPC function to join a canvas with an invite code
CREATE OR REPLACE FUNCTION join_canvas_with_invite_code(
  p_invite_code TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_canvas_id UUID;
  v_canvas_owner_id UUID;
  v_existing_collaborator_id UUID;
BEGIN
  -- Find the canvas with the given invite code
  SELECT id, owner_id INTO v_canvas_id, v_canvas_owner_id
  FROM public.canvases
  WHERE invite_code = p_invite_code;
  
  -- If no canvas found with this invite code, return null
  IF v_canvas_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If the user is already the owner, just return the canvas ID
  IF v_canvas_owner_id = p_user_id THEN
    RETURN v_canvas_id;
  END IF;
  
  -- Check if user is already a collaborator
  SELECT id INTO v_existing_collaborator_id
  FROM public.canvas_collaborators
  WHERE canvas_id = v_canvas_id AND user_id = p_user_id;
  
  -- If user is already a collaborator, just return the canvas ID
  IF v_existing_collaborator_id IS NOT NULL THEN
    RETURN v_canvas_id;
  END IF;
  
  -- Add the user as a collaborator with 'viewer' permission by default
  INSERT INTO public.canvas_collaborators (canvas_id, user_id, permission_level)
  VALUES (v_canvas_id, p_user_id, 'viewer');
  
  -- Return the canvas ID
  RETURN v_canvas_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return null
    RAISE LOG 'Error in join_canvas_with_invite_code: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_canvas_with_invite_code(TEXT, UUID) TO authenticated;
