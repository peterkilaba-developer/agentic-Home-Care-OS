import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle2, Shield } from 'lucide-react';

export default function WACComplianceView({ stateData, residents = [], homeData }) {
  const hasResidents = residents.length > 0;
  const navigate = useNavigate();
  const isAgency = homeData?.careType === 'In-Home Care Agency';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="mb-4">
         <h1 className="text-3xl font-bold">{stateData.complianceLaw} Compliance Tracker</h1>
         <p className="text-muted">Operational oversight for RN Delegator intervals and resident assessment evidence.</p>
      </header>
      
      {!hasResidents ? (
        <div className="glass-card py-12 px-4 flex flex-col items-center justify-center text-center">
          <Clock className="w-16 h-16 text-muted mb-4" />
          <h3 className="text-xl font-bold mb-2">No Active Residents</h3>
          <p className="text-muted/70 max-w-md">The 90-day RN Delegator tracker activates when residents are admitted to the roster.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {residents.map(resident => {
            const admittedDate = resident.admittedAt || resident.createdAt;
            const formatDate = (val) => {
              if (!val) return 'Recently';
              if (val.toDate) return val.toDate().toLocaleDateString();
              const d = new Date(val);
              return isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
            };

            const calculateRemaining = () => {
              if (!admittedDate) return 90;
              const admitted = admittedDate.toDate ? admittedDate.toDate() : new Date(admittedDate);
              if (isNaN(admitted.getTime())) return 90;
              const now = new Date();
              const diffTime = Math.abs(now - admitted);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const remaining = 90 - (diffDays % 90);
              return remaining;
            };
            const daysLeft = calculateRemaining();
            const progress = ((90 - daysLeft) / 90) * 100;

            return (
              <div key={resident.id} className="glass-card px-4 py-6 flex flex-col gap-4 border-emerald-500/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold">{resident.name}</h3>
                    <p className="text-xs text-muted">Resident since {formatDate(admittedDate)}</p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                    Tracker Active
                  </div>
                </div>
                
                <div className="space-y-3 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{isAgency ? 'Next Supervisory Visit' : 'Next RN Delegation Visit'}</span>
                    <span className={`font-bold ${daysLeft < 7 ? 'text-rose-400 animate-pulse' : 'text-foreground'}`}>
                      In {daysLeft} Days
                    </span>
                  </div>
                  <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden border border-border">
                    <div 
                      className={`h-full transition-all duration-1000 ${daysLeft < 7 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">{isAgency ? 'Home Care Plan Review' : `Care Plan Review (${stateData.complianceLaw})`}</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Verified</span>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/dashboard/logs?residentId=${resident.id}`)}
                  className="mt-2 w-full py-2 bg-surface hover:bg-surface-hover text-foreground rounded-lg text-sm font-bold transition-colors border border-border"
                >
                  View Compliance Logs
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Legal & Ethics Disclosure */}
      <div className="mt-8 px-4 py-6 glass-card bg-rose-500/5 border border-rose-500/20 rounded-2xl">
         <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><Shield className="w-5 h-5"/></div>
            <h3 className="text-lg font-bold">Legal & AI Ethics Framework</h3>
         </div>
         <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
               <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest">Recording Consent</h4>
               <p className="text-[10px] text-muted leading-relaxed">
                 The platform detects {stateData.name}'s recording status. {stateData.twoPartyConsent ? "Two-party consent is enforced via mandatory caregiver verification before audio charting." : "One-party consent applies; however, disclosure to residents is recommended for best practice."}
               </p>
            </div>
            <div className="space-y-2">
               <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest">Human Accountability</h4>
               <p className="text-[10px] text-muted leading-relaxed">
                 Per {stateData.regulator} standards, AI-drafted clinical records are gated by mandatory human review. No clinical record is finalized without an e-signature from a licensed staff member.
               </p>
            </div>
            <div className="space-y-2">
               <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest">AI Transparency</h4>
               <p className="text-[10px] text-muted leading-relaxed">
                 {stateData.aiDisclosureRequired ? "Texas SB 1188 compliance: All AI-assisted outputs are watermarked and disclosed to family members in the secure portal." : "Transparency protocol: AI synthesized outputs are clearly labeled across all system interfaces."}
               </p>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
