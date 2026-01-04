import { query } from '../config/database.js';

export class Connection {
  /**
   * Create a new connection request
   */
  static async createRequest(userAId, userBId, type = 'permanent') {
    // Ensure userAId < userBId for consistent ordering
    const [smallerId, largerId] = userAId < userBId
      ? [userAId, userBId]
      : [userBId, userAId];

    const result = await query(
      `INSERT INTO connections (user_a_id, user_b_id, state, type)
       VALUES ($1, $2, 'pending', $3)
       ON CONFLICT (LEAST(user_a_id, user_b_id), GREATEST(user_a_id, user_b_id))
       DO NOTHING
       RETURNING id, user_a_id, user_b_id, state, type, created_at`,
      [smallerId, largerId, type]
    );

    return result.rows[0] || null;
  }

  /**
   * Find connection by ID
   */
  static async findById(connectionId) {
    const result = await query(
      `SELECT c.*,
              u_a.real_name as user_a_name,
              u_b.real_name as user_b_name,
              u_a.avatar_url as user_a_avatar,
              u_b.avatar_url as user_b_avatar
       FROM connections c
       JOIN users u_a ON c.user_a_id = u_a.id
       JOIN users u_b ON c.user_b_id = u_b.id
       WHERE c.id = $1`,
      [connectionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find pending connection where user is involved
   */
  static async findPendingForUser(userId) {
    const result = await query(
      `SELECT c.*,
              u_a.real_name as user_a_name,
              u_b.real_name as user_b_name,
              u_a.avatar_url as user_a_avatar,
              u_b.avatar_url as user_b_avatar
       FROM connections c
       JOIN users u_a ON c.user_a_id = u_a.id
       JOIN users u_b ON c.user_b_id = u_b.id
       WHERE c.state = 'pending'
       AND (c.user_a_id = $1 OR c.user_b_id = $1)
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Find active connections for user
   */
  static async findActiveForUser(userId) {
    const result = await query(
      `SELECT c.*,
              CASE
                WHEN c.user_a_id = $1 THEN u_b
                ELSE u_a
              END as other_user,
              CASE
                WHEN c.user_a_id = $1 THEN u_b.real_name
                ELSE u_a.real_name
              END as other_user_name,
              CASE
                WHEN c.user_a_id = $1 THEN u_b.avatar_url
                ELSE u_a.avatar_url
              END as other_user_avatar
       FROM connections c
       JOIN users u_a ON c.user_a_id = u_a.id
       JOIN users u_b ON c.user_b_id = u_b.id
       WHERE c.state = 'active'
       AND (c.user_a_id = $1 OR c.user_b_id = $1)
       ORDER BY c.started_at DESC NULLS LAST, c.created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Accept a pending connection
   */
  static async accept(connectionId) {
    const result = await query(
      `UPDATE connections
       SET state = 'active',
           started_at = NOW(),
           expires_at = CASE
             WHEN type = 'temporary' THEN NOW() + INTERVAL '12 months'
             ELSE NULL
           END,
           updated_at = NOW()
       WHERE id = $1
       AND state = 'pending'
       RETURNING *`,
      [connectionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Remove a connection (silent removal)
   */
  static async remove(connectionId, userId) {
    // Determine if user is A or B
    const connection = await this.findById(connectionId);
    if (!connection) return null;

    const endedReason = connection.user_a_id === parseInt(userId)
      ? 'removed_by_a'
      : 'removed_by_b';

    const result = await query(
      `UPDATE connections
       SET state = 'ended',
           ended_at = NOW(),
           ended_reason = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [connectionId, endedReason]
    );

    return result.rows[0] || null;
  }

  /**
   * Count active connections for user
   */
  static async countActive(userId) {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM connections
       WHERE state = 'active'
       AND (user_a_id = $1 OR user_b_id = $1)`,
      [userId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Check if two users are connected
   */
  static async findConnectionBetween(userAId, userBId) {
    const [smallerId, largerId] = userAId < userBId
      ? [userAId, userBId]
      : [userBId, userAId];

    const result = await query(
      `SELECT *
       FROM connections
       WHERE user_a_id = $1
       AND user_b_id = $2`,
      [smallerId, largerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Find connection by invite token
   */
  static async findByInviteToken(token) {
    const result = await query(
      `SELECT c.*,
              u_a.real_name as user_a_name,
              u_a.avatar_url as user_a_avatar
       FROM connections c
       JOIN users u_a ON c.user_a_id = u_a.id
       WHERE c.state = 'pending'
       AND c.invite_token = $1`,
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Reconfirm a temporary connection
   */
  static async reconfirm(connectionId, userId) {
    // Determine if user is A or B
    const connection = await this.findById(connectionId);
    if (!connection) return null;

    const isUserA = connection.user_a_id === userId;
    const field = isUserA ? 'reconfirm_a_at' : 'reconfirm_b_at';

    const result = await query(
      `UPDATE connections
       SET ${field} = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [connectionId]
    );

    return result.rows[0] || null;
  }

  /**
   * Renew expiry for a reconfirmed connection (extend by 12 months)
   */
  static async renewExpiry(connectionId) {
    const result = await query(
      `UPDATE connections
       SET expires_at = NOW() + INTERVAL '12 months',
           reconfirm_a_at = NULL,
           reconfirm_b_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [connectionId]
    );

    return result.rows[0] || null;
  }
}

export default Connection;
