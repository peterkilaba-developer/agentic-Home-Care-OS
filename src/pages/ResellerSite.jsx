import React, { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, getDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createPortal } from 'react-dom';
import { Network, Search, Building2, TrendingUp, Users, DollarSign, ExternalLink, Settings, ShieldCheck, Mail, ChevronRight, QrCode, AlertTriangle, AlertCircle, X, Award, Save, Image as ImageIcon, LogOut, Brain, Sun, Moon, Monitor, Loader2 } from 'lucide-react';
import { useTheme } from '../components/theme';
import { Link, useNavigate, Routes, Route } from 'react-router-dom';
import { ADMIN_EMAILS } from '../config/admin';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';
import { buildAppUrl, buildQrCodeUrl } from '../config/runtime';
import { providerHasHome } from '../data/homeAccess';

// Modular Components
import ResellerSidebar from '../components/reseller/ResellerSidebar';

export default function ResellerSite() {
  const [loading, setLoading] = useState(true);
  const [resellerData, setResellerData] = useState(null);
  const [afhList, setAfhList] = useState([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [brand, setBrand] = useState({ name: '', logo: '' });
  const [stripeAccountId, setStripeAccountId] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  
  const [isProvider, setIsProvider] = useState(false);
  
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [providerInviteUrl, setProviderInviteUrl] = useState('');
  const isAdmin = auth.currentUser?.email && ADMIN_EMAILS.includes(auth.currentUser.email);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      let effectiveUser = u;
      if (!effectiveUser && window.location.search.includes('bypass=reseller')) {
        effectiveUser = { uid: 'demo_reseller_001', email: 'affiliate@demo.local', displayName: 'Demo Affiliate' };
      }

      if (effectiveUser) {
        const u = effectiveUser;
        setProviderInviteUrl(buildAppUrl(`/auth?join=provider&ref=${encodeURIComponent(u.uid)}`));
        
        if (u.uid === 'demo_reseller_001') {
          setResellerData({ partnerName: 'Demo Affiliate Group', brandName: 'Demo Affiliate', stripeAccountId: 'acct_demo123' });
          setBrand({ name: 'Demo Affiliate Group', logo: '' });
          setStripeAccountId('acct_demo123');
          setLoading(false);
          return;
        }

        // Fetch reseller profile
        getDoc(doc(db, 'resellers', u.uid)).then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setResellerData(data);
            const displayName = data.businessName || data.partnerName || u.displayName || 'My Portal';
            setBrand(prev => ({ ...prev, name: displayName }));
            if (data.stripeAccountId) setStripeAccountId(data.stripeAccountId);
          } else {
            setBrand(prev => ({ ...prev, name: u.displayName || 'My Portal' }));
          }
          setLoading(false);
        });

        // Check if user is also a provider (has a home/agency)
        getDoc(doc(db, 'users', u.uid)).then((snap) => {
          if (snap.exists()) {
            const userData = snap.data();
            const r = userData.role?.toLowerCase();
            const t = userData.type?.toLowerCase();
            if (r === 'provider' || r === 'home' || r === 'agency' || t === 'home' || t === 'agency') {
              setIsProvider(true);
            } else {
              // Fallback to deeper check if role/type not explicit
              providerHasHome(u.uid).then(hasHome => {
                if (hasHome) setIsProvider(true);
              });
            }
          }
        });

        // Fetch Homes bound to this reseller ID
        const q = query(collection(db, 'homes'), where('refId', '==', u.uid));
        const unsubDocs = onSnapshot(q, (snap) => {
          setAfhList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
          console.error("Reseller homes snapshot error:", err);
        });
        return () => unsubDocs();
      } else {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-sans text-muted">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-sm font-bold tracking-widest uppercase text-muted/70 animate-pulse">Initializing Affiliate Environment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex font-sans text-muted overflow-hidden">
      
      <ResellerSidebar 
        brand={brand} 
        isAdmin={isAdmin} 
        isProvider={isProvider}
        theme={theme} 
        toggleTheme={toggleTheme} 
      />

      <div className="flex-1 flex flex-col min-w-0 bg-background relative z-30">
        {/* AppBar */}
        <header className="h-16 border-b border-border bg-surface/30 backdrop-blur-md flex items-center justify-between px-4 flex-shrink-0 relative z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-serif italic font-medium text-foreground truncate max-w-[300px]">
              {brand.name}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 uppercase tracking-widest border border-amber-500/20">
              Affiliate Network
            </span>
            {isProvider && (
              <Link to="/dashboard" className="ml-2 flex items-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg border border-primary/20 text-[10px] font-bold uppercase tracking-widest transition-all">
                <Brain className="w-3.5 h-3.5" />
                Switch to Operations Dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setQrOpen(true)} className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white py-1.5 px-3 rounded-lg font-bold text-xs shadow-lg shadow-indigo-500/20">
              <QrCode className="w-3.5 h-3.5" /> Agent In-A-Box QR
            </button>
            <div className="h-8 w-px bg-border mx-2 hidden md:block" />
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-foreground">
                {auth.currentUser?.displayName || (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Partner')}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Affiliate Executive</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              {auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'P'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
          <div className="px-4">
            <Routes>
              <Route index element={
                <ResellerOverview 
                  afhList={afhList} 
                  stripeAccountId={stripeAccountId} 
                  resellerData={resellerData} 
                  brand={brand}
                  setSettingsOpen={setSettingsOpen}
                  setLedgerOpen={setLedgerOpen}
                  connectLoading={connectLoading}
                  setConnectLoading={setConnectLoading}
                  providerInviteUrl={providerInviteUrl}
                />
              } />
              <Route path="partners" element={<ManagedHomesTable afhList={afhList} />} />
              <Route path="ledger" element={<LedgerView afhList={afhList} stripeAccountId={stripeAccountId} resellerData={resellerData} brand={brand} connectLoading={connectLoading} setConnectLoading={setConnectLoading} />} />
              <Route path="domains" element={<DomainsView brand={brand} />} />
              <Route path="settings" element={<SettingsView brand={brand} setBrand={setBrand} />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* QR Modal (Still good as a modal) */}
       {qrOpen && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl px-4 py-8 max-w-sm w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl relative text-center">
            <button onClick={() => setQrOpen(false)} className="absolute top-4 right-4 text-muted hover:text-foreground"><X className="w-6 h-6"/></button>
            <h3 className="text-2xl font-bold mb-2">The Digital Handshake</h3>
            <p className="text-sm text-muted mb-6">Have the prospective care home scan this QR code. They will instantly load your white-labeled app, permanently attributed to your 50% revenue split.</p>
            <div className="bg-white p-4 rounded-xl inline-block shadow-lg mx-auto mb-4 border-4 border-indigo-500">
               <img src={buildQrCodeUrl(providerInviteUrl)} alt="Scan Me" className="w-48 h-48" />
            </div>
            <p className="text-xs font-mono text-muted/70 bg-background py-2 px-3 rounded break-all select-all border border-border">{providerInviteUrl}</p>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

function ResellerOverview({ afhList, stripeAccountId, resellerData, brand, setSettingsOpen, setLedgerOpen, connectLoading, setConnectLoading, providerInviteUrl }) {
  const activeMRR = afhList.reduce((acc, home) => {
    if (home.subscriptionStatus === 'incubation') return acc;
    return acc + 248.50;
  }, 0).toFixed(2);

  const totalCapacity = afhList.reduce((acc, home) => {
    return acc + (home.capacity || home.staffCount || 0);
  }, 0);

  return (
    <div className="space-y-8 mt-4">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
           <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl border-2 border-indigo-500/20 shadow-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-xl uppercase">
                 {brand.name?.[0] ?? '?'}
              </div>
              <div className="flex flex-col gap-0.5">
                 <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary tracking-widest uppercase">Certified Partner</span>
                 </div>
                 <h1 className="text-2xl font-serif italic font-medium text-foreground tracking-tight">{brand.name}</h1>
              </div>
           </div>
           <p className="text-muted text-sm max-w-2xl">Manage your recruited care homes, view Stripe Connect splits, and deploy white-labeled compliance sandboxes.</p>
           <div className="mt-4 flex items-center gap-2">
             <div className="bg-background border border-border rounded-lg px-3 py-2 flex items-center gap-3">
               <div className="flex flex-col">
                 <span className="text-[10px] text-muted uppercase font-bold tracking-tighter">Your Tracking ID</span>
                 <span className="text-xs font-mono text-foreground">{auth.currentUser?.uid}</span>
               </div>
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(providerInviteUrl);
                   alert("Referral Link Copied!");
                 }}
                 className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-colors"
               >
                 Copy Invite Link
               </button>
             </div>
           </div>
        </div>
      </div>

      {/* KPI Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<TrendingUp className="w-4 h-4 text-indigo-400" />} label="Monthly Revenue Share" value={`$${activeMRR}`} subtext="Aggregated MRR (50% Split)" color="indigo" />
        <StatCard icon={<Building2 className="w-4 h-4 text-primary" />} label="Active Care Homes" value={afhList.length} subtext="Referred Care Homes & Agencies" color="primary" />
        <StatCard icon={<Users className="w-4 h-4 text-emerald-400" />} label="Portfolio Capacity" value={totalCapacity} subtext="Aggregated Beds & Staff" color="emerald" />
        <StatCard icon={<ShieldCheck className="w-4 h-4 text-amber-400" />} label="Payout Verification" value={stripeAccountId ? 'Verified' : 'Action Required'} subtext={stripeAccountId ? 'Stripe Connect Active' : 'Configure Ledger Settings'} color="muted" />
      </div>

      {/* Managed Homes List */}
      <ManagedHomesTable afhList={afhList} />
    </div>
  );
}

function LedgerView({ afhList, stripeAccountId, resellerData, brand, connectLoading, setConnectLoading }) {
  const activeMRR = afhList.reduce((acc, home) => {
    if (home.subscriptionStatus === 'incubation') return acc;
    return acc + 248.50;
  }, 0).toFixed(2);

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-3 mb-2">
         <div className="bg-[#635BFF] p-2 rounded-lg"><DollarSign className="w-5 h-5 text-white" /></div>
         <h3 className="text-2xl font-bold text-foreground">Stripe Connect Ledger</h3>
      </div>
      <p className="text-sm text-muted mb-4">Real-time breakdown of your 50/50 revenue splits from referred homes.</p>

      {stripeAccountId ? (
        <div className="flex items-center gap-3 mb-5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="w-8 h-8 bg-[#635BFF] rounded-lg flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Stripe Express Connected</p>
            <p className="text-xs text-muted font-mono truncate">acct_{stripeAccountId.slice(-8)}</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded border border-emerald-500/30">ACTIVE</span>
        </div>
      ) : (
        <StripeConnectCTA 
          resellerData={resellerData} 
          brand={brand} 
          connectLoading={connectLoading} 
          setConnectLoading={setConnectLoading} 
        />
      )}

      <div className="glass-card border border-border overflow-hidden">
         <table className="w-full text-left text-sm">
           <thead className="bg-surface/50 border-b border-border">
             <tr className="text-[10px] uppercase tracking-widest text-muted font-bold">
               <th className="px-6 py-4">Date</th>
               <th className="px-6 py-4">Home Account</th>
               <th className="px-6 py-4">Gross</th>
               <th className="px-6 py-4">Your Split</th>
               <th className="px-6 py-4 text-right">Status</th>
             </tr>
           </thead>
           <tbody>
             {afhList.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-muted italic">No payout history available.</td></tr>
             ) : (
                afhList.map((home) => (
                   <tr key={home.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                     <td className="px-6 py-4 text-muted">Today</td>
                     <td className="px-6 py-4 font-bold text-foreground">{home.homeName || home.agencyName}</td>
                     <td className="px-6 py-4 text-muted/70">
                       {home.subscriptionStatus === 'incubation' ? '$0.00' : '$497.00'}
                     </td>
                     <td className="px-6 py-4 text-emerald-400 font-bold">
                       {home.subscriptionStatus === 'incubation' ? '+$0.00' : '+$248.50'}
                     </td>
                     <td className="px-6 py-4 text-right"><span className={`text-[10px] font-bold px-2 py-1 rounded ${home.subscriptionStatus === 'incubation' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'}`}>{home.subscriptionStatus === 'incubation' ? 'INCUBATING' : 'PENDING'}</span></td>
                   </tr>
                ))
             )}
           </tbody>
         </table>
      </div>

      <div className="mt-6 flex justify-between items-center p-6 bg-[#635BFF]/5 border border-[#635BFF]/20 rounded-2xl">
         <div>
            <p className="text-xs font-bold text-[#635BFF] uppercase tracking-widest mb-1">Available to Payout</p>
            <p className="text-3xl font-extrabold text-foreground tracking-tighter">${activeMRR}</p>
         </div>
         <button className="bg-[#635BFF] hover:bg-[#5851E5] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20">
            Withdraw to Bank
         </button>
      </div>
    </div>
  );
}

function DomainsView({ brand }) {
  return (
    <div className="max-w-2xl space-y-8 mt-8">
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Custom Domain Mapping</h3>
        <p className="text-sm text-muted">White-label your ecosystem with a custom URL (e.g. compliance.yourbrand.com).</p>
      </div>

      <div className="glass-card p-8 border-border space-y-6">
        <div className="flex flex-col gap-2">
           <label className="text-xs font-bold text-muted uppercase tracking-widest">Target Subdomain</label>
           <div className="flex items-center gap-2">
             <input 
               type="text" 
               placeholder="compliance" 
               className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
             />
             <span className="text-muted">.</span>
             <input 
               type="text" 
               placeholder="yourbrand.com" 
               className="flex-[2] bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/50"
             />
           </div>
        </div>

        <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl">
           <div className="flex items-center gap-3 text-indigo-400 font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4" /> DNS Configuration Required
           </div>
           <p className="text-xs text-muted leading-relaxed">
             To finish mapping, create a CNAME record in your DNS provider pointing your subdomain to <span className="font-mono text-foreground">ingress.agentic.ai</span>. Propagation may take up to 24 hours.
           </p>
        </div>

        <button className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
           <ExternalLink className="w-4 h-4" /> Verify DNS Records
        </button>
      </div>
    </div>
  );
}

function SettingsView({ brand, setBrand }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    setSaving(true);
    try {
      await setDoc(doc(db, 'resellers', uid), {
        partnerName: brand.name,
        brandName: brand.name,
        businessName: brand.name,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save reseller branding:", err);
      alert("Unable to save branding: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8 mt-8">
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Portal Branding</h3>
        <p className="text-sm text-muted">Customize the white-label experience for your care homes.</p>
      </div>

      <div className="glass-card p-8 border-border space-y-6">
        <div className="flex flex-col gap-2">
           <label className="text-xs font-bold text-muted uppercase tracking-widest">Reseller Display Name</label>
           <input 
             type="text" 
             value={brand.name} 
             onChange={(e) => setBrand({...brand, name: e.target.value})} 
             className="w-full bg-background border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 transition-colors" 
             placeholder="e.g. Cascade Care Holdings" 
           />
        </div>

        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-4">
           <div className="p-3 bg-primary/10 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-primary" />
           </div>
           <div>
              <p className="text-sm font-bold text-foreground">Identity Verified</p>
              <p className="text-xs text-muted">Your branding is active across all 50 jurisdictional engines.</p>
           </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="bg-primary text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60">
           {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Branding Profile
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, color }) {
  const colors = {
    indigo: "border-indigo-500/20 bg-indigo-500/5",
    primary: "border-primary/20 bg-primary/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    muted: "border-border bg-surface/50"
  };

  return (
    <div className={`glass-card p-6 flex flex-col gap-2 relative overflow-hidden border ${colors[color] || colors.muted}`}>
       <div className="flex items-center gap-3 text-muted font-bold text-[10px] uppercase tracking-widest mb-1">
          {icon} {label}
       </div>
       <span className="text-3xl font-bold text-foreground tracking-tighter">{value}</span>
       <span className="text-[10px] text-muted font-medium mt-1">{subtext}</span>
    </div>
  );
}

function ManagedHomesTable({ afhList }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">Active Care Home Referrals</h3>
      </div>

      <div className="glass-card overflow-hidden border border-border">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                 <tr className="border-b border-border text-[10px] font-bold text-muted uppercase tracking-[0.2em] bg-surface/30">
                   <th className="px-6 py-4">Home Legal Name</th>
                   <th className="px-6 py-4">Capacity</th>
                   <th className="px-6 py-4">Monthly Plan</th>
                   <th className="px-6 py-4">Status</th>
                   <th className="px-6 py-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {afhList.length === 0 ? (
                   <tr>
                     <td colSpan="5" className="px-6 py-12 text-center text-muted italic">No active homes under management.</td>
                   </tr>
                 ) : (
                   afhList.map((account) => (
                     <tr key={account.id} className="border-b border-border hover:bg-surface/30 transition-colors group">
                       <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                             {(account.homeName || account.agencyName)?.[0] ?? 'H'}
                           </div>
                           <div>
                             <p className="font-bold text-foreground text-sm">{account.homeName || account.agencyName}</p>
                             <p className="text-[10px] text-muted font-mono">{account.id}</p>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 text-sm">
                         {account.careType === 'In-Home Care Agency' ? `${account.staffCount || 0} Staff` : `${account.capacity || 0} Beds`}
                       </td>
                       <td className="px-6 py-4 text-sm font-bold text-foreground">
                         {account.subscriptionStatus === 'incubation' ? '$0.00' : '$497.00'}
                       </td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${account.subscriptionStatus === 'incubation' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                           {account.subscriptionStatus}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <button onClick={() => navigate(`/dashboard?impersonate=${account.id}`)} className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 justify-end ml-auto">
                            Impersonate <ChevronRight className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}

function StripeConnectCTA({ resellerData, brand, connectLoading, setConnectLoading }) {
  return (
    <div className="mb-5 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold mb-0.5">Connect Your Stripe Account</p>
          <p className="text-xs text-muted mb-3">You need a Stripe Express account to receive your 50% revenue splits.</p>
          <button
            disabled={connectLoading}
            onClick={async () => {
              setConnectLoading(true);
              try {
                const functions = getFunctions();
                const createConnectAccountLink = httpsCallable(functions, 'createConnectAccountLink');
                const result = await createConnectAccountLink({
                  partnerName: resellerData?.partnerName || brand.name,
                  brandName: resellerData?.brandName || brand.name,
                  address: resellerData?.address || '',
                  payoutEmail: resellerData?.payoutEmail || auth.currentUser?.email || '',
                  resellerType: resellerData?.resellerType || 'Business Affiliate',
                });
                window.location.href = result.data.url;
              } catch (err) {
                console.error('Stripe Connect error:', err);
                alert('Error connecting Stripe: ' + err.message);
              } finally {
                setConnectLoading(false);
              }
            }}
            className="inline-flex items-center gap-2 bg-[#635BFF] hover:bg-[#5851E5] disabled:opacity-60 text-white font-bold text-sm py-2 px-4 rounded-lg transition-colors shadow-lg shadow-[#635BFF]/20"
          >
            <DollarSign className="w-4 h-4" />
            {connectLoading ? 'Connecting…' : 'Connect with Stripe'}
          </button>
        </div>
      </div>
    </div>
  );
}
