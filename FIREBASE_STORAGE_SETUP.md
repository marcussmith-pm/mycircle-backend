# Firebase Storage Setup Guide

This guide walks you through setting up Firebase Storage for My Circle media uploads.

## Why Firebase Storage?

✅ **Integrates with Firebase Auth** - Already using it for authentication!
✅ **Built-in security rules** - Enforce access control at the storage level
✅ **No additional infrastructure** - Uses your existing Firebase project
✅ **Simple and secure** - No need for public buckets or complex CORS setup

## Prerequisites

- Firebase project (you already have `my-circle-74a81`)
- Firebase project owner or editor permissions

## Step 1: Enable Firebase Storage

### Option A: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `my-circle-74a81`
3. In the left sidebar, click **Build** > **Storage**
4. Click **Get Started**
5. Choose:
   - **Start in Test Mode** (we'll update rules later)
   - Select a location near your users (e.g., `us-central`)
6. Click **Done**

### Option B: Firebase CLI

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Storage in your project
firebase init storage

# Or use gcloud CLI
gcloud beta services enable firebasestorage.googleapis.com \
  --project=my-circle-74a81
```

## Step 2: Deploy Security Rules

The `storage.rules` file in this repository defines who can access what.

### Via Firebase Console:

1. Go to **Storage** > **Rules** tab
2. Click **Edit rules**
3. Copy the contents of `storage.rules` from this repository
4. Paste into the editor
5. Click **Publish**

### Via Firebase CLI:

```bash
# From the backend directory
firebase deploy --only storage:rules
```

## Step 3: Configure Environment Variables

### Local Development

Your `.env` file already has:
```
FIREBASE_STORAGE_BUCKET=gs://my-circle-74a81.appspot.com
```

### Railway Production

The environment variable has already been added to Railway.

## Step 4: Enable CORS (Optional)

If you need direct browser uploads (not used in current implementation):

1. Install `gcloud` CLI
2. Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

3. Apply CORS:
```bash
gsutil cors set cors.json gs://my-circle-74a81.appspot.com
```

**Note:** Current implementation uses signed URLs from the backend, so CORS is not strictly necessary.

## Understanding the Security Rules

The `storage.rules` file defines:

```javascript
match /posts/{allPaths=**} {
  // Authenticated users can read post media
  allow read: if isAuthenticated();

  // Authenticated users can upload (backend validates circle membership)
  allow write: if isAuthenticated();
}
```

**How it works:**
1. Backend generates signed URLs for uploads (15 min expiry)
2. Mobile app uploads directly to Firebase Storage using signed URL
3. Firebase Storage validates the signature (not the rules)
4. For reads, rules check if user is authenticated
5. Backend validates circle membership separately

## Step 5: Verify Setup

Test locally:

```bash
cd backend
npm run dev
```

Then test the upload endpoint:

```bash
# Get upload URLs
curl -X POST http://localhost:3000/v1/media/uploads \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [
      {
        "contentType": "image/jpeg",
        "sizeBytes": 500000
      }
    ]
  }'
```

Expected response:
```json
{
  "uploads": [
    {
      "uploadToken": "...",
      "uploadUrl": "https://storage.googleapis.com/...",  // Signed URL
      "storageKey": "posts/uuid.jpg",
      "cdnUrl": "https://firebasestorage.googleapis.com/...",
      "contentType": "image/jpeg"
    }
  ]
}
```

## Storage Hierarchy

Files are organized as:
```
my-circle-74a81.appspot.com/
  posts/
    {uuid}.jpg          # Post photos and reels
  users/
    {userId}/avatar.jpg  # User avatar images
```

## Costs and Limits

**Firebase Storage Free Tier (Spark Plan):**
- 5GB storage
- 1GB/day download
- 20GB/day upload

**Pay-as-you-go (Blaze Plan):**
- Storage: $0.026/GB/month
- Download: $0.12/GB (network egress)
- Upload: Free

**Recommended for production:** Blaze Plan

## Troubleshooting

### "Firebase Storage not configured, using placeholder URLs"

- Check `FIREBASE_PROJECT_ID` is set
- Verify service account has Firebase Storage Admin role
- Ensure Firebase Storage is enabled in your project

### 403 Forbidden when uploading

- Verify signed URL hasn't expired (15 minutes)
- Check security rules are published
- Ensure file upload matches content type in signed URL

### Images not loading in app

- Check Firebase Storage security rules
- Verify user is authenticated
- Test URL directly in browser (will need auth token)

### "Permission denied" when deploying rules

- Ensure you're project owner or editor
- Check `firebase login` was successful
- Verify you're in the correct Firebase project

## Security Best Practices

✅ **DO:**
- Use signed URLs for uploads (prevents unauthorized uploads)
- Enforce authentication in security rules
- Validate circle membership in backend before allowing uploads
- Use test mode during development, production rules before launch

❌ **DON'T:**
- Make the entire bucket public
- Allow unauthenticated reads/writes in production
- Store sensitive data in file names (use UUIDs)
- Skip security rule validation

## Advanced: Circle-Based Access Control

For stricter security (only circle members can see posts), you can enhance the rules:

```javascript
match /posts/{postId} {
  allow read: if request.auth != null &&
    exists(/databases/(default)/documents/circles/$(request.auth.uid)/connections/$(postId));
}
```

This requires Firestore to track circle relationships, which aligns with your database-first approach.

## Next Steps

1. ✅ Enable Firebase Storage in Firebase Console
2. ✅ Deploy `storage.rules`
3. ✅ Test upload from mobile app
4. ✅ Verify images appear in feed
5. ✅ Monitor usage in Firebase Console > Storage > Usage

For detailed Firebase Storage documentation:
https://firebase.google.com/docs/storage
