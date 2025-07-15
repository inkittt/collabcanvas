-- SQL script to create database trigger for user join notifications
-- This trigger will send real-time notifications when users join canvas rooms

-- Create a function to handle user join notifications
CREATE OR REPLACE FUNCTION notify_canvas_owner_of_new_collaborator()
RETURNS TRIGGER AS $$
DECLARE
  canvas_owner_id UUID;
  canvas_name TEXT;
  joining_user_profile RECORD;
BEGIN
  -- Get the canvas owner ID and name
  SELECT owner_id, name INTO canvas_owner_id, canvas_name
  FROM public.canvases
  WHERE id = NEW.canvas_id;
  
  -- Don't send notification if the new collaborator is the canvas owner
  IF canvas_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the joining user's profile information
  SELECT id, username, avatar_url INTO joining_user_profile
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Send a real-time notification to the canvas owner
  -- Using pg_notify to send a notification that can be picked up by the application
  PERFORM pg_notify(
    'canvas_user_joined',
    json_build_object(
      'type', 'user_joined',
      'canvas_id', NEW.canvas_id,
      'canvas_name', canvas_name,
      'owner_id', canvas_owner_id,
      'joining_user', json_build_object(
        'id', joining_user_profile.id,
        'username', COALESCE(joining_user_profile.username, 'Unknown User'),
        'avatar_url', joining_user_profile.avatar_url
      ),
      'timestamp', NOW()
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on canvas_collaborators table
DROP TRIGGER IF EXISTS trigger_notify_canvas_owner_on_new_collaborator ON public.canvas_collaborators;

CREATE TRIGGER trigger_notify_canvas_owner_on_new_collaborator
  AFTER INSERT ON public.canvas_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION notify_canvas_owner_of_new_collaborator();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION notify_canvas_owner_of_new_collaborator() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION notify_canvas_owner_of_new_collaborator() IS 
'Sends a real-time notification to canvas owners when new collaborators join their canvas';

COMMENT ON TRIGGER trigger_notify_canvas_owner_on_new_collaborator ON public.canvas_collaborators IS 
'Triggers notification to canvas owner when a new collaborator is added';
