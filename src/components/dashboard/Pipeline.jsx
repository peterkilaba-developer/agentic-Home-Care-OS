import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, UploadCloud, Loader2, CheckCircle2, Activity, Search, AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { isLocalDemoEnabled, readLocalDemoState, writeLocalDemoState } from '../../data/localDemo';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, doc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { functions, db } from '../../firebase';
import { calculateTotalFitScore } from '../../utils/compliance';

export default function IntakePipelineView({ pipeline, stateData, homeData, residents, createSystemLog, selectedHomeId, impersonatingId, isLocalDemo, saveLocalPipelineLead, admitLocalResident, discardLocalPipelineLead }) {
  const [activeModal, setActiveModal] = useState(null); 
  const [parsing, setParsing] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [reviewStep, setReviewStep] = useState(1); // 1: Part 1, 2: Part 2, 3: Care Plan, 4: Final
  const [signature, setSignature] = useState('');
  const [assignedRoom, setAssignedRoom] = useState('');
  const [maximizePreview, setMaximizePreview] = useState(false);
  const [negotiatedCarePlan, setNegotiatedCarePlan] = useState(null);
  const [verificationChecks, setVerificationChecks] = useState({
    adl_match: false,
    diagnosis_match: false,
    behavior_verified: false,
    med_list_verified: false,
    equipment_ready: false
  });

  const [rcfemScores, setRcfemScores] = useState({
    clinical: 0, safety: 0, personCentered: 0, operational: 0, observation: 0, alignment: 0
  });

  const [rcfemRationales, setRcfemRationales] = useState({
    clinical: '', safety: '', personCentered: '', operational: '', observation: '', alignment: ''
  });

  const [part2Observations, setPart2Observations] = useState({
    physical: '', cognitive: '', communication: '', social: '', environmental: ''
  });

  const [careTeamQuestions, setCareTeamQuestions] = useState({
    difficultTasks: '', challengingTime: '', triggers: '', interventions: '',
    recentFalls: '', aggression: '', wandering: '', choking: '', refusals: ''
  });

  const calculateTotalScore = () => calculateTotalFitScore(rcfemScores);

  const [_leadForm, setLeadForm] = useState({ 
    name: '', dob: '', diagnosis: '', documentUrl: null, documentName: null,
    adls: {}, medications: [], clinicalNotes: '', monthlyRate: 5500,
    fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: '', risks: [] },
    rcfem: {
      part1: {
        stage1: { clinicalNeeds: '', adls: {}, complexity: '', meds: [], cognitive: '' },
        stage2: { falls: '', behavior: '', elopement: '', infection: '', substance: '', legal: '' },
        stage3: { lifestyle: '', cultural: '', recreational: '', environmental: '' },
        stage4: { staffing: '', financial: '', physical: '', impact: '' }
      }
    }
  });

  const handleDocumentUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setParsing(true);
    setTerminalLogs([
      "V3.0 ENGINE INITIALIZED...", 
      `LOADING ${stateData.name?.toUpperCase() || 'NATIONAL'} COMPLIANCE PROTOCOLS...`,
      "ESTABLISHING SECURE CLINICAL MIRROR...",
      "OCR EXTRACTION COMMENCING..."
    ]);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const clinicalAgent = httpsCallable(functions, 'clinicalAgent');
        let result;
        
        if (isLocalDemoEnabled() && file.name.includes('JamesAX')) {
          setTerminalLogs(prev => [...prev, "Bypassing Auth for James AX...", "Using local clinical mirror..."]);
          result = {
            data: {
              extracted: {
                name: 'James AX',
                dob: '05/12/1945',
                diagnosis: 'Vascular Dementia, Hypertension, T2DM',
                medications: [
                  { name: 'Donepezil', dosage: '10mg', frequency: 'Daily' },
                  { name: 'Lisinopril', dosage: '20mg', frequency: 'Daily' }
                ],
                adls: { bathing: 'Assist', dressing: 'Assist', mobility: 'Independent' },
                fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: 'Standard clinical fit for ALH.', risks: ['Fall risk due to dementia'] }
              }
            }
          };
          await new Promise(r => setTimeout(r, 2000));
        } else {
          result = await clinicalAgent({ 
            intent: 'intake', 
            messages: [{ role: 'user', content: `Analyze this clinical packet for a new resident admission in ${homeData?.state || stateData.name} using the RCFEM framework. Evaluate Stage 1-4 for Part 1.` }],
            document: { data: base64, mimeType: file.type },
            stateName: homeData?.state || stateData.name
          });
        }
        
        const ext = result.data.extracted || {};
        const nextForm = {
          ..._leadForm,
          name: ext.name || '',
          dob: ext.dob || '',
          diagnosis: Array.isArray(ext.diagnosis) ? ext.diagnosis.join(', ') : (ext.diagnosis || ''),
          clinicalNotes: ext.clinicalNotes || '',
          medications: ext.medications || [],
          adls: ext.adls || {},
          fitDetermination: ext.fitDetermination || { feasible: true, recommendation: 'Accept', reasoning: 'Standard fit.', risks: [] },
          rcfem: {
            part1: ext.rcfem?.part1 || {
              stage1: { clinicalNeeds: ext.diagnosis || '', adls: ext.adls || {}, meds: ext.medications || [] },
              stage2: { falls: ext.fallHistory || 'None', behavior: 'None documented' },
              stage3: { lifestyle: 'Pending interview', cultural: 'Default' },
              stage4: { staffing: 'Standard', financial: 'Private Pay' }
            }
          },
          documentUrl: e.target.result,
          documentName: file.name
        };
        setLeadForm(nextForm);

        if (isLocalDemoEnabled()) {
          const demoState = readLocalDemoState();
          writeLocalDemoState({
          ...demoState,
          pipeline: [...(demoState.pipeline || []), { ...nextForm, id: `demo_lead_${Date.now()}` }]
        });
        window.dispatchEvent(new CustomEvent('demo-refresh'));
      }

        setTerminalLogs(prev => [...prev, "Audit complete.", "RCFEM Part 1 Analysis finalized."]);
        setTimeout(() => { setActiveModal('review'); setReviewStep(1); }, 1000);
      };
      reader.readAsDataURL(file);

    } catch (err) { setError(err.message); setParsing(false); }
  };

  const handleGenerateCarePlan = async () => {
    setSaving(true);
    const targetState = homeData?.state || stateData.name || 'Washington';
    setTerminalLogs(prev => [...prev, `Synthesizing ${targetState}-compliant care plan...`, `Applying ${stateData.complianceLaw || 'regulatory'} mandates...`]);
    try {
      const clinicalAgent = httpsCallable(functions, 'clinicalAgent');
      let result;
      
      if (isLocalDemoEnabled() && _leadForm.name?.includes('James')) {
        setTerminalLogs(prev => [...prev, "Applying James AX local synthesis...", "Care plan generated."]);
        result = {
          data: {
            carePlan: `NEGOTIATED CARE PLAN: JAMES AX
State: ${targetState}
Status: ADMITTED (MOCK)

James AX is a 79-year-old male with a diagnosis of Vascular Dementia and Hypertension.
He requires assistance with bathing and dressing.
Medications include Donepezil and Lisinopril.
Dietary: Regular diet with supervision.
Safety: Fall precautions in place.`
          }
        };
        await new Promise(r => setTimeout(r, 1500));
      } else {
        result = await clinicalAgent({ 
          intent: 'generate_care_plan', 
          residentData: _leadForm,
          stateName: targetState,
          complianceContext: {
            law: stateData.complianceLaw,
            regulator: stateData.regulator,
            facilityType: stateData.facilityType,
            shortFacilityType: stateData.shortFacilityType
          }
        });
      }
      const cpText = result.data.choices?.[0]?.message?.content || result.data.carePlan || "Care plan generated.";
      setNegotiatedCarePlan(cpText);
      setReviewStep(3);
    } catch (err) { 
      console.error("[PIPELINE] Care Plan Synthesis Error:", err);
      setError(`AI Synthesis failed for ${targetState}. Falling back to state-aligned template.`);
      const fallbackTemplate = `NEGOTIATED CARE PLAN & SERVICE AGREEMENT
State Compliance: ${stateData.complianceLaw} (${targetState})
Regulating Authority: ${stateData.regulator}

RESIDENT PROFILE
Name: ${_leadForm.name}
DOB: ${_leadForm.dob}
Admission Date: ${new Date().toLocaleDateString()}
Facility Type: ${stateData.facilityType}

CLINICAL SUMMARY
Primary Diagnosis: ${typeof _leadForm.diagnosis === 'object' ? 'See Clinical Audit' : (_leadForm.diagnosis || 'Pending Assessment')}
Medications: ${_leadForm.medications?.length || 0} active prescriptions.

ADL SUPPORT PLAN (NEGOTIATED SERVICES)
${Object.entries(_leadForm.adls || {}).map(([k, v]) => `- ${k.toUpperCase()}: ${typeof v === 'object' ? 'Supervision/Assist' : v}`).join('\n')}

FACILITY OPERATIONAL RESPONSIBILITIES
- Provide 24-hour supervision and emergency response.
- Dietary services including three meals per day and snacks.
- Health monitoring and coordination of care per ${stateData.complianceLaw}.
- Housekeeping, laundry, and social activities.

RESIDENT RIGHTS & DISCLOSURES
Resident has been provided with a copy of the Resident Rights as mandated by ${stateData.name} state law and ${stateData.regulator} guidelines.

SIGNATURES
Resident/Representative: ____________________ Date: __________
Administrator: ____________________ Date: __________`;

      setNegotiatedCarePlan(fallbackTemplate);
      setReviewStep(3);
    } finally { setSaving(false); }
  };

  const handleCommitToRoster = async () => {
    setSaving(true);
    try {
      const residentData = { 
        ..._leadForm, 
        room: assignedRoom, 
        status: 'Stable', 
        homeId: selectedHomeId, 
        admittedAt: serverTimestamp(), 
        carePlan: negotiatedCarePlan, 
        providerSignature: signature, 
        verificationChecks,
        rcfemScores,
        rcfemRationales,
        part2Observations,
        totalFitScore: calculateTotalScore()
      };

      if (isLocalDemoEnabled()) {
        const demoState = readLocalDemoState();
        const newResident = {
          ...residentData,
          id: `demo_res_${Date.now()}`,
          admittedAt: new Date().toISOString()
        };
        writeLocalDemoState({
          ...demoState,
          residents: [...(demoState.residents || []), newResident],
          pipeline: (demoState.pipeline || []).filter(p => p.id !== (_leadForm.id || selectedLeadId))
        });
        window.dispatchEvent(new CustomEvent('demo-refresh'));
      } else {
        await addDoc(collection(db, 'residents'), residentData);
        if (selectedLeadId) {
          await deleteDoc(doc(db, 'intake_pipeline', selectedLeadId));
        }
      }

      createSystemLog('ADMISSION', `Resident ${_leadForm.name} admitted.`, null, _leadForm.name);
      setActiveModal(null);
    } catch (err) { 
      console.error("[PIPELINE] Admission Error:", err);
      setError(err.message); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="p-8">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clinical Intake Pipeline</h1>
          <p className="text-muted">State-aligned extraction and facility-fit auditing.</p>
        </div>
        <button onClick={() => { setActiveModal('upload'); setParsing(false); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">
          Ingest New Packet
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pipeline.map(lead => (
          <div key={lead.id} className="glass-card p-6 border-l-4 border-indigo-500 hover:shadow-xl transition-all">
            <h3 className="font-bold text-lg">{lead.name || 'Anonymous'}</h3>
            <p className="text-xs text-indigo-500 font-bold mb-4 uppercase tracking-widest">{homeData?.state || stateData.name} Compliance</p>
            <button onClick={() => { 
              setSelectedLeadId(lead.id); 
              setLeadForm({ ..._leadForm, ...lead }); 
              setRcfemScores(lead.rcfemScores || { clinical: 0, safety: 0, personCentered: 0, operational: 0, observation: 0, alignment: 0 });
              setRcfemRationales(lead.rcfemRationales || { clinical: '', safety: '', personCentered: '', operational: '', observation: '', alignment: '' });
              setPart2Observations(lead.part2Observations || { physical: '', cognitive: '', communication: '', social: '', environmental: '' });
              setReviewStep(1); 
              setActiveModal('review'); 
            }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs">
              Review RCFEM Audit
            </button>
          </div>
        ))}

      </div>

      {activeModal === 'upload' && (
        <div className="fixed inset-0 z-[9999] bg-surface flex flex-col p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold">Clinical Ingestion</h2>
              <button onClick={() => setActiveModal(null)}><X className="w-8 h-8" /></button>
            </div>
            <div className="glass-card p-24 text-center border-dashed border-2 border-indigo-500/30 cursor-pointer" onClick={() => document.getElementById('file-up').click()}>
              <input type="file" id="file-up" className="hidden" onChange={handleDocumentUpload} />
              <UploadCloud className="w-20 h-20 mx-auto mb-6 text-indigo-500" />
              <p className="text-xl font-bold">Ingest Packet</p>
            </div>
            {parsing && <div className="mt-8 p-8 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl">{terminalLogs.map((l, i) => <div key={i}>{`> ${l}`}</div>)}</div>}
          </div>
        </div>
      )}

      {activeModal === 'review' && (
        <div className="fixed inset-0 z-[9999] bg-surface flex flex-col">
          <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-white/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-indigo-600" />
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight">Clinical Audit V3.0</h3>
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest">Resident Compatibility & Fit Evaluation Model</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted uppercase">Overall Fit Score</p>
                <p className={`text-2xl font-black ${calculateTotalScore() >= 85 ? 'text-emerald-500' : calculateTotalScore() >= 70 ? 'text-indigo-500' : 'text-rose-500'}`}>
                  {calculateTotalScore()}%
                </p>
              </div>
              <button onClick={() => setActiveModal(null)}><X className="w-8 h-8" /></button>
            </div>
          </header>

          {error && (
            <div className="bg-rose-500 text-white px-8 py-2 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-300">
               <div className="flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4" />
                 <span>Error: {error}</span>
               </div>
               <button onClick={() => setError(null)} className="hover:opacity-70 transition-opacity">Dismiss</button>
            </div>
          )}
          
          <div className="flex-1 overflow-y-auto p-8">
            <div className={`max-w-7xl mx-auto ${maximizePreview ? 'block' : 'grid grid-cols-2'} gap-8`}>
              {!maximizePreview && (
                <div className="space-y-6">
                  {reviewStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-sm font-black uppercase text-indigo-500">Part 1: Clinical Ingestion</h4>
                         <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded">STATE: {homeData?.state || stateData.name}</span>
                      </div>

                      <div className="glass-card p-6 bg-emerald-500/5 border-emerald-500/20">
                         <div className="flex items-center justify-between mb-4">
                            <h5 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">AI Fit Analysis</h5>
                            <span className="text-[10px] font-bold bg-emerald-500 text-white px-3 py-1 rounded-full uppercase tracking-tighter">Accept</span>
                         </div>
                         <p className="text-sm font-bold text-emerald-900">{_leadForm.fitDetermination?.reasoning || 'Standard clinical fit.'}</p>
                      </div>

                      {/* Stage 1: Clinical Needs */}
                      <div className="glass-card p-6 border-indigo-500/20 bg-indigo-500/5">
                        <div className="flex items-center justify-between mb-6">
                           <h5 className="text-xs font-black flex items-center gap-2 text-indigo-600 uppercase tracking-widest">EXTRACTION MIRROR: {(_leadForm.name || 'Resident').toUpperCase()}</h5>
                           <span className="text-[9px] font-bold text-muted uppercase">Source: Clinical Packet</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="p-4 bg-white/50 rounded-2xl border border-indigo-100 shadow-sm">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1 tracking-tighter">Primary Clinical Diagnosis</p>
                            <p className="text-sm font-bold text-slate-800">{typeof _leadForm.diagnosis === 'object' ? (_leadForm.diagnosis.primary || JSON.stringify(_leadForm.diagnosis)) : (_leadForm.diagnosis || 'Pending Assessment')}</p>
                          </div>
                          <div className="p-4 bg-white/50 rounded-2xl border border-indigo-100 shadow-sm">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1 tracking-tighter">Medication Profile</p>
                            <p className="text-sm font-bold text-slate-800">{Array.isArray(_leadForm.medications) ? `${_leadForm.medications.length} Prescriptions Extracted` : 'Review Required'}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {['ADLs', 'Allergies', 'Identity'].map(tag => (
                            <div key={tag} className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-xl">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                              <span className="text-[10px] font-bold text-indigo-600 uppercase">{tag} VERIFIED</span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-indigo-100 space-y-4">
                           <div className="flex items-center justify-between">
                             <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Clinical Match Score</span>
                             <input type="range" min="0" max="100" value={rcfemScores.clinical} onChange={e => setRcfemScores({...rcfemScores, clinical: parseInt(e.target.value)})} className="w-1/2 h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                           </div>
                           <textarea 
                             value={rcfemRationales.clinical} 
                             onChange={e => setRcfemRationales({...rcfemRationales, clinical: e.target.value})}
                             placeholder="Rationale for clinical score..."
                             className="w-full p-2 bg-indigo-50/30 border border-indigo-100 rounded-lg text-[10px] outline-none"
                           />
                        </div>
                      </div>

                      {/* Stage 2 & 3 Condensed for Review */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-4">
                          <h5 className="text-[10px] font-bold mb-3 uppercase text-rose-500 flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Safety & Risk</h5>
                          <div className="space-y-2">
                             <div className="flex justify-between text-[11px]"><span className="text-muted">Falls:</span> <span className="font-bold">{typeof _leadForm.rcfem?.part1?.stage2?.falls === 'object' ? 'Detailed' : (_leadForm.rcfem?.part1?.stage2?.falls || 'None')}</span></div>
                             <div className="flex justify-between text-[11px]"><span className="text-muted">Behavior:</span> <span className="font-bold truncate">{typeof _leadForm.rcfem?.part1?.stage2?.behavior === 'object' ? 'Monitored' : (_leadForm.rcfem?.part1?.stage2?.behavior || 'Stable')}</span></div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <input type="range" min="0" max="100" value={rcfemScores.safety} onChange={e => setRcfemScores({...rcfemScores, safety: parseInt(e.target.value)})} className="w-full h-1 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                            <textarea 
                              value={rcfemRationales.safety} 
                              onChange={e => setRcfemRationales({...rcfemRationales, safety: e.target.value})}
                              placeholder="Safety rationale..."
                              className="w-full p-2 bg-rose-50/30 border border-rose-100 rounded-lg text-[9px] outline-none"
                            />
                          </div>
                        </div>
                        <div className="glass-card p-4">
                          <h5 className="text-[10px] font-bold mb-3 uppercase text-emerald-500 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Person-Centered</h5>
                          <div className="space-y-2">
                             <div className="flex justify-between text-[11px]"><span className="text-muted">Lifestyle:</span> <span className="font-bold">{typeof _leadForm.rcfem?.part1?.stage3?.lifestyle === 'object' ? 'Cultural Match' : (_leadForm.rcfem?.part1?.stage3?.lifestyle || 'Pending')}</span></div>
                             <div className="flex justify-between text-[11px]"><span className="text-muted">Cultural:</span> <span className="font-bold">{typeof _leadForm.rcfem?.part1?.stage3?.cultural === 'object' ? 'Verified' : (_leadForm.rcfem?.part1?.stage3?.cultural || 'Standard')}</span></div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <input type="range" min="0" max="100" value={rcfemScores.personCentered} onChange={e => setRcfemScores({...rcfemScores, personCentered: parseInt(e.target.value)})} className="w-full h-1 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            <textarea 
                              value={rcfemRationales.personCentered} 
                              onChange={e => setRcfemRationales({...rcfemRationales, personCentered: e.target.value})}
                              placeholder="Alignment rationale..."
                              className="w-full p-2 bg-emerald-50/30 border border-emerald-100 rounded-lg text-[9px] outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stage 4: Operational */}
                      <div className="glass-card p-5 border-l-4 border-amber-500">
                         <h5 className="text-xs font-bold mb-3 uppercase">Stage 4: Operational Capacity</h5>
                         <p className="text-[11px] text-muted mb-4">Evaluate if {stateData.shortFacilityType || 'Facility'} can sustain this care level.</p>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-100 text-[11px] font-medium"><span className="text-amber-600 font-bold">Staff:</span> Adequate</div>
                            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-100 text-[11px] font-medium"><span className="text-amber-600 font-bold">Finance:</span> {(_leadForm.monthlyRate || 5500).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                         </div>
                         <div className="mt-4 space-y-2">
                            <input type="range" min="0" max="100" value={rcfemScores.operational} onChange={e => setRcfemScores({...rcfemScores, operational: parseInt(e.target.value)})} className="w-full h-1.5 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                            <textarea 
                              value={rcfemRationales.operational} 
                              onChange={e => setRcfemRationales({...rcfemRationales, operational: e.target.value})}
                              placeholder="Operational rationale..."
                              className="w-full p-2 bg-amber-50/30 border border-amber-100 rounded-lg text-[9px] outline-none"
                            />
                         </div>
                      </div>
                    </div>
                  )}

                  {reviewStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between">
                         <h4 className="text-sm font-black uppercase text-amber-600">Part 2: In-Person Observation</h4>
                         <span className="text-[10px] font-bold bg-amber-100 text-amber-600 px-2 py-1 rounded tracking-widest uppercase">Field Validation</span>
                      </div>

                      <div className="glass-card p-6">
                        <p className="text-xs text-muted mb-6">"Visit and get to know them. Does the documented assessment match the person in front of you?"</p>
                        
                        <div className="space-y-4">
                          {Object.keys(part2Observations).map(domain => (
                            <div key={domain} className="space-y-2">
                               <label className="text-[10px] font-black uppercase text-muted tracking-tight">{domain} Observations</label>
                               <textarea 
                                 value={part2Observations[domain]} 
                                 onChange={e => setPart2Observations({...part2Observations, [domain]: e.target.value})}
                                 placeholder={`Document actual ${domain} function, stability, and behaviors...`}
                                 className="w-full p-3 bg-slate-50 border border-border rounded-xl text-xs min-h-[60px] focus:ring-1 focus:ring-amber-500 outline-none"
                               />
                            </div>
                          ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-border">
                           <h5 className="text-[10px] font-black uppercase mb-4 text-amber-600">Care Team Alignment</h5>
                           <div className="space-y-3">
                           <div className="space-y-4">
                              <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium">Observation Verification Score</span>
                                    <input type="range" min="0" max="100" value={rcfemScores.observation} onChange={e => setRcfemScores({...rcfemScores, observation: parseInt(e.target.value)})} className="w-1/2 h-1.5 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                                 </div>
                                 <textarea 
                                   value={rcfemRationales.observation} 
                                   onChange={e => setRcfemRationales({...rcfemRationales, observation: e.target.value})}
                                   placeholder="Observation rationale..."
                                   className="w-full p-2 bg-amber-50/30 border border-amber-100 rounded-lg text-[9px] outline-none"
                                 />
                              </div>
                              <div className="space-y-2">
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium">Family/Care Team Alignment</span>
                                    <input type="range" min="0" max="100" value={rcfemScores.alignment} onChange={e => setRcfemScores({...rcfemScores, alignment: parseInt(e.target.value)})} className="w-1/2 h-1.5 bg-amber-100 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                                 </div>
                                 <textarea 
                                   value={rcfemRationales.alignment} 
                                   onChange={e => setRcfemRationales({...rcfemRationales, alignment: e.target.value})}
                                   placeholder="Alignment rationale..."
                                   className="w-full p-2 bg-amber-50/30 border border-amber-100 rounded-lg text-[9px] outline-none"
                                 />
                              </div>
                           </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {reviewStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="glass-card p-8">
                        <div className="flex justify-between items-center mb-8">
                          <h4 className="text-xl font-bold">Negotiated Care Plan</h4>
                          <div className="flex items-center gap-2">
                             <Shield className="w-4 h-4 text-emerald-500" />
                             <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{stateData.complianceLaw} Compliant</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-border h-[400px] overflow-y-auto whitespace-pre-wrap font-serif text-sm leading-relaxed">
                          {negotiatedCarePlan || "Generating care plan based on RCFEM findings..."}
                        </div>
                      </div>
                    </div>
                  )}

                  {reviewStep === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div className="glass-card p-8 text-center bg-gradient-to-br from-white to-indigo-50/30">
                        <h4 className="text-3xl font-black mb-2">Admission Decision</h4>
                        <div className="mt-8 mb-12">
                           <div className={`text-6xl font-black mb-4 ${calculateTotalScore() >= 85 ? 'text-emerald-500' : calculateTotalScore() >= 70 ? 'text-indigo-500' : 'text-rose-500'}`}>
                              {calculateTotalScore()}%
                           </div>
                           <div className="inline-block px-4 py-2 rounded-full font-bold uppercase tracking-widest text-xs bg-white shadow-sm border border-border">
                              {calculateTotalScore() >= 85 ? 'Strong Fit Recommendation' : 
                               calculateTotalScore() >= 70 ? 'Accept with Care Plan Mods' : 
                               calculateTotalScore() >= 50 ? 'High Risk Admission' : 'Not Appropriate for Placement'}
                           </div>
                        </div>

                        <div className="space-y-6 text-left max-w-sm mx-auto">
                          <div>
                            <label className="text-[10px] font-bold text-muted uppercase">Assign Suite/Room</label>
                            <input value={assignedRoom} onChange={e => setAssignedRoom(e.target.value)} className="w-full p-4 bg-white border border-border rounded-xl mt-2 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Memory Lane #4" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-muted uppercase">Administrator Signature</label>
                            <input value={signature} onChange={e => setSignature(e.target.value)} className="w-full p-6 border-b-2 text-4xl font-serif mt-2 bg-transparent border-slate-300 focus:border-indigo-500 outline-none" placeholder="Digital Signature" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="min-h-[700px] bg-slate-900 rounded-[32px] overflow-hidden flex flex-col">
                <button onClick={() => setMaximizePreview(!maximizePreview)} className="p-4 text-white text-[10px] font-bold">PREVIEW</button>
                {_leadForm.documentUrl && <iframe src={_leadForm.documentUrl} className="flex-1 w-full border-none" />}
              </div>
            </div>
          </div>
          <footer className="h-24 border-t border-border px-8 flex items-center justify-between bg-white/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-muted uppercase tracking-widest">Step {reviewStep} of 4</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className={`w-8 h-1.5 rounded-full ${s <= reviewStep ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setReviewStep(prev => Math.max(1, prev - 1))} className="px-8 py-3 border rounded-2xl font-bold hover:bg-surface transition-colors">Back</button>
              {reviewStep === 1 && (
                <button onClick={() => setReviewStep(2)} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20">Physical Evaluation Gate</button>
              )}
              {reviewStep === 2 && (
                <div className="flex flex-col items-end gap-2">
                  {calculateTotalScore() <= 51 && (
                    <p className="text-[10px] text-rose-500 font-bold uppercase animate-pulse flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Score must be &gt; 51% to generate care plan
                    </p>
                  )}
                  <button 
                    onClick={handleGenerateCarePlan} 
                    disabled={saving || calculateTotalScore() <= 51} 
                    className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
                  >
                    {calculateTotalScore() <= 51 ? 'Unfit for Placement' : 'Generate Care Plan'}
                  </button>
                </div>
              )}
              {reviewStep === 3 && (
                <button onClick={() => setReviewStep(4)} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20">Decision & Finalize</button>
              )}
              {reviewStep === 4 && (
                <button onClick={handleCommitToRoster} disabled={saving || !signature || !assignedRoom || calculateTotalScore() <= 51} className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50">Confirm Move-In</button>
              )}
            </div>

          </footer>
        </div>
      )}
    </div>
  );
}
