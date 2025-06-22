import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
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
  Cancel as CancelIcon
} from '@mui/icons-material';

const ProfileEditor = ({ onClose, onUpdate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'info', open: false });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await ProfileService.getCurrentProfile();
        setProfile(userProfile);
        setUsername(userProfile.username || '');
        setAvatarUrl(userProfile.avatar_url || '');
        setPreviewUrl(userProfile.avatar_url || '');
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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match('image/*')) {
      setMessage({
        text: 'Please select an image file (jpg, png, gif)',
        severity: 'error',
        open: true
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({
        text: 'Image size should not exceed 2MB',
        severity: 'error',
        open: true
      });
      return;
    }

    setAvatarFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);

      // Update basic profile info first
      let updatedProfile = await ProfileService.updateProfile({
        username: username.trim()
      });

      // If there's a new avatar file, upload it
      if (avatarFile) {
        const avatarUrl = await ProfileService.uploadAvatar(avatarFile);
        
        // Update profile with new avatar URL
        updatedProfile = await ProfileService.updateProfile({
          avatar_url: avatarUrl
        });
      }

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
            <Box
              sx={{
                position: 'relative',
                mb: 2,
                mt: { xs: 1, md: 0 },
                '&:hover .hover-overlay': {
                  opacity: 1,
                },
              }}
            >
              <Avatar
                src={previewUrl}
                alt={username}
                sx={{
                  width: 150,
                  height: 150,
                  border: '4px solid white',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  bgcolor: 'primary.main',
                  fontSize: '4rem',
                }}
              >
                {username ? username[0].toUpperCase() : 'U'}
              </Avatar>

              {/* Hover overlay with camera icon */}
              <Box
                className="hover-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}
                onClick={() => fileInputRef.current.click()}
              >
                <CameraIcon sx={{ color: 'white', fontSize: '2rem' }} />
              </Box>
            </Box>

            <input
              accept="image/*"
              type="file"
              id="avatar-file-input"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              ref={fileInputRef}
            />

            <Button
              variant="outlined"
              startIcon={<CameraIcon />}
              onClick={() => fileInputRef.current.click()}
              size="medium"
              sx={{
                borderRadius: 2,
                py: 1,
                px: 2,
                textTransform: 'none',
                fontWeight: 'medium',
                '&:hover': {
                  backgroundColor: 'rgba(63, 81, 181, 0.04)',
                },
                mb: 1,
              }}
            >
              Change Photo
            </Button>
            
            <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1 }}>
              Maximum file size: 2MB<br/>
              Recommended: Square JPG or PNG
            </Typography>
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
