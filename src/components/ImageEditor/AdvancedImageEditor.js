import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Grid,
  Paper,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Backdrop
} from '@mui/material';
import {
  Close,
  CloudUpload,
  Download,
  Share,
  History
} from '@mui/icons-material';
import ImageProcessingPanel from './ImageProcessingPanel';
import { uploadImage } from '../../services/cloudinaryService';

const AdvancedImageEditor = ({ 
  open, 
  onClose, 
  initialImageUrl = null,
  onSave,
  canvasId = null 
}) => {
  const [originalImageUrl, setOriginalImageUrl] = useState(initialImageUrl);
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);
  const [currentTransformation, setCurrentTransformation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [uploadHistory, setUploadHistory] = useState([]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotification({
        open: true,
        message: 'Please select a valid image file',
        severity: 'error'
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Uploading new image to Cloudinary...');
      
      const result = await uploadImage(file, {
        folder: 'collabcanvas/editor',
        tags: ['canvas-editor', canvasId].filter(Boolean)
      });

      console.log('Image uploaded successfully:', result);

      setOriginalImageUrl(result.url);
      setCurrentImageUrl(result.url);
      setCurrentTransformation('');
      
      // Add to history
      setUploadHistory(prev => [{
        url: result.url,
        name: file.name,
        timestamp: new Date(),
        publicId: result.publicId
      }, ...prev.slice(0, 4)]); // Keep last 5 uploads

      setNotification({
        open: true,
        message: 'Image uploaded successfully!',
        severity: 'success'
      });

    } catch (error) {
      console.error('Upload failed:', error);
      setNotification({
        open: true,
        message: `Upload failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [canvasId]);

  // Handle image update from processing panel
  const handleImageUpdate = useCallback((newUrl, transformation) => {
    setCurrentImageUrl(newUrl);
    setCurrentTransformation(transformation);
  }, []);

  // Handle save
  const handleSave = useCallback(async (processedUrl, transformation) => {
    if (!processedUrl || !originalImageUrl) return;

    setIsProcessing(true);
    try {
      // If there are transformations, we might want to upload the processed version
      // as a new image to ensure it's permanently stored
      let finalUrl = processedUrl;
      
      if (transformation) {
        console.log('Saving processed image with transformations:', transformation);
        // The URL with transformations is already the final URL
        finalUrl = processedUrl;
      }

      // Call the onSave callback with the final URL
      if (onSave) {
        await onSave({
          url: finalUrl,
          originalUrl: originalImageUrl,
          transformation: transformation,
          timestamp: new Date()
        });
      }

      setNotification({
        open: true,
        message: 'Image saved successfully!',
        severity: 'success'
      });

      // Close the editor after successful save
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      console.error('Save failed:', error);
      setNotification({
        open: true,
        message: `Save failed: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  }, [originalImageUrl, onSave, onClose]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!currentImageUrl) return;

    const link = document.createElement('a');
    link.href = currentImageUrl;
    link.download = `edited-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setNotification({
      open: true,
      message: 'Download started!',
      severity: 'info'
    });
  }, [currentImageUrl]);

  // Handle share
  const handleShare = useCallback(async () => {
    if (!currentImageUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Edited Image',
          url: currentImageUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(currentImageUrl);
        setNotification({
          open: true,
          message: 'Image URL copied to clipboard!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      setNotification({
        open: true,
        message: 'Share failed',
        severity: 'error'
      });
    }
  }, [currentImageUrl]);

  // Load image from history
  const loadFromHistory = useCallback((historyItem) => {
    setOriginalImageUrl(historyItem.url);
    setCurrentImageUrl(historyItem.url);
    setCurrentTransformation('');
  }, []);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: '90vh', maxHeight: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Advanced Image Editor</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
          <Grid container sx={{ height: '100%' }}>
            {/* Left Panel - Image Preview */}
            <Grid item xs={12} md={8} sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload-input"
                  type="file"
                  onChange={handleFileUpload}
                />
                <label htmlFor="image-upload-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    disabled={isProcessing}
                  >
                    Upload New Image
                  </Button>
                </label>

                {currentImageUrl && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Download />}
                      onClick={handleDownload}
                      disabled={isProcessing}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={handleShare}
                      disabled={isProcessing}
                    >
                      Share
                    </Button>
                  </>
                )}
              </Box>

              {/* Image Preview */}
              <Paper 
                sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {currentImageUrl ? (
                  <img
                    src={currentImageUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center', p: 4 }}>
                    <CloudUpload sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="grey.600">
                      Upload an image to start editing
                    </Typography>
                    <Typography variant="body2" color="grey.500">
                      Supports JPG, PNG, GIF, WebP formats
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* Upload History */}
              {uploadHistory.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    <History sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Recent Uploads
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                    {uploadHistory.map((item, index) => (
                      <Paper
                        key={index}
                        sx={{
                          minWidth: 80,
                          height: 60,
                          cursor: 'pointer',
                          overflow: 'hidden',
                          '&:hover': { opacity: 0.8 }
                        }}
                        onClick={() => loadFromHistory(item)}
                      >
                        <img
                          src={item.url}
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </Paper>
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>

            {/* Right Panel - Processing Controls */}
            <Grid item xs={12} md={4} sx={{ borderLeft: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
              {originalImageUrl && (
                <ImageProcessingPanel
                  originalImageUrl={originalImageUrl}
                  onImageUpdate={handleImageUpdate}
                  onSave={handleSave}
                  isProcessing={isProcessing}
                />
              )}
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>

      {/* Loading Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.modal + 1 }}
        open={isProcessing}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Processing...
          </Typography>
        </Box>
      </Backdrop>

      {/* Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default AdvancedImageEditor;
