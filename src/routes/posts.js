import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as postController from '../controllers/postController.js';
import * as commentController from '../controllers/commentController.js';
import * as reactionController from '../controllers/reactionController.js';

const router = express.Router();

/**
 * POST /v1/media/uploads
 * Generate signed upload URLs for media
 */
router.post('/media/uploads', authenticate, postController.generateUploadUrls);

/**
 * POST /v1/posts
 * Create a new post
 */
router.post('/posts', authenticate, postController.createPost);

/**
 * PATCH /v1/posts/:id
 * Update post caption
 */
router.patch('/posts/:id', authenticate, postController.updatePost);

/**
 * DELETE /v1/posts/:id
 * Delete a post
 */
router.delete('/posts/:id', authenticate, postController.deletePost);

/**
 * PATCH /v1/posts/:id/settings
 * Toggle comments on post
 */
router.patch('/posts/:id/settings', authenticate, postController.toggleComments);

/**
 * GET /v1/feed
 * Get feed for user
 */
router.get('/feed', authenticate, postController.getFeed);

/**
 * POST /v1/feed/seen
 * Mark posts as seen
 */
router.post('/feed/seen', authenticate, postController.markSeen);

/**
 * GET /v1/posts/:postId/comments
 * Get comments for a post
 */
router.get('/posts/:postId/comments', authenticate, commentController.getComments);

/**
 * POST /v1/posts/:postId/comments
 * Create a new comment
 */
router.post('/posts/:postId/comments', authenticate, commentController.createComment);

/**
 * PATCH /v1/comments/:commentId
 * Update a comment
 */
router.patch('/comments/:commentId', authenticate, commentController.updateComment);

/**
 * DELETE /v1/comments/:commentId
 * Delete a comment
 */
router.delete('/comments/:commentId', authenticate, commentController.deleteComment);

/**
 * GET /v1/posts/:postId/reactions
 * Get reactions for a post
 */
router.get('/posts/:postId/reactions', authenticate, reactionController.getReactions);

/**
 * POST /v1/posts/:postId/reactions
 * Add or update a reaction
 */
router.post('/posts/:postId/reactions', authenticate, reactionController.setReaction);

/**
 * DELETE /v1/posts/:postId/reactions
 * Remove a reaction
 */
router.delete('/posts/:postId/reactions', authenticate, reactionController.removeReaction);

export default router;
