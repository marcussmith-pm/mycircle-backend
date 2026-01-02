import { Invite } from '../models/Invite.js';
import { User } from '../models/User.js';

/**
 * Create invite token
 * POST /v1/invites
 */
export const createInvite = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    // Get user from database
    const user = await User.findByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Create invite
    const invite = await Invite.create(user.id);

    // Get invite URL
    const inviteUrl = Invite.getInviteUrl(invite.token);

    res.status(201).json({
      id: invite.id,
      token: invite.token,
      invite_url: inviteUrl,
      max_uses: invite.max_uses,
      expires_at: invite.expires_at,
      created_at: invite.created_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate invite token
 * GET /v1/invites/:token/validate
 */
export const validateInvite = async (req, res, next) => {
  try {
    const { token } = req.params;

    const invite = await Invite.validate(token);

    if (!invite) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invalid, expired, or fully used invite token'
      });
    }

    // Get inviter info
    const inviter = await User.findById(invite.inviter_user_id);

    res.status(200).json({
      valid: true,
      remaining_uses: invite.max_uses - invite.use_count,
      expires_at: invite.expires_at,
      inviter: {
        id: inviter.id,
        real_name: inviter.real_name,
        avatar_url: inviter.avatar_url
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List user's invites
 * GET /v1/invites
 */
export const listInvites = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    const user = await User.findByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    const invites = await Invite.getByInviter(user.id);

    res.status(200).json({
      invites: invites.map(invite => ({
        id: invite.id,
        invite_url: Invite.getInviteUrl(invite.token),
        max_uses: invite.max_uses,
        use_count: invite.use_count,
        remaining_uses: invite.max_uses - invite.use_count,
        expires_at: invite.expires_at,
        created_at: invite.created_at
      })),
      count: invites.length
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createInvite,
  validateInvite,
  listInvites
};
