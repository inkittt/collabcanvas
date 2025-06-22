import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { CloudUpload, Edit } from '@mui/icons-material';
import AdvancedImageEditor from './ImageEditor/AdvancedImageEditor';

const ImageUploadTest = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  // Debug environment variables
  const debugEnvVars = () => {
    console.log('=== ENVIRONMENT VARIABLES DEBUG ===');
    console.log('Cloud Name:', process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
    console.log('Upload Preset:', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    console.log('API Key:', process.env.REACT_APP_CLOUDINARY_API_KEY);
    console.log('All REACT_APP vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
    console.log('===================================');
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setUploadResult(null);
      console.log('File selected:', file.name, file.type, file.size);
    }
  };

  const uploadToCloudinary = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    // Debug environment variables
    debugEnvVars();

    const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      setError('Cloudinary configuration missing. Check environment variables.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      console.log('Starting upload to Cloudinary...');
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'collabcanvas');

      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      console.log('Upload URL:', uploadUrl);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Upload failed:', errorData);
        throw new Error(`Upload failed: ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Upload successful:', result);

      setUploadResult({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      });

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Cloudinary Upload Test
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Environment Variables Status
        </Typography>
        <Typography variant="body2" color={process.env.REACT_APP_CLOUDINARY_CLOUD_NAME ? 'success.main' : 'error.main'}>
          Cloud Name: {process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'NOT SET'}
        </Typography>
        <Typography variant="body2" color={process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET ? 'success.main' : 'error.main'}>
          Upload Preset: {process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'NOT SET'}
        </Typography>
        <Typography variant="body2" color={process.env.REACT_APP_CLOUDINARY_API_KEY ? 'success.main' : 'error.main'}>
          API Key: {process.env.REACT_APP_CLOUDINARY_API_KEY || 'NOT SET'}
        </Typography>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Upload Image
        </Typography>
        
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="image-upload-input"
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="image-upload-input">
          <Button
            variant="outlined"
            component="span"
            startIcon={<CloudUpload />}
            sx={{ mb: 2 }}
          >
            Select Image
          </Button>
        </label>

        {selectedFile && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </Typography>
        )}

        <Button
          variant="contained"
          onClick={uploadToCloudinary}
          disabled={!selectedFile || uploading}
          startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
          fullWidth
        >
          {uploading ? 'Uploading...' : 'Upload to Cloudinary'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {uploadResult && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="success.main">
            Upload Successful!
          </Typography>

          <img
            src={uploadResult.url}
            alt="Uploaded"
            style={{ maxWidth: '100%', height: 'auto', marginBottom: 16 }}
          />

          <Typography variant="body2" gutterBottom>
            <strong>URL:</strong> {uploadResult.url}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Public ID:</strong> {uploadResult.publicId}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Dimensions:</strong> {uploadResult.width} x {uploadResult.height}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Format:</strong> {uploadResult.format}
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Size:</strong> {(uploadResult.bytes / 1024 / 1024).toFixed(2)} MB
          </Typography>

          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => setShowEditor(true)}
            sx={{ mt: 2 }}
            fullWidth
          >
            Edit Image
          </Button>
        </Paper>
      )}

      {/* Advanced Image Editor */}
      <AdvancedImageEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        initialImageUrl={uploadResult?.url}
        onSave={(result) => {
          console.log('Image saved:', result);
          setShowEditor(false);
          // You could update the uploadResult here with the edited version
        }}
      />
    </Box>
  );
};

export default ImageUploadTest;
