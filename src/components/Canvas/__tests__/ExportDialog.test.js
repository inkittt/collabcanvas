import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportDialog from '../ExportDialog';

// Mock jsPDF
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => ({
    addImage: jest.fn(),
    save: jest.fn(),
  }));
});

// Mock fabric canvas
const mockFabricCanvas = {
  toDataURL: jest.fn(() => 'data:image/png;base64,mockImageData'),
  getWidth: jest.fn(() => 800),
  getHeight: jest.fn(() => 600),
};

describe('ExportDialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    fabricCanvas: mockFabricCanvas,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock URL.createObjectURL and document.createElement for download
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();
    
    // Mock document.createElement for download link
    const mockLink = {
      click: jest.fn(),
      download: '',
      href: '',
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders export dialog when open', () => {
    render(<ExportDialog {...defaultProps} />);
    
    expect(screen.getByText('Export Canvas')).toBeInTheDocument();
    expect(screen.getByLabelText('File Name')).toBeInTheDocument();
    expect(screen.getByText('PNG (High Quality)')).toBeInTheDocument();
    expect(screen.getByText('JPEG (Smaller Size)')).toBeInTheDocument();
    expect(screen.getByText('PDF (Document)')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    render(<ExportDialog {...defaultProps} open={false} />);
    
    expect(screen.queryByText('Export Canvas')).not.toBeInTheDocument();
  });

  test('allows changing file name', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: 'my-canvas' } });
    
    expect(fileNameInput.value).toBe('my-canvas');
  });

  test('allows changing export format', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const jpegRadio = screen.getByLabelText('JPEG (Smaller Size)');
    fireEvent.click(jpegRadio);
    
    expect(jpegRadio).toBeChecked();
  });

  test('shows quality slider for JPEG format', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const jpegRadio = screen.getByLabelText('JPEG (Smaller Size)');
    fireEvent.click(jpegRadio);
    
    expect(screen.getByText(/Quality:/)).toBeInTheDocument();
  });

  test('shows quality slider for PDF format', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const pdfRadio = screen.getByLabelText('PDF (Document)');
    fireEvent.click(pdfRadio);
    
    expect(screen.getByText(/Quality:/)).toBeInTheDocument();
  });

  test('does not show quality slider for PNG format', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // PNG is selected by default
    expect(screen.queryByText(/Quality:/)).not.toBeInTheDocument();
  });

  test('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ExportDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when close icon is clicked', () => {
    const onClose = jest.fn();
    render(<ExportDialog {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  test('disables export button when file name is empty', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: '' } });
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).toBeDisabled();
  });

  test('enables export button when file name is provided', () => {
    render(<ExportDialog {...defaultProps} />);
    
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: 'test-canvas' } });
    
    const exportButton = screen.getByText('Export');
    expect(exportButton).not.toBeDisabled();
  });

  test('shows error when canvas is not available', async () => {
    render(<ExportDialog {...defaultProps} fabricCanvas={null} />);
    
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: 'test' } });
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Canvas not available for export')).toBeInTheDocument();
    });
  });

  test('exports PNG format correctly', async () => {
    render(<ExportDialog {...defaultProps} />);
    
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: 'test-canvas' } });
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockFabricCanvas.toDataURL).toHaveBeenCalledWith({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });
    });
  });

  test('exports JPEG format correctly', async () => {
    render(<ExportDialog {...defaultProps} />);
    
    const jpegRadio = screen.getByLabelText('JPEG (Smaller Size)');
    fireEvent.click(jpegRadio);
    
    const fileNameInput = screen.getByLabelText('File Name');
    fireEvent.change(fileNameInput, { target: { value: 'test-canvas' } });
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockFabricCanvas.toDataURL).toHaveBeenCalledWith({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 1,
      });
    });
  });
});
