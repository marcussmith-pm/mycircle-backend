import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticate, optionalAuth } from '../auth.js';
import { verifyIdToken } from '../../config/firebase.js';

// Mock Firebase
vi.mock('../../config/firebase.js', () => ({
  verifyIdToken: vi.fn()
}));

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should pass valid Firebase token and attach user to request', async () => {
      const mockDecodedToken = {
        uid: 'firebase_123',
        email: 'test@example.com',
        email_verified: true,
        phone_number: '+1234567890',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      };

      verifyIdToken.mockResolvedValue(mockDecodedToken);
      req.headers.authorization = 'Bearer valid_token';

      await authenticate(req, res, next);

      expect(verifyIdToken).toHaveBeenCalledWith('valid_token');
      expect(req.user).toEqual({
        firebaseUid: 'firebase_123',
        email: 'test@example.com',
        emailVerified: true,
        phoneNumber: '+1234567890',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should return 401 when Authorization header is missing', async () => {
      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is malformed', async () => {
      req.headers.authorization = 'InvalidFormat token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      verifyIdToken.mockRejectedValue(new Error('Invalid or expired token'));
      req.headers.authorization = 'Bearer invalid_token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      verifyIdToken.mockRejectedValue(new Error('Invalid or expired token'));
      req.headers.authorization = 'Bearer expired_token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle dev tokens for testing', async () => {
      req.headers.authorization = 'Bearer dev_token_1234567890';

      await authenticate(req, res, next);

      expect(verifyIdToken).not.toHaveBeenCalled();
      expect(req.user).toEqual({
        firebaseUid: 'dev_user_123',
        email: 'dev@example.com',
        emailVerified: true,
        phoneNumber: '+1234567890',
        name: 'Dev User',
        picture: null
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle token with minimal user data', async () => {
      const mockDecodedToken = {
        uid: 'firebase_456'
      };

      verifyIdToken.mockResolvedValue(mockDecodedToken);
      req.headers.authorization = 'Bearer minimal_token';

      await authenticate(req, res, next);

      expect(req.user).toEqual({
        firebaseUid: 'firebase_456',
        email: null,
        emailVerified: false,
        phoneNumber: null,
        name: null,
        picture: null
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should return generic 401 for other authentication errors', async () => {
      verifyIdToken.mockRejectedValue(new Error('Network error'));
      req.headers.authorization = 'Bearer some_token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication failed'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should attach user info when valid token is provided', async () => {
      const mockDecodedToken = {
        uid: 'firebase_789',
        email: 'optional@example.com'
      };

      verifyIdToken.mockResolvedValue(mockDecodedToken);
      req.headers.authorization = 'Bearer valid_token';

      await optionalAuth(req, res, next);

      expect(req.user).toEqual({
        firebaseUid: 'firebase_789',
        email: 'optional@example.com',
        emailVerified: false,
        phoneNumber: null,
        name: null,
        picture: null
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user info when no token is provided', async () => {
      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user info when token is invalid', async () => {
      verifyIdToken.mockRejectedValue(new Error('Invalid token'));
      req.headers.authorization = 'Bearer invalid_token';

      await optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should not return 401 for missing token', async () => {
      await optionalAuth(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should not return 401 for invalid token', async () => {
      verifyIdToken.mockRejectedValue(new Error('Invalid token'));
      req.headers.authorization = 'Bearer invalid_token';

      await optionalAuth(req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });
  });
});
