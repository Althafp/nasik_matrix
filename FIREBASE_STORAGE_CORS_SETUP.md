# Firebase Storage CORS Configuration

To enable image embedding in Excel, you need to configure CORS for your Firebase Storage bucket.

## Option 1: Configure CORS via Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `nasik-5ada8`
3. Go to **Storage** > **Rules**
4. Make sure your storage rules allow read access:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true; // Allow public read access
      allow write: if request.auth != null; // Only authenticated users can write
    }
  }
}
```

5. Go to **Storage** > **Settings** > **CORS Configuration**
6. Add CORS configuration:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

Or for specific origins:

```json
[
  {
    "origin": ["http://localhost:5173", "https://yourdomain.com"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

## Option 2: Configure CORS via gsutil (Command Line)

1. Create a file `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600
  }
]
```

2. Run this command:

```bash
gsutil cors set cors.json gs://nasik-5ada8.firebasestorage.app
```

## Note

After configuring CORS, the Excel export should be able to download and embed images directly in the Excel file. Without CORS configuration, images will appear as clickable URLs instead of embedded images.

