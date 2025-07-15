import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { useAuth } from '../../auth/AuthContext';
import { subscribeToCanvas } from '../../lib/realtimeService';
import { CanvasService } from '../../services/canvasService';
import { ElementService } from '../../services/elementService';
import { ProfileService } from '../../services/profileService';
import { uploadImage } from '../../services/cloudinaryService';
import CollaborativeImageEditor from './CollaborativeImageEditor';
import AdvancedImageEditor from '../ImageEditor/AdvancedImageEditor';
import ExportDialog from './ExportDialog';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Avatar,
  AvatarGroup,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon,
  Circle as CircleIcon,
  Square as SquareIcon,
  TextFields as TextIcon,
  PanTool as PanToolIcon,
  Image as ImageIcon,
  Edit as EditIcon,
  Crop as CropIcon,
  Palette as PaletteIcon,
  Tune as TuneIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// Tool types
const TOOL_TYPES = {
  SELECT: 'select',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  PAN: 'pan',
  DRAW: 'draw',
  IMAGE: 'image',
};

const CanvasEditor = ({
  canvasId,
  readOnly = false,
  onImageEditingModeChange,
  onShowImageEditingSidebar
}) => {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState({});
  const [activeTool, setActiveTool] = useState(TOOL_TYPES.SELECT);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [userId, setUserId] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState(null);
  const [fileInputRef] = useState(React.createRef());
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [selectedImageElement, setSelectedImageElement] = useState(null);

  // Helper function to check if canvas is ready
  const isCanvasReady = useCallback(() => {
    if (!fabricCanvasRef.current) return false;

    try {
      const context = fabricCanvasRef.current.getContext('2d');
      return context !== null;
    } catch (error) {
      return false;
    }
  }, []);

  // Helper function to safely render canvas
  const safeRenderCanvas = useCallback((canvas) => {
    try {
      if (canvas && canvas.getContext && canvas.getContext('2d')) {
        canvas.renderAll();
      }
    } catch (renderError) {
      console.warn('Canvas render error:', renderError);
    }
  }, []);
  const [advancedEditorOpen, setAdvancedEditorOpen] = useState(false);
  const [imageEditingMode, setImageEditingMode] = useState(false);
  const [showImageEditingSidebar, setShowImageEditingSidebar] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isUserModifying, setIsUserModifying] = useState(false); // Flag to prevent real-time conflicts
  const updateTimeoutRef = useRef(null); // For debouncing real-time updates
  const elementStatesRef = useRef(new Map()); // Track element states to prevent flickering
  const subscriptionRef = useRef(null); // Track subscription to prevent duplicates
  const elementsLoadedRef = useRef(false); // Track if elements have been loaded
  const activeToolRef = useRef(activeTool); // Track current tool for event handlers

  const [userProfile, setUserProfile] = useState(null); // Current user's profile



  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await ProfileService.getCurrentProfile();
        setUserId(user?.id);
        setUserProfile(profileData);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    if (user) {
      loadProfile();
    }
  }, [user]);



  // Save current canvas state to undo stack
  const saveCanvasState = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const json = canvas.toJSON(['id']);

    setUndoStack(prev => [...prev, json]);
    setRedoStack([]);
  }, []);

  // Save element to database
  const saveElement = useCallback(async (fabricObject, elementType) => {
    if (!canvasId || !fabricObject) return;

    try {
      const elementData = {
        element_type: elementType,
        data: {
          left: fabricObject.left,
          top: fabricObject.top,
          width: fabricObject.width,
          height: fabricObject.height,
          scaleX: fabricObject.scaleX,
          scaleY: fabricObject.scaleY,
          angle: fabricObject.angle,
          opacity: fabricObject.opacity,
          ...(elementType === 'image' && { src: fabricObject.getSrc() }),
          ...(elementType === 'text' && {
            text: fabricObject.text,
            fontFamily: fabricObject.fontFamily,
            fontSize: fabricObject.fontSize,
            fill: fabricObject.fill
          }),
          ...(elementType === 'rectangle' && { fill: fabricObject.fill }),
          ...(elementType === 'circle' && {
            radius: fabricObject.radius,
            fill: fabricObject.fill
          }),
        },
      };

      const savedElement = await ElementService.addCanvasElement(canvasId, elementData);
      fabricObject.set('id', savedElement.id);
      saveCanvasState();
    } catch (error) {
      console.error('Error saving element:', error);
    }
  }, [canvasId, saveCanvasState]);

  // Handle image upload with Cloudinary
  const handleImageUpload = useCallback(async (e) => {
    console.log('Image upload triggered');

    // DEBUG: Check environment variables
    console.log('DEBUG - Cloud Name:', process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
    console.log('DEBUG - Upload Preset:', process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET);
    console.log('DEBUG - API Key:', process.env.REACT_APP_CLOUDINARY_API_KEY);
    console.log('DEBUG - All env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_CLOUDINARY')));
    console.log('DEBUG - All REACT_APP vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')));
    console.log('DEBUG - Process env keys count:', Object.keys(process.env).length);
    if (!fabricCanvasRef.current || !canvasId) {
      console.error('Canvas or canvasId not available', { fabricCanvas: !!fabricCanvasRef.current, canvasId });
      return;
    }

    const file = e.target.files[0];
    if (!file) {
      console.warn('No file selected');
      return;
    }

    // Check if file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    // Increased file size limit for Cloudinary (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size should be less than 10MB');
      return;
    }

    try {
      setLoading(true);
      console.log('Uploading image to Cloudinary...', file.name, file.type, file.size);

      // Upload to Cloudinary first
      const cloudinaryResult = await uploadImage(file, {
        folder: 'collabcanvas',
        tags: ['canvas-image', canvasId],
      });

      console.log('Image uploaded to Cloudinary:', cloudinaryResult);

      // Now load the image from Cloudinary URL to get dimensions and position it
      fabric.Image.fromURL(cloudinaryResult.url, async (img) => {
        try {
          console.log('Image loaded from Cloudinary into fabric', img);

          // Calculate center position for the image
          const canvas = fabricCanvasRef.current;
          if (!canvas || !canvas.getContext || !canvas.getContext('2d')) {
            console.error('Canvas or canvas context not available');
            setLoading(false);
            return;
          }

          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;

          // Scale the image if it's too large for the canvas
          const maxDimension = 400; // Slightly larger since we have better quality from Cloudinary
          let scaleX = 1;
          let scaleY = 1;

          if (img.width > maxDimension || img.height > maxDimension) {
            const scale = Math.min(maxDimension / img.width, maxDimension / img.height);
            scaleX = scale;
            scaleY = scale;
          }

          // Set image properties
          img.set({
            left: centerX - (img.width * scaleX) / 2,
            top: centerY - (img.height * scaleY) / 2,
            scaleX: scaleX,
            scaleY: scaleY,
          });

          // Create element data with Cloudinary URL
          const imageData = {
            element_type: 'image',
            data: {
              left: img.left,
              top: img.top,
              scaleX: img.scaleX,
              scaleY: img.scaleY,
              width: img.width,
              height: img.height,
              src: cloudinaryResult.url, // Store Cloudinary URL instead of base64
              cloudinaryPublicId: cloudinaryResult.publicId, // Store for transformations
              originalWidth: cloudinaryResult.width,
              originalHeight: cloudinaryResult.height,
              format: cloudinaryResult.format,
              bytes: cloudinaryResult.bytes,
            },
          };

          console.log('Saving image data to database');
          // Save to database - this will trigger real-time update that adds to canvas
          const savedElement = await ElementService.addCanvasElement(canvasId, imageData);
          console.log('Image saved to database with ID:', savedElement.id);

          // Don't add to canvas here - let the real-time subscription handle it
          // This prevents the double image bug

          // Save canvas state
          if (typeof saveCanvasState === 'function') {
            saveCanvasState();
          }

          // Switch back to select tool
          setActiveTool(TOOL_TYPES.SELECT);

          console.log('Image upload completed successfully');

        } catch (error) {
          console.error('Error processing image:', error);
          alert('Failed to save image. Please try again.');
        } finally {
          setLoading(false);
        }
      }, {
        crossOrigin: 'anonymous',
        // Add error handling for image loading failure
        onError: (error) => {
          console.error('Error loading image from Cloudinary:', error);
          setLoading(false);
          alert('Failed to load image from Cloudinary. Please try again.');
        }
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      setLoading(false);

      // Provide more specific error messages
      if (error.message.includes('configuration')) {
        alert('Cloudinary is not configured. Please check your environment variables.');
      } else if (error.message.includes('upload failed')) {
        alert('Failed to upload image to Cloudinary. Please try again.');
      } else {
        alert('Failed to process image. Please try again.');
      }
    }

    // Clear the file input
    e.target.value = null;
  }, [canvasId, fabricCanvasRef, setLoading, saveCanvasState, setActiveTool]);

  // Add an element to the canvas
  const addElementToCanvas = useCallback((element) => {
    if (!isCanvasReady()) {
      console.warn('Canvas not ready, skipping element:', element.id);
      return;
    }

    const canvas = fabricCanvasRef.current;

    // Check if element already exists on canvas to prevent duplicates
    const existingObject = canvas.getObjects().find(obj => obj.id === element.id);
    if (existingObject) {
      console.log('🚫 Element already exists on canvas, skipping:', element.id, element.element_type);
      return;
    }

    // Check if we've recently processed this element to prevent rapid add/remove cycles
    const elementState = elementStatesRef.current.get(element.id);
    const now = Date.now();
    if (elementState && (now - elementState.lastProcessed) < 200) {
      console.log('🚫 Element recently processed, skipping to prevent flicker:', element.id);
      return;
    }

    // Update element state tracking
    elementStatesRef.current.set(element.id, {
      lastProcessed: now,
      action: 'add',
      version: element.data._version || 0
    });

    console.log('➕ Adding new element to canvas:', element.id, element.element_type);
    
    switch (element.element_type) {
      case 'rectangle':
        const rect = new fabric.Rect({
          left: element.data.left,
          top: element.data.top,
          width: element.data.width,
          height: element.data.height,
          fill: element.data.fill,
          opacity: element.data.opacity || 1,
          scaleX: element.data.scaleX || 1,
          scaleY: element.data.scaleY || 1,
          angle: element.data.angle || 0,
          id: element.id,
        });
        canvas.add(rect);
        break;

      case 'circle':
        const circle = new fabric.Circle({
          left: element.data.left,
          top: element.data.top,
          radius: element.data.radius,
          fill: element.data.fill,
          opacity: element.data.opacity || 1,
          scaleX: element.data.scaleX || 1,
          scaleY: element.data.scaleY || 1,
          angle: element.data.angle || 0,
          id: element.id,
        });
        canvas.add(circle);
        break;

      case 'text':
        const text = new fabric.Text(element.data.text || 'New Text', {
          left: element.data.left,
          top: element.data.top,
          fill: element.data.fill,
          fontSize: element.data.fontSize || 20,
          fontFamily: element.data.fontFamily || 'Arial',
          opacity: element.data.opacity || 1,
          scaleX: element.data.scaleX || 1,
          scaleY: element.data.scaleY || 1,
          angle: element.data.angle || 0,
          id: element.id,
        });
        canvas.add(text);
        break;
        
      case 'image':
        // Check if image already exists on canvas to prevent duplicates
        const existingImg = canvas.getObjects().find(obj => obj.id === element.id);
        if (existingImg) {
          console.log('Image already exists on canvas, skipping duplicate');
          return;
        }

        // Add a delay to ensure canvas is ready
        setTimeout(() => {
          // Double-check canvas availability before loading image
          if (!fabricCanvasRef.current) {
            console.error('Fabric canvas not available when loading image');
            return;
          }

          const canvas = fabricCanvasRef.current;

          // Verify canvas has a valid context
          try {
            const context = canvas.getContext('2d');
            if (!context) {
              console.error('Canvas 2D context not available');
              return;
            }
          } catch (contextError) {
            console.error('Error getting canvas context:', contextError);
            return;
          }

          fabric.Image.fromURL(element.data.src, img => {
            // Final check before adding to canvas
            if (!fabricCanvasRef.current) {
              console.error('Canvas lost during image loading');
              return;
            }

          // Set image properties carefully to preserve original dimensions
          img.set({
            left: element.data.left,
            top: element.data.top,
            scaleX: element.data.scaleX || 1,
            scaleY: element.data.scaleY || 1,
            angle: element.data.angle || 0,
            id: element.id,
          });

          // Apply filters if they exist
          if (element.data.filters && element.data.filters.length > 0) {
            element.data.filters.forEach((filterData, i) => {
              if (filterData.type === 'Brightness') {
                img.filters[i] = new fabric.Image.filters.Brightness(filterData);
              } else if (filterData.type === 'Contrast') {
                img.filters[i] = new fabric.Image.filters.Contrast(filterData);
              } else if (filterData.type === 'Grayscale') {
                img.filters[i] = new fabric.Image.filters.Grayscale();
              } else if (filterData.type === 'Blur') {
                img.filters[i] = new fabric.Image.filters.Blur(filterData);
              } else if (filterData.type === 'Saturation') {
                img.filters[i] = new fabric.Image.filters.Saturation(filterData);
              } else if (filterData.type === 'Sepia') {
                img.filters[i] = new fabric.Image.filters.Sepia();
              } else if (filterData.type === 'Invert') {
                img.filters[i] = new fabric.Image.filters.Invert();
              }
            });
            img.applyFilters();
          }

          // Add context menu event for editing
          img.on('contextmenu', (e) => {
            if (readOnly) return;

            // Show context menu
            setContextMenuPosition({ left: e.e.clientX, top: e.e.clientY });
            setSelectedImage(img);
            e.e.preventDefault();
          });

          try {
            canvas.add(img);
            canvas.renderAll();
            console.log('Image added to canvas from database:', element.id);
          } catch (renderError) {
            console.error('Error rendering image on canvas:', renderError);
          }
          }, { crossOrigin: 'anonymous' });
        }, 200); // 200ms delay
        break;
        
      default:
        console.warn('Unknown element type:', element.element_type);
        break;
    }

    safeRenderCanvas(canvas);
  }, [isCanvasReady, safeRenderCanvas]);

  // Update an element on the canvas
  const updateElementOnCanvas = useCallback((element) => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();

    // Find the object with matching ID
    const obj = objects.find(obj => obj.id === element.id);

    if (obj) {
      // Skip update if user is currently modifying this element
      if (isUserModifying && canvas.getActiveObject() === obj) {
        console.log('⏸️ Skipping real-time update - user is modifying element:', element.id);
        return;
      }

      // Check if we've recently processed this element to prevent rapid updates
      const elementState = elementStatesRef.current.get(element.id);
      const now = Date.now();
      if (elementState && (now - elementState.lastProcessed) < 200) {
        console.log('🚫 Element recently updated, skipping to prevent flicker:', element.id);
        return;
      }

      // Update element state tracking
      elementStatesRef.current.set(element.id, {
        lastProcessed: now,
        action: 'update',
        version: element.data._version || 0
      });

      console.log('🔄 Updating element on canvas:', element.id, element.element_type);
      // For images, check if the src has changed (Cloudinary transformation)
      if (obj.type === 'image' && element.data.src && element.data.src !== obj.getSrc()) {
        // Image URL has changed, need to reload the image
        fabric.Image.fromURL(element.data.src, (newImg) => {
          // Check if canvas is still available
          if (!canvas || !canvas.getContext) {
            console.error('Canvas not available when updating image');
            return;
          }

          // Copy properties from old image
          newImg.set({
            left: element.data.left,
            top: element.data.top,
            scaleX: element.data.scaleX || obj.scaleX || 1,
            scaleY: element.data.scaleY || obj.scaleY || 1,
            angle: element.data.angle || obj.angle || 0,
            opacity: element.data.opacity || obj.opacity || 1,
            id: element.id,
          });

          // Remove old image and add new one
          canvas.remove(obj);
          canvas.add(newImg);
          canvas.renderAll();

          console.log('Updated image with new URL on canvas:', element.id);
        }, { crossOrigin: 'anonymous' });
        return;
      }

      // For all elements, only update transform properties to avoid scaling issues
      // Don't update width/height/radius as they can compound with scaleX/scaleY
      const updateProps = {
        left: element.data.left,
        top: element.data.top,
        scaleX: element.data.scaleX || obj.scaleX || 1,
        scaleY: element.data.scaleY || obj.scaleY || 1,
        angle: element.data.angle || obj.angle || 0,
        opacity: element.data.opacity || obj.opacity || 1,
      };

      // Add element-specific properties that are safe to update
      if (obj.type === 'text' && element.data.text !== undefined) {
        updateProps.text = element.data.text;
        updateProps.fill = element.data.fill || obj.fill;
        updateProps.fontSize = element.data.fontSize || obj.fontSize;
        updateProps.fontFamily = element.data.fontFamily || obj.fontFamily;
      } else if ((obj.type === 'rect' || obj.type === 'circle') && element.data.fill !== undefined) {
        updateProps.fill = element.data.fill;
      }

      obj.set(updateProps);
      obj.setCoords();
      safeRenderCanvas(canvas);

      console.log('Updated element on canvas:', element.id, obj.type);
    }
  }, [isUserModifying, safeRenderCanvas]);

  // Remove an element from the canvas
  const removeElementFromCanvas = useCallback((elementId) => {
    console.log('🗑️ removeElementFromCanvas called with elementId:', elementId);

    if (!fabricCanvasRef.current) {
      console.warn('🗑️ Canvas not available for element removal');
      return;
    }

    const canvas = fabricCanvasRef.current;
    const objects = canvas.getObjects();

    console.log('🗑️ Current canvas objects:', objects.length);
    console.log('🗑️ Looking for object with ID:', elementId);

    // Find the object with matching ID
    const obj = objects.find(obj => obj.id === elementId);

    if (obj) {
      console.log('🗑️ Found object to remove:', obj.type, obj.id);
      canvas.remove(obj);
      safeRenderCanvas(canvas);
      console.log('🗑️ Element removed from canvas successfully');
    } else {
      console.warn('🗑️ Object not found on canvas for deletion:', elementId);
      console.log('🗑️ Available object IDs:', objects.map(o => o.id));
    }
  }, [safeRenderCanvas]);

  // Handle element selection
  const handleElementSelect = useCallback((options) => {
    const selectedObjects = fabricCanvasRef.current?.getActiveObjects() || [];
    console.log('Selection changed:', selectedObjects.length, selectedObjects.map(obj => obj.type));

    // If a single image is selected, enable image editing
    if (selectedObjects.length === 1 && selectedObjects[0].type === 'image') {
      console.log('Image selected for editing:', selectedObjects[0].id);
      setSelectedImage(selectedObjects[0]);
      setImageEditingMode(true);
      onImageEditingModeChange?.(true, selectedObjects[0]);
    } else {
      console.log('No image selected, disabling image editing mode');
      setSelectedImage(null);
      setImageEditingMode(false);
      setShowImageEditingSidebar(false);
      onImageEditingModeChange?.(false, null);
      onShowImageEditingSidebar?.(false);
    }
  }, [onImageEditingModeChange, onShowImageEditingSidebar]);

  // Open image editor for existing image
  const openImageEditor = useCallback(async () => {
    if (!selectedImage) return;

    try {
      // Find the element data for this image
      const elements = await ElementService.getCanvasElements(canvasId);
      const imageElement = elements.find(el => el.id === selectedImage.id);

      if (imageElement) {
        setSelectedImageElement(imageElement);
        setImageEditorOpen(true);
      } else {
        console.error('Could not find image element data');
      }
    } catch (error) {
      console.error('Error opening image editor:', error);
    }

    setContextMenuPosition(null);
  }, [selectedImage, canvasId]);

  // Handle image update from collaborative editor
  const handleImageUpdate = useCallback((updatedElement) => {
    // Update the canvas element
    updateElementOnCanvas(updatedElement);

    // Update the selected image element
    setSelectedImageElement(updatedElement);
  }, [updateElementOnCanvas]);

  // Handle context menu close
  const handleContextMenuClose = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  // Handle image editing tool selection
  const handleImageEditingTool = useCallback((tool) => {
    if (!selectedImage) return;

    switch (tool) {
      case 'crop':
        setShowImageEditingSidebar(true);
        onShowImageEditingSidebar?.(true, 'crop', selectedImage);
        break;
      case 'filter':
        setShowImageEditingSidebar(true);
        onShowImageEditingSidebar?.(true, 'filter', selectedImage);
        break;
      case 'adjust':
        setShowImageEditingSidebar(true);
        onShowImageEditingSidebar?.(true, 'adjust', selectedImage);
        break;
      default:
        break;
    }
  }, [selectedImage, onShowImageEditingSidebar]);
  
  // Handle tool selection
  const handleToolSelect = useCallback((tool) => {
    setActiveTool(tool);
    activeToolRef.current = tool; // Update ref for event handlers

    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;

    switch (tool) {
      case TOOL_TYPES.SELECT:
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        break;

      case TOOL_TYPES.PAN:
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
        break;

      default:
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        break;
    }
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    // Clear the loading state if we've been waiting too long
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, forcing end of loading state');
        setLoading(false);
      }
    }, 3000); // 3 second timeout as a fallback

    // Only proceed if we have a canvas reference and haven't initialized fabric yet
    if (!canvasRef.current || fabricCanvasRef.current) {
      console.log('Canvas ref not ready or fabric already initialized');
      return () => clearTimeout(loadingTimeout);
    }

    // Reset state when initializing new canvas
    elementsLoadedRef.current = false;
    elementStatesRef.current.clear();
    activeToolRef.current = activeTool; // Initialize tool ref

    // Ensure the canvas element is properly mounted in the DOM
    if (!canvasRef.current.parentElement || !document.contains(canvasRef.current)) {
      console.log('Canvas element not properly mounted in DOM');
      return () => clearTimeout(loadingTimeout);
    }

    console.log('Initializing canvas with ID:', canvasId);

    let fabricCanvas;
    try {
      // Ensure canvas has proper dimensions before creating Fabric canvas
      const parentWidth = canvasRef.current.parentElement.offsetWidth || 800;
      const canvasHeight = 500;

      // Set canvas element dimensions first
      canvasRef.current.width = parentWidth;
      canvasRef.current.height = canvasHeight;

      // Create fabric canvas
      fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: parentWidth,
        height: canvasHeight,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
      });

      // Verify canvas context is available
      const context = fabricCanvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get 2D context from canvas');
      }

      fabricCanvasRef.current = fabricCanvas;

      // Set up initial fabric canvas properties
      fabricCanvas.selection = true;
      fabricCanvas.defaultCursor = 'default';

      console.log('✅ Canvas initialized successfully');
      setLoading(false);
    } catch (error) {
      console.error('Error initializing canvas:', error);
      setLoading(false);
      return () => clearTimeout(loadingTimeout);
    }

    // If we reach here, canvas was initialized successfully
    const handleResize = () => {
      if (fabricCanvas && canvasRef.current && canvasRef.current.parentElement) {
        fabricCanvas.setWidth(canvasRef.current.parentElement.offsetWidth);
        fabricCanvas.renderAll();
      }
    };
    
    window.addEventListener('resize', handleResize);



    if (!readOnly) {
      // Mouse down event for creating shapes
      const handleMouseDown = async (options) => {
        if (!canvasId || !userId) return;

        const pointer = fabricCanvas.getPointer(options.e);
        const currentTool = activeToolRef.current; // Use ref to get current tool

        console.log('Mouse down with tool:', currentTool);

        // Create shapes based on selected tool
        switch (currentTool) {
          case TOOL_TYPES.RECTANGLE:
            try {
              const rectangleData = {
                element_type: 'rectangle',
                data: {
                  left: pointer.x - 50,
                  top: pointer.y - 50,
                  width: 100,
                  height: 100,
                  fill: '#3f51b5',
                  opacity: 0.7,
                },
              };
              
              // First add to canvas immediately for responsive feel
              const rect = new fabric.Rect({
                ...rectangleData.data,
                id: 'temp_' + Math.random()
              });
              fabricCanvas.add(rect);
              fabricCanvas.renderAll();
              fabricCanvas.setActiveObject(rect);
              
              // Then save to storage
              const savedElement = await ElementService.addCanvasElement(canvasId, rectangleData);
              
              // Update the object ID with the saved ID
              rect.set('id', savedElement.id);
              fabricCanvas.renderAll();
              
              saveCanvasState();
              
              // Switch back to select tool after creating the shape
              setActiveTool(TOOL_TYPES.SELECT);
              activeToolRef.current = TOOL_TYPES.SELECT;
            } catch (error) {
              console.error('Error adding rectangle:', error);
            }
            break;
            
          case TOOL_TYPES.CIRCLE:
            try {
              const circleData = {
                element_type: 'circle',
                data: {
                  left: pointer.x - 50,
                  top: pointer.y - 50,
                  radius: 50,
                  fill: '#f50057',
                  opacity: 0.7,
                },
              };
              
              const savedElement = await ElementService.addCanvasElement(canvasId, circleData);
              addElementToCanvas(savedElement);
              saveCanvasState();
              
              // Switch back to select tool after creating the shape
              setActiveTool(TOOL_TYPES.SELECT);
              activeToolRef.current = TOOL_TYPES.SELECT;
            } catch (error) {
              console.error('Error adding circle:', error);
            }
            break;
            
          case TOOL_TYPES.TEXT:
            try {
              const textData = {
                element_type: 'text',
                data: {
                  left: pointer.x,
                  top: pointer.y,
                  text: 'New Text',
                  fontFamily: 'Arial',
                  fontSize: 20,
                  fill: '#000000',
                },
              };
              
              const savedElement = await ElementService.addCanvasElement(canvasId, textData);
              addElementToCanvas(savedElement);
              saveCanvasState();
              
              // Switch back to select tool after creating the shape
              setActiveTool(TOOL_TYPES.SELECT);
              activeToolRef.current = TOOL_TYPES.SELECT;
            } catch (error) {
              console.error('Error adding text:', error);
            }
            break;
            
          default:
            // Do nothing for other tools
            break;
        }
      };

      fabricCanvas.on('mouse:down', handleMouseDown);

      // Selection events for image editing
      fabricCanvas.on('selection:created', handleElementSelect);
      fabricCanvas.on('selection:updated', handleElementSelect);
      fabricCanvas.on('selection:cleared', () => {
        setSelectedImage(null);
        setImageEditingMode(false);
        onImageEditingModeChange?.(false, null);
      });

      // Track when user starts/stops modifying objects
      fabricCanvas.on('object:moving', () => setIsUserModifying(true));
      fabricCanvas.on('object:scaling', () => setIsUserModifying(true));
      fabricCanvas.on('object:rotating', () => setIsUserModifying(true));
      fabricCanvas.on('object:modified', () => {
        // Small delay to allow the modification to complete before allowing real-time updates
        setTimeout(() => setIsUserModifying(false), 500);
      });

      // Object modified event for history tracking and real-time sync
      fabricCanvas.on('object:modified', async (e) => {
        const modifiedObject = e.target;

        // Save to history
        saveCanvasState();

        // Sync position changes to database for real-time collaboration
        if (modifiedObject && modifiedObject.id && !modifiedObject.id.startsWith('temp_')) {
          try {
            // For all elements, just store the current transform properties
            // Don't recalculate width/height as it compounds scaling issues
            const updateData = {
              position: {
                x: modifiedObject.left,
                y: modifiedObject.top
              },
              data: {
                left: modifiedObject.left,
                top: modifiedObject.top,
                scaleX: modifiedObject.scaleX || 1,
                scaleY: modifiedObject.scaleY || 1,
                angle: modifiedObject.angle || 0,
                opacity: modifiedObject.opacity || 1,
                // For images, preserve the src
                ...(modifiedObject.type === 'image' && {
                  src: modifiedObject.getSrc ? modifiedObject.getSrc() : modifiedObject.src,
                }),
                // For text elements, preserve text properties
                ...(modifiedObject.type === 'text' && {
                  text: modifiedObject.text,
                  fontFamily: modifiedObject.fontFamily,
                  fontSize: modifiedObject.fontSize,
                  fill: modifiedObject.fill,
                }),
                // For shapes, preserve fill and original dimensions
                ...(modifiedObject.type === 'rect' && {
                  fill: modifiedObject.fill,
                  width: modifiedObject.width, // Use original width, not scaled
                  height: modifiedObject.height, // Use original height, not scaled
                }),
                ...(modifiedObject.type === 'circle' && {
                  fill: modifiedObject.fill,
                  radius: modifiedObject.radius, // Use original radius, not scaled
                }),
              }
            };

            // Update element in database for real-time sync
            await ElementService.updateElement(modifiedObject.id, updateData);
            console.log('✅ Element synced:', modifiedObject.id, modifiedObject.type);
          } catch (error) {
            console.error('❌ Error syncing element:', error);
          }
        }
      });
    }
    
    // Load elements from database with much shorter timeout
    const loadElements = async () => {
      if (!canvasId) {
        setLoading(false);
        return;
      }

      // Wait for canvas to be fully initialized before loading elements
      if (!fabricCanvas) {
        console.log('Canvas not ready for element loading');
        setLoading(false);
        return;
      }

      // Prevent loading elements multiple times
      if (elementsLoadedRef.current) {
        console.log('Elements already loaded, skipping');
        setLoading(false);
        return;
      }

      try {
        // Force loading to false after a shorter timeout
        const timeout = setTimeout(() => {
          setLoading(false);
          console.log('Force loading to false after timeout');
        }, 1500);

        try {
          const elements = await ElementService.getCanvasElements(canvasId);

          // Add elements to canvas only if canvas is still available
          if (elements && elements.length > 0 && fabricCanvas) {
            console.log(`📦 Loading ${elements.length} elements from storage`);

            // Mark elements as loaded to prevent reloading
            elementsLoadedRef.current = true;

            // Add elements with a small delay between each one
            elements.forEach((element, index) => {
              setTimeout(() => {
                if (fabricCanvasRef.current && elementsLoadedRef.current) { // Check canvas is still available
                  console.log(`📦 Loading element ${index + 1}/${elements.length}:`, element.id);
                  addElementToCanvas(element);
                }
              }, index * 50); // Reduced delay to 50ms
            });
          } else {
            // Mark as loaded even if no elements
            elementsLoadedRef.current = true;
          }
        } catch (elementError) {
          console.error('Error loading canvas elements, continuing anyway:', elementError);
          elementsLoadedRef.current = true; // Mark as loaded to prevent retry loops
        }
        
        // Set up subscription for real-time updates (only if not already subscribed)
        if (!subscriptionRef.current) {
          try {
            console.log('🔗 Setting up real-time subscription for canvas:', canvasId);
            subscriptionRef.current = subscribeToCanvas(canvasId, {
              onElementAdded: (element) => {
                if (element && element.id && elementsLoadedRef.current) {
                  console.log('🔥 Real-time: Element added:', element.id);
                  // Use immediate execution for additions but with duplicate checking
                  addElementToCanvas(element);
                }
              },
              onElementUpdated: (element) => {
                if (element && element.id && elementsLoadedRef.current) {
                  console.log('🔥 Real-time: Element updated:', element.id);
                  // Debounce element updates to prevent rapid flickering
                  clearTimeout(updateTimeoutRef.current);
                  updateTimeoutRef.current = setTimeout(() => {
                    updateElementOnCanvas(element);
                  }, 50); // Reduced from 100ms to 50ms for more responsive updates
                }
              },
              onElementDeleted: (elementId) => {
                if (elementId) {
                  console.log('🔥 Real-time: Element deleted:', elementId);
                  console.log('🔥 Elements loaded state:', elementsLoadedRef.current);
                  removeElementFromCanvas(elementId);
                } else {
                  console.warn('🔥 Real-time: Received delete event with no elementId');
                }
              },
            });
          } catch (subscriptionError) {
            console.warn('Error setting up realtime subscription:', subscriptionError);
          }
        } else {
          console.log('Real-time subscription already exists, skipping');
        }


        
        clearTimeout(timeout);
        setLoading(false);
      } catch (error) {
        console.error('Error loading canvas elements:', error);
        setLoading(false);
      }
    };
    
    // Always load the canvas, even if elements fail to load
    // Add a small delay to ensure canvas is fully initialized
    setTimeout(() => {
      loadElements();
    }, 100);
    
    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(updateTimeoutRef.current);

      window.removeEventListener('resize', handleResize);

      // Clear element states tracking
      elementStatesRef.current.clear();

      // Reset loaded flag
      elementsLoadedRef.current = false;

      // Clean up subscription
      if (subscriptionRef.current) {
        console.log('🔌 Cleaning up real-time subscription');
        if (typeof subscriptionRef.current.unsubscribe === 'function') {
          subscriptionRef.current.unsubscribe();
        }
        subscriptionRef.current = null;
      }



      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [canvasId, userId]); // Removed problematic dependencies that cause re-initialization



  // Handle undo
  const handleUndo = useCallback(() => {
    if (!fabricCanvasRef.current || undoStack.length === 0) return;
    
    const canvas = fabricCanvasRef.current;
    const currentState = canvas.toJSON(['id']);
    
    setRedoStack(prev => [...prev, currentState]);
    
    const prevState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    canvas.loadFromJSON(prevState, () => {
      canvas.renderAll();
    });
  }, [undoStack]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (!fabricCanvasRef.current || redoStack.length === 0) return;
    
    const canvas = fabricCanvasRef.current;
    const currentState = canvas.toJSON(['id']);
    
    setUndoStack(prev => [...prev, currentState]);
    
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    
    canvas.loadFromJSON(nextState, () => {
      canvas.renderAll();
    });
  }, [redoStack]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const activeObject = canvas.getActiveObject();
    
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        // Delete multiple objects
        const deletePromises = [];
        activeObject.forEachObject((obj) => {
          if (obj.id) {
            deletePromises.push(
              ElementService.deleteElement(obj.id)
                .catch(error => console.error('Error deleting element:', error))
            );
          }
          canvas.remove(obj);
        });
        
        // Wait for all delete operations to complete
        try {
          await Promise.all(deletePromises);
        } catch (error) {
          console.error('Error deleting multiple elements:', error);
        }
        
        canvas.discardActiveObject();
      } else {
        // Delete single object
        if (activeObject.id) {
          try {
            await ElementService.deleteElement(activeObject.id);
          } catch (error) {
            console.error('Error deleting element:', error);
          }
        }
        canvas.remove(activeObject);
      }
      
      canvas.renderAll();
      saveCanvasState();
    }
  }, [saveCanvasState]);

  // Keyboard event handling for delete key
  useEffect(() => {
    if (readOnly) return; // Don't add keyboard listeners in read-only mode

    const handleKeyDown = (e) => {
      // Check if we're focused on an input element
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );

      // Don't handle delete key if user is typing in an input
      if (isInputFocused) return;

      // Handle Delete or Backspace key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); // Prevent browser back navigation on Backspace
        handleDelete();
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [readOnly, handleDelete]);

  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      {loading && (
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'background.default',
            opacity: 0.7,
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      
      {!readOnly && (
        <Paper 
          sx={{ 
            p: 1, 
            mb: 2, 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Tooltip title="Select">
            <IconButton 
              onClick={() => handleToolSelect(TOOL_TYPES.SELECT)}
              color={activeTool === TOOL_TYPES.SELECT ? 'primary' : 'default'}
            >
              <PanToolIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Rectangle">
            <IconButton 
              onClick={() => handleToolSelect(TOOL_TYPES.RECTANGLE)}
              color={activeTool === TOOL_TYPES.RECTANGLE ? 'primary' : 'default'}
            >
              <SquareIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Circle">
            <IconButton 
              onClick={() => handleToolSelect(TOOL_TYPES.CIRCLE)}
              color={activeTool === TOOL_TYPES.CIRCLE ? 'primary' : 'default'}
            >
              <CircleIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Text">
            <IconButton 
              onClick={() => handleToolSelect(TOOL_TYPES.TEXT)}
              color={activeTool === TOOL_TYPES.TEXT ? 'primary' : 'default'}
            >
              <TextIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Upload Image">
            <IconButton
              onClick={() => fileInputRef.current.click()}
              color={activeTool === TOOL_TYPES.IMAGE ? 'primary' : 'default'}
            >
              <ImageIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Advanced Image Editor">
            <IconButton
              onClick={() => setAdvancedEditorOpen(true)}
              color="secondary"
              disabled={readOnly}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>

          {/* Image Editing Tools - Only show when an image is selected */}
          {imageEditingMode && selectedImage && (
            <>
              <Divider orientation="vertical" flexItem />

              <Tooltip title="Crop Image">
                <IconButton
                  onClick={() => handleImageEditingTool('crop')}
                  color={showImageEditingSidebar ? 'primary' : 'default'}
                  disabled={readOnly}
                >
                  <CropIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Apply Filters">
                <IconButton
                  onClick={() => handleImageEditingTool('filter')}
                  color={showImageEditingSidebar ? 'primary' : 'default'}
                  disabled={readOnly}
                >
                  <PaletteIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Adjust Image">
                <IconButton
                  onClick={() => handleImageEditingTool('adjust')}
                  color={showImageEditingSidebar ? 'primary' : 'default'}
                  disabled={readOnly}
                >
                  <TuneIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          <Divider orientation="vertical" flexItem />
          
          <Tooltip title="Undo">
            <IconButton 
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              <UndoIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Redo">
            <IconButton 
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            >
              <RedoIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete">
            <IconButton onClick={handleDelete}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem />

          <Tooltip title="Export Canvas">
            <IconButton onClick={() => setExportDialogOpen(true)}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Paper>
      )}
      
      <Box
        sx={{
          border: '1px solid #ccc',
          borderRadius: 1,
          overflow: 'hidden',
          height: 'calc(100% - 80px)',
          position: 'relative',
        }}
      >
        <canvas ref={canvasRef} />


      </Box>
      
      {Object.keys(activeUsers).length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            Active users:
          </Typography>
          <AvatarGroup max={5}>
            {Object.values(activeUsers).map((user) => (
              <Tooltip key={user.id} title={user.username || 'Anonymous'}>
                <Avatar 
                  src={user.avatar_url} 
                  alt={user.username || 'Anonymous'}
                  sx={{ width: 24, height: 24 }}
                >
                  {(user.username || 'A')[0].toUpperCase()}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Box>
      )}
      
      {/* Context Menu for Images */}
      <Menu
        open={Boolean(contextMenuPosition)}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenuPosition
            ? { top: contextMenuPosition.top, left: contextMenuPosition.left }
            : undefined
        }
      >
        <MenuItem onClick={openImageEditor}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Advanced Edit
        </MenuItem>
      </Menu>

      {/* Collaborative Image Editor */}
      <CollaborativeImageEditor
        open={imageEditorOpen}
        onClose={() => setImageEditorOpen(false)}
        imageElement={selectedImageElement}
        canvasId={canvasId}
        onImageUpdate={handleImageUpdate}
      />

      {/* Advanced Image Editor */}
      <AdvancedImageEditor
        open={advancedEditorOpen}
        onClose={() => setAdvancedEditorOpen(false)}
        canvasId={canvasId}
        onSave={async (result) => {
          console.log('Advanced editor saved image:', result);

          // Create a new image element on the canvas
          if (result.url) {
            try {
              const imageData = {
                element_type: 'image',
                data: {
                  left: 100,
                  top: 100,
                  scaleX: 1,
                  scaleY: 1,
                  src: result.url,
                  originalUrl: result.originalUrl,
                  transformation: result.transformation,
                },
              };

              await ElementService.addCanvasElement(canvasId, imageData);
              setAdvancedEditorOpen(false);
            } catch (error) {
              console.error('Error adding processed image to canvas:', error);
            }
          }
        }}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        fabricCanvas={fabricCanvasRef.current}
      />


    </Box>
  );
};

export default CanvasEditor;
