// Final comprehensive test for undo/redo functionality
// Run this in your browser console when on the canvas page

console.log('🧪 FINAL UNDO/REDO TEST - Testing Database Persistence');
console.log('=' .repeat(60));

// Test configuration
const TEST_CONFIG = {
  canvasId: 'efdaf683-b1e7-412b-ad9b-ffd43948d1f2', // Your current canvas
  elementId: '4112cdad-df14-434b-826c-b2ca696a5ea2', // Your current element
  originalPosition: { left: 346.1999988555908, top: 227.39999389648438 },
  testPosition: { left: 100, top: 100 }
};

// Helper function to check element position in database
async function checkElementInDatabase(elementId) {
  try {
    const { data, error } = await supabase
      .from('elements')
      .select('id, data')
      .eq('id', elementId)
      .single();
    
    if (error) {
      console.error('❌ Error getting element from database:', error);
      return null;
    }
    
    return {
      id: data.id,
      left: data.data.left,
      top: data.data.top,
      version: data.data._version
    };
  } catch (error) {
    console.error('❌ Exception getting element:', error);
    return null;
  }
}

// Helper function to check element position in canvas
function checkElementInCanvas(elementId) {
  if (!window.fabricCanvasRef || !window.fabricCanvasRef.current) {
    console.log('❌ Canvas not available');
    return null;
  }
  
  const canvas = window.fabricCanvasRef.current;
  const objects = canvas.getObjects();
  const element = objects.find(obj => obj.id === elementId);
  
  if (!element) {
    console.log('❌ Element not found in canvas');
    return null;
  }
  
  return {
    id: element.id,
    left: element.left,
    top: element.top,
    type: element.type
  };
}

// Test function to simulate element movement
async function simulateElementMovement() {
  console.log('\n🎯 Step 1: Simulating element movement...');
  
  const canvasElement = checkElementInCanvas(TEST_CONFIG.elementId);
  const dbElement = await checkElementInDatabase(TEST_CONFIG.elementId);
  
  console.log('Canvas element:', canvasElement);
  console.log('Database element:', dbElement);
  
  if (!canvasElement || !dbElement) {
    console.log('❌ Cannot proceed - element not found');
    return false;
  }
  
  // Move element in canvas
  if (window.fabricCanvasRef && window.fabricCanvasRef.current) {
    const canvas = window.fabricCanvasRef.current;
    const objects = canvas.getObjects();
    const element = objects.find(obj => obj.id === TEST_CONFIG.elementId);
    
    if (element) {
      console.log('📍 Moving element from', element.left, element.top, 'to', TEST_CONFIG.testPosition.left, TEST_CONFIG.testPosition.top);
      element.set({
        left: TEST_CONFIG.testPosition.left,
        top: TEST_CONFIG.testPosition.top
      });
      canvas.renderAll();
      console.log('✅ Element moved in canvas');
      return true;
    }
  }
  
  return false;
}

// Test function to trigger undo
async function testUndo() {
  console.log('\n⏪ Step 2: Testing undo operation...');
  
  // Check if undo function is available
  if (typeof window.handleUndo === 'function') {
    console.log('🔄 Calling handleUndo...');
    await window.handleUndo();
  } else {
    console.log('⚠️ handleUndo not available globally, trying to trigger via button click');
    
    // Try to find and click undo button
    const undoButton = document.querySelector('[title="Undo"]');
    if (undoButton) {
      console.log('🔄 Clicking undo button...');
      undoButton.click();
    } else {
      console.log('❌ Undo button not found');
      return false;
    }
  }
  
  // Wait a moment for the operation to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check results
  const canvasElement = checkElementInCanvas(TEST_CONFIG.elementId);
  const dbElement = await checkElementInDatabase(TEST_CONFIG.elementId);
  
  console.log('After undo:');
  console.log('Canvas element:', canvasElement);
  console.log('Database element:', dbElement);
  
  // Check if positions match expected values
  if (canvasElement && dbElement) {
    const canvasMatches = Math.abs(canvasElement.left - TEST_CONFIG.originalPosition.left) < 1 &&
                         Math.abs(canvasElement.top - TEST_CONFIG.originalPosition.top) < 1;
    const dbMatches = Math.abs(dbElement.left - TEST_CONFIG.originalPosition.left) < 1 &&
                     Math.abs(dbElement.top - TEST_CONFIG.originalPosition.top) < 1;
    
    console.log('Canvas position correct:', canvasMatches ? '✅' : '❌');
    console.log('Database position correct:', dbMatches ? '✅' : '❌');
    
    return canvasMatches && dbMatches;
  }
  
  return false;
}

