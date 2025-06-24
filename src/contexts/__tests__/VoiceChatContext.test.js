import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { VoiceChatProvider, useVoiceChat } from '../VoiceChatContext';
import { AuthProvider } from '../../auth/AuthContext';

// Mock Agora service
const mockAgoraService = {
  initialize: jest.fn().mockResolvedValue(true),
  joinChannel: jest.fn().mockResolvedValue('12345'),
  leaveChannel: jest.fn().mockResolvedValue(),
  toggleMute: jest.fn().mockResolvedValue(false),
  on: jest.fn(),
  off: jest.fn(),
  appId: 'test-app-id'
};

jest.mock('../../services/agoraService', () => mockAgoraService);

// Mock auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

const MockAuthProvider = ({ children }) => (
  <AuthProvider value={{ user: mockUser, loading: false }}>
    {children}
  </AuthProvider>
);

const wrapper = ({ children }) => (
  <MockAuthProvider>
    <VoiceChatProvider>
      {children}
    </VoiceChatProvider>
  </MockAuthProvider>
);

describe('VoiceChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider Initialization', () => {
    test('initializes with default state', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isMuted).toBe(false);
      expect(result.current.currentChannel).toBe(null);
      expect(result.current.currentUid).toBe(null);
      expect(result.current.remoteUsers).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.networkQuality).toBe(null);
    });

    test('initializes Agora service on mount', () => {
      renderHook(() => useVoiceChat(), { wrapper });
      
      expect(mockAgoraService.initialize).toHaveBeenCalled();
    });

    test('sets up Agora event listeners', () => {
      renderHook(() => useVoiceChat(), { wrapper });
      
      expect(mockAgoraService.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
      expect(mockAgoraService.on).toHaveBeenCalledWith('user-left', expect.any(Function));
      expect(mockAgoraService.on).toHaveBeenCalledWith('channel-joined', expect.any(Function));
      expect(mockAgoraService.on).toHaveBeenCalledWith('channel-left', expect.any(Function));
      expect(mockAgoraService.on).toHaveBeenCalledWith('mute-changed', expect.any(Function));
    });

    test('provides isAgoraConfigured status', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      expect(result.current.isAgoraConfigured).toBe(true);
    });
  });

  describe('Channel Management', () => {
    test('joins channel successfully', async () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      await act(async () => {
        await result.current.joinChannel('test-canvas');
      });
      
      expect(mockAgoraService.joinChannel).toHaveBeenCalledWith('test-canvas', 'test-user-id');
    });

    test('sets connecting state during join', async () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      // Mock a delayed join
      mockAgoraService.joinChannel.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('12345'), 100))
      );
      
      act(() => {
        result.current.joinChannel('test-canvas');
      });
      
      expect(result.current.isConnecting).toBe(true);
    });

    test('leaves channel successfully', async () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      await act(async () => {
        await result.current.leaveChannel();
      });
      
      expect(mockAgoraService.leaveChannel).toHaveBeenCalled();
    });

    test('handles join errors', async () => {
      const error = new Error('Join failed');
      mockAgoraService.joinChannel.mockRejectedValue(error);
      
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      await act(async () => {
        await result.current.joinChannel('test-canvas');
      });
      
      expect(result.current.error).toBe('Failed to join voice chat: Join failed');
      expect(result.current.isConnecting).toBe(false);
    });

    test('handles leave errors', async () => {
      const error = new Error('Leave failed');
      mockAgoraService.leaveChannel.mockRejectedValue(error);
      
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      await act(async () => {
        await result.current.leaveChannel();
      });
      
      expect(result.current.error).toBe('Failed to leave voice chat: Leave failed');
    });
  });

  describe('Audio Management', () => {
    test('toggles mute successfully', async () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      await act(async () => {
        await result.current.toggleMute();
      });
      
      expect(mockAgoraService.toggleMute).toHaveBeenCalled();
    });

    test('handles mute errors', async () => {
      const error = new Error('Mute failed');
      mockAgoraService.toggleMute.mockRejectedValue(error);
      
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      await act(async () => {
        await result.current.toggleMute();
      });
      
      expect(result.current.error).toBe('Failed to toggle mute: Mute failed');
    });
  });

  describe('State Management', () => {
    test('updates state on user joined event', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      // Get the user-joined event handler
      const userJoinedHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'user-joined')[1];
      
      const userData = { uid: 'user123', username: 'Test User' };
      
      act(() => {
        userJoinedHandler(userData);
      });
      
      expect(result.current.remoteUsers).toContainEqual(userData);
    });

    test('updates state on user left event', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      // First add a user
      const userJoinedHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'user-joined')[1];
      const userData = { uid: 'user123', username: 'Test User' };
      
      act(() => {
        userJoinedHandler(userData);
      });
      
      // Then remove the user
      const userLeftHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'user-left')[1];
      
      act(() => {
        userLeftHandler({ user: userData });
      });
      
      expect(result.current.remoteUsers).not.toContainEqual(userData);
    });

    test('updates state on channel joined event', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      const channelJoinedHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'channel-joined')[1];
      
      act(() => {
        channelJoinedHandler({ canvasId: 'test-canvas', uid: 12345 });
      });
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.currentChannel).toBe('test-canvas');
      expect(result.current.currentUid).toBe(12345);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBe(null);
    });

    test('updates state on channel left event', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      const channelLeftHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'channel-left')[1];
      
      act(() => {
        channelLeftHandler();
      });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.currentChannel).toBe(null);
      expect(result.current.currentUid).toBe(null);
      expect(result.current.remoteUsers).toEqual([]);
    });

    test('updates state on mute changed event', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      const muteChangedHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'mute-changed')[1];
      
      act(() => {
        muteChangedHandler(true);
      });
      
      expect(result.current.isMuted).toBe(true);
    });
  });

  describe('Error Management', () => {
    test('clears errors', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      // Set an error first
      act(() => {
        const errorHandler = mockAgoraService.on.mock.calls
          .find(call => call[0] === 'join-error')[1];
        errorHandler(new Error('Test error'));
      });
      
      expect(result.current.error).toBeTruthy();
      
      // Clear the error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBe(null);
    });
  });

  describe('Status Information', () => {
    test('provides comprehensive status', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      const status = result.current.getStatus();
      
      expect(status).toHaveProperty('isConnected');
      expect(status).toHaveProperty('isConnecting');
      expect(status).toHaveProperty('isMuted');
      expect(status).toHaveProperty('currentChannel');
      expect(status).toHaveProperty('remoteUsers');
      expect(status).toHaveProperty('remoteUserCount');
      expect(status).toHaveProperty('totalParticipants');
    });

    test('calculates participant counts correctly', () => {
      const { result } = renderHook(() => useVoiceChat(), { wrapper });
      
      // Add some remote users
      const userJoinedHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'user-joined')[1];
      
      act(() => {
        userJoinedHandler({ uid: 'user1' });
        userJoinedHandler({ uid: 'user2' });
      });
      
      // Simulate connected state
      const channelJoinedHandler = mockAgoraService.on.mock.calls
        .find(call => call[0] === 'channel-joined')[1];
      
      act(() => {
        channelJoinedHandler({ canvasId: 'test-canvas', uid: 12345 });
      });
      
      const status = result.current.getStatus();
      
      expect(status.remoteUserCount).toBe(2);
      expect(status.totalParticipants).toBe(3); // 2 remote + 1 local
    });
  });

  describe('Hook Usage', () => {
    test('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();
      
      expect(() => {
        renderHook(() => useVoiceChat());
      }).toThrow('useVoiceChat must be used within a VoiceChatProvider');
      
      console.error = originalError;
    });
  });
});
