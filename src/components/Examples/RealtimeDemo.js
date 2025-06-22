import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabase';
import { subscribeToCanvas } from '../../lib/realtime';
import { CanvasService } from '../../services/canvasService';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  TextField,
  Chip
} from '@mui/material';

const RealtimeDemo = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [canvases, setCanvases] = useState([]);
  const [selectedCanvas, setSelectedCanvas] = useState(null);
  const [canvasElements, setCanvasElements] = useState([]);
  const [collaborators, setCollaborators] = useState([]);

  const [elementText, setElementText] = useState('');
  const [subscription, setSubscription] = useState(null);

  // Load user profile and canvases
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Get user profile
        const profileData = await ProfileService.getCurrentProfile();
        setProfile(profileData);
        
        // Get user's canvases
        const canvasesData = await CanvasService.getUserCanvases();
        setCanvases(canvasesData || []);
        
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Load canvas data when a canvas is selected
  useEffect(() => {
    const loadCanvasData = async () => {
      if (!selectedCanvas) return;
      
      try {
        setLoading(true);
        
        // Get canvas elements
        const elementsData = await CanvasService.getCanvasElements(selectedCanvas.id);
        setCanvasElements(elementsData || []);
        
        // Get collaborators
        const collaboratorsData = await CanvasService.getCollaborators(selectedCanvas.id);
        setCollaborators(collaboratorsData || []);
        
      } catch (error) {
        console.error('Error loading canvas data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCanvasData();
  }, [selectedCanvas]);

  // Setup realtime subscriptions when a canvas is selected
  useEffect(() => {
    if (!selectedCanvas || !user || !profile) return;
    
    // Unsubscribe from previous subscriptions
    if (subscription) {
      subscription.unsubscribe();
    }
    
    // Handler for element changes
    const handleElementChange = (payload) => {
      console.log('Element change:', payload);
      
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT') {
        setCanvasElements(prev => [...prev, newRecord]);
      } else if (eventType === 'UPDATE') {
        setCanvasElements(prev => 
          prev.map(el => el.id === newRecord.id ? newRecord : el)
        );
      } else if (eventType === 'DELETE') {
        setCanvasElements(prev => 
          prev.filter(el => el.id !== oldRecord.id)
        );
      }
    };
    
    // Subscribe to canvas changes
    const newSubscription = subscribeToCanvas(
      selectedCanvas.id,
      handleElementChange
    );

    setSubscription(newSubscription);
    
    // Cleanup on unmount
    return () => {
      if (newSubscription) {
        newSubscription.unsubscribe();
      }
    };
  }, [selectedCanvas, user, profile]);

  // Create a new canvas
  const handleCreateCanvas = async () => {
    try {
      setLoading(true);
      
      const newCanvas = await CanvasService.createCanvas({
        name: `Canvas ${Math.floor(Math.random() * 1000)}`,
        isPublic: false
      });
      
      setCanvases(prev => [...prev, newCanvas]);
      setSelectedCanvas(newCanvas);
      
    } catch (error) {
      console.error('Error creating canvas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add an element to the canvas
  const handleAddElement = async () => {
    if (!selectedCanvas || !elementText) return;
    
    try {
      setLoading(true);
      
      await CanvasService.addElement(selectedCanvas.id, {
        type: 'text',
        data: {
          text: elementText,
          x: Math.random() * 400,
          y: Math.random() * 400
        }
      });
      
      setElementText('');
      
    } catch (error) {
      console.error('Error adding element:', error);
    } finally {
      setLoading(false);
    }
  };



  if (!user) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Please sign in to use this feature</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Realtime Collaboration Demo</Typography>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {!loading && (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Your Canvases</Typography>
            
            {canvases.length === 0 ? (
              <Typography variant="body2">You don't have any canvases yet</Typography>
            ) : (
              <List>
                {canvases.map(canvas => (
                  <ListItem 
                    key={canvas.id}
                    button
                    selected={selectedCanvas?.id === canvas.id}
                    onClick={() => setSelectedCanvas(canvas)}
                  >
                    <ListItemText 
                      primary={canvas.name} 
                      secondary={`Created: ${new Date(canvas.created_at).toLocaleDateString()}`} 
                    />
                  </ListItem>
                ))}
              </List>
            )}
            
            <Button 
              variant="contained" 
              onClick={handleCreateCanvas}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              Create New Canvas
            </Button>
          </Box>
          
          {selectedCanvas && (
            <>
              <Typography variant="h6" gutterBottom>
                Canvas: {selectedCanvas.name}
              </Typography>
              

              
              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                Canvas Elements
              </Typography>
              
              {canvasElements.length === 0 ? (
                <Typography variant="body2">This canvas has no elements yet</Typography>
              ) : (
                <List dense>
                  {canvasElements.map(element => (
                    <ListItem key={element.id}>
                      <ListItemAvatar>
                        <Avatar>
                          {element.element_type.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={element.data.text || element.element_type} 
                        secondary={`Added by: ${element.profiles?.username || 'Unknown'}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <TextField
                  label="Element Text"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={elementText}
                  onChange={(e) => setElementText(e.target.value)}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAddElement}
                  disabled={loading || !elementText}
                >
                  Add Element
                </Button>
              </Box>
            </>
          )}
        </>
      )}
    </Paper>
  );
};

export default RealtimeDemo; 