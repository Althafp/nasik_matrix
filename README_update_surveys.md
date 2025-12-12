# Survey Update Script

This script updates surveys in the `surveys` collection with the following changes:

1. **PA System Updates** (in TYPE OF CAMERAS section):
   - If PA System is `1`, change it to `2`
   - If PA System is `2`, change it to `4`

2. **JB Updates** (in INFRASTRUCTURE DETAILS section):
   - Set all JB fields to `"1"`
   - If JB field doesn't exist, it will be added and set to `"1"`

## Prerequisites

1. Install Firebase Admin SDK:
   ```bash
   npm install firebase-admin
   ```

2. Install dotenv (already installed):
   ```bash
   npm install dotenv
   ```

## Setup

### Option 1: Using Service Account (Recommended)

1. Create a `.env` file in the project root with the following variables:
   ```
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project-id.iam.gserviceaccount.com
   VITE_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
   ```
   
   **Note**: The script also supports non-prefixed versions (FIREBASE_PROJECT_ID, etc.) if you prefer.

2. To get service account credentials:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file
   - Extract the values and add them to your `.env` file
   - **Important**: Keep the private key in quotes and preserve the `\n` characters

### Option 2: Using Application Default Credentials

1. Install Google Cloud SDK and authenticate:
   ```bash
   gcloud auth application-default login
   ```

2. Create a `.env` file with only:
   ```
   VITE_FIREBASE_PROJECT_ID=your-project-id
   ```
   
   **Note**: The script also supports FIREBASE_PROJECT_ID if you prefer.

## Running the Script

```bash
node updateSurveys.js
```

The script will:
- Connect to Firebase using your credentials
- Iterate through all users and their surveys
- Update PA System values (1→2, 2→4)
- Set all JB fields to "1"
- Display a summary of all updates

## Output

The script will show:
- Number of users processed
- Number of surveys per user
- Individual updates made
- Summary of total updates

Example output:
```
Starting survey updates...
Collection: surveys
---
Found 5 users

Processing user user123: 10 surveys
  Survey abc123: PA System 1 -> 2
  Survey def456: JB "2" -> "1"
  ...

=== Update Summary ===
Total surveys updated: 15
PA System updates: 8
JB updates: 12

Update completed successfully!
```

## Security Notes

- **Never commit your `.env` file to git**
- Keep your service account private key secure
- The `.env` file should be in `.gitignore`

## Troubleshooting

1. **"Missing required environment variables"**
   - Make sure your `.env` file exists in the project root
   - Check that all required variables are set

2. **"Permission denied"**
   - Ensure your service account has Firestore read/write permissions
   - Check Firebase security rules

3. **"Module not found: firebase-admin"**
   - Run `npm install firebase-admin`
