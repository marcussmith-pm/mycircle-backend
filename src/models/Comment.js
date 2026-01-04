import { query } from '../config/database.js';

export class Comment {
  /**
   * Create a new comment
   */
  static async create(postId, commenterUserId, body, visibilityScope = 'circle') {
    const result = await query(
      `INSERT INTO post_comments (post_id, commenter_user_id, body, visibility_scope)
       VALUES ($1, $2, $3, $4)
       RETURNING id, post_id, commenter_user_id, body, visibility_scope, created_at`,
      [postId, commenterUserId, body, visibilityScope]
    );

    return await this.findById(result.rows[0].id);
  }

  /**
   * Find comment by ID
   */
  static async findById(commentId) {
    const result = await query(
      `SELECT c.*,
              u.real_name as commenter_name,
              u.avatar_url as commenter_avatar
       FROM post_comments c
       JOIN users u ON c.commenter_user_id = u.id
       WHERE c.id = $1`,
      [commentId]
    );

    return result.rows[0];
  }

  /**
   * Get comments for a post
   */
  static async findByPostId(postId, userId = null) {
    const result = await query(
      `SELECT c.*,
              u.real_name as commenter_name,
              u.avatar_url as commenter_avatar
       FROM post_comments c
       JOIN users u ON c.commenter_user_id = u.id
       WHERE c.post_id = $1
         AND (
           c.visibility_scope = 'circle'
           OR c.commenter_user_id = $2
           OR $2 IS NULL
         )
       ORDER BY c.created_at ASC`,
      [postId, userId]
    );

    return result.rows;
  }

  /**
   * Update comment body
   */
  static async updateBody(commentId, commenterUserId, newBody) {
    // Verify ownership
    const comment = await this.findById(commentId);
    if (!comment || comment.commenter_user_id !== commenterUserId) {
      return null;
    }

    const result = await query(
      `UPDATE post_comments
       SET body = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, body, updated_at`,
      [newBody, commentId]
    );

    return result.rows[0];
  }

  /**
   * Delete comment (soft delete by updating visibility to owner_only)
   */
  static async delete(commentId, commenterUserId) {
    // Verify ownership
    const comment = await this.findById(commentId);
    if (!comment || comment.commenter_user_id !== commenterUserId) {
      return null;
    }

    const result = await query(
      `UPDATE post_comments
       SET visibility_scope = 'owner_only',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [commentId]
    );

    return result.rows[0];
  }

  /**
   * Get comment count for a post
   */
  static async getCountByPostId(postId, userId = null) {
    const result = await query(
      `SELECT COUNT(*)
       FROM post_comments
       WHERE post_id = $1
         AND (
           visibility_scope = 'circle'
           OR commenter_user_id = $2
           OR $2 IS NULL
         )`,
      [postId, userId]
    );

    return parseInt(result.rows[0].count);
  }
}

export default Comment;
