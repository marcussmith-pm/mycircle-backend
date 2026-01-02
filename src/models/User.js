import { query } from '../config/database.js';

export class User {
  /**
   * Find user by Firebase UID
   */
  static async findByFirebaseUid(firebaseUid) {
    const result = await query(
      `SELECT id, firebase_uid, real_name, avatar_url, phone_e164, google_sub,
              status, circle_count, notification_preferences, created_at, updated_at
       FROM users
       WHERE firebase_uid = $1 AND deleted_at IS NULL`,
      [firebaseUid]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await query(
      `SELECT id, firebase_uid, real_name, avatar_url, phone_e164, google_sub,
              status, circle_count, notification_preferences, created_at, updated_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phone) {
    const result = await query(
      `SELECT id, firebase_uid, real_name, avatar_url, phone_e164, google_sub,
              status, circle_count, notification_preferences, created_at, updated_at
       FROM users
       WHERE phone_e164 = $1 AND deleted_at IS NULL`,
      [phone]
    );

    return result.rows[0] || null;
  }

  /**
   * Find user by Google subject ID
   */
  static async findByGoogleSub(googleSub) {
    const result = await query(
      `SELECT id, firebase_uid, real_name, avatar_url, phone_e164, google_sub,
              status, circle_count, notification_preferences, created_at, updated_at
       FROM users
       WHERE google_sub = $1 AND deleted_at IS NULL`,
      [googleSub]
    );

    return result.rows[0] || null;
  }

  /**
   * Create a new user
   */
  static async create({ firebaseUid, realName, phoneE164, googleSub, avatarUrl }) {
    const result = await query(
      `INSERT INTO users (firebase_uid, real_name, phone_e164, google_sub, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, firebase_uid, real_name, avatar_url, phone_e164, google_sub,
                 status, circle_count, notification_preferences, created_at, updated_at`,
      [firebaseUid, realName, phoneE164, googleSub, avatarUrl]
    );

    return result.rows[0];
  }

  /**
   * Update user profile
   */
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.realName !== undefined) {
      fields.push(`real_name = $${paramIndex++}`);
      values.push(updates.realName);
    }

    if (updates.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatarUrl);
    }

    if (fields.length === 0) {
      return await this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND deleted_at IS NULL
       RETURNING id, firebase_uid, real_name, avatar_url, phone_e164, google_sub,
                 status, circle_count, notification_preferences, created_at, updated_at`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update user circle count
   */
  static async updateCircleCount(userId) {
    const result = await query(
      `UPDATE users
       SET circle_count = (
         SELECT COUNT(*)
         FROM connections
         WHERE (user_a_id = $1 OR user_b_id = $1)
         AND state = 'active'
       ),
       updated_at = NOW()
       WHERE id = $1
       RETURNING circle_count`,
      [userId]
    );

    return result.rows[0].circle_count;
  }

  /**
   * Soft delete user
   */
  static async softDelete(id) {
    const result = await query(
      `UPDATE users
       SET status = 'deleted',
           deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Search users by real name (case-insensitive partial match)
   */
  static async search(searchTerm, limit = 20, requestingUserId = null) {
    const result = await query(
      `SELECT u.id,
              u.real_name,
              u.avatar_url,
              COALESCE(
                json_build_object(
                  'id', c.id,
                  'state', c.state,
                  'type', c.type
                ),
                NULL
              ) as connection
       FROM users u
       LEFT JOIN connections c
         ON (c.user_a_id = u.id OR c.user_b_id = u.id)
         AND (c.user_a_id = $3 OR c.user_b_id = $3)
         AND c.state IN ('pending', 'active')
       WHERE u.status = 'active'
         AND u.deleted_at IS NULL
         AND u.id != $3
         AND u.real_name ILIKE $1
       ORDER BY
         CASE WHEN u.real_name ILIKE $2 THEN 0 ELSE 1 END,
         u.real_name ASC
       LIMIT $4`,
      [`%${searchTerm}%`, `${searchTerm}%`, requestingUserId, limit]
    );

    return result.rows;
  }
}

export default User;
