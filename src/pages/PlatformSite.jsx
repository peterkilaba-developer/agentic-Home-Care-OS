import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Settings, Activity, TrendingUp, Users, Shield, DownloadCloud, Server, Database, Brain, Menu, X, Box, LogOut, Building2, Network, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../components/theme';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

export default function PlatformSite() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex font-serif text-foreground">
      
      {/* SIDEBAR NAVIGATION */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-surface/80 border-r border-border transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 z-50 flex flex-col py-6`}>
        <div className="w-full px-4 mb-8 flex justify-between items-center">
          <Link to="/" className="text-xl font-sans font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="text-primary w-6 h-6" />
            <span>Agentic <span className="text-primary font-light">Home Care OS</span></span>
          </Link>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-muted"><X className="w-6 h-6" /></button>
        </div>

        <nav className="flex flex-col gap-1 px-2">
          <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-2 px-4">Super Admin</h4>
          <NavButton to="/platform" icon={<Activity />} label="Global Overview" active={location.pathname === '/platform' || location.pathname === '/platform/'} />
          <NavButton to="/platform/homes" icon={<Building2 />} label="Platform Homes" active={location.pathname.startsWith('/platform/homes')} />
          <NavButton to="/platform/resellers" icon={<Network />} label="Reseller Network" active={location.pathname.startsWith('/platform/resellers')} />
          <NavButton to="/platform/infrastructure" icon={<Server />} label="Infrastructure" active={location.pathname.startsWith('/platform/infrastructure')} />
        </nav>

        <div className="mt-auto pt-8 border-t border-border px-2 flex flex-col gap-1">
          <Link to="/reseller-portal" className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 shadow-lg shadow-amber-500/10 mb-1">
            <Network className="w-4 h-4" />
            <span>Reseller Portal</span>
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-lg shadow-emerald-500/10 mb-2">
            <Building2 className="w-4 h-4" />
            <span>Provider Dashboard</span>
          </Link>
          <NavButton to="/platform/settings" icon={<Settings />} label="Global Settings" active={location.pathname === '/platform/settings'} />
          
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all text-muted hover:bg-surface-hover hover:text-foreground mt-1"
            title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
          >
            {theme === 'light' && <Sun className="w-4 h-4" />}
            {theme === 'dark' && <Moon className="w-4 h-4" />}
            {theme === 'system' && <Monitor className="w-4 h-4" />}
            <span className="capitalize">{theme} Mode</span>
          </button>

          <button onClick={async () => { await signOut(auth); window.location.href = '/'; }} className="flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all text-rose-400 hover:bg-rose-500/10">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 w-full h-16 bg-surface/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-4">
         <div className="font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400"/> OpComp Network
         </div>
         <button onClick={() => setMobileMenuOpen(true)} className="text-slate-400"><Menu className="w-6 h-6"/></button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 py-8 px-4 h-screen overflow-y-auto relative z-30 bg-background bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-background to-background md:pt-8">
        <div className="max-w-6xl mx-auto">
          <Routes>
            <Route index element={<PlatformOverview />} />
            <Route path="homes" element={<HomesDirectory />} />
            <Route path="resellers" element={<ResellersDirectory />} />
            <Route path="infrastructure" element={<InfrastructureView />} />
            <Route path="settings" element={<PlaceholderSettings />} />
            <Route path="*" element={<Navigate to="/platform" replace />} />
          </Routes>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------
// COMPONENTS
// ---------------------------------------------------------

function NavButton({ to, icon, label, active }) {
  return (
    <Link to={to} className={`flex items-center gap-3 w-full px-4 py-3 text-sm rounded-lg font-bold transition-all ${active ? 'bg-primary/20 text-primary border border-primary/30 shadow-lg' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}>
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
      <span>{label}</span>
    </Link>
  );
}

// ---------------------------------------------------------
// VIEWS
// ---------------------------------------------------------

