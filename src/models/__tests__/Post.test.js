import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Post, MediaUpload } from '../Post.js';
import { query } from '../../config/database.js';

// Mock database
vi.mock('../../config/database.js', () => ({
  query: vi.fn()
}));

describe('Post Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return post with media', async () => {
      const mockPost = { id: 1, caption: 'Test post' };
      const mockMedia = [{ id: 1, storage_key: 'test.jpg' }];

      query.mockResolvedValueOnce({ rows: [mockPost] });
      query.mockResolvedValueOnce({ rows: mockMedia });

      const result = await Post.findById(1);

      expect(result).toEqual({ ...mockPost, media: mockMedia });
    });

    it('should return null when post not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Post.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateCaption', () => {
    it('should update post caption', async () => {
      const mockPost = { id: 1, owner_user_id: 5, caption: 'Old caption' };
      const mockUpdated = { id: 1, caption: 'New caption' };

      query.mockResolvedValueOnce({ rows: [mockPost] });
      query.mockResolvedValueOnce({ rows: [mockPost] }); // For findById in verification
      query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await Post.updateCaption(1, 5, 'New caption');

      expect(result.caption).toBe('New caption');
    });

    it('should return null when post not owned by user', async () => {
      const mockPost = { id: 1, owner_user_id: 10 };

      query.mockResolvedValue({ rows: [mockPost] });

      const result = await Post.updateCaption(1, 5, 'New caption');

      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete post owned by user', async () => {
      const mockPost = { id: 1, owner_user_id: 5 };
      const mockDeleted = { id: 1 };

      query.mockResolvedValueOnce({ rows: [mockPost] });
      query.mockResolvedValueOnce({ rows: [mockPost] });
      query.mockResolvedValueOnce({ rows: [mockDeleted] });

      const result = await Post.softDelete(1, 5);

      expect(result).toEqual(mockDeleted);
    });

    it('should return null when post not owned by user', async () => {
      const mockPost = { id: 1, owner_user_id: 10 };

      query.mockResolvedValue({ rows: [mockPost] });

      const result = await Post.softDelete(1, 5);

      expect(result).toBeNull();
    });
  });

  describe('toggleComments', () => {
    it('should toggle comments enabled', async () => {
      const mockPost = { id: 1, owner_user_id: 5 };
      const mockUpdated = { id: 1, comments_enabled: false };

      query.mockResolvedValueOnce({ rows: [mockPost] });
      query.mockResolvedValueOnce({ rows: [mockPost] });
      query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await Post.toggleComments(1, 5, false);

      expect(result.comments_enabled).toBe(false);
    });
  });
});

describe('MediaUpload', () => {
  describe('validateFileSize', () => {
    it('should accept valid photo size', () => {
      expect(MediaUpload.validateFileSize('image/jpeg', 5 * 1024 * 1024)).toBe(true);
    });

    it('should reject too large photo', () => {
      expect(MediaUpload.validateFileSize('image/jpeg', 15 * 1024 * 1024)).toBe(false);
    });

    it('should accept valid video size', () => {
      expect(MediaUpload.validateFileSize('video/mp4', 50 * 1024 * 1024)).toBe(true);
    });

    it('should reject too large video', () => {
      expect(MediaUpload.validateFileSize('video/mp4', 150 * 1024 * 1024)).toBe(false);
    });
  });

  describe('validateVideoDuration', () => {
    it('should accept valid video duration', () => {
      expect(MediaUpload.validateVideoDuration(30000)).toBe(true);
    });

    it('should reject video over 60 seconds', () => {
      expect(MediaUpload.validateVideoDuration(70000)).toBe(false);
    });
  });

  describe('getExtension', () => {
    it('should return correct extension for jpeg', () => {
      expect(MediaUpload.getExtension('image/jpeg')).toBe('.jpg');
    });

    it('should return correct extension for mp4', () => {
      expect(MediaUpload.getExtension('video/mp4')).toBe('.mp4');
    });

    it('should return .bin for unknown type', () => {
      expect(MediaUpload.getExtension('application/unknown')).toBe('.bin');
    });
  });
});
