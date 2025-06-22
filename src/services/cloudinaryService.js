/**
 * Cloudinary Service for image upload and transformation
 * Handles image uploads and URL-based transformations for real-time collaboration
 */

// Cloudinary configuration from environment variables
const CLOUDINARY_CONFIG = {
  cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
  apiKey: process.env.REACT_APP_CLOUDINARY_API_KEY,
};

// Validate configuration
const validateConfig = () => {
  if (!CLOUDINARY_CONFIG.cloudName || !CLOUDINARY_CONFIG.uploadPreset) {
    console.error('Cloudinary configuration missing. Please check your environment variables:');
    console.error('- REACT_APP_CLOUDINARY_CLOUD_NAME');
    console.error('- REACT_APP_CLOUDINARY_UPLOAD_PRESET');
    return false;
  }
  return true;
};

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file to upload
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} - Cloudinary response with URL and public_id
 */
export const uploadImage = async (file, options = {}) => {
  if (!validateConfig()) {
    throw new Error('Cloudinary configuration is incomplete');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    
    // Add optional parameters
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.publicId) {
      formData.append('public_id', options.publicId);
    }
    if (options.tags) {
      formData.append('tags', options.tags.join(','));
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      resourceType: data.resource_type,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Apply transformations to a Cloudinary URL
 * @param {string} imageUrl - Original Cloudinary URL
 * @param {Array|string} transformations - Array of transformation strings or single transformation
 * @returns {string} - Transformed URL
 */
export const applyTransformations = (imageUrl, transformations) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
    console.warn('Invalid Cloudinary URL provided');
    return imageUrl;
  }

  // Convert single transformation to array
  const transforms = Array.isArray(transformations) ? transformations : [transformations];
  
  // Filter out empty transformations
  const validTransforms = transforms.filter(t => t && t.trim());
  
  if (validTransforms.length === 0) {
    return imageUrl;
  }

  // Join transformations with '/'
  const transformString = validTransforms.join('/');
  
  // Insert transformations into URL
  return imageUrl.replace('/upload/', `/upload/${transformString}/`);
};

/**
 * Remove transformations from a Cloudinary URL to get the original
 * @param {string} transformedUrl - URL with transformations
 * @returns {string} - Original URL without transformations
 */
export const getOriginalUrl = (transformedUrl) => {
  if (!transformedUrl || !transformedUrl.includes('cloudinary.com')) {
    return transformedUrl;
  }

  // Extract the part after /upload/ and find the actual image path
  const parts = transformedUrl.split('/upload/');
  if (parts.length !== 2) return transformedUrl;

  const afterUpload = parts[1];
  const pathParts = afterUpload.split('/');
  
  // Find the actual image file (usually has an extension or is the last meaningful part)
  let imagePath = '';
  for (let i = pathParts.length - 1; i >= 0; i--) {
    const part = pathParts[i];
    if (part.includes('.') || i === pathParts.length - 1) {
      imagePath = pathParts.slice(i).join('/');
      break;
    }
  }

  return `${parts[0]}/upload/${imagePath}`;
};

/**
 * Predefined transformation presets for common use cases
 */
export const TRANSFORMATION_PRESETS = {
  // Basic filters
  grayscale: 'e_grayscale',
  sepia: 'e_sepia',
  blackwhite: 'e_blackwhite',
  
  // Adjustments
  brightness: (value) => `e_brightness:${value}`, // -100 to 100
  contrast: (value) => `e_contrast:${value}`, // -100 to 100
  saturation: (value) => `e_saturation:${value}`, // -100 to 100
  hue: (value) => `e_hue:${value}`, // -100 to 100
  
  // Effects
  blur: (value) => `e_blur:${value}`, // 1 to 2000
  sharpen: (value) => `e_sharpen:${value}`, // 1 to 2000
  pixelate: (value) => `e_pixelate:${value}`, // 1 to 200
  
  // AI-powered
  backgroundRemoval: 'e_background_removal',
  enhance: 'e_enhance',
  upscale: 'e_upscale',
  
  // Artistic filters
  artistic: {
    oilPaint: 'e_art:oil_paint',
    watercolor: 'e_art:watercolor',
    cartoon: 'e_art:cartoon',
    sketch: 'e_art:sketch',
    hokusai: 'e_art:hokusai',
  },
  
  // Resize and crop
  resize: (width, height) => `w_${width},h_${height},c_scale`,
  crop: (width, height, gravity = 'center') => `w_${width},h_${height},c_crop,g_${gravity}`,
  fill: (width, height) => `w_${width},h_${height},c_fill`,
  fit: (width, height) => `w_${width},h_${height},c_fit`,
  
  // Smart cropping
  smartCrop: (width, height) => `w_${width},h_${height},c_thumb,g_auto`,
  faceCrop: (width, height) => `w_${width},h_${height},c_thumb,g_face`,
};

