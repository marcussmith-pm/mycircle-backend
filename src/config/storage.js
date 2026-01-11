import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get Firebase Storage bucket from the Firebase app
 */
export const getBucket = () => {
  const app = admin.app();
  const bucketName = app.options.storageBucket;

  if (!bucketName) {
    throw new Error('Storage bucket not configured. Set FIREBASE_STORAGE_BUCKET environment variable.');
  }

  return admin.storage().bucket(bucketName);
};

/**
 * Check if Firebase Storage is properly configured
 */
export const isConfigured = () => {
  try {
    const app = admin.app();
    return !!app.options.storageBucket;
  } catch (e) {
    return false;
  }
};

/**
 * Get public URL for a file
 * Note: Firebase Storage files are not public by default.
 * Access is controlled by security rules.
 */
export const getPublicUrl = (storageKey) => {
  const app = admin.app();
  const bucketName = app.options.storageBucket;

  // Convert gs://bucket-name to bucket-name format for URL
  const bucketNameForUrl = bucketName.replace('gs://', '');

  // This returns the default Firebase Storage URL format
  // However, access will be controlled by security rules
  return `https://firebasestorage.googleapis.com/v0/b/${bucketNameForUrl}/o/${encodeURIComponent(storageKey)}?alt=media`;
};

/**
 * Generate a signed URL for temporary access
 * @param {string} storageKey - The file path in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 */
export const getSignedUrl = async (storageKey, expiresIn = 3600) => {
  const file = getBucket().file(storageKey);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresIn * 1000,
  });
  return url;
};

export default {
  getBucket,
  isConfigured,
  getPublicUrl,
  getSignedUrl
};
