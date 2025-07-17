import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  TextField,
  Button,
  Typography,
  Box,
  Container,
  Paper,
  Tabs,
  Tab,
  Alert,
  Link,
  CircularProgress,
  Divider,
  alpha
} from '@mui/material';
import { styled } from '@mui/material/styles';
import logo from '../../assets/latest-collabcanvas-logo.png';

// Styled components for modern clean form elements
const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  padding: theme.spacing(4),
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(3),
}));

const StyledButton = styled(Button)(({ theme }) => ({
  borderRadius: 8,
  padding: '12px 0',
  fontWeight: 500,
  textTransform: 'none',
  transition: 'all 0.15s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }
}));

const AuthForm = () => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleTabChange = (e, newValue) => {
    setTab(newValue);
    setError('');
    setSuccess('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      if (tab === 0) {
        // Sign in
        await signIn(email, password);
      } else if (tab === 1) {
        // Sign up
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }

        await signUp(email, password);
        setSuccess('Account created! Please check your email for a confirmation link.');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <LogoContainer>
          <img src={logo} alt="CollabCanvas Logo" width="80" height="80" />
        </LogoContainer>
        <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ fontWeight: 700 }}>
          CollabCanvas
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" paragraph sx={{ opacity: 0.8 }}>
          A real-time collaborative canvas for teams
        </Typography>
      </Box>
      
      <StyledPaper elevation={0}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
          sx={{ mb: 2 }}
        >
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          {tab !== 2 && (
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete={tab === 0 ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          
          {tab === 1 && (
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}
          
          <StyledButton
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> :
              tab === 0 ? 'Sign In' : 'Sign Up'}
          </StyledButton>
        </Box>
        
        <Divider sx={{ my: 2 }}>or</Divider>
        
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <StyledButton
            variant="outlined"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            Sign in with Google
          </StyledButton>
        </Box>

      </StyledPaper>
    </Container>
  );
};

export default AuthForm; 