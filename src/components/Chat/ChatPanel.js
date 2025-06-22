import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Send as SendIcon, Close as CloseIcon } from '@mui/icons-material';

const ChatPanel = ({ canvasId, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const messagesEndRef = useRef(null);

  // Load initial messages and set up subscription
  useEffect(() => {
    if (!canvasId) return;

    const loadMessages = async () => {
      try {
        setLoading(true);
        
        // Get current user profile
        if (user) {
          try {
            const userProfile = await ProfileService.getCurrentProfile();
            setProfile(userProfile);
          } catch (profileError) {
            console.error('Error loading user profile:', profileError);
          }
        }

        // Get messages from Supabase
        const { data, error } = await supabase
          .from('canvas_messages')
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles:user_id (username, avatar_url)
          `)
          .eq('canvas_id', canvasId)
          .order('created_at', { ascending: true });

        if (error) {
          throw error;
        }

        setMessages(data || []);
        scrollToBottom();
      } catch (err) {
        console.error('Error loading messages:', err);
        setError('Failed to load messages. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`canvas_messages:${canvasId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'canvas_messages',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        // Format the new message to match our message structure
        const newMsg = payload.new;
        
        // Get the profile info
        supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', newMsg.user_id)
          .single()
          .then(({ data }) => {
            const formattedMessage = {
              ...newMsg,
              profiles: data
            };
            
            setMessages(prevMessages => [...prevMessages, formattedMessage]);
            scrollToBottom();
          });
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [canvasId, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send a new message
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !canvasId || !user) return;

    try {
      console.log('Sending message with:', {
        canvas_id: canvasId,
        user_id: user.id,
        content: newMessage.trim()
      });

      // Add message to Supabase
      const { error } = await supabase
        .from('canvas_messages')
        .insert({
          canvas_id: canvasId,
          content: newMessage.trim(),
          user_id: user.id  // Explicitly set user_id
        });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      // Clear input
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError(`Failed to send message: ${err.message || 'Please try again.'}`);
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '500px',
        width: '100%',
        maxWidth: '350px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
      }}>
        <Typography variant="h6">Chat</Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Messages area */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" align="center">{error}</Typography>
        ) : messages.length === 0 ? (
          <Typography color="textSecondary" align="center">
            No messages yet. Start the conversation!
          </Typography>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.user_id === user?.id;
            const showDate = index === 0 || 
              formatDate(messages[index-1].created_at) !== formatDate(message.created_at);
            
            return (
              <React.Fragment key={message.id || `msg-${index}`}>
                {showDate && (
                  <Box sx={{ textAlign: 'center', my: 1 }}>
                    <Typography variant="caption" sx={{ 
                      bgcolor: 'rgba(0,0,0,0.05)',
                      px: 2,
                      py: 0.5,
                      borderRadius: '10px',
                    }}>
                      {formatDate(message.created_at)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ 
                  alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: '75%',
                }}>
                  {!isOwnMessage && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                      <Avatar 
                        src={message.profiles?.avatar_url} 
                        sx={{ width: 24, height: 24 }}
                      >
                        {message.profiles?.username ? message.profiles.username[0].toUpperCase() : 'U'}
                      </Avatar>
                      <Typography variant="caption" color="textSecondary">
                        {message.profiles?.username || 'Unknown user'}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box sx={{ 
                    bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                    color: isOwnMessage ? 'white' : 'inherit',
                    p: 1.5,
                    borderRadius: '12px',
                    borderTopRightRadius: isOwnMessage ? '4px' : '12px',
                    borderTopLeftRadius: isOwnMessage ? '12px' : '4px',
                  }}>
                    <Typography variant="body2">{message.content}</Typography>
                  </Box>
                  
                  <Typography variant="caption" color="textSecondary" sx={{ 
                    alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                    mt: 0.5
                  }}>
                    {formatTime(message.created_at)}
                  </Typography>
                </Box>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message input */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
        backgroundColor: 'background.paper'
      }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8 }}>
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!user}
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            disabled={!newMessage.trim() || !user}
            sx={{ minWidth: 'unset' }}
          >
            <SendIcon />
          </Button>
        </form>
      </Box>
    </Paper>
  );
};

export default ChatPanel;
