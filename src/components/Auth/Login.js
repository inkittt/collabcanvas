import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { Box, TextField, Button, Typography, Paper, Divider, Link, Alert } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

const Login = ({ switchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn, signInWithGoogle } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    
    try {
      await signIn(email, password);
      // Successful login will be handled by the auth state change listener
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    
    try {
      await signInWithGoogle();
      // Redirect happens automatically
    } catch (error) {
      console.error('Google login error:', error);
      setErrorMessage(error.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };



  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        Sign In to CollabCanvas
      </Typography>
      
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      
      <form onSubmit={handleLogin}>
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
        />
        

        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 1 }}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
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
        onClick={handleGoogleLogin}
        disabled={loading}
      >
        Sign in with Google
      </Button>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2">
          Don't have an account?{' '}
          <Link
            component="button"
            variant="body2"
            onClick={switchToSignUp}
            disabled={loading}
          >
            Sign Up
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default Login; 