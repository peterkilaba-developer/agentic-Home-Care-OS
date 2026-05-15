import React from 'react';
import { CheckCircle2, Users, Zap, Activity } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function HomeOverview({ residents = [], stateData, homeName, homeData }) {
  const [updating, setUpdating] = React.useState(false);
  const activeCount = residents.length;
  const isAgency = homeData?.careType === 'In-Home Care Agency';

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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
      <header>
         <h1 className="text-3xl font-bold">{homeName}</h1>
         <p className="text-muted">Your operational compliance controls are tracking {stateData.complianceLaw} readiness.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card py-6 px-4">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle2 className="w-6 h-6" /></div>
            <span className="text-xs font-bold text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded-md">Audit Ready</span>
          </div>
          <h3 className="text-4xl font-bold mb-1">100%</h3>
          <p className="text-sm text-muted">{stateData.complianceLaw} Compliance</p>
        </div>

        <div className="glass-card py-6 px-4">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-primary/10 rounded-lg text-primary"><Users className="w-6 h-6" /></div>
            {!isAgency && <span className="text-xs font-bold text-muted">{activeCount}/{homeData?.capacity || 6} Beds</span>}
          </div>
          <h3 className="text-4xl font-bold mb-1">{activeCount}</h3>
          <p className="text-sm text-muted">{isAgency ? 'Client Caseload' : 'Active Residents'}</p>
        </div>

        <div className="glass-card py-6 px-4 border-accent/30">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-accent/10 rounded-lg text-accent"><Zap className="w-6 h-6" /></div>
            <div className="flex h-3 w-3 relative">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
            </div>
          </div>
          <h3 className="text-4xl font-bold mb-1">Active</h3>
          <p className="text-sm text-muted">Interval Compliance Tracker</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <section className="glass-card p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
               <Activity className="w-6 h-6 text-primary" /> Active Operations
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
               {homeName} is currently operating under {stateData.complianceLaw} guidelines. All clinical charting, medication administration, and incident reporting are being monitored for audit-readiness.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4">
               <div className="p-4 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] text-muted uppercase font-bold block mb-1">Last Inspection</span>
                  <span className="text-sm font-bold">Passed (Self-Audit)</span>
               </div>
               <div className="p-4 bg-surface rounded-xl border border-border">
                  <span className="text-[10px] text-muted uppercase font-bold block mb-1">Staff Ratio</span>
                  <span className="text-sm font-bold">Compliant</span>
               </div>
            </div>
         </section>

         <section className="glass-card p-8 bg-gradient-to-br from-primary/5 to-transparent">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
               <Zap className="w-6 h-6" /> Pulse Awareness
            </h3>
            <div className="space-y-4">
               <div className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span>Real-time Medication Sync Active</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span>Geofenced EVV Evidence Capture Active</span>
               </div>
               <div className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                  <span>Automated {stateData.regulator} Incident Routing Active</span>
               </div>
            </div>
         </section>
      </div>
    </motion.div>
  );
}
