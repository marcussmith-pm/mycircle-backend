import { query } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

export class Post {
  /**
   * Create a new post
   */
  static async create(ownerId, caption, contentType, commentsEnabled, mediaItems, clientId = null) {
    const client = await query();

    try {
      await client.query('BEGIN');

      // Create post
      const postResult = await client.query(
        `INSERT INTO posts (owner_user_id, caption, content_type, comments_enabled, client_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, owner_user_id, caption, content_type, comments_enabled, client_id, created_at`,
        [ownerId, caption || '', contentType, commentsEnabled !== false, clientId]
      );

      const post = postResult.rows[0];

      // Create media items
      for (const media of mediaItems) {
        await client.query(
          `INSERT INTO post_media (post_id, media_type, storage_key, cdn_url, position, duration_ms, width, height)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            post.id,
            media.mediaType,
            media.storageKey,
            media.cdnUrl,
            media.position,
            media.durationMs || null,
            media.width || null,
            media.height || null
          ]
        );
      }

      await client.query('COMMIT');

      // Fetch the complete post with media
      return await this.findById(post.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find post by ID
   */
  static async findById(postId) {
    const result = await query(
      `SELECT p.*,
              u.real_name as owner_name,
              u.avatar_url as owner_avatar
       FROM posts p
       JOIN users u ON p.owner_user_id = u.id
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [postId]
    );

    if (result.rows.length === 0) return null;

    const post = result.rows[0];

    // Get media for this post
    const mediaResult = await query(
      `SELECT *
       FROM post_media
       WHERE post_id = $1
       ORDER BY position ASC`,
      [postId]
    );

    return {
      ...post,
      media: mediaResult.rows
    };
  }

  /**
   * Find posts by owner
   */
  static async findByOwner(ownerId, limit = 20, offset = 0) {
    const result = await query(
      `SELECT p.*
       FROM posts p
       WHERE p.owner_user_id = $1
       AND p.deleted_at IS NULL
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [ownerId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Update post caption
   */
  static async updateCaption(postId, ownerId, newCaption) {
    // Verify ownership
    const post = await this.findById(postId);
    if (!post || post.owner_user_id !== ownerId) {
      return null;
    }

    const result = await query(
      `UPDATE posts
       SET caption = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, caption, updated_at`,
      [newCaption || '', postId]
    );

    return result.rows[0];
  }

  /**
   * Soft delete post
   */
  static async softDelete(postId, ownerId) {
    // Verify ownership
    const post = await this.findById(postId);
    if (!post || post.owner_user_id !== ownerId) {
      return null;
    }

    const result = await query(
      `UPDATE posts
       SET deleted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [postId]
    );

    return result.rows[0];
  }

  /**
   * Toggle comments
   */
  static async toggleComments(postId, ownerId, enabled) {
    // Verify ownership
    const post = await this.findById(postId);
    if (!post || post.owner_user_id !== ownerId) {
      return null;
    }

    const result = await query(
      `UPDATE posts
       SET comments_enabled = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, comments_enabled`,
      [enabled, postId]
    );

    return result.rows[0];
  }

  /**
   * Get feed for user (posts from circle connections)
   */
  static async getFeed(userId, newerThan = null, limit = 20) {
    // Query for posts from mutual connections
    let queryText = `
      SELECT DISTINCT
        p.id,
        p.owner_user_id,
        p.caption,
        p.content_type,
        p.comments_enabled,
        p.created_at,
        p.updated_at,
        u.real_name as owner_name,
        u.avatar_url as owner_avatar,
        COALESCE(ps.seen_at IS NOT NULL, false) as seen
      FROM posts p
      JOIN users u ON p.owner_user_id = u.id
      JOIN connections c ON (
        (c.user_a_id = $1 AND c.user_b_id = p.owner_user_id) OR
        (c.user_b_id = $1 AND c.user_a_id = p.owner_user_id)
      )
      LEFT JOIN post_seen ps ON (ps.post_id = p.id AND ps.user_id = $1)
      WHERE c.state = 'active'
        AND c.ended_at IS NULL
        AND p.deleted_at IS NULL
    `;

    const queryParams = [userId];
    let paramIndex = 2;

    // For pull-to-refresh: only get newer posts
    if (newerThan) {
      queryText += ` AND p.created_at > $${paramIndex}`;
      queryParams.push(newerThan);
      paramIndex++;
    }

    queryText += `
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex}
    `;
    queryParams.push(limit);

    const result = await query(queryText, queryParams);

    // Get media for each post
    const posts = [];
    for (const post of result.rows) {
      const mediaResult = await query(
        `SELECT *
         FROM post_media
         WHERE post_id = $1
         ORDER BY position ASC`,
        [post.id]
      );

      posts.push({
        id: post.id,
        owner_user_id: post.owner_user_id,
        caption: post.caption,
        content_type: post.content_type,
        comments_enabled: post.comments_enabled,
        created_at: post.created_at,
        updated_at: post.updated_at,
        owner_name: post.owner_name,
        owner_avatar: post.owner_avatar,
        seen: post.seen,
        media: mediaResult.rows
      });
    }

    return posts;
  }

  /**
   * Mark posts as seen
   */
  static async markAsSeen(userId, postIds) {
    if (postIds.length === 0) return;

    const client = await query();
    try {
      for (const postId of postIds) {
        await client.query(
          `INSERT INTO post_seen (post_id, user_id, seen_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (post_id, user_id) DO UPDATE
             SET seen_at = NOW()`,
          [postId, userId]
        );
      }
    } finally {
      client.release();
    }
  }
}

export class MediaUpload {
  /**
   * Generate signed upload URLs
   */
  static async generateUploadUrls(files) {
    const uploadItems = [];

    for (const file of files) {
      const uploadToken = jwt.sign(
        {
          contentType: file.contentType,
          sizeBytes: file.sizeBytes,
          exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
        },
        process.env.JWT_SECRET || 'mycircle-secret'
      );

      const storageKey = uuidv4();
      const extension = this.getExtension(file.contentType);

      // For now, return a placeholder URL
      // In production, this would generate actual S3/GCS signed URLs
      uploadItems.push({
        uploadToken,
        uploadUrl: `https://storage.example.com/upload/${storageKey}`, // Placeholder
        storageKey: `${storageKey}${extension}`,
        contentType: file.contentType
      });
    }

    return uploadItems;
  }

  /**
   * Get file extension from content type
   */
  static getExtension(contentType) {
    const map = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov'
    };
    return map[contentType] || '.bin';
  }

  /**
   * Validate file size
   */
  static validateFileSize(contentType, sizeBytes) {
    const photoMaxSize = 10 * 1024 * 1024; // 10MB
    const videoMaxSize = 100 * 1024 * 1024; // 100MB

    if (contentType.startsWith('image/')) {
      return sizeBytes <= photoMaxSize;
    } else if (contentType.startsWith('video/')) {
      return sizeBytes <= videoMaxSize;
    }
    return false;
  }

  /**
   * Validate video duration (for reels)
   */
  static validateVideoDuration(durationMs) {
    return durationMs <= 60000; // 60 seconds max
  }
}

export default Post;
