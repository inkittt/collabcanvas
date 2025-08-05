// Comprehensive test script for undo/redo database persistence fix
// Run this in your browser console when on the canvas page

console.log('🔧 UNDO/REDO DATABASE PERSISTENCE FIX TEST');
console.log('=' .repeat(60));

// Test configuration
const TEST_CONFIG = {
  canvasId: window.location.pathname.split('/').pop(),
  testDelay: 3000, // 3 seconds between operations
  positionDelta: { x: 100, y: 50 } // How much to move elements
};

console.log('📋 Canvas ID:', TEST_CONFIG.canvasId);

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get element positions from canvas
function getCanvasElementPositions() {
  if (!window.fabricCanvasRef?.current) {
    console.log('❌ Canvas not available');
    return null;
  }
  
  const canvas = window.fabricCanvasRef.current;
  const objects = canvas.getObjects();
  
  const positions = {};
  objects.forEach(obj => {
    if (obj.id) {
      positions[obj.id] = {
        left: obj.left,
        top: obj.top,
        type: obj.type
      };
    }
  });
  
  return positions;
}

// Helper function to get element positions from database
async function getDatabaseElementPositions() {
  if (!window.ElementService) {
    console.log('❌ ElementService not available');
    return null;
  }
  
  try {
    const elements = await window.ElementService.getCanvasElements(TEST_CONFIG.canvasId);
    const positions = {};
    
    elements.forEach(el => {
      positions[el.id] = {
        left: el.data.left,
        top: el.data.top,
        type: el.element_type,
        version: el.data._version,
        lastEditTime: el.data._lastEditTime,
        updatedBy: el.data._updatedBy
      };
    });
    
    return positions;
  } catch (error) {
    console.error('❌ Error getting database positions:', error);
    return null;
  }
}

// Helper function to compare positions
function comparePositions(canvasPositions, dbPositions, label) {
  console.log(`\n🔍 ${label}:`);
  
  if (!canvasPositions || !dbPositions) {
    console.log('❌ Cannot compare - missing data');
    return false;
  }
  
  const canvasIds = Object.keys(canvasPositions);
  const dbIds = Object.keys(dbPositions);
  
  console.log(`   Canvas elements: ${canvasIds.length}`);
  console.log(`   Database elements: ${dbIds.length}`);
  
  let allMatch = true;
  
  // Check each canvas element
  canvasIds.forEach(id => {
    const canvasPos = canvasPositions[id];
    const dbPos = dbPositions[id];
    
    if (!dbPos) {
      console.log(`❌ Element ${id} in canvas but NOT in database`);
      allMatch = false;
      return;
    }
    
    const leftDiff = Math.abs(canvasPos.left - dbPos.left);
    const topDiff = Math.abs(canvasPos.top - dbPos.top);
    
    if (leftDiff > 0.1 || topDiff > 0.1) {
      console.log(`❌ Position mismatch for ${id}:`);
      console.log(`     Canvas: (${canvasPos.left}, ${canvasPos.top})`);
      console.log(`     Database: (${dbPos.left}, ${dbPos.top})`);
      console.log(`     Difference: (${leftDiff}, ${topDiff})`);
      if (dbPos.updatedBy) {
        console.log(`     Last updated by: ${dbPos.updatedBy}`);
      }
      allMatch = false;
    } else {
      console.log(`✅ Element ${id} positions match`);
    }
  });
  
  // Check for database elements not in canvas
  dbIds.forEach(id => {
    if (!canvasPositions[id]) {
      console.log(`❌ Element ${id} in database but NOT in canvas`);
      allMatch = false;
    }
  });
  
  return allMatch;
}

