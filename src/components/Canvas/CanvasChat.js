import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { sendChatMessage, subscribeToChatMessages } from '../../lib/realtime';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';

const CanvasChat = ({ canvasId, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatChannel, setChatChannel] = useState(null);
  const messagesEndRef = useRef(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await ProfileService.getCurrentProfile();
        setProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!canvasId || !user) return;
    
    // Message handler
    const handleMessage = (payload) => {
      const newMessage = payload.payload;
      setMessages(prev => [...prev, newMessage]);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };
    
    // Subscribe to chat messages
    const channel = subscribeToChatMessages(canvasId, handleMessage);
    setChatChannel(channel);
    
    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [canvasId, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send a chat message
  const handleSendMessage = async () => {
    if (!message.trim() || !canvasId || !user || !profile) return;
    
    try {
      const messageData = {
        user_id: user.id,
        username: profile.username || 'Anonymous',
        avatar_url: profile.avatar_url,
        text: message.trim(),
        timestamp: new Date().toISOString(),
      };
      
      await sendChatMessage(canvasId, messageData);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group messages by sender
  const groupedMessages = messages.reduce((groups, message) => {
    const lastGroup = groups[groups.length - 1];
    
    if (
      lastGroup && 
      lastGroup.user_id === message.user_id &&
      // If messages are within 5 minutes of each other
      new Date(message.timestamp) - new Date(lastGroup.messages[lastGroup.messages.length - 1].timestamp) < 5 * 60 * 1000
    ) {
      // Add to existing group
      lastGroup.messages.push(message);
    } else {
      // Create new group
      groups.push({
        user_id: message.user_id,
        username: message.username,
        avatar_url: message.avatar_url,
        messages: [message],
      });
    }
    
    return groups;
  }, []);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        maxHeight: 500,
        borderRadius: 2,
      }}
    >
      {/* Chat Header */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ChatIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Canvas Chat</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: 'background.default',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', color: 'text.secondary', py: 3 }}>
            <Typography variant="body2">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%', px: 0 }}>
            {groupedMessages.map((group, index) => {
              const isCurrentUser = group.user_id === user?.id;
              
              return (
                <ListItem
                  key={index}
                  alignItems="flex-start"
                  sx={{ 
                    flexDirection: isCurrentUser ? 'row-reverse' : 'row',
                    px: 0,
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: isCurrentUser ? 0 : 48, mx: 1 }}>
                    {!isCurrentUser && (
                      <Avatar src={group.avatar_url}>
                        {group.username ? group.username[0].toUpperCase() : 'A'}
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: isCurrentUser ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                    }}
                  >
                    {!isCurrentUser && (
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {group.username}
                      </Typography>
                    )}
                    
                    {group.messages.map((message, msgIndex) => (
                      <Box 
                        key={msgIndex}
                        sx={{
                          mb: 0.5,
                          p: 1.5,
                          backgroundColor: isCurrentUser ? 'primary.main' : 'background.paper',
                          color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2,
                          boxShadow: 1,
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        <Typography variant="body1">{message.text}</Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            display: 'block', 
                            textAlign: 'right',
                            mt: 0.5,
                            opacity: 0.7,
                          }}
                        >
                          {formatTimestamp(message.timestamp)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </ListItem>
              );
            })}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>
      
      <Divider />
      
      {/* Message Input */}
      <Box 
        sx={{ 
          p: 2, 
          backgroundColor: 'background.paper',
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
        }}
      >
        <TextField
          fullWidth
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          variant="outlined"
          size="small"
          multiline
          maxRows={3}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || loading}
                  color="primary"
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Paper>
  );
};

export default CanvasChat; 