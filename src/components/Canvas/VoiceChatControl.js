import React, { useState, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useVoiceChat } from '../../contexts/VoiceChatContext';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VolumeUp as VolumeUpIcon,
  Phone as PhoneIcon,
  PhoneDisabled as PhoneDisabledIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

const VoiceChatControl = ({ canvasId, permission = 'viewer', sx = {} }) => {
  const { user } = useAuth();
  const {
    isConnected,
    isConnecting,
    isMuted,
    remoteUsers,
    error: connectionError,
    joinChannel,
    leaveChannel,
    toggleMute,
    clearError,
    isAgoraConfigured
  } = useVoiceChat();

  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const remoteUserCount = remoteUsers.length;

  // Check if user can join voice chat based on permissions
  const canJoinVoiceChat = permission !== 'viewer' || permission === 'owner';
  const voiceChatDisabledReason = permission === 'viewer'
    ? 'Voice chat is only available to editors and owners'
    : null;

  // Join voice chat handler
  const handleJoinVoiceChat = useCallback(async () => {
    if (!user || !canvasId) return;
    await joinChannel(canvasId);
  }, [user, canvasId, joinChannel]);

  // Leave voice chat handler
  const handleLeaveVoiceChat = useCallback(async () => {
    await leaveChannel();
    setAnchorEl(null);
  }, [leaveChannel]);

  // Toggle mute handler
  const handleToggleMute = useCallback(async () => {
    await toggleMute();
  }, [toggleMute]);



  // Handle menu
  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };



  if (!isAgoraConfigured) {
    return (
      <Tooltip title="Voice chat not configured">
        <IconButton disabled sx={sx}>
          <VolumeUpIcon />
        </IconButton>
      </Tooltip>
    );
  }

  if (!canJoinVoiceChat) {
    return (
      <Tooltip title={voiceChatDisabledReason}>
        <IconButton disabled sx={sx}>
          <PhoneIcon />
        </IconButton>
      </Tooltip>
    );
  }

  // Main voice chat button
  const VoiceChatButton = () => {
    if (isConnecting) {
      return (
        <Tooltip title="Connecting to voice chat...">
          <IconButton disabled sx={sx}>
            <CircularProgress size={20} />
          </IconButton>
        </Tooltip>
      );
    }

    if (!isConnected) {
      return (
        <Tooltip title="Join voice chat">
          <IconButton 
            onClick={handleJoinVoiceChat}
            sx={{
              ...sx,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'primary.light'
              }
            }}
          >
            <PhoneIcon />
          </IconButton>
        </Tooltip>
      );
    }

    // Connected state - show mute/unmute button with participant count
    return (
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title={isMuted ? 'Unmute microphone' : 'Mute microphone'}>
          <IconButton
            onClick={handleToggleMute}
            sx={{
              ...sx,
              color: isMuted ? 'error.main' : 'success.main',
              bgcolor: isMuted ? 'error.light' : 'success.light',
              '&:hover': {
                bgcolor: isMuted ? 'error.main' : 'success.main',
                color: 'white'
              }
            }}
          >
            <Badge 
              badgeContent={remoteUserCount > 0 ? remoteUserCount + 1 : null} 
              color="primary"
              max={99}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </Badge>
          </IconButton>
        </Tooltip>

        {/* Menu button for additional controls */}
        <Tooltip title="Voice chat options">
          <IconButton
            onClick={handleMenuClick}
            size="small"
            sx={{ 
              ml: 0.5,
              color: 'text.secondary'
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  return (
    <>
      <VoiceChatButton />

      {/* Voice Chat Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {connectionError && (
          <>
            <MenuItem disabled>
              <Alert
                severity="error"
                sx={{ fontSize: '0.75rem', py: 0 }}
                onClose={clearError}
              >
                {connectionError}
              </Alert>
            </MenuItem>
            <Divider />
          </>
        )}

        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            Voice Chat Status
          </Typography>
        </MenuItem>

        <MenuItem disabled>
          <Typography variant="body2">
            {isConnected ? (
              <>
                <VolumeUpIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Connected ({remoteUserCount + 1} participants)
              </>
            ) : (
              <>
                <PhoneDisabledIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                Disconnected
              </>
            )}
          </Typography>
        </MenuItem>

        {isConnected && (
          <>
            <Divider />
            <MenuItem onClick={handleToggleMute}>
              {isMuted ? (
                <>
                  <MicIcon fontSize="small" sx={{ mr: 1 }} />
                  Unmute
                </>
              ) : (
                <>
                  <MicOffIcon fontSize="small" sx={{ mr: 1 }} />
                  Mute
                </>
              )}
            </MenuItem>
            <MenuItem onClick={handleLeaveVoiceChat} sx={{ color: 'error.main' }}>
              <PhoneDisabledIcon fontSize="small" sx={{ mr: 1 }} />
              Leave Voice Chat
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default VoiceChatControl;
