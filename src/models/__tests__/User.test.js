import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { query } from '../../config/database.js';
import User from '../User.js';

// Mock database
vi.mock('../../config/database.js', () => ({
  query: vi.fn()
}));

describe('User Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByFirebaseUid', () => {
    it('should return user when found by Firebase UID', async () => {
      const mockUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        phone_e164: '+1234567890',
        google_sub: 'google_123',
        status: 'active',
        circle_count: 5,
        notification_preferences: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.findByFirebaseUid('firebase_123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE firebase_uid = $1'),
        ['firebase_123']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await User.findByFirebaseUid('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user when found by ID', async () => {
      const mockUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User'
      };

      query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.findById(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by ID', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await User.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('should return user when found by phone number', async () => {
      const mockUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        phone_e164: '+1234567890'
      };

      query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.findByPhone('+1234567890');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE phone_e164 = $1'),
        ['+1234567890']
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByGoogleSub', () => {
    it('should return user when found by Google subject ID', async () => {
      const mockUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        google_sub: 'google_123'
      };

      query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.findByGoogleSub('google_123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE google_sub = $1'),
        ['google_123']
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a new user with all fields', async () => {
      const mockNewUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Test User',
        phone_e164: '+1234567890',
        google_sub: 'google_123',
        avatar_url: 'https://example.com/avatar.jpg',
        status: 'active',
        circle_count: 0,
        notification_preferences: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      query.mockResolvedValue({ rows: [mockNewUser] });

      const result = await User.create({
        firebaseUid: 'firebase_123',
        realName: 'Test User',
        phoneE164: '+1234567890',
        googleSub: 'google_123',
        avatarUrl: 'https://example.com/avatar.jpg'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['firebase_123', 'Test User', '+1234567890', 'google_123', 'https://example.com/avatar.jpg']
      );
      expect(result).toEqual(mockNewUser);
    });

    it('should create user with only required fields', async () => {
      const mockNewUser = {
        id: 1,
        firebase_uid: 'firebase_456',
        real_name: 'Minimal User'
      };

      query.mockResolvedValue({ rows: [mockNewUser] });

      const result = await User.create({
        firebaseUid: 'firebase_456',
        realName: 'Minimal User'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['firebase_456', 'Minimal User', undefined, undefined, undefined]
      );
      expect(result).toEqual(mockNewUser);
    });
  });

  describe('update', () => {
    it('should update user real_name', async () => {
      const mockUpdatedUser = {
        id: 1,
        firebase_uid: 'firebase_123',
        real_name: 'Updated Name'
      };

      query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await User.update(1, { realName: 'Updated Name' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['Updated Name', 1])
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should update user avatar_url', async () => {
      const mockUpdatedUser = {
        id: 1,
        avatar_url: 'https://example.com/new-avatar.jpg'
      };

      query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await User.update(1, { avatarUrl: 'https://example.com/new-avatar.jpg' });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['https://example.com/new-avatar.jpg', 1])
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should update both real_name and avatar_url', async () => {
      const mockUpdatedUser = {
        id: 1,
        real_name: 'New Name',
        avatar_url: 'https://example.com/new.jpg'
      };

      query.mockResolvedValue({ rows: [mockUpdatedUser] });

      const result = await User.update(1, {
        realName: 'New Name',
        avatarUrl: 'https://example.com/new.jpg'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['New Name', 'https://example.com/new.jpg', 1])
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should return user when no updates provided', async () => {
      const mockUser = { id: 1, real_name: 'Test User' };

      query.mockResolvedValue({ rows: [mockUser] });

      const result = await User.update(1, {});

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await User.update(999, { realName: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('updateCircleCount', () => {
    it('should update and return circle count', async () => {
      query.mockResolvedValue({ rows: [{ circle_count: 5 }] });

      const result = await User.updateCircleCount(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1]
      );
      expect(result).toBe(5);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] });

      const result = await User.softDelete(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1]
      );
      expect(result).toEqual({ id: 1 });
    });

    it('should return null when user not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await User.softDelete(999);

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('should search users by real name', async () => {
      const mockResults = [
        { id: 1, real_name: 'Alice Johnson', avatar_url: null, connection: null },
        { id: 2, real_name: 'Alice Smith', avatar_url: null, connection: null }
      ];

      query.mockResolvedValue({ rows: mockResults });

      const result = await User.search('Alice');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['%Alice%', 'Alice%', null, 20]
      );
      expect(result).toHaveLength(2);
      expect(result[0].real_name).toBe('Alice Johnson');
    });

    it('should limit search results', async () => {
      const mockResults = [
        { id: 1, real_name: 'Bob Johnson' }
      ];

      query.mockResolvedValue({ rows: mockResults });

      const result = await User.search('Bob', 10);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['%Bob%', 'Bob%', null, 10]
      );
      expect(result).toHaveLength(1);
    });

    it('should exclude requesting user from results', async () => {
      const mockResults = [
        { id: 2, real_name: 'Other User' }
      ];

      query.mockResolvedValue({ rows: mockResults });

      const result = await User.search('User', 20, 1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['%User%', 'User%', 1, 20]
      );
      expect(result).not.toContainEqual(expect.objectContaining({ id: 1 }));
    });

    it('should include connection status when user is connected', async () => {
      const mockResults = [
        {
          id: 2,
          real_name: 'Connected User',
          avatar_url: null,
          connection: { id: 10, state: 'active', type: 'permanent' }
        }
      ];

      query.mockResolvedValue({ rows: mockResults });

      const result = await User.search('Connected', 20, 1);

      expect(result[0].connection).toEqual({ id: 10, state: 'active', type: 'permanent' });
    });

    it('should prioritize exact matches', async () => {
      const mockResults = [
        { id: 1, real_name: 'Alice' },
        { id: 2, real_name: 'Alice Johnson' },
        { id: 3, real_name: 'Bob Alice' }
      ];

      query.mockResolvedValue({ rows: mockResults });

      const result = await User.search('Alice');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('CASE WHEN'),
        expect.anything()
      );
      expect(result).toHaveLength(3);
    });
  });
});
