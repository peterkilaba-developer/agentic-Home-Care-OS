import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Activity, Shield, Users, FileText, Settings, LogOut, Layout, Network, MessageSquare, FileCheck, Briefcase, Clock, DollarSign, Sun, Moon } from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, serverTimestamp, query, getDoc, where, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';
import { extractStateCode } from '../utils/compliance';
import { ADMIN_EMAILS } from '../config/admin';
import { useTheme } from '../components/theme';

// Modular Components
import Sidebar from '../components/dashboard/Sidebar';
import TrialBanner from '../components/dashboard/TrialBanner';
import HomeOverview from '../components/dashboard/Overview';
import WACComplianceView from '../components/dashboard/Compliance';
import ResidentRosterView from '../components/dashboard/Roster';
import IntakePipelineView from '../components/dashboard/Pipeline';
import SystemActivityLogsView from '../components/dashboard/Logs';
import StateFormsView from '../components/dashboard/Forms';
import HomeProfileView from '../components/dashboard/Settings';
import { StaffHRView, TimeEVVView, BillingView, FamilyAccessView } from '../components/dashboard/Operations';
import BusinessOverview from '../components/dashboard/BusinessOverview';
import { isLocalDemoEnabled, DEMO_USER, readLocalDemoState, writeLocalDemoState } from '../data/localDemo';
import { recordImpersonationEvent } from '../utils/impersonationAudit';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasResellerProfile, setHasResellerProfile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const searchParams = new URLSearchParams(location.search);
  const impersonatingId = searchParams.get('impersonate');
  const normalizedDashboardPath = location.pathname.replace(/\/$/, '');
  const isDashboardIndexRoute = normalizedDashboardPath === '/dashboard';

  // State Management
  const [myHomes, setMyHomes] = useState([]);
  const [selectedHomeId, setSelectedHomeId] = useState(null);
  const [activeHomeId, setActiveHomeId] = useState(null);
  const [businessData, setBusinessData] = useState(null);
  const [residents, setResidents] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [logs, setLogs] = useState([]);
  const [homeData, setHomeData] = useState(null);
  const [homeName, setHomeName] = useState('My Facility');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u && isLocalDemoEnabled()) {
        setUser(DEMO_USER);
        setLoading(false);
      } else {
        setUser(u);
        if (!u) setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);
  const effectiveImpersonatingId = isAdmin ? impersonatingId : null;
  const activeWorkspaceHomeId = effectiveImpersonatingId || selectedHomeId || activeHomeId;

  useEffect(() => {
    if (!isAdmin || !impersonatingId || !user?.uid) return;
    recordImpersonationEvent({
      actorUid: user.uid,
      actorEmail: user.email,
      targetUid: impersonatingId,
      source: 'dashboard',
    });
  }, [isAdmin, impersonatingId, user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid) return;
    
    if (isLocalDemoEnabled()) {
      const demoState = readLocalDemoState();
      setMyHomes(demoState.myHomes || []);
      setBusinessData(demoState.businessData);
      if (demoState.myHomes?.length > 0 && !selectedHomeId) {
        setSelectedHomeId(demoState.myHomes[0].id);
      }
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'homes'), where('ownerId', '==', effectiveImpersonatingId || user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const homes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyHomes(homes);
      if (homes.length > 0 && !selectedHomeId) {
        setSelectedHomeId(homes[0].id);
      }
      setLoading(false);
    }, (err) => {
      console.error("Facility snapshot error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, effectiveImpersonatingId]);

  useEffect(() => {
    if (!activeWorkspaceHomeId) return;

    if (isLocalDemoEnabled()) {
      const demoState = readLocalDemoState();
      const found = demoState.myHomes?.find(h => h.id === activeWorkspaceHomeId) || demoState.homeData;
      if (found) {
        setHomeData(found);
        setHomeName(found.homeName || found.agencyName || 'My Facility');
      }
      return;
    }

    const unsub = onSnapshot(doc(db, 'homes', activeWorkspaceHomeId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setHomeData({ id: snap.id, ...data });
        setHomeName(data.homeName || data.agencyName || 'My Facility');
      }
    }, (err) => {
      console.error("Home data snapshot error:", err);
    });
    return () => unsub();
  }, [activeWorkspaceHomeId]);

  useEffect(() => {
    if (!activeWorkspaceHomeId) return;
    
    if (isLocalDemoEnabled()) {
      const demoState = readLocalDemoState();
      setResidents(demoState.residents || []);
      setPipeline(demoState.pipeline || []);
      return;
    }

    const qR = query(collection(db, 'residents'), where('homeId', '==', activeWorkspaceHomeId));
    const unsubR = onSnapshot(qR, (s) => setResidents(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qP = query(collection(db, 'intake_pipeline'), where('homeId', '==', activeWorkspaceHomeId));
    const unsubP = onSnapshot(qP, (s) => setPipeline(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubR(); unsubP(); };
  }, [activeWorkspaceHomeId]);

  useEffect(() => {
    const handleRefresh = () => {
      if (isLocalDemoEnabled()) {
        const demoState = readLocalDemoState();
        setResidents(demoState.residents || []);
        setPipeline(demoState.pipeline || []);
      }
    };
    window.addEventListener('demo-refresh', handleRefresh);
    return () => window.removeEventListener('demo-refresh', handleRefresh);
  }, []);

  const createSystemLog = async (type, message, residentId = null, residentName = null) => {
    if (!activeWorkspaceHomeId) return;
    
    if (isLocalDemoEnabled()) {
      const demoState = readLocalDemoState();
      const newLog = {
        id: `log_${Date.now()}`,
        homeId: activeWorkspaceHomeId,
        type,
        message,
        residentId,
        residentName,
        createdAt: new Date().toISOString()
      };
      writeLocalDemoState({
        ...demoState,
        logs: [newLog, ...(demoState.logs || [])]
      });
      setLogs(prev => [newLog, ...prev]);
      return;
    }

    try {
      await addDoc(collection(db, 'system_logs'), {
        homeId: activeWorkspaceHomeId,
        type,
        message,
        residentId,
        residentName,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("[DASHBOARD] Log creation failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-xs font-bold tracking-widest uppercase opacity-40 animate-pulse">Initializing Secure Workspace...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const activeStateCode = extractStateCode(homeData);
  const currentStateData = US_STATES[activeStateCode] || DEFAULT_STATE;

  return (
    <div className="min-h-screen bg-background flex font-sans text-foreground overflow-hidden">
      <Sidebar
        businessData={businessData}
        myHomes={myHomes}
        selectedHomeId={selectedHomeId}
        setSelectedHomeId={setSelectedHomeId}
        isAdmin={isAdmin}
        hasResellerProfile={hasResellerProfile}
        impersonatingId={effectiveImpersonatingId}
        theme={theme}
        toggleTheme={toggleTheme}
        isAgency={homeData?.careType?.includes('Agency')}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-30">
        <header className="h-16 border-b border-border bg-surface/30 backdrop-blur-md flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-serif italic font-medium">{homeName}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shadow-inner">
              {user.email.charAt(0)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 bg-background/50">
          <AnimatePresence mode="wait">
            <Routes>
              <Route index element={
                selectedHomeId ? (
                  <HomeOverview 
                    residents={residents} 
                    stateData={currentStateData} 
                    homeName={homeName} 
                    homeData={homeData} 
                  />
                ) : (
                  <BusinessOverview 
                    myHomes={myHomes} 
                    businessData={businessData} 
                    setSelectedHomeId={setSelectedHomeId} 
                    navigate={navigate} 
                  />
                )
              } />
              <Route path="roster" element={<ResidentRosterView residents={residents} stateData={currentStateData} homeData={homeData} />} />
              <Route path="intake" element={
                <IntakePipelineView 
                  pipeline={pipeline} 
                  stateData={currentStateData} 
                  homeData={homeData} 
                  residents={residents} 
                  createSystemLog={createSystemLog}
                  selectedHomeId={activeWorkspaceHomeId}
                />
              } />
              <Route path="compliance" element={<WACComplianceView stateData={currentStateData} residents={residents} homeData={homeData} />} />
              <Route path="logs" element={<SystemActivityLogsView stateData={currentStateData} homeData={homeData} />} />
              <Route path="forms" element={<StateFormsView stateData={currentStateData} homeData={homeData} residents={residents} />} />
              <Route path="hr" element={<StaffHRView homeData={homeData} createSystemLog={createSystemLog} />} />
              <Route path="evv" element={<TimeEVVView homeData={homeData} createSystemLog={createSystemLog} />} />
              <Route path="billing" element={<BillingView homeData={homeData} residents={residents} stateData={currentStateData} createSystemLog={createSystemLog} />} />
              <Route path="family" element={<FamilyAccessView homeData={homeData} residents={residents} />} />
              <Route path="settings" element={<HomeProfileView homeData={homeData} stateData={currentStateData} residents={residents} />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>

  );
}
