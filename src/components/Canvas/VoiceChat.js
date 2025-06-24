import React, { useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useVoiceChat } from '../../contexts/VoiceChatContext';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Tooltip,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Phone as PhoneIcon,
  PhoneDisabled as PhoneDisabledIcon,
  SignalWifi4Bar as SignalIcon,
  SignalWifiOff as SignalOffIcon
} from '@mui/icons-material';

const VoiceChat = ({ canvasId, permission = 'viewer', collaborators = [], onVoiceChatToggle }) => {
  const { user } = useAuth();
  const {
    isConnected,
    isConnecting,
    isMuted,
    remoteUsers,
    error: connectionError,
    networkQuality,
    joinChannel,
    leaveChannel,
    toggleMute,
    clearError,
    isAgoraConfigured
  } = useVoiceChat();

  // Join voice channel handler
  const handleJoinVoiceChat = useCallback(async () => {
    if (!user || !canvasId) return;
    await joinChannel(canvasId);
  }, [user, canvasId, joinChannel]);

  // Leave voice channel handler
  const handleLeaveVoiceChat = useCallback(async () => {
    await leaveChannel();
  }, [leaveChannel]);

  // Toggle mute handler
  const handleToggleMute = useCallback(async () => {
    await toggleMute();
  }, [toggleMute]);



  // Get collaborator info by user ID
  const getCollaboratorInfo = (userId) => {
    return collaborators.find(c => c.profiles?.id === userId) || 
           collaborators.find(c => c.user_id === userId);
  };

  // Handle error clearing
  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  // Check if user can join voice chat based on permissions
  const canJoinVoiceChat = permission !== 'viewer' || permission === 'owner';
  const voiceChatDisabledReason = permission === 'viewer'
    ? 'Voice chat is only available to editors and owners'
    : null;

  if (!isAgoraConfigured) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Alert severity="warning">
          <Typography variant="body2">
            Voice chat is not configured. Please set up your Agora credentials in the environment variables.
          </Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeUpIcon />
          Voice Chat
        </Typography>
        
        {/* Connection Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {networkQuality && (
            <Tooltip title={`Network Quality: ${networkQuality.uplinkNetworkQuality}/6`}>
              {networkQuality.uplinkNetworkQuality > 3 ? <SignalIcon color="success" /> : <SignalOffIcon color="warning" />}
            </Tooltip>
          )}
          
          <Chip 
            label={isConnected ? 'Connected' : 'Disconnected'} 
            color={isConnected ? 'success' : 'default'}
            size="small"
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Permission Notice */}
      {!canJoinVoiceChat && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {voiceChatDisabledReason}
          </Typography>
        </Alert>
      )}

      {/* Connection Error */}
      {connectionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={handleClearError}>
          {connectionError}
        </Alert>
      )}

      {/* Voice Controls */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'center' }}>
        {!isConnected ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={isConnecting ? <CircularProgress size={16} /> : <PhoneIcon />}
            onClick={handleJoinVoiceChat}
            disabled={isConnecting || !canJoinVoiceChat}
            sx={{ minWidth: 140 }}
            title={!canJoinVoiceChat ? voiceChatDisabledReason : undefined}
          >
            {isConnecting ? 'Connecting...' : 'Join Voice'}
          </Button>
        ) : (
          <>
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton
                color={isMuted ? 'error' : 'primary'}
                onClick={handleToggleMute}
                sx={{ 
                  bgcolor: isMuted ? 'error.light' : 'primary.light',
                  '&:hover': {
                    bgcolor: isMuted ? 'error.main' : 'primary.main'
                  }
                }}
              >
                {isMuted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              color="error"
              startIcon={<PhoneDisabledIcon />}
              onClick={handleLeaveVoiceChat}
              sx={{ minWidth: 120 }}
            >
              Leave
            </Button>
          </>
        )}
      </Box>

      {/* Participants List */}
      {isConnected && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Voice Participants ({remoteUsers.length + 1})
          </Typography>
          
          <List dense>
            {/* Current User */}
            <ListItem>
              <ListItemAvatar>
                <Avatar src={user?.user_metadata?.avatar_url}>
                  {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={`${user?.user_metadata?.full_name || user?.email || 'You'} (You)`}
                secondary={isMuted ? 'Muted' : 'Speaking'}
              />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {isMuted ? <MicOffIcon color="error" fontSize="small" /> : <MicIcon color="primary" fontSize="small" />}
              </Box>
            </ListItem>

            {/* Remote Users */}
            {remoteUsers.map((remoteUser) => {
              const collaborator = getCollaboratorInfo(remoteUser.uid);
              return (
                <ListItem key={remoteUser.uid}>
                  <ListItemAvatar>
                    <Avatar src={collaborator?.profiles?.avatar_url}>
                      {collaborator?.profiles?.username?.[0] || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={collaborator?.profiles?.username || `User ${remoteUser.uid}`}
                    secondary="In voice chat"
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <VolumeUpIcon color="primary" fontSize="small" />
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </>
      )}

      {/* Instructions */}
      {!isConnected && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
          Click "Join Voice" to start talking with other collaborators
        </Typography>
      )}
    </Paper>
  );
};

export default VoiceChat;
