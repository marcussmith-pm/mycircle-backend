import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { searchLimiter, authLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Auth endpoints prefix
const authRouter = express.Router();

/**
 * POST /v1/auth/register
 * Register or login user with Firebase token
 */
authRouter.post('/register', authLimiter, authenticate, authController.register);

// Mount auth routes
router.use('/auth', authRouter);

/**
 * GET /v1/me
 * Get current user profile
 */
router.get('/me', authenticate, authController.getMe);

/**
 * PATCH /v1/me
 * Update current user profile
 */
router.patch('/me', authenticate, authController.updateMe);

/**
 * GET /v1/users/search
 * Search for users by name
 */
router.get('/users/search', authenticate, searchLimiter, authController.searchUsers);

export default router;
