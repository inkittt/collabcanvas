import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/collabcanvas-logo-with-text.svg';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Paper,
  Divider,
  Stack,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
  Card,
  CardContent,
  Fade,
  Slide,
  Zoom,
} from '@mui/material';
import {
  Draw as DrawIcon,
  Groups as GroupsIcon,
  Share as ShareIcon,
  Brush as BrushIcon,
  EmojiEmotions as EmojiIcon,
  ChatBubble as ChatIcon,
  Palette as PaletteIcon,
  PersonAdd as PersonAddIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  GroupAdd as GroupAddIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  CloudSync as CloudSyncIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';

const featureList = [
  {
    title: 'Real-time Collaboration',
    description: 'Work with teammates in real-time, see changes as they happen, and communicate through integrated chat.',
    icon: <GroupsIcon fontSize="large" color="primary" />,
  },
  {
    title: 'Intuitive Drawing Tools',
    description: 'Express your ideas with our simple yet powerful drawing tools, designed for both artists and non-artists.',
    icon: <BrushIcon fontSize="large" color="primary" />,
  },
  {
    title: 'Easy Sharing',
    description: 'Share your canvas with team members, friends, or clients with a simple invite code system.',
    icon: <ShareIcon fontSize="large" color="primary" />,
  },
  {
    title: 'Creative Expression',
    description: 'Let your creativity flow with a variety of tools, colors, and shapes to visualize your ideas.',
    icon: <EmojiIcon fontSize="large" color="primary" />,
  },
];

// Statistics data
const statsData = [
  { label: 'Active Users', value: 12500, icon: <GroupsIcon />, suffix: '+' },
  { label: 'Canvases Created', value: 45000, icon: <BrushIcon />, suffix: '+' },
  { label: 'Teams Collaborating', value: 3200, icon: <ShareIcon />, suffix: '+' },
  { label: 'Countries Reached', value: 85, icon: <TrendingUpIcon />, suffix: '+' },
];

// Testimonials data
const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Designer',
    company: 'TechFlow Inc.',
    content: 'CollabCanvas has revolutionized how our design team collaborates. The real-time features are incredible!',
    avatar: 'SC',
    rating: 5,
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Creative Director',
    company: 'Pixel Studios',
    content: 'The intuitive interface and powerful tools make brainstorming sessions so much more productive.',
    avatar: 'MR',
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'UX Researcher',
    company: 'InnovateLab',
    content: 'Perfect for remote workshops. Our team loves the seamless collaboration experience.',
    avatar: 'EW',
    rating: 5,
  },
];

// Enhanced features for showcase
const enhancedFeatures = [
  {
    title: 'Lightning Fast',
    description: 'Optimized performance with sub-100ms response times',
    icon: <SpeedIcon fontSize="large" color="primary" />,
    color: '#FF6B6B',
  },
  {
    title: 'Secure & Private',
    description: 'Enterprise-grade security with end-to-end encryption',
    icon: <SecurityIcon fontSize="large" color="primary" />,
    color: '#4ECDC4',
  },
  {
    title: 'Cloud Sync',
    description: 'Automatic saving and synchronization across all devices',
    icon: <CloudSyncIcon fontSize="large" color="primary" />,
    color: '#45B7D1',
  },
  {
    title: 'AI-Powered',
    description: 'Smart suggestions and auto-completion for faster workflows',
    icon: <AutoAwesomeIcon fontSize="large" color="primary" />,
    color: '#96CEB4',
  },
];

const IntroductionPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State for animations and interactions
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [animatedStats, setAnimatedStats] = useState(statsData.map(() => 0));
  const [isVisible, setIsVisible] = useState(false);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  // Animate statistics counters
  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      statsData.forEach((stat, index) => {
        const increment = stat.value / 50;
        let current = 0;
        const counter = setInterval(() => {
          current += increment;
          if (current >= stat.value) {
            current = stat.value;
            clearInterval(counter);
          }
          setAnimatedStats(prev => {
            const newStats = [...prev];
            newStats[index] = Math.floor(current);
            return newStats;
          });
        }, 30);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      pt: { xs: 4, md: 8 },
      pb: 10,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(63, 81, 181, 0.1), rgba(63, 81, 181, 0.05))',
            animation: 'float 6s ease-in-out infinite',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '60%',
            right: '10%',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(156, 39, 176, 0.1), rgba(156, 39, 176, 0.05))',
            animation: 'float 8s ease-in-out infinite reverse',
          },
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
            '50%': { transform: 'translateY(-20px) rotate(180deg)' },
          },
        }}
      />

      {/* Hero Section */}
      <Container maxWidth="lg">
        <Grid container spacing={4} alignItems="center" sx={{ mb: 8 }}>
          <Grid item xs={12} md={6}>
            <Box 
              component="img"
              src={logo}
              alt="CollabCanvas Logo"
              sx={{ 
                maxWidth: '100%',
                height: 'auto',
                mb: 3,
                maxHeight: '120px'
              }}
            />
            <Typography 
              variant="h5" 
              component="h2" 
              gutterBottom
              sx={{ mb: 3, color: 'text.primary' }}
            >
              Collaborative drawing and brainstorming in real-time
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              paragraph
              sx={{ mb: 4 }}
            >
              CollabCanvas is a powerful platform for teams to collaborate visually. Create, share, and edit canvases together in real-time. Perfect for brainstorming, planning, teaching, or just having fun with friends.
            </Typography>
            <Button 
              variant="contained" 
              size="large" 
              onClick={handleGetStarted}
              sx={{ 
                py: 1.5, 
                px: 4, 
                borderRadius: 2,
                fontSize: '1.1rem',
                boxShadow: 4
              }}
              startIcon={<DrawIcon />}
            >
              Get Started
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'relative' }}>
              {/* Interactive Demo Preview */}
              <Paper
                elevation={8}
                sx={{
                  p: 3,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 400,
                }}
              >
                {/* Mock Canvas Interface */}
                <Box sx={{
                  bgcolor: 'white',
                  borderRadius: 2,
                  p: 2,
                  mb: 2,
                  boxShadow: 2,
                  position: 'relative'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Live Canvas Preview
                  </Typography>

                  {/* Mock drawing area */}
                  <Box sx={{
                    height: 200,
                    bgcolor: '#fafafa',
                    borderRadius: 1,
                    position: 'relative',
                    border: '2px dashed #e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {/* Animated drawing elements */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: '20%',
                        left: '15%',
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        border: '3px solid #3f51b5',
                        animation: 'drawCircle 3s ease-in-out infinite',
                        '@keyframes drawCircle': {
                          '0%': {
                            strokeDasharray: '0 188',
                            transform: 'rotate(0deg)'
                          },
                          '50%': {
                            strokeDasharray: '94 94',
                            transform: 'rotate(180deg)'
                          },
                          '100%': {
                            strokeDasharray: '188 0',
                            transform: 'rotate(360deg)'
                          },
                        },
                      }}
                    />

                    <Box
                      sx={{
                        position: 'absolute',
                        top: '60%',
                        right: '20%',
                        width: '80px',
                        height: '40px',
                        bgcolor: '#9c27b0',
                        borderRadius: 1,
                        animation: 'fadeInOut 4s ease-in-out infinite',
                        '@keyframes fadeInOut': {
                          '0%, 100%': { opacity: 0, transform: 'scale(0.8)' },
                          '50%': { opacity: 1, transform: 'scale(1)' },
                        },
                      }}
                    />

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        position: 'absolute',
                        animation: 'typewriter 6s steps(40) infinite',
                        '@keyframes typewriter': {
                          '0%': { width: '0' },
                          '50%': { width: '100%' },
                          '100%': { width: '0' },
                        },
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        borderRight: '2px solid #3f51b5',
                      }}
                    >
                      Real-time collaboration in action...
                    </Typography>
                  </Box>
                </Box>

                {/* Mock user avatars */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Active collaborators:
                  </Typography>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#3f51b5', fontSize: '0.7rem' }}>A</Avatar>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#9c27b0', fontSize: '0.7rem' }}>B</Avatar>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#4caf50', fontSize: '0.7rem' }}>C</Avatar>
                  <Chip
                    label="+2 more"
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '0.7rem',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                </Box>

                {/* Mock toolbar */}
                <Box sx={{
                  display: 'flex',
                  gap: 1,
                  p: 1,
                  bgcolor: 'rgba(255,255,255,0.8)',
                  borderRadius: 1,
                  backdropFilter: 'blur(10px)'
                }}>
                  <Box sx={{ width: 24, height: 24, bgcolor: '#f44336', borderRadius: '50%' }} />
                  <Box sx={{ width: 24, height: 24, bgcolor: '#2196f3', borderRadius: '50%' }} />
                  <Box sx={{ width: 24, height: 24, bgcolor: '#4caf50', borderRadius: '50%' }} />
                  <Box sx={{ width: 24, height: 24, bgcolor: '#ff9800', borderRadius: '50%' }} />
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>

        {/* Statistics Section */}
        <Fade in={isVisible} timeout={1000}>
          <Paper
            elevation={3}
            sx={{
              p: 4,
              mt: 8,
              mb: 8,
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(63, 81, 181, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
              border: '1px solid rgba(63, 81, 181, 0.1)'
            }}
          >
            <Typography
              variant="h5"
              component="h2"
              align="center"
              gutterBottom
              sx={{ mb: 4, fontWeight: 'bold' }}
            >
              Trusted by Teams Worldwide
            </Typography>
            <Grid container spacing={4}>
              {statsData.map((stat, index) => (
                <Grid item xs={6} md={3} key={index}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      mb: 1,
                      color: 'primary.main'
                    }}>
                      {stat.icon}
                    </Box>
                    <Typography
                      variant="h4"
                      component="div"
                      fontWeight="bold"
                      color="primary.main"
                    >
                      {animatedStats[index].toLocaleString()}{stat.suffix}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Fade>

        {/* Feature Section */}
        <Typography 
          variant="h4" 
          component="h2" 
          align="center" 
          gutterBottom
          sx={{ mb: 6, mt: 8 }}
        >
          Why Choose CollabCanvas?
        </Typography>
        
        <Grid container spacing={4}>
          {featureList.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6
                  }
                }}
              >
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Enhanced Features Section */}
        <Box sx={{ mt: 12, mb: 8 }}>
          <Typography
            variant="h4"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6 }}
          >
            Why Teams Choose Us
          </Typography>

          <Grid container spacing={4}>
            {enhancedFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Zoom in={isVisible} timeout={1000 + index * 200}>
                  <Card
                    elevation={2}
                    sx={{
                      height: '100%',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 8,
                        '& .feature-icon': {
                          transform: 'scale(1.1) rotate(5deg)',
                        }
                      },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: feature.color,
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3, textAlign: 'center' }}>
                      <Box
                        className="feature-icon"
                        sx={{
                          mb: 2,
                          transition: 'transform 0.3s ease',
                          color: feature.color
                        }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography variant="h6" gutterBottom fontWeight="bold">
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Testimonials Section */}
        <Box sx={{ mt: 12, mb: 8 }}>
          <Typography
            variant="h4"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6 }}
          >
            What Our Users Say
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Card
              elevation={4}
              sx={{
                maxWidth: 600,
                p: 4,
                borderRadius: 4,
                position: 'relative',
                background: 'linear-gradient(135deg, rgba(63, 81, 181, 0.02) 0%, rgba(156, 39, 176, 0.02) 100%)',
              }}
            >
              <Fade in={true} key={currentTestimonial} timeout={500}>
                <Box>
                  <Box sx={{ display: 'flex', mb: 2 }}>
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <StarIcon key={i} sx={{ color: '#FFD700', fontSize: '1.2rem' }} />
                    ))}
                  </Box>
                  <Typography
                    variant="body1"
                    paragraph
                    sx={{
                      fontStyle: 'italic',
                      fontSize: '1.1rem',
                      lineHeight: 1.6,
                      mb: 3
                    }}
                  >
                    "{testimonials[currentTestimonial].content}"
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.main',
                        mr: 2,
                        width: 48,
                        height: 48
                      }}
                    >
                      {testimonials[currentTestimonial].avatar}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {testimonials[currentTestimonial].name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {testimonials[currentTestimonial].role} at {testimonials[currentTestimonial].company}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Fade>

              {/* Testimonial indicators */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1 }}>
                {testimonials.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: index === currentTestimonial ? 'primary.main' : 'grey.300',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => setCurrentTestimonial(index)}
                  />
                ))}
              </Box>
            </Card>
          </Box>
        </Box>

        {/* How It Works Section */}
        <Box sx={{ mt: 12, mb: 10, position: 'relative' }}>
          <Box 
            sx={{ 
              position: 'absolute', 
              width: '100%', 
              height: '60%', 
              backgroundColor: 'rgba(63, 81, 181, 0.03)', 
              top: '20%', 
              left: 0,
              zIndex: -1,
              borderRadius: 4
            }} 
          />

          <Typography 
            variant="h4" 
            component="h2" 
            align="center" 
            gutterBottom
            sx={{ 
              mb: 6, 
              position: 'relative',
              '&:after': {
                content: '""',
                position: 'absolute',
                bottom: -15,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 80,
                height: 4,
                backgroundColor: 'primary.main',
                borderRadius: 4
              }
            }}
          >
            How It Works
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                    '& .step-number': {
                      backgroundColor: 'primary.main',
                      color: 'white'
                    }
                  }
                }}
              >
                <Box 
                  className="step-number"
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                  }}
                >
                  1
                </Box>
                <Box sx={{ 
                  width: '100%',
                  height: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <PersonAddIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.8 }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">Sign Up</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Create your account in seconds, no credit card required.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                    '& .step-number': {
                      backgroundColor: 'primary.main',
                      color: 'white'
                    }
                  }
                }}
              >
                <Box 
                  className="step-number"
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                  }}
                >
                  2
                </Box>
                <Box sx={{ 
                  width: '100%',
                  height: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <AddCircleOutlineIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.8 }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">Create Canvas</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Start with a blank canvas or choose from templates.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                    '& .step-number': {
                      backgroundColor: 'primary.main',
                      color: 'white'
                    }
                  }
                }}
              >
                <Box 
                  className="step-number"
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                  }}
                >
                  3
                </Box>
                <Box sx={{ 
                  width: '100%',
                  height: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <GroupAddIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.8 }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">Invite Others</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Share your canvas with teammates using an invite code.
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 6,
                    '& .step-number': {
                      backgroundColor: 'primary.main',
                      color: 'white'
                    }
                  }
                }}
              >
                <Box 
                  className="step-number"
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    backgroundColor: 'primary.light',
                    color: 'primary.main',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    mb: 2,
                    fontSize: '1.1rem',
                    transition: 'all 0.3s ease',
                  }}
                >
                  4
                </Box>
                <Box sx={{ 
                  width: '100%',
                  height: 100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2
                }}>
                  <BrushIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.8 }} />
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">Collaborate</Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                  Draw, comment, and brainstorm together in real-time.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
        
        {/* Call To Action */}
        <Paper
          elevation={8}
          sx={{
            p: 6,
            mt: 10,
            textAlign: 'center',
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
              animation: 'pulse 4s ease-in-out infinite',
            },
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)', opacity: 0.5 },
              '50%': { transform: 'scale(1.1)', opacity: 0.8 },
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              color="white"
              sx={{ fontWeight: 'bold', mb: 2 }}
            >
              Ready to Start Collaborating?
            </Typography>
            <Typography
              variant="body1"
              paragraph
              sx={{
                mb: 4,
                color: 'rgba(255,255,255,0.9)',
                fontSize: '1.1rem',
                maxWidth: '600px',
                mx: 'auto'
              }}
            >
              Join thousands of teams already using CollabCanvas for their visual collaboration needs.
              Start your creative journey today!
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Button
                variant="contained"
                size="large"
                color="secondary"
                onClick={handleGetStarted}
                sx={{
                  py: 1.5,
                  px: 4,
                  borderRadius: 3,
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                  }
                }}
                startIcon={<DrawIcon />}
              >
                Get Started Now
              </Button>

              <Chip
                label="Free Forever"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  px: 2,
                  py: 1,
                  '& .MuiChip-label': {
                    fontSize: '0.9rem'
                  }
                }}
                icon={<StarIcon sx={{ color: '#FFD700 !important' }} />}
              />
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default IntroductionPage;
