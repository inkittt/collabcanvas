import agoraService from '../agoraService';

// Mock Agora RTC SDK
const mockClient = {
  join: jest.fn(),
  leave: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockAudioTrack = {
  play: jest.fn(),
  stop: jest.fn(),
  close: jest.fn(),
  setEnabled: jest.fn()
};

jest.mock('agora-rtc-sdk-ng', () => ({
  createClient: jest.fn(() => mockClient),
  createMicrophoneAudioTrack: jest.fn(() => Promise.resolve(mockAudioTrack))
}));

describe('AgoraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    agoraService.client = null;
    agoraService.localAudioTrack = null;
    agoraService.isConnected = false;
    agoraService.isMuted = false;
    agoraService.currentChannel = null;
    agoraService.currentUid = null;
    agoraService.remoteUsers.clear();
    agoraService.eventListeners.clear();
  });

  describe('Initialization', () => {
    test('initializes Agora client successfully', async () => {
      const result = await agoraService.initialize();
      
      expect(result).toBe(true);
      expect(agoraService.client).toBeTruthy();
    });

    test('sets up event listeners during initialization', async () => {
      await agoraService.initialize();
      
      expect(mockClient.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('user-left', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('user-published', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('user-unpublished', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('connection-state-change', expect.any(Function));
    });

    test('handles initialization errors', async () => {
      const error = new Error('Initialization failed');
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock createClient to throw error
      const AgoraRTC = require('agora-rtc-sdk-ng');
      AgoraRTC.createClient.mockImplementationOnce(() => {
        throw error;
      });

      await expect(agoraService.initialize()).rejects.toThrow('Initialization failed');
      expect(console.error).toHaveBeenCalledWith('❌ Failed to initialize Agora client:', error);
    });

    test('does not reinitialize if already initialized', async () => {
      await agoraService.initialize();
      const firstClient = agoraService.client;
      
      await agoraService.initialize();
      
      expect(agoraService.client).toBe(firstClient);
    });
  });

  describe('Channel Management', () => {
    beforeEach(async () => {
      await agoraService.initialize();
    });

    test('joins channel successfully', async () => {
      const canvasId = 'test-canvas';
      const userId = 'test-user';
      
      mockClient.join.mockResolvedValue();
      
      const uid = await agoraService.joinChannel(canvasId, userId);
      
      expect(mockClient.join).toHaveBeenCalledWith(
        agoraService.appId,
        canvasId,
        agoraService.tempToken,
        expect.any(Number)
      );
      expect(agoraService.currentChannel).toBe(canvasId);
      expect(agoraService.isConnected).toBe(true);
      expect(uid).toEqual(expect.any(Number));
    });

    test('leaves current channel before joining new one', async () => {
      const firstCanvas = 'canvas-1';
      const secondCanvas = 'canvas-2';
      const userId = 'test-user';
      
      mockClient.join.mockResolvedValue();
      mockClient.leave.mockResolvedValue();
      
      // Join first channel
      await agoraService.joinChannel(firstCanvas, userId);
      expect(agoraService.currentChannel).toBe(firstCanvas);
      
      // Join second channel
      await agoraService.joinChannel(secondCanvas, userId);
      
      expect(mockClient.leave).toHaveBeenCalled();
      expect(agoraService.currentChannel).toBe(secondCanvas);
    });

    test('leaves channel successfully', async () => {
      const canvasId = 'test-canvas';
      const userId = 'test-user';
      
      mockClient.join.mockResolvedValue();
      mockClient.leave.mockResolvedValue();
      
      // First join a channel
      await agoraService.joinChannel(canvasId, userId);
      
      // Then leave it
      await agoraService.leaveChannel();
      
      expect(mockClient.leave).toHaveBeenCalled();
      expect(agoraService.isConnected).toBe(false);
      expect(agoraService.currentChannel).toBe(null);
      expect(agoraService.currentUid).toBe(null);
    });

    test('handles join channel errors', async () => {
      const error = new Error('Join failed');
      mockClient.join.mockRejectedValue(error);
      
      await expect(agoraService.joinChannel('test-canvas', 'test-user')).rejects.toThrow('Join failed');
    });

    test('handles leave channel errors', async () => {
      const error = new Error('Leave failed');
      mockClient.leave.mockRejectedValue(error);
      
      agoraService.isConnected = true;
      
      await expect(agoraService.leaveChannel()).rejects.toThrow('Leave failed');
    });
  });

  describe('Audio Management', () => {
    beforeEach(async () => {
      await agoraService.initialize();
    });

    test('creates and publishes local audio track', async () => {
      mockClient.publish.mockResolvedValue();
      
      await agoraService.createLocalAudioTrack();
      
      expect(agoraService.localAudioTrack).toBeTruthy();
      expect(mockClient.publish).toHaveBeenCalledWith([agoraService.localAudioTrack]);
    });

    test('toggles mute successfully', async () => {
      await agoraService.createLocalAudioTrack();
      
      // Test muting
      mockAudioTrack.setEnabled.mockResolvedValue();
      const isMuted = await agoraService.toggleMute();
      
      expect(mockAudioTrack.setEnabled).toHaveBeenCalledWith(false);
      expect(isMuted).toBe(true);
      expect(agoraService.isMuted).toBe(true);
      
      // Test unmuting
      const isUnmuted = await agoraService.toggleMute();
      
      expect(mockAudioTrack.setEnabled).toHaveBeenCalledWith(true);
      expect(isUnmuted).toBe(false);
      expect(agoraService.isMuted).toBe(false);
    });

    test('handles mute toggle without audio track', async () => {
      const result = await agoraService.toggleMute();
      
      expect(result).toBe(false);
      expect(mockAudioTrack.setEnabled).not.toHaveBeenCalled();
    });
  });

  describe('Event Management', () => {
    test('registers event listeners', () => {
      const callback = jest.fn();
      
      agoraService.on('test-event', callback);
      
      expect(agoraService.eventListeners.get('test-event')).toContain(callback);
    });

    test('removes event listeners', () => {
      const callback = jest.fn();
      
      agoraService.on('test-event', callback);
      agoraService.off('test-event', callback);
      
      const listeners = agoraService.eventListeners.get('test-event');
      expect(listeners).not.toContain(callback);
    });

    test('emits events to registered listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const testData = { test: 'data' };
      
      agoraService.on('test-event', callback1);
      agoraService.on('test-event', callback2);
      
      agoraService.emit('test-event', testData);
      
      expect(callback1).toHaveBeenCalledWith(testData);
      expect(callback2).toHaveBeenCalledWith(testData);
    });

    test('handles errors in event listeners', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = jest.fn();
      
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      agoraService.on('test-event', errorCallback);
      agoraService.on('test-event', normalCallback);
      
      agoraService.emit('test-event', {});
      
      expect(normalCallback).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    test('generates numeric UID from string', () => {
      const userId = 'test-user-123';
      const uid = agoraService.generateNumericUid(userId);
      
      expect(typeof uid).toBe('number');
      expect(uid).toBeGreaterThan(0);
      expect(uid).toBeLessThan(2147483647);
    });

    test('generates consistent UID for same input', () => {
      const userId = 'test-user-123';
      const uid1 = agoraService.generateNumericUid(userId);
      const uid2 = agoraService.generateNumericUid(userId);
      
      expect(uid1).toBe(uid2);
    });

    test('returns current status', () => {
      agoraService.isConnected = true;
      agoraService.isMuted = false;
      agoraService.currentChannel = 'test-channel';
      agoraService.currentUid = 12345;
      agoraService.remoteUsers.set('user1', { uid: 'user1' });
      agoraService.remoteUsers.set('user2', { uid: 'user2' });
      
      const status = agoraService.getStatus();
      
      expect(status).toEqual({
        isConnected: true,
        isMuted: false,
        currentChannel: 'test-channel',
        currentUid: 12345,
        remoteUserCount: 2,
        remoteUsers: ['user1', 'user2']
      });
    });
  });

  describe('Cleanup', () => {
    test('destroys service properly', async () => {
      await agoraService.initialize();
      agoraService.isConnected = true;
      agoraService.localAudioTrack = mockAudioTrack;
      
      mockClient.leave.mockResolvedValue();
      
      await agoraService.destroy();
      
      expect(mockClient.removeAllListeners).toHaveBeenCalled();
      expect(agoraService.client).toBe(null);
      expect(agoraService.eventListeners.size).toBe(0);
    });

    test('handles destroy errors gracefully', async () => {
      await agoraService.initialize();
      agoraService.isConnected = true;
      
      const error = new Error('Destroy failed');
      mockClient.leave.mockRejectedValue(error);
      
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await agoraService.destroy();
      
      expect(console.error).toHaveBeenCalledWith('❌ Error destroying Agora service:', error);
    });
  });
});
