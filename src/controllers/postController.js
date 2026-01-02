import { Post, MediaUpload } from '../models/Post.js';
import { User } from '../models/User.js';

/**
 * Generate signed upload URLs for media files
 * POST /v1/media/uploads
 */
export const generateUploadUrls = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { files } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    if (!Array.isArray(files) || files.length === 0 || files.length > 10) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Must provide 1-10 files'
      });
    }

    // Validate each file
    for (const file of files) {
      if (!file.contentType || !file.sizeBytes) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Each file must have contentType and sizeBytes'
        });
      }

      if (!MediaUpload.validateFileSize(file.contentType, file.sizeBytes)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `File size exceeds limit (${file.contentType.startsWith('image/') ? '10MB' : '100MB'})`
        });
      }
    }

    // Generate upload URLs
    const uploadItems = await MediaUpload.generateUploadUrls(files);

    res.status(200).json({
      uploads: uploadItems
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new post
 * POST /v1/posts
 */
export const createPost = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { caption, content_type, comments_enabled, media, client_id } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate content type
    const validTypes = ['post', 'reel'];
    if (!content_type || !validTypes.includes(content_type)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'content_type must be "post" or "reel"'
      });
    }

    // Validate media
    if (!Array.isArray(media) || media.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one media item required'
      });
    }

    const maxMedia = content_type === 'post' ? 10 : 1;
    if (media.length > maxMedia) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Maximum ${maxMedia} media item(s) allowed`
      });
    }

    // Validate caption length
    if (caption && caption.length > 2200) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Caption must be 2200 characters or less'
      });
    }

    // For reels, validate video duration
    if (content_type === 'reel') {
      const videoMedia = media[0];
      if (videoMedia.durationMs && !MediaUpload.validateVideoDuration(videoMedia.durationMs)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Video duration must be 60 seconds or less'
        });
      }
    }

    // Create post
    const post = await Post.create(
      user.id,
      caption,
      content_type,
      comments_enabled,
      media,
      client_id
    );

    res.status(201).json({
      id: post.id,
      owner_user_id: post.owner_user_id,
      caption: post.caption,
      content_type: post.content_type,
      comments_enabled: post.comments_enabled,
      media: post.media,
      created_at: post.created_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update post caption
 * PATCH /v1/posts/:id
 */
export const updatePost = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;
    const { caption } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate caption length
    if (caption !== undefined && caption !== null && caption.length > 2200) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Caption must be 2200 characters or less'
      });
    }

    // Update post
    const updated = await Post.updateCaption(id, user.id, caption || '');

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    res.status(200).json({
      id: updated.id,
      caption: updated.caption,
      updated_at: updated.updated_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete post
 * DELETE /v1/posts/:id
 */
export const deletePost = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Delete post
    const deleted = await Post.softDelete(id, user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle comments on post
 * PATCH /v1/posts/:id/settings
 */
export const toggleComments = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;
    const { comments_enabled } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Toggle comments
    const updated = await Post.toggleComments(id, user.id, comments_enabled);

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    res.status(200).json({
      id: updated.id,
      comments_enabled: updated.comments_enabled
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get feed for user
 * GET /v1/feed
 */
export const getFeed = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { newer_than, limit } = req.query;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Get feed posts
    const posts = await Post.getFeed(
      user.id,
      newer_than || null,
      parseInt(limit) || 20
    );

    res.status(200).json({
      posts,
      count: posts.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark posts as seen
 * POST /v1/feed/seen
 */
export const markSeen = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { post_ids } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate post_ids
    if (!Array.isArray(post_ids)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'post_ids must be an array'
      });
    }

    // Mark as seen
    await Post.markAsSeen(user.id, post_ids);

    res.status(200).json({
      success: true,
      marked: post_ids.length
    });
  } catch (error) {
    next(error);
  }
};

export default {
  generateUploadUrls,
  createPost,
  updatePost,
  deletePost,
  toggleComments,
  getFeed,
  markSeen
};
