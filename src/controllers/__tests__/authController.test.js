import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../authController.js';
import { User } from '../../models/User.js';

// Mock dependencies
vi.mock('../../models/User.js');

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();

    next = vi.fn();
  });

  describe('register', () => {
    it('should create new user when Firebase UID not found', async () => {
      const mockNewUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        phone_e164: '+1234567890',
        google_sub: null,
        circle_count: 0,
        created_at: new Date()
      };

      User.findByFirebaseUid.mockResolvedValue(null);
      User.create.mockResolvedValue(mockNewUser);

      req = {
        user: {
          firebaseUid: 'firebase_123',
          email: 'test@example.com',
          phoneNumber: '+1234567890',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg'
        }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.register(req, res, next);

      expect(User.findByFirebaseUid).toHaveBeenCalledWith('firebase_123');
      expect(User.create).toHaveBeenCalledWith({
        firebaseUid: 'firebase_123',
        realName: 'Test User',
        phoneE164: '+1234567890',
        googleSub: null,
        avatarUrl: 'https://example.com/avatar.jpg'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        circle_count: 0,
        created_at: mockNewUser.created_at
      });
    });

    it('should return existing user when found', async () => {
      const mockExistingUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Existing User',
        avatar_url: 'https://example.com/existing.jpg',
        circle_count: 5,
        created_at: new Date()
      };

      User.findByFirebaseUid.mockResolvedValue(mockExistingUser);

      req = {
        user: {
          firebaseUid: 'firebase_123',
          email: 'existing@example.com',
          name: 'Existing User'
        }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.register(req, res, next);

      expect(User.findByFirebaseUid).toHaveBeenCalledWith('firebase_123');
      expect(User.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Existing User',
        avatar_url: 'https://example.com/existing.jpg',
        circle_count: 5,
        created_at: mockExistingUser.created_at
      });
    });

    it('should use "Anonymous User" when name not provided', async () => {
      const mockNewUser = {
        id: 1,
        real_name: 'Anonymous User'
      };

      User.findByFirebaseUid.mockResolvedValue(null);
      User.create.mockResolvedValue(mockNewUser);

      req = {
        user: {
          firebaseUid: 'firebase_456',
          email: 'anonymous@example.com'
        }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.register(req, res, next);

      // Only gmail addresses set google_sub, non-gmail gets null
      expect(User.create).toHaveBeenCalledWith({
        firebaseUid: 'firebase_456',
        realName: 'Anonymous User',
        phoneE164: null,
        googleSub: null,
        avatarUrl: null
      });
    });

    it('should set google_sub for Gmail addresses', async () => {
      User.findByFirebaseUid.mockResolvedValue(null);
      User.create.mockResolvedValue({ id: 1 });

      req = {
        user: {
          firebaseUid: 'firebase_789',
          email: 'user@gmail.com',
          name: 'Gmail User'
        }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.register(req, res, next);

      expect(User.create).toHaveBeenCalledWith({
        firebaseUid: 'firebase_789',
        realName: 'Gmail User',
        phoneE164: null,
        googleSub: 'user@gmail.com',
        avatarUrl: null
      });
    });
  });

  describe('getMe', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        phone_e164: '+1234567890',
        circle_count: 5,
        notification_preferences: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      User.findByFirebaseUid.mockResolvedValue(mockUser);

      req = { user: { firebaseUid: 'firebase_123' } };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.getMe(req, res, next);

      expect(User.findByFirebaseUid).toHaveBeenCalledWith('firebase_123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        phone_e164: '+1234567890',
        circle_count: 5,
        notification_preferences: {},
        created_at: mockUser.created_at,
        updated_at: mockUser.updated_at
      });
    });

    it('getMe should return 404 when user not found', async () => {
      User.findByFirebaseUid.mockResolvedValue(null);

      req = { user: { firebaseUid: 'nonexistent' } };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'User not found'
      });
    });
  });

  describe('updateMe', () => {
    it('should update user real_name', async () => {
      const mockUser = {
        id: 1,
        firebase_uid: 'firebase_123'
      };
      const mockUpdatedUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg',
        phone_e164: '+1234567890',
        circle_count: 5,
        notification_preferences: {},
        updated_at: new Date()
      };

      User.findByFirebaseUid
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUpdatedUser);
      User.update.mockResolvedValue(mockUpdatedUser);

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { real_name: 'Updated Name' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.updateMe(req, res, next);

      expect(User.update).toHaveBeenCalledWith(1, {
        realName: 'Updated Name',
        avatarUrl: undefined
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update user avatar_url', async () => {
      const mockUser = { id: 1 };
      const mockUpdatedUser = {
        id: 1,
        real_name: 'Test User',
        avatar_url: 'https://example.com/new.jpg',
        updated_at: new Date()
      };

      User.findByFirebaseUid
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUpdatedUser);
      User.update.mockResolvedValue(mockUpdatedUser);

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { avatar_url: 'https://example.com/new.jpg' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.updateMe(req, res, next);

      expect(User.update).toHaveBeenCalledWith(1, {
        realName: undefined,
        avatarUrl: 'https://example.com/new.jpg'
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid real_name', async () => {
      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { real_name: 'A' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'real_name must be between 2 and 100 characters'
      });
      expect(User.update).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid avatar_url', async () => {
      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { avatar_url: 'not-a-url' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'avatar_url must be a valid HTTPS URL'
      });
      expect(User.update).not.toHaveBeenCalled();
    });

    it('should return 400 for non-HTTPS avatar_url', async () => {
      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { avatar_url: 'http://example.com/avatar.jpg' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'avatar_url must be a valid HTTPS URL'
      });
    });

    it('updateMe should return 404 when user not found', async () => {
      // Reset all mocks to ensure clean state
      User.findByFirebaseUid.mockReset();
      User.findByFirebaseUid.mockResolvedValue(null);
      User.update.mockReset();
      User.update.mockImplementation(() => { throw new Error('Should not be called'); });

      req = {
        user: { firebaseUid: 'nonexistent' },
        body: { real_name: 'New Name' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.updateMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'User not found'
      });
      expect(User.update).not.toHaveBeenCalled();
    });
  });

  describe('searchUsers', () => {
    it('should search users by name', async () => {
      const mockResults = [
        {
          id: 1,
          real_name: 'Alice Johnson',
          avatar_url: null,
          connection: { id: 10, state: 'active', type: 'permanent' }
        }
      ];

      User.search.mockResolvedValue(mockResults);

      req = {
        user: { id: 5 },
        query: { q: 'Alice', limit: '20' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.searchUsers(req, res, next);

      expect(User.search).toHaveBeenCalledWith('Alice', 20, 5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        users: [{
          id: 1,
          real_name: 'Alice Johnson',
          avatar_url: null,
          connection_status: 'active',
          connection_type: 'permanent'
        }],
        count: 1
      });
    });

    it('should return 400 for search query less than 2 characters', async () => {
      req = {
        user: { id: 5 },
        query: { q: 'A' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.searchUsers(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Search query must be at least 2 characters'
      });
      expect(User.search).not.toHaveBeenCalled();
    });

    it('should cap search results at 20', async () => {
      const mockResults = [];
      User.search.mockResolvedValue(mockResults);

      req = {
        user: { id: 5 },
        query: { q: 'Test', limit: '50' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.searchUsers(req, res, next);

      expect(User.search).toHaveBeenCalledWith('Test', 20, 5);
    });

    it('should handle user with no connection', async () => {
      const mockResults = [
        {
          id: 2,
          real_name: 'Bob Smith',
          avatar_url: null,
          connection: null
        }
      ];

      User.search.mockResolvedValue(mockResults);

      req = {
        user: { id: 5 },
        query: { q: 'Bob' }
      };
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis()
      };

      await authController.searchUsers(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        users: [{
          id: 2,
          real_name: 'Bob Smith',
          avatar_url: null,
          connection_status: 'none',
          connection_type: null
        }],
        count: 1
      });
    });
  });
});
