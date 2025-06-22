/**
 * Storage cleanup utility to fix quota exceeded errors
 */

export const StorageCleanup = {
  /**
   * Clear all localStorage data for the app
   */
  clearAllStorage() {
    try {
      console.log('Clearing all localStorage data...');
      
      // Get all keys
      const keys = Object.keys(localStorage);
      let totalSize = 0;
      
      // Calculate current size
      keys.forEach(key => {
        totalSize += localStorage.getItem(key).length;
      });
      
      console.log(`Total localStorage size: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`Found ${keys.length} items in localStorage`);
      
      // Clear everything
      localStorage.clear();
      
      console.log('✅ All localStorage data cleared');
      
      // Reload the page to start fresh
      window.location.reload();
      
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  /**
   * Clear only canvas-related data
   */
  clearCanvasData() {
    try {
      console.log('Clearing canvas-related localStorage data...');
      
      const keys = Object.keys(localStorage);
      let removedCount = 0;
      
      keys.forEach(key => {
        if (key.startsWith('elements_') || 
            key.startsWith('canvas_') || 
            key.startsWith('fabric_')) {
          localStorage.removeItem(key);
          removedCount++;
          console.log(`Removed: ${key}`);
        }
      });
      
      console.log(`✅ Removed ${removedCount} canvas-related items`);
      
    } catch (error) {
      console.error('Error clearing canvas data:', error);
    }
  },

  /**
   * Show current storage usage
   */
  showStorageInfo() {
    try {
      const keys = Object.keys(localStorage);
      let totalSize = 0;
      const itemSizes = [];
      
      keys.forEach(key => {
        const size = localStorage.getItem(key).length;
        totalSize += size;
        itemSizes.push({
          key,
          size,
          sizeKB: (size / 1024).toFixed(2)
        });
      });
      
      // Sort by size descending
      itemSizes.sort((a, b) => b.size - a.size);
      
      console.log(`Total localStorage usage: ${(totalSize / 1024).toFixed(2)} KB`);
      console.log(`Total items: ${keys.length}`);
      console.log('\nLargest items:');
      
      itemSizes.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.key}: ${item.sizeKB} KB`);
      });
      
      return {
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalItems: keys.length,
        items: itemSizes
      };
      
    } catch (error) {
      console.error('Error getting storage info:', error);
      return null;
    }
  }
};

// Make it available globally for debugging
window.StorageCleanup = StorageCleanup;

export default StorageCleanup;
