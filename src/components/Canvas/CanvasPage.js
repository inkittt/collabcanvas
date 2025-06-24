import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { CanvasService } from '../../services/canvasService';
import logo from '../../assets/collabcanvas-logo.svg';
import CanvasEditor from './CanvasEditor';
import CanvasCollaborators from './CanvasCollaborators';
import ChatPanel from '../Chat/ChatPanel';
import ImageEditingSidebar from './ImageEditingSidebar';
import VoiceChat from './VoiceChat';
import VoiceChatControl from './VoiceChatControl';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
  Drawer,
  useMediaQuery,
  useTheme,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Chat as ChatIcon,
  Logout as LogoutIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

const CanvasPage = () => {
  const { canvasId } = useParams();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [canvasData, setCanvasData] = useState(null);
  const [error, setError] = useState(null);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const [permission, setPermission] = useState('viewer');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);
  const [showImageEditingSidebar, setShowImageEditingSidebar] = useState(false);
  const [imageEditingMode, setImageEditingMode] = useState('adjust');
  const [selectedImage, setSelectedImage] = useState(null);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Load canvas data
  useEffect(() => {
    const loadCanvas = async () => {
      if (!canvasId || !user) return;
      
      try {
        setLoading(true);
        
        // Set a shorter timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
          setLoading(false);
          // Set default canvas data if none was loaded
          if (!canvasData) {
            console.log('Setting default canvas data due to timeout');
            setCanvasData({
              id: canvasId,
              name: 'Untitled Canvas',
              owner_id: user.id,
              is_public: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            setPermission('owner'); // Default to owner if can't determine
          }
          console.log('Loading timeout reached, forcing render');
        }, 1500); // Reduce timeout to 1.5 seconds for faster response
        
        // Get canvas details
        try {
          const canvas = await CanvasService.getCanvas(canvasId);
          setCanvasData(canvas);
          
          // Get user's permission level
          const collaborators = await CanvasService.getCollaborators(canvasId);
          
          if (canvas.owner_id === user.id) {
            setPermission('owner');
          } else {
            const userCollaborator = collaborators.find(
              collab => collab.profiles?.id === user.id
            );
            
            if (userCollaborator) {
              setPermission(userCollaborator.permission_level);
            } else if (canvas.is_public) {
              setPermission('viewer');
            } else {
              setError('You do not have permission to view this canvas');
              setSnackbarOpen(true);
              setTimeout(() => navigate('/dashboard'), 3000);
            }
          }
        } catch (canvasError) {
          console.error('Error loading canvas data:', canvasError);
          // Set default canvas data if loading fails
          setCanvasData({
            id: canvasId,
            name: 'Untitled Canvas',
            owner_id: user.id,
            is_public: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          setPermission('owner'); // Default to owner if can't determine
        }
        
        // Clear timeout if loading completes successfully
        clearTimeout(loadingTimeout);
        setLoading(false);
        
      } catch (error) {
        console.error('Error loading canvas:', error);
        setError('Error loading canvas');
        setSnackbarOpen(true);
        setLoading(false);
      }
    };
    
    loadCanvas();
  }, [canvasId, user, navigate]);

  // Add a new useEffect to load the invite code
  useEffect(() => {
    if (canvasId) {
      // Try to get the invite code from localStorage
      const canvasInvites = JSON.parse(localStorage.getItem('canvasInvites') || '{}');
      const code = canvasInvites[canvasId];
      if (code) {
        setInviteCode(code);
      }
    }
  }, [canvasId]);

  // Toggle canvas public/private status
  const togglePublicStatus = async () => {
    if (!canvasData || permission !== 'owner') return;
    
    try {
      setLoading(true);
      
      const updatedCanvas = await CanvasService.updateCanvas(canvasId, {
        name: canvasData.name,
        isPublic: !canvasData.is_public,
      });
      
      setCanvasData(updatedCanvas);
      setSnackbarOpen(true);
      
    } catch (error) {
      console.error('Error updating canvas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close sidebars on mobile when switching between them
  useEffect(() => {
    if (isMobile && showChat) {
      setShowCollaborators(false);
      setShowImageEditingSidebar(false);
    }
  }, [showChat, isMobile]);

  useEffect(() => {
    if (isMobile && showCollaborators) {
      setShowChat(false);
      setShowImageEditingSidebar(false);
    }
  }, [showCollaborators, isMobile]);

  useEffect(() => {
    if (isMobile && showImageEditingSidebar) {
      setShowChat(false);
      setShowCollaborators(false);
    }
  }, [showImageEditingSidebar, isMobile]);

  // Cleanup image editing state when canvas changes
  useEffect(() => {
    setShowImageEditingSidebar(false);
    setSelectedImage(null);
    setImageEditingMode('adjust');
  }, [canvasId]);

  // Function to handle copying invite code
  const handleCopyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      setShowCopiedAlert(true);
    }
  };

  // Handle image editing mode changes
  const handleImageEditingModeChange = (isActive, image) => {
    try {
      if (isActive && image && image.type === 'image') {
        setSelectedImage(image);
        // Close other sidebars when image editing is active
        setShowCollaborators(false);
        setShowChat(false);
        console.log('Image editing mode activated for image:', image.id);
      } else {
        setSelectedImage(null);
        setShowImageEditingSidebar(false);
        setImageEditingMode('adjust');
        console.log('Image editing mode deactivated');
      }
    } catch (error) {
      console.error('Error handling image editing mode change:', error);
      // Reset state on error
      setSelectedImage(null);
      setShowImageEditingSidebar(false);
      setImageEditingMode('adjust');
    }
  };

  // Handle image editing sidebar visibility
  const handleShowImageEditingSidebar = (show, mode = 'adjust', image = null) => {
    try {
      const validModes = ['crop', 'filter', 'adjust'];
      const validatedMode = validModes.includes(mode) ? mode : 'adjust';

      setShowImageEditingSidebar(show);
      if (show) {
        setImageEditingMode(validatedMode);
        const imageToUse = image || selectedImage;
        if (imageToUse && imageToUse.type === 'image') {
          setSelectedImage(imageToUse);
          // Close other sidebars
          setShowCollaborators(false);
          setShowChat(false);
          console.log(`Image editing sidebar opened in ${validatedMode} mode for image:`, imageToUse.id);
        } else {
          console.warn('No valid image selected for editing');
          setShowImageEditingSidebar(false);
        }
      } else {
        console.log('Image editing sidebar closed');
      }
    } catch (error) {
      console.error('Error handling image editing sidebar:', error);
      setShowImageEditingSidebar(false);
    }
  };

  if (loading && !canvasData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 3 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate('/dashboard')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box 
              component="img"
              src={logo}
              alt="CollabCanvas Logo"
              sx={{ 
                height: '32px',
                width: 'auto',
                mr: 2,
                display: { xs: 'none', sm: 'block' }
              }}
            />
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {canvasData?.name || 'Canvas'}
            </Typography>
            
            {inviteCode && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  Invite Code: <strong>{inviteCode}</strong>
                </Typography>
                <Tooltip title="Copy invite code">
                  <IconButton color="inherit" onClick={handleCopyInviteCode} size="small">
                    <CopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            
            {permission === 'owner' && (
              <Tooltip title={canvasData?.is_public ? 'Make Private' : 'Make Public'}>
                <IconButton onClick={togglePublicStatus} sx={{ mr: 1 }}>
                  {canvasData?.is_public ? <PublicIcon /> : <LockIcon />}
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Chat">
              <IconButton
                onClick={() => setShowChat(!showChat)}
                color={showChat ? 'primary' : 'default'}
                sx={{ mr: 1 }}
              >
                <ChatIcon />
              </IconButton>
            </Tooltip>

            {/* Voice Chat Control */}
            <VoiceChatControl
              canvasId={canvasId}
              permission={permission}
              sx={{ mr: 1 }}
            />

            <Tooltip title="Collaborators">
              <IconButton
                onClick={() => setShowCollaborators(!showCollaborators)}
                color={showCollaborators ? 'primary' : 'default'}
                sx={{ mr: 1 }}
              >
                <PeopleIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Log Out">
              <IconButton onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        
        {permission === 'viewer' && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" color="error" gutterBottom>
              View Only Mode
            </Typography>
            <Typography variant="body2">
              You only have permission to view this canvas. Contact the owner to request edit access.
            </Typography>
          </Paper>
        )}
        
        {isMobile ? (
          // Mobile Layout with Drawers
          <>
            <Box>
              <CanvasEditor
                canvasId={canvasId}
                readOnly={permission === 'viewer'}
                onImageEditingModeChange={handleImageEditingModeChange}
                onShowImageEditingSidebar={handleShowImageEditingSidebar}
              />
            </Box>
            
            {/* Collaborators Drawer */}
            <Drawer
              anchor="right"
              open={showCollaborators}
              onClose={() => setShowCollaborators(false)}
              PaperProps={{
                sx: { width: '85%', maxWidth: 350, display: 'flex', flexDirection: 'column' }
              }}
            >
              <Box sx={{ p: 2, flexShrink: 0 }}>
                <VoiceChat
                  canvasId={canvasId}
                  permission={permission}
                  collaborators={[]} // Will be populated from CanvasCollaborators data
                />
              </Box>
              <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
                <CanvasCollaborators
                  canvasId={canvasId}
                  canvasOwnerId={canvasData?.owner_id}
                />
              </Box>
            </Drawer>
            
            {/* Chat Drawer */}
            <Drawer
              anchor="right"
              open={showChat}
              onClose={() => setShowChat(false)}
              PaperProps={{
                sx: { width: '85%', maxWidth: 350 }
              }}
            >
              <Box sx={{ height: '100%', p: 2 }}>
                <ChatPanel
                  canvasId={canvasId}
                  onClose={() => setShowChat(false)}
                />
              </Box>
            </Drawer>

            {/* Image Editing Drawer */}
            <Drawer
              anchor="left"
              open={showImageEditingSidebar}
              onClose={() => setShowImageEditingSidebar(false)}
              PaperProps={{
                sx: { width: '85%', maxWidth: 350 }
              }}
            >
              <ImageEditingSidebar
                open={showImageEditingSidebar}
                onClose={() => setShowImageEditingSidebar(false)}
                selectedImage={selectedImage}
                canvasId={canvasId}
                editingMode={imageEditingMode}
                onImageUpdate={(updatedImage) => {
                  console.log('Image updated:', updatedImage);
                }}
              />
            </Drawer>
          </>
        ) : (
          // Desktop Layout with Grid
          <Box sx={{ display: 'flex', height: 'calc(100vh - 200px)' }}>
            {/* Left Sidebar - Image Editing */}
            {showImageEditingSidebar && (
              <ImageEditingSidebar
                open={showImageEditingSidebar}
                onClose={() => setShowImageEditingSidebar(false)}
                selectedImage={selectedImage}
                canvasId={canvasId}
                editingMode={imageEditingMode}
                onImageUpdate={(updatedImage) => {
                  // Handle image update if needed
                  console.log('Image updated:', updatedImage);
                }}
              />
            )}

            {/* Main Canvas Area */}
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0 // Prevent flex item from overflowing
            }}>
              <CanvasEditor
                canvasId={canvasId}
                readOnly={permission === 'viewer'}
                onImageEditingModeChange={handleImageEditingModeChange}
                onShowImageEditingSidebar={handleShowImageEditingSidebar}
              />
            </Box>

            {/* Right Sidebar */}
            {(showCollaborators || showChat) && (
              <Box sx={{
                width: 350,
                borderLeft: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Voice Chat - Always show when sidebar is open */}
                <Box sx={{ p: 2, flexShrink: 0 }}>
                  <VoiceChat
                    canvasId={canvasId}
                    permission={permission}
                    collaborators={[]} // Will be populated from CanvasCollaborators data
                  />
                </Box>

                {showCollaborators && (
                  <Box sx={{ p: 2, flexShrink: 0 }}>
                    <CanvasCollaborators
                      canvasId={canvasId}
                      canvasOwnerId={canvasData?.owner_id}
                    />
                  </Box>
                )}

                {showChat && (
                  <Box sx={{ flex: 1, p: 2, minHeight: 0 }}>
                    <ChatPanel
                      canvasId={canvasId}
                      onClose={() => setShowChat(false)}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>
      
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={error ? "error" : "success"}
        >
          {error || (canvasData?.is_public 
            ? "Canvas is now public" 
            : "Canvas is now private")}
        </Alert>
      </Snackbar>
      
      {/* Add a Snackbar for copy confirmation */}
      <Snackbar
        open={showCopiedAlert}
        autoHideDuration={3000}
        onClose={() => setShowCopiedAlert(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowCopiedAlert(false)} severity="success">
          Invite code copied to clipboard!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CanvasPage; 