import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { CanvasService } from '../../services/canvasService';
import { ProfileService } from '../../services/profileService';
import CommunityChat from '../Chat/CommunityChat';
import UserMenu from '../Profile/UserMenu';
import logo from '../../assets/collabcanvas-logo.svg';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Paper,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Public as PublicIcon,
  Lock as LockIcon,
  Logout as LogoutIcon,
  Brush as DrawIcon,
  Key as KeyIcon,
} from '@mui/icons-material';

const CanvasDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [canvases, setCanvases] = useState([]);
  const [profile, setProfile] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedCanvas, setSelectedCanvas] = useState(null);
  const [newCanvasName, setNewCanvasName] = useState('');
  const [canvasFilter, setCanvasFilter] = useState('all'); // Filter options: 'all', 'public', 'private'
  const [isPublic, setIsPublic] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Load user profile and canvases
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get user profile
        const profileData = await ProfileService.getCurrentProfile();
        setProfile(profileData);
        
        // Get user's canvases
        const canvasesData = await CanvasService.getUserCanvases();
        
        console.log('Loaded canvases on dashboard:', canvasesData);
        
        if (canvasesData && canvasesData.length > 0) {
          setCanvases(canvasesData);
        } else {
          // Try to get directly from localStorage as a fallback
          try {
            const localCanvasesRaw = localStorage.getItem('localCanvases');
            if (localCanvasesRaw) {
              const localCanvases = JSON.parse(localCanvasesRaw);
              console.log('Fallback: directly loaded from localStorage:', localCanvases);
              
              if (localCanvases && localCanvases.length > 0) {
                // Filter to only show canvases owned by this user
                const userCanvases = localCanvases.filter(
                  canvas => canvas.owner_id === profileData.id || canvas.is_public
                );
                setCanvases(userCanvases);
              }
            }
          } catch (localError) {
            console.error('Error parsing localStorage canvases:', localError);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadData();
    }
  }, [user]);

  // Handle creating a new canvas
  const handleCreateCanvas = async () => {
    if (!newCanvasName.trim()) return;
    
    try {
      setLoading(true);
      console.log('Creating canvas with name:', newCanvasName.trim(), 'isPublic:', isPublic);
      
      // Generate a unique invite code for this canvas
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('Generated invite code:', inviteCode);
      
      // Create canvas in Supabase with the invite code
      // We'll add it to the canvas metadata directly
      const newCanvas = await CanvasService.createCanvas({
        name: newCanvasName.trim(),
        isPublic,
        inviteCode // Pass the invite code to the service
      });
      
      console.log('Canvas created successfully:', newCanvas);
      
      // Also store locally for redundancy and easier access
      const storedInviteCodes = JSON.parse(localStorage.getItem('canvasInviteCodes') || '{}');
      storedInviteCodes[inviteCode] = {
        canvasId: newCanvas.id,
        name: newCanvasName.trim(),
        owner: user.id,
        created: new Date().toISOString()
      };
      localStorage.setItem('canvasInviteCodes', JSON.stringify(storedInviteCodes));
      
      // Store the canvas ID with its invite code
      const canvasInvites = JSON.parse(localStorage.getItem('canvasInvites') || '{}');
      canvasInvites[newCanvas.id] = inviteCode;
      localStorage.setItem('canvasInvites', JSON.stringify(canvasInvites));
      
      // Add to state
      setCanvases(prev => [...prev, {...newCanvas, inviteCode}]);
      setCreateDialogOpen(false);
      setNewCanvasName('');
      setIsPublic(false);
      
      // Navigate to the new canvas
      navigate(`/canvas/${newCanvas.id}`);
    } catch (error) {
      console.error('Error creating canvas:', error);
      // Show error message
      alert(`Failed to create canvas: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle deleting a canvas
  const handleDeleteCanvas = async () => {
    if (!selectedCanvas) return;
    
    try {
      setLoading(true);
      
      await CanvasService.deleteCanvas(selectedCanvas.id);
      
      setCanvases(prev => prev.filter(canvas => canvas.id !== selectedCanvas.id));
      setDeleteDialogOpen(false);
      setSelectedCanvas(null);
      
    } catch (error) {
      console.error('Error deleting canvas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open a canvas
  const handleOpenCanvas = (canvas) => {
    navigate(`/canvas/${canvas.id}`);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Handle joining a canvas with an invite code
  const handleJoinCanvas = async () => {
    if (!inviteCode.trim()) {
      setJoinError('Please enter an invite code.');
      return;
    }

    try {
      setLoading(true);
      setJoinError('');
      const cleanCode = inviteCode.trim();

      console.log('Attempting to join canvas using invite code via RPC:', cleanCode);
      const canvasId = await CanvasService.joinCanvasByInviteCode(cleanCode);

      if (canvasId) {
        console.log('Successfully joined canvas or already a member. Navigating to canvas ID:', canvasId);
        // Refresh the list of canvases to include the newly joined one
        // It's good practice to re-fetch the list to ensure UI consistency
        const canvasesData = await CanvasService.getUserCanvases();
        setCanvases(canvasesData);
        
        navigate(`/canvas/${canvasId}`);
        setJoinDialogOpen(false);
        setInviteCode(''); // Clear the input field after successful join
      } else {
        // This case handles if joinCanvasByInviteCode returns null (e.g., code invalid, or user already member and RPC handles it gracefully)
        setJoinError('Failed to join canvas. The invite code may be invalid, or you might already be a member. Please check the code and try again.');
        console.warn('handleJoinCanvas: CanvasService.joinCanvasByInviteCode returned null or undefined, indicating an issue or that the user is already a member.');
      }
    } catch (error) {
      console.error('Error in handleJoinCanvas:', error);
      // Display a user-friendly error message from the error object if available
      setJoinError(error.message || 'An unexpected error occurred while trying to join the canvas.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && canvases.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box 
              component="img"
              src={logo}
              alt="CollabCanvas Logo"
              sx={{ 
                height: '40px',
                width: 'auto',
                mr: 2
              }}
            />
            <Typography variant="h5" component="h1">
              Dashboard
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <UserMenu onLogout={handleLogout} />
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Left side: Canvas Options */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 4 }}>
              <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">Your Canvas Spaces</Typography>
                  
                  <ToggleButtonGroup
                    value={canvasFilter}
                    exclusive
                    onChange={(e, newFilter) => {
                      if (newFilter !== null) {
                        setCanvasFilter(newFilter);
                      }
                    }}
                    size="small"
                    aria-label="canvas filter"
                    sx={{ ml: 2 }}
                  >
                    <ToggleButton value="all" aria-label="all canvases">
                      All
                    </ToggleButton>
                    <ToggleButton 
                      value="public" 
                      aria-label="public canvases"
                      startIcon={<PublicIcon fontSize="small" />}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PublicIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Public
                      </Box>
                    </ToggleButton>
                    <ToggleButton 
                      value="private" 
                      aria-label="private canvases"
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LockIcon fontSize="small" sx={{ mr: 0.5 }} />
                        Private
                      </Box>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateDialogOpen(true)}
                    disabled={loading}
                    sx={{ minWidth: 150 }}
                  >
                    Create Canvas
                  </Button>
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={() => setJoinDialogOpen(true)}
                    disabled={loading}
                    sx={{ minWidth: 150 }}
                  >
                    Join Canvas
                  </Button>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : canvases.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'background.paper' }}>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      You don't have any canvases yet
                    </Typography>
                    <Typography variant="body2" paragraph color="textSecondary">
                      Create your first canvas or join an existing one with an invite code.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        Create Canvas
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setJoinDialogOpen(true)}
                      >
                        Join Canvas
                      </Button>
                    </Box>
                  </Paper>
                ) : (
                  <>
                    {/* Show filtered results count */}
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {canvasFilter === 'all' ? 
                            `Showing all canvases (${canvases.length})` : 
                          canvasFilter === 'public' ? 
                            `Showing public canvases (${canvases.filter(c => c.is_public).length}/${canvases.length})` : 
                            `Showing private canvases (${canvases.filter(c => !c.is_public).length}/${canvases.length})`
                          }
                        </Typography>
                      </Box>
                      {canvasFilter !== 'all' && (
                        <Chip 
                          label="Clear filter" 
                          size="small" 
                          onClick={() => setCanvasFilter('all')}
                          variant="outlined"
                          color="primary"
                        />
                      )}
                    </Box>
                    
                    <Grid container spacing={2}>
                      {canvases
                        .filter(canvas => {
                          if (canvasFilter === 'all') return true;
                          if (canvasFilter === 'public') return canvas.is_public;
                          if (canvasFilter === 'private') return !canvas.is_public;
                          return true; // Fallback
                        })
                        .map((canvas) => (
                      <Grid item xs={12} sm={6} md={4} key={canvas.id}>
                        <Card sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          transition: 'all 0.3s ease',
                          borderRadius: 2,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'divider',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 6,
                          } 
                        }}>
                          {/* Canvas Preview Area */}
                          <Box 
                            sx={{ 
                              height: 140, 
                              bgcolor: canvas.is_public ? 'primary.main' : 'background.paper',
                              position: 'relative',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              p: 2,
                              borderBottom: '1px solid',
                              borderBottomColor: 'divider',
                            }}
                          >
                            {/* Canvas preview placeholder - could be a real preview in the future */}
                            <Box sx={{ 
                              fontSize: '3rem', 
                              color: canvas.is_public ? 'primary.contrastText' : 'text.secondary',
                              opacity: 0.7
                            }}>
                              <DrawIcon fontSize="inherit" />
                            </Box>
                              
                            {/* Status badge */}
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                top: 8, 
                                right: 8,
                                bgcolor: canvas.is_public ? 'primary.main' : 'background.paper',
                                color: canvas.is_public ? 'primary.contrastText' : 'text.secondary',
                                borderRadius: '12px',
                                px: 1.5,
                                py: 0.5,
                                fontSize: '0.75rem',
                                fontWeight: 'medium',
                                display: 'flex',
                                alignItems: 'center',
                                boxShadow: 1
                              }}
                            >
                              {canvas.is_public ? (
                                <>
                                  <PublicIcon fontSize="small" sx={{ mr: 0.5 }} />
                                  Public
                                </>
                              ) : (
                                <>
                                  <LockIcon fontSize="small" sx={{ mr: 0.5 }} />
                                  Private
                                </>
                              )}
                            </Box>
                          </Box>

                          <CardContent sx={{ flexGrow: 1, p: 2 }}>
                            <Typography 
                              variant="h6" 
                              component="h2" 
                              gutterBottom 
                              noWrap
                              sx={{ fontWeight: 'bold', mb: 1 }}
                            >
                              {canvas.name}
                            </Typography>
                    
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: 0.5,
                              mb: 2,
                              color: 'text.secondary',
                              fontSize: '0.875rem'
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Created:</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {formatDate(canvas.created_at)}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Updated:</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {formatDate(canvas.updated_at)}
                                </Typography>
                              </Box>
                            </Box>
                     
                            <Divider sx={{ my: 1 }} />
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                              <Avatar 
                                src={canvas.profiles?.avatar_url} 
                                sx={{ width: 28, height: 28, mr: 1 }}
                              >
                                {canvas.profiles?.username ? canvas.profiles.username[0].toUpperCase() : 'U'}
                              </Avatar>
                              <Typography variant="body2" fontWeight="medium">
                                {canvas.profiles?.username || 'Unknown user'}
                              </Typography>
                            </Box>
                          </CardContent>
                   
                          <CardActions sx={{ px: 2, pb: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                            <Button 
                              size="medium" 
                              onClick={() => handleOpenCanvas(canvas)}
                              color="primary"
                              variant="contained"
                              sx={{
                                flexGrow: 1, 
                                mr: 1, 
                                borderRadius: '8px',
                                textTransform: 'none',
                                fontWeight: 'bold'
                              }}
                            >
                              Open Canvas
                            </Button>
                     
                            <Box>
                              {profile?.id === canvas.owner_id && (
                                <Tooltip title="Delete Canvas">
                                  <IconButton 
                                    size="medium"
                                    color="error"
                                    sx={{
                                      bgcolor: 'error.light',
                                      '&:hover': { bgcolor: 'error.main' }
                                    }}
                                    onClick={() => {
                                      setSelectedCanvas(canvas);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                    </Grid>
                  </>
                )}
              </Paper>
            </Box>
          </Grid>

          {/* Right side: Community Chat */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ 
              height: '600px', 
              maxHeight: '600px',
              p: 0, 
              borderRadius: 2, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <CommunityChat />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Create Canvas Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onClose={() => setCreateDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
            width: '100%',
            maxWidth: '450px',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          pt: 2.5,
          fontWeight: 'bold',
          color: 'primary.main' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DrawIcon sx={{ mr: 1.5 }} />
            Create New Canvas
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Give your canvas a name and choose its privacy setting.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Canvas Name"
            placeholder="My Amazing Project"
            fullWidth
            value={newCanvasName}
            onChange={(e) => setNewCanvasName(e.target.value)}
            sx={{ 
              mt: 1,
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EditIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium' }}>
            Privacy Setting
          </Typography>
          
          <Box sx={{
            display: 'flex',
            gap: 2,
            '& .MuiButton-root': {
              flexGrow: 1,
              py: 1,
              borderRadius: 1.5,
              justifyContent: 'flex-start',
              border: '1px solid',
              borderColor: 'divider',
            }
          }}>
            <Button
              variant={isPublic ? "outlined" : "contained"}
              onClick={() => setIsPublic(false)}
              startIcon={<LockIcon />}
              sx={{
                bgcolor: !isPublic ? 'primary.main' : 'transparent',
                color: !isPublic ? 'primary.contrastText' : 'text.primary',
              }}
            >
              Private
            </Button>
            <Button
              variant={isPublic ? "contained" : "outlined"}
              onClick={() => setIsPublic(true)}
              startIcon={<PublicIcon />}
              sx={{
                bgcolor: isPublic ? 'primary.main' : 'transparent',
                color: isPublic ? 'primary.contrastText' : 'text.primary',
              }}
            >
              Public
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setCreateDialogOpen(false)}
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'medium',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCanvas} 
            color="primary"
            variant="contained"
            disabled={!newCanvasName.trim()}
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 2
            }}
          >
            Create Canvas
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Canvas Dialog */}
      <Dialog 
        open={joinDialogOpen} 
        onClose={() => setJoinDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
            width: '100%',
            maxWidth: '450px',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          pt: 2.5,
          fontWeight: 'bold',
          color: 'primary.main' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PeopleIcon sx={{ mr: 1.5 }} />
            Join Canvas
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ mb: 2, color: 'text.secondary' }}>
            Enter the invite code provided by the canvas owner.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Invite Code"
            placeholder="Enter code..."
            fullWidth
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            error={!!joinError}
            helperText={joinError}
            sx={{ 
              mt: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <KeyIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setJoinDialogOpen(false)}
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'medium',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleJoinCanvas} 
            color="primary"
            variant="contained"
            disabled={!inviteCode.trim()}
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 2
            }}
          >
            Join Canvas
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Canvas Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 3,
            width: '100%',
            maxWidth: '450px',
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          pt: 2.5,
          fontWeight: 'bold',
          color: 'error.main' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DeleteIcon sx={{ mr: 1.5 }} />
            Delete Canvas
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <DialogContentText sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete <strong>"{selectedCanvas?.name}"</strong>?
          </DialogContentText>
          <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
            This action cannot be undone. All canvas data, elements, and messages will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'medium',
              px: 2
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteCanvas} 
            color="error"
            variant="contained"
            sx={{ 
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 'bold',
              px: 2
            }}
          >
            Delete Canvas
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CanvasDashboard;
