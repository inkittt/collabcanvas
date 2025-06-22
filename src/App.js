import React, { Component, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthForm from './components/Auth/AuthForm';
import UpdatePassword from './components/Auth/UpdatePassword';
import CanvasDashboard from './components/Canvas/CanvasDashboard';
import CanvasPage from './components/Canvas/CanvasPage';
import IntroductionPage from './components/Introduction/IntroductionPage';
import RealtimeTest from './components/RealtimeTest';
import ImageUploadTest from './components/ImageUploadTest';
import { checkSupabaseConnection } from './lib/supabase';
import SupabaseSync from './lib/supabaseSync';
import { CircularProgress, Box, Typography, Snackbar, Alert } from '@mui/material';
import './utils/storageCleanup'; // Import storage cleanup utility

// Error boundary to catch rendering errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h4" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {this.state.error?.toString()}
          </Typography>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16 }}>
            Reload page
          </button>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Use IntroductionPage component as the home page

// Create a Private Route component for protected routes
const PrivateRoute = ({ children }) => {
  console.log('PrivateRoute rendering...');
  const { user, loading } = useAuth();
  
  console.log('PrivateRoute auth state:', { user, loading });
  
  if (loading) {
    console.log('PrivateRoute: Loading state');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!user) {
    console.log('PrivateRoute: No user, redirecting to home');
    return <Navigate to="/" />;
  }
  
  console.log('PrivateRoute: User authenticated, rendering children');
  return children;
};

// Create a Modern White and Black theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Pure black
      light: '#333333',
      dark: '#000000',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFFFFF', // Pure white
      light: '#FFFFFF',
      dark: '#F5F5F5',
      contrastText: '#000000',
    },
    error: {
      main: '#DC2626', // Modern red
    },
    warning: {
      main: '#F59E0B', // Modern amber
    },
    info: {
      main: '#3B82F6', // Modern blue
    },
    success: {
      main: '#10B981', // Modern green
    },
    background: {
      default: '#FFFFFF', // Pure white
      paper: '#FAFAFA', // Off-white
    },
    text: {
      primary: '#000000', // Black
      secondary: '#6B7280', // Gray
      disabled: '#9CA3AF', // Light gray
    },
    divider: '#E5E7EB',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Segoe UI", "Roboto", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
      textTransform: 'none',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.02em',
      textTransform: 'none',
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
      textTransform: 'none',
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0',
    },
  },
  shape: {
    borderRadius: 8, // Modern rounded corners
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#000000', // Ensure AppBar text is black
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          borderBottom: '1px solid #E5E7EB',
          '& .MuiIconButton-root': {
            color: '#000000', // Ensure AppBar icons are black
          },
          '& .MuiIconButton-colorInherit': {
            color: '#000000', // Specifically target inherit color icons
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
          boxShadow: 'none',
          textTransform: 'none',
          fontWeight: 500,
          position: 'relative',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-1px)',
          },
        },
        containedPrimary: {
          backgroundColor: '#000000',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#1F2937',
          },
        },
        containedSecondary: {
          backgroundColor: '#F9FAFB',
          color: '#000000',
          border: '1px solid #E5E7EB',
          '&:hover': {
            backgroundColor: '#F3F4F6',
          },
        },
        outlined: {
          borderWidth: '1px',
          borderColor: '#E5E7EB',
          '&:hover': {
            borderColor: '#000000',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 0.15s ease-in-out',
          color: '#000000', // Ensure icons are black
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
          '&.Mui-disabled': {
            color: '#9CA3AF', // Light gray for disabled state
          },
        },
        colorPrimary: {
          color: '#000000',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.08)',
          },
        },
        colorSecondary: {
          color: '#6B7280',
          '&:hover': {
            backgroundColor: 'rgba(107, 114, 128, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            borderColor: '#D1D5DB',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 8,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderWidth: '1px',
              borderColor: '#E5E7EB',
            },
            '&:hover fieldset': {
              borderColor: '#D1D5DB',
            },
            '&.Mui-focused fieldset': {
              borderWidth: '2px',
              borderColor: '#000000',
            },
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          textTransform: 'none',
          fontSize: '0.875rem',
          minHeight: 48,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: '1px solid',
        },
        standardError: {
          borderColor: '#FCA5A5',
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
        },
        standardSuccess: {
          borderColor: '#A7F3D0',
          backgroundColor: '#F0FDF4',
          color: '#10B981',
        },
        standardWarning: {
          borderColor: '#FDE68A',
          backgroundColor: '#FFFBEB',
          color: '#F59E0B',
        },
        standardInfo: {
          borderColor: '#BFDBFE',
          backgroundColor: '#EFF6FF',
          color: '#3B82F6',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          border: '1px solid #E5E7EB',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          color: '#000000', // Ensure toolbar text is black
          '& .MuiIconButton-root': {
            color: '#000000', // Ensure toolbar icons are black
          },
          '& .MuiSvgIcon-root': {
            color: '#000000', // Ensure SVG icons are black
          },
        },
      },
    },
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          color: '#000000', // Default icon color is black
        },
        colorPrimary: {
          color: '#000000',
        },
        colorSecondary: {
          color: '#6B7280',
        },
        colorAction: {
          color: '#000000',
        },
        colorDisabled: {
          color: '#9CA3AF',
        },
        colorInherit: {
          color: '#000000', // Ensure inherit color is black
        },
      },
    },
    // Global CSS baseline overrides
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          color: '#000000', // Ensure body text is black
        },
        // Ensure all text elements have proper contrast
        'h1, h2, h3, h4, h5, h6, p, span, div': {
          color: 'inherit',
        },
      },
    },
  },
});

