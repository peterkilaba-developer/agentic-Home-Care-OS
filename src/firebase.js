import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDxYtMR6pGB7_CXs6YLsKR7AU9gjulWUU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "home-care-agent-os.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "home-care-agent-os",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "home-care-agent-os.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "911680177894",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:911680177894:web:b88e9c803d9355275e9d27",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-F8KVW1NPRQ"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore with Multiple Tab Persistence support
// We use a singleton pattern to prevent "Unexpected state" assertion failures during HMR
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  // If already initialized, get the existing instance
  // Note: settings cannot be changed after initialization
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

// Initialize Auth
export const auth = getAuth(app);

// Initialize Functions
export const functions = getFunctions(app);
