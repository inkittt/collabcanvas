// Test script to verify canvas deletion works properly
// This script tests the bug fix for canvas deletion when elements exist

import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'https://hdbwuqvftasbmqtuyzwm.supabase.co';
const supabaseKey = 'your-anon-key-here'; // Replace with actual anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCanvasDeletion() {
  console.log('🧪 Testing Canvas Deletion Fix...');
  
  try {
    // 1. Create a test canvas
    console.log('📝 Creating test canvas...');
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .insert({
        name: 'Test Canvas for Deletion',
        description: 'This is a test canvas to verify deletion works',
        is_public: false
      })
      .select()
      .single();
    
    if (canvasError) {
      console.error('❌ Failed to create test canvas:', canvasError);
      return;
    }
    
    console.log('✅ Test canvas created:', canvas.id);
    
    // 2. Add some test elements to the canvas
    console.log('🎨 Adding test elements...');
    const testElements = [
      {
        canvas_id: canvas.id,
        element_type: 'rectangle',
        data: { width: 100, height: 50, fill: 'blue' }
      },
      {
        canvas_id: canvas.id,
        element_type: 'text',
        data: { text: 'Test Text', fontSize: 16 }
      }
    ];
    
    const { data: elements, error: elementsError } = await supabase
      .from('elements')
      .insert(testElements)
      .select();
    
    if (elementsError) {
      console.error('❌ Failed to create test elements:', elementsError);
      return;
    }
    
    console.log(`✅ ${elements.length} test elements created`);
    
    // 3. Verify elements exist
    const { data: existingElements, error: checkError } = await supabase
      .from('elements')
      .select('*')
      .eq('canvas_id', canvas.id);
    
    if (checkError) {
      console.error('❌ Failed to check elements:', checkError);
      return;
    }
    
    console.log(`📊 Found ${existingElements.length} elements in canvas`);
    
    // 4. Now try to delete the canvas (this should work with the fix)
    console.log('🗑️ Attempting to delete canvas with elements...');
    const { error: deleteError } = await supabase
      .from('canvases')
      .delete()
      .eq('id', canvas.id);
    
    if (deleteError) {
      console.error('❌ Canvas deletion failed:', deleteError);
      return;
    }
    
    console.log('✅ Canvas deleted successfully!');
    
    // 5. Verify that elements were also deleted (CASCADE)
    const { data: remainingElements, error: verifyError } = await supabase
      .from('elements')
      .select('*')
      .eq('canvas_id', canvas.id);
    
    if (verifyError) {
      console.error('❌ Failed to verify element deletion:', verifyError);
      return;
    }
    
    if (remainingElements.length === 0) {
      console.log('✅ All elements were automatically deleted via CASCADE!');
      console.log('🎉 Canvas deletion fix is working correctly!');
    } else {
      console.log(`❌ ${remainingElements.length} elements still exist - CASCADE not working`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCanvasDeletion();
