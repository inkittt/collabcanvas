import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Snackbar
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Dashboard as CanvasIcon,
  Group as GroupIcon,
  Message as MessageIcon,
  Edit as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import ProfileEditor from './ProfileEditor';

const ProfileManagement = ({ onClose }) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [safetyCheck, setSafetyCheck] = useState(null);
  const [deleteOptions, setDeleteOptions] = useState({
    deleteCanvases: false,
    confirmed: false
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await ProfileService.getCurrentProfile();
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load profile data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    try {
      setLoading(true);
      
      // Check safety first
      const safety = await ProfileService.checkProfileDeletionSafety();
      setSafetyCheck(safety);
      
      if (!safety.canDelete && !deleteOptions.deleteCanvases) {
        setDeleteDialogOpen(true);
        return;
      }
      
      // Proceed with deletion
      const result = await ProfileService.deleteProfile({
        deleteCanvases: deleteOptions.deleteCanvases,
        confirmed: true
      });
      
      setSnackbar({
        open: true,
        message: 'Profile deleted successfully. You will be signed out.',
        severity: 'success'
      });
      
      // Sign out after a brief delay
      setTimeout(() => {
        signOut();
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting profile:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to delete profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };



  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
    setEditDialogOpen(false);
  };

  if (loading && !profile) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Profile Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your profile information and account settings
          </Typography>
        </Box>

        {/* Profile Overview */}
        {profile && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Current Profile
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="body1">
                <strong>Username:</strong> {profile.username}
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {user?.email}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(profile.created_at).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ViewIcon />}
            onClick={() => setEditDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            View/Edit Profile
          </Button>

          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              ProfileService.checkProfileDeletionSafety().then(setSafetyCheck);
              setDeleteDialogOpen(true);
            }}
            sx={{ borderRadius: 2 }}
          >
            Delete Profile
          </Button>
        </Box>

        {/* Safety Information */}
        {safetyCheck && (
          <Alert severity={safetyCheck.canDelete ? "info" : "warning"} sx={{ mb: 3 }}>
            <AlertTitle>Profile Deletion Status</AlertTitle>
            {safetyCheck.canDelete ? (
              "Your profile can be safely deleted."
            ) : (
              `You have ${safetyCheck.dependencies.totalOwnedCanvases} owned canvas(es) that must be transferred or deleted first.`
            )}
          </Alert>
        )}
      </Paper>

      {/* Edit Profile Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          <ProfileEditor 
            onClose={() => setEditDialogOpen(false)}
            onUpdate={handleProfileUpdate}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Profile Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Delete Profile
        </DialogTitle>
        <DialogContent>
          {safetyCheck && (
            <>
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Warning: This action cannot be undone!</AlertTitle>
                Deleting your profile will permanently remove all your data from CollabCanvas.
              </Alert>

              {/* Dependencies Summary */}
              <Typography variant="h6" gutterBottom>
                Your Account Dependencies:
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CanvasIcon color={safetyCheck.dependencies.totalOwnedCanvases > 0 ? "warning" : "success"} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${safetyCheck.dependencies.totalOwnedCanvases} Owned Canvas(es)`}
                    secondary={safetyCheck.dependencies.totalOwnedCanvases > 0 ?
                      "These will be permanently deleted" : "No owned canvases"}
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <GroupIcon color={safetyCheck.dependencies.totalCollaborations > 0 ? "info" : "success"} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${safetyCheck.dependencies.totalCollaborations} Collaboration(s)`}
                    secondary="You will be removed from these canvases"
                  />
                </ListItem>

                <ListItem>
                  <ListItemIcon>
                    <MessageIcon color={
                      (safetyCheck.dependencies.hasCommunityMessages || safetyCheck.dependencies.hasCanvasMessages)
                        ? "info" : "success"
                    } />
                  </ListItemIcon>
                  <ListItemText
                    primary="Chat Messages"
                    secondary={
                      (safetyCheck.dependencies.hasCommunityMessages || safetyCheck.dependencies.hasCanvasMessages)
                        ? "Your messages will be deleted" : "No messages to delete"
                    }
                  />
                </ListItem>
              </List>

              {/* Owned Canvases List */}
              {safetyCheck.dependencies.ownedCanvases.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Canvases that will be deleted:
                  </Typography>
                  <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                    {safetyCheck.dependencies.ownedCanvases.map((canvas) => (
                      <Chip
                        key={canvas.id}
                        label={canvas.name}
                        color="warning"
                        size="small"
                        sx={{ m: 0.5 }}
                      />
                    ))}
                  </Box>
                </>
              )}

              {/* Deletion Options */}
              <Box sx={{ mt: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={deleteOptions.deleteCanvases}
                      onChange={(e) => setDeleteOptions({
                        ...deleteOptions,
                        deleteCanvases: e.target.checked
                      })}
                      color="error"
                    />
                  }
                  label="I understand that all my canvases will be permanently deleted"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={deleteOptions.confirmed}
                      onChange={(e) => setDeleteOptions({
                        ...deleteOptions,
                        confirmed: e.target.checked
                      })}
                      color="error"
                    />
                  }
                  label="I confirm that I want to permanently delete my profile"
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteProfile}
            color="error"
            variant="contained"
            disabled={!deleteOptions.confirmed || (!safetyCheck?.canDelete && !deleteOptions.deleteCanvases) || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {loading ? 'Deleting...' : 'Delete Profile'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProfileManagement;
