const https = require('https');

// Supabase project details
const supabaseUrl = 'hdbwuqvftasbmqtuyzwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTc3OTgsImV4cCI6MjA2MjYzMzc5OH0.0UEXzfw5YEuylbJqqG2NqIbeIjfgB49VUeEKS7tVLSk';

// Hardcoded fix query (simplified for REST API)
const fixQuery = `
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
  );`;

// Create a frontend-friendly auth bypass
function createAuthBypass() {
  console.log('Creating a simple auth bypass for frontend development...');
  
  // Create a file with HTML that will authenticate directly
  const fs = require('fs');
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Supabase Auth Fix</title>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
  <h1>CollabCanvas Policy Fix</h1>
  <div id="status">Connecting to Supabase...</div>
  <script>
    const supabaseUrl = 'https://${supabaseUrl}';
    const supabaseKey = '${supabaseKey}';
    const supabase = supabase.createClient(supabaseUrl, supabaseKey);
    
    // Create a test user for development
    async function createTestUser() {
      document.getElementById('status').textContent = 'Creating test user...';
      
      const { data, error } = await supabase.auth.signUp({
        email: 'test_user_' + Math.floor(Math.random() * 10000) + '@example.com',
        password: 'Password123!',
      });
      
      if (error) {
        document.getElementById('status').textContent = 'Error creating user: ' + error.message;
        return null;
      }
      
      document.getElementById('status').textContent = 'Test user created successfully!';
      console.log('User created:', data);
      return data;
    }
    
    // Fix the policy
    async function fixPolicy() {
      document.getElementById('status').textContent = 'Fixing policy...';
      
      // We can't execute SQL directly from the browser, 
      // but we can create a user that doesn't trigger the recursion
      
      document.getElementById('status').textContent = 'Policy fix must be run on the server. User creation completed.';
    }
    
    // Run the process
    async function run() {
      const user = await createTestUser();
      if (user) {
        await fixPolicy();
      }
    }
    
    run();
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync('supabase-auth-fix.html', html);
  console.log('Created supabase-auth-fix.html - open this file in a browser to create a test user');
}

// Create the auth bypass file
createAuthBypass();

console.log('\nTo fix the policy issue:');
console.log('1. Go to the Supabase Dashboard: https://app.supabase.com');
console.log('2. Navigate to your project');
console.log('3. Go to the SQL Editor section');
console.log('4. Paste and run this SQL:');
console.log('\n-------------------------------------------');
console.log(`
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
`);
console.log('-------------------------------------------\n');
console.log('5. Restart your application using `npm start`');
console.log('\nAlternatively, open the supabase-auth-fix.html file in a browser to create a test user'); 