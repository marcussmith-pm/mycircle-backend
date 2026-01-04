import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Connection } from '../Connection.js';
import { query } from '../../config/database.js';

// Mock database
vi.mock('../../config/database.js', () => ({
  query: vi.fn()
}));

describe('Connection Model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create connection request with userA < userB', async () => {
      const mockConnection = {
        id: 1,
        user_a_id: 5,
        user_b_id: 10,
        state: 'pending',
        type: 'permanent'
      };

      query.mockResolvedValue({ rows: [mockConnection] });

      const result = await Connection.createRequest(5, 10);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO connections'),
        [5, 10, 'permanent']
      );
      expect(result).toEqual(mockConnection);
    });

    it('should swap user IDs if userA > userB', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] });

      await Connection.createRequest(10, 5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('VALUES ($1, $2'),
        [5, 10, 'permanent']
      );
    });

    it('should handle conflict and return null', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Connection.createRequest(5, 10);

      expect(result).toBeNull();
    });

    it('should create temporary connection', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] });

      await Connection.createRequest(5, 10, 'temporary');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('VALUES ($1, $2'),
        [5, 10, 'temporary']
      );
    });
  });

  describe('findById', () => {
    it('should return connection with user names', async () => {
      const mockConnection = {
        id: 1,
        user_a_id: 5,
        user_b_id: 10,
        state: 'active',
        user_a_name: 'Alice',
        user_b_name: 'Bob'
      };

      query.mockResolvedValue({ rows: [mockConnection] });

      const result = await Connection.findById(1);

      expect(result).toEqual(mockConnection);
    });

    it('should return null when not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Connection.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findPendingForUser', () => {
    it('should return pending connections for user', async () => {
      const mockConnections = [
        { id: 1, user_a_id: 5, state: 'pending' },
        { id: 2, user_b_id: 5, state: 'pending' }
      ];

      query.mockResolvedValue({ rows: mockConnections });

      const result = await Connection.findPendingForUser(5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.state ='),
        [5]
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('findActiveForUser', () => {
    it('should return active connections with other user info', async () => {
      const mockConnections = [
        {
          id: 1,
          user_a_id: 5,
          user_b_id: 10,
          other_user_name: 'Bob',
          other_user_avatar: 'https://example.com/bob.jpg'
        }
      ];

      query.mockResolvedValue({ rows: mockConnections });

      const result = await Connection.findActiveForUser(5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.state ='),
        [5]
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('accept', () => {
    it('should accept pending connection and set started_at', async () => {
      const mockConnection = {
        id: 1,
        state: 'active',
        started_at: new Date(),
        expires_at: null
      };

      query.mockResolvedValue({ rows: [mockConnection] });

      const result = await Connection.accept(1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE connections'),
        [1]
      );
      expect(result.state).toBe('active');
    });

    it('should set expires_at for temporary connections', async () => {
      const mockConnection = {
        id: 1,
        type: 'temporary',
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };

      query.mockResolvedValue({ rows: [mockConnection] });

      await Connection.accept(1);

      // The accept function sets expires_at based on connection type
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at = CASE'),
        [1]
      );
    });

    it('should return null if connection not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Connection.accept(999);

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove connection as user A', async () => {
      const mockConnection = {
        id: 1,
        user_a_id: 5,
        user_b_id: 10,
        state: 'ended',
        ended_reason: 'removed_by_a'
      };

      query.mockResolvedValueOnce({ rows: [mockConnection] });
      query.mockResolvedValueOnce({ rows: [mockConnection] });

      const result = await Connection.remove(1, 5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE connections'),
        [1, 'removed_by_a']
      );
      expect(result.ended_reason).toBe('removed_by_a');
    });

    it('should remove connection as user B', async () => {
      const mockConnection = {
        id: 1,
        user_a_id: 5,
        user_b_id: 10,
        state: 'ended',
        ended_reason: 'removed_by_b'
      };

      query.mockResolvedValueOnce({ rows: [mockConnection] });
      query.mockResolvedValueOnce({ rows: [mockConnection] });

      const result = await Connection.remove(1, 10);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE connections'),
        [1, 'removed_by_b']
      );
    });
  });

  describe('countActive', () => {
    it('should count active connections', async () => {
      query.mockResolvedValue({ rows: [{ count: '5' }] });

      const result = await Connection.countActive(5);

      expect(result).toBe(5);
    });

    it('should return 0 when no connections', async () => {
      query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await Connection.countActive(5);

      expect(result).toBe(0);
    });
  });

  describe('findConnectionBetween', () => {
    it('should find connection between two users', async () => {
      const mockConnection = { id: 1, user_a_id: 5, user_b_id: 10 };

      query.mockResolvedValue({ rows: [mockConnection] });

      const result = await Connection.findConnectionBetween(5, 10);

      expect(result).toEqual(mockConnection);
    });

    it('should swap user IDs to find connection', async () => {
      query.mockResolvedValue({ rows: [{ id: 1 }] });

      await Connection.findConnectionBetween(10, 5);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_a_id = $1'),
        [5, 10]
      );
    });

    it('should return null when no connection exists', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Connection.findConnectionBetween(5, 10);

      expect(result).toBeNull();
    });
  });

  describe('findByInviteToken', () => {
    it('should find pending connection by invite token', async () => {
      const mockConnection = {
        id: 1,
        invite_token: 'abc123',
        user_a_name: 'Alice'
      };

      query.mockResolvedValue({ rows: [mockConnection] });

      const result = await Connection.findByInviteToken('abc123');

      expect(result).toEqual(mockConnection);
    });

    it('should return null when invite not found', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await Connection.findByInviteToken('invalid');

      expect(result).toBeNull();
    });
  });
});
