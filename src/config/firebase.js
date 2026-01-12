import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Parse Firebase credentials from environment variables
const parsePrivateKey = (key) => {
  if (!key) return null;

  let parsedKey = key;

  // Remove surrounding quotes if present (handle multi-line strings)
  // Check if the ENTIRE key is wrapped in quotes (not just internal quotes)
  const trimmed = parsedKey.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    parsedKey = trimmed.slice(1, -1);
  }

  // Check if key has literal \n (from .env file) vs actual newlines (from Railway UI)
  // If it contains literal "\n" characters, convert them to actual newlines
  if (parsedKey.includes('\\n')) {
    parsedKey = parsedKey.replace(/\\n/g, '\n');
  }

  // Remove any remaining escape sequences for quotes
  parsedKey = parsedKey.replace(/\\"/g, '"');

  // Trim any remaining whitespace
  parsedKey = parsedKey.trim();

  return parsedKey;
};

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
};

// Debug: Log private key format (without exposing the actual key)
if (firebaseConfig.privateKey) {
  console.log('Firebase private key loaded:',
    'Length:', firebaseConfig.privateKey.length,
    'Starts with:', firebaseConfig.privateKey.substring(0, 30),
    'Ends with:', firebaseConfig.privateKey.substring(firebaseConfig.privateKey.length - 30));
}

// Check if Firebase is configured
const isFirebaseConfigured = firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your-project-id' &&
  firebaseConfig.clientEmail &&
  firebaseConfig.privateKey &&
  firebaseConfig.privateKey !== '"-----BEGIN PRIVATE KEY-----\\nYour private key here\\n-----END PRIVATE KEY-----\\n"';

// Initialize Firebase Admin only if configured
if (!admin.apps.length && isFirebaseConfigured) {
  try {
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET ||
      `gs://${firebaseConfig.projectId}.appspot.com`;

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      storageBucket: storageBucket
    });
    console.log('Firebase Admin initialized successfully');
    console.log(`Storage bucket: ${storageBucket}`);
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