// Test function to simulate page refresh
async function testPageRefresh() {
  console.log('\n🔄 Step 3: Simulating page refresh...');
  console.log('💡 You need to manually refresh the page (F5) and then run checkAfterRefresh()');
  
  // Store test data for after refresh
  localStorage.setItem('undoRedoTest', JSON.stringify({
    elementId: TEST_CONFIG.elementId,
    expectedPosition: TEST_CONFIG.originalPosition,
    testTime: new Date().toISOString()
  }));
  
  console.log('📝 Test data stored in localStorage');
  console.log('🔄 Please refresh the page now and then run: window.checkAfterRefresh()');
}

// Function to check results after page refresh
async function checkAfterRefresh() {
  console.log('\n🔍 Checking results after page refresh...');
  
  const testData = localStorage.getItem('undoRedoTest');
  if (!testData) {
    console.log('❌ No test data found');
    return false;
  }
  
  const { elementId, expectedPosition } = JSON.parse(testData);
  
  // Wait for canvas to load
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const canvasElement = checkElementInCanvas(elementId);
  const dbElement = await checkElementInDatabase(elementId);
  
  console.log('After refresh:');
  console.log('Canvas element:', canvasElement);
  console.log('Database element:', dbElement);
  console.log('Expected position:', expectedPosition);
  
  if (canvasElement && dbElement) {
    const canvasMatches = Math.abs(canvasElement.left - expectedPosition.left) < 1 &&
                         Math.abs(canvasElement.top - expectedPosition.top) < 1;
    const dbMatches = Math.abs(dbElement.left - expectedPosition.left) < 1 &&
                     Math.abs(dbElement.top - expectedPosition.top) < 1;
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('Canvas position persisted:', canvasMatches ? '✅ PASS' : '❌ FAIL');
    console.log('Database position persisted:', dbMatches ? '✅ PASS' : '❌ FAIL');
    
    if (canvasMatches && dbMatches) {
      console.log('🎉 SUCCESS! Undo/redo with database persistence is working!');
      localStorage.removeItem('undoRedoTest');
      return true;
    } else {
      console.log('❌ FAILURE! Undo/redo persistence is not working correctly.');
      return false;
    }
  }
  
  console.log('❌ Could not verify results - elements not found');
  return false;
}

// Main test function
async function runCompleteUndoRedoTest() {
  console.log('🚀 Starting complete undo/redo test...');
  
  try {
    // Step 1: Move element
    const moveSuccess = await simulateElementMovement();
    if (!moveSuccess) {
      console.log('❌ Test failed at movement step');
      return;
    }
    
    // Step 2: Test undo
    const undoSuccess = await testUndo();
    if (!undoSuccess) {
      console.log('❌ Test failed at undo step');
      return;
    }
    
    // Step 3: Prepare for refresh test
    await testPageRefresh();
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Quick test function for just checking current state
async function quickCheck() {
  console.log('🔍 Quick check of current element state...');
  
  const canvasElement = checkElementInCanvas(TEST_CONFIG.elementId);
  const dbElement = await checkElementInDatabase(TEST_CONFIG.elementId);
  
  console.log('Canvas element:', canvasElement);
  console.log('Database element:', dbElement);
  
  if (canvasElement && dbElement) {
    const positionsMatch = Math.abs(canvasElement.left - dbElement.left) < 1 &&
                          Math.abs(canvasElement.top - dbElement.top) < 1;
    console.log('Positions match:', positionsMatch ? '✅' : '❌');
  }
}

// Export functions to global scope
window.runCompleteUndoRedoTest = runCompleteUndoRedoTest;
window.checkAfterRefresh = checkAfterRefresh;
window.quickCheck = quickCheck;
window.simulateElementMovement = simulateElementMovement;
window.testUndo = testUndo;

console.log('\n🔧 Test functions loaded:');
console.log('- window.runCompleteUndoRedoTest() - Run full test');
console.log('- window.quickCheck() - Check current state');
console.log('- window.checkAfterRefresh() - Check after page refresh');
console.log('\n💡 Start with: window.runCompleteUndoRedoTest()');
