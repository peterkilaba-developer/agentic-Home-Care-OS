import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function recordImpersonationEvent({ actorUid, actorEmail, targetUid, source }) {
  if (!actorUid || !targetUid) return null;
  try {
    return await addDoc(collection(db, 'impersonation_events'), {
      actorUid,
      actorEmail: actorEmail || null,
      targetUid,
      source: source || 'unknown',
      startedAt: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    });
  } catch (err) {
    console.error('[audit] Failed to record impersonation event:', err);
    return null;
  }
}
