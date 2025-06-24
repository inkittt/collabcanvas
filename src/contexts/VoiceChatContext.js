import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import agoraService from '../services/agoraService';

// Voice Chat Context
const VoiceChatContext = createContext();

// Action types
const VOICE_CHAT_ACTIONS = {
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_DISCONNECTED: 'SET_DISCONNECTED',
  SET_MUTED: 'SET_MUTED',
  SET_REMOTE_USERS: 'SET_REMOTE_USERS',
  ADD_REMOTE_USER: 'ADD_REMOTE_USER',
  REMOVE_REMOTE_USER: 'REMOVE_REMOTE_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_NETWORK_QUALITY: 'SET_NETWORK_QUALITY',
  SET_CURRENT_CHANNEL: 'SET_CURRENT_CHANNEL'
};

// Initial state
const initialState = {
  isConnected: false,
  isConnecting: false,
  isMuted: false,
  currentChannel: null,
  currentUid: null,
  remoteUsers: [],
  error: null,
  networkQuality: null
};

// Reducer
const voiceChatReducer = (state, action) => {
  switch (action.type) {
    case VOICE_CHAT_ACTIONS.SET_CONNECTING:
      return {
        ...state,
        isConnecting: action.payload,
        error: action.payload ? null : state.error
      };

    case VOICE_CHAT_ACTIONS.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload.isConnected,
        isConnecting: false,
        currentChannel: action.payload.channel,
        currentUid: action.payload.uid,
        error: null
      };

    case VOICE_CHAT_ACTIONS.SET_DISCONNECTED:
      return {
        ...state,
        isConnected: false,
        isConnecting: false,
        currentChannel: null,
        currentUid: null,
        remoteUsers: []
      };

    case VOICE_CHAT_ACTIONS.SET_MUTED:
      return {
        ...state,
        isMuted: action.payload
      };

    case VOICE_CHAT_ACTIONS.SET_REMOTE_USERS:
      return {
        ...state,
        remoteUsers: action.payload
      };

    case VOICE_CHAT_ACTIONS.ADD_REMOTE_USER:
      return {
        ...state,
        remoteUsers: [
          ...state.remoteUsers.filter(u => u.uid !== action.payload.uid),
          action.payload
        ]
      };

    case VOICE_CHAT_ACTIONS.REMOVE_REMOTE_USER:
      return {
        ...state,
        remoteUsers: state.remoteUsers.filter(u => u.uid !== action.payload.uid)
      };

    case VOICE_CHAT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isConnecting: false
      };

    case VOICE_CHAT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case VOICE_CHAT_ACTIONS.SET_NETWORK_QUALITY:
      return {
        ...state,
        networkQuality: action.payload
      };

    case VOICE_CHAT_ACTIONS.SET_CURRENT_CHANNEL:
      return {
        ...state,
        currentChannel: action.payload
      };

    default:
      return state;
  }
};

