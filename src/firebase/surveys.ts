import {
  collection,
  query,
  getDocs,
  orderBy,
  collectionGroup,
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  addDoc,
  Timestamp
} from 'firebase/firestore';
import { db, storage } from './config';
import { ref, deleteObject } from 'firebase/storage';

export type Survey = {
  id: string;
  policeStation: string;
  rfpNumber: number;
  poleId: string;
  locationName: string;
  locationCategories: string[];
  powerSubstation?: string;
  nearestLandmark?: string;
  latitude?: number;
  longitude?: number;
  powerSourceAvailability?: boolean | null;
  cableTrenching?: number;
  roadType?: string;
  noOfRoads?: number;
  poleSize?: string;
  cantileverType?: string;
  existingCctvPole?: boolean | null;
  distanceFromExistingPole?: number;
  jb?: string;
  noOfCameras?: number;
  noOfPoles?: number;
  powerCable?: number;
  cat6Cable?: number;
  irCable?: number;
  hdpPowerTrenching?: number;
  roadCrossingLength?: number;
  fixedBoxCamera?: number;
  ptz?: number;
  anprCamera?: number;
  totalCameras?: number;
  paSystem?: number;
  crowdSafetyOptions?: string[];
  investigationOptions?: string[];
  publicOrderOptions?: string[];
  trafficOptions?: string[];
  safetyOptions?: string[];
  anpr?: boolean | null;
  frs?: boolean | null;
  remarks?: string;
  parentPoleId?: string;
  parentPoleDistance?: number;
  parentPoleRoadCrossing?: number;
  parentPoleRoadType?: string;
  imageUrls?: string[];
  userId: string;
  userPhone?: string;
  userName?: string;
  createdAt?: any;
  updatedAt?: any;
};

// Get all surveys for a specific user
export async function getUserSurveys(userId: string): Promise<Survey[]> {
  try {
    const surveysRef = collection(db, 'users', userId, 'surveys');
    const q = query(surveysRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Survey));
  } catch (error) {
    console.error('Error fetching user surveys:', error);
    return [];
  }
}

// Get all surveys (admin only - collection group query)
export async function getAllSurveys(): Promise<Survey[]> {
  try {
    const surveysRef = collectionGroup(db, 'surveys');
    const q = query(surveysRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Survey));
  } catch (error) {
    console.error('Error fetching all surveys:', error);
    return [];
  }
}

// Get a single survey by ID
export async function getSurveyById(userId: string, surveyId: string): Promise<Survey | null> {
  try {
    const surveyRef = doc(db, 'users', userId, 'surveys', surveyId);
    const surveySnap = await getDoc(surveyRef);

    if (!surveySnap.exists()) {
      return null;
    }

    return {
      id: surveySnap.id,
      ...surveySnap.data()
    } as Survey;
  } catch (error) {
    console.error('Error fetching survey:', error);
    return null;
  }
}

// Helper function to remove undefined values from an object
function removeUndefined(obj: any): any {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}

// Create a new survey
export async function createSurvey(userId: string, surveyData: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const surveysRef = collection(db, 'users', userId, 'surveys');
    // Remove undefined values before saving to Firestore
    const cleanedData = removeUndefined({
      ...surveyData,
      userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    const docRef = await addDoc(surveysRef, cleanedData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating survey:', error);
    throw error;
  }
}

// Update a survey
export async function updateSurvey(
  userId: string,
  surveyId: string,
  updates: Partial<Survey>
): Promise<void> {
  try {
    const surveyRef = doc(db, 'users', userId, 'surveys', surveyId);
    await updateDoc(surveyRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating survey:', error);
    throw error;
  }
}

// Delete a survey
export async function deleteSurvey(userId: string, surveyId: string): Promise<void> {
  try {
    const surveyRef = doc(db, 'users', userId, 'surveys', surveyId);
    const surveySnap = await getDoc(surveyRef);
    
    if (surveySnap.exists()) {
      const surveyData = surveySnap.data() as Survey;
      
      // Delete associated images from storage if they exist
      if (surveyData.imageUrls && surveyData.imageUrls.length > 0) {
        const deletePromises = surveyData.imageUrls.map(async (url) => {
          try {
            // Extract the path from the URL
            // Firebase Storage URLs typically have the format:
            // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
            const urlObj = new URL(url);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
            if (pathMatch) {
              const decodedPath = decodeURIComponent(pathMatch[1]);
              const imageRef = ref(storage, decodedPath);
              await deleteObject(imageRef);
            }
          } catch (error) {
            // If image deletion fails, log but don't fail the entire operation
            console.warn('Failed to delete image:', url, error);
          }
        });
        
        await Promise.allSettled(deletePromises);
      }
      
      // Delete the survey document
      await deleteDoc(surveyRef);
    }
  } catch (error) {
    console.error('Error deleting survey:', error);
    throw error;
  }
}

