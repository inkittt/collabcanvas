-- Fix the RLS policy for element deletion to allow collaborative editing
-- This allows users to delete elements in canvases they have access to, not just their own elements

-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own elements" ON public.elements;

-- Create a new policy that allows deletion based on canvas access
CREATE POLICY "Users can delete elements in accessible canvases" 
  ON public.elements FOR DELETE 
  USING (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid() OR 
      is_public = true OR 
      id IN (
        SELECT canvas_id FROM public.canvas_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Also update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Users can update their own elements" ON public.elements;

CREATE POLICY "Users can update elements in accessible canvases" 
  ON public.elements FOR UPDATE 
  USING (
    canvas_id IN (
      SELECT id FROM public.canvases 
      WHERE owner_id = auth.uid() OR 
      is_public = true OR 
      id IN (
        SELECT canvas_id FROM public.canvas_collaborators 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Verify the policies are correctly applied
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'elements'
    AND cmd IN ('DELETE', 'UPDATE')
ORDER BY cmd, policyname;
