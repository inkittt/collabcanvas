import { supabase } from '../lib/supabase';
import { queueElementForSync } from '../lib/realtimeService';

// Immediately check for any pending canvas syncs on import
setTimeout(() => {
  try {
    const pendingSyncs = JSON.parse(localStorage.getItem('pendingCanvasSyncs') || '[]');
    if (pendingSyncs.length > 0) {
      console.log(`Found ${pendingSyncs.length} pending canvas syncs, will attempt to sync them...`);
      CanvasService._syncPendingCanvasesToDatabase();
    }
  } catch (e) {
    console.error('Error checking for pending canvas syncs:', e);
  }
}, 5000); // Wait 5 seconds after import to allow app to initialize

/**
 * Service for handling canvas interactions with Supabase
 */
export const CanvasService = {
  /**
   * Join a canvas using an invite code by calling the Supabase RPC function.
   * @param {string} inviteCode - The invite code for the canvas.
   * @returns {Promise<string|null>} - The canvas ID if successful, or null if failed.
   */
  async joinCanvasByInviteCode(inviteCode) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated.');
      }

      console.log(`Attempting to join canvas with invite code: ${inviteCode} for user ${user.id}`);

      const { data: canvasId, error } = await supabase.rpc('join_canvas_with_invite_code', {
        p_invite_code: inviteCode,
        p_user_id: user.id
      });

      if (error) {
        console.error('Error joining canvas via RPC:', error);
        throw error;
      }

      if (!canvasId) {
        console.warn('RPC call did not return a canvas ID. Invite code might be invalid or user already a collaborator.');
        // No explicit error throw here, let the dashboard handle null canvasId
      }

      console.log('Successfully joined canvas, or already a member. Canvas ID:', canvasId);
      return canvasId; // This will be the canvas_id or null
    } catch (error) {
      console.error('Exception in joinCanvasByInviteCode:', error);
      throw error; // Re-throw to be caught by the caller in CanvasDashboard
    }
  },

  /**
   * Get all canvases that the current user has access to
   * @returns {Promise<Array>} - List of canvases
   */
  async getUserCanvases() {
    try {
      console.log('Getting user canvases...');

      // Get current user to check permissions
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        console.warn('No authenticated user found');
        return [];
      }
      console.log('Current user ID:', currentUser.id);

      // First try to get from Supabase
      let canvases = [];
      try {
        // First approach: Try to get all canvases the user owns
        console.log('Retrieving canvases owned by current user...');
        const { data: ownedCanvases, error: ownedError } = await supabase
          .from('canvases')
          .select(`
            id,
            name,
            description,
            owner_id,
            is_public,
            created_at,
            updated_at,
            profiles:owner_id (username, avatar_url)
          `)
          .eq('owner_id', currentUser.id)
          .order('updated_at', { ascending: false });

        if (!ownedError && ownedCanvases) {
          // Mark these as owned canvases
          canvases = ownedCanvases.map(canvas => ({
            ...canvas,
            user_role: 'owner'
          }));
          console.log('Retrieved owned canvases from Supabase:', canvases.length);
        } else {
          console.warn('Error getting owned canvases:', ownedError);
        }

        // Second approach: Get canvases where user is a collaborator
        console.log('Retrieving canvases where user is a collaborator...');
        const { data: collaboratorCanvases, error: collaboratorError } = await supabase
          .from('canvas_collaborators')
          .select(`
            canvases (
              id,
              name,
              description,
              owner_id,
              is_public,
              created_at,
              updated_at,
              profiles:owner_id (username, avatar_url)
            )
          `)
          .eq('user_id', currentUser.id);

        if (!collaboratorError && collaboratorCanvases) {
          // Extract canvas data from the nested structure and add to list
          const collaboratorCanvasData = collaboratorCanvases
            .map(item => item.canvases)
            .filter(canvas => canvas !== null) // Filter out any null canvases
            .map(canvas => ({
              ...canvas,
              user_role: 'collaborator'
            }));
          canvases = [...canvases, ...collaboratorCanvasData];
          console.log('Added collaborator canvases, total count:', canvases.length);
        } else {
          console.warn('Error getting collaborator canvases:', collaboratorError);
        }

        // Third approach: Get public canvases (excluding ones already in the list)
        console.log('Retrieving public canvases...');
        const existingCanvasIds = canvases.map(canvas => canvas.id);

        let publicCanvasQuery = supabase
          .from('canvases')
          .select(`
            id,
            name,
            description,
            owner_id,
            is_public,
            created_at,
            updated_at,
            profiles:owner_id (username, avatar_url)
          `)
          .eq('is_public', true)
          .order('updated_at', { ascending: false });

        // Only add the exclusion filter if there are existing canvas IDs
        if (existingCanvasIds.length > 0) {
          publicCanvasQuery = publicCanvasQuery.not('id', 'in', `(${existingCanvasIds.join(',')})`);
        }

        const { data: publicCanvases, error: publicError } = await publicCanvasQuery;

        if (!publicError && publicCanvases) {
          // Mark these as public canvases (user is neither owner nor collaborator)
          const publicCanvasData = publicCanvases.map(canvas => ({
            ...canvas,
            user_role: 'public'
          }));
          canvases = [...canvases, ...publicCanvasData];
          console.log('Added public canvases, total count:', canvases.length);
        } else {
          console.warn('Error getting public canvases:', publicError);
        }
      } catch (error) {
        console.warn('Exception during Supabase canvas retrieval:', error);
      }

      // Remove duplicates based on canvas ID (in case a canvas appears in multiple categories)
      const uniqueCanvases = [];
      const seenIds = new Set();

      for (const canvas of canvases) {
        if (!seenIds.has(canvas.id)) {
          seenIds.add(canvas.id);
          uniqueCanvases.push(canvas);
        }
      }
      canvases = uniqueCanvases;
      console.log('After deduplication, canvas count:', canvases.length);

      // Then get local canvases
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const localCanvasesRaw = localStorage.getItem('localCanvases');
        console.log('Raw localStorage value for localCanvases:', localCanvasesRaw);
        
        const localCanvases = JSON.parse(localCanvasesRaw || '[]');
        console.log('Retrieved canvases from localStorage:', localCanvases.length, localCanvases);
        
        // Filter to only get canvases owned by user or public ones
        const userLocalCanvases = localCanvases.filter(
          canvas => canvas.owner_id === currentUser.id || canvas.is_public
        );
        console.log('Filtered user local canvases:', userLocalCanvases.length);
        
        // Add any local canvases that aren't already in the supabase list
        for (const localCanvas of userLocalCanvases) {
          if (!canvases.some(c => c.id === localCanvas.id)) {
            // Create a profile object to match structure from Supabase
            localCanvas.profiles = {
              username: currentUser.email || 'User',
              avatar_url: null
            };
            // Determine user role for local canvas
            localCanvas.user_role = localCanvas.owner_id === currentUser.id ? 'owner' : 'public';
            canvases.push(localCanvas);
          }
        }
      }
      
      // Sort by updated_at date
      canvases.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      
      console.log('Total canvases returned:', canvases.length, canvases);
      return canvases;
    } catch (error) {
      console.error('Error fetching user canvases:', error);
      
      // Final fallback - return just local canvases
      try {
        const localCanvases = JSON.parse(localStorage.getItem('localCanvases') || '[]');
        return localCanvases;
      } catch (e) {
        console.error('Complete failure in getUserCanvases', e);
        return [];
      }
    }
  },

  /**
   * Get a specific canvas by ID
   * @param {string} canvasId - The UUID of the canvas to retrieve
   * @returns {Promise<Object>} - Canvas data
   */
  async getCanvas(canvasId) {
    try {
      console.log('Getting canvas details for:', canvasId);
      
      // First try to get from Supabase
      try {
        const { data, error } = await supabase
          .from('canvases')
          .select(`
            id,
            name,
            owner_id,
            is_public,
            created_at,
            updated_at,
            profiles:owner_id (username, avatar_url)
          `)
          .eq('id', canvasId)
          .single();
  
        if (!error && data) {
          console.log('Canvas found in Supabase');
          return data;
        }
      } catch (error) {
        console.warn('Error retrieving canvas from Supabase:', error);
      }
      
      // If not found in Supabase, try localStorage
      console.log('Checking localStorage for canvas');
      const localCanvases = JSON.parse(localStorage.getItem('localCanvases') || '[]');
      const localCanvas = localCanvases.find(canvas => canvas.id === canvasId);
      
      if (localCanvas) {
        console.log('Canvas found in localStorage');
        
        // Add a profiles property if not present
        if (!localCanvas.profiles) {
          // Try to get user data for the owner
          try {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', localCanvas.owner_id)
              .single();
              
            if (ownerProfile) {
              localCanvas.profiles = ownerProfile;
            } else {
              // Fallback profile
              localCanvas.profiles = {
                username: 'User',
                avatar_url: null
              };
            }
          } catch (error) {
            // Fallback profile
            localCanvas.profiles = {
              username: 'User',
              avatar_url: null
            };
          }
        }
        
        return localCanvas;
      }
      
      throw new Error('Canvas not found');
    } catch (error) {
      console.error(`Error fetching canvas ${canvasId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new canvas with robust error handling and local storage fallback
   * @param {Object} canvasData - Data for the new canvas
   * @returns {Promise<Object>} - The created canvas
   */
  async createCanvas(canvasData) {
    try {
      console.log('Creating new canvas...');
      
      // Get current user to set as owner
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');
      console.log('Creating canvas for user:', user.id);
      
      // First verify Supabase connection and permissions
      try {
        // Check if we can access the canvases table
        const { data: testData, error: testError } = await supabase
          .from('canvases')
          .select('count')
          .limit(1);
          
        console.log('Connection test result:', { testData, testError });
        
        if (testError) {
          console.warn('⚠️ Possible permission issue with canvases table:', testError);
        }
      } catch (testError) {
        console.warn('⚠️ Error testing Supabase connection:', testError);
      }
      
      // Create a unique identifier for the canvas using UUID format
      const canvasId = crypto.randomUUID();
      const now = new Date().toISOString();
      
      // Generate an invite code (stored locally only if DB doesn't have invite_code column)
      const inviteCode = canvasData.inviteCode || Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create canvas data object with all properties for local storage
      const canvasObject = {
        id: canvasId,
        name: canvasData.name,
        description: canvasData.description || '',
        owner_id: user.id,
        is_public: canvasData.isPublic || false,
        invite_code: inviteCode,
        created_at: now,
        updated_at: now
      };
      
      console.log('Canvas object to create:', canvasObject);
      
      // First, store locally to ensure we have a backup
      this._saveCanvasToLocalStorage(canvasObject, inviteCode);
      
      // Try to save to Supabase
      let dbSaveSuccess = false;
      let dbResult = null;
      
      // Check if we're online first
      if (navigator.onLine) {
        // Try a simpler direct insert without the problematic invite_code column
        try {
          console.log('Attempting to create canvas in database...');
          
          // Create the canvas with invite_code included
          const dbCanvasData = {
            id: canvasId,
            name: canvasData.name,
            description: canvasData.description || '',
            owner_id: user.id,
            is_public: canvasData.isPublic || false,
            created_at: now,
            updated_at: now,
            invite_code: inviteCode // Include the invite_code now that we have this column
          };
          
          const { data, error } = await supabase
            .from('canvases')
            .insert([dbCanvasData])
            .select();
            
          if (!error && data && data.length > 0) {
            console.log('✅ Canvas created successfully in database');
            dbSaveSuccess = true;
            dbResult = data[0];
            
            // Add back the invite_code for the app to use
            dbResult.invite_code = inviteCode;
          } else {
            console.error('Supabase insert error:', error);
            // Log additional details about the error
            console.error('Error details:', {
              code: error?.code,
              message: error?.message,
              details: error?.details,
              hint: error?.hint
            });
            
            // Try without select (simpler)
            console.log('Attempting simplified insert without select...');
            const { error: error2 } = await supabase
              .from('canvases')
              .insert([dbCanvasData]);
              
            if (!error2) {
              console.log('✅ Canvas created in database (simplified method)');
              dbSaveSuccess = true;
              dbResult = canvasObject; // Use our local object since we didn't get a return value
            } else {
              console.error('Simplified insert error:', error2);
            }
          }
        } catch (insertError) {
          console.error('Exception during database insert:', insertError);
        }
      } else {
        console.warn('Browser is offline, skipping immediate database save');
      }
      
      // If database save failed, schedule sync with retry logic
      if (!dbSaveSuccess) {
        // Schedule a retry attempt for database save
        this._scheduleCanvasSyncToDatabase(canvasObject);
        
        console.warn('⚠️ Canvas temporarily stored only in local storage');
        console.warn('Will attempt to sync to database in background');
      }
      
      // Return the canvas object (from DB if available, otherwise local)
      return dbResult || canvasObject;
    } catch (error) {
      console.error('Error creating canvas:', error);
      throw error;
    }
  },
  
  /**
   * Helper to save canvas to localStorage
   * @private
   */
  _saveCanvasToLocalStorage(canvasObject, inviteCode) {
    try {
      // Add to localCanvases array
      const localCanvases = JSON.parse(localStorage.getItem('localCanvases') || '[]');
      
      // Check if canvas already exists
      const existingIndex = localCanvases.findIndex(c => c.id === canvasObject.id);
      if (existingIndex >= 0) {
        // Update existing canvas
        localCanvases[existingIndex] = canvasObject;
      } else {
        // Add new canvas
        localCanvases.push(canvasObject);
      }
      
      localStorage.setItem('localCanvases', JSON.stringify(localCanvases));
      
      // Store the invite code
      if (inviteCode) {
        const canvasInvites = JSON.parse(localStorage.getItem('canvasInvites') || '{}');
        canvasInvites[canvasObject.id] = inviteCode;
        localStorage.setItem('canvasInvites', JSON.stringify(canvasInvites));
      }
      
      console.log('Canvas saved to localStorage:', canvasObject.id);
      return true;
    } catch (error) {
      console.error('Error saving canvas to localStorage:', error);
      return false;
    }
  },
  
  /**
   * Schedule a background sync of canvas to database
   * @private
   */
  _scheduleCanvasSyncToDatabase(canvasObject) {
    // Store this canvas in pendingSync
    try {
      const pendingSyncs = JSON.parse(localStorage.getItem('pendingCanvasSyncs') || '[]');
      
      // Check if this canvas is already in pending syncs
      const existingIndex = pendingSyncs.findIndex(item => item.canvas.id === canvasObject.id);
      
      if (existingIndex >= 0) {
        // Update existing entry
        pendingSyncs[existingIndex] = {
          canvas: canvasObject,
          timestamp: new Date().toISOString(),
          attempts: (pendingSyncs[existingIndex].attempts || 0) + 1
        };
      } else {
        // Add new entry
        pendingSyncs.push({
          canvas: canvasObject,
          timestamp: new Date().toISOString(),
          attempts: 0
        });
      }
      
      localStorage.setItem('pendingCanvasSyncs', JSON.stringify(pendingSyncs));
      
      // Set up a timeout to attempt the sync (short delay for first attempt, longer for retries)
      const delay = pendingSyncs.find(item => item.canvas.id === canvasObject.id)?.attempts > 3 ? 30000 : 5000;
      console.log(`Scheduling canvas sync in ${delay/1000} seconds`);
      setTimeout(() => this._syncPendingCanvasesToDatabase(), delay);
    } catch (error) {
      console.error('Error scheduling canvas sync:', error);
    }
  },
  
  /**
   * Attempt to sync pending canvases to database
   * @private
   */
  async _syncPendingCanvasesToDatabase() {
    try {
      // Check if we're online first
      if (!navigator.onLine) {
        console.warn('Browser is offline, skipping canvas sync');
        return;
      }

      // Verify we have a valid user session
      const { data: { user: syncUser } } = await supabase.auth.getUser();
      if (!syncUser) {
        console.warn('No authenticated user found, skipping canvas sync');
        setTimeout(() => this._syncPendingCanvasesToDatabase(), 30000); // Try again in 30 seconds
        return;
      }
      console.log('Syncing canvases for user:', syncUser.id);

      // Test the Supabase connection before attempting sync
      try {
        const { error: testError } = await supabase.from('profiles').select('id').limit(1);
        if (testError) {
          console.warn('Supabase connection test failed, skipping sync:', testError);
          // Reschedule for later
          setTimeout(() => this._syncPendingCanvasesToDatabase(), 60000); // Try again in 1 minute
          return;
        }
      } catch (testError) {
        console.warn('Supabase connection test exception, skipping sync:', testError);
        setTimeout(() => this._syncPendingCanvasesToDatabase(), 60000);
        return;
      }
      
      // Check if canvases table exists and get its columns
      try {
        console.log('Checking schema for canvases table...');
        const { data: schemaData, error: schemaError } = await supabase
          .from('canvases')
          .select('id')
          .limit(1);
          
        if (schemaError) {
          console.warn('Cannot access canvases table, schema may be incorrect:', schemaError);
          setTimeout(() => this._syncPendingCanvasesToDatabase(), 60000);
          return;
        }
        console.log('Canvases table schema check passed');
      } catch (schemaError) {
        console.warn('Schema check exception:', schemaError);
        setTimeout(() => this._syncPendingCanvasesToDatabase(), 60000);
        return;
      }
      
      const pendingSyncs = JSON.parse(localStorage.getItem('pendingCanvasSyncs') || '[]');
      if (pendingSyncs.length === 0) return;
      
      console.log(`Attempting to sync ${pendingSyncs.length} pending canvases to database...`);
      
      // Process each pending canvas
      const updatedPendingSyncs = [];
      for (const item of pendingSyncs) {
        try {
          // Skip canvases not owned by current user
          if (item.canvas.owner_id !== syncUser.id) {
            console.warn(`Skipping canvas ${item.canvas.id} - belongs to different user`);
            continue;
          }
          
          // Make sure we have all the required fields
          const now = new Date().toISOString();
          
          // SIMPLIFIED: Only use columns we know exist in the database
          const canvasData = {
            id: item.canvas.id,
            name: item.canvas.name,
            owner_id: syncUser.id, // Ensure owner ID matches current user
            is_public: item.canvas.is_public,
            // NOTE: Removed invite_code as it doesn't exist in your schema
            created_at: item.canvas.created_at || now,
            updated_at: now // Always update timestamp
          };
          
          console.log('Attempting to insert canvas with data:', canvasData);
          
          // Direct insert - simpler approach
          const { error } = await supabase
            .from('canvases')
            .insert([canvasData]);
          
          if (error) {
            console.error('Failed to sync canvas:', error);
            console.error('Error details:', {
              code: error?.code,
              message: error?.message,
              details: error?.details,
              hint: error?.hint
            });
            
            // Update attempts count
            item.attempts = (item.attempts || 0) + 1;
            
            // If we've tried too many times, mark for extended delay
            if (item.attempts > 10) {
              item.extended_retry = true;
              console.warn(`Canvas ${item.canvas.id} has failed to sync ${item.attempts} times, will retry with extended delay`);
            }
            
            updatedPendingSyncs.push(item);
          } else {
            console.log('✅ Successfully synced canvas:', item.canvas.id);
            
            // Verify canvas was actually created
            const { data: verifyData, error: verifyError } = await supabase
              .from('canvases')
              .select('id')
              .eq('id', item.canvas.id)
              .single();
              
            if (!verifyError && verifyData) {
              console.log('✅ Canvas sync verified in database');
            } else {
              console.warn('⚠️ Canvas sync verification failed:', verifyError);
              updatedPendingSyncs.push(item); // Keep in pending list if verification fails
            }
          }
        } catch (syncError) {
          console.error('Error syncing canvas:', syncError);
          item.attempts = (item.attempts || 0) + 1;
          updatedPendingSyncs.push(item);
        }
      }
      
      // Update pending syncs
      localStorage.setItem('pendingCanvasSyncs', JSON.stringify(updatedPendingSyncs));
      
      if (updatedPendingSyncs.length > 0) {
        console.warn(`${updatedPendingSyncs.length} canvases still need syncing`);
        
        // Schedule another attempt with increasing delay based on failures
        const maxAttempts = Math.max(...updatedPendingSyncs.map(item => item.attempts || 0), 0);
        const delay = Math.min(maxAttempts * 10000, 300000); // Gradually increase delay, max 5 minutes
        
        console.log(`Scheduling next sync attempt in ${delay/1000} seconds`);
        setTimeout(() => this._syncPendingCanvasesToDatabase(), delay);
      } else {
        console.log('All canvases synced successfully!');
      }
    } catch (error) {
      console.error('Error in sync process:', error);
      // Reschedule even after error
      setTimeout(() => this._syncPendingCanvasesToDatabase(), 60000);
    }
  },

  /**
   * Update a canvas
   * @param {string} canvasId - The UUID of the canvas to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - The updated canvas
   */
  async updateCanvas(canvasId, updateData) {
    try {
      const { data, error } = await supabase
        .from('canvases')
        .update({
          name: updateData.name,
          is_public: updateData.isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', canvasId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating canvas ${canvasId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a canvas and all related data
   * @param {string} canvasId - The UUID of the canvas to delete
   * @returns {Promise<Object>} - Result of the operation
   */
  async deleteCanvas(canvasId) {
    console.log(`Attempting to delete canvas ${canvasId}`);

    try {
      // Delete the canvas - related records (elements, collaborators, messages) will be automatically deleted via CASCADE
      const { error: canvasError } = await supabase
        .from('canvases')
        .delete()
        .eq('id', canvasId);

      if (canvasError) {
        throw new Error(`Could not delete canvas: ${canvasError.message}`);
      }

      console.log(`Canvas ${canvasId} and all related data successfully deleted via CASCADE`);
      
      // 3. Clean up local storage references to this canvas
      try {
        // Clean up invite codes
        const canvasInvites = JSON.parse(localStorage.getItem('canvasInvites') || '{}');
        const inviteCode = canvasInvites[canvasId];
        
        if (inviteCode) {
          // Remove from canvasInvites
          delete canvasInvites[canvasId];
          localStorage.setItem('canvasInvites', JSON.stringify(canvasInvites));
          
          // Also remove from canvasInviteCodes if it exists
          const storedInviteCodes = JSON.parse(localStorage.getItem('canvasInviteCodes') || '{}');
          if (storedInviteCodes[inviteCode]) {
            delete storedInviteCodes[inviteCode];
            localStorage.setItem('canvasInviteCodes', JSON.stringify(storedInviteCodes));
          }
        }
        
        // Remove from local canvases if present
        const localCanvases = JSON.parse(localStorage.getItem('localCanvases') || '[]');
        const updatedLocalCanvases = localCanvases.filter(canvas => canvas.id !== canvasId);
        localStorage.setItem('localCanvases', JSON.stringify(updatedLocalCanvases));
        
        console.log(`Canvas ${canvasId} successfully deleted with all related data`);
        return { success: true };
      } catch (storageErr) {
        console.warn('Error cleaning up localStorage after canvas deletion:', storageErr);
        // Continue since the database deletion was successful
        return { success: true, warning: 'Local storage cleanup failed' };
      }
    } catch (error) {
      console.error(`Error deleting canvas ${canvasId}:`, error);
      
      // Even if the server-side deletion failed, clean up local storage as a fallback
      try {
        const localCanvases = JSON.parse(localStorage.getItem('localCanvases') || '[]');
        const updatedLocalCanvases = localCanvases.filter(canvas => canvas.id !== canvasId);
        localStorage.setItem('localCanvases', JSON.stringify(updatedLocalCanvases));
        
        // Clean up invite codes too
        const canvasInvites = JSON.parse(localStorage.getItem('canvasInvites') || '{}');
        if (canvasInvites[canvasId]) {
          delete canvasInvites[canvasId];
          localStorage.setItem('canvasInvites', JSON.stringify(canvasInvites));
        }
        
        return { 
          success: false, 
          error: error.message,
          fallback: true,
          message: 'Server deletion failed but canvas was removed from local storage'
        };
      } catch (localErr) {
        // If even the local cleanup fails, we have a serious problem
        throw error;
      }
    }
  },

  /**
   * Get all elements for a canvas
   * @param {string} canvasId - The UUID of the canvas
   * @returns {Promise<Array>} - List of canvas elements
   * @deprecated Use ElementService.getCanvasElements() instead
   */
  async getCanvasElements(canvasId) {
    console.warn('CanvasService.getCanvasElements is deprecated. Use ElementService.getCanvasElements instead.');
    // Forward to the ElementService
    const { ElementService } = require('./elementService');
    return await ElementService.getCanvasElements(canvasId);
  },

  /**
   * Add an element to a canvas
   * @param {string} canvasId - The UUID of the canvas
   * @param {Object} elementData - Element data (type and properties)
   * @returns {Promise<Object>} - The created element
   */
  async addElement(canvasId, elementData) {
    try {
      // First try to add via Supabase
      const { data, error } = await supabase
        .from('elements')
        .insert({
          canvas_id: canvasId,
          element_type: elementData.type,
          data: elementData.data,
          // user_id will be set to auth.uid() by RLS
        })
        .select()
        .single();

      if (!error) {
        console.log('Element added to database successfully:', data);
        return data;
      }
      
      console.error('Error adding element to database:', error);
      throw error;
    } catch (error) {
      console.error(`Error adding element to canvas ${canvasId}:`, error);
      throw error;
    }
  },
  
  /**
   * Add a canvas element with the correct structure
   * @param {string} canvasId - The UUID of the canvas
   * @param {Object} elementData - Element data with element_type and data properties
   * @returns {Promise<Object>} - The created element
   * @deprecated Use ElementService.addCanvasElement() instead
   */
  async addCanvasElement(canvasId, elementData) {
    console.warn('CanvasService.addCanvasElement is deprecated. Use ElementService.addCanvasElement instead.');
    // Forward to the ElementService
    const { ElementService } = require('./elementService');
    return await ElementService.addCanvasElement(canvasId, elementData);
  },
  /**
   * Save element to local storage
   * @private
   * @param {string} canvasId - Canvas ID
   * @param {Object} elementObject - Element object to save
   * @returns {boolean} - Success status
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
      
      localStorage.setItem(key, JSON.stringify(localElements));
      return true;
    } catch (error) {
      console.error('Error saving element to localStorage:', error);
      return false;
    }
  },
  
  /**
   * Update canvas timestamp when elements change
   * @private
   * @param {string} canvasId - Canvas ID to update
   */
  async _updateCanvasTimestamp(canvasId) {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('canvases')
        .update({ updated_at: now })
        .eq('id', canvasId);
      
      if (error) {
        console.warn('Failed to update canvas timestamp:', error);
      }
    } catch (error) {
      console.warn('Error updating canvas timestamp:', error);
    }
  },
  
  /**
   * Update a canvas element
   * @param {string} canvasId - Canvas ID
   * @param {string} elementId - The UUID of the element
   * @param {Object} elementData - Element data with element_type and data properties
   * @returns {Promise<Object>} - The updated element
   */
  async updateCanvasElement(canvasId, elementId, elementData) {
    try {
      const { data, error } = await supabase
        .from('elements')
        .update({
          element_type: elementData.element_type,
          data: elementData.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', elementId)
        .eq('canvas_id', canvasId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating element ${elementId} in canvas ${canvasId}:`, error);
      throw error;
    }
  },

  /**
   * Update an element
   * @param {string} elementId - The UUID of the element to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} - The updated element
   */
  async updateElement(elementId, updateData) {
    try {
      const { data, error } = await supabase
        .from('elements')
        .update({
          data: updateData.data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', elementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating element ${elementId}:`, error);
      throw error;
    }
  },

  /**
   * Delete an element
   * @param {string} elementId - The UUID of the element to delete
   * @returns {Promise<void>}
   */
  async deleteElement(elementId) {
    try {
      const { error } = await supabase
        .from('elements')
        .delete()
        .eq('id', elementId);

      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting element ${elementId}:`, error);
      throw error;
    }
  },

  /**
   * Get collaborators for a canvas
   * @param {string} canvasId - The UUID of the canvas
   * @returns {Promise<Array>} - List of collaborators with their permissions
   */
  async getCollaborators(canvasId) {
    try {
      console.log('Getting collaborators for canvas:', canvasId);
      
      // First try to get from Supabase
      try {
        const { data, error } = await supabase
          .from('canvas_collaborators')
          .select(`
            id,
            permission_level,
            created_at,
            profiles:user_id (id, username, avatar_url)
          `)
          .eq('canvas_id', canvasId);
  
        if (!error) {
          console.log('Collaborators found in Supabase:', data.length);
          return data || [];
        }
      } catch (error) {
        console.warn('Error getting collaborators from Supabase:', error);
      }
      
      // Get the owner info for the local canvas
      const localCanvases = JSON.parse(localStorage.getItem('localCanvases') || '[]');
      const localCanvas = localCanvases.find(canvas => canvas.id === canvasId);
      
      if (localCanvas) {
        // Check if we have any "local collaborators" via localStorage
        const localCollaborators = JSON.parse(localStorage.getItem(`collaborators_${canvasId}`) || '[]');
        
        // If we have some local collaborators, return those
        if (localCollaborators.length > 0) {
          console.log('Found local collaborators:', localCollaborators.length);
          return localCollaborators;
        }
        
        // Otherwise, just return an empty array - there are no collaborators yet
        console.log('No collaborators found for local canvas');
        return [];
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching collaborators for canvas ${canvasId}:`, error);
      return []; // Return empty array as a fallback
    }
  },



  /**
   * Update a collaborator's permission level
   * @param {string} collaboratorId - The UUID of the collaborator record
   * @param {string} permissionLevel - New permission level
   * @returns {Promise<Object>} - The updated collaborator record
   */
  async updateCollaboratorPermission(collaboratorId, permissionLevel) {
    try {
      const { data, error } = await supabase
        .from('canvas_collaborators')
        .update({
          permission_level: permissionLevel,
        })
        .eq('id', collaboratorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating collaborator ${collaboratorId}:`, error);
      throw error;
    }
  },

  /**
   * Remove a collaborator from a canvas
   * @param {string} collaboratorId - The UUID of the collaborator record
   * @returns {Promise<void>}
   */
  async removeCollaborator(collaboratorId) {
    try {
      const { error } = await supabase
        .from('canvas_collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;
    } catch (error) {
      console.error(`Error removing collaborator ${collaboratorId}:`, error);
      throw error;
    }
  },

  /**
   * Helper to save element to localStorage
   * @private
   * @param {string} canvasId - Canvas ID
   * @param {Object} elementObject - Element object to save
   * @returns {boolean} - Success status
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
      
      localStorage.setItem(key, JSON.stringify(localElements));
      return true;
    } catch (error) {
      console.error('Error saving element to localStorage:', error);
      return false;
    }
  },

  /**
   * Update canvas timestamp when elements change
   * @private
   * @param {string} canvasId - Canvas ID
   */
  async _updateCanvasTimestamp(canvasId) {
    try {
      const now = new Date().toISOString();
      await supabase
        .from('canvases')
        .update({ updated_at: now })
        .eq('id', canvasId);
    } catch (error) {
      console.warn('Failed to update canvas timestamp:', error);
    }
  },

  /**
   * Schedule an element for background sync to database
   * @private
   * @param {Object} elementObject - Element to sync
   */
  _scheduleElementSyncToDatabase(elementObject) {
    try {
      const pendingElements = JSON.parse(localStorage.getItem('pendingElements') || '[]');
      pendingElements.push({
        element: elementObject,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pendingElements', JSON.stringify(pendingElements));
      
      // Set up a timeout to attempt the sync
      setTimeout(() => this._syncPendingElementsToDatabase(), 5000);
    } catch (error) {
      console.error('Error scheduling element sync:', error);
    }
  },

  /**
   * Sync pending elements to database
   * @private
   */
  async _syncPendingElementsToDatabase() {
    try {
      const pendingElements = JSON.parse(localStorage.getItem('pendingElements') || '[]');
      if (pendingElements.length === 0) return;
      
      console.log(`Attempting to sync ${pendingElements.length} pending elements to database...`);
      
      const updatedPendingElements = [];
      for (const item of pendingElements) {
        try {
          const { error } = await supabase
            .from('elements')
            .insert([item.element]);
          
          if (error) {
            console.error('Failed to sync element:', error);
            updatedPendingElements.push(item);
          } else {
            console.log('✅ Successfully synced element:', item.element.id);
            
            // Also update the canvas timestamp
            await this._updateCanvasTimestamp(item.element.canvas_id);
          }
        } catch (syncError) {
          console.error('Error syncing element:', syncError);
          updatedPendingElements.push(item);
        }
      }
      
      // Update pending elements
      localStorage.setItem('pendingElements', JSON.stringify(updatedPendingElements));
      
      if (updatedPendingElements.length > 0) {
        console.warn(`${updatedPendingElements.length} elements still need syncing`);
      } else {
        console.log('All elements synced successfully!');
      }
    } catch (error) {
      console.error('Error in sync process:', error);
    }
  },

  /**
   * Setup Realtime subscriptions for canvas changes
   * @param {string} canvasId - Canvas ID to subscribe to
   * @param {Function} onElementAdded - Callback when element is added
   * @param {Function} onElementUpdated - Callback when element is updated
   * @param {Function} onElementDeleted - Callback when element is deleted
   * @returns {Object} - Subscription object for later cleanup
   */
  setupRealtimeSubscriptions(canvasId, onElementAdded, onElementUpdated, onElementDeleted) {
    console.log('Setting up Realtime subscriptions for canvas:', canvasId);
    
    // Subscribe to elements table changes for this canvas
    const elementSubscription = supabase
      .channel(`elements:${canvasId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        console.log('Realtime: New element added', payload);
        if (onElementAdded) onElementAdded(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        console.log('Realtime: Element updated', payload);
        if (onElementUpdated) onElementUpdated(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'elements',
        filter: `canvas_id=eq.${canvasId}`
      }, (payload) => {
        console.log('Realtime: Element deleted', payload);
        if (onElementDeleted) onElementDeleted(payload.old);
      })
      .subscribe();
    
    return elementSubscription;
  }
}; 