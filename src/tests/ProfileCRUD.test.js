import { ProfileService } from '../services/profileService';
import { supabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      admin: {
        deleteUser: jest.fn()
      }
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          limit: jest.fn(),
          order: jest.fn()
        })),
        ilike: jest.fn(() => ({
          limit: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(),
        remove: jest.fn()
      }))
    }
  }
}));

describe('ProfileService CRUD Operations', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com'
  };

  const mockProfile = {
    id: 'test-user-id',
    username: 'testuser',
    avatar_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe('getCurrentProfile', () => {
    it('should fetch current user profile successfully', async () => {
      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }));
      
      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await ProfileService.getCurrentProfile();

      expect(result).toEqual(mockProfile);
      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should create profile if not found', async () => {
      const mockSelect = jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST116' } 
          })
        }))
      }));

      const mockInsert = jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null })
        }))
      }));

      supabase.from.mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert
      });

      const result = await ProfileService.getCurrentProfile();

      expect(result).toEqual(mockProfile);
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = { username: 'newusername' };
      const updatedProfile = { ...mockProfile, ...updateData };

      const mockUpdate = jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: updatedProfile, error: null })
          }))
        }))
      }));

      supabase.from.mockReturnValue({ update: mockUpdate });

      const result = await ProfileService.updateProfile(updateData);

      expect(result).toEqual(updatedProfile);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        id: mockUser.id,
        username: 'newusername',
        updated_at: expect.any(String)
      }));
    });
  });

  describe('checkProfileDeletionSafety', () => {
    it('should return safe deletion when no dependencies', async () => {
      const mockSelect = jest.fn()
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        })
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        })
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        })
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await ProfileService.checkProfileDeletionSafety();

      expect(result.canDelete).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.dependencies.totalOwnedCanvases).toBe(0);
    });

    it('should return unsafe deletion when user owns canvases', async () => {
      const mockCanvases = [
        { id: 'canvas1', name: 'Test Canvas 1' },
        { id: 'canvas2', name: 'Test Canvas 2' }
      ];

      const mockSelect = jest.fn()
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            order: jest.fn().mockResolvedValue({ data: mockCanvases, error: null })
          }))
        })
        .mockReturnValueOnce({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        })
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        })
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        })
        .mockReturnValueOnce({
          eq: jest.fn(() => ({
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
          }))
        });

      supabase.from.mockReturnValue({ select: mockSelect });

      const result = await ProfileService.checkProfileDeletionSafety();

      expect(result.canDelete).toBe(false);
      expect(result.riskLevel).toBe('high');
      expect(result.dependencies.totalOwnedCanvases).toBe(2);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('critical');
    });
  });

  describe('deleteProfile', () => {
    it('should throw error if not confirmed', async () => {
      await expect(ProfileService.deleteProfile({ confirmed: false }))
        .rejects.toThrow('Profile deletion must be explicitly confirmed');
    });

    it('should throw error if user has canvases and deleteCanvases is false', async () => {
      // Mock safety check to return unsafe deletion
      jest.spyOn(ProfileService, 'checkProfileDeletionSafety')
        .mockResolvedValue({
          canDelete: false,
          dependencies: { ownedCanvases: [{ id: 'canvas1' }] }
        });

      await expect(ProfileService.deleteProfile({ 
        confirmed: true, 
        deleteCanvases: false 
      })).rejects.toThrow('Cannot delete profile: user has owned canvases');
    });

    it('should delete profile successfully when safe', async () => {
      // Mock safety check
      jest.spyOn(ProfileService, 'checkProfileDeletionSafety')
        .mockResolvedValue({
          canDelete: true,
          dependencies: { 
            ownedCanvases: [],
            totalCollaborations: 0
          }
        });

      // Mock getCurrentProfile
      jest.spyOn(ProfileService, 'getCurrentProfile')
        .mockResolvedValue({ ...mockProfile, avatar_url: null });

      const mockDelete = jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ error: null })
      }));

      supabase.from.mockReturnValue({ delete: mockDelete });
      supabase.auth.admin.deleteUser.mockResolvedValue({ error: null });

      const result = await ProfileService.deleteProfile({ 
        confirmed: true,
        deleteCanvases: false 
      });

      expect(result.success).toBe(true);
      expect(result.details.profileDeleted).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });




});
