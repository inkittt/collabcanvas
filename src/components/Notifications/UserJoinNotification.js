import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Avatar,
  Box,
  Typography,
  IconButton,
  Slide
} from '@mui/material';
import {
  Close as CloseIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

/**
 * Transition component for the notification
 */
function SlideTransition(props) {
  return <Slide {...props} direction="down" />;
}

/**
 * Component to display user join notifications
 */
const UserJoinNotification = ({ 
  notification, 
  open, 
  onClose, 
  autoHideDuration = 6000 
}) => {
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    setIsVisible(open);
  }, [open]);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setIsVisible(false);
    if (onClose) {
      onClose();
    }
  };

  if (!notification) {
    return null;
  }

  const { joiningUser } = notification;

  return (
    <Snackbar
      open={isVisible}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      TransitionComponent={SlideTransition}
      sx={{
        '& .MuiSnackbarContent-root': {
          padding: 0,
        }
      }}
    >
      <Alert
        severity="info"
        variant="filled"
        onClose={handleClose}
        sx={{
          width: '100%',
          minWidth: 300,
          backgroundColor: '#2196F3',
          color: 'white',
          '& .MuiAlert-icon': {
            color: 'white'
          },
          '& .MuiAlert-action': {
            color: 'white'
          }
        }}
        icon={<PersonAddIcon />}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            src={joiningUser.avatar_url}
            alt={joiningUser.username}
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            {joiningUser.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
              New collaborator joined!
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              {joiningUser.username || 'Unknown User'} joined your canvas
            </Typography>
          </Box>
        </Box>
      </Alert>
    </Snackbar>
  );
};

/**
 * Hook to manage multiple user join notifications
 */
export const useUserJoinNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const notificationWithId = { ...notification, id };
    
    setNotifications(prev => [...prev, notificationWithId]);

    // Auto-remove notification after 8 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 8000);

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  return {
    notifications,
    addNotification,
    removeNotification
  };
};

/**
 * Container component to display multiple notifications
 */
export const UserJoinNotificationContainer = ({ notifications, onRemoveNotification }) => {
  return (
    <>
      {notifications.map((notification, index) => (
        <UserJoinNotification
          key={notification.id}
          notification={notification}
          open={true}
          onClose={() => onRemoveNotification(notification.id)}
          autoHideDuration={6000}
        />
      ))}
    </>
  );
};

export default UserJoinNotification;
