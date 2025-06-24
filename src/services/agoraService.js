import AgoraRTC from 'agora-rtc-sdk-ng';

/**
 * Agora Voice Chat Service
 * Handles voice communication for collaborative canvas rooms
 */
class AgoraService {
  constructor() {
    this.client = null;
    this.localAudioTrack = null;
    this.remoteUsers = new Map();
    this.isConnected = false;
    this.isMuted = false;
    this.currentChannel = null;
    this.currentUid = null;
    this.eventListeners = new Map();
    
    // Agora configuration - these should be set via environment variables
    this.appId = process.env.REACT_APP_AGORA_APP_ID || '';
    this.tempToken = process.env.REACT_APP_AGORA_TEMP_TOKEN || null;

    // Debug logging
    console.log('🔍 Agora Debug Info:');
    console.log('App ID from env:', process.env.REACT_APP_AGORA_APP_ID);
    console.log('App ID length:', this.appId.length);
    console.log('Token from env:', process.env.REACT_APP_AGORA_TEMP_TOKEN ? 'Present' : 'Missing');

    if (!this.appId) {
      console.warn('Agora App ID not configured. Voice chat will not work.');
    } else {
      console.log('✅ Agora App ID configured successfully');
    }
  }

  /**
   * Initialize Agora client with proper configuration
   */
  async initialize() {
    try {
      if (this.client) {
        console.log('Agora client already initialized');
        return;
      }

      // Create Agora client - following official documentation pattern
      this.client = AgoraRTC.createClient({
        mode: 'rtc',
        codec: 'vp8'
      });

      // Set up event listeners
      this.setupEventListeners();
      
      console.log('✅ Agora client initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Agora client:', error);
      throw error;
    }
  }

