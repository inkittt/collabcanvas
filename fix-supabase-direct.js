const { createClient } = require('@supabase/supabase-js');

// Load Supabase credentials from environment or use fallback values
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hdbwuqvftasbmqtuyzwm.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTc3OTgsImV4cCI6MjA2MjYzMzc5OH0.0UEXzfw5YEuylbJqqG2NqIbeIjfgB49VUeEKS7tVLSk';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to check if tables exist
async function checkTables() {
  try {
    console.log('Checking Supabase tables...');
    
    // Test if we can access the profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    console.log('Profiles table access:', profilesError ? 'Error' : 'Success');
    if (profilesError) console.error('Profiles error:', profilesError);
    
    // Test if we can access the canvases table
    const { data: canvases, error: canvasesError } = await supabase
      .from('canvases')
      .select('*')
      .limit(1);
    
    console.log('Canvases table access:', canvasesError ? 'Error' : 'Success');
    if (canvasesError) console.error('Canvases error:', canvasesError);
    
    // Test if we can access the canvas_collaborators table
    const { data: collaborators, error: collaboratorsError } = await supabase
      .from('canvas_collaborators')
      .select('*')
      .limit(1);
    
    console.log('Canvas collaborators table access:', collaboratorsError ? 'Error' : 'Success');
    if (collaboratorsError) console.error('Collaborators error:', collaboratorsError);
    
    // Test if we can access the elements table
    const { data: elements, error: elementsError } = await supabase
      .from('elements')
      .select('*')
      .limit(1);
    
    console.log('Elements table access:', elementsError ? 'Error' : 'Success');
    if (elementsError) console.error('Elements error:', elementsError);

    // Check auth status
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('Auth session status:', sessionError ? 'Error' : (session?.session ? 'Active session' : 'No session'));
    if (sessionError) console.error('Session error:', sessionError);
    
    return {
      profiles: !profilesError,
      canvases: !canvasesError,
      collaborators: !collaboratorsError,
      elements: !elementsError,
      session: !sessionError && session?.session !== null
    };
  } catch (error) {
    console.error('Error checking tables:', error);
    return {
      profiles: false,
      canvases: false,
      collaborators: false,
      elements: false,
      session: false
    };
  }
}

// Execute diagnostics
async function runDiagnostics() {
  console.log('----- Supabase Connection Diagnostic -----');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key:', supabaseAnonKey.substring(0, 10) + '...');
  
  const tableStatus = await checkTables();
  
  console.log('\n----- Diagnostic Results -----');
  console.log('Profiles table:', tableStatus.profiles ? '✅' : '❌');
  console.log('Canvases table:', tableStatus.canvases ? '✅' : '❌');
  console.log('Canvas Collaborators table:', tableStatus.collaborators ? '✅' : '❌');
  console.log('Elements table:', tableStatus.elements ? '✅' : '❌');
  console.log('Auth Session:', tableStatus.session ? '✅' : '❌');
  
  if (Object.values(tableStatus).every(v => v)) {
    console.log('\n✅ All systems operational');
  } else {
    console.log('\n❌ Issues detected with Supabase connection or schema');
  }
}

runDiagnostics(); 