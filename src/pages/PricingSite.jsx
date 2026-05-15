import React from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { US_STATES } from '../data/statesData';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const PricingSite = () => {
  const { stateCode } = useParams();
  const stateData = US_STATES[stateCode?.toLowerCase()] || US_STATES.us;
  const displayPrice = stateData.pricing || '$497/mo';

  return (
    <div className="min-h-screen bg-background pt-32 pb-24 px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-center mb-24 space-y-6"
        >
          <h1 className="text-6xl lg:text-8xl font-serif italic font-medium tracking-tight text-foreground">
            Simple, Transparent <br />
            <span className="text-primary not-italic font-sans font-bold">Pricing.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            One license. All features. Zero hidden fees. 
            Engineered specifically for {stateData.name} {stateData.shortFacilityType} providers.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card px-4 py-16 border-border flex flex-col h-full"
          >
            <div className="flex flex-col gap-2 mb-12">
              <h2 className="text-4xl font-serif italic font-medium">Facility OS</h2>
              <p className="text-muted-foreground font-light text-sm">Operational Compliance for AFH & ALF</p>
              <div className="mt-8 flex items-baseline gap-2 justify-center">
                <span className="text-6xl font-serif font-medium text-foreground">{displayPrice.split('/')[0]}</span>
                <span className="text-lg text-muted-foreground font-light">/mo</span>
              </div>
            </div>
 
            <div className="space-y-6 flex-1 text-left">
              {['Unlimited Residents', 'Automated eMAR', 'Auto-Survey Readiness', 'RN Clinical Support', 'State Compliance Engine', 'Resident Portal'].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                   <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                   <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
 
            <Link to="/auth?join=provider" className="mt-12 border border-border hover:bg-surface w-full py-6 rounded-full font-bold text-lg transition-all text-center">
              Start Free Trial
            </Link>
          </motion.div>
 
          {/* Agency Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
            className="glass-card px-4 py-16 border-primary/30 bg-primary/[0.02] flex flex-col relative overflow-hidden h-full ring-1 ring-primary/20"
          >
            <div className="absolute top-0 right-0 px-4 py-8">
              <div className="px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest italic shadow-lg">
                Agency Choice
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-12">
              <h2 className="text-4xl font-serif italic font-medium text-primary">Agency OS</h2>
              <p className="text-muted-foreground font-light text-sm">Compliance for In-Home Agencies.</p>
              <div className="mt-8 flex flex-col items-center gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-serif font-medium text-foreground">$497</span>
                  <span className="text-lg text-muted-foreground font-light">/mo</span>
                </div>
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  + $249 / staff / mo
                </div>
              </div>
            </div>
 
            <div className="space-y-6 flex-1 text-left">
              {['Unlimited Field Staff', 'Real-time EVV Tracking', 'Intelligent Routing', 'Automated Invoicing', 'Native Medicaid Billing', 'Compliance Auditing'].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                   <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                   <span className="text-muted-foreground font-medium">{item}</span>
                </div>
              ))}
            </div>
 
            <Link to="/auth?join=provider&type=agency" className="mt-12 bg-foreground text-background hover:bg-foreground/90 w-full py-6 rounded-full font-bold text-lg transition-all shadow-premium text-center">
              Deploy Agency OS
            </Link>
          </motion.div>
 
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            className="glass-card px-4 py-16 border-indigo-500/20 bg-indigo-500/[0.02] flex flex-col h-full"
          >
            <div className="flex flex-col gap-2 mb-12">
              <h2 className="text-4xl font-serif italic font-medium text-indigo-400">Affiliate</h2>
              <p className="text-muted-foreground font-light text-sm">Scale your home care network.</p>
              <div className="mt-8 flex items-baseline gap-2 justify-center">
                <span className="text-6xl font-serif font-medium text-indigo-400">50%</span>
                <span className="text-lg text-muted-foreground font-light">Net Share</span>
              </div>
            </div>
 
            <div className="space-y-6 flex-1 text-left">
              {['White-Label Portals', 'Real-time Ledger', 'Instant Payouts', 'Marketing Assets', 'Network Analytics', 'Dedicated Support'].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-sm">
                   <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                   <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
 
            <Link to="/auth?join=partner" className="mt-12 border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-400 w-full py-6 rounded-full font-bold text-lg transition-all text-center">
              Join the Network
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
};



export default PricingSite;
