import { supabase } from '../lib/supabase';
import { queueElementForSync } from '../lib/realtimeService';

/**
 * Service for handling canvas element operations
 */
export const ElementService = {
  /**
   * Get all elements for a canvas
   * @param {string} canvasId - Canvas ID to get elements for
   * @returns {Promise<Array>} - Array of elements
   */
  async getCanvasElements(canvasId) {
    try {
      // Update access time for this canvas
      this._updateCanvasAccessTime(canvasId);

      // First try to load from Supabase
      let elements = [];
      try {
        const { data, error } = await supabase
          .from('elements')
          .select('*')
          .eq('canvas_id', canvasId)
          .order('created_at', { ascending: true });

        if (!error) {
          elements = data || [];
          console.log('Retrieved elements from Supabase:', elements.length);

          // Update local storage with latest data
          this._saveElementsToLocalStorage(canvasId, elements);
        } else {
          console.warn('Error getting elements from Supabase:', error);
        }
      } catch (error) {
        console.warn('Error accessing Supabase elements:', error);
      }

      // Fall back to localStorage if needed
      if (elements.length === 0) {
        const localElements = this._getElementsFromLocalStorage(canvasId);
        console.log('Retrieved elements from localStorage:', localElements.length);
        elements = localElements;
      }

      return elements;
    } catch (error) {
      console.error('Error getting canvas elements:', error);
      // Last resort fallback
      return this._getElementsFromLocalStorage(canvasId);
    }
  },
  
  /**
   * Add a new element to a canvas
   * @param {string} canvasId - Canvas ID to add element to
   * @param {Object} elementData - Element data (with element_type and data properties)
   * @returns {Promise<Object>} - The created element
   */
  async addCanvasElement(canvasId, elementData) {
    try {
      console.log('Adding canvas element:', elementData.element_type);
      console.log('elementService.addCanvasElement called with elementData:', elementData);  
      
      // Get current user to set as owner
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate UUID for element
      const elementId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Add version tracking to element data
      const enhancedData = {
        ...elementData.data,
        _version: 1, // Start with version 1
        _createdAt: now,
        _lastEditTime: now,
        _createdBy: user?.id || 'anonymous'
      };
      
      // Create element object
      const elementObject = {
        id: elementId,
        canvas_id: canvasId,
        element_type: elementData.element_type,
        data: enhancedData,
        user_id: user?.id || 'anonymous',
        created_at: now,
        updated_at: now
      };
      
      // Save to local storage first (as backup)
      this._saveElementToLocalStorage(canvasId, elementObject);
      
      // Try to save to database
      let dbResult = null;
      let dbSaveSuccess = false;
      
      try {
        console.log('elementService inserting elementObject:', elementObject);
        const { data, error } = await supabase
          .from('elements')
          .insert(elementObject)
          .select();
        console.log('elementService insert response:', { data, error });
        
        if (!error && data && data.length > 0) {
          console.log('✅ Element added to database successfully');
          dbSaveSuccess = true;
          dbResult = data[0];
          
          // Update canvas timestamp
          await this._updateCanvasTimestamp(canvasId);
        } else {
          console.error('Error adding element to database:', error);
        }
      } catch (dbError) {
        console.error('Exception during database operation:', dbError);
      }
      
      // If database save failed, add to sync queue
      if (!dbSaveSuccess) {
        console.warn('⚠️ Element temporarily stored only in local storage');
        queueElementForSync(canvasId, elementObject);
      }
      
      return dbResult || elementObject;
    } catch (error) {
      console.error(`Error adding element to canvas ${canvasId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update an existing element
   * @param {string} elementId - Element ID to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - Updated element
   */
  async updateElement(elementId, updateData, baseVersion = null) {
    try {
      let result = null;
      let dbSaveSuccess = false;
      let conflictDetected = false;
      
      // Get the current element first
      const { data: currentElement, error: getError } = await supabase
        .from('elements')
        .select('*')
        .eq('id', elementId)
        .single();
      
      if (getError) {
        console.warn('Error getting element for update:', getError);
        
        // Try to get from localStorage
        const localElement = this._getElementFromLocalStorage(elementId);
        if (!localElement) {
          throw new Error('Element not found in database or localStorage');
        }
        
        // Get current version from local element
        const currentVersion = localElement.data._version || 0;
        
        // If baseVersion is provided, check for conflicts
        if (baseVersion !== null && baseVersion !== currentVersion) {
          console.warn(`Conflict detected in local storage: current version ${currentVersion}, base version ${baseVersion}`);
          conflictDetected = true;
          
          // Return conflict information
          return {
            conflict: true,
            currentElement: localElement,
            message: `Element has been modified since you started editing`
          };
        }
        
        // Prepare updated data with version tracking
        const enhancedData = {
          ...localElement.data,
          ...updateData.data,
          _version: (currentVersion || 0) + 1,
          _lastEditTime: new Date().toISOString(),
          _baseVersion: baseVersion || currentVersion
        };
        
        // Update local element
        const updatedElement = {
          ...localElement,
          data: enhancedData,
          updated_at: new Date().toISOString()
        };
        
        // Save to localStorage
        this._saveElementToLocalStorage(updatedElement.canvas_id, updatedElement);
        
        // Queue for sync
        queueElementForSync(updatedElement.canvas_id, updatedElement);
        
        return {
          conflict: false,
          element: updatedElement
        };
      }
      
      // Element exists in database - check for conflicts
      const currentVersion = currentElement.data._version || 0;
      
      // If baseVersion is provided, perform conflict detection
      if (baseVersion !== null && baseVersion !== currentVersion) {
        console.warn(`Conflict detected in database: current version ${currentVersion}, base version ${baseVersion}`);
        conflictDetected = true;
        
        // Return conflict information
        return {
          conflict: true,
          currentElement,
          message: `Element has been modified since you started editing`
        };
      }
      
      // Prepare updated data with version tracking
      const enhancedData = {
        ...currentElement.data,
        ...updateData.data,
        _version: (currentVersion || 0) + 1,
        _lastEditTime: new Date().toISOString(),
        _baseVersion: baseVersion || currentVersion
      };
      
      // Create updated element with version info
      const updatedElement = {
        ...currentElement,
        data: enhancedData,
        position: updateData.position || currentElement.position, // Include position update
        updated_at: new Date().toISOString()
      };
      
      // Save to localStorage first
      this._saveElementToLocalStorage(updatedElement.canvas_id, updatedElement);
      
      // Try to update in database
      try {
        const { data, error } = await supabase
          .from('elements')
          .update(updatedElement)
          .eq('id', elementId)
          .select();
        
        if (!error && data) {
          console.log('✅ Element updated in database successfully');
          dbSaveSuccess = true;
          result = data[0];
          
          // Update canvas timestamp
          await this._updateCanvasTimestamp(updatedElement.canvas_id);
        } else {
          console.error('Error updating element in database:', error);
        }
      } catch (dbError) {
        console.error('Exception during update operation:', dbError);
      }
      
      // If database save failed, add to sync queue
      if (!dbSaveSuccess) {
        console.warn('⚠️ Element update temporarily stored only in local storage');
        queueElementForSync(updatedElement.canvas_id, updatedElement);
      }
      
      return {
        conflict: false,
        element: result || updatedElement
      };
    } catch (error) {
      console.error(`Error updating element ${elementId}:`, error);
      throw error;
    }
  },
  
  /**
   * Delete an element from a canvas
   * @param {string} elementId - Element ID to delete
   * @returns {Promise<boolean>} - Success flag
   */
  async deleteElement(elementId) {
    try {
      let dbDeleteSuccess = false;
      let canvasId = null;
      
      // Try to get the element first to know its canvas_id
      const { data: element, error: getError } = await supabase
        .from('elements')
        .select('*')
        .eq('id', elementId)
        .single();
        
      if (getError) {
        // Try to get from localStorage
        const localElement = this._getElementFromLocalStorage(elementId);
        if (localElement) {
          canvasId = localElement.canvas_id;
        } else {
          // If we can't find it anywhere, consider it deleted
          return true;
        }
      } else {
        canvasId = element.canvas_id;
      }
      
      // Remove from localStorage
      this._removeElementFromLocalStorage(elementId);
      
      // Try to delete from database
      try {
        const { error } = await supabase
          .from('elements')
          .delete()
          .eq('id', elementId);
        
        if (!error) {
          console.log('✅ Element deleted from database successfully');
          dbDeleteSuccess = true;
          
          // Update canvas timestamp
          if (canvasId) {
            await this._updateCanvasTimestamp(canvasId);
          }
        } else {
          console.error('Error deleting element from database:', error);
        }
      } catch (dbError) {
        console.error('Exception during delete operation:', dbError);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting element ${elementId}:`, error);
      return false;
    }
  },
  
  /**
   * Helper to update canvas timestamp when elements change
   * @private
   * @param {string} canvasId - Canvas ID to update
   */
  async _updateCanvasTimestamp(canvasId) {
    try {
      // Call the RPC function
      const { error } = await supabase.rpc('update_canvas_timestamp_rpc', {
        p_canvas_id: canvasId,
      });

      if (error) {
        console.error(`Error updating canvas timestamp for ${canvasId} via RPC:`, error);
      } else {
        // console.log(`Canvas timestamp updated for ${canvasId} via RPC`); // Optional: uncomment for debugging
      }
    } catch (error) {
      console.error(`Exception updating canvas timestamp for ${canvasId} via RPC:`, error);
    }
  },

  /**
   * Save element to localStorage
   * @private
   * @param {string} canvasId - Canvas ID
   * @param {Object} elementObject - Element to save
   */
  _saveElementToLocalStorage(canvasId, elementObject) {
    try {
      const key = `elements_${canvasId}`;
      const localElements = JSON.parse(localStorage.getItem(key) || '[]');

      // Check if element already exists
      const existingIndex = localElements.findIndex(e => e.id === elementObject.id);
      if (existingIndex >= 0) {
        // Update existing element
        localElements[existingIndex] = elementObject;
      } else {
        // Add new element
        localElements.push(elementObject);
      }

      try {
        localStorage.setItem(key, JSON.stringify(localElements));
        return true;
      } catch (quotaError) {
        if (quotaError.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded, attempting cleanup...');
          this._cleanupLocalStorage();

          // Try again after cleanup
          try {
            localStorage.setItem(key, JSON.stringify(localElements));
            return true;
          } catch (retryError) {
            console.error('Still unable to save after cleanup:', retryError);
            return false;
          }
        }
        throw quotaError;
      }
    } catch (error) {
      console.error('Error saving element to localStorage:', error);
      return false;
    }
  },
  
  /**
   * Save multiple elements to localStorage
   * @private
   * @param {string} canvasId - Canvas ID
   * @param {Array} elements - Elements to save
   */
  _saveElementsToLocalStorage(canvasId, elements) {
    try {
      const key = `elements_${canvasId}`;
      localStorage.setItem(key, JSON.stringify(elements));
      return true;
    } catch (error) {
      console.error('Error saving elements to localStorage:', error);
      return false;
    }
  },
  
  /**
   * Get elements from localStorage
   * @private
   * @param {string} canvasId - Canvas ID to get elements for
   * @returns {Array} - Array of elements
   */
  _getElementsFromLocalStorage(canvasId) {
    try {
      const key = `elements_${canvasId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
      console.error('Error getting elements from localStorage:', error);
      return [];
    }
  },
  
  /**
   * Get a specific element from localStorage
   * @private
   * @param {string} elementId - Element ID to get
   * @returns {Object|null} - Element or null if not found
   */
  _getElementFromLocalStorage(elementId) {
    try {
      // Search through all local elements
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('elements_')) {
          const elements = JSON.parse(localStorage.getItem(key) || '[]');
          const element = elements.find(e => e.id === elementId);
          if (element) {
            return element;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error finding element in localStorage:', error);
      return null;
    }
  },
  
  /**
   * Remove an element from localStorage
   * @private
   * @param {string} elementId - Element ID to remove
   * @returns {boolean} - Success flag
   */
  _removeElementFromLocalStorage(elementId) {
    try {
      // Search through all local elements
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('elements_')) {
          const elements = JSON.parse(localStorage.getItem(key) || '[]');
          const index = elements.findIndex(e => e.id === elementId);
          
          if (index >= 0) {
            elements.splice(index, 1);
            localStorage.setItem(key, JSON.stringify(elements));
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error removing element from localStorage:', error);
      return false;
    }
  },

  /**
   * Clean up localStorage to free space
   * @private
   */
  _cleanupLocalStorage() {
    try {
      console.log('Starting localStorage cleanup...');

      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      let totalSizeBefore = 0;
      let totalSizeAfter = 0;

      // Calculate current size
      keys.forEach(key => {
        totalSizeBefore += localStorage.getItem(key).length;
      });

      console.log(`LocalStorage size before cleanup: ${(totalSizeBefore / 1024).toFixed(2)} KB`);

      // Remove old canvas data (keep only the 5 most recent canvases)
      const canvasKeys = keys.filter(key => key.startsWith('elements_'));
      if (canvasKeys.length > 5) {
        // Sort by last access time if available, otherwise remove oldest
        canvasKeys.sort((a, b) => {
          const aTime = localStorage.getItem(`${a}_lastAccess`) || '0';
          const bTime = localStorage.getItem(`${b}_lastAccess`) || '0';
          return new Date(bTime) - new Date(aTime);
        });

        // Remove oldest canvases
        const toRemove = canvasKeys.slice(5);
        toRemove.forEach(key => {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_lastAccess`);
          console.log(`Removed old canvas data: ${key}`);
        });
      }

      // Remove other old data
      const oldKeys = keys.filter(key =>
        key.startsWith('fabric_') ||
        key.startsWith('canvas_state_') ||
        key.startsWith('temp_')
      );

      oldKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed old data: ${key}`);
      });

      // Calculate size after cleanup
      const remainingKeys = Object.keys(localStorage);
      remainingKeys.forEach(key => {
        totalSizeAfter += localStorage.getItem(key).length;
      });

      console.log(`LocalStorage size after cleanup: ${(totalSizeAfter / 1024).toFixed(2)} KB`);
      console.log(`Freed up: ${((totalSizeBefore - totalSizeAfter) / 1024).toFixed(2)} KB`);

    } catch (error) {
      console.error('Error during localStorage cleanup:', error);
    }
  },

  /**
   * Update last access time for a canvas
   * @private
   * @param {string} canvasId - Canvas ID
   */
  _updateCanvasAccessTime(canvasId) {
    try {
      const key = `elements_${canvasId}_lastAccess`;
      localStorage.setItem(key, new Date().toISOString());
    } catch (error) {
      // Ignore errors for access time tracking
    }
  }
};

export default ElementService;
