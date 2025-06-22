import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { CanvasService } from '../../services/canvasService';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

const CanvasCollaborators = ({ canvasId, canvasOwnerId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [permissionLevel, setPermissionLevel] = useState('viewer');
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is the owner
  useEffect(() => {
    if (user && canvasOwnerId) {
      setIsOwner(user.id === canvasOwnerId);
    }
  }, [user, canvasOwnerId]);

  // Load collaborators
  useEffect(() => {
    const loadCollaborators = async () => {
      if (!canvasId) return;
      
      try {
        setLoading(true);
        const data = await CanvasService.getCollaborators(canvasId);
        setCollaborators(data || []);
      } catch (error) {
        console.error('Error loading collaborators:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCollaborators();
  }, [canvasId]);

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    
    try {
      setSearching(true);
      const results = await ProfileService.searchUsers(searchQuery);
      
      // Filter out users who are already collaborators or the owner
      const filteredResults = results.filter(result => {
        const isAlreadyCollaborator = collaborators.some(
          collab => collab.profiles?.id === result.id
        );
        const isCanvasOwner = result.id === canvasOwnerId;
        
        return !isAlreadyCollaborator && !isCanvasOwner;
      });
      
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  // Add a collaborator
  const handleAddCollaborator = async () => {
    if (!selectedUser || !canvasId) return;
    
    try {
      setLoading(true);
      
      const newCollaborator = await CanvasService.addCollaborator(
        canvasId,
        selectedUser.id,
        permissionLevel
      );
      
      // Add user profile data to the new collaborator
      const collaboratorWithProfile = {
        ...newCollaborator,
        profiles: selectedUser,
      };
      
      setCollaborators(prev => [...prev, collaboratorWithProfile]);
      
      // Reset state
      setAddDialogOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setSearchResults([]);
      setPermissionLevel('viewer');
      
    } catch (error) {
      console.error('Error adding collaborator:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update collaborator permissions
  const handleUpdatePermission = async (collaboratorId, newPermission) => {
    try {
      setLoading(true);
      
      const updatedCollaborator = await CanvasService.updateCollaboratorPermission(
        collaboratorId,
        newPermission
      );
      
      setCollaborators(prev => 
        prev.map(collab => 
          collab.id === collaboratorId 
            ? { ...collab, permission_level: newPermission } 
            : collab
        )
      );
      
    } catch (error) {
      console.error('Error updating collaborator permission:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove a collaborator
  const handleRemoveCollaborator = async (collaboratorId) => {
    try {
      setLoading(true);
      
      await CanvasService.removeCollaborator(collaboratorId);
      
      setCollaborators(prev => 
        prev.filter(collab => collab.id !== collaboratorId)
      );
      
    } catch (error) {
      console.error('Error removing collaborator:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && collaborators.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Collaborators</Typography>
        {isOwner && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Collaborator
          </Button>
        )}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <List>
        {/* Canvas Owner */}
        <ListItem>
          <ListItemAvatar>
            <Chip 
              label="OWNER" 
              color="primary" 
              size="small" 
              sx={{ fontSize: '0.6rem' }}
            />
          </ListItemAvatar>
          <ListItemText 
            primary={collaborators.find(c => c.profiles?.id === canvasOwnerId)?.profiles?.username || 'Unknown'}
            secondary="Full access"
          />
        </ListItem>
        
        <Divider component="li" />
        
        {/* Collaborators */}
        {collaborators.length === 0 ? (
          <ListItem>
            <ListItemText 
              primary="No collaborators yet" 
              secondary="Add collaborators to work together on this canvas" 
            />
          </ListItem>
        ) : (
          collaborators.map(collaborator => {
            // Skip the owner as they are already displayed
            if (collaborator.profiles?.id === canvasOwnerId) return null;
            
            return (
              <ListItem key={collaborator.id}>
                <ListItemAvatar>
                  <Avatar src={collaborator.profiles?.avatar_url}>
                    {collaborator.profiles?.username ? collaborator.profiles.username[0].toUpperCase() : 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={collaborator.profiles?.username || 'Unknown user'} 
                  secondary={
                    collaborator.permission_level === 'editor' 
                      ? 'Can edit canvas' 
                      : 'Can view canvas'
                  }
                />
                {isOwner && (
                  <ListItemSecondaryAction>
                    <FormControl variant="standard" size="small" sx={{ minWidth: 100, mr: 1 }}>
                      <Select
                        value={collaborator.permission_level}
                        onChange={(e) => handleUpdatePermission(collaborator.id, e.target.value)}
                        disabled={loading}
                      >
                        <MenuItem value="viewer">Viewer</MenuItem>
                        <MenuItem value="editor">Editor</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton 
                      edge="end" 
                      onClick={() => handleRemoveCollaborator(collaborator.id)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            );
          })
        )}
      </List>

      {/* Add Collaborator Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
        <DialogTitle>Add Collaborator</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 2 }}>
            <TextField
              label="Search by username"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              sx={{ mr: 1 }}
            />
            <IconButton 
              onClick={handleSearch}
              disabled={searchQuery.length < 3 || searching}
            >
              {searching ? <CircularProgress size={24} /> : <SearchIcon />}
            </IconButton>
          </Box>
          
          <List sx={{ maxHeight: 300, overflow: 'auto' }}>
            {searchResults.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary="No users found" 
                  secondary={
                    searchQuery.length < 3 
                      ? "Type at least 3 characters to search" 
                      : "Try a different search term"
                  } 
                />
              </ListItem>
            ) : (
              searchResults.map(user => (
                <ListItem 
                  key={user.id}
                  button
                  selected={selectedUser?.id === user.id}
                  onClick={() => setSelectedUser(user)}
                >
                  <ListItemAvatar>
                    <Avatar src={user.avatar_url}>
                      {user.username ? user.username[0].toUpperCase() : 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={user.username} />
                </ListItem>
              ))
            )}
          </List>
          
          {selectedUser && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Permission</InputLabel>
              <Select
                value={permissionLevel}
                label="Permission"
                onChange={(e) => setPermissionLevel(e.target.value)}
              >
                <MenuItem value="viewer">Viewer (can only view)</MenuItem>
                <MenuItem value="editor">Editor (can make changes)</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddCollaborator} 
            color="primary"
            disabled={!selectedUser}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CanvasCollaborators; 