import { verifyIdToken } from '../config/firebase.js';

/**
 * Firebase authentication middleware
 * Verifies the Firebase JWT token from the Authorization header
 * and extracts user information into req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // DEV MODE: Accept dev tokens for testing
    if (token.startsWith('dev_token_') && process.env.NODE_ENV !== 'production') {
      // For dev mode, create a test user if it doesn't exist
      req.user = {
        firebaseUid: 'dev_user_123',
        email: 'dev@example.com',
        emailVerified: true,
        phoneNumber: '+1234567890',
        name: 'Dev User',
        picture: null
      };
      return next();
    }

    // Verify token with Firebase
    const decodedToken = await verifyIdToken(token);

    // Attach user info to request
    req.user = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      phoneNumber: decodedToken.phone_number || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);

    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't block if missing
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await verifyIdToken(token);

      req.user = {
        firebaseUid: decodedToken.uid,
        email: decodedToken.email || null,
        emailVerified: decodedToken.email_verified || false,
        phoneNumber: decodedToken.phone_number || null,
        name: decodedToken.name || null,
        picture: decodedToken.picture || null
      };
    }

    next();
  } catch (error) {
    // Continue without user context
    next();
  }
};
