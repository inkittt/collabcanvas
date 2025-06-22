import React, { useState, useEffect } from 'react';
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
  Divider
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
  CropFree,
  AspectRatio
} from '@mui/icons-material';
import { applyTransformations } from '../../services/cloudinaryService';

const ImageProcessingPanel = ({ 
  originalImageUrl, 
  onImageUpdate, 
  onSave,
  isProcessing = false 
}) => {
  const [filters, setFilters] = useState({
    // Basic adjustments
    brightness: 0,
    contrast: 0,
    saturation: 0,
    hue: 0,
    
    // Effects
    blur: 0,
    sharpen: 0,
    
    // Boolean filters
    grayscale: false,
    sepia: false,
    blackwhite: false,
    
    // Artistic filters
    artistic: null,
    
    // Crop settings
    cropWidth: '',
    cropHeight: '',
    cropMode: 'scale',
    gravity: 'center',
    
    // Background
    backgroundRemoval: false,
    enhance: false,
    upscale: false
  });

  const [previewUrl, setPreviewUrl] = useState(originalImageUrl);
  const [hasChanges, setHasChanges] = useState(false);

  // Artistic filter options
  const artisticFilters = [
    { value: null, label: 'None' },
    { value: 'oilPaint', label: 'Oil Paint' },
    { value: 'watercolor', label: 'Watercolor' },
    { value: 'cartoon', label: 'Cartoon' },
    { value: 'sketch', label: 'Sketch' },
    { value: 'hokusai', label: 'Hokusai' }
  ];

  // Crop mode options
  const cropModes = [
    { value: 'scale', label: 'Scale' },
    { value: 'crop', label: 'Crop' },
    { value: 'fill', label: 'Fill' },
    { value: 'fit', label: 'Fit' },
    { value: 'thumb', label: 'Smart Crop' }
  ];

  // Gravity options for cropping
  const gravityOptions = [
    { value: 'center', label: 'Center' },
    { value: 'north', label: 'Top' },
    { value: 'south', label: 'Bottom' },
    { value: 'east', label: 'Right' },
    { value: 'west', label: 'Left' },
    { value: 'face', label: 'Face' },
    { value: 'auto', label: 'Auto' }
  ];

  // Build transformation string from current filters
  const buildTransformationString = () => {
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
    if (filters.upscale) {
      transformations.push('e_upscale');
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
  };

  // Update preview when filters change
  useEffect(() => {
    if (!originalImageUrl) return;

    const transformationString = buildTransformationString();
    
    if (transformationString) {
      const newUrl = applyTransformations(originalImageUrl, transformationString);
      setPreviewUrl(newUrl);
      setHasChanges(true);
      onImageUpdate?.(newUrl, transformationString);
    } else {
      setPreviewUrl(originalImageUrl);
      setHasChanges(false);
      onImageUpdate?.(originalImageUrl, '');
    }
  }, [filters, originalImageUrl]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
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
      upscale: false
    });
  };

  // Quick filter presets
  const applyPreset = (presetName) => {
    const presets = {
      vintage: {
        sepia: true,
        contrast: 10,
        saturation: -20,
        brightness: -5
      },
      dramatic: {
        contrast: 30,
        saturation: 20,
        sharpen: 50
      },
      soft: {
        blur: 10,
        brightness: 10,
        contrast: -10
      },
      bw: {
        grayscale: true,
        contrast: 15
      }
    };

    if (presets[presetName]) {
      setFilters(prev => ({
        ...prev,
        ...presets[presetName]
      }));
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      {/* Quick Presets */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Presets
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Chip 
            label="Vintage" 
            onClick={() => applyPreset('vintage')}
            color="primary"
            variant="outlined"
          />
          <Chip 
            label="Dramatic" 
            onClick={() => applyPreset('dramatic')}
            color="primary"
            variant="outlined"
          />
          <Chip 
            label="Soft" 
            onClick={() => applyPreset('soft')}
            color="primary"
            variant="outlined"
          />
          <Chip 
            label="B&W" 
            onClick={() => applyPreset('bw')}
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Paper>

      {/* Basic Adjustments */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Tune sx={{ mr: 1 }} />
          <Typography>Basic Adjustments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Typography gutterBottom>
                <Brightness6 sx={{ mr: 1, verticalAlign: 'middle' }} />
                Brightness: {filters.brightness}
              </Typography>
              <Slider
                value={filters.brightness}
                onChange={(e, value) => handleFilterChange('brightness', value)}
                min={-100}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                <Contrast sx={{ mr: 1, verticalAlign: 'middle' }} />
                Contrast: {filters.contrast}
              </Typography>
              <Slider
                value={filters.contrast}
                onChange={(e, value) => handleFilterChange('contrast', value)}
                min={-100}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                <Colorize sx={{ mr: 1, verticalAlign: 'middle' }} />
                Saturation: {filters.saturation}
              </Typography>
              <Slider
                value={filters.saturation}
                onChange={(e, value) => handleFilterChange('saturation', value)}
                min={-100}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Hue: {filters.hue}
              </Typography>
              <Slider
                value={filters.hue}
                onChange={(e, value) => handleFilterChange('hue', value)}
                min={-100}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Effects */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <AutoFixHigh sx={{ mr: 1 }} />
          <Typography>Effects</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Typography gutterBottom>
                <BlurOn sx={{ mr: 1, verticalAlign: 'middle' }} />
                Blur: {filters.blur}
              </Typography>
              <Slider
                value={filters.blur}
                onChange={(e, value) => handleFilterChange('blur', value)}
                min={0}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>
                Sharpen: {filters.sharpen}
              </Typography>
              <Slider
                value={filters.sharpen}
                onChange={(e, value) => handleFilterChange('sharpen', value)}
                min={0}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip
                label="Grayscale"
                onClick={() => handleFilterChange('grayscale', !filters.grayscale)}
                color={filters.grayscale ? 'primary' : 'default'}
                variant={filters.grayscale ? 'filled' : 'outlined'}
              />
              <Chip
                label="Sepia"
                onClick={() => handleFilterChange('sepia', !filters.sepia)}
                color={filters.sepia ? 'primary' : 'default'}
                variant={filters.sepia ? 'filled' : 'outlined'}
              />
              <Chip
                label="Black & White"
                onClick={() => handleFilterChange('blackwhite', !filters.blackwhite)}
                color={filters.blackwhite ? 'primary' : 'default'}
                variant={filters.blackwhite ? 'filled' : 'outlined'}
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Artistic Filters */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <FilterVintage sx={{ mr: 1 }} />
          <Typography>Artistic Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth>
            <InputLabel>Artistic Style</InputLabel>
            <Select
              value={filters.artistic || ''}
              onChange={(e) => handleFilterChange('artistic', e.target.value || null)}
              label="Artistic Style"
            >
              {artisticFilters.map((filter) => (
                <MenuItem key={filter.value || 'none'} value={filter.value || ''}>
                  {filter.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </AccordionDetails>
      </Accordion>

      {/* Crop & Resize */}
      <Accordion>
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
                {cropModes.map((mode) => (
                  <MenuItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {(filters.cropMode === 'crop' || filters.cropMode === 'thumb') && (
              <FormControl fullWidth size="small">
                <InputLabel>Focus Point</InputLabel>
                <Select
                  value={filters.gravity}
                  onChange={(e) => handleFilterChange('gravity', e.target.value)}
                  label="Focus Point"
                >
                  {gravityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Quick size presets */}
            <Typography variant="subtitle2">Quick Sizes:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip
                label="Square 500x500"
                size="small"
                onClick={() => {
                  handleFilterChange('cropWidth', '500');
                  handleFilterChange('cropHeight', '500');
                }}
                variant="outlined"
              />
              <Chip
                label="HD 1920x1080"
                size="small"
                onClick={() => {
                  handleFilterChange('cropWidth', '1920');
                  handleFilterChange('cropHeight', '1080');
                }}
                variant="outlined"
              />
              <Chip
                label="Instagram 1080x1080"
                size="small"
                onClick={() => {
                  handleFilterChange('cropWidth', '1080');
                  handleFilterChange('cropHeight', '1080');
                }}
                variant="outlined"
              />
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* AI-Powered Features */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <AutoFixHigh sx={{ mr: 1 }} />
          <Typography>AI Features</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            <Chip
              label="Remove Background"
              onClick={() => handleFilterChange('backgroundRemoval', !filters.backgroundRemoval)}
              color={filters.backgroundRemoval ? 'primary' : 'default'}
              variant={filters.backgroundRemoval ? 'filled' : 'outlined'}
              icon={<CropFree />}
            />
            <Chip
              label="Auto Enhance"
              onClick={() => handleFilterChange('enhance', !filters.enhance)}
              color={filters.enhance ? 'primary' : 'default'}
              variant={filters.enhance ? 'filled' : 'outlined'}
              icon={<AutoFixHigh />}
            />
            <Chip
              label="Upscale"
              onClick={() => handleFilterChange('upscale', !filters.upscale)}
              color={filters.upscale ? 'primary' : 'default'}
              variant={filters.upscale ? 'filled' : 'outlined'}
              icon={<AspectRatio />}
            />
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack spacing={2}>
          <ButtonGroup fullWidth variant="contained">
            <Button
              onClick={handleReset}
              color="secondary"
              disabled={!hasChanges}
            >
              Reset
            </Button>
            <Button
              onClick={() => onSave?.(previewUrl, buildTransformationString())}
              color="primary"
              disabled={!hasChanges || isProcessing}
            >
              {isProcessing ? 'Saving...' : 'Save Changes'}
            </Button>
          </ButtonGroup>

          {hasChanges && (
            <Typography variant="caption" color="text.secondary" align="center">
              Preview updates automatically. Click "Save Changes" to apply.
            </Typography>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default ImageProcessingPanel;
