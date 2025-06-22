import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { applyTransformations, buildTransformationString, getOriginalUrl, TRANSFORMATION_PRESETS } from '../../services/cloudinaryService';
import { ElementService } from '../../services/elementService';

/**
 * Collaborative Image Editor Component
 * Allows users to apply Cloudinary transformations to images with real-time sync
 */
const CollaborativeImageEditor = ({ 
  open, 
  onClose, 
  imageElement, 
  canvasId,
  onImageUpdate 
}) => {
  const [filters, setFilters] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    blur: 0,
    sharpen: 0,
    grayscale: false,
    sepia: false,
    backgroundRemoval: false,
    enhance: false,
    artistic: '',
  });

  const [previewUrl, setPreviewUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize filters from existing image data
  useEffect(() => {
    if (imageElement && open) {
      const imageData = imageElement.data;
      setOriginalUrl(imageData.src);
      setPreviewUrl(imageData.src);
      
      // Load existing filters if they exist
      if (imageData.cloudinaryFilters) {
        setFilters(imageData.cloudinaryFilters);
      } else {
        // Reset to default filters
        setFilters({
          brightness: 0,
          contrast: 0,
          saturation: 0,
          hue: 0,
          blur: 0,
          sharpen: 0,
          grayscale: false,
          sepia: false,
          backgroundRemoval: false,
          enhance: false,
          artistic: '',
        });
      }
      setHasChanges(false);
    }
  }, [imageElement, open]);

  // Update preview when filters change
  useEffect(() => {
    if (originalUrl && open) {
      const transformationString = buildTransformationString(filters);
      
      if (transformationString) {
        const newPreviewUrl = applyTransformations(originalUrl, transformationString);
        setPreviewUrl(newPreviewUrl);
        setHasChanges(true);
      } else {
        setPreviewUrl(originalUrl);
        setHasChanges(false);
      }
    }
  }, [filters, originalUrl, open]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  }, []);

  // Reset all filters
  const handleReset = useCallback(() => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sharpen: 0,
      grayscale: false,
      sepia: false,
      backgroundRemoval: false,
      enhance: false,
      artistic: '',
    });
  }, []);

  // Apply changes and sync to all users
  const handleApply = useCallback(async () => {
    if (!imageElement || !hasChanges) return;

    try {
      setIsApplying(true);

      // Build the transformation string
      const transformationString = buildTransformationString(filters);
      const transformedUrl = transformationString 
        ? applyTransformations(originalUrl, transformationString)
        : originalUrl;

      // Update the element data
      const updatedData = {
        ...imageElement.data,
        src: transformedUrl,
        cloudinaryFilters: filters,
        lastModified: new Date().toISOString(),
      };

      // Update in database - this will trigger real-time sync to all users
      await ElementService.updateElement(imageElement.id, {
        element_type: imageElement.element_type,
        data: updatedData,
      });

      // Notify parent component
      if (onImageUpdate) {
        onImageUpdate({
          ...imageElement,
          data: updatedData,
        });
      }

      setHasChanges(false);
      console.log('Image filters applied and synced to all users');
      
    } catch (error) {
      console.error('Error applying image filters:', error);
      alert('Failed to apply filters. Please try again.');
    } finally {
      setIsApplying(false);
    }
  }, [imageElement, filters, originalUrl, hasChanges, onImageUpdate]);

  // Download the transformed image
  const handleDownload = useCallback(() => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `edited-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [previewUrl]);

  if (!imageElement) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Collaborative Image Editor</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Image Preview */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                Preview
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 300,
                  border: '1px solid #ddd',
                  borderRadius: 1,
                  overflow: 'hidden',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </Box>
              
              {hasChanges && (
                <Box mt={1}>
                  <Chip 
                    label="Changes pending" 
                    color="warning" 
                    size="small" 
                  />
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Filter Controls */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
              <Typography variant="subtitle1" gutterBottom>
                Filters & Adjustments
              </Typography>

              {/* Basic Adjustments */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Basic Adjustments
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="body2">Brightness</Typography>
                  <Slider
                    value={filters.brightness}
                    onChange={(_, value) => handleFilterChange('brightness', value)}
                    min={-100}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">Contrast</Typography>
                  <Slider
                    value={filters.contrast}
                    onChange={(_, value) => handleFilterChange('contrast', value)}
                    min={-100}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">Saturation</Typography>
                  <Slider
                    value={filters.saturation}
                    onChange={(_, value) => handleFilterChange('saturation', value)}
                    min={-100}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">Hue</Typography>
                  <Slider
                    value={filters.hue}
                    onChange={(_, value) => handleFilterChange('hue', value)}
                    min={-100}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>
              </Box>

              {/* Effects */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Effects
                </Typography>
                
                <Box mb={2}>
                  <Typography variant="body2">Blur</Typography>
                  <Slider
                    value={filters.blur}
                    onChange={(_, value) => handleFilterChange('blur', value)}
                    min={0}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>

                <Box mb={2}>
                  <Typography variant="body2">Sharpen</Typography>
                  <Slider
                    value={filters.sharpen}
                    onChange={(_, value) => handleFilterChange('sharpen', value)}
                    min={0}
                    max={100}
                    step={1}
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Box>
              </Box>

              {/* Toggle Filters */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Filter Effects
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.grayscale}
                      onChange={(e) => handleFilterChange('grayscale', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Grayscale"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.sepia}
                      onChange={(e) => handleFilterChange('sepia', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Sepia"
                />
              </Box>

              {/* AI Features */}
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  AI Features
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.backgroundRemoval}
                      onChange={(e) => handleFilterChange('backgroundRemoval', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Remove Background"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={filters.enhance}
                      onChange={(e) => handleFilterChange('enhance', e.target.checked)}
                      size="small"
                    />
                  }
                  label="AI Enhance"
                />
              </Box>

              {/* Artistic Filters */}
              <Box mb={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Artistic Filter</InputLabel>
                  <Select
                    value={filters.artistic}
                    onChange={(e) => handleFilterChange('artistic', e.target.value)}
                    label="Artistic Filter"
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="oilPaint">Oil Paint</MenuItem>
                    <MenuItem value="watercolor">Watercolor</MenuItem>
                    <MenuItem value="cartoon">Cartoon</MenuItem>
                    <MenuItem value="sketch">Sketch</MenuItem>
                    <MenuItem value="hokusai">Hokusai</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Box display="flex" justifyContent="space-between" width="100%">
          <Box>
            <Tooltip title="Download current image">
              <IconButton onClick={handleDownload}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset all filters">
              <IconButton onClick={handleReset}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box>
            <Button onClick={onClose} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              variant="contained"
              disabled={!hasChanges || isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply & Sync'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CollaborativeImageEditor;
