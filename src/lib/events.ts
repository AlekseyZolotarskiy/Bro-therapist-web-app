import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

export type AppEvent = 
  | 'login'
  | 'goal_created' 
  | 'promise_created'
  | 'goal_completed' 
  | 'journal_saved' 
  | 'chat_started' 
  | 'chat_milestone'
  | 'language_switched';

export async function logAppEvent(event: AppEvent, metadata: any = {}, isKey: boolean = false) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await addDoc(collection(db, `users/${user.uid}/events`), {
      event,
      metadata,
      isKey,
      timestamp: serverTimestamp(),
      path: window.location.pathname,
    });
  } catch (error) {
    console.error('Error logging event:', error);
  }
}
