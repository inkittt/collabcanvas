import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import AvatarUpload from './AvatarUpload';
import {
  Box,
  Avatar,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

const ProfileEditor = ({ onClose, onUpdate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'info', open: false });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await ProfileService.getCurrentProfile();
        setProfile(userProfile);
        setUsername(userProfile.username || '');
        setAvatarUrl(userProfile.avatar_url || '');
      } catch (error) {
        console.error('Error loading profile:', error);
        setMessage({
          text: 'Failed to load profile information',
          severity: 'error',
          open: true
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);



  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      // Update basic profile info
      const updatedProfile = await ProfileService.updateProfile({
        username: username.trim()
      });

      setMessage({
        text: 'Profile updated successfully',
        severity: 'success',
        open: true
      });

      // Notify parent component about the update
      if (onUpdate) {
        onUpdate(updatedProfile);
      }

      // Close the editor after a brief delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);

    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        text: 'Failed to update profile: ' + (error.message || 'Unknown error'),
        severity: 'error',
        open: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseMessage = () => {
    setMessage(prev => ({ ...prev, open: false }));
  };

  if (loading && !profile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ width: '100%', bgcolor: 'background.default', borderRadius: 3, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          pb: 2.5,
          background: 'linear-gradient(120deg, #3f51b5 0%, #5c6bc0 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box 
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
            transform: 'translate(40%, -50%)',
          }}
        />
        <Typography variant="h5" component="h2" fontWeight="bold">
          Edit Your Profile
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
          Personalize your CollabCanvas experience
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Grid container spacing={4} alignItems="flex-start">
          {/* Avatar Section */}
          <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <AvatarUpload
              currentAvatarUrl={avatarUrl}
              username={username}
              onAvatarChange={(newAvatarUrl) => {
                setAvatarUrl(newAvatarUrl || '');
                // Refresh profile data to get updated info
                ProfileService.getCurrentProfile().then(updatedProfile => {
                  setProfile(updatedProfile);
                  if (onUpdate) {
                    onUpdate(updatedProfile);
                  }
                });
              }}
              disabled={loading}
              size={150}
            />
          </Grid>

          {/* Profile Details Section */}
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: 'primary.main' }}>
              Account Information
            </Typography>
            
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              margin="normal"
              variant="outlined"
              autoComplete="username"
              placeholder="Enter your preferred username"
              helperText="This name will be visible to other users"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 0, 0, 0.1)',
                  }
                }
              }}
              sx={{ mb: 3 }}
            />

            <TextField
              label="Email Address"
              value={user?.email || ''}
              fullWidth
              margin="normal"
              variant="outlined"
              disabled
              InputProps={{
                sx: {
                  borderRadius: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.02)',
                }
              }}
              sx={{ mb: 1 }}
            />
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 3 }}>
              This is the email associated with your account. Email changes are not supported at this time.
            </Typography>
            
            <Box sx={{ 
              mt: 4, 
              p: 2, 
              borderRadius: 2, 
              bgcolor: 'info.light', 
              color: 'info.dark',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1
            }}>
              <Box component="span" sx={{ pt: 0.2 }}>ℹ️</Box>
              <Typography variant="body2">
                Your profile information helps other collaborators identify you in the community chat and on shared canvases.
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 5, borderTop: '1px solid rgba(0,0,0,0.06)', pt: 3 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<CancelIcon />}
            onClick={onClose}
            sx={{ 
              borderRadius: 2, 
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 'medium',
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={loading ? null : <SaveIcon />}
            onClick={handleSaveProfile}
            disabled={loading}
            sx={{ 
              borderRadius: 2, 
              px: 3,
              py: 1,
              textTransform: 'none',
              fontWeight: 'bold',
              boxShadow: 2,
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ mx: 1 }} /> : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Notification */}
      <Snackbar
        open={message.open}
        autoHideDuration={6000}
        onClose={handleCloseMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseMessage} severity={message.severity}>
          {message.text}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ProfileEditor;
