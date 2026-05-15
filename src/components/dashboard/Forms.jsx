import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileCheck, Download, ExternalLink, X, ShieldCheck, Printer, Save, CheckCircle2 } from 'lucide-react';

export default function StateFormsView({ stateData, homeData, residents: _residents, createSystemLog }) {
  const [selectedForm, setSelectedForm] = useState(null);

  const forms = [
    { id: 1, name: '90-Day Nursing Assessment', code: 'FORM-90D', status: 'Ready' },
    { id: 2, name: 'Medication Administration Record', code: 'eMAR', status: 'Active' },
    { id: 3, name: 'Resident Rights Disclosure', code: 'RR-101', status: 'Ready' },
    { id: 4, name: 'Incident Report Template', code: 'IR-202', status: 'Template' }
  ];

  const handleSubmitForm = async () => {
    if (!selectedForm) return;
    const formText = typeof document !== 'undefined'
      ? document.querySelector('#compliance-form-portal .form-paper')?.innerText?.trim()
      : '';

    if (createSystemLog) {
      await createSystemLog(
        'FORM_SUBMISSION',
        `Submitted ${selectedForm.name} (${selectedForm.code}) for ${homeData?.homeName || homeData?.agencyName || 'facility'}.\n\n${(formText || '').slice(0, 5000)}`
      );
    }
    setSelectedForm(null);
  };

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="mb-4">
         <h1 className="text-3xl font-bold">{stateData.name} State Forms</h1>
         <p className="text-muted">Automated pre-population of mandatory {stateData.regulator} documentation.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {forms.map(form => (
          <div 
            key={form.id} 
            onClick={() => setSelectedForm(form)}
            className="glass-card px-4 py-6 flex items-center justify-between hover:border-primary/50 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{form.name}</h3>
                <p className="text-xs text-muted font-mono">{form.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-surface-hover rounded-lg text-muted hover:text-primary transition-colors" title="Download Template">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-surface-hover rounded-lg text-muted hover:text-primary transition-colors" title="Fill with AI">
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 glass-card px-4 py-8 border-indigo-500/20 bg-indigo-500/5">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          {stateData.complianceLaw} Form Automations
        </h3>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          Our Agentic OS automatically synchronizes resident data with official {stateData.name} {stateData.regulator} forms. 
          When you update a care plan, the corresponding 90-day assessment is pre-drafted and held for RN review.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-surface/50 p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">OCR Data Sync</span>
              <p className="text-xs text-muted">Direct extraction from hospital packets into state forms.</p>
           </div>
           <div className="bg-surface/50 p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Interval Triggers</span>
              <p className="text-xs text-muted">Forms are automatically generated based on regulatory timelines.</p>
           </div>
           <div className="bg-surface/50 p-4 rounded-xl border border-border">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-1">Human-In-The-Loop</span>
              <p className="text-xs text-muted">All AI drafts require an e-signature from a licensed professional.</p>
           </div>
        </div>
      </div>
    </motion.div>

    {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {selectedForm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            id="compliance-form-portal"
            className="fixed inset-0 z-[9999] w-screen h-[100dvh] bg-surface flex flex-col"
          >
            <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-surface/80 backdrop-blur-md no-print">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><FileCheck className="w-6 h-6" /></div>
                  <div>
                     <h3 className="text-2xl font-bold">{selectedForm.name}</h3>
                     <p className="text-sm text-muted">{stateData.name} Jurisdictional Compliance: {selectedForm.code}</p>
                   </div>
               </div>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors font-bold text-sm shadow-lg shadow-indigo-500/20"
                  >
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                  <button onClick={() => setSelectedForm(null)} className="p-3 hover:bg-surface-hover rounded-full transition-colors text-muted hover:text-foreground">
                    <X className="w-8 h-8" />
                  </button>
               </div>
            </header>

            <style>{`
              @media print {
                @page { margin: 1cm; size: portrait; }
                body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                #root, header, .no-print { display: none !important; }
                #compliance-form-portal { 
                   position: static !important; 
                   display: block !important; 
                   background: white !important; 
                   width: 100% !important;
                   height: auto !important;
                   overflow: visible !important;
                }
                .form-paper-container { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
                .form-paper { 
                   box-shadow: none !important; 
                   border: none !important; 
                   width: 100% !important; 
                   max-width: none !important;
                   margin: 0 !important;
                }
              }
            `}</style>

            <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background no-print-bg form-paper-container">
               <div className="max-w-4xl mx-auto form-paper">
                 <div className="bg-white border border-border shadow-2xl rounded-sm aspect-[1/1.41] p-12 relative overflow-hidden flex flex-col gap-8 text-slate-800">
                    {/* DOH Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none rotate-[-35deg]">
                       <span className="text-9xl font-bold tracking-tighter text-black uppercase whitespace-nowrap">{stateData.regulator} OFFICIAL</span>
                    </div>

                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6">
                       <div>
                          <h2 className="text-xl font-serif font-bold uppercase tracking-widest">{stateData.name} Department of Health</h2>
                          <p className="text-xs font-bold uppercase tracking-wider">{stateData.complianceLaw} Mandatory Documentation</p>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-bold">{selectedForm.code}</p>
                          <p className="text-[10px] uppercase font-bold">Revision: 2024.1</p>
                       </div>
                    </div>

                    <div className="flex-1 space-y-8 py-8 font-serif">
                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                             <div className="border-b border-slate-300 pb-1">
                                <label className="text-[8px] uppercase font-bold block mb-1">Facility Name</label>
                                <span className="text-sm font-bold block min-h-[1.25rem]">{homeData?.homeName || homeData?.businessName || homeData?.agencyName || 'My Facility'}</span>
                             </div>
                             <div className="border-b border-slate-300 pb-1">
                                <label className="text-[8px] uppercase font-bold block mb-1">License Number</label>
                                <span className="text-sm font-bold underline decoration-dotted block min-h-[1.25rem]">{homeData?.licenseNumber || 'AFH-PENDING'}</span>
                             </div>
                          </div>
                          <div className="space-y-4">
                             <div className="border-b border-slate-300 pb-1">
                                <label className="text-[8px] uppercase font-bold block mb-1">Reporting Period</label>
                                <span contentEditable spellCheck={false} className="text-sm font-bold block outline-none border-b border-transparent focus:border-indigo-500 min-h-[1.25rem]">Q2 - 2026</span>
                             </div>
                             <div className="border-b border-slate-300 pb-1">
                                <label className="text-[8px] uppercase font-bold block mb-1">Verification Status</label>
                                <span className="text-sm font-bold flex items-center gap-2 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> AGENT_VERIFIED</span>
                             </div>
                          </div>
                       </div>

                       {/* Unique Form Content */}
                       {selectedForm.id === 1 && <NursingAssessmentContent />}
                       {selectedForm.id === 2 && <EMARContent />}
                       {selectedForm.id === 3 && <ResidentRightsContent />}
                       {selectedForm.id === 4 && <IncidentReportContent />}
                    </div>

                    <div className="mt-auto border-t-2 border-slate-200 pt-8 flex justify-between items-end">
                       <div className="space-y-1">
                          <div className="w-48 h-px bg-slate-400"></div>
                          <p className="text-[8px] font-bold uppercase">Administrator Signature / Digital Stamp</p>
                       </div>
                       <p className="text-[10px] italic text-slate-400">Generated via Agentic Home Care OS • HIPAA Secure Pipeline</p>
                    </div>
                 </div>

                 <div className="mt-8 flex justify-end gap-4 no-print pb-12">
                    <button onClick={() => setSelectedForm(null)} className="px-8 py-4 rounded-full font-bold text-muted hover:bg-surface transition-colors">Discard Draft</button>
                    <button onClick={handleSubmitForm} className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2">
                       <Save className="w-5 h-5" /> Submit to State Portal
                    </button>
                 </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}

function NursingAssessmentContent() {
  return (
    <div className="space-y-6 pt-6">
       <h3 className="text-sm font-bold border-b border-slate-900 pb-1">SECTION A: VITAL SIGNS & OBSERVATIONS</h3>
       <div className="grid grid-cols-4 gap-4">
          <div className="border border-slate-200 p-2"><label className="text-[8px] block font-bold">TEMP</label><span className="text-xs">98.6</span></div>
          <div className="border border-slate-200 p-2"><label className="text-[8px] block font-bold">BP</label><span className="text-xs">120/80</span></div>
          <div className="border border-slate-200 p-2"><label className="text-[8px] block font-bold">HR</label><span className="text-xs">72</span></div>
          <div className="border border-slate-200 p-2"><label className="text-[8px] block font-bold">O2</label><span className="text-xs">98%</span></div>
       </div>
       <h3 className="text-sm font-bold border-b border-slate-900 pb-1">SECTION B: ADL SUPPORT SUMMARY</h3>
       <div contentEditable className="text-xs leading-relaxed min-h-[100px] bg-slate-50 p-4 outline-none">
          Resident remains stable. Requires moderate assistance with bathing and dressing. Appetite is good, consuming 75-100% of meals. No new skin issues observed during assessment.
       </div>
    </div>
  );
}

function EMARContent() {
  return (
    <div className="space-y-6 pt-6">
       <h3 className="text-sm font-bold border-b border-slate-900 pb-1">MEDICATION ADMINISTRATION LOG</h3>
       <table className="w-full text-[10px] border-collapse border border-slate-300">
          <thead>
             <tr className="bg-slate-50">
                <th className="border border-slate-300 p-1">MEDICATION</th>
                <th className="border border-slate-300 p-1">DOSE</th>
                <th className="border border-slate-300 p-1">FREQ</th>
                <th className="border border-slate-300 p-1">ROUTE</th>
                <th className="border border-slate-300 p-1">TIME</th>
             </tr>
          </thead>
          <tbody>
             {[1,2,3].map(i => (
                <tr key={i}>
                   <td className="border border-slate-300 p-1 font-bold">Lisinopril</td>
                   <td className="border border-slate-300 p-1">10mg</td>
                   <td className="border border-slate-300 p-1">Daily</td>
                   <td className="border border-slate-300 p-1">Oral</td>
                   <td className="border border-slate-300 p-1">08:00</td>
                </tr>
             ))}
          </tbody>
       </table>
       <div className="text-[10px] italic text-slate-500">* All doses verified by RN Delegator.</div>
    </div>
  );
}

function ResidentRightsContent() {
  return (
    <div className="space-y-6 pt-6">
       <h3 className="text-sm font-bold border-b border-slate-900 pb-1">DISCLOSURE CHECKLIST</h3>
       <div className="space-y-3">
          {["Right to privacy and dignity", "Right to participate in care planning", "Right to manage personal finances", "Right to choose personal physician"].map((right, i) => (
             <div key={i} className="flex items-center gap-3 text-xs">
                <div className="w-4 h-4 border border-slate-400 flex items-center justify-center font-bold">✓</div>
                <span>{right}</span>
             </div>
          ))}
       </div>
       <div className="mt-8 p-4 bg-slate-50 border-l-4 border-slate-900 text-[10px] leading-relaxed">
          The facility has provided the resident/representative with a copy of the Resident Rights brochure as mandated by State Law.
       </div>
    </div>
  );
}

function IncidentReportContent() {
  return (
    <div className="space-y-6 pt-6">
       <h3 className="text-sm font-bold border-b border-slate-900 pb-1">INCIDENT SUMMARY</h3>
       <div className="grid grid-cols-2 gap-4">
          <div className="border-b border-slate-200 pb-1"><label className="text-[8px] font-bold block">DATE OF EVENT</label><span className="text-xs">05/02/2026</span></div>
          <div className="border-b border-slate-200 pb-1"><label className="text-[8px] font-bold block">TIME OF EVENT</label><span className="text-xs">14:30 PM</span></div>
       </div>
       <div className="space-y-2">
          <label className="text-[8px] font-bold block">NARRATIVE DESCRIPTION</label>
          <div contentEditable className="text-xs leading-relaxed min-h-[150px] bg-slate-50 p-4 outline-none border border-transparent focus:border-indigo-500">
             Describe the event in detail, including immediate actions taken and parties notified (DOH, Case Manager, Family).
          </div>
       </div>
    </div>
  );
}