// Voice Chat Provider
export const VoiceChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(voiceChatReducer, initialState);

  // Initialize Agora service
  useEffect(() => {
    const initializeService = async () => {
      try {
        await agoraService.initialize();
      } catch (error) {
        console.error('Failed to initialize Agora service:', error);
        dispatch({
          type: VOICE_CHAT_ACTIONS.SET_ERROR,
          payload: 'Failed to initialize voice chat service'
        });
      }
    };

    initializeService();
  }, []);

  // Set up Agora event listeners
  useEffect(() => {
    const handleUserJoined = (userData) => {
      console.log('Voice chat user joined:', userData);
      dispatch({
        type: VOICE_CHAT_ACTIONS.ADD_REMOTE_USER,
        payload: userData
      });
    };

    const handleUserLeft = ({ user: userData }) => {
      console.log('Voice chat user left:', userData);
      dispatch({
        type: VOICE_CHAT_ACTIONS.REMOVE_REMOTE_USER,
        payload: userData
      });
    };

    const handleChannelJoined = ({ canvasId, uid }) => {
      console.log('Successfully joined voice channel:', canvasId);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_CONNECTED,
        payload: {
          isConnected: true,
          channel: canvasId,
          uid: uid
        }
      });
    };

    const handleChannelLeft = () => {
      console.log('Left voice channel');
      dispatch({ type: VOICE_CHAT_ACTIONS.SET_DISCONNECTED });
    };

    const handleMuteChanged = (muted) => {
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_MUTED,
        payload: muted
      });
    };

    const handleConnectionStateChange = ({ current }) => {
      if (current === 'CONNECTED') {
        // Connection established - state will be updated by channel-joined event
      } else if (current === 'DISCONNECTED' || current === 'FAILED') {
        dispatch({
          type: VOICE_CHAT_ACTIONS.SET_ERROR,
          payload: 'Voice chat connection lost'
        });
        dispatch({ type: VOICE_CHAT_ACTIONS.SET_DISCONNECTED });
      }
    };

    const handleNetworkQuality = (stats) => {
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_NETWORK_QUALITY,
        payload: stats
      });
    };

    const handleJoinError = (error) => {
      console.error('Voice chat join error:', error);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_ERROR,
        payload: `Failed to join voice chat: ${error.message}`
      });
    };

    const handleLeaveError = (error) => {
      console.error('Voice chat leave error:', error);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_ERROR,
        payload: `Failed to leave voice chat: ${error.message}`
      });
    };

    const handleMuteError = (error) => {
      console.error('Voice chat mute error:', error);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_ERROR,
        payload: `Failed to toggle mute: ${error.message}`
      });
    };

    // Register event listeners
    agoraService.on('user-joined', handleUserJoined);
    agoraService.on('user-left', handleUserLeft);
    agoraService.on('channel-joined', handleChannelJoined);
    agoraService.on('channel-left', handleChannelLeft);
    agoraService.on('mute-changed', handleMuteChanged);
    agoraService.on('connection-state-change', handleConnectionStateChange);
    agoraService.on('network-quality', handleNetworkQuality);
    agoraService.on('join-error', handleJoinError);
    agoraService.on('leave-error', handleLeaveError);
    agoraService.on('mute-error', handleMuteError);

    // Cleanup on unmount
    return () => {
      agoraService.off('user-joined', handleUserJoined);
      agoraService.off('user-left', handleUserLeft);
      agoraService.off('channel-joined', handleChannelJoined);
      agoraService.off('channel-left', handleChannelLeft);
      agoraService.off('mute-changed', handleMuteChanged);
      agoraService.off('connection-state-change', handleConnectionStateChange);
      agoraService.off('network-quality', handleNetworkQuality);
      agoraService.off('join-error', handleJoinError);
      agoraService.off('leave-error', handleLeaveError);
      agoraService.off('mute-error', handleMuteError);
    };
  }, []);

  // Join voice channel
  const joinChannel = useCallback(async (canvasId) => {
    if (!user || !canvasId) return;

    try {
      dispatch({ type: VOICE_CHAT_ACTIONS.SET_CONNECTING, payload: true });
      dispatch({ type: VOICE_CHAT_ACTIONS.CLEAR_ERROR });
      
      await agoraService.joinChannel(canvasId, user.id);
    } catch (error) {
      console.error('Failed to join voice chat:', error);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_ERROR,
        payload: `Failed to join voice chat: ${error.message}`
      });
    }
  }, [user]);

  // Leave voice channel
  const leaveChannel = useCallback(async () => {
    try {
      await agoraService.leaveChannel();
    } catch (error) {
      console.error('Failed to leave voice chat:', error);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_ERROR,
        payload: `Failed to leave voice chat: ${error.message}`
      });
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    try {
      await agoraService.toggleMute();
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      dispatch({
        type: VOICE_CHAT_ACTIONS.SET_ERROR,
        payload: `Failed to toggle mute: ${error.message}`
      });
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: VOICE_CHAT_ACTIONS.CLEAR_ERROR });
  }, []);

  // Get voice chat status
  const getStatus = useCallback(() => {
    return {
      ...state,
      remoteUserCount: state.remoteUsers.length,
      totalParticipants: state.isConnected ? state.remoteUsers.length + 1 : 0
    };
  }, [state]);

  const value = {
    ...state,
    joinChannel,
    leaveChannel,
    toggleMute,
    clearError,
    getStatus,
    isAgoraConfigured: agoraService.appId && agoraService.appId !== ''
  };

  return (
    <VoiceChatContext.Provider value={value}>
      {children}
    </VoiceChatContext.Provider>
  );
};

// Hook to use voice chat context
export const useVoiceChat = () => {
  const context = useContext(VoiceChatContext);
  if (!context) {
    throw new Error('useVoiceChat must be used within a VoiceChatProvider');
  }
  return context;
};
