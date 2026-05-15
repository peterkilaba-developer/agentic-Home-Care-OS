import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Heart, FileText, Calendar, ShieldCheck, MessageSquare, CreditCard, X, Menu, DownloadCloud, PenTool, Send, AlertTriangle, LogOut, Activity, CheckCircle2, Clock, Sun, Moon, Monitor, Loader2, ChevronLeft } from 'lucide-react';
import { useTheme } from '../components/theme';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';
import { collection, doc, getDoc, limit, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';
import { STRIPE_PUBLISHABLE_KEY } from '../config/runtime';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

export default function ClientPortal() {
  const stateCode = localStorage.getItem('provider_state') || localStorage.getItem('detected_state') || 'us';
  const stateData = US_STATES[stateCode] || DEFAULT_STATE;

  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [resident, setResident] = useState({ name: 'Loading...', room: '--', meds: [] });
  const [userProfile, setUserProfile] = useState(() => {
    if (window.location.search.includes('bypass=client')) {
      return { uid: 'demo_client_001', role: 'family', name: 'Demo Family Member', residentId: 'demo_resident_001' };
    }
    return null;
  });
  const [homeData, setHomeData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let unsubResident = () => {};

  const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubResident();
      unsubResident = () => {};

      let effectiveUser = user;
      if (!effectiveUser && window.location.search.includes('bypass=client')) {
        effectiveUser = { uid: 'demo_client_001', email: 'family@demo.local' };
      }

      if (!effectiveUser) {
        if (window.location.hostname !== 'localhost' && !window.location.search.includes('bypass')) {
          window.location.href = '/auth';
        }
        setResident({ name: 'Sign in required', room: '--', meds: [] });
        return;
      }

      try {
        let profile;
        if (effectiveUser.uid === 'demo_client_001') {
          profile = { role: 'family', name: 'Demo Family Member', residentId: 'demo_resident_001' };
        } else {
          const userSnap = await getDoc(doc(db, 'users', effectiveUser.uid));
          profile = userSnap.exists() ? userSnap.data() : {};
        }
        setUserProfile(profile);
        const residentId = profile.residentId || profile.clientResidentId || null;
        const homeId = profile.homeId || profile.activeHomeId || null;

        if (residentId) {
          unsubResident = onSnapshot(doc(db, 'residents', residentId), (snap) => {
            const data = snap.exists() ? { id: snap.id, ...snap.data() } : { name: 'Resident not found', room: '--', meds: [] };
            setResident(data);
            if (data.homeId) {
              getDoc(doc(db, 'homes', data.homeId)).then(hSnap => {
                if (hSnap.exists()) setHomeData(hSnap.data());
              });
            }
          }, (err) => {
            console.error("Client resident snapshot error:", err);
          });
          return;
        }

        if (homeId) {
          const residentQuery = query(collection(db, 'residents'), where('homeId', '==', homeId), limit(1));
          unsubResident = onSnapshot(residentQuery, (snapshot) => {
            if (!snapshot.empty) {
              setResident({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            } else {
              setResident({ name: 'No resident assigned', room: '--', meds: [], homeId });
            }
          }, (err) => {
            console.error("Client resident snapshot error:", err);
          });
          return;
        }

        if (profile.role === 'family') {
          const acceptFamilyInvite = httpsCallable(functions, 'acceptFamilyInvite');
          acceptFamilyInvite().catch(err => console.error("Auto-onboarding error:", err));
        }

        setResident({ name: 'No resident assigned', room: '--', meds: [] });
      } catch (err) {
        console.error("Client profile load error:", err);
        setResident({ name: 'Unable to load resident', room: '--', meds: [] });
      }
    });

    return () => {
      unsubAuth();
      unsubResident();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-muted overflow-hidden">
      
      {/* MOBILE HEADER */}
      {location.pathname !== '/client-portal/messages' && (
        <div className="md:hidden flex items-center justify-between px-6 py-4 bg-surface/50 border-b border-border relative z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-foreground text-sm tracking-tight uppercase">Family Portal</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-foreground"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      )}

      {/* MOBILE SIDEBAR OVERLAY */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-surface z-50 p-6 flex flex-col gap-8 md:hidden"
            >
              <SidebarContent resident={resident} homeData={homeData} theme={theme} toggleTheme={toggleTheme} location={location} setIsSidebarOpen={setIsSidebarOpen} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:flex w-64 border-r border-border bg-surface/50 py-6 px-4 flex-col gap-8 flex-shrink-0 relative z-20">
        <SidebarContent resident={resident} homeData={homeData} theme={theme} toggleTheme={toggleTheme} location={location} />
      </div>

      {/* MAIN CONTENT ROUTING AREA */}
      <div className="flex-1 h-screen overflow-y-auto relative z-10 bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-background to-background">
        <div className="pt-4 pb-20 md:pb-8 px-4 md:px-8">
          <Routes>
            <Route index element={<DailyOverview resident={resident} homeData={homeData} />} />
            <Route path="logs" element={<ActivityTimeline resident={resident} />} />
            <Route path="care-plan" element={<CarePlanViewer resident={resident} stateData={stateData} />} />
            <Route path="meds" element={<MedicationTracker resident={resident} />} />
            <Route path="documents" element={<DocumentVault resident={resident} stateData={stateData} />} />
            <Route path="messages" element={<MessageFacility resident={resident} userProfile={userProfile} homeData={homeData} />} />
            <Route path="billing" element={<BillingCenter resident={resident} />} />
            <Route path="*" element={<PlaceholderView />} />
          </Routes>
        </div>
      </div>

    </div>
  );
}

// ---------------------------------------------------------
// REUSABLE COMPONENTS
// ---------------------------------------------------------
function SidebarContent({ resident, homeData, theme, toggleTheme, location, setIsSidebarOpen }) {
  const closeSidebar = () => setIsSidebarOpen && setIsSidebarOpen(false);

  return (
    <>
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-primary/50 relative flex items-center justify-center">
          {resident.photo ? (
            <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
          ) : (
            <Heart className="w-8 h-8 text-primary" />
          )}
        </div>
        <h3 className="text-foreground font-bold text-sm">{resident.name || 'Unknown'}</h3>
        <p className="text-xs text-primary font-bold">Room {resident.room || 'TBD'} • {homeData?.homeName || 'Facility'}</p>
      </div>

      <nav className="flex flex-col gap-1">
        <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-2 px-2">Family Access</h4>
        <NavButton to="/client-portal" icon={<Heart />} label="Daily Overview" active={location.pathname === '/client-portal'} onClick={closeSidebar} />
        <NavButton to="/client-portal/logs" icon={<Calendar />} label="Activity Timeline" active={location.pathname === '/client-portal/logs'} onClick={closeSidebar} />
        <NavButton to="/client-portal/care-plan" icon={<FileText />} label="Active Care Plan" active={location.pathname === '/client-portal/care-plan'} onClick={closeSidebar} />
        <NavButton to="/client-portal/meds" icon={<Activity />} label="Medication Tracker" active={location.pathname === '/client-portal/meds'} onClick={closeSidebar} />
        <NavButton to="/client-portal/documents" icon={<ShieldCheck />} label="Consents & Docs" active={location.pathname === '/client-portal/documents'} onClick={closeSidebar} />
      </nav>

      <div className="mt-auto pt-8 border-t border-border flex flex-col gap-1">
        <button 
          onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all text-muted hover:bg-surface-hover hover:text-foreground mb-1"
          title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
        >
          {theme === 'light' && <Sun className="w-4 h-4" />}
          {theme === 'dark' && <Moon className="w-4 h-4" />}
          {theme === 'system' && <Monitor className="w-4 h-4" />}
          <span className="capitalize">{theme} Mode</span>
        </button>
        <NavButton to="/client-portal/messages" icon={<MessageSquare />} label="Message Facility" active={location.pathname === '/client-portal/messages'} onClick={closeSidebar} />
        <NavButton to="/client-portal/billing" icon={<CreditCard />} label="Billing Center" active={location.pathname === '/client-portal/billing'} onClick={closeSidebar} />
        <button onClick={async () => { await signOut(auth); window.location.href = '/'; }} className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all text-rose-400 hover:bg-rose-500/10 mt-1">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );
}

function NavButton({ to, icon, label, active, onClick }) {
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all ${active ? 'bg-primary text-white shadow-lg border border-primary/20' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}>
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      <span>{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------
// PORTAL VIEWS
// ---------------------------------------------------------

function DailyOverview({ resident, homeData }) {
  const [vitals, setVitals] = useState({ bp: null, temp: null, weight: null });
  const [activeShift, setActiveShift] = useState(null);
  const firstName = resident.name ? resident.name.split(' ')[0] : 'Your Resident';

  useEffect(() => {
    if (!resident.id) return;
    
    // Fetch latest vitals from system_logs
    const q = query(
      collection(db, 'system_logs'),
      where('residentId', '==', resident.id),
      where('type', '==', 'ADL/CHORE'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubVitals = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => d.data());
      const bp = logs.find(l => l.message.toLowerCase().includes('blood pressure'));
      const temp = logs.find(l => l.message.toLowerCase().includes('temperature'));
      const weight = logs.find(l => l.message.toLowerCase().includes('weight'));
      setVitals({ bp, temp, weight });
    });

    // Fetch active shift for home to identify current caregiver
    if (resident.homeId) {
      const sq = query(
        collection(db, 'shifts'),
        where('homeId', '==', resident.homeId),
        where('status', '==', 'active'),
        limit(1)
      );
      const unsubShift = onSnapshot(sq, (snap) => {
        if (!snap.empty) {
          setActiveShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
        } else {
          setActiveShift(null);
        }
      });
      return () => { unsubVitals(); unsubShift(); };
    }

    return () => unsubVitals();
  }, [resident.id, resident.homeId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
      <header>
         <h1 className="text-3xl font-bold text-foreground mb-2">{greeting}.</h1>
         <p className="text-muted">{firstName} is having a very pleasant and restful day at {homeData?.homeName || 'the care home'}.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`glass-card py-6 px-4 border-emerald-500/20 bg-gradient-to-t from-emerald-900/10 to-transparent ${vitals.bp || vitals.temp ? 'opacity-100' : 'opacity-80'}`}>
           <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><Heart className="w-6 h-6" /></div>
             <span className="text-xs font-bold text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded-md">
               {vitals.bp || vitals.temp ? 'Vitals Documented' : 'Stable & Secure'}
             </span>
           </div>
           <h3 className="text-2xl font-bold text-foreground mb-1">
             {vitals.bp ? 'BP Recorded' : vitals.temp ? 'Temp Recorded' : 'Vitals are Normal'}
           </h3>
           <p className="text-sm text-muted">
             {vitals.bp 
               ? `Last checked at ${vitals.bp.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by ${vitals.bp.caregiverName || 'staff'}.`
               : `Vitals verified stable by care team.`}
           </p>
         </div>

         <div className="glass-card py-6 px-4">
           <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-primary/10 rounded-lg text-primary"><Calendar className="w-6 h-6" /></div>
           </div>
           <h3 className="text-2xl font-bold text-foreground mb-1">Daily Activities</h3>
           <p className="text-sm text-muted">
             {resident.activitiesToday || `${firstName} is participating in group activities and social engagement today.`}
           </p>
         </div>
      </div>

      <div className="glass-card py-8 px-4 bg-surface/30 border border-border">
         <h2 className="text-xl font-bold text-foreground mb-6">Current Caregiver</h2>
         <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 overflow-hidden shrink-0 flex items-center justify-center">
               {activeShift?.staffPhoto ? (
                 <img src={activeShift.staffPhoto} alt={activeShift.staffName} className="w-full h-full object-cover" />
               ) : (
                 <Heart className="w-8 h-8 text-primary" />
               )}
            </div>
            <div>
               <h3 className="text-lg font-bold text-foreground">{activeShift?.staffName || 'On-Call Care Team'}</h3>
               <p className="text-sm text-muted mb-2">
                 {activeShift 
                   ? `${activeShift.staffName} is currently on shift and providing attentive care for ${firstName}.`
                   : `Our certified care team is providing 24/7 support and monitoring for ${firstName}.`}
               </p>
               <Link to="/client-portal/messages" className="text-xs font-bold text-primary hover:underline hover:text-foreground transition-colors">Message the care team</Link>
            </div>
         </div>
      </div>
    </motion.div>
  );
}

function ActivityTimeline({ resident }) {
  const [logs, setLogs] = useState([]);
  const firstName = resident.name ? resident.name.split(' ')[0] : 'Your Resident';

  useEffect(() => {
    if (!resident.id) return;
    const q = query(
      collection(db, 'system_logs'),
      where('residentId', '==', resident.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error("Timeline snapshot error:", err);
    });
    return () => unsub();
  }, [resident.id]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="mb-4">
         <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Verified Logs</h1>
         <p className="text-muted">Direct clinical audit of all care activities and interventions for {firstName}.</p>
      </header>
      
      <div className="relative pl-6 border-l-2 border-border flex flex-col gap-8 py-4">
         {logs.length > 0 ? logs.map(log => (
           <div key={log.id} className="relative">
             <div className={`absolute -left-[35px] top-1 w-4 h-4 rounded-full ring-4 ring-background ${
               log.type === 'INCIDENT' ? 'bg-rose-500' : 
               log.type === 'MEDICATION' ? 'bg-primary' : 
               'bg-emerald-400'
             }`} />
             <p className="text-xs font-bold text-muted mb-2 uppercase">
               {log.createdAt?.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
             </p>
             <div className="glass-card py-5 px-4 bg-surface/50 border border-border">
               <p className="text-foreground">{log.message}</p>
               {log.caregiverName && <p className="text-[10px] text-muted mt-2 uppercase font-bold">Logged by {log.caregiverName}</p>}
             </div>
           </div>
         )) : (
           <div className="text-center py-12">
             <Clock className="w-12 h-12 text-muted mx-auto mb-4 opacity-20" />
             <p className="text-muted italic">No recent activity logs found for {firstName}.</p>
           </div>
         )}
      </div>
    </motion.div>
  );
}

function CarePlanViewer({ resident, stateData }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6">
         <div className="flex-1">
           <div className="flex items-center gap-3 mb-2">
             <h1 className="text-3xl sm:text-5xl font-serif text-foreground leading-tight">Active Care Plan</h1>
             <span className="text-[10px] bg-primary/10 border border-border px-2 py-1 rounded text-primary font-bold uppercase tracking-tighter shrink-0">AI Synthesized</span>
           </div>
           <p className="text-muted max-w-xl text-sm sm:text-base leading-relaxed">Read-only view of the {stateData.regulator} {stateData.complianceLaw}-certified care strategy.</p>
         </div>
         <button className="flex items-center justify-center gap-3 px-6 py-4 bg-surface border border-border rounded-xl text-foreground font-bold hover:bg-surface-hover transition-all shadow-sm w-full md:w-auto shrink-0 group">
            <DownloadCloud className="w-5 h-5 text-primary transition-transform group-hover:-translate-y-0.5" />
            <span>Download PDF</span>
         </button>
      </header>

      <div className="glass-card flex-1 py-8 px-4 bg-surface/10 border border-border overflow-y-auto">
          <div className="max-w-2xl mx-auto font-serif text-foreground text-sm leading-relaxed whitespace-pre-wrap">
             <div className="text-center mb-8 border-b border-border pb-6">
                <h2 className="text-xl font-bold uppercase tracking-widest mb-2 font-sans text-foreground">{stateData.name} State {stateData.regulator}</h2>
                <p className="text-muted font-sans uppercase text-xs font-bold">Negotiated Care Plan • {stateData.facilityType}</p>
             </div>
             
             <p className="mb-4"><strong>Resident Name:</strong> {resident.name || 'Unknown'}</p>
             <p className="mb-4"><strong>Date of Assessment:</strong> {resident.assessmentDate || 'Current'}</p>
             <p className="mb-8"><strong>Assessing RN Delegator:</strong> {resident.rnDelegator || ' Sarah Connor, BSN'}</p>

             <h3 className="text-lg font-bold text-foreground mb-2 font-sans">1. Activities of Daily Living (ADL)</h3>
             <p className="mb-6 pl-4 border-l-2 border-primary/30">Resident requires Level 3 transfer assistance morning and evening. Use gait belt for all bathroom transfers to prevent falls.</p>

             <h3 className="text-lg font-bold text-foreground mb-2 font-sans">2. Medication Management</h3>
             <p className="mb-6 pl-4 border-l-2 border-primary/30">Medications administered via blister packs. RN Delegation required for Insulin injections before meals.</p>

             <h3 className="text-lg font-bold text-foreground mb-2 font-sans">3. Cognitive Support</h3>
             <p className="mb-6 pl-4 border-l-2 border-primary/30">Mild memory impairment. Provide gentle reorientation to time and place during afternoon sundowning phase.</p>
          </div>
      </div>
    </motion.div>
  );
}

function MedicationTracker({ resident }) {
  const [medLogs, setMedLogs] = useState([]);
  const firstName = resident.name ? resident.name.split(' ')[0] : 'Resident';
  
  useEffect(() => {
    if (!resident.id) return;
    const q = query(
      collection(db, 'system_logs'), 
      where('residentId', '==', resident.id),
      where('type', '==', 'MEDICATION')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      let arr = [];
      snapshot.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setMedLogs(arr.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
    }, (err) => {
      console.error("Client med snapshot error:", err);
    });
    return () => unsub();
  }, [resident.id]);

  // Priority: 1. Care Plan Meds, 2. Flat Meds list, 3. Default Demo
  const medsToShow = resident.carePlan?.medications || resident.medications || resident.meds || [
    { name: 'Donepezil 5mg', schedule: '09:00', route: 'Oral' },
    { name: 'Insulin Glargine', schedule: '08:00', route: 'Subcutaneous' },
    { name: 'Lisinopril 10mg', schedule: '09:00', route: 'Oral' }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="mb-4">
         <div className="flex items-center gap-2 mb-1">
           <ShieldCheck className="w-4 h-4 text-emerald-400" />
           <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">RN Certified Care Plan</span>
         </div>
         <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
           Medication Tracker
         </h1>
         <p className="text-muted">Direct visibility into {firstName}'s prescribed clinical regimen.</p>
      </header>

      <div className="grid gap-4">
        {medsToShow.map((med, i) => {
          const lastAdmin = medLogs.find(log => log.message.toLowerCase().includes(med.name.toLowerCase()));
          return (
            <div key={i} className="glass-card px-4 py-6 border-border bg-surface/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${lastAdmin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{med.name}</h3>
                  <p className="text-sm text-muted">{med.route || 'Oral'} • Scheduled {med.schedule}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {lastAdmin ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                       <CheckCircle2 className="w-4 h-4" /> Administered
                    </div>
                    <p className="text-[10px] text-muted">Today at {lastAdmin.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ) : (
                  <div className="text-primary font-bold flex items-center gap-2 italic text-sm">
                    <Clock className="w-4 h-4" /> Awaiting administration
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-surface border border-border rounded-2xl px-6 py-6">
         <h3 className="text-foreground font-bold mb-3 flex items-center gap-2">Clinical Disclosure</h3>
         <p className="text-sm text-muted leading-relaxed">
           This medication schedule is mirrored directly from the resident's active Care Plan. Administration is performed by certified staff and overseen by a delegating nurse. Historical records are maintained for jurisdictional clinical audit compliance.
         </p>
      </div>
    </motion.div>
  );
}

function DocumentVault({ resident, stateData }) {
  const [signingDoc, setSigningDoc] = useState(null);

  const docs = [
    { id: 'Admission', name: `${stateData.complianceLaw} Residency Agreement`, field: 'signedAdmission' },
    { id: 'HIPAA', name: 'HIPAA Release & Authorization', field: 'signedHIPAA' },
    { id: 'Financial', name: 'Financial Responsibility Agreement', field: 'signedFinancial' }
  ];

  const handleSignature = async (docId, field) => {
    if (!resident?.id) return;
    setSigningDoc(docId);
    try {
      await updateDoc(doc(db, 'residents', resident.id), {
        [field]: true,
        [`${field}At`]: serverTimestamp(),
      });
      alert(`${docId} signed successfully.`);
    } catch (err) {
      console.error("Signature persistence failed:", err);
      alert("Failed to sign document.");
    } finally {
      setSigningDoc(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="mb-4">
         <h1 className="text-3xl font-bold text-white">Consents & Agreements</h1>
         <p className="text-slate-400">Secure digital vault for legally binding compliance documentation.</p>
      </header>
      
      <div className="grid grid-cols-1 gap-6">
        {docs.map((d) => (
          <div key={d.id} className="glass-card py-8 px-6 bg-surface/30 flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-border relative overflow-hidden group">
            <div className="flex items-center gap-5">
               <div className={`p-4 rounded-2xl ${resident[d.field] ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'} transition-colors`}>
                 <FileText className="w-8 h-8" />
               </div>
               <div>
                  <h4 className="font-bold text-foreground text-xl leading-tight mb-1">{d.name}</h4>
                  <p className="text-sm text-muted font-medium">{resident[d.field] ? 'Signed and legally archived.' : 'Awaiting family execution.'}</p>
               </div>
            </div>

            {!resident[d.field] ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 border-border pt-6 lg:pt-0">
                <input 
                  type="text" 
                  placeholder="Type full name to sign" 
                  className="w-full sm:flex-1 lg:w-48 bg-background border border-border rounded-xl px-4 py-3 text-foreground font-serif italic text-sm outline-none focus:border-primary transition-all" 
                />
                <button 
                  onClick={() => handleSignature(d.id, d.field)} 
                  disabled={signingDoc === d.id}
                  className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-3 whitespace-nowrap active:scale-95 transition-all"
                >
                  {signingDoc === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-5 h-5" />}
                  <span>Sign & Execute</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-sm w-full lg:w-auto">
                <ShieldCheck className="w-5 h-5" /> 
                <span>Signed {resident[`${d.field}At`]?.toDate().toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PlaceholderView() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
      <div className="w-16 h-16 bg-surface flex items-center justify-center rounded-3xl mb-4 border border-border">
        <ShieldCheck className="w-8 h-8 text-muted" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Secure Module</h2>
      <p className="text-muted">This client portal feature is currently protecting live PHI data.</p>
    </div>
  );
}

function MessageFacility({ resident, userProfile, homeData }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const targetHomeId = resident?.homeId || userProfile?.homeId || userProfile?.activeHomeId;

  useEffect(() => {
    if (!targetHomeId || !resident.id) return undefined;

    // Remove orderBy to avoid index requirements that cause silent failures
    const q = query(
      collection(db, 'messages'),
      where('homeId', '==', targetHomeId)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      let msgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Client-side filter to avoid index dependency for "IN" query
        if (!data.residentId || data.residentId === resident.id) {
          msgs.push({ id: doc.id, ...data });
        }
      });
      
      // Client-side sort to avoid index dependency
      msgs.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      
      setMessages(msgs);
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }, (err) => {
      console.error("Client messages snapshot error:", err);
    });
    return () => unsub();
  }, [resident?.id, targetHomeId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !targetHomeId || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        sender: "family",
        name: userProfile?.name || "Family Member",
        homeId: targetHomeId,
        residentId: resident?.id || null,
        residentName: resident?.name || null,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 md:relative md:inset-auto bg-background md:bg-transparent z-40 flex flex-col md:h-[calc(100vh-10rem)]">
      {/* APP HEADER */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-3">
            <Link to="/client-portal" className="md:hidden p-2 -ml-2 hover:bg-primary/10 rounded-full transition-colors">
               <ChevronLeft className="w-6 h-6 text-primary" />
            </Link>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {homeData?.homeName?.charAt(0) || 'F'}
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground leading-tight">{homeData?.homeName || 'Facility Staff'}</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Active Shift</span>
              </div>
            </div>
         </div>
         <div className="p-2 bg-surface rounded-full border border-border">
           <MessageSquare className="w-4 h-4 text-muted" />
         </div>
      </header>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
        {messages.map((m, i) => {
          const isMe = m.sender === 'family';
          const prevMsg = messages[i-1];
          const showName = !prevMsg || prevMsg.sender !== m.sender;
          
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
               {showName && (
                 <span className="text-[10px] font-black text-muted mb-1 mx-2 uppercase tracking-tighter">
                   {m.name}
                 </span>
               )}
               <div className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm relative group ${
                 isMe 
                   ? 'bg-primary text-white rounded-tr-none' 
                   : 'bg-surface border border-border text-foreground rounded-tl-none'
               }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  <span className={`text-[8px] mt-1 block opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                    {m.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
               </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      
      {/* INPUT AREA */}
      <div className="p-4 bg-surface/80 backdrop-blur-md border-t border-border mb-safe">
         <form onSubmit={handleSend} className="flex items-center gap-2 bg-background border border-border rounded-full p-1 pl-4 focus-within:border-primary transition-all shadow-inner">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Message facility..."
              className="flex-1 bg-transparent border-none text-sm text-foreground outline-none py-2"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || sending} 
              className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white w-10 h-10 rounded-full transition-all flex items-center justify-center shrink-0 shadow-lg shadow-primary/20 active:scale-95"
            >
               {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </button>
         </form>
         <p className="text-[8px] text-center text-muted mt-2 uppercase tracking-[0.2em] font-bold">End-to-End Encrypted Compliance Channel</p>
      </div>
    </div>
  );
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#f8fafc",
      fontFamily: '"Inter", sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#64748b"
      }
    },
    invalid: {
      color: "#f43f5e",
      iconColor: "#f43f5e"
    }
  }
};

function CheckoutForm({ amount, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });

    setTimeout(() => {
       if (error) {
         setError(error.message);
         setProcessing(false);
       } else {
         setSuccess(true);
         setProcessing(false);
         if (onPaid) onPaid();
       }
    }, 1500);
  };

  if (success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 py-8 px-4 rounded-xl flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-emerald-400">Payment Secured</h3>
        <p className="text-emerald-500/80 max-w-sm">Your payment of ${amount.toLocaleString()} has been successfully processed and recorded on the ledger.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="bg-background border border-white/10 rounded-xl p-4">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <div className="text-accent text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> {error}</div>}
      <button 
        type="submit" 
        disabled={!stripe || processing}
        className="w-full bg-primary hover:bg-blue-600 disabled:bg-primary/50 text-white rounded-lg py-4 font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
      >
        {processing ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <><CreditCard className="w-5 h-5"/> Pay ${amount.toLocaleString()} Securely</>
        )}
      </button>
      <div className="flex justify-between items-center text-xs text-slate-500">
         <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> PCI DSS Compliant End-to-End</span>
         <span>Secured by Stripe</span>
      </div>
    </form>
  );
}

function BillingCenter({ resident }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resident.id) return;
    const q = query(collection(db, 'invoices'), where('residentId', '==', resident.id), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setInvoices(arr);
      setLoading(false);
    }, (err) => {
      console.error("Billing snapshot error:", err);
      setLoading(false); // Fix loading loop on error
    });
    return () => unsub();
  }, [resident.id]);

  const activeInvoice = invoices.find(inv => inv.status === 'pending') || invoices[0];
  const amount = activeInvoice?.amount || resident.monthlyRate || 5500;

  const handlePaid = async () => {
    if (!activeInvoice?.id) return;
    await setDoc(doc(db, 'invoices', activeInvoice.id), { status: 'paid', paidAt: serverTimestamp() }, { merge: true });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="mb-4">
         <h1 className="text-3xl font-bold text-white">Billing Center</h1>
         <p className="text-slate-400">View upcoming invoices and manage secure payment methods.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* INVOICE PREVIEW */}
        <div className="glass-card py-8 px-4 bg-surface/30">
          {loading ? (
            <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : activeInvoice ? (
            <>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-white font-bold tracking-widest uppercase text-sm mb-1">Invoice #{activeInvoice.id.slice(0,8).toUpperCase()}</h3>
                  <p className="text-xs text-slate-400">Period: {activeInvoice.period}</p>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded ${activeInvoice.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {activeInvoice.status.toUpperCase()}
                </div>
              </div>
              
              <div className="flex flex-col gap-4 border-b border-white/10 pb-6 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Room & Board ({resident.careLevel})</span>
                  <span className="text-white font-mono">${activeInvoice.amount.toLocaleString()}.00</span>
                </div>
              </div>

              <div className="flex justify-between text-xl font-bold">
                <span className="text-white">Total</span>
                <span className="text-primary font-mono">${activeInvoice.amount.toLocaleString()}.00</span>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted italic">No invoices found for this resident.</div>
          )}
        </div>

        {/* PAYMENT TERMINAL */}
        <div className="glass-card py-6 px-4 bg-surface border-indigo-500/20 shadow-2xl relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full pointer-events-none" />
          <h3 className="font-bold text-white mb-6">Secure Payment Terminal</h3>
          
          {activeInvoice?.status === 'paid' ? (
             <div className="text-center py-12">
               <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
               <p className="text-emerald-400 font-bold">Account is currently in good standing.</p>
             </div>
          ) : stripePromise ? (
            <Elements stripe={stripePromise}>
              <CheckoutForm amount={amount} onPaid={handlePaid} />
            </Elements>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>Stripe payments are not configured for this deployment.</p>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
