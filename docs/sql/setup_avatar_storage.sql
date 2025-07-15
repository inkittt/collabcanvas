-- Avatar Storage Setup for Supabase
-- This script sets up the storage bucket and policies for user avatars

-- Create the avatars storage bucket (if it doesn't exist)
-- Note: This needs to be done through the Supabase dashboard or CLI
-- Dashboard: Storage > Create Bucket > Name: "avatars", Public: true

-- Set up Row Level Security policies for the avatars bucket

-- Policy: Users can upload their own avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view avatars (public read access)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Create a function to clean up orphaned avatar files
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_avatars()
RETURNS void AS $$
DECLARE
  avatar_record RECORD;
  file_path TEXT;
BEGIN
  -- This function can be called periodically to clean up avatar files
  -- that are no longer referenced in any profile
  
  FOR avatar_record IN 
    SELECT name FROM storage.objects 
    WHERE bucket_id = 'avatars'
  LOOP
    -- Check if this avatar is still referenced in profiles
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE avatar_url LIKE '%' || avatar_record.name || '%'
    ) THEN
      -- Delete the orphaned file
      DELETE FROM storage.objects 
      WHERE bucket_id = 'avatars' AND name = avatar_record.name;
      
      RAISE NOTICE 'Deleted orphaned avatar: %', avatar_record.name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (optional, for manual cleanup)
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_avatars() TO authenticated;

-- Create a trigger function to automatically clean up old avatars when profile is updated
CREATE OR REPLACE FUNCTION public.cleanup_old_avatar()
RETURNS TRIGGER AS $$
DECLARE
  old_avatar_path TEXT;
BEGIN
  -- If avatar_url is being changed and old value exists
  IF OLD.avatar_url IS NOT NULL AND OLD.avatar_url != NEW.avatar_url THEN
    -- Extract the file path from the old URL
    BEGIN
      -- Parse the URL to get the file path
      old_avatar_path := substring(OLD.avatar_url from 'avatars/.*');
      
      -- Delete the old avatar file from storage
      DELETE FROM storage.objects 
      WHERE bucket_id = 'avatars' AND name = old_avatar_path;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but don't fail the update
      RAISE WARNING 'Could not delete old avatar file: %', OLD.avatar_url;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically cleanup old avatars
DROP TRIGGER IF EXISTS cleanup_old_avatar_trigger ON public.profiles;
CREATE TRIGGER cleanup_old_avatar_trigger
  AFTER UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_old_avatar();

-- Add helpful comments
COMMENT ON FUNCTION public.cleanup_orphaned_avatars() IS 'Cleans up avatar files that are no longer referenced by any profile';
COMMENT ON FUNCTION public.cleanup_old_avatar() IS 'Automatically deletes old avatar files when a profile avatar is updated';

-- Instructions for manual bucket creation:
/*
To create the avatars bucket manually in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Click "Create Bucket"
4. Name: "avatars"
5. Set as Public: Yes
6. Click "Create Bucket"

Alternatively, use the Supabase CLI:
supabase storage create avatars --public

The bucket needs to be public so that avatar URLs can be accessed without authentication.
*/

-- Verify the setup (run these queries to check if everything is working)
/*
-- Check if policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND policyname LIKE '%avatar%';

-- Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN ('cleanup_orphaned_avatars', 'cleanup_old_avatar');

-- Check if trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'cleanup_old_avatar_trigger';
*/
