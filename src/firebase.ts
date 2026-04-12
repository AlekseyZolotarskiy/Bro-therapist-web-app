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
  try {
    const yes = await isSupported();
    if (yes && firebaseConfig.measurementId) {
      console.log("Analytics: Initializing with ID", firebaseConfig.measurementId);
      return getAnalytics(app);
    }
    console.log("Analytics: Not supported or no ID found");
  } catch (e) {
    console.error("Analytics: Initialization failed", e);
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
