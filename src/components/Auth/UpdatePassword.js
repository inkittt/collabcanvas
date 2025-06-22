import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const UpdatePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Validate password strength
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    try {
      await updatePassword(newPassword);
      setSuccessMessage('Password updated successfully. You will be redirected to login...');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Update password error:', error);
      setErrorMessage(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Update Password
      </Typography>
      
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      
      <Typography variant="body2" paragraph>
        Enter your new password below.
      </Typography>
      
      <form onSubmit={handleUpdatePassword}>
        <TextField
          label="New Password"
          type="password"
          fullWidth
          margin="normal"
          variant="outlined"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={loading}
          helperText="Password must be at least 6 characters long"
        />
        
        <TextField
          label="Confirm New Password"
          type="password"
          fullWidth
          margin="normal"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          error={newPassword !== confirmPassword && confirmPassword !== ''}
          helperText={
            newPassword !== confirmPassword && confirmPassword !== '' 
              ? 'Passwords do not match' 
              : ''
          }
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </form>
    </Paper>
  );
};

export default UpdatePassword; 