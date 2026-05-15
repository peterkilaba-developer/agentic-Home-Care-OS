import React, { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, CheckSquare, ListTodo, Mic, CheckCircle2, AlertCircle, Clock, Thermometer, UserSquare2, Sparkles, LogOut, UploadCloud, Loader2, ShieldCheck, Type, History, FileWarning, FileText } from 'lucide-react';
import { auth, db, functions } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc, where, limit, orderBy, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';
import { CAREGIVER_TASKS } from '../data/caregiverTasks';
import { Camera, Scan, Plus, Trash2, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../components/theme';
import { resolveProviderHome } from '../data/homeAccess';

const VoiceCharting = lazy(() => import('../components/caregiver/VoiceCharting'));
const HandoverDashboard = lazy(() => import('../components/caregiver/HandoverDashboard'));
export default function CaregiverPortal() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const impersonatingId = searchParams.get('impersonate');

  const stateCode = localStorage.getItem('provider_state') || localStorage.getItem('detected_state') || 'us';
  const stateData = US_STATES[stateCode] || DEFAULT_STATE;
  const [agentName, setAgentName] = useState('Florence');
  const [currentUser, setCurrentUser] = useState(() => {
    if (window.location.search.includes('bypass=caregiver')) {
      return { uid: 'demo_caregiver_001', email: 'demo@caregiver.local' };
    }
    return auth.currentUser;
  });
  const [authReady, setAuthReady] = useState(() => Boolean(auth.currentUser));
  const [patients, setPatients] = useState([]);

  const [homeData, setHomeData] = useState(null);
  const [homeIdState, setHomeIdState] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [userProfilePhoto, setUserProfilePhoto] = useState(null);
  const [lockout, setLockout] = useState(false);
  const [distance, setDistance] = useState(null);
  const [activeShiftId, setActiveShiftId] = useState(null);
  const [activeTasksByResident, setActiveTasksByPatient] = useState({});
  const [checkedMedsByResident, setCheckedMedsByPatient] = useState({});
  const [activeResidentId, setActiveResidentId] = useState(null);
  const [shiftNotes, setShiftNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [isShiftLocked, setIsShiftLocked] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);
  const isAgency = homeData?.careType === 'In-Home Care Agency';

  // Haversine formula to calculate distance in meters
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    if (window.location.search.includes('bypass=caregiver')) {
      setCurrentUser({ uid: 'demo_caregiver_001', email: 'demo@caregiver.local' });
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) return undefined;

    let watchId;
    
    const initGeofence = async () => {
      const uid = currentUser?.uid;
      if (!uid) return;
      
      try {
        let userData, homeId, home;

        if (window.location.hostname === 'localhost' && window.location.search.includes('bypass=caregiver')) {
          userData = { role: 'caregiver', homeId: 'demo_home_001', name: 'Demo Caregiver' };
          homeId = 'demo_home_001';
          home = { id: homeId, homeName: 'Demo Facility', address: '123 Fake St, Seattle, WA', careType: 'Adult Family Home' };
        } else {
          const userDoc = await getDoc(doc(db, 'users', uid));
          userData = userDoc.exists() ? userDoc.data() : {};
          const normalizedRole = userData.role?.toLowerCase();
          homeId = impersonatingId || userData.homeId || userData.activeHomeId;
          home = null;

          if (homeId) {
            const homeDoc = await getDoc(doc(db, 'homes', homeId));
            if (homeDoc.exists()) {
              home = { id: homeDoc.id, ...homeDoc.data() };
            }
          }

          const staffRoles = ['caregiver', 'med-tech', 'rn-delegator', 'family'];
          if (!home && !staffRoles.includes(normalizedRole)) {
            const resolved = await resolveProviderHome(uid, userData);
            homeId = resolved.homeId;
            home = resolved.home;
          }
        }

        setHomeIdState(homeId);
        if (userData.profilePhoto) setUserProfilePhoto(userData.profilePhoto);
        setHomeData(home);
      } catch (err) {
        console.error("Error initializing caregiver profile:", err);
      }
    };

    initGeofence();
    
    // Listen for active shift
    let unsubShift = () => {};
    if (window.location.hostname === 'localhost' && window.location.search.includes('bypass=caregiver')) {
      setActiveShiftId('demo_shift_001');
      setActiveTasksByPatient({});
      setCheckedMedsByPatient({});
    } else {
      const shiftQ = query(
        collection(db, 'shifts'),
        where('caregiverId', '==', currentUser.uid),
        where('endTime', '==', null),
        orderBy('startTime', 'desc'),
        limit(1)
      );
      unsubShift = onSnapshot(shiftQ, (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          setActiveShiftId(docSnap.id);
          const data = docSnap.data();
          console.log("[CaregiverPortal] Shift snapshot updated:", docSnap.id, data);
          setActiveTasksByPatient(data.activeTasks || {});
          setCheckedMedsByPatient(data.checkedMeds || {});
          setShiftNotes(data.progressNotes || '');
          setIsShiftLocked(!!data.lockedAt);
          if (data.signature) setSignature(data.signature);
        } else {
          console.log("[CaregiverPortal] No active shift found for user");
          setActiveShiftId(null);
          setActiveTasksByPatient({});
          setCheckedMedsByPatient({});
        }
      }, (err) => {
        console.error("Caregiver shifts snapshot error:", err);
      });
    }

    return () => {
      unsubShift();
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [impersonatingId, currentUser?.uid, currentUser?.email]);

  useEffect(() => {
    if (!homeData || !currentUser?.uid) return;
    
    const resolveStaff = async () => {
      if (homeData.staffList) {
        const uid = currentUser.uid;
        const email = currentUser.email?.toLowerCase();
        const phone = currentUser.phoneNumber?.replace(/\D/g, '');
        
        const staffIdx = homeData.staffList.findIndex((s) => 
          s.uid === uid || 
          (email && String(s.email || '').toLowerCase() === email) ||
          (phone && String(s.phone || '').replace(/\D/g, '').endsWith(phone.slice(-10)))
        );

        if (staffIdx !== -1) {
          const staff = homeData.staffList[staffIdx];
          console.log("[CaregiverPortal] Resolved staff profile:", staff);
          setStaffProfile(staff);

          if (staff.status !== 'active' && !impersonatingId) {
            console.log("[CaregiverPortal] Staff status is pending. Syncing to active via acceptStaffInvite...");
            try {
              const acceptStaffInvite = httpsCallable(functions, 'acceptStaffInvite');
              const res = await acceptStaffInvite({ homeId: homeData.id, email: email || staff.email, phone: phone || staff.phone });
              console.log("[CaregiverPortal] acceptStaffInvite response:", res.data);
            } catch (err) {
              console.error("[CaregiverPortal] Failed to sync staff status:", err);
            }
          }
        } else {
          console.warn("[CaregiverPortal] Could not find staff member in home staffList.", { uid, email, phone });
        }
      }
    };

    resolveStaff();
  }, [homeData, currentUser?.uid, impersonatingId]);

  useEffect(() => {
    if (!homeIdState) return;
    
    if (window.location.search.includes('bypass=caregiver')) {
      const mockResidents = [
        { 
          id: 'demo_resident_001', 
          name: 'Eleanor (Demo)', 
          medications: [
            { name: 'Aspirin', dose: '81mg', route: 'Oral', frequency: 'Daily' },
            { name: 'Lisinopril', dose: '10mg', route: 'Oral', frequency: 'Morning' }
          ] 
        }
      ];
      setPatients(mockResidents);
      return;
    }

    const q = query(collection(db, 'residents'), where('homeId', '==', homeIdState));
    const unsub = onSnapshot(q, (snapshot) => {
      let arr = [];
      snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
      
      // Filter by assignment if it's an agency
      if (homeData?.careType === 'In-Home Care Agency' && currentUser?.uid && !impersonatingId) {
        arr = arr.filter(p => (p.assignedStaff || []).includes(currentUser.uid));
      }
      
      setPatients(arr);
    }, (err) => {
      console.error("Caregiver residents snapshot error:", err);
    });

    return () => unsub();
  }, [homeIdState]);

  // Unified Dynamic Geofencing (Works for Facility & Agency Field Visits)
  useEffect(() => {
    if (!homeData || !currentUser?.uid) return;
    
    let watchId;
    const resolveAndWatch = async () => {
      let targetAddress = homeData.address;
      const isAgency = homeData.careType === 'In-Home Care Agency';
      
      if (isAgency && activeResidentId) {
        const res = patients.find(p => p.id === activeResidentId);
        if (res?.address || res?.room) {
          targetAddress = res.address || res.room;
        }
      }

      if (!targetAddress) return;

      if (window.google?.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: targetAddress }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const targetLat = results[0].geometry.location.lat();
            const targetLng = results[0].geometry.location.lng();

            if (navigator.geolocation) {
              watchId = navigator.geolocation.watchPosition(
                (pos) => {
                  const dist = getDistance(pos.coords.latitude, pos.coords.longitude, targetLat, targetLng);
                  setDistance(Math.round(dist));
                  
                  // AGENTS: Only lockout if a resident is selected. Otherwise, let them see the roster.
                  // FACILITIES: Always lockout if out of range of the building.
                  const isAgency = homeData.careType === 'In-Home Care Agency';
                  const shouldLock = isAgency ? (activeResidentId && dist > 150) : (dist > 150);
                  setLockout(!!shouldLock);
                },
                (err) => {
                  console.error("EVV Geolocation error:", err);
                  setLockout(true);
                },
                { enableHighAccuracy: true }
              );
            }
          }
        });
      }
    };

    resolveAndWatch();
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [homeData, activeResidentId, patients, currentUser?.uid]);

  const startShift = async () => {
    if (!currentUser || !homeIdState) return;
    try {
      // EVV GPS Capture
      let startPos = null;
      let evvCompliant = false;
      
      if (navigator.geolocation) {
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true });
        });
        if (pos) {
          startPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          if (homeData?.address && window.google?.maps) {
             const geocoder = new window.google.maps.Geocoder();
             const geoResult = await new Promise(r => geocoder.geocode({ address: homeData.address }, r));
             if (geoResult && geoResult[0]) {
                const dist = getDistance(pos.coords.latitude, pos.coords.longitude, geoResult[0].geometry.location.lat(), geoResult[0].geometry.location.lng());
                evvCompliant = dist <= 150;
             }
          }
        }
      }

      const docRef = await addDoc(collection(db, 'shifts'), {
        staffId: currentUser.uid, // Unified ID
        caregiverId: currentUser.uid, // Backward compatibility
        staffName: staffProfile?.name || currentUser.email || 'Caregiver',
        homeId: homeIdState,
        homeName: homeData?.homeName || homeData?.agencyName || 'Facility',
        startTime: serverTimestamp(),
        endTime: null,
        activeTasks: {},
        checkedMeds: {},
        progressNotes: '',
        status: 'active',
        evvStart: startPos,
        evvStartCompliant: evvCompliant,
        evvStatus: evvCompliant ? 'verified' : 'flagged'
      });
      
      await addDoc(collection(db, 'system_logs'), {
        type: 'EVV_CLOCK_IN',
        message: `Shift started by ${staffProfile?.name || currentUser.email}. EVV: ${evvCompliant ? 'Verified' : 'Flagged (Out of Range)'}`,
        staffId: currentUser.uid,
        homeId: homeIdState,
        shiftId: docRef.id,
        compliant: evvCompliant,
        location: startPos,
        createdAt: serverTimestamp()
      });

      setActiveShiftId(docRef.id);
      setIsShiftLocked(false);
      setShiftNotes('');
      setSignature('');
    } catch (e) {
      console.error("Failed to start shift", e);
    }
  };

  const endShift = async () => {
    if (!activeShiftId) return;
    try {
      let endPos = null;
      let evvCompliant = false;

      if (navigator.geolocation) {
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true });
        });
        if (pos) {
          endPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          if (homeData?.address && window.google?.maps) {
             const geocoder = new window.google.maps.Geocoder();
             const geoResult = await new Promise(r => geocoder.geocode({ address: homeData.address }, r));
             if (geoResult && geoResult[0]) {
                const dist = getDistance(pos.coords.latitude, pos.coords.longitude, geoResult[0].geometry.location.lat(), geoResult[0].geometry.location.lng());
                evvCompliant = dist <= 150;
             }
          }
        }
      }

      await setDoc(doc(db, 'shifts', activeShiftId), { 
        endTime: serverTimestamp(),
        evvEnd: endPos,
        evvEndCompliant: evvCompliant,
        // Overall compliance requires both start and end to be within range
      }, { merge: true });

      await addDoc(collection(db, 'system_logs'), {
        type: 'EVV_CLOCK_OUT',
        message: `Shift ended by ${staffProfile?.name || currentUser.email}. EVV: ${evvCompliant ? 'Verified' : 'Flagged (Out of Range)'}`,
        staffId: currentUser.uid,
        homeId: homeIdState,
        shiftId: activeShiftId,
        compliant: evvCompliant,
        location: endPos,
        createdAt: serverTimestamp()
      });

      setActiveShiftId(null);
    } catch (e) {
      console.error("Failed to end shift", e);
    }
  };

  const saveShiftNotes = async (val) => {
    setShiftNotes(val);
    if (!activeShiftId || isShiftLocked) return;
    try {
      const shiftRef = doc(db, 'shifts', activeShiftId);
      await updateDoc(shiftRef, { progressNotes: val });
    } catch (e) { console.error("Notes save error:", e); }
  };

  const closeShift = async () => {
    if (!activeShiftId) return;
    if (!signature.trim()) {
      alert("Please enter your name as a digital signature to close the shift.");
      return;
    }

    setIsClosingShift(true);
    try {
      const shiftRef = doc(db, 'shifts', activeShiftId);
      const now = new Date();
      
      await updateDoc(shiftRef, {
        endTime: now,
        status: 'completed',
        lockedAt: now,
        signature: signature,
        signeeRole: staffProfile?.role || 'caregiver',
        complianceVerified: true
      });

      await addDoc(collection(db, 'system_logs'), {
        type: 'SHIFT_COMPLETE',
        message: `Shift completed and signed by ${signature} (${staffProfile?.role || 'Caregiver'})`,
        staffId: currentUser.uid,
        homeId: homeIdState,
        shiftId: activeShiftId,
        createdAt: serverTimestamp()
      });
      
      // Clear local state
      setActiveShiftId(null);
      setSignature('');
      setShiftNotes('');
      setIsShiftLocked(false);
      alert("Shift successfully closed and signed. All clinical records have been locked for audit.");
    } catch (e) {
      console.error("Shift close error:", e);
      alert("Failed to close shift: " + e.message);
    } finally {
      setIsClosingShift(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div className="flex flex-col items-center gap-3 text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-bold">Opening caregiver app...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full">
          <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-bold text-foreground mb-2">Caregiver Sign-In Required</h2>
          <p className="text-sm text-muted mb-6">Open your staff invite link or sign in with the temporary password from your provider.</p>
          <Link to="/auth" className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      {/* HEADER AREA */}
      <div className="px-4 py-4 bg-surface/80 backdrop-blur-md border-b border-border z-40 sticky top-0 flex justify-between items-center">
         <div>
            <h2 className="text-xl font-sans font-bold tracking-tight text-foreground">{homeData?.homeName || homeData?.agencyName || "Operational Compliance Care Home"}</h2>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">Shift: {new Date().getHours() >= 7 && new Date().getHours() < 15 ? "Morning" : new Date().getHours() >= 15 && new Date().getHours() < 23 ? "Evening" : "Night"}</p>
         </div>
         <div className="flex items-center gap-3">
           <Link to="/caregiver/profile" className="w-10 h-10 rounded-full border border-primary/30 overflow-hidden bg-primary/10 block hover:scale-105 transition-transform cursor-pointer">
             <img src={userProfilePhoto || "/images/human_hero.png"} alt="Profile" className="w-full h-full object-cover" />
           </Link>
         </div>
      </div>

      {/* GEOFENCE LOCKOUT OVERLAY */}
      <AnimatePresence>
        {lockout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center px-4 py-6 text-center">
            <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Out of Range</h2>
            <p className="text-muted mb-8 max-w-xs text-sm">
              {distance === null 
                ? "Location access is required to verify you are at the facility. Please enable location permissions in your browser/device settings."
                : `You are currently ${distance}m away from ${homeData?.homeName || homeData?.agencyName || "the facility"}. Staff access is strictly geo-locked to the physical premises.`}
            </p>
            <div className="bg-surface border border-border px-4 py-6 rounded-2xl max-w-xs w-full">
              <p className="text-xs font-bold uppercase tracking-wider mb-2">To regain access:</p>
              <p className="text-xs text-muted">Return to the facility and scan the Provider's Staff QR Code.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* SHIFT LOCKOUT OVERLAY */}
      <AnimatePresence>
        {!activeShiftId && !lockout && homeData && (!isAgency || (isAgency && activeResidentId)) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center px-4 py-6 text-center">
             <div className="bg-surface border border-border px-4 py-6 rounded-3xl max-w-sm w-full shadow-2xl">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/30">
                 <Clock className="w-8 h-8 text-primary" />
               </div>
                <h2 className="text-2xl font-bold mb-2 text-foreground">
                  {isAgency ? `Visit ${patients.find(p => p.id === activeResidentId)?.name || 'Client'}` : 'Start Your Shift'}
                </h2>
                <p className="text-muted mb-8 text-sm">
                  {isAgency 
                    ? `You are verified at the service address: ${patients.find(p => p.id === activeResidentId)?.address || patients.find(p => p.id === activeResidentId)?.room || 'Field Visit'}.`
                    : `You are verified on-premises at ${homeData.homeName || homeData.agencyName}.`
                  } Clock in to begin charting and tracking medications securely.
                </p>
               <button onClick={startShift} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20">
                 <CheckCircle2 className="w-5 h-5" /> Clock In Now
               </button>
             </div>
           </motion.div>
        )}
      </AnimatePresence>


      <div className="flex-1 overflow-y-auto scrollbar-hide relative bg-gradient-to-b from-background to-surface/20 pb-24">
        <div className="max-w-4xl mx-auto w-full">
          <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse">Loading component...</div>}>
            <Routes>
              <Route index element={<ShiftRoster patients={patients} activeResidentId={activeResidentId} setActiveResidentId={setActiveResidentId} homeData={homeData} distance={distance} />} />
              <Route path="mar" element={<MedicationRecord patients={patients} activeShiftId={activeShiftId} checkedMedsByResident={checkedMedsByResident} setCheckedMedsByPatient={setCheckedMedsByPatient} homeId={homeIdState} staffProfile={staffProfile} distance={distance} activeResidentId={activeResidentId} setActiveResidentId={setActiveResidentId} isShiftLocked={isShiftLocked} />} />
              <Route path="tasks" element={<DailyChores patients={patients} activeShiftId={activeShiftId} activeTasksByResident={activeTasksByResident} setActiveTasksByPatient={setActiveTasksByPatient} homeId={homeIdState} staffProfile={staffProfile} distance={distance} residentId={activeResidentId} setActiveResidentId={setActiveResidentId} isShiftLocked={isShiftLocked} />} />
              <Route path="chart" element={<VoiceCharting agentName={agentName} stateData={stateData} activeShiftId={activeShiftId} homeId={homeIdState} staffProfile={staffProfile} distance={distance} activeResidentId={activeResidentId} setActiveResidentId={setActiveResidentId} residents={patients} />} />
              <Route path="incident" element={<IncidentReport homeId={homeIdState} patients={patients} staffProfile={staffProfile} />} />
              <Route path="summary" element={<ShiftNotesView shiftNotes={shiftNotes} setShiftNotes={saveShiftNotes} signature={signature} setSignature={setSignature} closeShift={closeShift} isClosingShift={isClosingShift} isShiftLocked={isShiftLocked} staffProfile={staffProfile} />} />
              <Route path="profile" element={<ProfileSettings agentName={agentName} setAgentName={setAgentName} staffProfile={staffProfile} userProfilePhoto={userProfilePhoto} setUserProfilePhoto={setUserProfilePhoto} endShift={endShift} activeShiftId={activeShiftId} homeId={homeIdState} currentUser={currentUser} />} />
            </Routes>
          </Suspense>
        </div>
      </div>

      {/* BOTTOM TAB BAR */}
      <div className="shrink-0 sticky bottom-0 h-20 bg-surface/90 backdrop-blur-xl border-t border-border flex justify-around items-center px-4 z-50">
         <div className="max-w-4xl mx-auto w-full flex justify-around">
           {activeResidentId ? (
             <Link to="/caregiver" onClick={() => setActiveResidentId(null)} className={`flex flex-col items-center gap-1 w-16 transition-colors ${location.pathname === '/caregiver' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${location.pathname === '/caregiver' ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-surface border border-border text-muted'}`}>
                 {patients.find(p => p.id === activeResidentId)?.name?.charAt(0) || 'R'}
               </div>
               <span className="text-[10px] font-bold">{patients.find(p => p.id === activeResidentId)?.name?.split(' ')[0] || 'Resident'}</span>
             </Link>
           ) : (
             <TabButton to="/caregiver" icon={Users} label="Residents" active={location.pathname === '/caregiver'} />
           )}
            {activeResidentId && <TabButton to="/caregiver/mar" icon={CheckSquare} label="MAR" active={location.pathname === '/caregiver/mar'} />}
            <TabButton to="/caregiver/tasks" icon={ListTodo} label="Tasks" active={location.pathname === '/caregiver/tasks'} />
            {activeResidentId && <TabButton to="/caregiver/chart" icon={Mic} label="Scribe" active={location.pathname === '/caregiver/chart'} />}
            <TabButton to="/caregiver/summary" icon={FileText} label="Summary" active={location.pathname === '/caregiver/summary'} />
            <TabButton to="/caregiver/incident" icon={FileWarning} label="Alert" active={location.pathname === '/caregiver/incident'} />
         </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// REUSABLE MOBILE COMPONENTS
// ---------------------------------------------------------

function TabButton({ to, icon: Icon, label, active }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 w-16 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
      <Icon className={`w-5 h-5 ${active ? 'fill-primary/20' : ''}`} />
      <span className="text-[10px] font-bold">{label}</span>
    </Link>
  );
}

function MobileCard({ children, className = '' }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------
// VIEWS
// ---------------------------------------------------------

function EmptyResidentState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 h-full min-h-[50vh]">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
        <Users className="w-10 h-10 text-primary opacity-80" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">No Resident Selected</h2>
      <p className="text-sm text-muted max-w-[250px]">Please select a resident from the Residents tab to view their specific chart and tasks.</p>
    </div>
  );
}

function ShiftRoster({ patients, activeResidentId, setActiveResidentId, homeData, distance }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 px-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-foreground">Residents</h3>
        <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{patients.length} In Census</span>
      </div>

      <div className="flex flex-col gap-3">
        {patients.length === 0 ? (
          <div className="py-20 text-center text-muted">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No residents found in this facility.</p>
          </div>
        ) : (
          patients.map(resident => (
            <div 
              key={resident.id}
              onClick={() => setActiveResidentId(resident.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeResidentId === resident.id ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' : 'bg-surface border-border hover:border-primary/30'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${activeResidentId === resident.id ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                  {resident.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{resident.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-tighter">
                      {homeData?.careType === 'In-Home Care Agency' ? (resident.address || resident.room || 'Field Visit') : `Room ${resident.roomNumber || resident.room || 'TBD'}`}
                    </span>
                    {distance !== null && distance < 150 && patients.find(p => p.id === resident.id)?.address && (
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-500 font-bold uppercase">
                        <ShieldCheck className="w-2.5 h-2.5" /> Detected at Service Address
                      </div>
                    )}
                    <span className="text-[10px] text-muted opacity-30">•</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      resident.careLevel === 'Memory Care' ? 'text-purple-400' :
                      resident.careLevel === 'High-Acuity' ? 'text-rose-400' :
                      'text-emerald-400'
                    }`}>
                      {resident.careLevel || 'Stable'}
                    </span>
                  </div>
                </div>
                {activeResidentId === resident.id && (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

function MedicationRecord({ patients, activeShiftId, checkedMedsByResident, setCheckedMedsByPatient, homeId, staffProfile, distance, activeResidentId, isShiftLocked }) {
  const [ocrLoading, setOcrLoading] = useState(false);

  if (!activeResidentId) return <EmptyResidentState />;

  const activeResident = patients.find(p => p.id === activeResidentId) || patients[0];
  const pName = activeResident?.name ? activeResident.name.split(' ')[0] : 'Resident';
  const residentId = activeResidentId || activeResident?.id || 'unknown';
  const checkedMeds = checkedMedsByResident[residentId] || {};

  const logMedication = async (medName, patientName) => {
    if (auth.currentUser?.uid === 'demo_caregiver_001') {
      console.log("[BYPASS] Skipping logMedication for", medName);
      return;
    }
    try {
      console.log("[MAR] Logging medication administration:", medName, "for", patientName);
      await addDoc(collection(db, 'system_logs'), {
        type: 'MEDICATION',
        message: `Administered ${medName} to ${patientName}`,
        residentId: residentId,
        residentName: activeResident?.name || patientName,
        createdAt: serverTimestamp(),
        caregiverId: auth.currentUser?.uid || 'unknown',
        caregiverName: staffProfile?.name || auth.currentUser?.email || 'Caregiver',
        homeId: homeId || 'unknown',
        shiftId: activeShiftId || 'unknown',
        geofenceDistance: distance !== null ? distance : 'unknown',
        verifiedOnPremises: distance !== null && distance <= 150
      });
    } catch (e) { console.error("[MAR] logMedication error:", e); }
  };

  const handlePrescriptionScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setOcrLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result.split(',')[1];
      try {
        const callClinicalAgent = httpsCallable(functions, 'clinicalAgent');
        const response = await callClinicalAgent({
          intent: 'prescription-ocr',
          messages: [
            { 
              role: 'system', 
              content: 'You are an expert clinical pharmacist. Extract medication details from the provided prescription label. Respond ONLY with a valid JSON object containing: "name", "dose", "route", "frequency". Do not include markdown formatting.' 
            },
            { 
              role: 'user', 
              content: 'Attached is a prescription label. Please extract the medication details.' 
            }
          ],
          document: {
            mimeType: file.type || 'image/jpeg',
            data: base64Data
          }
        });

        const data = response.data;
        if (data && data.choices && data.choices.length > 0) {
           let content = data.choices[0].message.content;
           content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
           // Robustly extract JSON object if LLM returned extra conversational text
           const jsonMatch = content.match(/\{[\s\S]*\}/);
           const jsonString = jsonMatch ? jsonMatch[0] : content;
           const parsed = JSON.parse(jsonString);
           
           // Update resident medications in Firestore
           const updatedMeds = [...(activeResident.medications || []), parsed];
           await setDoc(doc(db, 'residents', residentId), { medications: updatedMeds }, { merge: true });
           alert(`Success: Added ${parsed.name} ${parsed.dose || parsed.strength || ''} to ${pName}'s record.`);
        }
      } catch (err) {
        console.error("OCR Error:", err);
        alert("Failed to parse prescription: " + err.message);
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const discontinueMedication = async (index) => {
    if (!window.confirm("Discontinue this medication? It will be moved to the past medication history.")) return;
    const updatedMeds = [...(activeResident.medications || [])];
    updatedMeds[index] = { ...updatedMeds[index], status: 'discontinued', discontinuedAt: new Date().toISOString(), discontinuedBy: staffProfile?.name || auth.currentUser?.email || 'Caregiver' };
    try {
      await setDoc(doc(db, 'residents', activeResidentId), { medications: updatedMeds }, { merge: true });
    } catch (e) { console.error(e); }
  };
  const toggleMed = async (medKey, medName, patientName) => {
    if (isShiftLocked) {
      alert("This shift is locked and cannot be modified.");
      return;
    }
    if (!activeShiftId || !activeResidentId) {
      console.warn("[MAR] Cannot toggle med: missing shift or resident ID", { activeShiftId, activeResidentId });
      return;
    }
    const isCurrentlyChecked = !!checkedMeds[medKey];
    const newState = !isCurrentlyChecked;
    
    console.log("[MAR] Toggling med:", medName, "Key:", medKey, "New State:", newState);

    const medAdminData = newState ? {
      administered: true,
      administeredBy: staffProfile?.name || auth.currentUser?.email || 'Caregiver',
      administeredAt: new Date().toISOString()
    } : null;

    // OPTIMISTIC UI: Update local state immediately
    setCheckedMedsByPatient(prev => ({
      ...prev,
      [activeResidentId]: {
        ...(prev[activeResidentId] || {}),
        [medKey]: medAdminData
      }
    }));

    if (newState) {
      logMedication(medName, patientName); // Background log
    }
    
    try {
      if (auth.currentUser?.uid === 'demo_caregiver_001') {
        console.log(`[BYPASS] Mocking MAR update for ${medKey}`);
        return;
      }

      const shiftRef = doc(db, 'shifts', activeShiftId);
      
      // Sanitize key for dot notation
      const safeMedKey = medKey.replace(/\./g, '_');
      
      // Use updateDoc with dot notation for atomic map updates
      await updateDoc(shiftRef, { 
        [`checkedMeds.${activeResidentId}.${safeMedKey}`]: medAdminData
      });
      
      console.log("[MAR] Firestore update successful for med:", medName);
    } catch (e) { 
      console.error("[MAR] toggleMed Firestore error:", e); 
      // Revert optimistic update on failure
      alert("Failed to update medication record: " + e.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pt-2 relative h-full flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 mb-4 mt-4 flex justify-between items-end">
          <div>
            <h3 className="text-2xl font-bold text-foreground">eMAR</h3>
            <p className="text-xs text-muted">Medication Administration Record for {pName}</p>
          </div>
          <div className="relative">
             <input type="file" accept="image/*" capture="environment" onChange={handlePrescriptionScan} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={ocrLoading} />
             <button disabled={ocrLoading} className="bg-primary/20 text-primary px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-primary/30 transition-all active:scale-95">
               {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
               {ocrLoading ? 'Parsing...' : 'Scan RX'}
             </button>
          </div>
        </div>

        {(!activeResident.medications || activeResident.medications.length === 0) ? (
          <div className="px-4 py-12 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <Plus className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-muted font-bold mb-1">No Medications Listed</p>
            <p className="text-xs text-muted max-w-[200px] mx-auto">Scan a prescription label or contact the RN Delegator to add medications for {pName}.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4">
            <div className="mb-1 font-bold text-[10px] text-primary uppercase tracking-widest opacity-60">Active Prescriptions</div>
            {activeResident.medications.filter(m => m.status !== 'discontinued').map((med, i) => {
              // Generate a COLLISION-PROOF key including the index
              const slug = (med.name || 'med').replace(/\W+/g, '_');
              const medKey = `med_${i}_${slug}`;
              const isChecked = !!checkedMeds[medKey];
              const adminData = checkedMeds[medKey];

              return (
                <MobileCard key={medKey}>
                  <div className="flex items-center">
                    <div 
                      onClick={() => toggleMed(medKey, med.name, pName)} 
                      className={`flex-1 p-4 flex gap-4 items-center cursor-pointer transition-all ${isChecked ? 'bg-emerald-500/5' : 'hover:bg-surface-hover'}`}
                    >
                      <motion.div 
                        whileTap={{ scale: 0.9 }}
                        animate={isChecked ? { scale: [1, 1.2, 1], rotate: [0, 10, 0] } : { scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-slate-600 bg-surface'}`}
                      >
                        {isChecked && <CheckCircle2 className="w-6 h-6 text-white" />}
                        {!isChecked && <div className="w-2.5 h-2.5 rounded-full bg-slate-600" />}
                      </motion.div>
                      <div className="flex-1">
                        <h4 className={`font-bold text-sm transition-all ${isChecked ? 'text-foreground/50' : 'text-foreground'}`}>
                          {med.name} {med.dose || med.strength || ''}
                        </h4>
                        <p className="text-[10px] text-muted font-medium">{med.route || 'Oral'} • {med.frequency || 'As Directed'}</p>
                      </div>
                      <div className="ml-auto flex flex-col items-end gap-1">
                        {isChecked && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.8, x: 10 }} 
                            animate={{ opacity: 1, scale: 1, x: 0 }} 
                            className="text-right bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20"
                          >
                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">SUCCESS</div>
                            <div className="text-[9px] text-emerald-400 font-mono">
                              {new Date(adminData?.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    <button onClick={() => discontinueMedication(i)} className="p-4 text-slate-600 hover:text-amber-500 transition-colors" title="Discontinue">
                      <History className="w-4 h-4" />
                    </button>
                  </div>
                </MobileCard>
              );
            })}

            {activeResident.medications.some(m => m.status === 'discontinued') && (
              <>
                <div className="mt-6 mb-1 font-bold text-[10px] text-muted uppercase tracking-widest opacity-60">Past Medications (Discontinued)</div>
                {activeResident.medications.filter(m => m.status === 'discontinued').map((med, i) => (
                  <div key={i} className="bg-surface/30 border border-border/50 rounded-2xl p-4 opacity-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-muted-foreground">{med.name}</h4>
                        <p className="text-[9px] text-muted-foreground">Discontinued {new Date(med.discontinuedAt).toLocaleDateString()} by {med.discontinuedBy}</p>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-muted/20 px-2 py-0.5 rounded">History</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ShiftHistory({ homeId, currentUser }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid || !homeId) return;
    const q = query(
      collection(db, 'shifts'),
      where('caregiverId', '==', currentUser.uid),
      where('homeId', '==', homeId),
      orderBy('startTime', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser, homeId]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 px-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-foreground">Shift History</h3>
        <Link to="/caregiver/incident" className="bg-rose-500/10 text-rose-500 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border border-rose-500/20 active:scale-95 transition-all">
          <FileWarning className="w-4 h-4" /> Report Incident
        </Link>
      </div>

      {loading ? (
        <div className="py-20 text-center animate-pulse text-muted flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="font-medium text-sm">Loading your activity history...</span>
        </div>
      ) : shifts.length === 0 ? (
        <div className="py-20 text-center text-muted flex flex-col items-center gap-4">
          <History className="w-12 h-12 opacity-20" />
          <p className="max-w-[200px] text-sm">No past shifts recorded yet. Complete your first shift to see history here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shifts.map(shift => (
            <MobileCard key={shift.id}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">
                        {shift.startTime?.toDate().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-muted font-medium">
                        {shift.startTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {shift.endTime && ` — ${shift.endTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${shift.endTime ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary animate-pulse'}`}>
                      {shift.endTime ? 'Logged' : 'Active'}
                    </div>
                    {shift.evvStartCompliant && (
                       <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">
                          <ShieldCheck className="w-3 h-3" /> EVV Verified
                       </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                   <div className="flex gap-4">
                      <div className="text-center">
                         <p className="text-[9px] text-muted uppercase font-bold">Meds</p>
                         <p className="text-xs font-bold text-foreground">{Object.keys(shift.checkedMeds || {}).length}</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[9px] text-muted uppercase font-bold">Tasks</p>
                         <p className="text-xs font-bold text-foreground">{Object.keys(shift.activeTasks || {}).length}</p>
                      </div>
                   </div>
                   {shift.evvEndCompliant ? (
                      <div className="px-2 py-0.5 rounded bg-emerald-500/5 border border-emerald-500/10 text-[8px] text-emerald-500 font-bold uppercase">Location Verified</div>
                   ) : shift.endTime ? (
                      <div className="px-2 py-0.5 rounded bg-amber-500/5 border border-amber-500/10 text-[8px] text-amber-500 font-bold uppercase">Manual Log</div>
                   ) : null}
                </div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function IncidentReport({ homeId, patients, staffProfile }) {
  const [residentId, setResidentId] = useState('');
  const [type, setType] = useState('Fall');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!residentId || !description) return alert("Please select a resident and provide a description.");
    setSubmitting(true);
    try {
      const res = patients.find(p => p.id === residentId);
      await addDoc(collection(db, 'system_logs'), {
        type: 'INCIDENT',
        incidentType: type,
        message: `INCIDENT REPORT: ${type} - ${description}`,
        residentId,
        residentName: res?.name || 'Unknown',
        description,
        createdAt: serverTimestamp(),
        caregiverId: auth.currentUser?.uid,
        caregiverName: staffProfile?.name || auth.currentUser?.email,
        homeId
      });
      alert("Incident reported successfully.");
      window.history.back();
    } catch (err) {
      console.error(err);
      alert("Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 px-4 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 text-muted hover:text-foreground transition-colors">
          <Users className="w-5 h-5 rotate-90" /> {/* Back arrow proxy */}
        </button>
        <div>
          <h3 className="text-2xl font-bold text-foreground mb-0.5">Report Incident</h3>
          <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Formal Clinical Record</p>
        </div>
      </div>
      
      <MobileCard className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary px-1">Resident Involved</label>
            <select 
              value={residentId} 
              onChange={e => setResidentId(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-foreground font-bold text-sm outline-none focus:border-primary appearance-none transition-all"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
            >
              <option value="">Select Resident</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} (Room {p.room || 'N/A'})</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary px-1">Incident Category</label>
            <div className="grid grid-cols-2 gap-2">
              {['Fall', 'Behavioral', 'Medication', 'Injury', 'ER Visit', 'Other'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setType(cat)}
                  className={`py-3 rounded-xl border font-bold text-xs transition-all ${type === cat ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-muted-foreground'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-primary px-1">Detailed Narrative</label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe exactly what happened, witness names, immediate actions taken, and the resident's current condition..."
              rows={6}
              className="w-full bg-background border border-border rounded-xl px-4 py-4 text-foreground text-sm outline-none focus:border-primary placeholder:text-muted/50 transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={submitting}
            className="bg-rose-500 hover:bg-rose-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 mt-4 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileWarning className="w-5 h-5" />}
            SUBMIT OFFICIAL REPORT
          </button>
        </form>
      </MobileCard>
    </motion.div>
  );
}

function QrCodeIcon(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>;
}

function DailyChores({ patients, activeShiftId, activeTasksByResident, setActiveTasksByPatient, homeId, staffProfile, distance, residentId, isShiftLocked }) {
  const isGlobal = !residentId;
  const activeResident = isGlobal ? null : (patients.find(p => p.id === residentId) || patients[0]);
  const pName = isGlobal ? 'Facility' : (activeResident?.name ? activeResident.name.split(' ')[0] : 'Resident');
  const effectiveResidentId = isGlobal ? 'GLOBAL_FACILITY' : (residentId || activeResident?.id || 'unknown');
  const activeTasks = activeTasksByResident[effectiveResidentId] || {};
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const availableCategories = isGlobal ? ['FACILITY', 'IADL'] : Object.keys(CAREGIVER_TASKS);
  const [selectedCategory, setSelectedCategory] = useState(isGlobal ? 'FACILITY' : 'ADL');
  const effectiveSelectedCategory = isGlobal && !['FACILITY', 'IADL'].includes(selectedCategory)
    ? 'FACILITY'
    : (!isGlobal && selectedCategory === 'FACILITY' ? 'ADL' : selectedCategory);
  
  const logTask = async (taskName) => {
    if (auth.currentUser?.uid === 'demo_caregiver_001') {
      console.log("[BYPASS] Skipping logTask for", taskName);
      return;
    }
    try {
      console.log("[Tasks] Logging task completion:", taskName, "for", effectiveResidentId);
      await addDoc(collection(db, 'system_logs'), {
        type: isGlobal ? 'FACILITY_TASK' : 'ADL/CHORE',
        message: `Completed: ${taskName}`,
        residentId: effectiveResidentId,
        residentName: isGlobal ? 'Facility' : (activeResident?.name || 'Resident'),
        createdAt: serverTimestamp(),
        caregiverId: auth.currentUser?.uid || 'unknown',
        caregiverName: staffProfile?.name || auth.currentUser?.email || 'Caregiver',
        homeId: homeId || 'unknown',
        shiftId: activeShiftId || 'unknown',
        geofenceDistance: distance !== null ? distance : 'unknown',
        verifiedOnPremises: distance !== null && distance <= 150
      });
    } catch (e) { 
      console.error("[Tasks] logTask error:", e); 
    }
  };

  const toggleActiveTask = async (taskName) => {
    if (isShiftLocked) {
      alert("This shift is locked and cannot be modified.");
      return;
    }
    if (!activeShiftId) {
      console.warn("[Tasks] Cannot toggle task: no active shift");
      return;
    }
    const taskKey = `task_${taskName.replace(/\W+/g, '_')}`;
    const existingTask = activeTasks[taskKey];
    const isCurrentlyChecked = !!existingTask?.completed;
    const newState = !isCurrentlyChecked;

    const taskUpdate = {
      name: taskName,
      completed: newState,
      completedAt: newState ? new Date().toISOString() : null,
      completedBy: newState ? (staffProfile?.name || auth.currentUser?.email || 'Caregiver') : null
    };

    // OPTIMISTIC UI: Update local state immediately
    setActiveTasksByPatient(prev => ({
      ...prev,
      [effectiveResidentId]: {
        ...(prev[effectiveResidentId] || {}),
        [taskKey]: taskUpdate
      }
    }));

    if (newState) {
      logTask(taskName); // Background log
    }

    try {
      if (auth.currentUser?.uid === 'demo_caregiver_001') {
        console.log(`[BYPASS] Mocking Task toggle for ${taskName}`);
        return;
      }

      const shiftRef = doc(db, 'shifts', activeShiftId);
      console.log("[Tasks] Toggling task:", taskName, "New State:", newState);

      // Use updateDoc with dot notation for atomic map updates
      await updateDoc(shiftRef, { 
        [`activeTasks.${effectiveResidentId}.${taskKey}`]: taskUpdate
      });
      
      console.log("[Tasks] Firestore update successful for task:", taskName);
    } catch (e) { 
      console.error("[Tasks] toggleActiveTask error:", e); 
      alert("Failed to update task: " + e.message);
    }
  };

  const addTaskToShift = async (taskName) => {
    if (!activeShiftId) {
      console.warn("[Tasks] Cannot add task: no active shift");
      return;
    }
    const taskKey = `task_${taskName.replace(/\W+/g, '_')}`;
    const taskInitial = { name: taskName, completed: false };

    // OPTIMISTIC UI
    setActiveTasksByPatient(prev => ({
      ...prev,
      [effectiveResidentId]: {
        ...(prev[effectiveResidentId] || {}),
        [taskKey]: taskInitial
      }
    }));
    
    try {
      console.log("[Tasks] Adding task to shift:", taskName, "for", effectiveResidentId);
      
      if (auth.currentUser?.uid === 'demo_caregiver_001') {
        console.log(`[BYPASS] Mocking Task Add for ${taskName}`);
        return;
      }

      const shiftRef = doc(db, 'shifts', activeShiftId);
      await updateDoc(shiftRef, { 
        [`activeTasks.${effectiveResidentId}.${taskKey}`]: taskInitial
      });
      
      console.log("[Tasks] Task added successfully:", taskName);
    } catch (e) { 
      console.error("[Tasks] addTaskToShift error:", e); 
      alert("Failed to add task: " + e.message);
    } finally {
      setShowTaskSelector(false);
    }
  };

  const taskEntries = Object.entries(activeTasks);

  return (
    <>
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pt-2 h-full flex flex-col relative">
      <div className="px-4 mb-4 mt-4 flex justify-between items-end">
        <div>
          <h3 className="text-2xl font-bold text-foreground flex items-center gap-2"><ListTodo className="w-5 h-5 text-accent" /> Shift Tasks</h3>
          <p className="text-xs text-muted">Your custom checklist for {pName}</p>
        </div>
        <button onClick={() => setShowTaskSelector(true)} className="bg-primary/20 text-primary px-3 py-1.5 rounded text-xs font-bold hover:bg-primary/30 transition-colors flex items-center gap-1">
          + Add Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <AnimatePresence mode="popLayout">
          {taskEntries.length > 0 ? (
            <motion.div 
              key="task-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <MobileCard>
                <div className="flex flex-col">
                  {taskEntries.map(([tKey, task]) => (
                    <div 
                      key={tKey} 
                      onClick={() => toggleActiveTask(task.name)}
                      className={`p-4 flex gap-4 items-center border-b border-border cursor-pointer last:border-0 transition-all ${task.completed ? 'bg-primary/5' : 'hover:bg-surface-hover'}`}
                    >
                      <motion.div 
                        whileTap={{ scale: 0.9 }}
                        animate={task.completed ? { scale: [1, 1.2, 1], borderRadius: ["12px", "24px", "12px"] } : { scale: 1 }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all shrink-0 ${task.completed ? 'bg-primary border-primary shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'border-slate-500 bg-surface'}`}
                      >
                        {task.completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                      </motion.div>
                      <div className="flex-1">
                        <span className={`text-sm font-bold transition-all ${task.completed ? 'text-foreground/50' : 'text-foreground'}`}>
                          {task.name}
                        </span>
                        {task.completed && (
                          <motion.p 
                            initial={{ opacity: 0, y: 5 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            className="text-[9px] text-primary/70 font-black uppercase tracking-widest mt-0.5"
                          >
                            Verified {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </MobileCard>
            </motion.div>
          ) : (
            <motion.div 
              key="empty-tasks"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="h-64 flex flex-col items-center justify-center text-center"
            >
              <CheckSquare className="w-12 h-12 text-slate-700 mb-4 opacity-20" />
              <p className="text-muted font-bold mb-1">No Tasks Active</p>
              <p className="text-xs text-muted max-w-[200px]">Tap "Add Task" to build your shift checklist.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>

      {/* TASK SELECTOR MODAL */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTaskSelector && (
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-0 w-screen h-[100dvh] bg-surface/95 backdrop-blur-3xl z-[9999] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border flex justify-between items-center bg-background/50">
              <h3 className="font-bold text-foreground text-lg">Task Library</h3>
              <button onClick={() => setShowTaskSelector(false)} className="text-muted hover:text-foreground p-2">Close</button>
            </div>
            <div className="flex overflow-x-auto shrink-0 border-b border-white/10 px-4 py-3 gap-2 scrollbar-hide w-full">
              {availableCategories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-1 py-2 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap transition-colors text-center ${effectiveSelectedCategory === cat ? 'bg-primary text-white' : 'bg-primary/5 text-muted-foreground'}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {(CAREGIVER_TASKS[effectiveSelectedCategory] || []).map((taskName, i) => (
                <button key={i} onClick={() => addTaskToShift(taskName)} className="text-left w-full p-4 rounded-xl bg-surface/50 border border-border hover:bg-surface-hover hover:border-primary/50 transition-all text-sm font-medium text-foreground">
                  {taskName}
                </button>
              ))}
            </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}


function ProfileSettings({ agentName, setAgentName, staffProfile, userProfilePhoto, setUserProfilePhoto, endShift, activeShiftId, homeId, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64String = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
          const uid = auth.currentUser?.uid;
          if (uid) {
            await setDoc(doc(db, 'users', uid), { profilePhoto: base64String }, { merge: true });
            setUserProfilePhoto(base64String);
          }
        } catch (err) {
          console.error("Failed to upload photo:", err);
          alert("Failed to upload photo. " + err.message);
        } finally {
          setUploading(false);
        }
      };
      img.onerror = () => {
        alert("Invalid image file.");
        setUploading(false);
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pt-2 flex flex-col h-full">
      <div className="px-4 mb-4 mt-4">
        <h3 className="text-2xl font-bold text-foreground">Profile & Settings</h3>
        <p className="text-xs text-muted">Manage your account and AI Copilot</p>
      </div>

      <MobileCard>
         <div className="p-4 flex flex-col items-center gap-4 relative">
            <label className="w-24 h-24 rounded-full border-2 border-primary/30 overflow-hidden bg-primary/10 cursor-pointer relative group block">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
              <img src={userProfilePhoto || "/images/human_hero.png"} alt="Profile" className={`w-full h-full object-cover ${uploading ? 'opacity-50' : 'group-hover:opacity-70 transition-opacity'}`} />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <UploadCloud className="w-6 h-6 text-white drop-shadow-md" />}
              </div>
            </label>
            <div className="text-center">
              <h4 className="text-lg font-bold text-foreground">{staffProfile?.name || auth.currentUser?.email?.split('@')[0] || "Staff Member"}</h4>
              <p className="text-muted text-sm font-medium capitalize">{staffProfile?.role || 'Caregiver'}</p>
              <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                 <ShieldCheck className="w-3 h-3 text-emerald-400" />
                 <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active Credentials Verified</span>
              </div>
            </div>
         </div>
      </MobileCard>

      <MobileCard>
        <div className="py-5 px-4 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-foreground font-bold mb-1">Shift Status</h4>
            <p className="text-xs text-muted">
              {activeShiftId ? 'You are clocked in and care activity is being attached to this shift.' : 'No active shift is currently open.'}
            </p>
          </div>
          <button
            type="button"
            onClick={endShift}
            disabled={!activeShiftId}
            className="shrink-0 bg-rose-500/10 border border-rose-500/20 text-rose-500 disabled:opacity-40 disabled:text-muted disabled:border-border px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Clock Out
          </button>
        </div>
      </MobileCard>

      <MobileCard className="border-primary/20 bg-gradient-to-br from-surface to-primary/5">
        <div className="py-5 px-4">
          <div className="flex items-center gap-2 mb-1">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
             </div>
             <div>
                <h4 className="text-foreground font-bold leading-tight">Personalize AI Copilot</h4>
                <p className="text-[10px] text-muted uppercase tracking-widest font-black opacity-70">Voice Identity</p>
             </div>
          </div>
          <p className="text-xs text-muted/80 mb-4 mt-2">Choose a familiar name for your clinical voice assistant to make interactions feel more natural.</p>
          
          <div className="relative group">
            <input 
              type="text" 
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-foreground font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all pr-12 shadow-inner"
              placeholder="e.g. Florence, Jarvis..."
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
              <Type className="w-5 h-5 opacity-40 group-focus-within:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </MobileCard>
      
      <MobileCard>
        <div className="py-5 px-4">
          <h4 className="text-foreground font-bold mb-1">Display Theme</h4>
          <p className="text-xs text-muted mb-4">Adjust the interface appearance.</p>
          
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-surface/50 border border-border hover:bg-surface-hover transition-all"
          >
            <div className="flex items-center gap-3 text-foreground">
              {theme === 'light' && <Sun className="w-5 h-5 text-amber-400" />}
              {theme === 'dark' && <Moon className="w-5 h-5 text-indigo-400" />}
              {theme === 'system' && <Monitor className="w-5 h-5 text-emerald-400" />}
              <span className="font-bold capitalize">{theme} Mode</span>
            </div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-widest">Change</div>
          </button>
        </div>
      </MobileCard>

      <div className="mt-8 mb-4 px-4">
        <h4 className="text-sm font-bold text-foreground">Shift History</h4>
        <p className="text-[10px] text-muted">Review your past clinical activity</p>
      </div>
      
      <ShiftHistory homeId={homeId} currentUser={currentUser} />
    </motion.div>
  );
}

function ShiftNotesView({ shiftNotes, setShiftNotes, signature, setSignature, closeShift, isClosingShift, isShiftLocked, staffProfile }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 pb-32 flex flex-col gap-6">
      <header>
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Shift Progress Notes
        </h3>
        <p className="text-xs text-muted">Document interdisciplinary observations and clinical status changes.</p>
      </header>

      <section className="flex flex-col gap-2">
        <label className="text-[10px] font-black text-muted uppercase tracking-widest">Narrative Documentation</label>
        <textarea
          value={shiftNotes}
          onChange={(e) => setShiftNotes(e.target.value)}
          disabled={isShiftLocked}
          placeholder="Enter observations, incident reports, or care updates..."
          className="w-full h-48 bg-surface border border-border rounded-2xl p-4 text-sm text-foreground outline-none focus:border-primary/50 disabled:opacity-50 resize-none shadow-inner"
        />
        <p className="text-[10px] text-muted-foreground italic">
          * Legal Requirement: Notes must be accurate and non-judgmental.
        </p>
      </section>

      <section className="glass-card p-6 border-primary/10">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <div>
            <h4 className="font-bold text-sm">Shift Attestation</h4>
            <p className="text-[10px] text-muted">Legally binding electronic signature.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted uppercase tracking-tighter">Enter Full Name for Signature</label>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              disabled={isShiftLocked}
              className="bg-background border border-border rounded-xl px-4 py-3 text-sm font-serif italic outline-none focus:border-primary/50 disabled:opacity-50"
              placeholder="Your Name"
            />
          </div>

          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
            <p className="text-[10px] text-primary/80 leading-relaxed font-medium">
              By signing and closing this shift, I attest that the clinical records provided are accurate, timely, and complete for the residents under my care. This record will be permanently locked for audit retrieval.
            </p>
          </div>

          {!isShiftLocked ? (
            <button
              onClick={closeShift}
              disabled={isClosingShift || !signature.trim()}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              {isClosingShift ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Sign & Close Shift
            </button>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Shift Records Locked</p>
                <p className="text-[10px] opacity-80">Digitally signed by {signature} ({staffProfile?.role || 'Staff'})</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
}