const AppContent = () => {
  console.log('AppContent rendering...');
  const { user, loading } = useAuth();
  const syncRef = useRef(null);
  
  console.log('AppContent auth state:', { user, loading });

  // Initialize background sync when user is logged in
  useEffect(() => {
    if (user) {
      console.log('Setting up background canvas sync process');
      // Start background sync process
      syncRef.current = SupabaseSync.setupBackgroundSync(30000); // 30 seconds interval
      
      // Perform initial full sync
      SupabaseSync.performFullSync();
    }
    
    // Cleanup function
    return () => {
      if (syncRef.current) {
        console.log('Cleaning up background sync process');
        syncRef.current.stop();
        syncRef.current = null;
      }
    };
  }, [user]);
  
  if (loading) {
    console.log('AppContent: Loading state');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  console.log('AppContent: Rendering routes');
  return (
    <Routes>
      <Route path="/" element={
        user ? <Navigate to="/dashboard" /> : <IntroductionPage />
      } />
      <Route path="/auth" element={
        user ? <Navigate to="/dashboard" /> : <AuthForm />
      } />
      <Route path="/reset-password" element={<UpdatePassword />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <CanvasDashboard />
        </PrivateRoute>
      } />
      <Route path="/canvas/:canvasId" element={
        <PrivateRoute>
          <CanvasPage />
        </PrivateRoute>
      } />
      <Route path="/realtime-test" element={<RealtimeTest />} />
      <Route path="/upload-test" element={<ImageUploadTest />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App = () => {
  console.log('App component rendering...');
  const [dbConnectionStatus, setDbConnectionStatus] = useState({
    checked: false,
    connected: false,
    error: null
  });
  const [showConnectionAlert, setShowConnectionAlert] = useState(false);

  // Check database connection on component mount
  useEffect(() => {
    const checkDbConnection = async () => {
      try {
        const result = await checkSupabaseConnection();
        setDbConnectionStatus({
          checked: true,
          connected: result.success,
          error: result.error || null
        });
        
        // Show alert if connection failed
        if (!result.success) {
          setShowConnectionAlert(true);
        }
      } catch (err) {
        setDbConnectionStatus({
          checked: true,
          connected: false,
          error: err.message || 'Connection check failed'
        });
        setShowConnectionAlert(true);
      }
    };

    checkDbConnection();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <AppContent />
            
            {/* Connection status alert */}
            <Snackbar 
              open={showConnectionAlert} 
              autoHideDuration={6000} 
              onClose={() => setShowConnectionAlert(false)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert 
                severity="warning" 
                onClose={() => setShowConnectionAlert(false)}
              >
                Database connection issue. Please check your internet connection.
              </Alert>
            </Snackbar>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