/**
 * Build transformation string from filter object
 * @param {Object} filters - Filter configuration object
 * @returns {string} - Transformation string
 */
export const buildTransformationString = (filters) => {
  const transformations = [];

  // Basic adjustments
  if (filters.brightness && filters.brightness !== 0) {
    transformations.push(TRANSFORMATION_PRESETS.brightness(filters.brightness));
  }
  if (filters.contrast && filters.contrast !== 0) {
    transformations.push(TRANSFORMATION_PRESETS.contrast(filters.contrast));
  }
  if (filters.saturation && filters.saturation !== 0) {
    transformations.push(TRANSFORMATION_PRESETS.saturation(filters.saturation));
  }
  if (filters.hue && filters.hue !== 0) {
    transformations.push(TRANSFORMATION_PRESETS.hue(filters.hue));
  }

  // Effects
  if (filters.blur && filters.blur > 0) {
    transformations.push(TRANSFORMATION_PRESETS.blur(filters.blur));
  }
  if (filters.sharpen && filters.sharpen > 0) {
    transformations.push(TRANSFORMATION_PRESETS.sharpen(filters.sharpen));
  }

  // Boolean filters
  if (filters.grayscale) {
    transformations.push(TRANSFORMATION_PRESETS.grayscale);
  }
  if (filters.sepia) {
    transformations.push(TRANSFORMATION_PRESETS.sepia);
  }
  if (filters.backgroundRemoval) {
    transformations.push(TRANSFORMATION_PRESETS.backgroundRemoval);
  }
  if (filters.enhance) {
    transformations.push(TRANSFORMATION_PRESETS.enhance);
  }

  // Artistic filters
  if (filters.artistic) {
    const artisticFilter = TRANSFORMATION_PRESETS.artistic[filters.artistic];
    if (artisticFilter) {
      transformations.push(artisticFilter);
    }
  }

  // Resize
  if (filters.width || filters.height) {
    const width = filters.width || 'auto';
    const height = filters.height || 'auto';
    const cropMode = filters.cropMode || 'scale';
    
    if (cropMode === 'scale') {
      transformations.push(`w_${width},h_${height},c_scale`);
    } else if (cropMode === 'crop') {
      transformations.push(`w_${width},h_${height},c_crop,g_${filters.gravity || 'center'}`);
    } else if (cropMode === 'fill') {
      transformations.push(`w_${width},h_${height},c_fill`);
    }
  }

  return transformations.join('/');
};

/**
 * Get optimized URL for different device types
 * @param {string} imageUrl - Original Cloudinary URL
 * @param {string} deviceType - 'mobile', 'tablet', 'desktop'
 * @returns {string} - Optimized URL
 */
export const getOptimizedUrl = (imageUrl, deviceType = 'desktop') => {
  const optimizations = {
    mobile: 'w_400,h_400,c_limit,f_auto,q_auto',
    tablet: 'w_800,h_800,c_limit,f_auto,q_auto',
    desktop: 'w_1200,h_1200,c_limit,f_auto,q_auto',
  };

  const optimization = optimizations[deviceType] || optimizations.desktop;
  return applyTransformations(imageUrl, optimization);
};

/**
 * Generate thumbnail URL
 * @param {string} imageUrl - Original Cloudinary URL
 * @param {number} size - Thumbnail size (default: 150)
 * @returns {string} - Thumbnail URL
 */
export const getThumbnailUrl = (imageUrl, size = 150) => {
  return applyTransformations(imageUrl, `w_${size},h_${size},c_thumb,g_auto,f_auto,q_auto`);
};

export default {
  uploadImage,
  applyTransformations,
  getOriginalUrl,
  buildTransformationString,
  getOptimizedUrl,
  getThumbnailUrl,
  TRANSFORMATION_PRESETS,
};
