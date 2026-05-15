import React from 'react';
import { motion } from 'framer-motion';
import { Home, Shield, Bell, UserCheck, Activity, Users } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function HomeProfileView({ homeData, stateData, residents }) {
  const [updating, setUpdating] = React.useState(false);
  
  const CAPABILITIES = [
    { id: 'adl_support', label: 'ADL Support' },
    { id: 'med_admin', label: 'Medication Administration' },
    { id: 'dementia_care', label: 'Specialized Dementia Care' },
    { id: 'diabetic_mgmt', label: 'Diabetic Management' },
    { id: 'wound_care', label: 'Wound Care' },
    { id: 'hospice_care', label: 'Hospice Coordination' },
    { id: 'incontinence_mgmt', label: 'Incontinence Management' },
    { id: 'behavioral_support', label: 'Behavioral Support' },
    { id: 'transportation', label: 'Transportation Services' }
  ];

  const handleUpdate = async (field, value) => {
    if (!homeData?.id) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'homes', homeData.id), { [field]: value });
    } catch (e) {
      console.error(e);
    }
    setUpdating(false);
  };

  const toggleCapability = async (capId) => {
    const currentCaps = homeData?.capabilities || [];
    const nextCaps = currentCaps.includes(capId) 
      ? currentCaps.filter(c => c !== capId)
      : [...currentCaps, capId];
    await handleUpdate('capabilities', nextCaps);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8 pb-12">
      <header>
         <h1 className="text-3xl font-bold">Business Profile</h1>
         <p className="text-muted">Verified institutional record and {stateData.complianceLaw} configuration.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Col - General Settings */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <section className="glass-card px-4 py-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary"/> Clinical Capacity & Capabilities</h3>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-muted uppercase tracking-widest mb-1">Total Capacity</span>
                  <div className="flex items-center gap-3">
                    <input 
                       type="number" 
                       defaultValue={homeData?.capacity || 6} 
                       onBlur={(e) => handleUpdate('capacity', parseInt(e.target.value))}
                       className="bg-surface border border-border rounded-lg px-3 py-1 w-20 text-lg font-bold text-center text-foreground outline-none focus:border-primary transition-all" 
                    />
                    <span className="text-[10px] font-bold text-muted uppercase">Beds</span>
                  </div>
               </div>
             </div>
             
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
               {CAPABILITIES.map(cap => {
                  const isActive = (homeData?.capabilities || []).includes(cap.id);
                  return (
                    <button
                       key={cap.id}
                       onClick={() => toggleCapability(cap.id)}
                       disabled={updating}
                       className={`flex flex-col gap-2 p-3 rounded-xl border-2 text-left transition-all group ${
                          isActive
                          ? 'bg-primary/5 border-primary border-opacity-40 shadow-lg shadow-primary/5'
                          : 'bg-surface/50 border-border text-muted-foreground hover:border-primary/30'
                       }`}
                    >
                       <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-primary text-white' : 'bg-surface-hover text-muted-foreground'}`}>
                          <Activity className="w-4 h-4" />
                       </div>
                       <div>
                          <p className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{cap.label}</p>
                          <p className="text-[8px] opacity-60 mt-0.5 leading-tight">{isActive ? 'Service Active' : 'Offered?'}</p>
                       </div>
                    </button>
                  );
               })}
            </div>
          </section>

          <section className="glass-card px-4 py-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2"><Home className="w-5 h-5 text-primary"/> Business Identity</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold text-muted uppercase tracking-widest">Home / Agency Name</label>
                   <input 
                      type="text" 
                      value={homeData?.homeName || homeData?.agencyName || ''} 
                      readOnly
                      className="bg-background/50 border border-border rounded-lg px-4 py-2 text-muted-foreground outline-none cursor-not-allowed" 
                   />
                </div>
                <div className="flex flex-col gap-1">
                   <label className="text-xs font-bold text-muted uppercase tracking-widest">License Number</label>
                   <input 
                      type="text" 
                      value={homeData?.licenseNumber || ''} 
                      readOnly
                      className="bg-background/50 border border-border rounded-lg px-4 py-2 text-muted-foreground outline-none cursor-not-allowed font-mono" 
                   />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                   <label className="text-xs font-bold text-muted uppercase tracking-widest">Facility Address</label>
                   <input 
                      type="text" 
                      value={homeData?.address || ''} 
                      readOnly
                      className="bg-background/50 border border-border rounded-lg px-4 py-2 text-muted-foreground outline-none cursor-not-allowed" 
                   />
                </div>
             </div>
          </section>

          <section className="glass-card px-4 py-6">
             <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-primary"/> Compliance Guardrails</h3>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div>
                      <p className="font-bold text-sm">Automated RN Delegator Triggers</p>
                      <p className="text-xs text-muted">Automatically alert RN on day 80 of the 90-day cycle.</p>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                </div>
                <div className="flex items-center justify-between">
                   <div>
                      <p className="font-bold text-sm">HIPAA Sandbox Enforcement</p>
                      <p className="text-xs text-muted">Strictly isolate all resident media from public storage.</p>
                   </div>
                   <div className="w-12 h-6 bg-primary rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                </div>
             </div>
          </section>
        </div>

        {/* Right Col - Subscription & Quick Info */}
        <div className="flex flex-col gap-6">
           <section className="glass-card px-4 py-6 border-accent/20">
            <h3 className="font-bold text-indigo-400 uppercase tracking-widest text-[10px] mb-6">Facility Readiness</h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-xs">Licensed for Memory Care</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${(homeData?.capabilities || []).includes('dementia_care') ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} />
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-xs">Medication Oversight</span>
                  <div className={`w-2.5 h-2.5 rounded-full ${(homeData?.capabilities || []).includes('med_admin') ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'}`} />
               </div>
               <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <span className="text-xs">Acuity Occupancy</span>
                  <span className="text-xs font-bold text-white">{residents?.length || 0} / {homeData?.capacity || 6}</span>
               </div>
               <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  AI will use these parameters to flag incoming clinical packets as "Feasible" or "Risk / Referral Required".
               </p>
            </div>
          </section>

           <section className="glass-card px-4 py-6 border-accent/20">
              <h3 className="text-lg font-bold mb-4">Subscription</h3>
              <div className="bg-surface p-4 rounded-xl mb-4 border border-border">
                 <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Active Plan</p>
                 <p className="text-xl font-bold">Founder's Special</p>
                 <p className="text-sm text-accent font-bold mt-1">
                    {homeData?.careType === 'Assisted Living Facility > 10 Beds' 
                      ? "$497 / mo + $97 / staff" 
                      : "$497 / month"}
                 </p>
              </div>
              <button className="w-full py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-lg text-sm font-bold transition-colors">
                 Manage Billing
              </button>
           </section>

           <section className="glass-card px-4 py-6">
              <h3 className="text-lg font-bold mb-4">Notification Prefs</h3>
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><Bell className="w-4 h-4" /></div>
                    <span className="text-xs text-muted font-bold">Email Alerts Active</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><UserCheck className="w-4 h-4" /></div>
                    <span className="text-xs text-muted font-bold">Compliance Reminder SMS Active</span>
                 </div>
              </div>
           </section>
        </div>
      </div>
    </motion.div>
  );
}
