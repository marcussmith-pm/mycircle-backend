import { Connection } from '../models/Connection.js';
import { User } from '../models/User.js';
import { Invite } from '../models/Invite.js';

/**
 * Send a connection request
 * POST /v1/connections/request
 */
export const sendRequest = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { target_user_id, invite_token } = req.body;

    // Get requester
    const requester = await User.findByFirebaseUid(firebaseUid);
    if (!requester) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    let targetUserId;

    // Determine target user ID
    if (invite_token) {
      // Validate invite token
      const invite = await Invite.validate(invite_token);
      if (!invite) {
        return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired invite token' });
      }
      targetUserId = invite.inviter_user_id;
    } else if (target_user_id) {
      targetUserId = target_user_id;
    } else {
      return res.status(400).json({ error: 'Bad Request', message: 'Must provide target_user_id or invite_token' });
    }

    // Can't connect to yourself
    if (requester.id === targetUserId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Cannot connect to yourself' });
    }

    // Check if connection already exists
    const existing = await Connection.findConnectionBetween(requester.id, targetUserId);
    if (existing) {
      return res.status(400).json({ error: 'Conflict', message: 'Connection already exists', state: existing.state });
    }

    // Check 50-user limit for both users
    const [requesterCount, targetCount] = await Promise.all([
      Connection.countActive(requester.id),
      Connection.countActive(targetUserId)
    ]);

    if (requesterCount >= 50 || targetCount >= 50) {
      return res.status(429).json({
        error: 'Too Many Connections',
        message: 'Circle is full (50 max). Remove a connection first.'
      });
    }

    // Create connection request
    const connection = await Connection.createRequest(requester.id, targetUserId, 'permanent');

    if (!connection) {
      return res.status(400).json({ error: 'Bad Request', message: 'Failed to create connection' });
    }

    res.status(201).json({
      id: connection.id,
      state: connection.state,
      type: connection.type,
      created_at: connection.created_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Accept a connection request
 * POST /v1/connections/:id/accept
 */
export const acceptRequest = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;

    // Get user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Get connection
    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Not Found', message: 'Connection not found' });
    }

    // Verify user is the recipient (user_b)
    if (connection.user_b_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the recipient can accept this request' });
    }

    // Check state
    if (connection.state !== 'pending') {
      return res.status(400).json({ error: 'Bad Request', message: `Connection is ${connection.state}, not pending` });
    }

    // Check 50-user limit again
    const [requesterCount, recipientCount] = await Promise.all([
      Connection.countActive(connection.user_a_id),
      Connection.countActive(connection.user_b_id)
    ]);

    if (requesterCount >= 50 || recipientCount >= 50) {
      return res.status(429).json({
        error: 'Too Many Connections',
        message: 'Circle is full (50 max). Remove a connection first.'
      });
    }

    // Accept connection
    const accepted = await Connection.accept(id);

    if (!accepted) {
      return res.status(400).json({ error: 'Bad Request', message: 'Failed to accept connection' });
    }

    // Update circle counts
    await Promise.all([
      User.updateCircleCount(connection.user_a_id),
      User.updateCircleCount(connection.user_b_id)
    ]);

    res.status(200).json({
      id: accepted.id,
      state: accepted.state,
      type: accepted.type,
      started_at: accepted.started_at,
      expires_at: accepted.expires_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a connection (silent removal)
 * POST /v1/connections/:id/remove
 */
export const removeConnection = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;

    // Get user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Get connection
    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Not Found', message: 'Connection not found' });
    }

    // Verify user is part of connection
    if (connection.user_a_id !== user.id && connection.user_b_id !== user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You are not part of this connection' });
    }

    // Remove connection
    const removed = await Connection.remove(id, user.id);

    if (!removed) {
      return res.status(400).json({ error: 'Bad Request', message: 'Failed to remove connection' });
    }

    // Update circle counts
    await Promise.all([
      User.updateCircleCount(connection.user_a_id),
      User.updateCircleCount(connection.user_b_id)
    ]);

    res.status(200).json({
      success: true,
      message: 'Connection removed'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List user's connections
 * GET /v1/connections
 */
export const listConnections = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const connections = await Connection.findActiveForUser(user.id);

    res.status(200).json({
      connections: connections.map(c => ({
        id: c.id,
        user: {
          id: c.other_user,
          real_name: c.other_user_name,
          avatar_url: c.other_user_avatar
        },
        type: c.type,
        state: c.state,
        started_at: c.started_at,
        expires_at: c.expires_at
      })),
      count: connections.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List pending connection requests
 * GET /v1/connections/pending
 */
export const listPending = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const connections = await Connection.findPendingForUser(user.id);

    res.status(200).json({
      connections: connections.map(c => ({
        id: c.id,
        requester_id: c.user_a_id,
        requester_name: c.user_a_name,
        requester_avatar: c.user_a_avatar,
        type: c.type,
        created_at: c.created_at,
        is_requester: c.user_a_id === user.id
      })),
      count: connections.length
    });
  } catch (error) {
    next(error);
  }
};

export default {
  sendRequest,
  acceptRequest,
  removeConnection,
  listConnections,
  listPending
};
