import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { US_STATES, DEFAULT_STATE } from '../data/statesData';
import { BookOpen, ShieldCheck, ChevronRight, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function StateRegulations() {
  const { stateCode } = useParams();
  const stateData = US_STATES[stateCode?.toLowerCase()] || DEFAULT_STATE;

  const [activeTab, setActiveTab] = useState('initial');

  const chapters = [
    { id: 'initial', title: 'Initial Licensing', icon: FileText },
    { id: 'staffing', title: 'Staff Training', icon: ShieldCheck },
    { id: 'clinical', title: 'Clinical Care', icon: BookOpen },
    { id: 'physical', title: 'Physical Plant', icon: CheckCircle2 },
    { id: 'inspections', title: 'Inspections', icon: AlertTriangle }
  ];

  const tabContent = {
    initial: [
      { title: "Application & Zoning", desc: `Prior to accepting residents, the facility must complete the ${stateData.regulator} application packet and pass local zoning and fire marshal inspections.` },
      { title: "Capacity Limits", desc: `The facility's licensed capacity cannot be exceeded, and bedrooms must meet the minimum square footage mandated by ${stateData.complianceLaw}.` },
      { title: "License Display", desc: `The current ${stateData.shortFacilityType} license must be publicly displayed in a common area where it is easily visible to residents and visitors.` }
    ],
    staffing: [
      { title: "Background Checks", desc: `All caregivers and staff must clear a comprehensive background check through ${stateData.regulator} before having any unsupervised contact with residents.` },
      { title: "Orientation & Training", desc: `Staff must complete mandatory ${stateData.shortFacilityType} orientation and safety training within the timeline specified by ${stateData.complianceLaw}.` },
      { title: "Ongoing Certification", desc: `Caregivers must maintain current CPR/First Aid certifications and complete required annual continuing education hours.` }
    ],
    clinical: [
      { title: "Negotiated Care Plans", desc: `Every resident must have an individualized care plan developed and regularly updated in accordance with ${stateData.complianceLaw} intervals.` },
      { title: "Medication Administration", desc: `Medications may only be administered by trained personnel or via RN delegation as permitted by the ${stateData.regulator}.` },
      { title: "Clinical Charting", desc: `Daily clinical logs and incident reports must be accurately maintained and securely stored to meet HIPAA and ${stateData.complianceLaw} standards.` }
    ],
    physical: [
      { title: "Safety Infrastructure", desc: `The home must be equipped with functioning smoke detectors, fire extinguishers, and emergency evacuation plans approved by local authorities.` },
      { title: "Accessibility Standards", desc: `Bathrooms, entryways, and common areas must accommodate the mobility needs of all residents per ${stateData.complianceLaw}.` },
      { title: "Sanitation & Maintenance", desc: `The facility must maintain strict cleanliness, proper food storage, and safe water temperatures at all times.` }
    ],
    inspections: [
      { title: "Unannounced Surveys", desc: `The facility must allow ${stateData.regulator} inspectors immediate access to the premises, records, and residents during unannounced visits.` },
      { title: "Deficiency Corrections", desc: `Any citations or deficiencies found must be addressed with a formal Plan of Correction submitted within the timeframe mandated by ${stateData.complianceLaw}.` },
      { title: "Continuous Compliance", desc: `The facility must proactively perform internal audits to ensure permanent readiness for state evaluations.` }
    ]
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 pt-12 pb-24 px-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Breadcrumb & Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-24"
        >
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-8">
            <Link to="/" className="hover:text-primary transition-colors">Platform</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/state/${stateData.code}`} className="hover:text-primary transition-colors">{stateData.name}</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Regulations</span>
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-serif italic font-medium tracking-tight text-foreground leading-tight mb-8">
            {stateData.name} {stateData.shortFacilityType} <br />
            <span className="not-italic text-primary font-sans font-bold">Compliance Standards.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl font-light leading-relaxed">
            The definitive editorial resource for operating a {stateData.facilityType} under {stateData.regulator} jurisdiction. 
            Codified into our engine for total peace of mind.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-16">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-4">
            <div className="sticky top-32 space-y-8">
              <div className="glass-card px-4 py-10 space-y-8">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted border-b border-border pb-6">Regulatory Chapters</h3>
                <nav className="flex flex-col gap-4">
                  {chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => setActiveTab(chapter.id)}
                      className={`group flex items-center justify-between w-full text-left p-4 rounded-2xl transition-all ${activeTab === chapter.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-surface border border-transparent'}`}
                    >
                      <div className="flex items-center gap-4">
                        <chapter.icon className={`w-5 h-5 ${activeTab === chapter.id ? 'text-primary' : 'text-muted'}`} />
                        <span className="text-sm font-medium">{chapter.title}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === chapter.id ? 'translate-x-1 opacity-100' : 'opacity-0'}`} />
                    </button>
                  ))}
                </nav>
              </div>

              <div className="glass-card px-4 py-10 bg-primary/5 border-primary/10">
                <h4 className="text-xl font-serif italic text-foreground mb-4">Paperwork is over.</h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8 font-light">
                  Our OS natively understands {stateData.complianceLaw} and automates your clinical requirements.
                </p>
                <Link to="/auth?join=provider" className="flex items-center justify-center gap-3 bg-foreground text-background w-full py-4 rounded-full text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-premium">
                  Automate Now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="glass-card px-4 py-12 lg:py-20"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-[10px] font-bold uppercase tracking-widest text-primary mb-12">
                  {stateData.complianceLaw} • {stateData.regulator}
                </div>
                
                <h2 className="text-5xl font-serif italic font-medium tracking-tight text-foreground mb-10 leading-tight">
                  {chapters.find(c => c.id === activeTab)?.title}
                </h2>
                
                <div className="space-y-12">
                  <p className="text-xl leading-relaxed text-muted-foreground font-light italic border-l-2 border-primary/20 pl-8 py-2">
                    "Adherence to the {stateData.regulator}'s statutes regarding {chapters.find(c => c.id === activeTab)?.title.toLowerCase()} is the foundational requirement for facility licensure in {stateData.name}."
                  </p>
                  
                  <div className="space-y-8">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Core Mandates</h3>
                    <div className="grid gap-6">
                      {tabContent[activeTab].map((item, index) => (
                        <div key={index} className="group px-4 py-8 rounded-3xl bg-surface/30 border border-border/50 hover:border-primary/30 transition-all">
                          <div className="flex gap-6">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            </div>
                            <div className="space-y-3">
                              <strong className="text-xl font-serif italic text-foreground block">{item.title}</strong>
                              <p className="text-muted-foreground leading-relaxed font-light">{item.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-12 border-t border-border mt-12">
                    <div className="px-4 py-10 rounded-[2.5rem] bg-foreground text-background relative overflow-hidden">
                      <div className="relative z-10 space-y-8">
                        <div className="space-y-4">
                          <h3 className="text-4xl font-serif italic leading-tight">Evidence-Ready Compliance.</h3>
                          <p className="text-background/70 font-light max-w-md">
                            Don't let manual errors put your {stateData.shortFacilityType} at risk. Deploy the OS today.
                          </p>
                        </div>
                        <Link to="/auth?join=provider" className="inline-flex items-center gap-3 bg-primary text-primary-foreground px-4 py-5 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-premium">
                          Deploy the Engine
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                      {/* Decorative Accent */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}
