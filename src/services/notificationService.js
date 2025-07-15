import { supabase } from '../lib/supabase';

/**
 * Service for handling real-time notifications in the application
 */
export const NotificationService = {
  /**
   * Send a user join notification to the canvas owner
   * @param {string} canvasId - The canvas ID
   * @param {string} ownerId - The canvas owner's user ID
   * @param {Object} joiningUser - Information about the user who joined
   * @returns {Promise} - Promise that resolves when notification is sent
   */
  async sendUserJoinNotification(canvasId, ownerId, joiningUser) {
    try {
      if (!canvasId || !ownerId || !joiningUser) {
        console.error('Missing required parameters for join notification');
        return;
      }

      const notificationPayload = {
        type: 'user_joined',
        canvasId,
        ownerId,
        joiningUser: {
          id: joiningUser.id,
          username: joiningUser.username || 'Unknown User',
          avatar_url: joiningUser.avatar_url || null
        },
        timestamp: new Date().toISOString()
      };

      console.log('Sending user join notification:', notificationPayload);

      // Send notification through Supabase real-time channel
      const channel = supabase.channel(`notifications:${ownerId}`);
      
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'user_joined_canvas',
        payload: notificationPayload
      });

      console.log('User join notification sent successfully');
    } catch (error) {
      console.error('Error sending user join notification:', error);
    }
  },

  /**
   * Subscribe to user join notifications for a specific user (canvas owner)
   * @param {string} userId - The user ID to receive notifications for
   * @param {Function} onNotification - Callback function when notification is received
   * @returns {Object} - Channel object that can be used to unsubscribe
   */
  subscribeToUserJoinNotifications(userId, onNotification) {
    if (!userId || !onNotification) {
      console.error('User ID and notification handler are required');
      return null;
    }

    console.log('Setting up user join notification subscription for user:', userId);

    const channel = supabase.channel(`notifications:${userId}`);

    channel
      .on('broadcast', { event: 'user_joined_canvas' }, (payload) => {
        console.log('Received user join notification:', payload);
        if (payload?.payload) {
          onNotification(payload.payload);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ User join notification subscription active for user:', userId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ User join notification subscription error for user:', userId);
        }
      });

    return channel;
  },

  /**
   * Subscribe to PostgreSQL notifications for user join events
   * This listens to the database trigger notifications
   * @param {Function} onNotification - Callback function when notification is received
   * @returns {Object} - Channel object that can be used to unsubscribe
   */
  subscribeToPostgresNotifications(onNotification) {
    if (!onNotification) {
      console.error('Notification handler is required');
      return null;
    }

    console.log('Setting up PostgreSQL notification subscription');

    const channel = supabase.channel('postgres_notifications');

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'canvas_collaborators'
      }, async (payload) => {
        console.log('Canvas collaborator added via PostgreSQL trigger:', payload);

        // Process the notification
        if (payload.new) {
          await this.handleUserJoinedCanvas(payload.new.canvas_id, payload.new.user_id);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ PostgreSQL notification subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ PostgreSQL notification subscription error');
        }
      });

    return channel;
  },

  /**
   * Set up a global notification listener that handles all user join events
   * This should be called once when the app starts
   * @param {Function} onNotification - Global notification handler
   * @returns {Object} - Channel object that can be used to unsubscribe
   */
  setupGlobalNotificationListener(onNotification) {
    console.log('Setting up global notification listener');
    return this.subscribeToPostgresNotifications(onNotification);
  },

  /**
   * Send a notification when a user joins a canvas via invite code
   * This function is called from the database trigger or RPC function
   * @param {string} canvasId - The canvas ID
   * @param {string} userId - The user ID who joined
   * @returns {Promise} - Promise that resolves when notification is processed
   */
  async handleUserJoinedCanvas(canvasId, userId) {
    try {
      console.log('Processing user join event for canvas:', canvasId, 'user:', userId);

      // Get canvas information and owner
      const { data: canvas, error: canvasError } = await supabase
        .from('canvases')
        .select('id, name, owner_id')
        .eq('id', canvasId)
        .single();

      if (canvasError || !canvas) {
        console.error('Error fetching canvas information:', canvasError);
        return;
      }

      // Don't send notification if the user joining is the owner
      if (canvas.owner_id === userId) {
        console.log('User is the canvas owner, skipping notification');
        return;
      }

      // Get joining user's profile information
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.warn('Error fetching user profile, using fallback:', profileError);
      }

      const joiningUser = userProfile || {
        id: userId,
        username: 'Unknown User',
        avatar_url: null
      };

      // Send notification to canvas owner
      await this.sendUserJoinNotification(canvas.id, canvas.owner_id, joiningUser);

    } catch (error) {
      console.error('Error handling user joined canvas event:', error);
    }
  }
};

export default NotificationService;
