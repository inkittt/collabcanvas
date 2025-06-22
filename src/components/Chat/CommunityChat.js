import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  List,
  ListItem,
} from '@mui/material';
import { Send as SendIcon, QuestionAnswer as ChatIcon } from '@mui/icons-material';

const CommunityChat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);
  const messagesEndRef = useRef(null);

  // Database setup function
  const setupDatabase = async () => {
    if (!user) return false;
    
    try {
      // Create profile if it doesn't exist (fixes RLS policy issues)
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        // Create the profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            username: user.email ? user.email.split('@')[0] : `user_${user.id.substring(0, 6)}`,
            created_at: new Date().toISOString()
          }]);
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
          return false;
        }
      }
      
      // Check if community_messages table exists by directly querying it
      // instead of using the missing rpc function
      try {
        const { data, error } = await supabase
          .from('community_messages')
          .select('id')
          .limit(1);
          
        if (error && error.code === 'PGRST116') {
          // Table doesn't exist, we could create it here if needed
          console.log('Community messages table does not exist yet');
          
          // Optionally create the table - uncomment if you want to create it
          // const { error: createError } = await supabase.rpc('create_community_messages_table');
          // if (createError) {
          //   console.error('Error creating community_messages table:', createError);
          //   return false;
          // }
        }
      } catch (tableErr) {
        console.warn('Error checking community_messages table existence, but continuing:', tableErr);
        // Continue anyway as the table might exist but have other issues
      }
      
      return true;
    } catch (err) {
      console.error('Error setting up database:', err);
      return false;
    }
  };
  
  // Load messages function
  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user profile
      if (user) {
        try {
          // Try to directly query the profile
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (!profileError && userProfile) {
            setProfile(userProfile);
          } else {
            // Fall back to the ProfileService
            const serviceProfile = await ProfileService.getCurrentProfile();
            setProfile(serviceProfile);
          }
        } catch (profileError) {
          console.error('Error loading user profile:', profileError);
        }
      }

      // Try two different approaches to get messages to handle both schema possibilities
      let messagesData = [];
      
      // Approach 1: Using the joined query (standard approach)
      const { data: joinedData, error: joinedError } = await supabase
        .from('community_messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (username, avatar_url)
        `)
        .order('created_at', { ascending: true })
        .limit(50);
        
      if (!joinedError && joinedData) {
        messagesData = joinedData;
      } else {
        // Approach 2: Simpler query without joins
        const { data: simpleData, error: simpleError } = await supabase
          .from('community_messages')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(50);
          
        if (!simpleError && simpleData) {
          // We have the messages but need to add profile info
          messagesData = simpleData;
          
          // Fetch and attach profile info for each unique user
          const userIds = [...new Set(simpleData.map(msg => msg.user_id))];
          
          if (userIds.length > 0) {
            const { data: profilesData } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds);
              
            if (profilesData) {
              const profilesMap = profilesData.reduce((map, profile) => {
                map[profile.id] = profile;
                return map;
              }, {});
              
              messagesData = simpleData.map(msg => ({
                ...msg,
                profiles: profilesMap[msg.user_id] || null
              }));
            }
          }
        } else if (simpleError) {
          throw simpleError;
        }
      }

      setMessages(messagesData);
      scrollToBottom();
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load initial messages and set up subscription
  useEffect(() => {
    // Setup database and then load messages
    if (user) {
      setupDatabase().then(success => {
        if (success) {
          console.log('Database setup successful');
        } else {
          console.warn('Database setup had issues, but continuing');
        }
        // Load messages anyway, even if setup had issues
        loadMessages();
      });
    } else {
      loadMessages();
    }

    // Subscribe to new messages
    const subscription = supabase
      .channel('community_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'community_messages'
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
  }, [user]);

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
    
    if (!newMessage.trim() || !user) return;
    
    try {
      // Check if we need to ensure profile exists first
      let profileExists = !!profile;
      
      if (!profileExists) {
        // Try to create profile if it doesn't exist
        await setupDatabase();
      }
      
      // Add message to Supabase
      const { error } = await supabase
        .from('community_messages')
        .insert({
          content: newMessage.trim(),
          user_id: user.id  // Explicitly set user_id to fix RLS issues
        });

      if (error) throw error;
      
      // Clear input
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      // Try to setup database in case that's the issue
      setupDatabase();
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
    const now = new Date();
    const date = new Date(dateString);
    
    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise return the date
    return date.toLocaleDateString();
  };

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '500px',
        width: '100%',
        position: 'relative',
        overflowY: 'auto'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        px: 2, 
        py: 1.5,
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box 
            sx={{ 
              backgroundColor: 'primary.main', 
              color: 'white',
              width: 36, 
              height: 36, 
              borderRadius: '50%',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mr: 1.5,
              boxShadow: 1
            }}
          >
            <ChatIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              Community Chat
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {messages.length} messages{messages.length > 0 ? ` · ${formatDate(messages[messages.length - 1]?.created_at || new Date())}` : ''}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {user ? `Logged in as ${profile?.username || 'user'}` : 'Sign in to chat'}
          </Typography>
          {user && profile?.avatar_url && (
            <Avatar 
              src={profile.avatar_url} 
              sx={{ width: 24, height: 24 }}
            />
          )}
        </Box>
      </Box>
      
      {/* Messages area */}
      <Box 
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f9f9fb',
          height: '380px', /* Fixed height for messages area */
          maxHeight: '380px'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading messages...
            </Typography>
          </Box>
        ) : error ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%', 
              gap: 2 
            }}
          >
            <Box sx={{ 
              bgcolor: 'error.light', 
              color: 'error.main', 
              p: 2, 
              borderRadius: 2,
              maxWidth: '80%',
              textAlign: 'center'
            }}>
              <Typography sx={{ fontWeight: 'medium' }}>{error}</Typography>
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              size="large"
              onClick={() => {
                if (user) {
                  setupDatabase().then(() => loadMessages());
                } else {
                  loadMessages();
                }
              }}
              startIcon={<ChatIcon />}
              sx={{ borderRadius: '20px', textTransform: 'none', px: 3 }}
            >
              Try Again
            </Button>
          </Box>
        ) : messages.length > 0 ? (
          messages.map((message, index) => {
            const isOwnMessage = message.user_id === user?.id;
            const showDate = index === 0 || 
              formatDate(messages[index-1].created_at) !== formatDate(message.created_at);
            
            // Check if this is a sequence of messages from the same user
            const isSequence = index > 0 && message.user_id === messages[index-1].user_id &&
              new Date(message.created_at) - new Date(messages[index-1].created_at) < 120000; // 2 minutes
            
            return (
              <React.Fragment key={message.id || `msg-${index}`}>
                {showDate && (
                  <Box sx={{ textAlign: 'center', my: 1.5 }}>
                    <Typography variant="caption" sx={{ 
                      bgcolor: 'rgba(0,0,0,0.04)',
                      px: 2.5,
                      py: 0.75,
                      borderRadius: '16px',
                      color: 'text.secondary',
                      fontWeight: 'medium',
                      fontSize: '0.75rem',
                    }}>
                      {formatDate(message.created_at)}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ 
                  alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                  display: 'flex',
                  flexDirection: 'column',
                  maxWidth: { xs: '90%', sm: '75%' },
                  mb: 1.5,
                  ml: isOwnMessage ? 0 : (isSequence ? 4 : 0),
                  mr: isOwnMessage ? (isSequence ? 4 : 0) : 0,
                }}>
                  {!isOwnMessage && !isSequence && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 1 }}>
                      <Avatar 
                        src={message.profiles?.avatar_url} 
                        sx={{ width: 28, height: 28 }}
                      >
                        {message.profiles?.username ? message.profiles.username[0].toUpperCase() : 'U'}
                      </Avatar>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                          {message.profiles?.username || 'Unknown user'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {formatTime(message.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Box sx={{ 
                    bgcolor: isOwnMessage ? '#3f51b5' : '#f8f9fa',
                    color: isOwnMessage ? '#ffffff' : '#000000',
                    p: 1.5,
                    borderRadius: '18px',
                    borderTopRightRadius: isOwnMessage && !isSequence ? '4px' : '18px',
                    borderTopLeftRadius: !isOwnMessage && !isSequence ? '4px' : '18px',
                    borderBottomRightRadius: isOwnMessage && isSequence ? '8px' : '18px',
                    borderBottomLeftRadius: !isOwnMessage && isSequence ? '8px' : '18px',
                    boxShadow: isOwnMessage 
                      ? '0 1px 2px rgba(0,0,0,0.2)' 
                      : '0 1px 4px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
                    wordBreak: 'break-word',
                    border: isOwnMessage ? 'none' : '1px solid rgba(0,0,0,0.1)',
                  }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500, 
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: 'inherit'
                      }}
                    >
                      {message.content}
                    </Typography>
                  </Box>
                  
                  {isOwnMessage && !isSequence && (
                    <Typography variant="caption" sx={{ 
                      alignSelf: 'flex-end',
                      mt: 0.5,
                      mr: 0.5,
                      color: 'text.secondary',
                      fontSize: '0.7rem'
                    }}>
                      {formatTime(message.created_at)}
                    </Typography>
                  )}
                </Box>
              </React.Fragment>
            );
          })
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              gap: 2
            }}
          >
            <Box 
              sx={{ 
                bgcolor: 'primary.light', 
                color: 'primary.main',
                width: 70,
                height: 70,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7
              }}
            >
              <ChatIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'medium' }}>
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              {user ? 'Start the conversation by typing below!' : 'Sign in to start chatting with the community.'}
            </Typography>
            {!user && (
              <Button 
                variant="outlined" 
                color="primary"
                onClick={() => navigate('/auth')}
                sx={{ mt: 1, borderRadius: 2, textTransform: 'none' }}
              >
                Sign In
              </Button>
            )}
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Message input */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        backgroundColor: 'background.paper',
        boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.05)'
      }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user && (
            <Avatar 
              src={profile?.avatar_url} 
              sx={{ width: 32, height: 32, display: { xs: 'none', sm: 'flex' } }}
            >
              {profile?.username ? profile.username[0].toUpperCase() : 'U'}
            </Avatar>
          )}
          <TextField
            variant="outlined"
            size="small"
            fullWidth
            placeholder={user ? "Type a message..." : "Sign in to participate in the chat"}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={!user}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '20px',
                backgroundColor: user ? 'rgba(0, 0, 0, 0.02)' : 'rgba(0, 0, 0, 0.03)',
                '&:hover': {
                  backgroundColor: user ? 'rgba(0, 0, 0, 0.04)' : 'rgba(0, 0, 0, 0.03)'
                }
              }
            }}
            InputProps={{
              endAdornment: (
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={!newMessage.trim() || !user}
                  sx={{ 
                    minWidth: 'unset',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    padding: 0,
                    boxShadow: 2
                  }}
                >
                  <SendIcon fontSize="small" />
                </Button>
              )
            }}
          />
        </form>
      </Box>
    </Paper>
  );
};

export default CommunityChat;
