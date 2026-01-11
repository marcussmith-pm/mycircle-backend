import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Google Cloud Storage
// Uses GOOGLE_APPLICATION_CREDENTIALS environment variable or default ADC
const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'mycircle-media';

/**
 * Get GCS bucket instance
 */
export const getBucket = () => {
  return storage.bucket(bucketName);
};

/**
 * Check if GCS is properly configured
 */
export const isConfigured = () => {
  return !!process.env.GCS_BUCKET_NAME || !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
};

/**
 * Get public URL for a file
 * Assumes bucket is public or has appropriate CORS/permissions
 */
export const getPublicUrl = (storageKey) => {
  return `https://storage.googleapis.com/${bucketName}/${storageKey}`;
};

export default { storage, getBucket, isConfigured, getPublicUrl };
