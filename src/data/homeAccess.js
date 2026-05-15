import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';

async function readHome(homeId) {
  if (!homeId) return null;
  const snap = await getDoc(doc(db, 'homes', homeId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function resolveProviderHome(uid, userData = null) {
  if (!uid) return { userData: userData || {}, home: null, homeId: null };

  let profile = userData;
  if (!profile) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    profile = userSnap.exists() ? userSnap.data() : {};
  }

  const directHomeIds = [
    profile.activeHomeId,
    profile.homeId,
    uid,
  ].filter(Boolean);

  for (const homeId of directHomeIds) {
    const home = await readHome(homeId);
    if (home) return { userData: profile, home, homeId: home.id };
  }

  // 1. Try ownerId check (most common for direct owners)
  const ownedHomes = await getDocs(query(collection(db, 'homes'), where('ownerId', '==', uid), limit(1)));
  if (!ownedHomes.empty) {
    const snap = ownedHomes.docs[0];
    return { userData: profile, home: { id: snap.id, ...snap.data() }, homeId: snap.id };
  }

  // 2. Try businessId check (multi-site owners)
  if (profile.businessId) {
    const businessHomes = await getDocs(query(collection(db, 'homes'), where('businessId', '==', profile.businessId), limit(1)));
    if (!businessHomes.empty) {
      const snap = businessHomes.docs[0];
      return { userData: profile, home: { id: snap.id, ...snap.data() }, homeId: snap.id };
    }
  }

  // 3. Last resort: check if businessId matches UID (fallback for some registration paths)
  const bizFallback = await getDocs(query(collection(db, 'homes'), where('businessId', '==', uid), limit(1)));
  if (!bizFallback.empty) {
    const snap = bizFallback.docs[0];
    return { userData: profile, home: { id: snap.id, ...snap.data() }, homeId: snap.id };
  }

  return { userData: profile, home: null, homeId: null };
}

export async function providerHasHome(uid, userData = null) {
  const context = await resolveProviderHome(uid, userData);
  return Boolean(context.homeId);
}
