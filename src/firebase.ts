import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Analytics lazily (only if supported and ID exists)
export const analyticsPromise = isSupported().then(yes => {
  if (yes && firebaseConfig.measurementId) {
    console.log("Analytics initialized with ID:", firebaseConfig.measurementId);
    return getAnalytics(app);
  }
  console.warn("Analytics not initialized: supported =", yes, "ID =", firebaseConfig.measurementId);
  return null;
});

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
