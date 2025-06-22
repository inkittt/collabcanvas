import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Box, TextField, Button, Typography, Paper, Divider, Link, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const SignUp = ({ switchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { signUp, signInWithGoogle, signInAsGuest } = useAuth();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    
    try {
      const { user, session, error } = await signUp(email, password);
      
      if (error) throw error;
      
      if (user) {
        if (user.identities?.length === 0) {
          setErrorMessage('The email address is already registered. Please sign in instead.');
        } else {
          setSuccessMessage('Registration successful! Please check your email to confirm your account.');
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setErrorMessage(error.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      await signInWithGoogle();
      // Redirect happens automatically
    } catch (error) {
      console.error('Google sign up error:', error);
      setErrorMessage(error.message || 'Failed to sign up with Google');
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      await signInAsGuest();
      // Guest login state is handled by auth context
    } catch (error) {
      console.error('Guest login error:', error);
      setErrorMessage(error.message || 'Failed to sign in as guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Create a CollabCanvas Account
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
      
      <form onSubmit={handleSignUp}>
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
        
        <TextField
          label="Password"
          type="password"
          fullWidth
          margin="normal"
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          helperText="Password must be at least 6 characters long"
        />
        
        <TextField
          label="Confirm Password"
          type="password"
          fullWidth
          margin="normal"
          variant="outlined"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading}
          error={password !== confirmPassword && confirmPassword !== ''}
          helperText={
            password !== confirmPassword && confirmPassword !== '' 
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
          {loading ? 'Signing up...' : 'Sign Up'}
        </Button>
      </form>
      
      <Box sx={{ mt: 2, mb: 2 }}>
        <Divider>
          <Typography variant="body2" color="textSecondary">
            or
          </Typography>
        </Divider>
      </Box>
      
      <Button
        variant="outlined"
        fullWidth
        startIcon={<GoogleIcon />}
        onClick={handleGoogleSignUp}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        Sign up with Google
      </Button>
      
      <Button
        variant="outlined"
        fullWidth
        onClick={handleGuestLogin}
        disabled={loading}
      >
        Continue as Guest
      </Button>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Already have an account?{' '}
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

export default SignUp; 