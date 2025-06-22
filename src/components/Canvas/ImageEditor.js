import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Button,
  IconButton,
  Divider,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Crop as CropIcon,
  Contrast as ContrastIcon,
  Brightness6 as BrightnessIcon,
  InvertColors as InvertColorsIcon,
  Tune as TuneIcon,
  Done as DoneIcon,
} from '@mui/icons-material';
import { fabric } from 'fabric';
import { FILTER_PRESETS, applyFilters, createFilter, serializeFilters } from './filters';

// We now import FILTER_PRESETS from filters.js

const ImageEditor = ({ 
  canvas, 
  activeObject, 
  onClose, 
  onSave,
  open 
}) => {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [editedImage, setEditedImage] = useState(null);
  const [originalState, setOriginalState] = useState(null);

  // Initialize editor when an image is selected
  useEffect(() => {
    if (open && activeObject && activeObject.type === 'image') {
      // Store the original state for cancellation
      try {
        const state = {
          ...activeObject,
          left: activeObject.left,
          top: activeObject.top,
          scaleX: activeObject.scaleX,
          scaleY: activeObject.scaleY,
          angle: activeObject.angle,
          // Store the element's source
          src: activeObject._originalElement?.src || '',
          // Don't store filters as they cause issues
          cssFilters: ''
        };
        
        setOriginalState(state);
        setEditedImage(activeObject);
        
        // Reset controls
        setBrightness(0);
        setContrast(0);
        setSelectedFilter(null);
        setIsCropping(false);
      } catch (error) {
        console.error('Error initializing image editor:', error);
      }
    }
  }, [open, activeObject]);

  // Apply brightness adjustment
  const handleBrightnessChange = (event, newValue) => {
    setBrightness(newValue);
    if (editedImage) {
      try {
        console.log('Applying brightness:', newValue);
        
        // Create a brightness filter
        const brightnessFilter = createFilter('brightness', { value: newValue });
        
        // Create filters list
        let filters = [];
        
        // Add brightness filter
        if (brightnessFilter) {
          filters.push(brightnessFilter);
        }
        
        // Add contrast filter if needed
        if (contrast !== 0) {
          const contrastFilter = createFilter('contrast', { value: contrast });
          if (contrastFilter) {
            filters.push(contrastFilter);
          }
        }
        
        // Apply preset filters if needed
        if (selectedFilter) {
          const preset = FILTER_PRESETS.find(p => p.name === selectedFilter);
          if (preset && preset.filters) {
            preset.filters.forEach(filterConfig => {
              // Skip brightness and contrast filters as we've already added them
              if (filterConfig.type !== 'brightness' && filterConfig.type !== 'contrast') {
                const filter = createFilter(filterConfig.type, filterConfig.options);
                if (filter) {
                  filters.push(filter);
                }
              }
            });
          }
        }
        
        // Clear existing filters
        editedImage.filters = [];
        
        // Apply new filters
        if (filters.length > 0) {
          editedImage.filters = filters;
          editedImage.applyFilters();
        }
        
        // Store current filter state for saving
        editedImage.filterData = {
          brightness: newValue,
          contrast: contrast,
          preset: selectedFilter
        };
        
        // Render the canvas
        canvas.renderAll();
      } catch (error) {
        console.error('Error applying brightness filter:', error);
      }
    }
  };

  // Apply contrast adjustment
  const handleContrastChange = (event, newValue) => {
    setContrast(newValue);
    if (editedImage) {
      try {
        console.log('Applying contrast:', newValue);
        
        // Create a contrast filter
        const contrastFilter = createFilter('contrast', { value: newValue });
        
        // Create filters list
        let filters = [];
        
        // Add brightness filter if needed
        if (brightness !== 0) {
          const brightnessFilter = createFilter('brightness', { value: brightness });
          if (brightnessFilter) {
            filters.push(brightnessFilter);
          }
        }
        
        // Add contrast filter
        if (contrastFilter) {
          filters.push(contrastFilter);
        }
        
        // Apply preset filters if needed
        if (selectedFilter) {
          const preset = FILTER_PRESETS.find(p => p.name === selectedFilter);
          if (preset && preset.filters) {
            preset.filters.forEach(filterConfig => {
              // Skip brightness and contrast filters as we've already added them
              if (filterConfig.type !== 'brightness' && filterConfig.type !== 'contrast') {
                const filter = createFilter(filterConfig.type, filterConfig.options);
                if (filter) {
                  filters.push(filter);
                }
              }
            });
          }
        }
        
        // Clear existing filters
        editedImage.filters = [];
        
        // Apply new filters
        if (filters.length > 0) {
          editedImage.filters = filters;
          editedImage.applyFilters();
        }
        
        // Store current filter state for saving
        editedImage.filterData = {
          brightness: brightness,
          contrast: newValue,
          preset: selectedFilter
        };
        
        // Render the canvas
        canvas.renderAll();
      } catch (error) {
        console.error('Error applying contrast filter:', error);
      }
    }
  };

  // Apply a preset filter
  const applyFilter = (filterPreset) => {
    setSelectedFilter(filterPreset.name);
    
    if (editedImage) {
      try {
        console.log('Applying filter preset:', filterPreset.name);
        
        // Reset UI controls for basic adjustments
        let newBrightness = 0;
        let newContrast = 0;
        
        // Find if this preset has brightness or contrast filters
        if (filterPreset.filters) {
          filterPreset.filters.forEach(filter => {
            if (filter.type === 'brightness' && filter.options) {
              newBrightness = filter.options.value || 0;
            } else if (filter.type === 'contrast' && filter.options) {
              newContrast = filter.options.value || 0;
            }
          });
        }
        
        // Update UI state
        setBrightness(newBrightness);
        setContrast(newContrast);
        
        // Create and apply the filters
        let filters = [];
        
        // Apply all preset filters
        if (filterPreset.filters) {
          filterPreset.filters.forEach(filterConfig => {
            const filter = createFilter(filterConfig.type, filterConfig.options);
            if (filter) {
              filters.push(filter);
            }
          });
        }
        
        // Clear existing filters and apply new ones
        editedImage.filters = [];
        
        if (filters.length > 0) {
          console.log('Applying filters:', filters);
          editedImage.filters = filters;
          editedImage.applyFilters();
        }
        
        // Store filter data for saving
        editedImage.filterData = {
          preset: filterPreset.name,
          brightness: newBrightness,
          contrast: newContrast
        };
        
        // Render the canvas
        canvas.renderAll();
      } catch (error) {
        console.error('Error applying filter:', error);
        // Recover by clearing filters
        editedImage.filters = [];
        canvas.renderAll();
      }
    }
  };

  // Toggle crop mode
  const toggleCropMode = () => {
    setIsCropping(!isCropping);
    
    if (editedImage) {
      if (!isCropping) {
        // Enable crop mode
        canvas.getObjects().forEach(obj => {
          if (obj !== editedImage) {
            obj.selectable = false;
          }
        });
        
        // Create crop rect
        const cropRect = new fabric.Rect({
          left: editedImage.left,
          top: editedImage.top,
          width: editedImage.width * editedImage.scaleX,
          height: editedImage.height * editedImage.scaleY,
          fill: 'rgba(0,0,0,0.3)',
          stroke: '#2196F3',
          strokeWidth: 2,
          cornerColor: '#2196F3',
          transparentCorners: false,
          hasRotatingPoint: false,
        });
        
        canvas.add(cropRect);
        canvas.setActiveObject(cropRect);
      } else {
        // Apply crop
        const cropObj = canvas.getActiveObject();
        if (cropObj && cropObj.type === 'rect') {
          // Calculate crop coordinates
          const imgElement = editedImage.getElement();
          const imgWidth = imgElement.width;
          const imgHeight = imgElement.height;
          
          // Remove crop rect
          canvas.remove(cropObj);
          
          // Reset selection
          canvas.getObjects().forEach(obj => {
            obj.selectable = true;
          });
          
          canvas.setActiveObject(editedImage);
        }
      }
      canvas.renderAll();
    }
  };

  // Save changes
  const handleSave = () => {
    if (onSave && editedImage) {
      try {
        // Store filter data for saving - already on editedImage
        console.log('Saving image with filters:', editedImage.filterData);
        
        // Serialize filters for storage if needed
        if (editedImage.filters && editedImage.filters.length > 0) {
          editedImage.serializedFilters = serializeFilters(editedImage.filters);
        }
        
        onSave(editedImage);
      } catch (error) {
        console.error('Error saving image:', error);
      }
    }
    onClose();
  };

  // Cancel and reset to original
  const handleCancel = () => {
    if (originalState && editedImage) {
      try {
        // Reset position and scale
        editedImage.set({
          left: originalState.left,
          top: originalState.top,
          scaleX: originalState.scaleX,
          scaleY: originalState.scaleY,
          angle: originalState.angle
        });
        
        // Clear all filters
        editedImage.filters = [];
        editedImage.applyFilters();
        
        // Remove filter data
        delete editedImage.filterData;
        delete editedImage.serializedFilters;
        
        canvas.renderAll();
      } catch (error) {
        console.error('Error restoring image to original state:', error);
        canvas.renderAll();
      }
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          backgroundImage: 'linear-gradient(180deg, #111111 0%, #1a1a1a 100%)',
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#000000', 
        color: 'white', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        py: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" onClick={handleCancel} sx={{ mr: 1 }}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6">Image Editor</Typography>
        </Box>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary" 
          sx={{ 
            bgcolor: '#1976d2', 
            '&:hover': { bgcolor: '#1565c0' },
            px: 3,
            py: 0.5,
          }}
        >
          SAVE
        </Button>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          width: '280px', 
          bgcolor: '#111111', 
          color: 'white',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          overflow: 'auto'
        }}>
          {/* Top part - Back and filter category */}
          <Box sx={{ 
            p: 1.5, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}>
            <IconButton 
              size="small" 
              sx={{ color: 'white', p: 0.5 }}
              onClick={handleCancel}
            >
              <Typography sx={{ mr: 1 }}>←</Typography>
            </IconButton>
            <Typography variant="body1" sx={{ fontWeight: 'medium', color: '#cccccc' }}>CLASSIC</Typography>
          </Box>
          
          {/* Adjustments Section */}
          <Box sx={{ p: 2, pb: 0 }}>
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BrightnessIcon sx={{ mr: 1, color: '#cccccc', fontSize: '1.2rem' }} />
                <Typography variant="body2" sx={{ color: '#cccccc' }}>Brightness</Typography>
              </Box>
              <Slider
                value={brightness}
                min={-1}
                max={1}
                step={0.05}
                onChange={handleBrightnessChange}
                valueLabelDisplay="auto"
                valueLabelFormat={value => Math.round(value * 100) + '%'}
                sx={{ 
                  color: '#2196F3',
                  '& .MuiSlider-thumb': {
                    width: 14,
                    height: 14,
                  }, 
                }}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ContrastIcon sx={{ mr: 1, color: '#cccccc', fontSize: '1.2rem' }} />
                <Typography variant="body2" sx={{ color: '#cccccc' }}>Contrast</Typography>
              </Box>
              <Slider
                value={contrast}
                min={-1}
                max={1}
                step={0.05}
                onChange={handleContrastChange}
                valueLabelDisplay="auto"
                valueLabelFormat={value => Math.round(value * 100) + '%'}
                sx={{ 
                  color: '#2196F3',
                  '& .MuiSlider-thumb': {
                    width: 14,
                    height: 14,
                  }, 
                }}
              />
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Button
                variant={isCropping ? "contained" : "outlined"}
                startIcon={<CropIcon />}
                onClick={toggleCropMode}
                fullWidth
                sx={{ 
                  mb: 1, 
                  textTransform: 'none',
                  borderColor: '#444444',
                  color: isCropping ? 'white' : '#cccccc',
                  '&:hover': { borderColor: '#666666' },
                }}
              >
                {isCropping ? "Apply Crop" : "Crop Image"}
              </Button>
            </Box>
          </Box>
          
          {/* Filters Section */}
          <Box sx={{ p: 2, pt: 0 }}>
            <Typography variant="subtitle2" sx={{ color: '#cccccc', mb: 1.5, fontWeight: 'normal' }}>Filter Presets</Typography>
            
            <Grid container spacing={1.5}>
              {FILTER_PRESETS.map((preset) => (
                <Grid item xs={4} key={preset.name}>
                  <Box
                    onClick={() => applyFilter(preset)}
                    sx={{
                      cursor: 'pointer',
                      border: selectedFilter === preset.name ? '2px solid #2196F3' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 1,
                      overflow: 'hidden',
                      position: 'relative',
                      height: '70px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      mb: 1,
                      '&:hover': {
                        borderColor: '#2196F3',
                      },
                    }}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
                      alt={preset.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: preset.name === 'Black White' ? 'grayscale(100%)' :
                               preset.name === 'Vintage' ? 'sepia(50%)' :
                               preset.name === 'Copper' ? 'sepia(80%)' :
                               preset.name === 'Sapphire' ? 'hue-rotate(210deg)' :
                               preset.name === 'Dusk' ? 'hue-rotate(270deg)' :
                               preset.name === 'Top Hat' ? 'brightness(0.9)' :
                               preset.name === 'Black Edge' ? 'brightness(0.9)' :
                               preset.name === 'Snappy' ? 'contrast(120%)' :
                               preset.name === 'Iridescent' ? 'hue-rotate(20deg)' : 'none',
                      }}
                    />
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        position: 'absolute', 
                        bottom: 0, 
                        width: '100%', 
                        textAlign: 'center', 
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        fontSize: '0.65rem',
                        py: 0.5
                      }}
                    >
                      {preset.name}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
        
        <Box sx={{ 
          flexGrow: 1, 
          position: 'relative', 
          bgcolor: '#333333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center', 
        }}>
          {/* Canvas will be rendered here by parent component */}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditor;