  /**
   * Set up Agora client event listeners
   */
  setupEventListeners() {
    if (!this.client) return;

    // User joined the channel
    this.client.on('user-joined', (user) => {
      console.log('🎤 User joined voice chat:', user.uid);
      this.remoteUsers.set(user.uid, user);
      this.emit('user-joined', user);
    });

    // User left the channel
    this.client.on('user-left', (user, reason) => {
      console.log('🎤 User left voice chat:', user.uid, 'Reason:', reason);
      this.remoteUsers.delete(user.uid);
      this.emit('user-left', { user, reason });
    });

    // User published audio track - following official documentation
    this.client.on('user-published', async (user, mediaType) => {
      if (mediaType === 'audio') {
        console.log('🎤 User published audio:', user.uid);
        // Subscribe to the remote user when the SDK triggers the "user-published" event
        await this.client.subscribe(user, mediaType);

        // Get the RemoteAudioTrack object in the AgoraRTCRemoteUser object
        const remoteAudioTrack = user.audioTrack;
        if (remoteAudioTrack) {
          // Play the remote audio track
          remoteAudioTrack.play();
          this.emit('user-audio-published', { user, audioTrack: remoteAudioTrack });
        }
      }
    });

    // Handle the "user-unpublished" event - following official documentation
    this.client.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') {
        console.log('🎤 User unpublished audio:', user.uid);
        // Remote user unpublished
        this.emit('user-audio-unpublished', user);
      }
    });

    // Connection state changed
    this.client.on('connection-state-change', (curState, revState) => {
      console.log('🎤 Connection state changed:', revState, '->', curState);
      this.isConnected = curState === 'CONNECTED';
      this.emit('connection-state-change', { current: curState, previous: revState });
    });

    // Network quality indicator
    this.client.on('network-quality', (stats) => {
      this.emit('network-quality', stats);
    });

    // Exception occurred
    this.client.on('exception', (event) => {
      console.error('🎤 Agora exception:', event);
      this.emit('exception', event);
    });
  }

  /**
   * Join a voice channel for a canvas room
   * @param {string} canvasId - Canvas room ID to use as channel name
   * @param {string} userId - User ID
   * @param {string} token - Agora token (optional, can use temp token for development)
   */
  async joinChannel(canvasId, userId, token = null) {
    try {
      if (!this.client) {
        await this.initialize();
      }

      if (this.isConnected && this.currentChannel === canvasId) {
        console.log('Already connected to this voice channel');
        return;
      }

      // Leave current channel if connected to a different one
      if (this.isConnected && this.currentChannel !== canvasId) {
        await this.leaveChannel();
      }

      // Use provided token or temp token
      const channelToken = token || this.tempToken;
      
      // Generate a numeric UID from string userId (Agora requirement)
      const numericUid = this.generateNumericUid(userId);

      // TEMPORARY: Use fixed channel name for testing
      const testChannel = 'test-room';
      console.log(`🎤 Joining voice channel: ${testChannel} with UID: ${numericUid}`);
      console.log(`🎤 Using App ID: ${this.appId}`);
      console.log(`🎤 Token present: ${channelToken ? 'Yes' : 'No'}`);
      console.log(`🎤 Token value: ${channelToken ? channelToken.substring(0, 20) + '...' : 'None'}`);

      // Join the channel - following official documentation
      await this.client.join(this.appId, testChannel, channelToken, numericUid);

      this.currentChannel = testChannel;
      this.currentUid = numericUid;
      this.isConnected = true;

      // Create and publish local audio track
      await this.createLocalAudioTrack();
      
      console.log('✅ Successfully joined voice channel');
      this.emit('channel-joined', { canvasId, uid: numericUid });
      
      return numericUid;
    } catch (error) {
      console.error('❌ Failed to join voice channel:', error);
      this.emit('join-error', error);
      throw error;
    }
  }

  /**
   * Leave the current voice channel
   */
  async leaveChannel() {
    try {
      if (!this.isConnected || !this.client) {
        console.log('Not connected to any voice channel');
        return;
      }

      console.log('🎤 Leaving voice channel:', this.currentChannel);

      // Stop the local audio track and release the microphone - following official documentation
      if (this.localAudioTrack) {
        this.localAudioTrack.close(); // Stop local audio
        this.localAudioTrack = null; // Clean up the track reference
      }

      // Leave the channel - following official documentation
      await this.client.leave();
      
      // Clear state
      this.isConnected = false;
      this.currentChannel = null;
      this.currentUid = null;
      this.remoteUsers.clear();
      
      console.log('✅ Successfully left voice channel');
      this.emit('channel-left');
    } catch (error) {
      console.error('❌ Failed to leave voice channel:', error);
      this.emit('leave-error', error);
      throw error;
    }
  }

  /**
   * Create and publish local audio track - following official documentation
   */
  async createLocalAudioTrack() {
    try {
      if (this.localAudioTrack) {
        console.log('Local audio track already exists');
        return;
      }

      // Create a local audio track - following official documentation
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'music_standard',
      });

      // Publish the audio track - following official documentation
      await this.client.publish([this.localAudioTrack]);

      console.log('✅ Local audio track created and published');
      this.emit('local-audio-published', this.localAudioTrack);
    } catch (error) {
      console.error('❌ Failed to create local audio track:', error);
      this.emit('audio-error', error);
      throw error;
    }
  }

  /**
   * Toggle microphone mute/unmute
   */
  async toggleMute() {
    try {
      if (!this.localAudioTrack) {
        console.warn('No local audio track to mute/unmute');
        return false;
      }

      if (this.isMuted) {
        await this.localAudioTrack.setEnabled(true);
        this.isMuted = false;
        console.log('🎤 Microphone unmuted');
      } else {
        await this.localAudioTrack.setEnabled(false);
        this.isMuted = true;
        console.log('🔇 Microphone muted');
      }

      this.emit('mute-changed', this.isMuted);
      return this.isMuted;
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
      this.emit('mute-error', error);
      throw error;
    }
  }

  /**
   * Get current voice chat status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isMuted: this.isMuted,
      currentChannel: this.currentChannel,
      currentUid: this.currentUid,
      remoteUserCount: this.remoteUsers.size,
      remoteUsers: Array.from(this.remoteUsers.keys())
    };
  }

  /**
   * Generate numeric UID from string userId
   * Agora requires numeric UIDs, so we convert string IDs to numbers
   */
  generateNumericUid(userId) {
    // Simple hash function to convert string to number
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Ensure positive number and within Agora's UID range
    return Math.abs(hash) % 2147483647;
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and destroy the service
   */
  async destroy() {
    try {
      await this.leaveChannel();
      
      if (this.client) {
        this.client.removeAllListeners();
        this.client = null;
      }
      
      this.eventListeners.clear();
      console.log('✅ Agora service destroyed');
    } catch (error) {
      console.error('❌ Error destroying Agora service:', error);
    }
  }
}

// Create singleton instance
const agoraService = new AgoraService();

export default agoraService;
