-- Profile Deletion Policies and Functions
-- This file contains SQL policies and functions to handle safe profile deletion

-- First, ensure all foreign key relationships have proper CASCADE behavior

-- Update profiles table to add deletion policy
CREATE POLICY "Users can delete their own profile" 
  ON public.profiles FOR DELETE 
  USING (auth.uid() = id);

-- Create a function to check if a user can safely delete their profile
CREATE OR REPLACE FUNCTION public.check_profile_deletion_safety(user_id UUID)
RETURNS JSON AS $$
DECLARE
  owned_canvases_count INTEGER;
  collaborations_count INTEGER;
  community_messages_count INTEGER;
  canvas_messages_count INTEGER;
  result JSON;
BEGIN
  -- Count owned canvases
  SELECT COUNT(*) INTO owned_canvases_count
  FROM public.canvases
  WHERE owner_id = user_id;
  
  -- Count collaborations
  SELECT COUNT(*) INTO collaborations_count
  FROM public.canvas_collaborators
  WHERE user_id = user_id;
  
  -- Count community messages
  SELECT COUNT(*) INTO community_messages_count
  FROM public.community_messages
  WHERE user_id = user_id;
  
  -- Count canvas messages
  SELECT COUNT(*) INTO canvas_messages_count
  FROM public.canvas_messages
  WHERE user_id = user_id;
  
  -- Build result JSON
  result := json_build_object(
    'can_delete', owned_canvases_count = 0,
    'owned_canvases_count', owned_canvases_count,
    'collaborations_count', collaborations_count,
    'community_messages_count', community_messages_count,
    'canvas_messages_count', canvas_messages_count
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely delete a user profile
CREATE OR REPLACE FUNCTION public.delete_user_profile(
  user_id UUID,
  delete_canvases BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  safety_check JSON;
  owned_canvases_count INTEGER;
  deleted_canvases INTEGER := 0;
  result JSON;
BEGIN
  -- Check if the requesting user is the profile owner
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only delete your own profile';
  END IF;
  
  -- Get safety check
  safety_check := public.check_profile_deletion_safety(user_id);
  owned_canvases_count := (safety_check->>'owned_canvases_count')::INTEGER;
  
  -- If user has owned canvases and delete_canvases is false, prevent deletion
  IF owned_canvases_count > 0 AND NOT delete_canvases THEN
    RAISE EXCEPTION 'Cannot delete profile: User has % owned canvas(es). Set delete_canvases=true to force deletion.', owned_canvases_count;
  END IF;
  
  -- Delete owned canvases if requested
  IF delete_canvases AND owned_canvases_count > 0 THEN
    DELETE FROM public.canvases WHERE owner_id = user_id;
    GET DIAGNOSTICS deleted_canvases = ROW_COUNT;
  END IF;
  
  -- Delete the profile (this will cascade delete collaborations and messages)
  DELETE FROM public.profiles WHERE id = user_id;
  
  -- Build result
  result := json_build_object(
    'success', true,
    'deleted_canvases', deleted_canvases,
    'message', 'Profile deleted successfully'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to transfer canvas ownership
CREATE OR REPLACE FUNCTION public.transfer_canvas_ownership(
  from_user_id UUID,
  to_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  transferred_count INTEGER;
  to_user_exists BOOLEAN;
  result JSON;
BEGIN
  -- Check if the requesting user is the current owner
  IF auth.uid() != from_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only transfer your own canvases';
  END IF;
  
  -- Check if target user exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = to_user_id) INTO to_user_exists;
  
  IF NOT to_user_exists THEN
    RAISE EXCEPTION 'Target user does not exist';
  END IF;
  
  -- Transfer ownership
  UPDATE public.canvases 
  SET owner_id = to_user_id, updated_at = NOW()
  WHERE owner_id = from_user_id;
  
  GET DIAGNOSTICS transferred_count = ROW_COUNT;
  
  -- Build result
  result := json_build_object(
    'success', true,
    'transferred_count', transferred_count,
    'message', format('Successfully transferred %s canvas(es)', transferred_count)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_profile_deletion_safety(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_profile(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_canvas_ownership(UUID, UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.check_profile_deletion_safety(UUID) IS 'Checks if a user profile can be safely deleted by analyzing dependencies';
COMMENT ON FUNCTION public.delete_user_profile(UUID, BOOLEAN) IS 'Safely deletes a user profile with optional canvas deletion';
COMMENT ON FUNCTION public.transfer_canvas_ownership(UUID, UUID) IS 'Transfers ownership of all canvases from one user to another';

-- Ensure proper foreign key constraints exist with CASCADE behavior
-- (These should already exist from the init scripts, but we verify them here)

-- Verify canvases table has proper owner reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'canvases_owner_id_fkey' 
    AND table_name = 'canvases'
  ) THEN
    ALTER TABLE public.canvases 
    ADD CONSTRAINT canvases_owner_id_fkey 
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verify elements table has proper user reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'elements_user_id_fkey' 
    AND table_name = 'elements'
  ) THEN
    ALTER TABLE public.elements 
    ADD CONSTRAINT elements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verify canvas_collaborators table has proper user reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'canvas_collaborators_user_id_fkey' 
    AND table_name = 'canvas_collaborators'
  ) THEN
    ALTER TABLE public.canvas_collaborators 
    ADD CONSTRAINT canvas_collaborators_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for performance on deletion operations
CREATE INDEX IF NOT EXISTS idx_profiles_deletion ON public.profiles(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvases_owner_deletion ON public.canvases(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_elements_user_deletion ON public.elements(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collaborators_user_deletion ON public.canvas_collaborators(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_community_messages_user_deletion ON public.community_messages(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canvas_messages_user_deletion ON public.canvas_messages(user_id) WHERE user_id IS NOT NULL;
