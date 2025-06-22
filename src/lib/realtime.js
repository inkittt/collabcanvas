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

// Store cursor channels per canvas to share among all users
const cursorBroadcastChannels = {};

/**
 * Send cursor position to other users
 * @param {string} canvasId - The UUID of the canvas
 * @param {string} userId - The current user's ID
 * @param {Object} position - Cursor position {x, y}
 * @param {Object} userProfile - User profile data (optional)
 */
export const sendCursorPosition = (canvasId, userId, position, userProfile = null) => {
  if (!canvasId || !userId || !position) {
    console.error('Canvas ID, user ID, and position are required');
    return;
  }

  try {
    const payload = {
      userId,
      ...position,
      ...(userProfile && {
        username: userProfile.username,
        avatar_url: userProfile.avatar_url
      })
    };

    // Use a shared channel for all users on this canvas
    if (!cursorBroadcastChannels[canvasId]) {
      const channelName = `cursor-broadcast:${canvasId}`;
      cursorBroadcastChannels[canvasId] = supabase.channel(channelName);

      // Subscribe to the broadcast channel
      cursorBroadcastChannels[canvasId].subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🖱️ Cursor broadcast channel ready for canvas:', canvasId);
        }
      });
    }

    // Send the cursor position to the shared channel
    cursorBroadcastChannels[canvasId].send({
      type: 'broadcast',
      event: 'cursor',
      payload
    });
  } catch (error) {
    console.error('Error sending cursor position:', error);
  }
};

/**
 * Subscribe to cursor positions from other users
 * @param {string} canvasId - The UUID of the canvas
 * @param {string} currentUserId - Current user's ID to filter out own cursor
 * @param {Function} onCursorMove - Callback for cursor position updates
 * @returns {Object} - The cursor channel that can be used to unsubscribe
 */
export const subscribeToCursors = (canvasId, currentUserId, onCursorMove) => {
  if (!canvasId || !currentUserId || !onCursorMove) {
    console.error('Canvas ID, user ID, and cursor handler are required');
    return null;
  }

  // Subscribe to the same shared broadcast channel that sendCursorPosition uses
  const channelName = `cursor-broadcast:${canvasId}`;
  const cursorChannel = supabase.channel(channelName);

  // Listen to all cursor events on this canvas
  cursorChannel
    .on('broadcast', { event: 'cursor' }, (payload) => {
      // Only process cursor updates from other users
      if (payload.payload && payload.payload.userId !== currentUserId) {
        onCursorMove(payload.payload);
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('🖱️ Cursor subscription active for user:', currentUserId);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('🖱️ Cursor subscription error for user:', currentUserId);
      }
    });

  return {
    channel: cursorChannel,
    unsubscribe: () => {
      console.log('🖱️ Unsubscribing cursor tracking for user:', currentUserId);
      cursorChannel.unsubscribe();
    }
  };
};

/**
 * Unsubscribe from cursor tracking for a specific canvas
 * @param {string} canvasId - The UUID of the canvas
 */
export const unsubscribeCursors = (canvasId) => {
  // Clean up the broadcast channel if it exists
  if (cursorBroadcastChannels[canvasId]) {
    console.log(`🖱️ Cleaning up cursor broadcast channel for canvas: ${canvasId}`);
    cursorBroadcastChannels[canvasId].unsubscribe();
    delete cursorBroadcastChannels[canvasId];
  }
};

/**
 * Debug function to check cursor tracking status
 * @param {string} canvasId - The UUID of the canvas
 */
export const debugCursorTracking = (canvasId) => {
  console.log('🖱️ Cursor tracking debug for canvas:', canvasId);
  console.log('🖱️ Active broadcast channels:', Object.keys(cursorBroadcastChannels));
  console.log('🖱️ Channel exists for this canvas:', !!cursorBroadcastChannels[canvasId]);

  if (cursorBroadcastChannels[canvasId]) {
    console.log('🖱️ Channel state:', cursorBroadcastChannels[canvasId].state);
  }
};