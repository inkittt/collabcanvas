// Debug script for undo/redo database persistence issues
// Run this in your browser console when on the canvas page

console.log('🔍 DEBUGGING UNDO/REDO DATABASE PERSISTENCE');
console.log('=' .repeat(60));

// Test configuration
const TEST_CONFIG = {
  canvasId: window.location.pathname.split('/').pop(),
  testDelay: 2000 // 2 seconds between operations
};

console.log('📋 Canvas ID:', TEST_CONFIG.canvasId);

// Helper function to get current canvas state
function getCurrentCanvasState() {
  if (!window.fabricCanvasRef?.current) {
    console.log('❌ Canvas not available');
    return null;
  }
  
  const canvas = window.fabricCanvasRef.current;
  const objects = canvas.getObjects();
  
  console.log('🎨 Current Canvas State:');
  objects.forEach((obj, index) => {
    console.log(`  ${index + 1}. ID: ${obj.id}, Type: ${obj.type}, Position: (${obj.left}, ${obj.top})`);
  });
  
  return {
    objectCount: objects.length,
    objects: objects.map(obj => ({
      id: obj.id,
      type: obj.type,
      left: obj.left,
      top: obj.top,
      width: obj.width,
      height: obj.height
    }))
  };
}

// Helper function to get database state
async function getDatabaseState() {
  if (!window.ElementService) {
    console.log('❌ ElementService not available');
    return null;
  }
  
  try {
    const elements = await window.ElementService.getCanvasElements(TEST_CONFIG.canvasId);
    
    console.log('📋 Current Database State:');
    elements.forEach((el, index) => {
      const data = el.data;
      console.log(`  ${index + 1}. ID: ${el.id}, Type: ${el.element_type}, Position: (${data.left}, ${data.top}), Version: ${data._version}`);
    });
    
    return {
      elementCount: elements.length,
      elements: elements.map(el => ({
        id: el.id,
        type: el.element_type,
        left: el.data.left,
        top: el.data.top,
        version: el.data._version,
        lastEditTime: el.data._lastEditTime,
        updatedBy: el.data._updatedBy
      }))
    };
  } catch (error) {
    console.error('❌ Error getting database state:', error);
    return null;
  }
}

// Helper function to compare canvas and database states
function compareStates(canvasState, dbState) {
  if (!canvasState || !dbState) {
    console.log('❌ Cannot compare states - one is null');
    return;
  }
  
  console.log('🔍 COMPARING CANVAS vs DATABASE:');
  console.log(`   Canvas objects: ${canvasState.objectCount}`);
  console.log(`   Database elements: ${dbState.elementCount}`);
  
  // Check for mismatches
  const canvasIds = new Set(canvasState.objects.map(obj => obj.id));
  const dbIds = new Set(dbState.elements.map(el => el.id));
  
  // Elements in canvas but not in database
  const missingInDb = canvasState.objects.filter(obj => !dbIds.has(obj.id));
  if (missingInDb.length > 0) {
    console.log('⚠️ Elements in canvas but NOT in database:');
    missingInDb.forEach(obj => console.log(`   - ${obj.id} (${obj.type})`));
  }
  
  // Elements in database but not in canvas
  const missingInCanvas = dbState.elements.filter(el => !canvasIds.has(el.id));
  if (missingInCanvas.length > 0) {
    console.log('⚠️ Elements in database but NOT in canvas:');
    missingInCanvas.forEach(el => console.log(`   - ${el.id} (${el.type})`));
  }
  
  // Position mismatches
  const positionMismatches = [];
  canvasState.objects.forEach(canvasObj => {
    const dbElement = dbState.elements.find(el => el.id === canvasObj.id);
    if (dbElement) {
      const leftDiff = Math.abs(canvasObj.left - dbElement.left);
      const topDiff = Math.abs(canvasObj.top - dbElement.top);
      
      if (leftDiff > 0.1 || topDiff > 0.1) {
        positionMismatches.push({
          id: canvasObj.id,
          canvas: { left: canvasObj.left, top: canvasObj.top },
          database: { left: dbElement.left, top: dbElement.top },
          diff: { left: leftDiff, top: topDiff }
        });
      }
    }
  });
  
  if (positionMismatches.length > 0) {
    console.log('⚠️ Position mismatches found:');
    positionMismatches.forEach(mismatch => {
      console.log(`   - ${mismatch.id}:`);
      console.log(`     Canvas: (${mismatch.canvas.left}, ${mismatch.canvas.top})`);
      console.log(`     Database: (${mismatch.database.left}, ${mismatch.database.top})`);
      console.log(`     Difference: (${mismatch.diff.left}, ${mismatch.diff.top})`);
    });
  } else {
    console.log('✅ All positions match between canvas and database');
  }
}

