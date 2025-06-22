import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Tooltip,
  Typography,
  Divider
} from '@mui/material';
import {
  AccountCircle as AccountIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import ProfileEditor from './ProfileEditor';

const UserMenu = ({ onLogout }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  
  const open = Boolean(anchorEl);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userProfile = await ProfileService.getCurrentProfile();
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadProfile();
  }, [user]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleEditProfile = () => {
    handleClose();
    setEditorOpen(true);
  };

  const handleLogout = () => {
    handleClose();
    if (onLogout) {
      onLogout();
    }
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  // Get initial letter for avatar fallback
  const getInitial = () => {
    if (profile?.username) {
      return profile.username[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Account settings">
          <IconButton
            onClick={handleClick}
            size="small"
            sx={{ 
              ml: 1,
              border: 2,
              borderColor: 'rgba(255,255,255,0.2)',
              p: 0.2,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'scale(1.05)'
              }
            }}
            aria-controls={open ? 'account-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            <Avatar 
              src={profile?.avatar_url} 
              alt={profile?.username || 'User'}
              sx={{ 
                width: 38, 
                height: 38,
                bgcolor: 'primary.main',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              {getInitial()}
            </Avatar>
          </IconButton>
        </Tooltip>
        
        <Box sx={{ ml: 1.5, display: { xs: 'none', sm: 'block' } }}>
          <Typography variant="subtitle2" fontWeight="medium" sx={{ lineHeight: 1.1 }}>
            {profile?.username || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
            {loading ? 'Loading...' : 'Online'}
          </Typography>
        </Box>
      </Box>
      
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 3,
          sx: {
            minWidth: 220,
            mt: 1.5,
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.2))',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {profile?.username || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {user?.email || ''}
          </Typography>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleEditProfile} sx={{ py: 1.5 }}>
          <EditIcon fontSize="small" sx={{ mr: 2 }} />
          Edit Profile
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
          <LogoutIcon fontSize="small" sx={{ mr: 2 }} />
          Logout
        </MenuItem>
      </Menu>
      
      {/* Profile Editor Dialog */}
      <Dialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <ProfileEditor 
          onClose={() => setEditorOpen(false)} 
          onUpdate={handleProfileUpdate}
        />
      </Dialog>
    </>
  );
};

export default UserMenu;
