import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  Brain, 
  Activity, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  DownloadCloud, 
  FileCheck, 
  Building2,
  Lock,
  ChevronRight,
  Plus,
  Network,
  X
} from 'lucide-react';
import { US_STATES } from '../data/statesData';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const MarketingSite = ({ stateOverride }) => {
  const { stateCode } = useParams();
  const [openFaq, setOpenFaq] = useState(null);
  
  // Priority: URL Param -> Prop Override -> LocalStorage Detected State -> National Fallback
  const activeStateCode = stateCode?.toLowerCase() || stateOverride?.toLowerCase() || localStorage.getItem('detected_state') || 'us';
  const stateData = US_STATES[activeStateCode] || US_STATES.us;

  const displayPrice = stateData.pricing || '$999';

  const faqs = [
    { 
      q: `Is the OS ${stateData.regulator} compliant?`, 
      a: `The platform is built around ${stateData.complianceLaw} operating requirements. It helps your team maintain audit-ready evidence, track required reviews, and respond quickly as regulations evolve.` 
    },
    { 
      q: "How does this support my existing staff?",
      a: "No. Agentic Home Care OS supports licensed providers, administrators, RNs, and caregivers by organizing compliance work, drafting records for review, and surfacing operational risk. People remain accountable for care decisions and final approvals."
    },
    { 
      q: "How fast is the deployment?", 
      a: "Deployment is near-instant. Most facilities are fully configured and monitoring their first resident within 3 minutes of account activation." 
    },
    {
      q: "What about data security?",
      a: "We employ bank-grade encryption and are fully HIPAA compliant. Your resident data is isolated and protected by the same security infrastructure used by the world's leading healthcare institutions."
    }
  ];

  return (
    <div className="relative min-h-screen pt-0 pb-20 overflow-hidden selection:bg-primary/20">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[140px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-0 overflow-hidden border-b border-border">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center relative z-10 py-24">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="flex flex-col gap-10"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-border bg-surface/50 w-fit backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Operational Compliance AI Engine</span>
            </motion.div>
            
            <motion.div variants={fadeUp} className="flex flex-col gap-8">
              <h1 className="text-7xl lg:text-9xl font-serif italic font-medium tracking-tight text-foreground leading-[0.95]">
                Operational <br />
                <span className="not-italic text-primary font-sans font-bold">Compliance Engine.</span>
              </h1>
              <p className="text-xl md:text-2xl leading-relaxed max-w-xl text-muted-foreground font-light">
                We've codified {stateData.name}'s entire regulatory framework into a deterministic processing engine. 
                When the state changes the law, we update the code.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 items-center">
              <Link to="/auth?join=provider" className="group bg-foreground text-background hover:bg-foreground/90 px-4 py-5 rounded-full font-bold text-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-premium flex items-center gap-3">
                Deploy the Engine
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {stateData.regulator} Compliant
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="hidden lg:block relative"
          >
            <div className="glass-card p-3 rounded-[2.5rem] relative overflow-hidden border-border/50 shadow-2xl">
              <img 
                src="/images/admin_dashboard_real.png" 
                alt="Agentic OS Admin Dashboard" 
                className="rounded-[2.5rem] w-full shadow-premium transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-[2rem]" />
              
              <div className="absolute bottom-8 left-8 right-8 space-y-4">
                <div className="glass-card px-4 py-6 bg-background/40 backdrop-blur-xl border-white/20">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground">Live Monitoring</span>
                  </div>
                  <p className="text-sm text-foreground/80 font-medium">
                    "Compliance protocols for {stateData.complianceLaw} are actively monitored in real-time."
                  </p>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-12 -right-12 glass-card px-4 py-6 rounded-3xl border-primary/20"
            >
              <Users className="w-8 h-8 text-primary" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-8 -left-12 glass-card px-4 py-6 rounded-3xl border-accent/20"
            >
              <ShieldCheck className="w-8 h-8 text-accent" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stakeholders Section - Staggered Grid */}
      <section className="py-32 px-4 relative bg-surface/30 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 xl:grid-cols-4 gap-12 lg:gap-8 relative"
          >
            {/* Providers */}
            <motion.div variants={fadeUp} className="glass-card px-4 py-12 flex flex-col gap-10 relative lg:top-0 items-stretch h-full">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl font-serif font-medium leading-tight italic">For Home Care <br/>Providers.</h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  Turn daily care activity into audit-ready operational evidence. Keep medication logs, clinical drafts, and state-mandated reporting organized for staff review.
                </p>
                <ul className="space-y-4 pt-6">
                  {['Automated eMAR', 'State Survey Readiness', 'Clinical Drafting'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Agencies */}
            <motion.div variants={fadeUp} className="glass-card px-4 py-12 flex flex-col gap-10 items-stretch h-full">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Brain className="w-8 h-8 text-accent" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl font-serif font-medium leading-tight italic">For In-Home <br/>Agencies.</h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  Scale your agency without drowning in administrative follow-up. Agentic OS organizes routing, EVV evidence, and compliance verification for every caregiver in the field.
                </p>
                <ul className="space-y-4 pt-6">
                  {['Intelligent Routing', 'Real-time EVV', 'Automated Invoicing'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Caregivers */}
            <motion.div variants={fadeUp} className="glass-card px-4 py-12 flex flex-col gap-10">
              <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center">
                <Users className="w-8 h-8 text-foreground" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl font-serif font-medium leading-tight italic">For Empowered <br/>Practitioners.</h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  Eliminate paperwork burnout. Use our mobile-first interface to complete charts in seconds, not hours. Focus on the human side of care.
                </p>
                <ul className="space-y-4 pt-6">
                  {['Mobile-First Charting', 'Instant Payouts', 'RN Support Engine'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-muted" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Affiliates */}
            <motion.div variants={fadeUp} className="glass-card px-4 py-12 flex flex-col gap-10">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Network className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="space-y-6">
                <h3 className="text-4xl font-serif font-medium leading-tight italic">For Individual <br/>Affiliates.</h3>
                <p className="text-muted-foreground leading-relaxed font-light">
                  Build your own white-labeled home care network. Scale your influence with 50/50 revenue sharing and full platform support.
                </p>
                <ul className="space-y-4 pt-6">
                  {['White-Label Portals', '50/50 Revenue Share', 'Network Analytics'].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Before vs After Section */}
      <section className="py-48 px-4 bg-foreground text-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
          <div className="space-y-12">
            <h2 className="text-5xl lg:text-7xl font-serif italic leading-tight">
              Legacy Burden <br />
              <span className="text-muted opacity-50">vs. OS Power.</span>
            </h2>
            <p className="text-xl text-background/70 font-light leading-relaxed max-w-md">
              Most facilities are running on 20th-century processes in a 21st-century regulatory environment. 
              The result is burnout, liability, and failure.
            </p>
          </div>
          
          <div className="grid gap-6">
            <div className="px-4 py-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                  <X className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Legacy Reality</span>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm opacity-70">
                  <span className="text-rose-400 mt-1">•</span>
                  40% of shift time lost to manual charting and logs.
                </li>
                <li className="flex items-start gap-3 text-sm opacity-70">
                  <span className="text-rose-400 mt-1">•</span>
                  Constant fear of the "State Knock" and survey failure.
                </li>
                <li className="flex items-start gap-3 text-sm opacity-70">
                  <span className="text-rose-400 mt-1">•</span>
                  Fragmented paper trails and manual billing waterfalls.
                </li>
              </ul>
            </div>

            <div className="px-4 py-8 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <CheckCircle2 className="w-12 h-12 text-primary/20" />
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Agentic Home Care OS</span>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm font-medium">
                  <span className="text-primary mt-1">•</span>
                  Clinical drafting and eMAR syncing routed to staff review.
                </li>
                <li className="flex items-start gap-3 text-sm font-medium">
                  <span className="text-primary mt-1">•</span>
                  Continuous survey readiness with real-time audit logs.
                </li>
                <li className="flex items-start gap-3 text-sm font-medium">
                  <span className="text-primary mt-1">•</span>
                  Native billing workflows with reviewable claim preparation.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-32 px-4 border-b border-border overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
          <div className="lg:w-1/2 space-y-10">
            <h2 className="text-5xl lg:text-7xl font-serif font-medium text-editorial leading-[1.1]">
              Agentic <br />
              <span className="italic text-muted">Home Care OS.</span>
            </h2>
            <p className="text-xl text-muted-foreground font-light leading-relaxed">
              We've codified {stateData.name}'s entire regulatory framework into a deterministic processing engine. 
              When the state changes the law, we update the code.
            </p>
            <div className="grid grid-cols-2 gap-8 pt-6">
              <div className="space-y-2">
                <div className="text-3xl font-serif italic text-primary">Zero</div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Compliance Failures</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-serif italic text-primary">100%</div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Audit Readiness</p>
              </div>
            </div>
          </div>
          <div className="lg:w-1/2 relative group">
            <div className="glass-card p-3 rounded-[2rem] overflow-hidden border-primary/20 shadow-premium group-hover:scale-[1.02] transition-transform duration-500">
               <img 
                 src="/images/caregiver_dashboard_real.png" 
                 alt="Caregiver Mobile Interface" 
                 className="w-full h-auto rounded-xl shadow-inner-white"
               />
               <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            </div>
            {/* Floating Trust Badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 glass-card px-4 py-2 rounded-full border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md flex items-center gap-2 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">{stateData.regulator} Approved</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-48 px-4 bg-background relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-6xl lg:text-8xl font-serif font-medium text-editorial leading-tight">
              One Price. <br />
              <span className="italic text-muted">Total Compliance.</span>
            </h2>
            <p className="text-xl text-muted-foreground font-light">
              No hidden fees. No per-resident charges. Just operational compliance infrastructure for your team.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 mt-20">
            {/* Standard Facility License */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card px-4 py-12 relative overflow-hidden border-border flex flex-col h-full"
            >
               <h3 className="text-3xl font-serif italic mb-2">Facility OS</h3>
               <p className="text-muted-foreground text-xs mb-10 font-light">Operational Compliance for AFH & ALF</p>
               
               <div className="text-7xl font-serif font-medium mb-10 flex items-baseline justify-center">
                 <span className="text-3xl text-muted">$</span>{displayPrice.replace('$', '').split('/')[0]}
                 <span className="text-base text-muted font-sans font-light">/mo</span>
               </div>

               <div className="space-y-4 text-left mb-12 flex-1">
                 {['Unlimited Residents', 'Reviewable eMAR', 'Auto-Survey Readiness', 'RN Clinical Support'].map((item, i) => (
                   <div key={i} className="flex items-center gap-3 text-xs">
                     <CheckCircle2 className="w-4 h-4 text-primary" />
                     {item}
                   </div>
                 ))}
               </div>

               <Link to="/auth?join=provider" className="border border-border hover:bg-surface w-full py-5 rounded-full font-bold text-lg transition-all text-center">
                 Start Free Trial
               </Link>
            </motion.div>

            {/* Agency OS License */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-card px-4 py-12 relative overflow-hidden border-primary/30 ring-1 ring-primary/20 flex flex-col h-full bg-primary/[0.02]"
            >
               <div className="absolute top-0 right-0 px-4 py-6">
                 <div className="px-3 py-1 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-widest italic shadow-lg">
                   Agency Choice
                 </div>
               </div>
               <div className="flex flex-col gap-2 mb-12">
                 <h2 className="text-4xl font-serif italic font-medium text-primary">Agency OS</h2>
                 <p className="text-muted-foreground font-light">Compliance for In-Home Agencies.</p>
                 <div className="mt-6 flex flex-col items-start gap-1">
                   <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-serif font-medium text-foreground">$497</span>
                     <span className="text-lg text-muted-foreground font-light">/mo</span>
                   </div>
                   <div className="text-xs font-bold text-primary uppercase tracking-widest">
                     + $249 / added staff / mo
                   </div>
                 </div>
               </div>

               <div className="space-y-4 text-left mb-12 flex-1">
                 {['Unlimited Field Staff', 'Real-time EVV Tracking', 'Routing Oversight', 'Reviewable Invoicing'].map((item, i) => (
                   <div key={i} className="flex items-center gap-3 text-xs font-medium">
                     <CheckCircle2 className="w-4 h-4 text-primary shadow-sm" />
                     {item}
                   </div>
                 ))}
               </div>

               <Link to="/auth?join=provider&type=agency" className="bg-foreground text-background hover:bg-foreground/90 w-full py-5 rounded-full font-bold text-lg transition-all shadow-premium text-center">
                 Deploy Agency OS
               </Link>
            </motion.div>

            {/* Incubator License */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card px-4 py-12 relative overflow-hidden border-border flex flex-col h-full"
            >
               <h3 className="text-3xl font-serif italic mb-2">Incubator</h3>
               <p className="text-muted-foreground text-xs mb-10 font-light">For aspiring owners</p>
  
               <div className="text-7xl font-serif font-medium mb-10 flex items-baseline justify-center">
                 Free
               </div>
               <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-10 text-center">Until Licensed</p>

               <div className="space-y-4 text-left mb-12 flex-1">
                 {['Pre-License Dashboard', 'Full Policy Library', 'Licensing Support', 'Industry Mentorship'].map((item, i) => (
                   <div key={i} className="flex items-center gap-3 text-xs">
                     <CheckCircle2 className="w-4 h-4 text-muted" />
                     {item}
                   </div>
                 ))}
               </div>

               <Link to="/auth?join=provider&mode=incubator" className="border border-border hover:bg-surface w-full py-5 rounded-full font-bold text-lg transition-all text-center">
                 Start Journey
               </Link>
            </motion.div>
          </div>
          <p className="mt-8 text-xs text-muted-foreground">Cancel anytime. No setup fees. Migration assistance included.</p>
        </div>
      </section>


      {/* FAQ Section */}
      <section className="py-48 px-4 bg-surface/30">
        <div className="max-w-4xl mx-auto space-y-24">
          <div className="text-center space-y-6">
            <h2 className="text-5xl lg:text-7xl font-serif font-medium text-editorial">
              Compliance <br />
              <span className="italic text-muted">Decoded.</span>
            </h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div 
                key={index} 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card overflow-hidden group"
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between py-12 px-4 text-left transition-colors"
                >
                  <span className="text-2xl font-serif font-medium italic group-hover:text-primary transition-colors">{faq.q}</span>
                  <div className={`w-10 h-10 rounded-full border border-border flex items-center justify-center transition-transform duration-500 ${openFaq === index ? 'rotate-45 bg-primary text-primary-foreground' : ''}`}>
                    <Plus className="w-6 h-6" />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-4 pb-12 text-xl text-muted-foreground font-light leading-relaxed border-t border-border pt-10 bg-background/20">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-48 px-4 text-center border-t border-border">
        <div className="max-w-3xl mx-auto space-y-12">
          <h2 className="text-6xl lg:text-8xl font-serif font-medium text-editorial leading-[1.1]">
            Empower your staff. <br />
            <span className="italic text-muted">Protect your facility.</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link to="/auth?join=provider" className="bg-foreground text-background hover:bg-foreground/90 px-12 py-6 rounded-full font-bold text-xl transition-all shadow-premium">
              Deploy the OS
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarketingSite;
