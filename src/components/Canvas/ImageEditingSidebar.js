import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore,
  Crop,
  Palette,
  AutoFixHigh,
  Tune,
  FilterVintage,
  Brightness6,
  Contrast,
  Colorize,
  BlurOn,
  Close,
  Save,
  Refresh,
} from '@mui/icons-material';
import { applyTransformations } from '../../services/cloudinaryService';
import { ElementService } from '../../services/elementService';

const ImageEditingSidebar = ({ 
  open,
  onClose,
  selectedImage,
  canvasId,
  editingMode = 'adjust', // 'crop', 'filter', 'adjust'
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
    blackwhite: false,
    artistic: null,
    cropWidth: '',
    cropHeight: '',
    cropMode: 'scale',
    gravity: 'center',
    backgroundRemoval: false,
    enhance: false,
  });

  const [originalUrl, setOriginalUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [imageElement, setImageElement] = useState(null);

  // Load image data when selectedImage changes
  useEffect(() => {
    const loadImageData = async () => {
      if (!selectedImage || !canvasId) return;

      try {
        const elements = await ElementService.getCanvasElements(canvasId);
        const element = elements.find(el => el.id === selectedImage.id);
        
        if (element) {
          setImageElement(element);
          setOriginalUrl(element.data.src);
          setPreviewUrl(element.data.src);
          
          // Load existing filters if any
          if (element.data.cloudinaryFilters) {
            setFilters(prev => ({
              ...prev,
              ...element.data.cloudinaryFilters
            }));
          }
        }
      } catch (error) {
        console.error('Error loading image data:', error);
      }
    };

    loadImageData();
  }, [selectedImage, canvasId]);

  // Build transformation string from current filters
  const buildTransformationString = useCallback(() => {
    const transformations = [];

    // Basic adjustments
    if (filters.brightness !== 0) {
      transformations.push(`e_brightness:${filters.brightness}`);
    }
    if (filters.contrast !== 0) {
      transformations.push(`e_contrast:${filters.contrast}`);
    }
    if (filters.saturation !== 0) {
      transformations.push(`e_saturation:${filters.saturation}`);
    }
    if (filters.hue !== 0) {
      transformations.push(`e_hue:${filters.hue}`);
    }

    // Effects
    if (filters.blur > 0) {
      transformations.push(`e_blur:${filters.blur}`);
    }
    if (filters.sharpen > 0) {
      transformations.push(`e_sharpen:${filters.sharpen}`);
    }

    // Boolean filters
    if (filters.grayscale) {
      transformations.push('e_grayscale');
    }
    if (filters.sepia) {
      transformations.push('e_sepia');
    }
    if (filters.blackwhite) {
      transformations.push('e_blackwhite');
    }

    // AI-powered effects
    if (filters.backgroundRemoval) {
      transformations.push('e_background_removal');
    }
    if (filters.enhance) {
      transformations.push('e_enhance');
    }

    // Artistic filters
    if (filters.artistic) {
      const artisticMap = {
        oilPaint: 'e_art:oil_paint',
        watercolor: 'e_art:watercolor',
        cartoon: 'e_art:cartoon',
        sketch: 'e_art:sketch',
        hokusai: 'e_art:hokusai'
      };
      if (artisticMap[filters.artistic]) {
        transformations.push(artisticMap[filters.artistic]);
      }
    }

    // Resize/Crop
    if (filters.cropWidth || filters.cropHeight) {
      const width = filters.cropWidth || 'auto';
      const height = filters.cropHeight || 'auto';
      
      if (filters.cropMode === 'scale') {
        transformations.push(`w_${width},h_${height},c_scale`);
      } else if (filters.cropMode === 'crop') {
        transformations.push(`w_${width},h_${height},c_crop,g_${filters.gravity}`);
      } else if (filters.cropMode === 'fill') {
        transformations.push(`w_${width},h_${height},c_fill`);
      } else if (filters.cropMode === 'fit') {
        transformations.push(`w_${width},h_${height},c_fit`);
      } else if (filters.cropMode === 'thumb') {
        transformations.push(`w_${width},h_${height},c_thumb,g_${filters.gravity}`);
      }
    }

    return transformations.join('/');
  }, [filters]);

  // Update preview when filters change
  useEffect(() => {
    if (!originalUrl) return;

    const transformationString = buildTransformationString();
    
    if (transformationString) {
      const newUrl = applyTransformations(originalUrl, transformationString);
      setPreviewUrl(newUrl);
      setHasChanges(true);
    } else {
      setPreviewUrl(originalUrl);
      setHasChanges(false);
    }
  }, [filters, originalUrl, buildTransformationString]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Apply changes to the image
  const handleApplyChanges = async () => {
    if (!imageElement || !hasChanges) return;

    try {
      setIsApplying(true);

      const transformationString = buildTransformationString();
      console.log('🎨 Applying transformations:', transformationString);

      const transformedUrl = transformationString
        ? applyTransformations(originalUrl, transformationString)
        : originalUrl;

      console.log('🔄 Original URL:', originalUrl);
      console.log('✨ Transformed URL:', transformedUrl);

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

      console.log('✅ Image successfully updated with Cloudinary transformations');

      // Notify parent component
      if (onImageUpdate) {
        onImageUpdate({
          ...imageElement,
          data: updatedData,
        });
      }

      setHasChanges(false);
    } catch (error) {
      console.error('❌ Error applying image changes:', error);
    } finally {
      setIsApplying(false);
    }
  };

  // Reset all filters
  const handleReset = () => {
    setFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
      blur: 0,
      sharpen: 0,
      grayscale: false,
      sepia: false,
      blackwhite: false,
      artistic: null,
      cropWidth: '',
      cropHeight: '',
      cropMode: 'scale',
      gravity: 'center',
      backgroundRemoval: false,
      enhance: false,
    });
  };

  if (!open || !selectedImage) {
    return null;
  }

  console.log('🎨 ImageEditingSidebar rendering:', {
    open,
    selectedImage: selectedImage?.id,
    editingMode,
    hasChanges,
    originalUrl,
    previewUrl
  });

  return (
    <Box
      sx={{
        width: 320,
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Edit Image
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Mode: {editingMode.charAt(0).toUpperCase() + editingMode.slice(1)}
        </Typography>
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, p: 2 }}>
        {/* Preview */}
        {previewUrl && (
          <Paper sx={{ p: 1, mb: 2, textAlign: 'center' }}>
            <Typography variant="subtitle2" gutterBottom>
              Preview
            </Typography>
            <Box
              component="img"
              src={previewUrl}
              alt="Preview"
              sx={{
                maxWidth: '100%',
                maxHeight: 150,
                objectFit: 'contain',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            />
          </Paper>
        )}

        {/* Quick Presets */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Quick Presets
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Chip 
              label="Vintage" 
              onClick={() => setFilters(prev => ({ ...prev, sepia: true, contrast: 10, saturation: -20, brightness: -5 }))}
              size="small"
              variant="outlined"
            />
            <Chip 
              label="Dramatic" 
              onClick={() => setFilters(prev => ({ ...prev, contrast: 30, saturation: 20, sharpen: 50 }))}
              size="small"
              variant="outlined"
            />
            <Chip 
              label="B&W" 
              onClick={() => setFilters(prev => ({ ...prev, grayscale: true, contrast: 15 }))}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Paper>

        {/* Editing Controls based on mode */}
        {editingMode === 'adjust' && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Tune sx={{ mr: 1 }} />
              <Typography>Basic Adjustments</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Brightness: {filters.brightness}
                  </Typography>
                  <Slider
                    value={filters.brightness}
                    onChange={(e, value) => handleFilterChange('brightness', value)}
                    min={-100}
                    max={100}
                    step={5}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" gutterBottom>
                    Contrast: {filters.contrast}
                  </Typography>
                  <Slider
                    value={filters.contrast}
                    onChange={(e, value) => handleFilterChange('contrast', value)}
                    min={-100}
                    max={100}
                    step={5}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" gutterBottom>
                    Saturation: {filters.saturation}
                  </Typography>
                  <Slider
                    value={filters.saturation}
                    onChange={(e, value) => handleFilterChange('saturation', value)}
                    min={-100}
                    max={100}
                    step={5}
                    size="small"
                  />
                </Box>

                <Box>
                  <Typography variant="body2" gutterBottom>
                    Hue: {filters.hue}
                  </Typography>
                  <Slider
                    value={filters.hue}
                    onChange={(e, value) => handleFilterChange('hue', value)}
                    min={-100}
                    max={100}
                    step={5}
                    size="small"
                  />
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {editingMode === 'filter' && (
          <>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <AutoFixHigh sx={{ mr: 1 }} />
                <Typography>Effects</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Blur: {filters.blur}
                    </Typography>
                    <Slider
                      value={filters.blur}
                      onChange={(e, value) => handleFilterChange('blur', value)}
                      min={0}
                      max={100}
                      step={5}
                      size="small"
                    />
                  </Box>

                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Sharpen: {filters.sharpen}
                    </Typography>
                    <Slider
                      value={filters.sharpen}
                      onChange={(e, value) => handleFilterChange('sharpen', value)}
                      min={0}
                      max={100}
                      step={5}
                      size="small"
                    />
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip
                      label="Grayscale"
                      onClick={() => handleFilterChange('grayscale', !filters.grayscale)}
                      color={filters.grayscale ? 'primary' : 'default'}
                      variant={filters.grayscale ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      label="Sepia"
                      onClick={() => handleFilterChange('sepia', !filters.sepia)}
                      color={filters.sepia ? 'primary' : 'default'}
                      variant={filters.sepia ? 'filled' : 'outlined'}
                      size="small"
                    />
                    <Chip
                      label="B&W"
                      onClick={() => handleFilterChange('blackwhite', !filters.blackwhite)}
                      color={filters.blackwhite ? 'primary' : 'default'}
                      variant={filters.blackwhite ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Stack>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <FilterVintage sx={{ mr: 1 }} />
                <Typography>Artistic Filters</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <FormControl fullWidth size="small">
                  <InputLabel>Artistic Style</InputLabel>
                  <Select
                    value={filters.artistic || ''}
                    onChange={(e) => handleFilterChange('artistic', e.target.value || null)}
                    label="Artistic Style"
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="oilPaint">Oil Paint</MenuItem>
                    <MenuItem value="watercolor">Watercolor</MenuItem>
                    <MenuItem value="cartoon">Cartoon</MenuItem>
                    <MenuItem value="sketch">Sketch</MenuItem>
                    <MenuItem value="hokusai">Hokusai</MenuItem>
                  </Select>
                </FormControl>
              </AccordionDetails>
            </Accordion>
          </>
        )}

        {editingMode === 'crop' && (
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Crop sx={{ mr: 1 }} />
              <Typography>Crop & Resize</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Width"
                      type="number"
                      value={filters.cropWidth}
                      onChange={(e) => handleFilterChange('cropWidth', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Height"
                      type="number"
                      value={filters.cropHeight}
                      onChange={(e) => handleFilterChange('cropHeight', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>

                <FormControl fullWidth size="small">
                  <InputLabel>Crop Mode</InputLabel>
                  <Select
                    value={filters.cropMode}
                    onChange={(e) => handleFilterChange('cropMode', e.target.value)}
                    label="Crop Mode"
                  >
                    <MenuItem value="scale">Scale</MenuItem>
                    <MenuItem value="crop">Crop</MenuItem>
                    <MenuItem value="fill">Fill</MenuItem>
                    <MenuItem value="fit">Fit</MenuItem>
                    <MenuItem value="thumb">Smart Crop</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Gravity</InputLabel>
                  <Select
                    value={filters.gravity}
                    onChange={(e) => handleFilterChange('gravity', e.target.value)}
                    label="Gravity"
                  >
                    <MenuItem value="center">Center</MenuItem>
                    <MenuItem value="north">Top</MenuItem>
                    <MenuItem value="south">Bottom</MenuItem>
                    <MenuItem value="east">Right</MenuItem>
                    <MenuItem value="west">Left</MenuItem>
                    <MenuItem value="face">Face</MenuItem>
                    <MenuItem value="auto">Auto</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>

      {/* Footer Actions */}
      <Paper sx={{ p: 2, borderRadius: 0, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2}>
          <ButtonGroup fullWidth variant="contained" size="small">
            <Button
              onClick={handleReset}
              color="secondary"
              disabled={!hasChanges}
              startIcon={<Refresh />}
            >
              Reset
            </Button>
            <Button
              onClick={handleApplyChanges}
              color="primary"
              disabled={!hasChanges || isApplying}
              startIcon={<Save />}
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </Button>
          </ButtonGroup>

          {hasChanges && (
            <Typography variant="caption" color="text.secondary" align="center">
              Changes will be visible to all users in real-time
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ImageEditingSidebar;
