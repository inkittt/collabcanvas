import { supabase } from '../lib/supabase';

/**
 * Service for handling user profile operations
 */
export const ProfileService = {
  /**
   * Get the current user's profile
   * @returns {Promise<Object>} - User profile data
   */
  async getCurrentProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // If the profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log('Profile not found, creating a new one');

          // Create a default profile
          const defaultUsername = `user_${user.id.substring(0, 8)}`;

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: defaultUsername,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
          return newProfile;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching current user profile:', error);
      throw error;
    }
  },
  
  /**
   * Get a user profile by ID
   * @param {string} userId - User ID to fetch
   * @returns {Promise<Object>} - User profile data
   */
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching profile for user ${userId}:`, error);
      throw error;
    }
  },
  
  /**
   * Update the current user's profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} - Updated profile data
   */
  async updateProfile(profileData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user logged in');
      
      const updates = {
        id: user.id,
        updated_at: new Date().toISOString(),
        ...profileData
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  /**
   * Upload a profile avatar image
   * @param {File} file - Image file to upload
   * @param {string} userId - User ID (optional, defaults to current user)
   * @returns {Promise<string>} - URL of the uploaded avatar
   */
  async uploadAvatar(file, userId = null) {
    try {
      if (!file) throw new Error('No file provided');

      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');
        userId = user.id;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size too large. Please upload an image smaller than 5MB.');
      }

      // Delete old avatar if exists
      await this.removeAvatar(userId, false); // Don't update profile yet

      const fileExt = file.name.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const filePath = `avatars/${userId}/avatar_${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false // Don't overwrite, create new file
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update the profile with the new avatar URL
      const { data, error } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  /**
   * Remove the current user's avatar
   * @param {string} userId - User ID (optional, defaults to current user)
   * @param {boolean} updateProfile - Whether to update the profile record (default: true)
   * @returns {Promise<boolean>} - Success status
   */
  async removeAvatar(userId = null, updateProfile = true) {
    try {
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user logged in');
        userId = user.id;
      }

      // Get current profile to find existing avatar
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // If there's an existing avatar, try to delete it from storage
      if (profile.avatar_url) {
        try {
          // Extract file path from URL
          const url = new URL(profile.avatar_url);
          const pathParts = url.pathname.split('/');
          // Get the path after '/storage/v1/object/public/avatars/'
          const storagePathIndex = pathParts.findIndex(part => part === 'avatars');
          if (storagePathIndex !== -1 && storagePathIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(storagePathIndex).join('/');

            const { error: deleteError } = await supabase.storage
              .from('avatars')
              .remove([filePath]);

            if (deleteError) {
              console.warn('Could not delete old avatar from storage:', deleteError);
            }
          }
        } catch (storageError) {
          console.warn('Could not parse avatar URL for deletion:', storageError);
        }
      }

      // Update profile to remove avatar URL if requested
      if (updateProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error removing avatar:', error);
      throw error;
    }
  },
  


  /**
   * Check if user can safely delete their profile
   * @returns {Promise<Object>} - Object containing canDelete boolean and details about dependencies
   */
  async checkProfileDeletionSafety() {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      // Check for owned canvases
      const { data: ownedCanvases, error: canvasError } = await supabase
        .from('canvases')
        .select('id, name, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (canvasError) throw canvasError;

      // Check for collaborations
      const { data: collaborations, error: collabError } = await supabase
        .from('canvas_collaborators')
        .select('canvas_id, permission_level, canvases(name, owner_id)')
        .eq('user_id', user.id);

      if (collabError) throw collabError;

      // Check for community messages
      const { data: communityMessages, error: msgError } = await supabase
        .from('community_messages')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (msgError) throw msgError;

      // Check for canvas messages
      const { data: canvasMessages, error: canvasMsgError } = await supabase
        .from('canvas_messages')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (canvasMsgError) throw canvasMsgError;

      // Check for elements created by user
      const { data: userElements, error: elementsError } = await supabase
        .from('elements')
        .select('id, canvas_id')
        .eq('user_id', user.id)
        .limit(5); // Just get a few to check if any exist

      if (elementsError) throw elementsError;

      const hasOwnedCanvases = ownedCanvases && ownedCanvases.length > 0;
      const hasCollaborations = collaborations && collaborations.length > 0;
      const hasCommunityMessages = communityMessages && communityMessages.length > 0;
      const hasCanvasMessages = canvasMessages && canvasMessages.length > 0;
      const hasUserElements = userElements && userElements.length > 0;

      // Calculate risk level
      let riskLevel = 'low';
      if (hasOwnedCanvases) {
        riskLevel = 'high';
      } else if (hasCollaborations || hasUserElements) {
        riskLevel = 'medium';
      }

      return {
        canDelete: !hasOwnedCanvases, // Can only delete if no owned canvases
        riskLevel,
        dependencies: {
          ownedCanvases: ownedCanvases || [],
          collaborations: collaborations || [],
          hasCommunityMessages,
          hasCanvasMessages,
          hasUserElements,
          totalOwnedCanvases: hasOwnedCanvases ? ownedCanvases.length : 0,
          totalCollaborations: hasCollaborations ? collaborations.length : 0,
          totalUserElements: hasUserElements ? userElements.length : 0
        },
        warnings: this._generateDeletionWarnings({
          hasOwnedCanvases,
          hasCollaborations,
          hasCommunityMessages,
          hasCanvasMessages,
          hasUserElements,
          ownedCanvasCount: ownedCanvases?.length || 0,
          collaborationCount: collaborations?.length || 0
        })
      };
    } catch (error) {
      console.error('Error checking profile deletion safety:', error);
      throw error;
    }
  },

  /**
   * Generate warnings for profile deletion
   * @private
   */
  _generateDeletionWarnings(deps) {
    const warnings = [];

    if (deps.hasOwnedCanvases) {
      warnings.push({
        type: 'critical',
        message: `You own ${deps.ownedCanvasCount} canvas(es) that will be permanently deleted.`,
        action: 'Consider transferring ownership before deletion.'
      });
    }

    if (deps.hasCollaborations) {
      warnings.push({
        type: 'warning',
        message: `You are a collaborator on ${deps.collaborationCount} canvas(es).`,
        action: 'You will be removed from these collaborations.'
      });
    }

    if (deps.hasCommunityMessages || deps.hasCanvasMessages) {
      warnings.push({
        type: 'info',
        message: 'Your chat messages will be permanently deleted.',
        action: 'This cannot be undone.'
      });
    }

    if (deps.hasUserElements) {
      warnings.push({
        type: 'warning',
        message: 'Canvas elements you created will be permanently deleted.',
        action: 'This may affect collaborative work.'
      });
    }

    return warnings;
  },

  /**
   * Delete user profile and all associated data
   * @param {Object} options - Deletion options
   * @param {boolean} options.deleteCanvases - Whether to delete owned canvases
   * @param {boolean} options.confirmed - Whether user has confirmed the deletion
   * @returns {Promise<Object>} - Result of the deletion operation
   */
  async deleteProfile(options = {}) {
    try {
      const { deleteCanvases = false, confirmed = false } = options;

      if (!confirmed) {
        throw new Error('Profile deletion must be explicitly confirmed');
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No user logged in');

      // Check deletion safety first
      const safetyCheck = await this.checkProfileDeletionSafety();

      if (!safetyCheck.canDelete && !deleteCanvases) {
        throw new Error('Cannot delete profile: user has owned canvases. Set deleteCanvases=true to force deletion.');
      }

      // Start deletion process
      const deletionResults = {
        profileDeleted: false,
        canvasesDeleted: 0,
        collaborationsRemoved: 0,
        messagesDeleted: 0,
        avatarDeleted: false,
        authUserDeleted: false
      };

      // Delete owned canvases if requested
      if (deleteCanvases && safetyCheck.dependencies.ownedCanvases.length > 0) {
        for (const canvas of safetyCheck.dependencies.ownedCanvases) {
          const { error: canvasDeleteError } = await supabase
            .from('canvases')
            .delete()
            .eq('id', canvas.id);

          if (!canvasDeleteError) {
            deletionResults.canvasesDeleted++;
          }
        }
      }

      // Remove collaborations (these will be automatically removed when profile is deleted due to CASCADE)
      // But we count them for the report
      deletionResults.collaborationsRemoved = safetyCheck.dependencies.totalCollaborations;

      // Delete avatar from storage if exists
      const profile = await this.getCurrentProfile();
      if (profile.avatar_url) {
        try {
          // Extract file path from URL
          const url = new URL(profile.avatar_url);
          const pathParts = url.pathname.split('/');
          const filePath = pathParts.slice(-2).join('/'); // Get last two parts (folder/filename)

          const { error: storageError } = await supabase.storage
            .from('avatars')
            .remove([filePath]);

          if (!storageError) {
            deletionResults.avatarDeleted = true;
          }
        } catch (storageError) {
          console.warn('Could not delete avatar from storage:', storageError);
        }
      }

      // Delete the profile (this will cascade delete messages and collaborations)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) throw profileError;
      deletionResults.profileDeleted = true;

      // Count messages that will be deleted (for reporting)
      if (safetyCheck.dependencies.hasCommunityMessages || safetyCheck.dependencies.hasCanvasMessages) {
        // These are deleted automatically via CASCADE, so we just mark them as deleted
        deletionResults.messagesDeleted = true;
      }

      // Finally, delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

      if (!authError) {
        deletionResults.authUserDeleted = true;
      }

      return {
        success: true,
        message: 'Profile and associated data deleted successfully',
        details: deletionResults
      };

    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  },

};