// Main test function
async function runUndoRedoTest() {
  console.log('\n🧪 STARTING COMPREHENSIVE UNDO/REDO TEST');
  console.log('-'.repeat(50));
  
  // Check prerequisites
  if (!window.fabricCanvasRef?.current) {
    console.log('❌ Canvas not available');
    return;
  }
  
  if (!window.ElementService) {
    console.log('❌ ElementService not available');
    return;
  }
  
  if (!window.handleUndo || !window.handleRedo) {
    console.log('❌ Undo/Redo functions not available globally');
    return;
  }
  
  const canvas = window.fabricCanvasRef.current;
  const objects = canvas.getObjects();
  
  if (objects.length === 0) {
    console.log('❌ No elements on canvas to test with');
    return;
  }
  
  console.log('✅ Prerequisites met, starting test...');
  
  // Step 1: Capture initial state
  console.log('\n📸 Step 1: Capturing initial state...');
  const initialCanvasPositions = getCanvasElementPositions();
  const initialDbPositions = await getDatabaseElementPositions();
  
  const initialMatch = comparePositions(initialCanvasPositions, initialDbPositions, 'Initial State Comparison');
  
  if (!initialMatch) {
    console.log('⚠️ Initial state mismatch detected - continuing anyway...');
  }
  
  // Step 2: Move first element
  console.log('\n🎯 Step 2: Moving first element...');
  const firstObject = objects[0];
  const originalPosition = { left: firstObject.left, top: firstObject.top };
  const newPosition = {
    left: originalPosition.left + TEST_CONFIG.positionDelta.x,
    top: originalPosition.top + TEST_CONFIG.positionDelta.y
  };
  
  console.log(`   Moving element ${firstObject.id} from (${originalPosition.left}, ${originalPosition.top}) to (${newPosition.left}, ${newPosition.top})`);
  
  // Move element and trigger save
  firstObject.set(newPosition);
  canvas.renderAll();
  
  // Trigger save state (this should happen automatically, but let's be sure)
  if (window.saveCanvasState) {
    window.saveCanvasState();
  }
  
  // Wait for auto-save
  console.log('   Waiting for auto-save...');
  await wait(TEST_CONFIG.testDelay);
  
  // Step 3: Check state after move
  console.log('\n📸 Step 3: Checking state after move...');
  const afterMoveCanvasPositions = getCanvasElementPositions();
  const afterMoveDbPositions = await getDatabaseElementPositions();
  
  const moveMatch = comparePositions(afterMoveCanvasPositions, afterMoveDbPositions, 'After Move State Comparison');
  
  if (!moveMatch) {
    console.log('❌ Move was not properly saved to database!');
  }
  
  // Step 4: Perform undo
  console.log('\n↩️ Step 4: Performing UNDO...');
  await window.handleUndo();
  
  // Wait for undo to complete
  console.log('   Waiting for undo to complete...');
  await wait(TEST_CONFIG.testDelay);
  
  // Step 5: Check state after undo
  console.log('\n📸 Step 5: Checking state after UNDO...');
  const afterUndoCanvasPositions = getCanvasElementPositions();
  const afterUndoDbPositions = await getDatabaseElementPositions();
  
  const undoMatch = comparePositions(afterUndoCanvasPositions, afterUndoDbPositions, 'After Undo State Comparison');
  
  // Step 6: Verify undo worked correctly
  console.log('\n🔍 Step 6: Verifying UNDO results...');
  const undoCanvasPos = afterUndoCanvasPositions[firstObject.id];
  const undoDbPos = afterUndoDbPositions[firstObject.id];
  
  if (undoCanvasPos && undoDbPos) {
    const canvasRestored = Math.abs(undoCanvasPos.left - originalPosition.left) < 0.1 && 
                          Math.abs(undoCanvasPos.top - originalPosition.top) < 0.1;
    
    const dbRestored = Math.abs(undoDbPos.left - originalPosition.left) < 0.1 && 
                      Math.abs(undoDbPos.top - originalPosition.top) < 0.1;
    
    console.log(`   Canvas position restored: ${canvasRestored ? '✅' : '❌'}`);
    console.log(`   Database position restored: ${dbRestored ? '✅' : '❌'}`);
    
    if (dbRestored && undoDbPos.updatedBy === 'undo_redo_operation') {
      console.log('✅ Database correctly updated by undo operation');
    } else {
      console.log('❌ Database not properly updated by undo operation');
      console.log(`   Expected updatedBy: 'undo_redo_operation', got: '${undoDbPos.updatedBy}'`);
    }
  }
  
  // Step 7: Test page refresh persistence
  console.log('\n🔄 Step 7: Testing page refresh persistence...');
  console.log('   Current state should persist after refresh');
  console.log('   💡 Refresh the page now and run: window.debugUndoRedo.checkAfterRefresh()');
  
  // Step 8: Test redo
  console.log('\n↪️ Step 8: Testing REDO...');
  await window.handleRedo();
  
  // Wait for redo to complete
  console.log('   Waiting for redo to complete...');
  await wait(TEST_CONFIG.testDelay);
  
  // Step 9: Check state after redo
  console.log('\n📸 Step 9: Checking state after REDO...');
  const afterRedoCanvasPositions = getCanvasElementPositions();
  const afterRedoDbPositions = await getDatabaseElementPositions();
  
  const redoMatch = comparePositions(afterRedoCanvasPositions, afterRedoDbPositions, 'After Redo State Comparison');
  
  // Step 10: Verify redo worked correctly
  console.log('\n🔍 Step 10: Verifying REDO results...');
  const redoCanvasPos = afterRedoCanvasPositions[firstObject.id];
  const redoDbPos = afterRedoDbPositions[firstObject.id];
  
  if (redoCanvasPos && redoDbPos) {
    const canvasRestored = Math.abs(redoCanvasPos.left - newPosition.left) < 0.1 && 
                          Math.abs(redoCanvasPos.top - newPosition.top) < 0.1;
    
    const dbRestored = Math.abs(redoDbPos.left - newPosition.left) < 0.1 && 
                      Math.abs(redoDbPos.top - newPosition.top) < 0.1;
    
    console.log(`   Canvas position restored: ${canvasRestored ? '✅' : '❌'}`);
    console.log(`   Database position restored: ${dbRestored ? '✅' : '❌'}`);
    
    if (dbRestored && redoDbPos.updatedBy === 'undo_redo_operation') {
      console.log('✅ Database correctly updated by redo operation');
    } else {
      console.log('❌ Database not properly updated by redo operation');
      console.log(`   Expected updatedBy: 'undo_redo_operation', got: '${redoDbPos.updatedBy}'`);
    }
  }
  
  // Final summary
  console.log('\n🏁 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Initial state match: ${initialMatch ? '✅' : '❌'}`);
  console.log(`Move state match: ${moveMatch ? '✅' : '❌'}`);
  console.log(`Undo state match: ${undoMatch ? '✅' : '❌'}`);
  console.log(`Redo state match: ${redoMatch ? '✅' : '❌'}`);
  
  if (undoMatch && redoMatch && moveMatch) {
    console.log('\n🎉 ALL TESTS PASSED! Undo/Redo database persistence is working correctly!');
  } else {
    console.log('\n⚠️ SOME TESTS FAILED. Check the logs above for details.');
  }
}

// Function to check state after page refresh
async function checkAfterRefresh() {
  console.log('\n🔄 CHECKING STATE AFTER PAGE REFRESH');
  console.log('-'.repeat(40));
  
  const canvasPositions = getCanvasElementPositions();
  const dbPositions = await getDatabaseElementPositions();
  
  const match = comparePositions(canvasPositions, dbPositions, 'After Refresh State Comparison');
  
  if (match) {
    console.log('✅ State persisted correctly after page refresh!');
  } else {
    console.log('❌ State did not persist correctly after page refresh!');
  }
  
  return match;
}

// Export functions for manual testing
window.debugUndoRedo = {
  runUndoRedoTest,
  checkAfterRefresh,
  getCanvasElementPositions,
  getDatabaseElementPositions,
  comparePositions
};

// Auto-run test if on canvas page
if (TEST_CONFIG.canvasId && TEST_CONFIG.canvasId.length > 10) {
  console.log('✅ Canvas page detected');
  console.log('📝 To run the test, execute: window.debugUndoRedo.runUndoRedoTest()');
  
  // Auto-run after a short delay
  setTimeout(() => {
    console.log('\n🚀 Auto-running test in 3 seconds...');
    setTimeout(() => {
      runUndoRedoTest();
    }, 3000);
  }, 1000);
} else {
  console.log('❌ Not on a canvas page or invalid canvas ID');
}
