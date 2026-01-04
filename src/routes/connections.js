import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as connectionController from '../controllers/connectionController.js';

const router = express.Router();

/**
 * POST /v1/connections/request
 * Send a connection request
 */
router.post('/request', authLimiter, authenticate, connectionController.sendRequest);

/**
 * POST /v1/connections/:id/accept
 * Accept a pending connection request
 */
router.post('/:id/accept', authenticate, connectionController.acceptRequest);

/**
 * POST /v1/connections/:id/remove
 * Remove a connection (silent removal)
 */
router.post('/:id/remove', authenticate, connectionController.removeConnection);

/**
 * POST /v1/connections/:id/reconfirm
 * Reconfirm a temporary connection
 */
router.post('/:id/reconfirm', authenticate, connectionController.reconfirmConnection);

/**
 * GET /v1/connections
 * List user's active connections
 */
router.get('/', authenticate, connectionController.listConnections);

/**
 * GET /v1/connections/pending
 * List pending connection requests
 */
router.get('/pending', authenticate, connectionController.listPending);

export default router;
