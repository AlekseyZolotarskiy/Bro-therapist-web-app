import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Analytics lazily (only if supported and ID exists)
export const analyticsPromise = (async () => {
  if (typeof window === 'undefined') return null;
  try {
    const yes = await isSupported().catch(() => false);
    if (yes && firebaseConfig.measurementId) {
      console.log("Analytics: Initializing with ID", firebaseConfig.measurementId);
      return getAnalytics(app);
    }
  } catch (e) {
    console.warn("Analytics: Initialization skipped", e);
  }
  return null;
})();

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
