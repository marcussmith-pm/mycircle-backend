import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as postController from '../controllers/postController.js';

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

export default router;
