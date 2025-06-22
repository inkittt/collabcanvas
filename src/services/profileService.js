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
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
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
      
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
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
   * Search for users by username
   * @param {string} query - Search query
   * @returns {Promise<Array>} - List of matching users
   */
  async searchUsers(query) {
    try {
      if (!query || query.length < 3) {
        return [];
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }
}; 