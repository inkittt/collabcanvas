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

-- Verify policies
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
    tablename = 'canvas_collaborators'; 