import { query } from '../config/database.js';

/**
 * POST /v1/dev/create-user
 * Create a dev user for testing
 */
export const createDevUser = async (req, res, next) => {
  try {
    const result = await query(`
      INSERT INTO users (firebase_uid, real_name, status)
      VALUES ('dev_user_123', 'Dev User', 'active')
      ON CONFLICT (firebase_uid) DO UPDATE
      SET real_name = 'Dev User', status = 'active'
      RETURNING id, firebase_uid, real_name
    `);

    res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
