import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { TextField, Button, Typography, Paper, Alert, Box, Link } from '@mui/material';

const ResetPassword = ({ switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { resetPassword } = useAuth();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      await resetPassword(email);
      setSuccessMessage('Password reset instructions have been sent to your email.');
    } catch (error) {
      console.error('Reset password error:', error);
      setErrorMessage(error.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Reset Password
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
        Enter your email address below and we'll send you instructions to reset your password.
      </Typography>
      
      <form onSubmit={handleResetPassword}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          margin="normal"
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Instructions'}
        </Button>
      </form>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Remember your password?{' '}
          <Link
            component="button"
            variant="body2"
            onClick={switchToLogin}
            disabled={loading}
          >
            Sign In
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default ResetPassword; 