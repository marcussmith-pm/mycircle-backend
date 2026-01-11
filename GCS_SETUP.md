# Google Cloud Storage Setup Guide

This guide walks you through setting up Google Cloud Storage for My Circle media uploads.

## Prerequisites

- Google Cloud project (you already have `my-circle-74a81`)
- Google Cloud CLI installed (`gcloud`)
- Project owner or editor permissions

## Step 1: Create a GCS Bucket

```bash
# Set your project
gcloud config set project my-circle-74a81

# Create the bucket (multi-region, standard class)
gsutil mb -p my-circle-74a81 -l us gs://mycircle-media

# Or create via Google Cloud Console:
# 1. Go to https://console.cloud.google.com/storage
# 2. Click "Create Bucket"
# 3. Name: "mycircle-media"
# 4. Location: Multi-region (US)
# 5. Storage class: Standard
# 6. Access control: Fine-grained (recommended)
```

## Step 2: Configure CORS

Create a file `cors-config.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:

```bash
gsutil cors set cors-config.json gs://mycircle-media
```

## Step 3: Make Bucket Public (for read access)

**Option A: Make entire bucket public (simpler, less secure)**

```bash
gsutil iam ch allUsers:objectViewer gs://mycircle-media
```

**Option B: Use signed URLs for reading (more secure, requires code changes)**

Currently the code uses public URLs (`getPublicUrl`). To use signed URLs for reads, you'd need to modify the feed endpoint to generate signed URLs.

## Step 4: Set Environment Variables

### Local Development

Your `.env` file already has:
```
GCS_BUCKET_NAME=mycircle-media
GCS_PROJECT_ID=my-circle-74a81
```

The Firebase service account credentials in your `.env` file should work for GCS if the service account has the appropriate permissions.

### Railway Production

Add these variables to your Railway project:

1. Go to your Railway project
2. Navigate to the backend service
3. Go to Variables tab
4. Add:
   - `GCS_BUCKET_NAME` = `mycircle-media`
   - `GCS_PROJECT_ID` = `my-circle-74a81`
   - `GOOGLE_APPLICATION_CREDENTIALS` = (Your Firebase service account JSON, base64 encoded)

To get the service account JSON:

```bash
# Download your Firebase service account key from Firebase Console
# Then base64 encode it:
base64 -i your-service-account.json | pbcopy  # macOS
# or
base64 -w 0 your-service-account.json         # Linux

# Use the output as GOOGLE_APPLICATION_CREDENTIALS value
```

Alternatively, if using the same Firebase service account, Railway should already have access through the Firebase credentials.

## Step 5: Grant Permissions to Service Account

Your Firebase service account (`firebase-adminsdk-fbsvc@my-circle-74a81.iam.gserviceaccount.com`) needs:

- Storage Object Viewer (for reading)
- Storage Object Creator (for writing)

Run:

```bash
# Get your service account email
SA_EMAIL="firebase-adminsdk-fbsvc@my-circle-74a81.iam.gserviceaccount.com"

# Grant roles
gcloud projects add-iam-policy-binding my-circle-74a81 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding my-circle-74a81 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectCreator"
```

## Step 6: Verify Setup

Test locally:

```bash
cd backend
npm run dev
```

Then test the upload endpoint (you'll need a valid Firebase token from your mobile app):

```bash
# Get upload URLs
curl -X POST https://mycircle-backend-production.up.railway.app/v1/media/uploads \
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

Expected response (if configured):
```json
{
  "uploads": [
    {
      "uploadToken": "...",
      "uploadUrl": "https://storage.googleapis.com/...",  // Real signed URL
      "storageKey": "uuid.jpg",
      "cdnUrl": "https://storage.googleapis.com/mycircle-media/uuid.jpg",
      "contentType": "image/jpeg"
    }
  ]
}
```

If you see placeholder URLs instead, check:
1. `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
2. Service account has proper GCS permissions
3. Bucket exists and is accessible

## Troubleshooting

### "GCS not configured, using placeholder URLs" in logs

- Check that `GCS_BUCKET_NAME` is set
- Verify `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account JSON
- Ensure service account has Storage Object Creator role

### 403 Forbidden when uploading

- Verify service account has `roles/storage.objectCreator`
- Check bucket CORS configuration
- Ensure signed URL hasn't expired (15 minutes)

### Images not loading in app

- Verify bucket is public or use signed URLs for reads
- Check `cdnUrl` in database has correct format
- Test URL directly in browser

### Testing without full setup

If you just want to test the app flow without setting up GCS:

1. The code will fall back to placeholder URLs
2. Posts will be created with placeholder images
3. Feed will show the placeholder images
4. This works for testing but isn't production-ready
