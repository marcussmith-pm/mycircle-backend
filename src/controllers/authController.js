import { User } from '../models/User.js';

/**
 * Register or login user
 * POST /v1/auth/register
 *
 * Accepts Firebase token and creates/returns user account
 */
export const register = async (req, res, next) => {
  try {
    const { firebaseUid, email, phoneNumber, name, picture } = req.user;

    // Check if user already exists
    let user = await User.findByFirebaseUid(firebaseUid);

    if (!user) {
      // Determine phone and Google sub from Firebase token
      const phoneE164 = phoneNumber || null;
      const googleSub = email && email.includes('gmail.com') ? email : null;
      const realName = name || 'Anonymous User';
      const avatarUrl = picture || null;

      // Create new user
      user = await User.create({
        firebaseUid,
        realName,
        phoneE164,
        googleSub,
        avatarUrl
      });
    }

    // Return user profile
    res.status(200).json({
      id: user.id,
      firebase_uid: user.firebase_uid,
      real_name: user.real_name,
      avatar_url: user.avatar_url,
      circle_count: user.circle_count,
      created_at: user.created_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 * GET /v1/me
 */
export const getMe = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    const user = await User.findByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.status(200).json({
      id: user.id,
      firebase_uid: user.firebase_uid,
      real_name: user.real_name,
      avatar_url: user.avatar_url,
      phone_e164: user.phone_e164,
      circle_count: user.circle_count,
      notification_preferences: user.notification_preferences,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * PATCH /v1/me
 */
export const updateMe = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { real_name, avatar_url } = req.body;

    // Validate real_name if provided
    if (real_name !== undefined) {
      if (typeof real_name !== 'string' || real_name.length < 2 || real_name.length > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'real_name must be between 2 and 100 characters'
        });
      }
    }

    // Validate avatar_url if provided
    if (avatar_url !== undefined) {
      try {
        new URL(avatar_url);
        if (!avatar_url.startsWith('https://')) {
          throw new Error('Not HTTPS');
        }
      } catch {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'avatar_url must be a valid HTTPS URL'
        });
      }
    }

    // Get user first to get database ID
    const user = await User.findByFirebaseUid(firebaseUid);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Update user
    const updatedUser = await User.update(user.id, {
      realName: real_name,
      avatarUrl: avatar_url
    });

    res.status(200).json({
      id: updatedUser.id,
      firebase_uid: updatedUser.firebase_uid,
      real_name: updatedUser.real_name,
      avatar_url: updatedUser.avatar_url,
      phone_e164: updatedUser.phone_e164,
      circle_count: updatedUser.circle_count,
      notification_preferences: updatedUser.notification_preferences,
      updated_at: updatedUser.updated_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search users
 * GET /v1/users/search?q=searchterm&limit=20
 */
export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 20);
    const requestingUserId = req.user?.id || null;

    // Validate search query
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.search(q, limit, requestingUserId);

    res.status(200).json({
      users: users.map(u => ({
        id: u.id,
        real_name: u.real_name,
        avatar_url: u.avatar_url,
        connection_status: u.connection?.state || 'none',
                        connection_type: u.connection?.type || null
      })),
      count: users.length
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
  getMe,
  updateMe,
  searchUsers
};
