// Test script to verify database operations are working
// Run this in the browser console when on your canvas page

console.log('🧪 Testing Database Operations for Undo/Redo...');

// Test function to check if ElementService is available
function checkElementService() {
  if (typeof ElementService !== 'undefined') {
    console.log('✅ ElementService is available');
    return true;
  } else {
    console.log('❌ ElementService not found. Make sure you are on the canvas page.');
    return false;
  }
}

// Test function to get canvas ID from URL
function getCanvasId() {
  const pathParts = window.location.pathname.split('/');
  const canvasId = pathParts[pathParts.length - 1];
  console.log('🎯 Canvas ID:', canvasId);
  return canvasId;
}

// Test function to check current elements in database
async function checkDatabaseElements() {
  if (!checkElementService()) return;
  
  const canvasId = getCanvasId();
  try {
    const elements = await ElementService.getCanvasElements(canvasId);
    console.log('📋 Database Elements:');
    console.table(elements.map(el => ({
      id: el.id,
      type: el.element_type,
      created: el.created_at,
      hasData: !!el.data
    })));
    return elements;
  } catch (error) {
    console.error('❌ Error getting elements:', error);
    return [];
  }
}

// Test function to check canvas objects
function checkCanvasObjects() {
  if (typeof fabricCanvasRef !== 'undefined' && fabricCanvasRef.current) {
    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();
    console.log('🎨 Canvas Objects:');
    console.table(objects.map(obj => ({
      id: obj.id,
      type: obj.type,
      hasId: !!obj.id,
      left: obj.left,
      top: obj.top
    })));
    return objects;
  } else {
    console.log('❌ Canvas not found. Make sure you are on the canvas page.');
    return [];
  }
}

// Test function to simulate undo/redo database sync
async function testDatabaseSync() {
  console.log('🔄 Testing Database Sync...');
  
  if (!checkElementService()) return;
  
  const canvasId = getCanvasId();
  const dbElements = await checkDatabaseElements();
  const canvasObjects = checkCanvasObjects();
  
  if (dbElements.length === 0 && canvasObjects.length === 0) {
    console.log('⚠️ No elements found. Add some elements to the canvas first.');
    return;
  }
  
  console.log('📊 Comparison:');
  console.log('Database elements:', dbElements.length);
  console.log('Canvas objects:', canvasObjects.length);
  
  const dbIds = new Set(dbElements.map(el => el.id));
  const canvasIds = new Set(canvasObjects.map(obj => obj.id).filter(id => id));
  
  console.log('Database IDs:', Array.from(dbIds));
  console.log('Canvas IDs:', Array.from(canvasIds));
  
  // Find mismatches
  const onlyInDb = dbElements.filter(el => !canvasIds.has(el.id));
  const onlyInCanvas = canvasObjects.filter(obj => obj.id && !dbIds.has(obj.id));
  
  if (onlyInDb.length > 0) {
    console.log('🔍 Elements only in database:', onlyInDb.map(el => el.id));
  }
  
  if (onlyInCanvas.length > 0) {
    console.log('🔍 Elements only in canvas:', onlyInCanvas.map(obj => obj.id));
  }
  
  if (onlyInDb.length === 0 && onlyInCanvas.length === 0) {
    console.log('✅ Database and canvas are in sync!');
  } else {
    console.log('⚠️ Database and canvas are out of sync');
  }
}

// Test function to manually delete an element
async function testDeleteElement() {
  if (!checkElementService()) return;
  
  const elements = await checkDatabaseElements();
  if (elements.length === 0) {
    console.log('⚠️ No elements to delete');
    return;
  }
  
  const elementToDelete = elements[0];
  console.log('🗑️ Testing delete of element:', elementToDelete.id);
  
  try {
    await ElementService.deleteElement(elementToDelete.id);
    console.log('✅ Element deleted successfully');
    
    // Check if it's really gone
    setTimeout(async () => {
      const updatedElements = await checkDatabaseElements();
      const stillExists = updatedElements.find(el => el.id === elementToDelete.id);
      if (stillExists) {
        console.log('❌ Element still exists in database!');
      } else {
        console.log('✅ Element successfully removed from database');
      }
    }, 1000);
  } catch (error) {
    console.error('❌ Error deleting element:', error);
  }
}

// Test function to check undo/redo stacks
function checkUndoRedoStacks() {
  // Try to access undo/redo stacks from React component
  // This might not work depending on how the component is structured
  console.log('🔍 Checking undo/redo stacks...');
  
  // Check if there are any global references
  if (typeof undoStack !== 'undefined') {
    console.log('📚 Undo stack length:', undoStack.length);
  } else {
    console.log('⚠️ Undo stack not accessible from global scope');
  }
  
  if (typeof redoStack !== 'undefined') {
    console.log('📚 Redo stack length:', redoStack.length);
  } else {
    console.log('⚠️ Redo stack not accessible from global scope');
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Running all database operation tests...');
  console.log('=' .repeat(50));
  
  console.log('\n1. Checking ElementService...');
  checkElementService();
  
  console.log('\n2. Getting Canvas ID...');
  getCanvasId();
  
  console.log('\n3. Checking database elements...');
  await checkDatabaseElements();
  
  console.log('\n4. Checking canvas objects...');
  checkCanvasObjects();
  
  console.log('\n5. Testing database sync logic...');
  await testDatabaseSync();
  
  console.log('\n6. Checking undo/redo stacks...');
  checkUndoRedoStacks();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All tests completed. Check the logs above for issues.');
}

// Export functions for manual testing
window.testDatabaseOps = {
  runAllTests,
  checkDatabaseElements,
  checkCanvasObjects,
  testDatabaseSync,
  testDeleteElement,
  checkUndoRedoStacks
};

console.log('🔧 Test functions loaded. Run window.testDatabaseOps.runAllTests() to start.');
console.log('📋 Available functions:');
console.log('- window.testDatabaseOps.runAllTests()');
console.log('- window.testDatabaseOps.checkDatabaseElements()');
console.log('- window.testDatabaseOps.checkCanvasObjects()');
console.log('- window.testDatabaseOps.testDatabaseSync()');
console.log('- window.testDatabaseOps.testDeleteElement()');
console.log('- window.testDatabaseOps.checkUndoRedoStacks()');
