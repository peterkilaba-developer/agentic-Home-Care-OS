import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, ShieldCheck, ArrowRight, Activity, MapPin } from 'lucide-react';
import { US_STATES } from '../../data/statesData';

export default function BusinessOverview({ myHomes, businessData, setSelectedHomeId, navigate }) {
  const totalResidents = myHomes.reduce((acc, home) => acc + (home.occupied || 0), 0);
  const totalCapacity = myHomes.reduce((acc, home) => acc + (home.capacity || 0), 0);
  const vacancyRate = totalCapacity > 0 ? Math.round(((totalCapacity - totalResidents) / totalCapacity) * 100) : 0;
  
  const isAgency = businessData?.careType === 'In-Home Care Agency' || myHomes.some(h => h.careType === 'In-Home Care Agency');
  const residentsLabel = isAgency ? 'Clients' : 'Residents';
  const facilitiesLabel = isAgency ? 'Service Branches' : 'Facilities';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{businessData?.businessName || (isAgency ? 'Agency Portfolio' : 'Business Portfolio')}</h1>
          <p className="text-muted">{isAgency ? 'Operational oversight across all field service areas.' : 'Enterprise oversight across all operational facilities.'}</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-surface rounded-xl border border-border">
               <span className="text-[10px] text-muted uppercase font-bold block">Portfolio Health</span>
               <span className="text-emerald-400 font-bold">100% Compliant</span>
            </div>
        </div>
      </header>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Users className="w-6 h-6" /></div>
            <span className="text-xs font-bold text-muted uppercase">Total {residentsLabel}</span>
          </div>
          <h3 className="text-3xl font-bold mt-2">{totalResidents}</h3>
          <p className="text-xs text-muted">Across {myHomes.length} Active Sites</p>
        </div>

        <div className="glass-card p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Activity className="w-6 h-6" /></div>
            <span className="text-xs font-bold text-muted uppercase">{isAgency ? 'Available Capacity' : 'Portfolio Vacancy'}</span>
          </div>
          <h3 className="text-3xl font-bold mt-2">{isAgency ? totalResidents : (totalCapacity - totalResidents)}</h3>
          <p className="text-xs text-muted">{isAgency ? 'Active field caseload' : `${vacancyRate}% Available Capacity`}</p>
        </div>

        <div className="glass-card p-6 flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><ShieldCheck className="w-6 h-6" /></div>
            <span className="text-xs font-bold text-muted uppercase">Compliance Docs</span>
          </div>
          <h3 className="text-3xl font-bold mt-2">Verified</h3>
          <p className="text-xs text-muted">All Jurisdictional Filings Up-to-date</p>
        </div>
      </div>

      {/* Facilities Grid */}
      <section className="mt-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Active {facilitiesLabel}
          </h2>
          <button 
            onClick={() => navigate('/onboarding?type=provider&mode=add_site')}
            className="text-sm font-bold text-primary hover:underline"
          >
            + Register New Site
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myHomes.map((home) => {
            const stateCode = home.state || (home.address || '').split(',').pop()?.trim().toLowerCase();
            const stateData = US_STATES[stateCode] || US_STATES.us;
            
            return (
              <div 
                key={home.id} 
                onClick={() => {
                  setSelectedHomeId(home.id);
                  navigate('/dashboard');
                }}
                className="glass-card group p-6 cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider">
                      Active
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                      {stateData.name} {stateData.complianceLaw}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold group-hover:text-foreground transition-colors">{home.homeName || home.agencyName}</h3>
                  <p className="text-xs text-muted flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {home.address || 'Address not set'}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted uppercase font-bold">{isAgency ? 'Caseload' : 'Occupancy'}</span>
                    <span className="text-sm font-bold">{home.occupied || 0} {isAgency ? 'Active Clients' : `/ ${home.capacity || 6} Residents`}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}
