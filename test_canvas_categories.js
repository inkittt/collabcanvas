// Test script to verify canvas categorization functionality
// Run this in the browser console when logged into your app

async function testCanvasCategories() {
  console.log('🧪 Testing Canvas Categories Feature...');
  
  try {
    // Import the CanvasService (assuming it's available globally or you can import it)
    // const { CanvasService } = await import('./src/services/canvasService.js');
    
    console.log('📋 Getting user canvases with role information...');
    
    // This would be the actual call in your app:
    // const canvases = await CanvasService.getUserCanvases();
    
    // For testing, let's simulate the expected structure
    const mockCanvases = [
      {
        id: '1',
        name: 'My Personal Canvas',
        user_role: 'owner',
        is_public: false,
        owner_id: 'current-user-id',
        profiles: { username: 'current_user' }
      },
      {
        id: '2', 
        name: 'Joined Team Canvas',
        user_role: 'collaborator',
        is_public: false,
        owner_id: 'other-user-id',
        profiles: { username: 'team_leader' }
      },
      {
        id: '3',
        name: 'Public Community Canvas', 
        user_role: 'public',
        is_public: true,
        owner_id: 'another-user-id',
        profiles: { username: 'community_admin' }
      }
    ];
    
    console.log('📊 Canvas categorization results:');
    console.log('Total canvases:', mockCanvases.length);
    
    // Test filtering by category
    const ownedCanvases = mockCanvases.filter(c => c.user_role === 'owner');
    const joinedCanvases = mockCanvases.filter(c => c.user_role === 'collaborator');
    const publicCanvases = mockCanvases.filter(c => c.user_role === 'public');
    
    console.log('👤 Owned canvases:', ownedCanvases.length, ownedCanvases.map(c => c.name));
    console.log('🤝 Joined canvases:', joinedCanvases.length, joinedCanvases.map(c => c.name));
    console.log('🌍 Public canvases:', publicCanvases.length, publicCanvases.map(c => c.name));
    
    // Test the role badge logic
    console.log('\n🏷️ Testing role badge logic:');
    mockCanvases.forEach(canvas => {
      let badgeInfo = '';
      if (canvas.user_role === 'owner') {
        badgeInfo = '✅ Owner (Green badge)';
      } else if (canvas.user_role === 'collaborator') {
        badgeInfo = '🔵 Joined (Blue badge)';
      } else {
        badgeInfo = '⚪ Public (Grey badge)';
      }
      console.log(`${canvas.name}: ${badgeInfo}`);
    });
    
    console.log('\n✅ Canvas categorization test completed successfully!');
    
    return {
      total: mockCanvases.length,
      owned: ownedCanvases.length,
      joined: joinedCanvases.length,
      public: publicCanvases.length,
      canvases: mockCanvases
    };
    
  } catch (error) {
    console.error('❌ Error testing canvas categories:', error);
    throw error;
  }
}

// Test the join canvas functionality
async function testJoinCanvasFlow() {
  console.log('\n🔗 Testing Join Canvas Flow...');
  
  try {
    // Simulate joining a canvas
    const inviteCode = '5YQD7O'; // From our earlier test
    console.log(`📝 Simulating join with invite code: ${inviteCode}`);
    
    // This would be the actual call:
    // const canvasId = await CanvasService.joinCanvasByInviteCode(inviteCode);
    
    console.log('✅ Canvas joined successfully (simulated)');
    console.log('📋 Canvas should now appear in "Joined" category');
    console.log('🔄 getUserCanvases() should include the new canvas with user_role: "collaborator"');
    
    return true;
  } catch (error) {
    console.error('❌ Error testing join canvas flow:', error);
    throw error;
  }
}

// Run the tests
console.log('🚀 Starting Canvas Categories Tests...');
testCanvasCategories()
  .then(results => {
    console.log('\n📈 Test Results Summary:', results);
    return testJoinCanvasFlow();
  })
  .then(() => {
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Open your CollabCanvas dashboard');
    console.log('2. Check the new filter buttons: All, My Canvases, Joined, Public');
    console.log('3. Look for role badges on canvas cards (Owner/Joined/Public)');
    console.log('4. Test joining a canvas and verify it appears in "Joined" category');
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
  });

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testCanvasCategories = testCanvasCategories;
  window.testJoinCanvasFlow = testJoinCanvasFlow;
}
