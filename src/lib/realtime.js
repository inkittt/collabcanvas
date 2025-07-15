import { supabase } from './supabase';

/**
 * Subscribe to realtime updates for a specific canvas
 * @param {string} canvasId - The UUID of the canvas to subscribe to
 * @param {Object} callbacks - Callbacks for element changes
 * @returns {Object} - Subscription objects that can be used to unsubscribe
 */
export const subscribeToCanvas = (canvasId, callbacks = {}) => {
  if (!canvasId) {
    console.error('Canvas ID is required to subscribe to updates');
    return { unsubscribe: () => {} }; // Return dummy unsubscribe to avoid errors
  }

  try {
    // Use callback object pattern for more flexibility
    const { onElementAdded, onElementUpdated, onElementDeleted } = callbacks;
    
    // Subscribe to element changes
    const elementSubscription = supabase
      .channel(`elements:canvas_id=eq.${canvasId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'elements',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          if (onElementAdded) {
            onElementAdded(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'elements',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          if (onElementUpdated) {
            onElementUpdated(payload.new);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'elements',
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          if (onElementDeleted) {
            onElementDeleted(payload.old.id);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Error subscribing to element changes:', err);
        }
      });

    // Return subscription so it can be unsubscribed
    return {
      unsubscribe: () => {
        try {
          elementSubscription.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from element channel:', error);
        }
      }
    };
  } catch (error) {
    console.error('Error setting up realtime subscription:', error);
    // Return dummy unsubscribe function to avoid errors in callback
    return { unsubscribe: () => {} };
  }
};



/**
 * Send a chat message through a broadcast channel
 * @param {string} canvasId - The UUID of the canvas
 * @param {Object} message - Message data containing user, text, etc.
 * @returns {Promise} - Promise that resolves when the message is sent
 */
export const sendChatMessage = async (canvasId, message) => {
  if (!canvasId || !message) {
    console.error('Canvas ID and message are required');
    return;
  }

  const chatChannel = supabase.channel(`chat:${canvasId}`);
  
  await chatChannel.subscribe();
  await chatChannel.send({
    type: 'broadcast',
    event: 'chat',
    payload: message
  });
};

/**
 * Subscribe to chat messages
 * @param {string} canvasId - The UUID of the canvas
 * @param {Function} onMessage - Callback for receiving chat messages
 * @returns {Object} - The chat channel that can be used to unsubscribe
 */
export const subscribeToChatMessages = (canvasId, onMessage) => {
  if (!canvasId || !onMessage) {
    console.error('Canvas ID and message handler are required');
    return null;
  }

  const chatChannel = supabase.channel(`chat:${canvasId}`);

  chatChannel
    .on('broadcast', { event: 'chat' }, (payload) => {
      onMessage(payload);
    })
    .subscribe();

  return chatChannel;
};

