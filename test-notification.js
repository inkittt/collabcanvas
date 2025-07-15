// Test script to verify the notification system works
// This script simulates a user joining a canvas to test notifications

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hdbwuqvftasbmqtuyzwm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnd1cXZmdGFzYm1xdHV5endtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU1MjI5OTgsImV4cCI6MjAzMTA5ODk5OH0.Ej5zJNlZJVHAFF_Ej5zJNlZJVHAFF_Ej5zJNlZJVHAFF';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotificationSystem() {
  console.log('🧪 Testing notification system...');

  try {
    // First, let's check if we have any canvases
    const { data: canvases, error: canvasError } = await supabase
      .from('canvases')
      .select('id, name, owner_id')
      .limit(5);

    if (canvasError) {
      console.error('Error fetching canvases:', canvasError);
      return;
    }

    console.log('Available canvases:', canvases);

    if (canvases.length === 0) {
      console.log('No canvases found. Please create a canvas first.');
      return;
    }

    // Get the first canvas
    const testCanvas = canvases[0];
    console.log('Testing with canvas:', testCanvas);

    // Check if we have any users
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(5);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }

    console.log('Available profiles:', profiles);

    if (profiles.length < 2) {
      console.log('Need at least 2 users to test notifications. Please create more users.');
      return;
    }

    // Find a user who is not the canvas owner
    const joiningUser = profiles.find(p => p.id !== testCanvas.owner_id);
    
    if (!joiningUser) {
      console.log('Could not find a user who is not the canvas owner.');
      return;
    }

    console.log('Simulating user join:', joiningUser);

    // Check if this user is already a collaborator
    const { data: existingCollaborator } = await supabase
      .from('canvas_collaborators')
      .select('id')
      .eq('canvas_id', testCanvas.id)
      .eq('user_id', joiningUser.id)
      .single();

    if (existingCollaborator) {
      console.log('User is already a collaborator. Removing first...');
      await supabase
        .from('canvas_collaborators')
        .delete()
        .eq('canvas_id', testCanvas.id)
        .eq('user_id', joiningUser.id);
    }

    // Now add the user as a collaborator (this should trigger the notification)
    console.log('Adding user as collaborator...');
    const { data: newCollaborator, error: collaboratorError } = await supabase
      .from('canvas_collaborators')
      .insert({
        canvas_id: testCanvas.id,
        user_id: joiningUser.id,
        permission_level: 'viewer'
      })
      .select()
      .single();

    if (collaboratorError) {
      console.error('Error adding collaborator:', collaboratorError);
      return;
    }

    console.log('✅ Successfully added collaborator:', newCollaborator);
    console.log('🔔 Notification should have been sent to canvas owner:', testCanvas.owner_id);
    console.log('📱 Check the browser for the notification!');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testNotificationSystem();
