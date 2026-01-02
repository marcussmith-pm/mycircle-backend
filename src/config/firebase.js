import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Parse Firebase credentials from environment variables
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Check if Firebase is configured
const isFirebaseConfigured = firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your-project-id' &&
  firebaseConfig.clientEmail &&
  firebaseConfig.privateKey &&
  firebaseConfig.privateKey !== '"-----BEGIN PRIVATE KEY-----\\nYour private key here\\n-----END PRIVATE KEY-----\\n"';

// Initialize Firebase Admin only if configured
if (!admin.apps.length && isFirebaseConfigured) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else if (!isFirebaseConfigured) {
  console.log('Firebase not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env to enable Firebase features.');
}

// Only export auth if Firebase is initialized
export const auth = admin.apps.length > 0 ? admin.auth() : null;
export const firestore = admin.apps.length > 0 ? admin.firestore() : null;
export const isFirebaseReady = admin.apps.length > 0;

// Verify Firebase ID token
export const verifyIdToken = async (token) => {
  if (!auth) {
    throw new Error('Firebase not configured');
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification error:', error.message);
    throw new Error('Invalid or expired token');
  }
};

export default admin;
