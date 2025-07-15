import React, { useState, useRef } from 'react';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Avatar,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const AvatarUpload = ({ 
  currentAvatarUrl, 
  username, 
  onAvatarChange, 
  size = 150,
  showButtons = true,
  disabled = false 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(currentAvatarUrl);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size too large. Please upload an image smaller than 5MB.');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload the file
    uploadAvatar(file);
  };

  const uploadAvatar = async (file) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress (since Supabase doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const avatarUrl = await ProfileService.uploadAvatar(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setSuccess(true);
      setPreviewUrl(avatarUrl);
      
      // Notify parent component
      if (onAvatarChange) {
        onAvatarChange(avatarUrl);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'Failed to upload avatar');
      setPreviewUrl(currentAvatarUrl); // Revert to original
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);
      await ProfileService.removeAvatar();
      
      setPreviewUrl('');
      setSuccess(true);
      
      // Notify parent component
      if (onAvatarChange) {
        onAvatarChange(null);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error('Error removing avatar:', error);
      setError(error.message || 'Failed to remove avatar');
    } finally {
      setUploading(false);
    }
  };

  const getInitial = () => {
    if (username) return username[0].toUpperCase();
    return 'U';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {/* Avatar with Upload Overlay */}
      <Box
        sx={{
          position: 'relative',
          '&:hover .upload-overlay': showButtons ? {
            opacity: 1,
          } : {},
        }}
      >
        <Avatar
          src={previewUrl}
          alt={username || 'User'}
          sx={{
            width: size,
            height: size,
            bgcolor: 'primary.main',
            fontSize: size / 4,
            border: 3,
            borderColor: success ? 'success.main' : 'grey.300',
            transition: 'border-color 0.3s ease',
          }}
        >
          {!previewUrl && getInitial()}
        </Avatar>

        {/* Upload Progress Overlay */}
        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
            }}
          >
            <CircularProgress size={40} color="inherit" />
            <Typography variant="caption" sx={{ mt: 1 }}>
              {uploadProgress}%
            </Typography>
          </Box>
        )}

        {/* Success Indicator */}
        {success && !uploading && (
          <Box
            sx={{
              position: 'absolute',
              top: -5,
              right: -5,
              backgroundColor: 'success.main',
              borderRadius: '50%',
              p: 0.5,
            }}
          >
            <CheckIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
        )}

        {/* Hover Upload Overlay */}
        {showButtons && !disabled && !uploading && (
          <Box
            className="upload-overlay"
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
            onClick={() => fileInputRef.current?.click()}
          >
            <CameraIcon sx={{ color: 'white', fontSize: size / 4 }} />
          </Box>
        )}
      </Box>

      {/* Upload Progress Bar */}
      {uploading && uploadProgress > 0 && (
        <Box sx={{ width: '100%', maxWidth: 200 }}>
          <LinearProgress 
            variant="determinate" 
            value={uploadProgress} 
            sx={{ borderRadius: 1, height: 6 }}
          />
        </Box>
      )}

      {/* Action Buttons */}
      {showButtons && !disabled && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="small"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Upload Photo
          </Button>
          
          {previewUrl && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleRemoveAvatar}
              disabled={uploading}
              size="small"
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Remove
            </Button>
          )}
        </Box>
      )}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Error Message */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%', maxWidth: 300 }}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && !uploading && (
        <Alert severity="success" sx={{ width: '100%', maxWidth: 300 }}>
          Avatar updated successfully!
        </Alert>
      )}

      {/* Help Text */}
      {showButtons && (
        <Typography variant="caption" color="text.secondary" align="center" sx={{ maxWidth: 250 }}>
          Maximum file size: 5MB<br/>
          Supported formats: JPEG, PNG, GIF, WebP<br/>
          Recommended: Square images for best results
        </Typography>
      )}
    </Box>
  );
};

export default AvatarUpload;
