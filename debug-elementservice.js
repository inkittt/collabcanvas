// Debug script to check ElementService availability and functionality
// Run this in browser console on your canvas page

console.log('🔍 DEBUGGING ELEMENTSERVICE AVAILABILITY');
console.log('=' .repeat(50));

// Check if ElementService is available
function checkElementService() {
  console.log('\n1. Checking ElementService availability...');
  
  if (typeof ElementService !== 'undefined') {
    console.log('✅ ElementService is available globally');
    console.log('Methods:', Object.keys(ElementService));
    return true;
  } else if (typeof window.ElementService !== 'undefined') {
    console.log('✅ ElementService is available on window');
    console.log('Methods:', Object.keys(window.ElementService));
    return true;
  } else {
    console.log('❌ ElementService not found globally');
    
    // Try to find it in modules
    console.log('🔍 Checking for ElementService in modules...');
    
    // Check if it's available through import
    try {
      // This might work if the module is already loaded
      const modules = Object.keys(window).filter(key => key.includes('Element') || key.includes('Service'));
      console.log('Found potential modules:', modules);
    } catch (error) {
      console.log('No modules found');
    }
    
    return false;
  }
}

// Check canvas and fabric availability
function checkCanvasAvailability() {
  console.log('\n2. Checking canvas availability...');
  
  if (typeof fabricCanvasRef !== 'undefined' && fabricCanvasRef.current) {
    console.log('✅ fabricCanvasRef is available');
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    console.log('Canvas objects:', objects.length);
    objects.forEach((obj, index) => {
      console.log(`  Object ${index}: id=${obj.id}, type=${obj.type}, pos=(${obj.left}, ${obj.top})`);
    });
    return true;
  } else if (typeof window.fabricCanvasRef !== 'undefined' && window.fabricCanvasRef.current) {
    console.log('✅ fabricCanvasRef is available on window');
    const canvas = window.fabricCanvasRef.current;
    const objects = canvas.getObjects();
    console.log('Canvas objects:', objects.length);
    return true;
  } else {
    console.log('❌ fabricCanvasRef not found');
    return false;
  }
}

// Check supabase availability
function checkSupabaseAvailability() {
  console.log('\n3. Checking Supabase availability...');
  
  if (typeof supabase !== 'undefined') {
    console.log('✅ supabase is available globally');
    return true;
  } else if (typeof window.supabase !== 'undefined') {
    console.log('✅ supabase is available on window');
    return true;
  } else {
    console.log('❌ supabase not found');
    return false;
  }
}

// Test direct database access
async function testDirectDatabaseAccess() {
  console.log('\n4. Testing direct database access...');
  
  const supabaseClient = typeof supabase !== 'undefined' ? supabase : window.supabase;
  
  if (!supabaseClient) {
    console.log('❌ Cannot test - supabase not available');
    return false;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('elements')
      .select('id, canvas_id, element_type, data')
      .limit(1);
    
    if (error) {
      console.log('❌ Database query failed:', error);
      return false;
    }
    
    console.log('✅ Database access working');
    console.log('Sample element:', data[0]);
    return true;
  } catch (error) {
    console.log('❌ Database access failed:', error);
    return false;
  }
}

// Test element update directly
async function testDirectElementUpdate() {
  console.log('\n5. Testing direct element update...');
  
  const supabaseClient = typeof supabase !== 'undefined' ? supabase : window.supabase;
  
  if (!supabaseClient) {
    console.log('❌ Cannot test - supabase not available');
    return false;
  }
  
  try {
    // Get an element first
    const { data: elements, error: getError } = await supabaseClient
      .from('elements')
      .select('*')
      .limit(1);
    
    if (getError || !elements || elements.length === 0) {
      console.log('❌ No elements found to test with');
      return false;
    }
    
    const element = elements[0];
    console.log('Testing with element:', element.id);
    
    // Update the element
    const newPosition = {
      left: Math.random() * 400,
      top: Math.random() * 300
    };
    
    const { data, error } = await supabaseClient
      .from('elements')
      .update({
        data: {
          ...element.data,
          left: newPosition.left,
          top: newPosition.top,
          _version: (element.data._version || 0) + 1,
          _lastEditTime: new Date().toISOString()
        }
      })
      .eq('id', element.id)
      .select();
    
    if (error) {
      console.log('❌ Element update failed:', error);
      return false;
    }
    
    console.log('✅ Element update successful');
    console.log('New position:', newPosition);
    console.log('Updated element:', data[0]);
    return true;
    
  } catch (error) {
    console.log('❌ Element update failed:', error);
    return false;
  }
}

// Check undo/redo functions
function checkUndoRedoFunctions() {
  console.log('\n6. Checking undo/redo functions...');
  
  const functions = ['handleUndo', 'handleRedo', 'saveCanvasState'];
  let found = 0;
  
  functions.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
      console.log(`✅ ${funcName} is available globally`);
      found++;
    } else {
      console.log(`❌ ${funcName} not found globally`);
    }
  });
  
  // Check for undo/redo buttons
  const undoButton = document.querySelector('[title="Undo"]');
  const redoButton = document.querySelector('[title="Redo"]');
  
  console.log('Undo button found:', undoButton ? '✅' : '❌');
  console.log('Redo button found:', redoButton ? '✅' : '❌');
  
  return found > 0;
}

// Main diagnostic function
async function runDiagnostics() {
  console.log('🚀 Running complete diagnostics...');
  
  const results = {
    elementService: checkElementService(),
    canvas: checkCanvasAvailability(),
    supabase: checkSupabaseAvailability(),
    undoRedo: checkUndoRedoFunctions()
  };
  
  if (results.supabase) {
    results.databaseAccess = await testDirectDatabaseAccess();
    results.elementUpdate = await testDirectElementUpdate();
  }
  
  console.log('\n📊 DIAGNOSTIC RESULTS:');
  console.log('=' .repeat(30));
  Object.entries(results).forEach(([key, value]) => {
    console.log(`${key}: ${value ? '✅ PASS' : '❌ FAIL'}`);
  });
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (!results.elementService) {
    console.log('- ElementService not available - check if module is imported correctly');
  }
  if (!results.canvas) {
    console.log('- Canvas not available - make sure you are on the canvas page');
  }
  if (!results.supabase) {
    console.log('- Supabase not available - check connection');
  }
  if (!results.undoRedo) {
    console.log('- Undo/redo functions not available - check component state');
  }
  
  return results;
}

// Export to global scope
window.runDiagnostics = runDiagnostics;
window.checkElementService = checkElementService;
window.testDirectElementUpdate = testDirectElementUpdate;

console.log('\n🔧 Diagnostic functions loaded:');
console.log('- window.runDiagnostics() - Run all diagnostics');
console.log('- window.checkElementService() - Check ElementService');
console.log('- window.testDirectElementUpdate() - Test database update');
console.log('\n💡 Start with: window.runDiagnostics()');
