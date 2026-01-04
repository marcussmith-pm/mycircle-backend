import { Comment } from '../models/Comment.js';
import { Post } from '../models/Post.js';
import { User } from '../models/User.js';

/**
 * Get comments for a post
 * GET /v1/posts/:postId/comments
 */
export const getComments = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { postId } = req.params;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    // Get comments
    const comments = await Comment.findByPostId(postId, user.id);

    res.status(200).json({
      comments,
      count: comments.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new comment
 * POST /v1/posts/:postId/comments
 */
export const createComment = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { postId } = req.params;
    const { body } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Not Found', message: 'Post not found' });
    }

    // Validate body
    if (!body || typeof body !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Comment body is required'
      });
    }

    if (body.length > 1000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Comment must be 1000 characters or less'
      });
    }

    // Create comment
    const comment = await Comment.create(postId, user.id, body.trim());

    res.status(201).json({
      id: comment.id,
      post_id: comment.post_id,
      commenter_name: comment.commenter_name,
      commenter_avatar: comment.commenter_avatar,
      body: comment.body,
      created_at: comment.created_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a comment
 * PATCH /v1/comments/:commentId
 */
export const updateComment = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { commentId } = req.params;
    const { body } = req.body;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Validate body
    if (!body || typeof body !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Comment body is required'
      });
    }

    if (body.length > 1000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Comment must be 1000 characters or less'
      });
    }

    // Update comment
    const updated = await Comment.updateBody(commentId, user.id, body.trim());

    if (!updated) {
      return res.status(404).json({ error: 'Not Found', message: 'Comment not found' });
    }

    res.status(200).json({
      id: updated.id,
      body: updated.body,
      updated_at: updated.updated_at
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a comment
 * DELETE /v1/comments/:commentId
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { commentId } = req.params;

    // Validate user
    const user = await User.findByFirebaseUid(firebaseUid);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Delete comment
    const deleted = await Comment.delete(commentId, user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Not Found', message: 'Comment not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getComments,
  createComment,
  updateComment,
  deleteComment
};
