import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

export type User = {
  id: string;
  phoneNumber: string;
  name?: string;
  role: string;
  createdAt?: any;
  updatedAt?: any;
  lastLogin?: any;
};

// Hash password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Normalize phone number
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // If it doesn't start with +, add +91 for India
  if (!normalized.startsWith('+')) {
    if (normalized.startsWith('91')) {
      normalized = '+' + normalized;
    } else if (normalized.startsWith('0')) {
      normalized = '+91' + normalized.substring(1);
    } else {
      normalized = '+91' + normalized;
    }
  }
  
  return normalized;
}

// Sign in with phone number and password
export async function signIn(phoneNumber: string, password: string): Promise<User | null> {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const hashedPassword = await hashPassword(password);

    // Query users collection for matching phone number
    // Try both normalized format and without country code (for backward compatibility)
    const usersRef = collection(db, 'users');
    
    // First try with normalized phone (with +91)
    let q = query(usersRef, where('phoneNumber', '==', normalizedPhone));
    let querySnapshot = await getDocs(q);

    // If not found and normalized phone starts with +91, try without country code
    if (querySnapshot.empty && normalizedPhone.startsWith('+91')) {
      const phoneWithoutCountryCode = normalizedPhone.substring(3); // Remove +91
      q = query(usersRef, where('phoneNumber', '==', phoneWithoutCountryCode));
      querySnapshot = await getDocs(q);
    }

    // If still not found, try the original input as-is (in case it's stored exactly as entered)
    if (querySnapshot.empty) {
      q = query(usersRef, where('phoneNumber', '==', phoneNumber));
      querySnapshot = await getDocs(q);
    }

    if (querySnapshot.empty) {
      throw new Error('User not found');
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    if (userData.password !== hashedPassword) {
      throw new Error('Invalid password');
    }

    // Update last login
    const userRef = doc(db, 'users', userDoc.id);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Return user data (without password)
    return {
      id: userDoc.id,
      phoneNumber: userData.phoneNumber,
      name: userData.name,
      role: userData.role || 'user',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    return {
      id: userSnap.id,
      phoneNumber: userData.phoneNumber,
      name: userData.name,
      role: userData.role || 'user',
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

