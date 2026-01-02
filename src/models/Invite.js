import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export class Invite {
  /**
   * Create a new invite token
   */
  static async create(inviterUserId, options = {}) {
    const {
      maxUses = 1,
      expiresHours = 72
    } = options;

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresHours);

    const result = await query(
      `INSERT INTO invites (token, inviter_user_id, max_uses, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, token, inviter_user_id, max_uses, use_count, expires_at, created_at`,
      [token, inviterUserId, maxUses, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * Find invite by token
   */
  static async findByToken(token) {
    const result = await query(
      `SELECT id, token, inviter_user_id, max_uses, use_count, expires_at, created_at
       FROM invites
       WHERE token = $1`,
      [token]
    );

    return result.rows[0] || null;
  }

  /**
   * Validate invite token
   * Returns invite object if valid, null otherwise
   */
  static async validate(token) {
    const invite = await this.findByToken(token);

    if (!invite) {
      return null;
    }

    // Check if expired
    if (new Date() > new Date(invite.expires_at)) {
      return null;
    }

    // Check if max uses reached
    if (invite.use_count >= invite.max_uses) {
      return null;
    }

    return invite;
  }

  /**
   * Increment invite use count
   */
  static async incrementUse(token) {
    const result = await query(
      `UPDATE invites
       SET use_count = use_count + 1
       WHERE token = $1
       RETURNING use_count`,
      [token]
    );

    return result.rows[0].use_count;
  }

  /**
   * Get invite URL (deep link)
   */
  static getInviteUrl(token) {
    return `mycircle://invite/${token}`;
  }

  /**
   * Get invites created by user
   */
  static async getByInviter(userId) {
    const result = await query(
      `SELECT id, token, inviter_user_id, max_uses, use_count, expires_at, created_at
       FROM invites
       WHERE inviter_user_id = $1
       AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Clean up expired invites (run via cron)
   */
  static async cleanupExpired() {
    const result = await query(
      `DELETE FROM invites
       WHERE expires_at < NOW()
       RETURNING id`
    );

    return result.rowCount;
  }
}

export default Invite;
