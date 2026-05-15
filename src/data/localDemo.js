export const LOCAL_DEMO_FLAG = 'homecare_local_demo_enabled';
export const LOCAL_DEMO_STATE = 'homecare_local_demo_state';

export const DEMO_USER = {
  uid: 'demo_provider_001',
  email: 'demo.provider@agentic.local',
  displayName: 'Demo Provider',
};

const demoBusiness = {
  id: 'demo_business_001',
  ownerUid: DEMO_USER.uid,
  businessName: 'Evergreen Demo Care Group',
  businessEmail: 'demo.provider@agentic.local',
  businessPhone: '555-0100',
  careType: 'Assisted Living Home < 10 Beds',
};

const demoHome = {
  id: 'demo_home_001',
  ownerId: DEMO_USER.uid,
  businessId: demoBusiness.id,
  homeName: 'Evergreen Demo Home',
  address: '1200 Demo Lane, Des Moines, IA 50309',
  licenseNumber: 'IA-DEMO-1024',
  careType: 'Assisted Living Home < 10 Beds',
  capacity: 6,
  occupied: 2,
  vacancies: 4,
  publicEmail: 'admissions@evergreen-demo.local',
  phone: '555-0101',
  description: 'A local demo facility for exploring provider workflows.',
  subscriptionStatus: 'trial',
  complianceStatus: 'Verified',
  staffList: [],
};

export function isLocalDemoEnabled() {
  if (typeof window === 'undefined') return false;
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalHost && localStorage.getItem(LOCAL_DEMO_FLAG) === 'true';
}

export function createDefaultDemoState() {
  return {
    user: DEMO_USER,
    businessData: demoBusiness,
    homeData: demoHome,
    myHomes: [demoHome],
    residents: [
      {
        id: 'demo_resident_001',
        homeId: demoHome.id,
        name: 'Demo Resident One',
        room: 'Suite 1',
        careLevel: 'Medium (ADL Level 2)',
        status: 'Stable',
      },
      {
        id: 'demo_resident_002',
        homeId: demoHome.id,
        name: 'Demo Resident Two',
        room: 'Suite 2',
        careLevel: 'Light',
        status: 'Stable',
      },
    ],
    pipeline: [],
    logs: [],
  };
}

export function readLocalDemoState() {
  if (typeof window === 'undefined') return createDefaultDemoState();
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_DEMO_STATE) || 'null');
    const fallback = createDefaultDemoState();
    if (!stored) return fallback;
    return {
      ...fallback,
      ...stored,
      businessData: { ...fallback.businessData, ...stored.businessData },
      homeData: { ...fallback.homeData, ...stored.homeData },
      myHomes: stored.myHomes?.length ? stored.myHomes : [stored.homeData || fallback.homeData],
      residents: stored.residents || fallback.residents,
      pipeline: stored.pipeline || fallback.pipeline,
      logs: stored.logs || fallback.logs,
    };
  } catch {
    return createDefaultDemoState();
  }
}

export function writeLocalDemoState(nextState) {
  if (typeof window === 'undefined') return;
  const current = readLocalDemoState();
  const merged = {
    ...current,
    ...nextState,
    businessData: { ...current.businessData, ...nextState.businessData },
    homeData: { ...current.homeData, ...nextState.homeData },
  };
  merged.myHomes = [merged.homeData];
  localStorage.setItem(LOCAL_DEMO_STATE, JSON.stringify(merged));
}

export function enableLocalDemo() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_DEMO_FLAG, 'true');
  localStorage.setItem('provider_state', 'ia');
  if (!localStorage.getItem(LOCAL_DEMO_STATE)) {
    localStorage.setItem(LOCAL_DEMO_STATE, JSON.stringify(createDefaultDemoState()));
  }
}