// Main test function
async function testUndoRedoPersistence() {
  console.log('\n🧪 STARTING UNDO/REDO PERSISTENCE TEST');
  console.log('-'.repeat(50));
  
  // Step 1: Get initial state
  console.log('\n📸 Step 1: Capturing initial state...');
  const initialCanvasState = getCurrentCanvasState();
  const initialDbState = await getDatabaseState();
  
  if (!initialCanvasState || !initialDbState) {
    console.log('❌ Cannot proceed - initial state capture failed');
    return;
  }
  
  compareStates(initialCanvasState, initialDbState);
  
  // Step 2: Move an element if available
  if (initialCanvasState.objectCount === 0) {
    console.log('❌ No elements on canvas to test with');
    return;
  }
  
  console.log('\n🎯 Step 2: Moving first element...');
  const canvas = window.fabricCanvasRef.current;
  const firstObject = canvas.getObjects()[0];
  const originalPosition = { left: firstObject.left, top: firstObject.top };
  
  // Move element
  firstObject.set({
    left: originalPosition.left + 100,
    top: originalPosition.top + 50
  });
  canvas.renderAll();
  
  console.log(`   Moved element ${firstObject.id} from (${originalPosition.left}, ${originalPosition.top}) to (${firstObject.left}, ${firstObject.top})`);
  
  // Wait for any auto-save
  await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
  
  // Step 3: Check state after move
  console.log('\n📸 Step 3: Checking state after move...');
  const afterMoveCanvasState = getCurrentCanvasState();
  const afterMoveDbState = await getDatabaseState();
  compareStates(afterMoveCanvasState, afterMoveDbState);
  
  // Step 4: Perform undo
  console.log('\n↩️ Step 4: Performing UNDO...');
  
  // Check if undo function is available
  if (typeof window.handleUndo === 'function') {
    await window.handleUndo();
  } else {
    // Try to trigger undo via keyboard shortcut
    const event = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  // Wait for undo to complete
  await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.testDelay));
  
  // Step 5: Check state after undo
  console.log('\n📸 Step 5: Checking state after UNDO...');
  const afterUndoCanvasState = getCurrentCanvasState();
  const afterUndoDbState = await getDatabaseState();
  compareStates(afterUndoCanvasState, afterUndoDbState);
  
  // Step 6: Check if undo worked correctly
  console.log('\n🔍 Step 6: Analyzing UNDO results...');
  const undoObject = afterUndoCanvasState.objects.find(obj => obj.id === firstObject.id);
  if (undoObject) {
    const positionRestored = Math.abs(undoObject.left - originalPosition.left) < 0.1 && 
                            Math.abs(undoObject.top - originalPosition.top) < 0.1;
    
    if (positionRestored) {
      console.log('✅ Canvas position correctly restored by undo');
    } else {
      console.log('❌ Canvas position NOT restored by undo');
      console.log(`   Expected: (${originalPosition.left}, ${originalPosition.top})`);
      console.log(`   Actual: (${undoObject.left}, ${undoObject.top})`);
    }
  }
  
  // Check database
  const dbObject = afterUndoDbState.elements.find(el => el.id === firstObject.id);
  if (dbObject) {
    const dbPositionRestored = Math.abs(dbObject.left - originalPosition.left) < 0.1 && 
                              Math.abs(dbObject.top - originalPosition.top) < 0.1;
    
    if (dbPositionRestored) {
      console.log('✅ Database position correctly restored by undo');
    } else {
      console.log('❌ Database position NOT restored by undo');
      console.log(`   Expected: (${originalPosition.left}, ${originalPosition.top})`);
      console.log(`   Actual: (${dbObject.left}, ${dbObject.top})`);
    }
  }
  
  console.log('\n🏁 TEST COMPLETED');
  console.log('=' .repeat(60));
}

// Check if we're on a canvas page
if (TEST_CONFIG.canvasId && TEST_CONFIG.canvasId.length > 10) {
  console.log('✅ Canvas page detected, ready to run test');
  console.log('📝 To run the test, execute: testUndoRedoPersistence()');
  
  // Auto-run after a short delay
  setTimeout(() => {
    console.log('\n🚀 Auto-running test in 3 seconds...');
    setTimeout(testUndoRedoPersistence, 3000);
  }, 1000);
} else {
  console.log('❌ Not on a canvas page or invalid canvas ID');
}

// Export functions for manual testing
window.debugUndoRedo = {
  getCurrentCanvasState,
  getDatabaseState,
  compareStates,
  testUndoRedoPersistence
};