function PlatformOverview() {
  const [exporting, setExporting] = useState(false);
  const [homes, setHomes] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [residents, setResidents] = useState([]);
  const [intake, setIntake] = useState([]);

  useEffect(() => {
    const unsubHomes = onSnapshot(collection(db, 'homes'), (snap) => {
      setHomes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubResellers = onSnapshot(collection(db, 'resellers'), (snap) => {
      setResellers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubResidents = onSnapshot(collection(db, 'residents'), (snap) => {
      setResidents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubIntake = onSnapshot(collection(db, 'intake_pipeline'), (snap) => {
      setIntake(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubHomes();
      unsubResellers();
      unsubResidents();
      unsubIntake();
    };
  }, []);

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => setExporting(false), 2000);
  };

  const handleToggleBilling = async (row) => {
    try {
      const isSuspended = row.paymentSuspendedUntil && new Date(row.paymentSuspendedUntil) > new Date();
      
      if (isSuspended) {
        await updateDoc(doc(db, 'homes', row.id), {
          paymentSuspendedUntil: null
        });
      } else {
        const suspendedUntil = new Date();
        suspendedUntil.setFullYear(suspendedUntil.getFullYear() + 1);
        await updateDoc(doc(db, 'homes', row.id), {
          paymentSuspendedUntil: suspendedUntil.toISOString()
        });
      }
    } catch (error) {
      console.error("Failed to toggle billing:", error);
    }
  };

  const platformARR = (homes.length * 497 * 12).toLocaleString();

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
      <header>
         <h1 className="text-4xl font-serif italic font-medium text-foreground">Platform Super-Admin</h1>
         <p className="text-muted font-light">Aggregate view across all subscribed homes, resellers, and care homes.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="glass-card py-6 px-4 border-primary/30 bg-gradient-to-t from-primary/20 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.1)]">
           <p className="text-sm text-primary font-bold mb-2 uppercase tracking-wide">Platform ARR</p>
           <h3 className="text-4xl font-extrabold text-foreground">${platformARR}</h3>
           <p className="text-xs text-primary mt-2">Active Stripe Subscriptions</p>
         </div>
         <div className="glass-card py-6 px-4">
           <p className="text-sm text-muted font-bold mb-2 uppercase tracking-wide">Active Resellers</p>
           <h3 className="text-4xl font-extrabold text-foreground">{resellers.length}</h3>
         </div>
         <div className="glass-card py-6 px-4">
           <p className="text-sm text-muted font-bold mb-2 uppercase tracking-wide">Total Homes</p>
           <h3 className="text-4xl font-extrabold text-foreground">{homes.length}</h3>
         </div>
         <div className="glass-card py-6 px-4">
           <p className="text-sm text-muted font-bold mb-2 uppercase tracking-wide">Total Residents</p>
           <h3 className="text-4xl font-extrabold text-foreground">{residents.length}</h3>
         </div>
         <div className="glass-card py-6 px-4 border-emerald-500/20">
           <p className="text-sm text-emerald-500 font-bold mb-2 uppercase tracking-wide">Intake Referrals</p>
           <h3 className="text-4xl font-extrabold text-foreground">{intake.length}</h3>
         </div>
      </div>

      <div className="glass-card py-8 px-4 bg-surface/30 border border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Recent Global Subscriptions</h2>
          <button onClick={handleExport} disabled={exporting} className="text-indigo-400 text-sm font-bold hover:underline py-1 px-3 border border-indigo-400/20 rounded-lg flex items-center gap-2 bg-indigo-500/10 disabled:opacity-50 transition-colors">
            {exporting ? <><DownloadCloud className="w-4 h-4 animate-bounce" /> Exporting...</> : 'Export CSV'}
          </button>
        </div>
        
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-widest text-slate-500 border-b border-white/10">
              <th className="pb-4 font-bold">Account Name</th>
              <th className="pb-4 font-bold">Type</th>
              <th className="pb-4 font-bold">Plan</th>
              <th className="pb-4 font-bold">Status</th>
              <th className="pb-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {homes.length === 0 ? (
               <tr>
                 <td colSpan="5" className="py-8 text-center text-slate-500">
                    No active subscriptions across the platform yet.
                 </td>
               </tr>
            ) : (
               homes.map((row) => (
                 <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                   <td className="py-4 text-white font-bold">{row.homeName || row.agencyName}</td>
                   <td className="py-4 text-slate-400"><span className="bg-surface border border-white/10 px-2 py-1 rounded text-xs">Home Sub-Account</span></td>
                   <td className="py-4 text-slate-400">Founder's ($497)</td>
                   <td className="py-4">
                     <span className={`font-bold px-2 py-1 rounded text-xs ${row.paymentSuspendedUntil && new Date(row.paymentSuspendedUntil) > new Date() ? 'bg-indigo-500/10 text-indigo-400' : row.subscriptionStatus === 'trial' ? 'bg-accent/10 text-accent' : 'bg-emerald-500/10 text-emerald-400'}`}>
                       {row.paymentSuspendedUntil && new Date(row.paymentSuspendedUntil) > new Date() ? 'Suspended (Grace)' : row.subscriptionStatus === 'trial' ? 'Trial' : row.complianceStatus || 'Active'}
                     </span>
                   </td>
                   <td className="py-4 text-right">
                     <button onClick={() => handleToggleBilling(row)} className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${row.paymentSuspendedUntil && new Date(row.paymentSuspendedUntil) > new Date() ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20' : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'}`}>
                       {row.paymentSuspendedUntil && new Date(row.paymentSuspendedUntil) > new Date() ? 'Reactivate Payment' : 'Suspend (12mo)'}
                     </button>
                   </td>
                 </tr>
               ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function HomesDirectory() {
  const [homes, setHomes] = useState([]);

  useEffect(() => {
    const unsubHomes = onSnapshot(collection(db, 'homes'), (snap) => {
      setHomes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubHomes();
  }, []);

  const topLevelHomes = homes.filter(a => !a.refId);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
       <header>
         <h1 className="text-4xl font-serif italic font-medium text-white">Platform Homes</h1>
         <p className="text-slate-400 font-light">Directly onboarded top-level care homes.</p>
       </header>

       <div className="glass-card py-6 px-4 bg-surface/30 border border-white/5">
         <table className="w-full text-left">
           <thead>
             <tr className="text-xs uppercase tracking-widest text-slate-500 border-b border-white/10">
               <th className="pb-4 font-bold">Home Name</th>
               <th className="pb-4 font-bold">State</th>
               <th className="pb-4 font-bold">Status</th>
             </tr>
           </thead>
           <tbody className="text-sm">
             {topLevelHomes.length === 0 ? (
               <tr><td colSpan="3" className="py-8 text-center text-slate-500">No direct platform homes.</td></tr>
             ) : (
               topLevelHomes.map((home) => (
                 <tr key={home.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                   <td className="py-4 text-white font-bold">{home.homeName || home.agencyName}</td>
                   <td className="py-4 text-slate-400 uppercase">{home.state || 'US'}</td>
                   <td className="py-4 text-emerald-400">{home.subscriptionStatus || 'Active'}</td>
                 </tr>
               ))
             )}
           </tbody>
         </table>
       </div>
    </motion.div>
  );
}

function ResellersDirectory() {
  const [homes, setHomes] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [expandedReseller, setExpandedReseller] = useState(null);

  useEffect(() => {
    const unsubHomes = onSnapshot(collection(db, 'homes'), (snap) => {
      setHomes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubResellers = onSnapshot(collection(db, 'resellers'), (snap) => {
      setResellers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubHomes();
      unsubResellers();
    };
  }, []);
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
       <header>
         <h1 className="text-4xl font-serif italic font-medium text-white">Reseller Network</h1>
         <p className="text-slate-400 font-light">Manage the reseller network and their downlines.</p>
       </header>

       <div className="glass-card py-6 px-4 bg-surface/30 border border-white/5">
         <table className="w-full text-left">
           <thead>
             <tr className="text-xs uppercase tracking-widest text-slate-500 border-b border-white/10">
               <th className="pb-4 font-bold">Reseller Brand</th>
               <th className="pb-4 font-bold">Type</th>
               <th className="pb-4 font-bold">Region</th>
               <th className="pb-4 font-bold">Total Referrals</th>
               <th className="pb-4 font-bold text-right">Actions</th>
             </tr>
           </thead>
           <tbody className="text-sm">
             {resellers.length === 0 ? (
               <tr><td colSpan="5" className="py-8 text-center text-slate-500">No resellers registered.</td></tr>
             ) : (
               resellers.map((reseller) => {
                 const referredHomes = homes.filter(a => a.refId === reseller.brandName || a.refId === reseller.id);
                 const isExpanded = expandedReseller === reseller.id;
                 return (
                   <React.Fragment key={reseller.id}>
                     <tr className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setExpandedReseller(isExpanded ? null : reseller.id)}>
                       <td className="py-4 text-white font-bold">{reseller.brandName || reseller.partnerName || 'Unknown Reseller'}</td>
                       <td className="py-4 text-slate-400">{reseller.resellerType || 'Unknown'}</td>
                       <td className="py-4 text-slate-400">{reseller.region || 'N/A'}</td>
                       <td className="py-4 text-slate-400">{referredHomes.length} Homes</td>
                       <td className="py-4 text-right">
                         <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg">{isExpanded ? 'Hide Homes' : 'View Homes'}</span>
                       </td>
                     </tr>
                     {isExpanded && referredHomes.length > 0 && (
                       <tr>
                         <td colSpan="5" className="p-0 border-b border-white/5">
                           <div className="bg-background/50 p-4 pl-12 border-l-4 border-indigo-500/50">
                             <table className="w-full text-left">
                               <thead>
                                 <tr className="text-[10px] uppercase tracking-widest text-slate-500 border-b border-white/10">
                                   <th className="pb-2 font-bold">Home Name</th>
                                   <th className="pb-2 font-bold">Plan</th>
                                   <th className="pb-2 font-bold">Status</th>
                                 </tr>
                               </thead>
                               <tbody className="text-xs">
                                 {referredHomes.map(home => (
                                   <tr key={home.id} className="border-b border-white/5 last:border-0">
                                     <td className="py-2 text-slate-300 font-bold">{home.homeName || home.agencyName}</td>
                                     <td className="py-2 text-slate-500">Founder's ($497)</td>
                                     <td className="py-2 text-emerald-400">{home.subscriptionStatus || 'Active'}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 )
               })
             )}
           </tbody>
         </table>
       </div>
    </motion.div>
  );
}

function InfrastructureView() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
       <header>
         <h1 className="text-3xl font-bold text-white">Infrastructure Health</h1>
         <p className="text-slate-400">NemoKube cluster and LLM token utilization.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="glass-card px-4 py-6 bg-surface/30">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Database className="w-5 h-5 text-indigo-400"/> Database Load</h3>
            <div className="flex flex-col gap-4">
               <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Firestore Reads</span><span className="text-white">Idle</span></div>
                  <div className="w-full bg-background rounded-full h-2"><div className="bg-indigo-400 h-2 rounded-full w-[2%]"></div></div>
               </div>
               <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">Storage IOPS</span><span className="text-white">Idle</span></div>
                  <div className="w-full bg-background rounded-full h-2"><div className="bg-emerald-400 h-2 rounded-full w-[2%]"></div></div>
               </div>
            </div>
         </div>
         <div className="glass-card px-4 py-6 bg-surface/30">
            <h3 className="font-bold text-white flex items-center gap-2 mb-4"><Server className="w-5 h-5 text-accent"/> LLM Token Burn</h3>
            <p className="text-3xl font-bold text-white mb-1">0 <span className="text-sm text-slate-500 font-normal">Tokens / 30d</span></p>
            <p className="text-xs text-slate-400">Total cost: ~$0.00 API utilization</p>
         </div>
      </div>
    </motion.div>
  );
}

function PlaceholderSettings() {
   return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
         <Settings className="w-12 h-12 text-slate-600 mb-4" />
         <h2 className="text-2xl font-bold text-white mb-2">Global Settings</h2>
         <p className="text-slate-500">Configure OAuth scopes, webhooks, and core white-label templates.</p>
      </div>
   );
}
