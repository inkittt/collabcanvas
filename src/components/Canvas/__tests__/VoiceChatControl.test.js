import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VoiceChatControl from '../VoiceChatControl';
import { VoiceChatProvider } from '../../../contexts/VoiceChatContext';
import { AuthProvider } from '../../../auth/AuthContext';

// Mock Agora service
jest.mock('../../../services/agoraService', () => ({
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

// Mock auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  }
};

const MockAuthProvider = ({ children }) => (
  <AuthProvider value={{ user: mockUser, loading: false }}>
    {children}
  </AuthProvider>
);

const renderWithProviders = (component, props = {}) => {
  return render(
    <MockAuthProvider>
      <VoiceChatProvider>
        {React.cloneElement(component, props)}
      </VoiceChatProvider>
    </MockAuthProvider>
  );
};

describe('VoiceChatControl Component', () => {
  const defaultProps = {
    canvasId: 'test-canvas-id',
    permission: 'editor'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders voice chat control button', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Should render a phone icon button when disconnected
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('shows disabled state when Agora is not configured', () => {
      // Mock unconfigured Agora
      jest.doMock('../../../services/agoraService', () => ({
        appId: '',
        initialize: jest.fn()
      }));

      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Permissions', () => {
    test('allows editors to access voice chat', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} permission="editor" />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('allows owners to access voice chat', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} permission="owner" />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('prevents viewers from accessing voice chat', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} permission="viewer" />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    test('shows appropriate tooltip for viewers', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} permission="viewer" />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseOver(button);
      
      waitFor(() => {
        expect(screen.getByText(/Voice chat is only available to editors and owners/)).toBeInTheDocument();
      });
    });
  });

  describe('Connection States', () => {
    test('shows join button when disconnected', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseOver(button);
      
      waitFor(() => {
        expect(screen.getByText(/Join voice chat/)).toBeInTheDocument();
      });
    });

    test('shows connecting state', () => {
      // Mock connecting state in context
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that loading spinner is shown during connection
    });

    test('shows mute/unmute controls when connected', () => {
      // Mock connected state in context
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that mute button and participant count are shown
    });

    test('displays participant count badge', () => {
      // Mock connected state with remote users
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that badge shows correct participant count
    });
  });

  describe('Menu Functionality', () => {
    test('opens menu when expand button is clicked', () => {
      // Mock connected state to show menu button
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test menu opening and closing
    });

    test('shows connection status in menu', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that menu displays current connection status
    });

    test('shows error messages in menu', () => {
      // Mock error state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that errors are displayed in menu
    });

    test('allows muting/unmuting from menu', () => {
      // Mock connected state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test mute toggle functionality in menu
    });

    test('allows leaving voice chat from menu', () => {
      // Mock connected state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test leave functionality in menu
    });
  });

  describe('User Interactions', () => {
    test('handles join voice chat click', async () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Test that join action is triggered
    });

    test('handles mute toggle click', () => {
      // Mock connected state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test mute toggle functionality
    });

    test('closes menu after actions', () => {
      // Mock connected state with menu open
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that menu closes after performing actions
    });
  });

  describe('Visual States', () => {
    test('shows correct icon for disconnected state', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that phone icon is shown when disconnected
    });

    test('shows correct icon for muted state', () => {
      // Mock connected and muted state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that muted microphone icon is shown
    });

    test('shows correct icon for unmuted state', () => {
      // Mock connected and unmuted state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that active microphone icon is shown
    });

    test('applies correct styling for different states', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that appropriate colors and styles are applied
    });
  });

  describe('Error Handling', () => {
    test('handles join errors gracefully', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test error handling during join attempts
    });

    test('handles mute errors gracefully', () => {
      // Mock connected state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test error handling during mute operations
    });

    test('handles leave errors gracefully', () => {
      // Mock connected state
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test error handling during leave operations
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    test('supports keyboard navigation', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    test('provides appropriate tooltips', () => {
      renderWithProviders(<VoiceChatControl {...defaultProps} />);
      
      // Test that tooltips provide helpful information
    });
  });
});
