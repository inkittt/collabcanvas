import { supabase } from './supabase';

/**
 * Collection of active subscriptions to reuse and avoid duplicate subscriptions
 */
const activeSubscriptions = {};

/**
 * Setup real-time subscriptions for canvas changes
 * @param {string} canvasId - Canvas ID to subscribe to
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onElementAdded - Called when an element is added
 * @param {Function} callbacks.onElementUpdated - Called when an element is updated
 * @param {Function} callbacks.onElementDeleted - Called when an element is deleted
 * @returns {Object} - Subscription object with unsubscribe method
 */
export const subscribeToCanvas = (canvasId, callbacks) => {
  // Check if we already have a subscription for this canvas
  if (activeSubscriptions[canvasId]) {
    console.log('Using existing subscription for canvas:', canvasId);
    return activeSubscriptions[canvasId];
  }

  console.log('Setting up new real-time subscription for canvas:', canvasId);

  try {
    // Create a new subscription channel
    const channel = supabase
      .channel(`elements:canvas=${canvasId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        console.log('Real-time: New element added', payload);
        if (callbacks.onElementAdded) {
          callbacks.onElementAdded(payload.new);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        console.log('Real-time: Element updated', payload);
        console.log('Position data:', payload.new?.position);
        if (callbacks.onElementUpdated) {
          callbacks.onElementUpdated(payload.new);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        console.log('Real-time: Element deleted', payload);
        if (callbacks.onElementDeleted) {
          callbacks.onElementDeleted(payload.old.id);
        }
      });

    // Subscribe to events
    channel.subscribe((status) => {
      console.log(`Subscription for canvas ${canvasId} status:`, status);
      
      // Try to sync any pending elements if we have a successful subscription
      if (status === 'SUBSCRIBED') {
        syncPendingElements(canvasId);
      }
    });

    // Store the subscription and return it
    const subscription = {
      channel,
      unsubscribe: () => {
        console.log('Unsubscribing from canvas:', canvasId);
        channel.unsubscribe();
        delete activeSubscriptions[canvasId];
      }
    };

    activeSubscriptions[canvasId] = subscription;
    return subscription;
  } catch (error) {
    console.error('Error setting up real-time subscription:', error);
    return {
      unsubscribe: () => {} // No-op for error case
    };
  }
};

/**
 * Try to sync any pending elements for a canvas
 * @param {string} canvasId - Canvas ID 
 */
export const syncPendingElements = (canvasId) => {
  try {
    // Get pending elements from localStorage
    const pendingElementsKey = `pendingElements_${canvasId}`;
    const pendingElements = JSON.parse(localStorage.getItem(pendingElementsKey) || '[]');
    
    if (pendingElements.length > 0) {
      console.log(`Attempting to sync ${pendingElements.length} pending elements for canvas ${canvasId}`);
      
      // Set up batch processing for elements
      const processElements = async () => {
        const stillPending = [];
        
        for (const element of pendingElements) {
          try {
            const { error } = await supabase
              .from('elements')
              .upsert(element, { onConflict: 'id' });
            
            if (error) {
              console.error('Failed to sync element:', error);
              stillPending.push(element);
            } else {
              console.log('✅ Successfully synced element:', element.id);
            }
          } catch (error) {
            console.error('Error syncing element:', error);
            stillPending.push(element);
          }
        }
        
        // Update pending elements store
        if (stillPending.length > 0) {
          console.warn(`${stillPending.length} elements still need syncing`);
          localStorage.setItem(pendingElementsKey, JSON.stringify(stillPending));
        } else {
          console.log('All elements synced successfully!');
          localStorage.removeItem(pendingElementsKey);
        }
      };
      
      // Start processing
      processElements();
    }
  } catch (error) {
    console.error('Error in sync process:', error);
  }
};

/**
 * Save element to pending sync queue
 * @param {string} canvasId - Canvas ID
 * @param {Object} element - Element to save 
 */
export const queueElementForSync = (canvasId, element) => {
  try {
    const pendingElementsKey = `pendingElements_${canvasId}`;
    const pendingElements = JSON.parse(localStorage.getItem(pendingElementsKey) || '[]');
    
    // Check if element already exists in queue
    const existingIndex = pendingElements.findIndex(e => e.id === element.id);
    if (existingIndex >= 0) {
      // Update existing element
      pendingElements[existingIndex] = element;
    } else {
      // Add new element
      pendingElements.push(element);
    }
    
    localStorage.setItem(pendingElementsKey, JSON.stringify(pendingElements));
    console.log(`Element ${element.id} queued for background sync`);
    
    // Schedule sync attempt
    setTimeout(() => syncPendingElements(canvasId), 5000);
  } catch (error) {
    console.error('Error queuing element for sync:', error);
  }
};

// ================================
// CURSOR TRACKING UTILITIES
// ================================

const cursorSubscriptions = {};

/**
 * Send current user's cursor position to other collaborators
 * @param {string} canvasId
 * @param {string} userId
 * @param {{x:number,y:number}} position
 * @param {Object} userProfile - User profile data (optional)
 */
export const sendCursorPosition = (canvasId, userId, position, userProfile = null) => {
  try {
    const payload = {
      userId,
      ...position,
      ...(userProfile && {
        username: userProfile.username,
        avatar_url: userProfile.avatar_url
      })
    };

    supabase.channel(`cursor:canvas=${canvasId}`)
      .send({ type: 'broadcast', event: 'cursor', payload });
  } catch (err) {
    console.error('Failed to broadcast cursor position', err);
  }
};

/**
 * Subscribe to other users' cursor positions
 * @param {string} canvasId
 * @param {string} userId - current user (to ignore own messages)
 * @param {(payload:{userId:string,x:number,y:number})=>void} onCursor
 */
export const subscribeToCursors = (canvasId, userId, onCursor) => {
  if (cursorSubscriptions[canvasId]) return cursorSubscriptions[canvasId];

  const channel = supabase
    .channel(`cursor:canvas=${canvasId}`)
    .on('broadcast', { event: 'cursor' }, (payload) => {
      if (payload?.payload?.userId && payload.payload.userId !== userId) {
        onCursor(payload.payload);
      }
    });

  channel.subscribe();

  const sub = {
    channel,
    unsubscribe: () => channel.unsubscribe()
  };
  cursorSubscriptions[canvasId] = sub;
  return sub;
};

export const unsubscribeCursors = (canvasId) => {
  if (cursorSubscriptions[canvasId]) {
    cursorSubscriptions[canvasId].unsubscribe();
    delete cursorSubscriptions[canvasId];
  }
};

export default {
  subscribeToCanvas,
  syncPendingElements,
  queueElementForSync,
  sendCursorPosition,
  subscribeToCursors,
  unsubscribeCursors
};
