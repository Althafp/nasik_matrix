import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "your-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "your-messaging-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "your-app-id"
};

// const firebaseConfig = {
//     apiKey: "AIzaSyAzYyl80SRmDrxYQLxxTz52a0Ued9MRdL0",
//     authDomain: "nasik-5ada8.firebaseapp.com",
//     projectId: "nasik-5ada8",
//     storageBucket: "nasik-5ada8.firebasestorage.app",
//     messagingSenderId: "1049170955138",
//     appId: "1:1049170955138:web:e47b632e69d00e73171d9b",
//     measurementId: "G-64E26ZB868"
//   };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;

