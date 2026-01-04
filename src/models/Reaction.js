import { query } from '../config/database.js';

export class Reaction {
  /**
   * Add or update a reaction
   */
  static async upsert(postId, actorUserId, reactionType, visibilityScope = 'circle') {
    const result = await query(
      `INSERT INTO post_reactions (post_id, actor_user_id, reaction_type, visibility_scope)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (post_id, actor_user_id, reaction_type)
       DO UPDATE SET
         reaction_type = EXCLUDED.reaction_type,
         visibility_scope = EXCLUDED.visibility_scope
       RETURNING id, post_id, actor_user_id, reaction_type, visibility_scope, created_at`,
      [postId, actorUserId, reactionType, visibilityScope]
    );

    return await this.findById(result.rows[0].id);
  }

  /**
   * Find reaction by ID
   */
  static async findById(reactionId) {
    const result = await query(
      `SELECT r.*,
              u.real_name as actor_name,
              u.avatar_url as actor_avatar
       FROM post_reactions r
       JOIN users u ON r.actor_user_id = u.id
       WHERE r.id = $1`,
      [reactionId]
    );

    return result.rows[0];
  }

  /**
   * Get reactions for a post
   */
  static async findByPostId(postId, userId = null) {
    const result = await query(
      `SELECT r.*,
              u.real_name as actor_name,
              u.avatar_url as actor_avatar
       FROM post_reactions r
       JOIN users u ON r.actor_user_id = u.id
       WHERE r.post_id = $1
         AND (
           r.visibility_scope = 'circle'
           OR r.actor_user_id = $2
           OR $2 IS NULL
         )
       ORDER BY r.created_at DESC`,
      [postId, userId]
    );

    return result.rows;
  }

  /**
   * Remove a reaction
   */
  static async remove(postId, actorUserId, reactionType) {
    const result = await query(
      `DELETE FROM post_reactions
       WHERE post_id = $1
         AND actor_user_id = $2
         AND reaction_type = $3
       RETURNING id`,
      [postId, actorUserId, reactionType]
    );

    return result.rows[0];
  }

  /**
   * Get reaction counts for a post (owner only)
   */
  static async getCountsByPostId(postId, ownerId) {
    const result = await query(
      `SELECT reaction_type, COUNT(*) as count
       FROM post_reactions
       WHERE post_id = $1
       GROUP BY reaction_type`,
      [postId]
    );

    // Build counts object
    const counts = {};
    for (const row of result.rows) {
      counts[row.reaction_type] = parseInt(row.count);
    }

    return counts;
  }

  /**
   * Get user's reaction on a post
   */
  static async getUserReaction(postId, userId) {
    const result = await query(
      `SELECT *
       FROM post_reactions
       WHERE post_id = $1
         AND actor_user_id = $2`,
      [postId, userId]
    );

    return result.rows[0];
  }

  /**
   * Get all reactions for a user's posts (owner view)
   */
  static async getUserPostReactions(ownerId) {
    const result = await query(
      `SELECT r.post_id,
              r.reaction_type,
              u.real_name as reactor_name,
              u.avatar_url as reactor_avatar,
              r.created_at
       FROM post_reactions r
       JOIN posts p ON r.post_id = p.id
       JOIN users u ON r.actor_user_id = u.id
       WHERE p.owner_user_id = $1
       ORDER BY r.created_at DESC`,
      [ownerId]
    );

    return result.rows;
  }
}

export default Reaction;
