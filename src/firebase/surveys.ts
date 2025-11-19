import {
  collection,
  query,
  getDocs,
  orderBy,
  collectionGroup,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from './config';

export type Survey = {
  id: string;
  policeStation: string;
  rfpNumber: number;
  poleId: number;
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

