import express from 'express';
import authRoutes from './auth.js';
import connectionRoutes from './connections.js';
import postRoutes from './posts.js';
import * as inviteController from '../controllers/inviteController.js';
import { migrate } from '../database/migrate.js';

const router = express.Router();

// Mount route modules
router.use('/', authRoutes);
router.use('/connections', connectionRoutes);
router.use('/', postRoutes);

/**
 * POST /v1/admin/migrate
 * Run database migrations (admin only, no auth for setup)
 */
router.post('/admin/migrate', async (req, res, next) => {
  try {
    await migrate();
    res.status(200).json({
      success: true,
      message: 'Migration completed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/invites
 * Create invite token
 */
router.post('/invites', inviteController.createInvite);

/**
 * GET /v1/invites/:token/validate
 * Validate invite token
 */
router.get('/invites/:token/validate', inviteController.validateInvite);

/**
 * GET /v1/invites
 * List user's invites
 */
router.get('/invites', inviteController.listInvites);

export default router;
