import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Validate required environment variables
// Use VITE_FIREBASE_PROJECT_ID to match your existing .env setup
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const requiredEnvVars = projectId ? [] : ['VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (!projectId) {
  console.error('Missing required environment variable: VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID');
  console.error('Please create a .env file with VITE_FIREBASE_PROJECT_ID=your-project-id');
  console.error('See README_update_surveys.md for instructions.');
  process.exit(1);
}

// Initialize Firebase Admin SDK
// Service account credentials are required
let privateKey = process.env.VITE_FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
let clientEmail = process.env.VITE_FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;

// Strip quotes from email and private key if present (common .env formatting issue)
if (clientEmail) {
  clientEmail = clientEmail.trim().replace(/^["']|["']$/g, '');
}
if (privateKey) {
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '');
}

if (!privateKey || !clientEmail) {
  console.error('\n❌ Missing required service account credentials!');
  console.error('\nPlease add the following to your .env file:');
  console.error('VITE_FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project-id.iam.gserviceaccount.com');
  console.error('VITE_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour private key here\\n-----END PRIVATE KEY-----"');
  console.error('\nTo get these credentials:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Download the JSON file');
  console.error('4. Extract client_email and private_key values');
  console.error('5. Add them to your .env file');
  process.exit(1);
}

// Strip quotes from email if present (common .env issue)
clientEmail = clientEmail.trim().replace(/^["']|["']$/g, '');
// Strip quotes from private key if present
privateKey = privateKey.trim().replace(/^["']|["']$/g, '');

// Validate and process private key
let processedPrivateKey = privateKey.replace(/\\n/g, '\n');
if (!processedPrivateKey.includes('BEGIN PRIVATE KEY') && !processedPrivateKey.includes('BEGIN RSA PRIVATE KEY')) {
  console.error('\n❌ Invalid private key format!');
  console.error('The private key should start with "-----BEGIN PRIVATE KEY-----" or "-----BEGIN RSA PRIVATE KEY-----"');
  console.error('Make sure the private key in .env is properly formatted with \\n for newlines.');
  console.error('\nExample format in .env:');
  console.error('VITE_FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQ...\\n-----END PRIVATE KEY-----"');
  process.exit(1);
}

// Validate email format
if (!clientEmail.includes('@') || !clientEmail.includes('.iam.gserviceaccount.com')) {
  console.warn('\n⚠️  Warning: Client email format may be incorrect.');
  console.warn('Expected format: something@project-id.iam.gserviceaccount.com');
  console.warn(`Got: ${clientEmail}`);
}

// Initialize Firebase Admin SDK
let app;
let db;

try {
  const firebaseConfig = {
    projectId: projectId,
    credential: cert({
      projectId: projectId,
      clientEmail: clientEmail,
      privateKey: processedPrivateKey,
    }),
  };

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  console.log('✓ Using service account credentials');
  console.log(`✓ Project ID: ${projectId}`);
  console.log(`✓ Client Email: ${clientEmail.substring(0, 50)}...`);
  
  // Test connection by trying to list collections
  console.log('\nTesting Firestore connection...');
  try {
    const testRef = db.collection('users').limit(1);
    await testRef.get();
    console.log('✓ Firestore connection successful!\n');
  } catch (testError) {
    console.error('\n❌ Firestore connection test failed!');
    console.error('This indicates an authentication or permissions issue.');
    console.error('\nError details:', testError.message);
    console.error('\nPlease verify:');
    console.error('1. Service account has "Cloud Datastore User" or "Firestore Admin" role');
    console.error('2. Go to: https://console.cloud.google.com/iam-admin/iam?project=' + projectId);
    console.error('3. Find the service account:', clientEmail);
    console.error('4. Ensure it has proper Firestore permissions');
    throw testError;
  }
} catch (error) {
  console.error('\n❌ Error initializing Firebase Admin SDK:');
  console.error(error.message);
  if (error.code === 16 || error.message.includes('UNAUTHENTICATED')) {
    console.error('\n⚠️  Authentication failed. Common issues:');
    console.error('1. Private key format - ensure \\n characters are preserved in .env');
    console.error('2. Service account permissions - needs Firestore access');
    console.error('3. Project ID mismatch - verify VITE_FIREBASE_PROJECT_ID is correct');
    console.error('\nTo fix:');
    console.error('- Regenerate service account key from Firebase Console');
    console.error('- Copy the private_key value exactly (with all \\n)');
    console.error('- Ensure service account has "Cloud Datastore User" role');
  }
  process.exit(1);
}

/**
 * Update surveys in the 'surveys' collection
 * - If PA System is 1, change to 2
 * - If PA System is 2, change to 4
 * - Set all JB fields to "1"
 */
async function updateSurveys() {
  try {
    console.log('Starting survey updates...');
    console.log('Collection: surveys');
    console.log('---\n');
    
    let totalUpdated = 0;
    let paSystemUpdated = 0;
    let jbUpdated = 0;
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users`);
    
    // Iterate through each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const surveysRef = db.collection('users').doc(userId).collection('surveys');
      
      // Get all surveys for this user
      const surveysSnapshot = await surveysRef.get();
      
      if (surveysSnapshot.empty) {
        continue;
      }
      
      console.log(`\nProcessing user ${userId}: ${surveysSnapshot.size} surveys`);
      
      // Process each survey
      for (const surveyDoc of surveysSnapshot.docs) {
        const surveyData = surveyDoc.data();
        const updates = {};
        let needsUpdate = false;
        
        // Update PA System
        if (surveyData.paSystem !== undefined && surveyData.paSystem !== null) {
          const currentPaSystem = Number(surveyData.paSystem);
          if (currentPaSystem === 1) {
            updates.paSystem = 2;
            needsUpdate = true;
            paSystemUpdated++;
            console.log(`  Survey ${surveyDoc.id}: PA System ${currentPaSystem} -> 2`);
          } else if (currentPaSystem === 2) {
            updates.paSystem = 4;
            needsUpdate = true;
            paSystemUpdated++;
            console.log(`  Survey ${surveyDoc.id}: PA System ${currentPaSystem} -> 4`);
          }
        }
        
        // Update JB to "1" (add if missing, update if different)
        if (surveyData.jb === undefined || surveyData.jb === null || surveyData.jb !== "1") {
          updates.jb = "1";
          needsUpdate = true;
          jbUpdated++;
          const currentJb = surveyData.jb !== undefined && surveyData.jb !== null ? surveyData.jb : 'missing';
          console.log(`  Survey ${surveyDoc.id}: JB "${currentJb}" -> "1"`);
        }
        
        // Apply updates if needed
        if (needsUpdate) {
          await surveyDoc.ref.update(updates);
          totalUpdated++;
        }
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Total surveys updated: ${totalUpdated}`);
    console.log(`PA System updates: ${paSystemUpdated}`);
    console.log(`JB updates: ${jbUpdated}`);
    console.log('\nUpdate completed successfully!');
    
  } catch (error) {
    console.error('Error updating surveys:', error);
    throw error;
  }
}

// Run the update
updateSurveys()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
