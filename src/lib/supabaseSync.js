import { supabase } from './supabase';
import { ElementService } from '../services/elementService';
import { CanvasService } from '../services/canvasService';

/**
 * Utility functions for ensuring proper sync between Supabase and localStorage
 */
const SupabaseSync = {
  /**
   * Check for pending elements that need to be synced to Supabase
   */
  async syncPendingElements() {
    try {
      // Check if there are any pending elements to sync
      const keys = Object.keys(localStorage);
      const pendingKeysPattern = /^pendingElements_/;
      const pendingKeys = keys.filter(key => pendingKeysPattern.test(key));
      
      if (pendingKeys.length === 0) {
        console.log('No pending elements to sync');
        return;
      }
      
      console.log(`Found ${pendingKeys.length} canvases with pending elements`);
      
      // Check if we're connected before attempting to sync
      const { data } = await supabase.from('system').select('version').limit(1);
      if (!data) {
        console.warn('Not connected to Supabase, will try syncing later');
        return;
      }
      
      // Process each canvas's pending elements
      for (const key of pendingKeys) {
        const canvasId = key.replace('pendingElements_', '');
        const pendingElements = JSON.parse(localStorage.getItem(key) || '[]');
        
        if (pendingElements.length === 0) {
          localStorage.removeItem(key);
          continue;
        }
        
        console.log(`Syncing ${pendingElements.length} elements for canvas ${canvasId}`);
        
        // Attempt to save each element
        const remainingElements = [];
        
        for (const element of pendingElements) {
          try {
            const { error } = await supabase
              .from('elements')
              .upsert(element, { onConflict: 'id' });
              
            if (error) {
              console.error('Failed to sync element:', error);
              remainingElements.push(element);
            } else {
              console.log(`✅ Synced element ${element.id}`);
            }
          } catch (error) {
            console.error('Error during element sync:', error);
            remainingElements.push(element);
          }
        }
        
        if (remainingElements.length > 0) {
          localStorage.setItem(key, JSON.stringify(remainingElements));
          console.warn(`${remainingElements.length} elements still need syncing`);
        } else {
          localStorage.removeItem(key);
          console.log('All elements synced successfully!');
        }
      }
    } catch (error) {
      console.error('Error in syncPendingElements:', error);
    }
  },
  
  /**
   * Sync pending canvases that need to be synced to Supabase
   */
  async syncPendingCanvases() {
    try {
      const pendingSyncs = JSON.parse(localStorage.getItem('pendingCanvasSyncs') || '[]');
      if (pendingSyncs.length === 0) {
        console.log('No pending canvases to sync');
        return;
      }
      
      console.log(`Found ${pendingSyncs.length} pending canvases to sync`);
      
      // Check if we're connected before attempting to sync
      try {
        const { error: testError } = await supabase.from('profiles').select('id').limit(1);
        if (testError) {
          console.warn('Not connected to Supabase, will try syncing canvases later');
          return;
        }
      } catch (testError) {
        console.warn('Supabase connection test exception, skipping canvas sync:', testError);
        return;
      }
      
      // Use the CanvasService's method to sync the canvases
      await CanvasService._syncPendingCanvasesToDatabase();
    } catch (error) {
      console.error('Error in syncPendingCanvases:', error);
    }
  },
  
  /**
   * Run a comprehensive sync of all local data
   */
  async performFullSync() {
    console.log('Starting full sync process...');
    await this.syncPendingCanvases();
    await this.syncPendingElements();
    console.log('Full sync completed');
  },
  
  /**
   * Setup periodic background sync
   */
  setupBackgroundSync(intervalMs = 30000) {
    console.log(`Setting up background sync at ${intervalMs}ms intervals`);
    
    // Perform initial sync
    this.syncPendingCanvases();
    this.syncPendingElements();
    
    // Setup interval
    const intervalId = setInterval(() => {
      this.syncPendingCanvases();
      this.syncPendingElements();
    }, intervalMs);
    
    return {
      stop: () => {
        clearInterval(intervalId);
        console.log('Background sync stopped');
      }
    };
  }
};

export default SupabaseSync;
