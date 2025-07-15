import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';

const QuickProfileTest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const testProfileCreation = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('Testing profile creation for user:', user?.id);
      
      // Try to get current profile (this should create one if it doesn't exist)
      const profile = await ProfileService.getCurrentProfile();
      
      setResult({
        success: true,
        message: 'Profile loaded/created successfully!',
        profile: profile
      });

    } catch (err) {
      console.error('Profile test error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testProfileUpdate = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Try to update the profile
      const updatedProfile = await ProfileService.updateProfile({
        username: `test_user_${Date.now()}`,
        updated_at: new Date().toISOString()
      });
      
      setResult({
        success: true,
        message: 'Profile updated successfully!',
        profile: updatedProfile
      });

    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please log in to test profile functionality.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Quick Profile Test
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Test profile creation and updates with current user: {user.email}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={testProfileCreation}
            disabled={loading}
          >
            Test Profile Creation
          </Button>
          <Button
            variant="outlined"
            onClick={testProfileUpdate}
            disabled={loading}
          >
            Test Profile Update
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography>Testing...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Error:</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {result && (
          <Alert severity={result.success ? "success" : "error"} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">{result.message}</Typography>
            {result.profile && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>ID:</strong> {result.profile.id}
                </Typography>
                <Typography variant="body2">
                  <strong>Username:</strong> {result.profile.username}
                </Typography>
                <Typography variant="body2">
                  <strong>Avatar URL:</strong> {result.profile.avatar_url || 'null'}
                </Typography>
                <Typography variant="body2">
                  <strong>Created:</strong> {new Date(result.profile.created_at).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Updated:</strong> {new Date(result.profile.updated_at).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default QuickProfileTest;
