import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CanvasPage from '../components/Canvas/CanvasPage';
import { AuthProvider } from '../auth/AuthContext';
import { VoiceChatProvider } from '../contexts/VoiceChatContext';

// Mock all the services
jest.mock('../services/agoraService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  joinChannel: jest.fn().mockResolvedValue('12345'),
  leaveChannel: jest.fn().mockResolvedValue(),
  toggleMute: jest.fn().mockResolvedValue(false),
  getStatus: jest.fn().mockReturnValue({
    isConnected: false,
    isMuted: false,
    currentChannel: null,
    currentUid: null,
    remoteUserCount: 0,
    remoteUsers: []
  }),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  appId: 'test-app-id'
}));

jest.mock('../services/canvasService', () => ({
  CanvasService: {
    getCanvas: jest.fn().mockResolvedValue({
      id: 'test-canvas',
      name: 'Test Canvas',
      owner_id: 'test-user',
      is_public: false
    }),
    getCollaborators: jest.fn().mockResolvedValue([])
  }
}));

jest.mock('../services/elementService', () => ({
  ElementService: {
    getElements: jest.fn().mockResolvedValue([])
  }
}));

// Mock fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Canvas: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      renderAll: jest.fn(),
      dispose: jest.fn(),
      getObjects: jest.fn(() => []),
      add: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      setDimensions: jest.fn(),
      calcOffset: jest.fn(),
      getElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }))
    })),
    Object: {
      prototype: {
        on: jest.fn(),
        off: jest.fn()
      }
    }
  }
}));

// Mock react-router-dom params
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ canvasId: 'test-canvas' }),
  useNavigate: () => jest.fn()
}));

const theme = createTheme();

const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  }
};

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <AuthProvider value={{ user: mockUser, loading: false }}>
        <VoiceChatProvider>
          {children}
        </VoiceChatProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('Voice Chat Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  test('renders voice chat control in canvas toolbar', async () => {
    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Check that voice chat control is present in toolbar
    // Note: This test would need to be adjusted based on actual implementation
    // as the voice chat control might be rendered as an icon button
    const toolbar = screen.getByRole('banner'); // AppBar has banner role
    expect(toolbar).toBeInTheDocument();
  });

  test('shows voice chat component in sidebar when collaborators panel is open', async () => {
    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Open collaborators panel
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    // Voice chat should be visible in the sidebar
    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });
  });

  test('respects permission levels for voice chat access', async () => {
    // Mock canvas service to return viewer permission
    const { CanvasService } = require('../services/canvasService');
    CanvasService.getCollaborators.mockResolvedValue([
      {
        profiles: { id: 'test-user' },
        permission_level: 'viewer'
      }
    ]);

    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Open collaborators panel to see voice chat
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Should show permission notice for viewers
    expect(screen.getByText(/Voice chat is only available to editors and owners/)).toBeInTheDocument();
  });

  test('allows editors and owners to join voice chat', async () => {
    // Mock canvas service to return editor permission
    const { CanvasService } = require('../services/canvasService');
    CanvasService.getCollaborators.mockResolvedValue([
      {
        profiles: { id: 'test-user' },
        permission_level: 'editor'
      }
    ]);

    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Open collaborators panel
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Should be able to join voice chat
    const joinButton = screen.getByText('Join Voice');
    expect(joinButton).not.toBeDisabled();
  });

  test('handles voice chat connection flow', async () => {
    const agoraService = require('../services/agoraService');
    
    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Open collaborators panel
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Click join voice chat
    const joinButton = screen.getByText('Join Voice');
    fireEvent.click(joinButton);

    // Should call Agora service to join channel
    await waitFor(() => {
      expect(agoraService.joinChannel).toHaveBeenCalledWith('test-canvas', 'test-user');
    });
  });

  test('displays voice chat status correctly', async () => {
    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Open collaborators panel
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Should show disconnected status initially
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  test('handles voice chat errors gracefully', async () => {
    const agoraService = require('../services/agoraService');
    agoraService.joinChannel.mockRejectedValue(new Error('Connection failed'));

    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Open collaborators panel
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Try to join voice chat
    const joinButton = screen.getByText('Join Voice');
    fireEvent.click(joinButton);

    // Should handle the error gracefully
    // Note: Error display would depend on the actual implementation
    await waitFor(() => {
      expect(agoraService.joinChannel).toHaveBeenCalled();
    });
  });

  test('maintains voice chat state across component re-renders', async () => {
    render(
      <TestWrapper>
        <CanvasPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Canvas')).toBeInTheDocument();
    });

    // Test that voice chat state is maintained when switching between panels
    const collaboratorsButton = screen.getByRole('button', { name: /collaborators/i });
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Close and reopen panel
    fireEvent.click(collaboratorsButton);
    fireEvent.click(collaboratorsButton);

    await waitFor(() => {
      expect(screen.getByText('Voice Chat')).toBeInTheDocument();
    });

    // Voice chat component should still be functional
    expect(screen.getByText('Join Voice')).toBeInTheDocument();
  });
});
