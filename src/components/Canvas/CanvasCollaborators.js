import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { CanvasService } from '../../services/canvasService';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Typography,
  Avatar,
} from '@mui/material';
import {
  Delete as DeleteIcon,
} from '@mui/icons-material';

const CanvasCollaborators = ({ canvasId, canvasOwnerId }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [collaborators, setCollaborators] = useState([]);
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
              secondary="This canvas has no additional collaborators"
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


    </Paper>
  );
};

export default CanvasCollaborators; 