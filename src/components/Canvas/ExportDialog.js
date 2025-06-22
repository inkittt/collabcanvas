import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Slider,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import jsPDF from 'jspdf';

const ExportDialog = ({ open, onClose, fabricCanvas }) => {
  const [exportFormat, setExportFormat] = useState('png');
  const [fileName, setFileName] = useState('canvas-export');
  const [quality, setQuality] = useState(0.9);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (!fabricCanvas) {
      setError('Canvas not available for export');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const canvas = fabricCanvas;
      
      // Get canvas dimensions
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();

      if (exportFormat === 'pdf') {
        // Export as PDF
        const pdf = new jsPDF({
          orientation: canvasWidth > canvasHeight ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvasWidth, canvasHeight]
        });

        // Convert canvas to image data
        const dataURL = canvas.toDataURL({
          format: 'png',
          quality: quality,
          multiplier: 1
        });

        // Add image to PDF
        pdf.addImage(dataURL, 'PNG', 0, 0, canvasWidth, canvasHeight);
        
        // Save PDF
        pdf.save(`${fileName}.pdf`);
      } else {
        // Export as PNG or JPEG
        const dataURL = canvas.toDataURL({
          format: exportFormat === 'png' ? 'png' : 'jpeg',
          quality: exportFormat === 'jpeg' ? quality : 1,
          multiplier: 1
        });

        // Create download link
        const link = document.createElement('a');
        link.download = `${fileName}.${exportFormat}`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export canvas. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFormatChange = (event) => {
    setExportFormat(event.target.value);
  };

  const handleFileNameChange = (event) => {
    setFileName(event.target.value);
  };

  const handleQualityChange = (event, newValue) => {
    setQuality(newValue);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Export Canvas</Typography>
          <Button
            onClick={onClose}
            size="small"
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* File Name */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="File Name"
              value={fileName}
              onChange={handleFileNameChange}
              placeholder="Enter file name"
              variant="outlined"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Export Format */}
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">Export Format</FormLabel>
            <RadioGroup
              value={exportFormat}
              onChange={handleFormatChange}
              row
            >
              <FormControlLabel 
                value="png" 
                control={<Radio />} 
                label="PNG (High Quality)" 
              />
              <FormControlLabel 
                value="jpeg" 
                control={<Radio />} 
                label="JPEG (Smaller Size)" 
              />
              <FormControlLabel 
                value="pdf" 
                control={<Radio />} 
                label="PDF (Document)" 
              />
            </RadioGroup>
          </FormControl>

          {/* Quality Slider (for JPEG and PDF) */}
          {(exportFormat === 'jpeg' || exportFormat === 'pdf') && (
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Quality: {Math.round(quality * 100)}%
              </Typography>
              <Slider
                value={quality}
                onChange={handleQualityChange}
                min={0.1}
                max={1}
                step={0.1}
                marks={[
                  { value: 0.3, label: '30%' },
                  { value: 0.6, label: '60%' },
                  { value: 0.9, label: '90%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
              />
            </Box>
          )}

          {/* Format Information */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {exportFormat === 'png' && 
                'PNG format provides the highest quality with transparency support, but larger file size.'
              }
              {exportFormat === 'jpeg' && 
                'JPEG format provides good quality with smaller file size, but no transparency support.'
              }
              {exportFormat === 'pdf' && 
                'PDF format creates a document that can be easily shared and printed.'
              }
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} disabled={isExporting}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={16} /> : <DownloadIcon />}
          disabled={isExporting || !fileName.trim()}
        >
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
