const { createClient } = require('@supabase/supabase-js');

// Load Supabase credentials from environment or use fallback values
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hdbwuqvftasbmqtuyzwm.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTc3OTgsImV4cCI6MjA2MjYzMzc5OH0.0UEXzfw5YEuylbJqqG2NqIbeIjfgB49VUeEKS7tVLSk';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// SQL to fix the recursive policy
const fixSQL = `
-- Drop the problematic policy that causes recursion
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
`;

// Run the SQL to fix the policy
async function fixPolicy() {
  try {
    console.log('Fixing recursive policy in canvas_collaborators table...');
    const { error } = await supabase.rpc('pgaudit.exec_ddl', { command: fixSQL });
    
    if (error) {
      console.error('Error fixing policy:', error);
    } else {
      console.log('Policy fixed successfully!');
    }
  } catch (err) {
    console.error('Error executing SQL:', err);
  }
}

// Execute the function
fixPolicy(); 