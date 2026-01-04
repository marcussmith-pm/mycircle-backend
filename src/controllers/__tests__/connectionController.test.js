import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as connectionController from '../connectionController.js';
import { Connection } from '../../models/Connection.js';
import { User } from '../../models/User.js';
import { Invite } from '../../models/Invite.js';

// Mock dependencies
vi.mock('../../models/Connection.js');
vi.mock('../../models/User.js');
vi.mock('../../models/Invite.js');

describe('Connection Controller', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('sendRequest', () => {
    it('should send connection request via target_user_id', async () => {
      const mockRequester = { id: 1, firebase_uid: 'firebase_123' };
      const mockConnection = { id: 10, state: 'pending', type: 'permanent' };

      User.findByFirebaseUid.mockResolvedValue(mockRequester);
      Connection.findConnectionBetween.mockResolvedValue(null);
      Connection.countActive.mockResolvedValue(5);
      Connection.createRequest.mockResolvedValue(mockConnection);

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { target_user_id: 2 }
      };

      await connectionController.sendRequest(req, res, next);

      expect(Connection.createRequest).toHaveBeenCalledWith(1, 2, 'permanent');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should send request via invite_token', async () => {
      const mockRequester = { id: 1 };
      const mockInvite = { id: 5, inviter_user_id: 3 };
      const mockConnection = { id: 10 };

      User.findByFirebaseUid.mockResolvedValue(mockRequester);
      Invite.validate.mockResolvedValue(mockInvite);
      Connection.findConnectionBetween.mockResolvedValue(null);
      Connection.countActive.mockResolvedValue(5);
      Connection.createRequest.mockResolvedValue(mockConnection);

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { invite_token: 'abc123' }
      };

      await connectionController.sendRequest(req, res, next);

      expect(Invite.validate).toHaveBeenCalledWith('abc123');
      expect(Connection.createRequest).toHaveBeenCalledWith(1, 3, 'permanent');
    });

    it('should return 400 when no target provided', async () => {
      User.findByFirebaseUid.mockResolvedValue({ id: 1 });

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: {}
      };

      await connectionController.sendRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Must provide target_user_id or invite_token'
      });
    });

    it('should return 400 for invalid invite token', async () => {
      User.findByFirebaseUid.mockResolvedValue({ id: 1 });
      Invite.validate.mockResolvedValue(null);

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { invite_token: 'invalid' }
      };

      await connectionController.sendRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Invalid or expired invite token'
      });
    });

    it('should return 400 when connecting to self', async () => {
      User.findByFirebaseUid.mockResolvedValue({ id: 1 });

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { target_user_id: 1 }
      };

      await connectionController.sendRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Bad Request',
        message: 'Cannot connect to yourself'
      });
    });

    it('should return 400 when connection exists', async () => {
      User.findByFirebaseUid.mockResolvedValue({ id: 1 });
      Connection.findConnectionBetween.mockResolvedValue({ id: 10, state: 'active' });

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { target_user_id: 2 }
      };

      await connectionController.sendRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 429 when circle is full', async () => {
      User.findByFirebaseUid.mockResolvedValue({ id: 1 });
      Connection.findConnectionBetween.mockResolvedValue(null);
      Connection.countActive.mockResolvedValueOnce(50).mockResolvedValueOnce(10);

      req = {
        user: { firebaseUid: 'firebase_123' },
        body: { target_user_id: 2 }
      };

      await connectionController.sendRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too Many Connections',
        message: 'Circle is full (50 max). Remove a connection first.'
      });
    });
  });

  describe('acceptRequest', () => {
    it('should accept pending connection', async () => {
      const mockUser = { id: 2, firebase_uid: 'firebase_456' };
      const mockConnection = {
        id: 10,
        user_a_id: 1,
        user_b_id: 2,
        state: 'pending',
        type: 'permanent'
      };
      const mockAccepted = { id: 10, state: 'active', started_at: new Date() };

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findById.mockResolvedValue(mockConnection);
      Connection.countActive.mockResolvedValue(5);
      Connection.accept.mockResolvedValue(mockAccepted);
      User.updateCircleCount.mockResolvedValue({ circle_count: 6 });

      req = {
        user: { firebaseUid: 'firebase_456' },
        params: { id: '10' }
      };

      await connectionController.acceptRequest(req, res, next);

      expect(Connection.accept).toHaveBeenCalledWith('10');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 when non-recipient tries to accept', async () => {
      const mockUser = { id: 3 };
      const mockConnection = { id: 10, user_a_id: 1, user_b_id: 2 };

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findById.mockResolvedValue(mockConnection);

      req = {
        user: { firebaseUid: 'firebase_789' },
        params: { id: '10' }
      };

      await connectionController.acceptRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Only the recipient can accept this request'
      });
    });

    it('should return 400 when connection not pending', async () => {
      const mockUser = { id: 2 };
      const mockConnection = { id: 10, user_a_id: 1, user_b_id: 2, state: 'active' };

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findById.mockResolvedValue(mockConnection);

      req = {
        user: { firebaseUid: 'firebase_456' },
        params: { id: '10' }
      };

      await connectionController.acceptRequest(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeConnection', () => {
    it('should remove connection as user A', async () => {
      const mockUser = { id: 1 };
      const mockConnection = {
        id: 10,
        user_a_id: 1,
        user_b_id: 2,
        state: 'active'
      };

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findById.mockResolvedValue(mockConnection);
      Connection.remove.mockResolvedValue(mockConnection);
      User.updateCircleCount.mockResolvedValue({});

      req = {
        user: { firebaseUid: 'firebase_123' },
        params: { id: '10' }
      };

      await connectionController.removeConnection(req, res, next);

      expect(Connection.remove).toHaveBeenCalledWith('10', 1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 when user not in connection', async () => {
      const mockUser = { id: 3 };
      const mockConnection = { id: 10, user_a_id: 1, user_b_id: 2 };

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findById.mockResolvedValue(mockConnection);

      req = {
        user: { firebaseUid: 'firebase_789' },
        params: { id: '10' }
      };

      await connectionController.removeConnection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('listConnections', () => {
    it('should list active connections', async () => {
      const mockUser = { id: 1 };
      const mockConnections = [
        {
          id: 10,
          other_user: 2,
          other_user_name: 'Bob',
          other_user_avatar: 'https://example.com/bob.jpg',
          type: 'permanent',
          state: 'active'
        }
      ];

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findActiveForUser.mockResolvedValue(mockConnections);

      req = { user: { firebaseUid: 'firebase_123' } };

      await connectionController.listConnections(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        connections: [{
          id: 10,
          user: { id: 2, real_name: 'Bob', avatar_url: 'https://example.com/bob.jpg' },
          type: 'permanent',
          state: 'active',
          started_at: mockConnections[0].started_at,
          expires_at: mockConnections[0].expires_at
        }],
        count: 1
      });
    });
  });

  describe('listPending', () => {
    it('should list pending connections', async () => {
      const mockUser = { id: 1 };
      const mockConnections = [
        {
          id: 10,
          user_a_id: 2,
          user_a_name: 'Alice',
          user_a_avatar: 'https://example.com/alice.jpg',
          type: 'permanent'
        }
      ];

      User.findByFirebaseUid.mockResolvedValue(mockUser);
      Connection.findPendingForUser.mockResolvedValue(mockConnections);

      req = { user: { firebaseUid: 'firebase_123' } };

      await connectionController.listPending(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
