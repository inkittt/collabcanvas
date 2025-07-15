import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const ProfileCRUDDemo = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [safetyCheck, setSafetyCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, safetyData] = await Promise.all([
        ProfileService.getCurrentProfile(),
        ProfileService.checkProfileDeletionSafety()
      ]);
      setProfile(profileData);
      setSafetyCheck(safetyData);
    } catch (error) {
      console.error('Error loading profile data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  const testUpdateProfile = async () => {
    try {
      setLoading(true);
      const updatedProfile = await ProfileService.updateProfile({
        username: `${profile.username}_updated_${Date.now()}`
      });
      setProfile(updatedProfile);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };



  const getSeverityIcon = (type) => {
    switch (type) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'info': return <InfoIcon color="info" />;
      default: return <CheckIcon color="success" />;
    }
  };

  const getSeverityColor = (type) => {
    switch (type) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'success';
    }
  };

  if (!user) {
    return (
      <Alert severity="warning">
        Please log in to test profile CRUD operations.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Profile CRUD Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Test the complete CRUD functionality for user profiles
        </Typography>

        {/* Current Profile Info */}
        {profile && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Current Profile (READ)
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography><strong>ID:</strong> {profile.id}</Typography>
              <Typography><strong>Username:</strong> {profile.username}</Typography>
              <Typography><strong>Email:</strong> {user.email}</Typography>
              <Typography><strong>Created:</strong> {new Date(profile.created_at).toLocaleString()}</Typography>
              <Typography><strong>Updated:</strong> {new Date(profile.updated_at).toLocaleString()}</Typography>
            </Paper>
          </Box>
        )}

        {/* Safety Check Results */}
        {safetyCheck && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Deletion Safety Check
            </Typography>
            <Alert 
              severity={safetyCheck.canDelete ? "success" : "warning"} 
              sx={{ mb: 2 }}
            >
              <AlertTitle>
                {safetyCheck.canDelete ? "Safe to Delete" : "Cannot Delete Safely"}
              </AlertTitle>
              Risk Level: <Chip 
                label={safetyCheck.riskLevel.toUpperCase()} 
                color={getSeverityColor(safetyCheck.riskLevel)} 
                size="small" 
              />
            </Alert>

            <Typography variant="subtitle1" gutterBottom>
              Dependencies:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText 
                  primary={`Owned Canvases: ${safetyCheck.dependencies.totalOwnedCanvases}`}
                  secondary={safetyCheck.dependencies.ownedCanvases.map(c => c.name).join(', ') || 'None'}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary={`Collaborations: ${safetyCheck.dependencies.totalCollaborations}`}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary={`Has Messages: ${safetyCheck.dependencies.hasCommunityMessages || safetyCheck.dependencies.hasCanvasMessages ? 'Yes' : 'No'}`}
                />
              </ListItem>
            </List>

            {safetyCheck.warnings && safetyCheck.warnings.length > 0 && (
              <>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Warnings:
                </Typography>
                <List dense>
                  {safetyCheck.warnings.map((warning, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {getSeverityIcon(warning.type)}
                      </ListItemIcon>
                      <ListItemText 
                        primary={warning.message}
                        secondary={warning.action}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}

        {/* Test Buttons */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Test CRUD Operations
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={loadProfileData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            >
              Refresh Data (READ)
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={testUpdateProfile}
              disabled={loading}
            >
              Update Username (UPDATE)
            </Button>
            

          </Box>
        </Box>

        {/* Message Display */}
        {message && (
          <Alert 
            severity={message.type} 
            onClose={() => setMessage(null)}
            sx={{ mb: 2 }}
          >
            {message.text}
          </Alert>
        )}

        {/* Instructions */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>
          Available CRUD Operations
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
            <ListItemText 
              primary="CREATE: Automatic profile creation on signup"
              secondary="Profiles are automatically created when users sign up"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
            <ListItemText 
              primary="READ: View profile, search users, safety checks"
              secondary="Get current profile, search for other users, check deletion safety"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
            <ListItemText 
              primary="UPDATE: Modify profile information"
              secondary="Update username, avatar, and other profile fields"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
            <ListItemText 
              primary="DELETE: Safe profile deletion with checks"
              secondary="Delete profile with safety checks, canvas transfer, and data cleanup"
            />
          </ListItem>
        </List>

        <Alert severity="info" sx={{ mt: 3 }}>
          <AlertTitle>Note</AlertTitle>
          For DELETE operations, use the "Manage Account" option in the user menu. 
          This demo focuses on READ and UPDATE operations for safety.
        </Alert>
      </Paper>
    </Box>
  );
};

export default ProfileCRUDDemo;
