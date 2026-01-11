import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Get Firebase Storage bucket from the Firebase app
// The bucket name format is: gs://[project-id].appspot.com
const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
  `gs://${process.env.FIREBASE_PROJECT_ID}.appspot.com`;

/**
 * Get Firebase Storage bucket instance
 */
export const getBucket = () => {
  return admin.storage().bucket();
};

/**
 * Check if Firebase Storage is properly configured
 */
export const isConfigured = () => {
  return !!process.env.FIREBASE_PROJECT_ID;
};

/**
 * Get public URL for a file
 * Note: Firebase Storage files are not public by default.
 * Use getSignedUrl() for generating time-limited access URLs.
 */
export const getPublicUrl = (storageKey) => {
  // This returns the default Firebase Storage URL format
  // However, access will be controlled by security rules
  return `https://firebasestorage.googleapis.com/v0/b/${process.env.FIREBASE_PROJECT_ID}.appspot.com/o/${encodeURIComponent(storageKey)}?alt=media`;
};

/**
 * Generate a signed URL for temporary access
 * @param {string} storageKey - The file path in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 */
export const getSignedUrl = async (storageKey, expiresIn = 3600) => {
  const file = admin.storage().bucket().file(storageKey);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });
  return url;
};

export default {
  bucketName,
  getBucket,
  isConfigured,
  getPublicUrl,
  getSignedUrl
};
