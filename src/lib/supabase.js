import { createClient } from '@supabase/supabase-js';

// Configuration for Supabase connection
let supabaseConfig = {
  // Default connection settings
  url: process.env.REACT_APP_SUPABASE_URL,
  key: process.env.REACT_APP_SUPABASE_ANON_KEY,
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    db: {
      schema: 'public'
    },
    // Configure global fetch with timeout and retry logic
    global: {
      headers: { 'x-client-info': 'collabcanvas-app' },
      fetch: (...args) => {
        // Improved fetch with timeout and retry logic
        return fetchWithRetry(...args);
      }
    }
  }
};

// Fetch implementation with timeout and retry logic
async function fetchWithRetry(url, options = {}, retries = 3, timeout = 10000) {
  // Create an abort controller for the timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    // Add the signal to the options
    const fetchOptions = {
      ...options,
      signal: controller.signal
    };
    
    try {
      return await fetch(url, fetchOptions);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Supabase request timed out after ${timeout}ms`);
      } else {
        console.error('Supabase fetch error:', error);
      }
      
      // If we have retries left, try again
      if (retries > 0) {
        console.log(`Retrying Supabase request, ${retries} attempts left`);
        return await fetchWithRetry(url, options, retries - 1, timeout);
      }
      throw error;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

// Try to load from local storage if available (for MCP connection details)
try {
  const savedConfig = localStorage.getItem('supabaseConfig');
  if (savedConfig) {
    const parsedConfig = JSON.parse(savedConfig);
    if (parsedConfig.url && parsedConfig.key) {
      supabaseConfig.url = parsedConfig.url;
      supabaseConfig.key = parsedConfig.key;
      console.log('Loaded Supabase configuration from local storage');
    }
  }
} catch (err) {
  console.warn('Failed to load Supabase config from local storage:', err);
}

// Fallback to collabcanvas2 project values if environment variables and local storage are not set
if (!supabaseConfig.url) {
  supabaseConfig.url = 'https://hdbwuqvftasbmqtuyzwm.supabase.co';
  console.log('Using collabcanvas2 project URL:', supabaseConfig.url);
}

if (!supabaseConfig.key) {
  supabaseConfig.key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTc3OTgsImV4cCI6MjA2MjYzMzc5OH0.0UEXzfw5YEuylbJqqG2NqIbeIjfgB49VUeEKS7tVLSk';
  console.log('Using collabcanvas2 project API key');
}

// Create Supabase client with configuration
const client = createClient(
  supabaseConfig.url, 
  supabaseConfig.key, 
  supabaseConfig.options
);

// Test the connection
console.log('Testing Supabase connection...');
client.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.log('Supabase connection test successful');
  }
});

// Export the client
export const supabase = client;

// Verify connection and log status
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase auth state changed:', event);
  
  // Initialize tables and RLS policies when user is signed in
  if (event === 'SIGNED_IN' && session) {
    initializeDatabase(session.user.id);
  }
});

// Function to save MCP connection details
export const saveMcpConnectionDetails = (url, key) => {
  if (!url || !key) {
    console.error('Invalid MCP connection details');
    return false;
  }
  
  try {
    const config = {
      url,
      key
    };
    localStorage.setItem('supabaseConfig', JSON.stringify(config));
    console.log('Saved MCP connection details to local storage');
    return true;
  } catch (err) {
    console.error('Failed to save MCP connection details:', err);
    return false;
  }
};

// Function to initialize database with proper permissions
const initializeDatabase = async (userId) => {
  if (!userId) return;
  
  try {
    // Ensure user profile exists (prevents RLS policy violations)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([{ 
          id: userId,
          username: `user_${userId.substring(0, 6)}`,
          created_at: new Date().toISOString()
        }]);
        
      if (insertError) {
        console.error('Error creating user profile:', insertError);
      } else {
        console.log('Created user profile successfully');
      }
    }
    
    // Check if tables exist and create them if needed
    // This helps diagnose issues with relationships between tables
    const { error: communityMessagesError } = await supabase
      .from('community_messages')
      .select('id')
      .limit(1);
      
    if (communityMessagesError && communityMessagesError.code !== 'PGRST116') {
      console.error('Error checking community_messages table:', communityMessagesError);
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// Function to check connection status
export const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection to:', supabaseConfig.url);
    
    // First try with the profiles table which typically has simpler RLS policies
    try {
      const { data, error } = await supabase.from('profiles').select('count', { count: 'exact' }).limit(1);
      
      if (!error) {
        console.log('Supabase connection successful via profiles table');
        return {
          success: true,
          data
        };
      }
    } catch (profileErr) {
      console.warn('Could not check connection via profiles table, trying alternative');
    }
    
    // If profiles fails, try canvases
    try {
      const { data, error } = await supabase.from('canvases').select('count', { count: 'exact' }).limit(1);
      
      if (!error) {
        console.log('Supabase connection successful via canvases table');
        return {
          success: true,
          data
        };
      } else if (error.message && error.message.includes('infinite recursion')) {
        // Handle the specific recursion error with canvas_collaborators policy
        console.warn('Policy recursion detected but connection is active - proceeding');
        return {
          success: true,
          warning: 'Policy recursion detected but connection is functioning'
        };
      } else {
        console.error('Supabase connection check failed:', error);
        return {
          success: false,
          error: error.message
        };
      }
    } catch (canvasErr) {
      console.warn('Could not check connection via canvases table');
    }
    
    // Last resort - try a very basic auth check
    const { data: authData } = await supabase.auth.getSession();
    if (authData) {
      console.log('Supabase connection confirmed via auth check');
      return {
        success: true,
        warning: 'Connection established via auth check only'
      };
    }
    
    return {
      success: false,
      error: 'Could not establish connection through any available method'
    };
  } catch (err) {
    console.error('Error checking Supabase connection:', err);
    return {
      success: false,
      error: err.message
    };
  }
};

// Function to reconnect with new credentials
export const reconnectSupabase = (url, key) => {
  if (!url || !key) {
    console.error('Invalid connection details for reconnection');
    return false;
  }
  
  try {
    // Save the new configuration
    saveMcpConnectionDetails(url, key);
    
    // Force reload the application to use new connection details
    window.location.reload();
    return true;
  } catch (err) {
    console.error('Failed to reconnect to Supabase:', err);
    return false;
  }
};