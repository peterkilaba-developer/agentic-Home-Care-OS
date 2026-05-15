import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldCheck, HeartPulse, FileText, CheckCircle2, X, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';

export default function FamilyPortal() {
  const stateCode = localStorage.getItem('provider_state') || localStorage.getItem('detected_state') || 'us';
  const stateData = US_STATES[stateCode] || DEFAULT_STATE;

  const [activeTab, setActiveTab] = useState('updates'); // 'updates', 'contracts', 'careplan'
  const [familySigned, setFamilySigned] = useState(false);

  return (
 <div className="min-h-screen bg-background font-sans text-slate-300 pb-20 md:pb-0">
      
      {/* MOBILE HEADER */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-white/5 p-4 sticky top-0 z-40 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Family Hub</h1>
          <p className="text-xs text-slate-400">Resident: Anna Davis</p>
        </div>
        <Link to="/" className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold relative">
           AD
           {!familySigned && <span className="absolute top-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-surface"></span>}
        </Link>
      </header>

      {/* MOBILE CHASSIS CONTENT */}
      <main className="p-4 max-w-md mx-auto flex flex-col gap-6 pt-6">
        
        {/* TABS */}
        <div className="flex bg-surface/50 p-1 rounded-lg border border-white/5">
          <button onClick={() => setActiveTab('updates')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'updates' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400'}`}>Updates</button>
          <button onClick={() => setActiveTab('contracts')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'contracts' ? 'bg-primary/20 text-primary shadow-lg' : 'text-slate-400'}`}>
            Contracts {!familySigned && <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'updates' && (
            <motion.div key="updates" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-4">
               <h2 className="text-lg font-bold text-white mb-2">Daily Care Logs</h2>
               
               <div className="bg-surface/30 border border-white/5 rounded-xl p-4 flex gap-4 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                 <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                   <Activity className="w-5 h-5"/>
                 </div>
                 <div>
                   <h3 className="font-bold text-white text-sm">Morning Routine Completed</h3>
                   <p className="text-xs text-slate-400 mb-2">Today, 8:45 AM</p>
                   <p className="text-sm text-slate-300 leading-relaxed">Anna successfully completed her morning ADL routine with standby assist. Breakfast intake was 100%. Medications administered gracefully.</p>
                 </div>
               </div>

               <div className="bg-surface/30 border border-white/5 rounded-xl p-4 flex gap-4 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>
                 <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                   <HeartPulse className="w-5 h-5"/>
                 </div>
                 <div>
                   <h3 className="font-bold text-white text-sm">Vital Sign Logged</h3>
                   <p className="text-xs text-slate-400 mb-2">Yesterday, 6:00 PM</p>
                   <p className="text-sm text-slate-300 font-mono bg-black/40 p-2 rounded mt-1 shadow-inner">BP: 122/80 | HR: 72 BPM | O2: 98%</p>
                 </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'contracts' && (
            <motion.div key="contracts" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-6">
               
               {!familySigned ? (
                 <div className="bg-accent/10 border border-accent/30 rounded-xl py-6 px-4 shadow-[0_0_20px_rgba(244,63,94,0.1)] flex flex-col gap-4">
                   <div className="flex items-center gap-3 text-accent mb-2">
                     <AlertCircle className="w-6 h-6"/>
                     <h2 className="text-lg font-bold">Action Required</h2>
                   </div>
                   <p className="text-sm text-slate-300">The Provider has anchored the verified {stateData.complianceLaw} Negotiated Care Plan and the Financial Residency Agreement for Anna Davis.</p>
                   <p className="text-sm text-slate-300 mb-2">Please counter-sign below to finalize the admission via the secure closed-loop cryptographic network.</p>
                   
                   <div className="py-5 px-4 bg-background border border-white/5 rounded-xl flex flex-col gap-4 shadow-inner">
                       <label className="text-xs text-slate-400">By typing your legal representation name below, you execute this agreement under the ESIGN Act.</label>
                       <input type="text" placeholder="Type Authorized Name" className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white font-serif italic text-lg focus:outline-none focus:border-primary transition-colors" />
                       <button onClick={() => setFamilySigned(true)} className="w-full bg-primary hover:bg-blue-600 px-4 py-4 font-bold rounded-lg text-white shadow-lg shadow-primary/20 transition-all flex justify-center items-center gap-2">
                         Apply Authorized E-Signature <ShieldCheck className="w-5 h-5"/>
                       </button>
                   </div>
                 </div>
               ) : (
                 <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl py-8 px-4 flex flex-col items-center text-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                   <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 shadow-lg">
                     <ShieldCheck className="w-10 h-10"/>
                   </div>
                   <h2 className="text-xl font-bold text-emerald-400">Agreements Fully Executed</h2>
                   <p className="text-sm text-emerald-500/80">Both Provider and Legal Representative have cryptographically anchored their signatures inside this HIPAA-compliant network.</p>
                   <div className="bg-black/50 border border-emerald-500/20 rounded-lg font-mono text-xs text-emerald-500 p-4 mt-4 w-full break-all shadow-inner text-left">
                     PROVIDER_HASH:<br/>0x8f2bdc94a9e<br/><br/>
                     FAMILY_HASH:<br/>0x3d4ee1fa12b<br/><br/>
                     TIMESTAMP:<br/>{new Date().toISOString()}
                   </div>
                 </div>
               )}

               <div className="bg-surface/50 border border-white/5 rounded-xl p-4 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                 <div className="flex items-center gap-3">
                   <FileText className="w-5 h-5 text-slate-400"/>
                   <span className="font-bold text-sm text-slate-300">Download PDF Copy</span>
                 </div>
                 <button className="text-primary text-sm font-bold bg-primary/10 px-4 py-2 rounded-lg">Save</button>
               </div>

            </motion.div>
          )}
        </AnimatePresence>

      </main>

    </div>
  );
}
