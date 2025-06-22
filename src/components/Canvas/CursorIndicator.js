import React from 'react';
import { Box, Avatar } from '@mui/material';

const CursorIndicator = ({ userId, x, y, username, avatar_url, color = '#ff4444' }) => {
  // Generate a consistent color based on userId
  const generateColor = (id) => {
    const colors = [
      '#ff4444', '#44ff44', '#4444ff', '#ffaa44',
      '#ff44aa', '#44aaff', '#aaff44', '#aa44ff',
      '#ff8844', '#44ff88', '#8844ff', '#88ff44'
    ];
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const cursorColor = color === '#ff4444' ? generateColor(userId) : color;
  const userName = username || `User ${userId.slice(-4)}`;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 1000,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor pointer */}
      <Box
        sx={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: `10px solid ${cursorColor}`,
          transform: 'rotate(-45deg)',
          transformOrigin: 'center bottom',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        }}
      />
      
      {/* User label with avatar */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: 8,
          backgroundColor: cursorColor,
          color: 'white',
          padding: '2px 6px',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -3,
            left: 4,
            width: 0,
            height: 0,
            borderLeft: '3px solid transparent',
            borderRight: '3px solid transparent',
            borderBottom: `3px solid ${cursorColor}`,
          }
        }}
      >
        {avatar_url && (
          <Avatar
            src={avatar_url}
            sx={{
              width: 14,
              height: 14,
              fontSize: '8px',
              bgcolor: 'rgba(255,255,255,0.2)',
            }}
          >
            {userName[0]}
          </Avatar>
        )}
        {userName}
      </Box>
    </Box>
  );
};

export default CursorIndicator;
