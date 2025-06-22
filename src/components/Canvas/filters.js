import { fabric } from 'fabric';

// Create a simple filter factory
export const createFilter = (type, options = {}) => {
  try {
    switch (type) {
      case 'grayscale':
        return new fabric.Image.filters.Grayscale();
        
      case 'sepia':
        return new fabric.Image.filters.Sepia({
          sepia: options.intensity || 0.5
        });
        
      case 'brightness':
        return new fabric.Image.filters.Brightness({
          brightness: options.value || 0
        });
        
      case 'contrast':
        return new fabric.Image.filters.Contrast({
          contrast: options.value || 0
        });
        
      case 'hue':
        return new fabric.Image.filters.HueRotation({
          rotation: options.value || 0
        });
        
      case 'blur':
        return new fabric.Image.filters.Blur({
          blur: options.value || 0.1
        });
        
      default:
        console.warn('Unknown filter type:', type);
        return null;
    }
  } catch (error) {
    console.error('Error creating filter:', error);
    return null;
  }
};

// Apply multiple filters to an image object
export const applyFilters = (imageObj, filterConfigs = []) => {
  if (!imageObj) return;
  
  try {
    // Clear existing filters
    imageObj.filters = [];
    
    // Add each filter
    filterConfigs.forEach(config => {
      const filter = createFilter(config.type, config.options);
      if (filter) {
        imageObj.filters.push(filter);
      }
    });
    
    // Apply filters and render
    if (imageObj.filters.length > 0) {
      try {
        imageObj.applyFilters();
      } catch (error) {
        console.error('Error applying filters:', error);
        imageObj.filters = [];
      }
    }
  } catch (error) {
    console.error('Error in applyFilters:', error);
  }
};

// Export filter presets that match the UI
export const FILTER_PRESETS = [
  { 
    name: 'Black White', 
    filters: [{ type: 'grayscale' }] 
  },
  { 
    name: 'Vintage', 
    filters: [{ type: 'sepia', options: { intensity: 0.5 } }] 
  },
  { 
    name: 'Copper', 
    filters: [{ type: 'sepia', options: { intensity: 0.8 } }] 
  },
  { 
    name: 'Sapphire', 
    filters: [
      { type: 'hue', options: { value: 0.6 } },
      { type: 'brightness', options: { value: -0.1 } }
    ] 
  },
  { 
    name: 'Dusk', 
    filters: [
      { type: 'hue', options: { value: 0.8 } },
      { type: 'brightness', options: { value: -0.2 } }
    ] 
  },
  { 
    name: 'Top Hat', 
    filters: [
      { type: 'brightness', options: { value: -0.1 } },
      { type: 'contrast', options: { value: 0.1 } }
    ] 
  },
  { 
    name: 'Black Edge', 
    filters: [{ type: 'brightness', options: { value: -0.2 } }]
  },
  { 
    name: 'Snappy', 
    filters: [{ type: 'contrast', options: { value: 0.2 } }]
  },
  { 
    name: 'Iridescent', 
    filters: [{ type: 'hue', options: { value: 0.1 } }]
  },
];

// Serialize filters to a format that can be stored
export const serializeFilters = (filters) => {
  if (!filters || !Array.isArray(filters)) return null;
  
  try {
    return filters.map(filter => {
      if (!filter) return null;
      
      // Extract relevant properties based on filter type
      if (filter.type === 'Grayscale') {
        return { type: 'grayscale' };
      } else if (filter.type === 'Sepia') {
        return { type: 'sepia', options: { intensity: filter.sepia || 0.5 } };
      } else if (filter.type === 'Brightness') {
        return { type: 'brightness', options: { value: filter.brightness || 0 } };
      } else if (filter.type === 'Contrast') {
        return { type: 'contrast', options: { value: filter.contrast || 0 } };
      } else if (filter.type === 'HueRotation') {
        return { type: 'hue', options: { value: filter.rotation || 0 } };
      } else if (filter.type === 'Blur') {
        return { type: 'blur', options: { value: filter.blur || 0.1 } };
      }
      return null;
    }).filter(Boolean);
  } catch (error) {
    console.error('Error serializing filters:', error);
    return null;
  }
};

// Deserialize filters from stored format
export const deserializeFilters = (filterData) => {
  if (!filterData || !Array.isArray(filterData)) return [];
  
  try {
    return filterData.map(data => {
      if (!data || !data.type) return null;
      
      return createFilter(data.type, data.options || {});
    }).filter(Boolean);
  } catch (error) {
    console.error('Error deserializing filters:', error);
    return [];
  }
};
