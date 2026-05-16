import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, UploadCloud, Loader2, CheckCircle2, Activity, Search, AlertTriangle, ArrowRight, Shield } from 'lucide-react';
import { isLocalDemoEnabled, readLocalDemoState, writeLocalDemoState } from '../../data/localDemo';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, doc, serverTimestamp, deleteDoc, setDoc } from 'firebase/firestore';
import { functions, db } from '../../firebase';
import { calculateTotalFitScore } from '../../utils/compliance';
import { getStateCompliance, validateCarePlanForState } from '../../utils/stateCompliance';
import { CLINICAL_SCHEMA, matchHomeToNeeds } from '../../utils/clinicalSchema';

function Field({ label, value }) {
  const display = value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)
    ? <span className="text-muted italic">—</span>
    : Array.isArray(value)
      ? value.join(', ')
      : typeof value === 'boolean'
        ? (value ? 'Yes' : 'No')
        : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">{label}</span>
      <span className="text-[11px] font-medium text-slate-800 break-words">{display}</span>
    </div>
  );
}

function Section({ title, children, color = 'indigo' }) {
  const ring = { indigo: 'border-indigo-200', rose: 'border-rose-200', amber: 'border-amber-200', emerald: 'border-emerald-200', slate: 'border-slate-200' }[color] || 'border-indigo-200';
  const title_color = { indigo: 'text-indigo-600', rose: 'text-rose-600', amber: 'text-amber-700', emerald: 'text-emerald-600', slate: 'text-slate-600' }[color] || 'text-indigo-600';
  return (
    <div className={`rounded-xl border ${ring} bg-white/60 p-4`}>
      <h6 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${title_color}`}>{title}</h6>
      {children}
    </div>
  );
}

function ExtractionMirror({ lead, rcfemScores, setRcfemScores, rcfemRationales, setRcfemRationales }) {
  const id = lead.identity || {};
  const dx = lead.diagnoses || {};
  const adls = lead.adls || {};
  const iadls = lead.iadls || {};
  const cog = lead.cognitive || {};
  const safety = lead.safety || {};
  const diet = lead.dietary || {};
  const ad = lead.advanceDirectives || {};
  const ins = lead.insurance || {};
  const contacts = lead.contacts || {};
  const meds = Array.isArray(lead.medications) ? lead.medications : [];
  const allergies = lead.allergies || {};

  return (
    <div className="glass-card p-6 border-indigo-500/20 bg-indigo-500/5">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-xs font-black flex items-center gap-2 text-indigo-600 uppercase tracking-widest">EXTRACTION MIRROR: {(id.name || lead.name || 'Resident').toUpperCase()}</h5>
        <span className="text-[9px] font-bold text-muted uppercase">Source: Clinical Packet</span>
      </div>

      <div className="space-y-3">
        <Section title="Identity">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name" value={id.name || lead.name} />
            <Field label="DOB" value={id.dob || lead.dob} />
            <Field label="Age" value={id.age} />
            <Field label="Sex" value={id.sex} />
            <Field label="Preferred Name" value={id.preferredName} />
            <Field label="Primary Language" value={id.primaryLanguage} />
          </div>
        </Section>

        <Section title="Diagnoses">
          <div className="grid grid-cols-1 gap-2">
            <Field label="Primary" value={dx.primary || lead.diagnosis} />
            <Field label="Secondary" value={dx.secondary} />
            <Field label="Chronic Conditions" value={dx.chronicConditions} />
            <Field label="ICD-10 Codes" value={dx.icd10Codes} />
          </div>
        </Section>

        <Section title={`Medications (${meds.length})`} color="rose">
          {meds.length === 0 ? <span className="text-[11px] text-muted italic">None extracted</span> : (
            <div className="overflow-hidden rounded-lg border border-rose-100">
              <table className="w-full text-[10px]">
                <thead className="bg-rose-50">
                  <tr>
                    <th className="text-left px-2 py-1 font-bold text-rose-700">Drug</th>
                    <th className="text-left px-2 py-1 font-bold text-rose-700">Dose</th>
                    <th className="text-left px-2 py-1 font-bold text-rose-700">Freq</th>
                    <th className="text-left px-2 py-1 font-bold text-rose-700">Route</th>
                    <th className="text-left px-2 py-1 font-bold text-rose-700">Indication</th>
                  </tr>
                </thead>
                <tbody>
                  {meds.map((m, i) => (
                    <tr key={i} className="border-t border-rose-100">
                      <td className="px-2 py-1 font-medium">{m.name || '—'}</td>
                      <td className="px-2 py-1">{m.dosage || '—'}</td>
                      <td className="px-2 py-1">{m.frequency || '—'}</td>
                      <td className="px-2 py-1">{m.route || '—'}</td>
                      <td className="px-2 py-1">{m.indication || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Allergies" color="rose">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Drug" value={allergies.drug} />
            <Field label="Food" value={allergies.food} />
            <Field label="Environmental" value={allergies.environmental} />
          </div>
        </Section>

        <Section title="ADLs">
          <div className="grid grid-cols-4 gap-3">
            <Field label="Bathing" value={adls.bathing} />
            <Field label="Dressing" value={adls.dressing} />
            <Field label="Grooming" value={adls.grooming} />
            <Field label="Toileting" value={adls.toileting} />
            <Field label="Transferring" value={adls.transferring} />
            <Field label="Eating" value={adls.eating} />
            <Field label="Continence" value={adls.continence} />
            <Field label="Mobility" value={adls.mobility} />
          </div>
        </Section>

        <Section title="IADLs">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Medication" value={iadls.medication} />
            <Field label="Finances" value={iadls.finances} />
            <Field label="Transportation" value={iadls.transportation} />
            <Field label="Housekeeping" value={iadls.housekeeping} />
            <Field label="Meal Prep" value={iadls.mealPrep} />
            <Field label="Phone" value={iadls.phone} />
          </div>
        </Section>

        <Section title="Cognitive & Behavioral" color="amber">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" value={cog.status} />
            <Field label="Diagnosis" value={cog.diagnosis} />
            <Field label="Behaviors" value={cog.behaviors} />
            <Field label="Mood/Affect" value={cog.moodAffect} />
          </div>
        </Section>

        <Section title="Safety" color="rose">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fall History" value={safety.fallHistory} />
            <Field label="Fall Risk" value={safety.fallRisk} />
            <Field label="Wandering" value={safety.wandering} />
            <Field label="Elopement Risk" value={safety.elopementRisk} />
            <Field label="Aggression" value={safety.aggression} />
            <Field label="Self Harm" value={safety.selfHarm} />
          </div>
        </Section>

        <Section title="Dietary" color="emerald">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Diet" value={diet.diet} />
            <Field label="Restrictions" value={diet.restrictions} />
            <Field label="Swallowing" value={diet.swallowingPrecautions} />
            <Field label="Fluid Restriction" value={diet.fluidRestriction} />
          </div>
        </Section>

        <Section title="Advance Directives" color="slate">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code Status" value={ad.codeStatus} />
            <Field label="POLST on File" value={ad.polst} />
            <Field label="Healthcare Proxy" value={ad.healthcareProxy} />
            <Field label="Living Will" value={ad.livingWill} />
          </div>
        </Section>

        <Section title="Insurance" color="slate">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary" value={ins.primary} />
            <Field label="Secondary" value={ins.secondary} />
            <Field label="Medicare #" value={ins.medicareNumber} />
            <Field label="Medicaid #" value={ins.medicaidNumber} />
          </div>
        </Section>

        <Section title="Contacts" color="slate">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Primary MD" value={`${contacts.primaryPhysician?.name || ''} ${contacts.primaryPhysician?.phone ? '· ' + contacts.primaryPhysician.phone : ''}`.trim()} />
            <Field label="Emergency Contact" value={`${contacts.emergencyContact?.name || ''}${contacts.emergencyContact?.relation ? ' (' + contacts.emergencyContact.relation + ')' : ''}${contacts.emergencyContact?.phone ? ' · ' + contacts.emergencyContact.phone : ''}`.trim()} />
            <Field label="Power of Attorney" value={`${contacts.powerOfAttorney?.name || ''} ${contacts.powerOfAttorney?.phone ? '· ' + contacts.powerOfAttorney.phone : ''}`.trim()} />
          </div>
        </Section>

        {lead.clinicalNotes && (
          <Section title="Narrative Notes">
            <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{lead.clinicalNotes}</p>
          </Section>
        )}
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
  );
}

function recommendationStyle(rec) {
  const r = (rec || '').toLowerCase();
  if (r.includes('decline') || r.includes('not appropriate') || r.includes('unfit')) {
    return { badge: 'bg-rose-500 text-white', card: 'bg-rose-50/40 border-rose-300', title: 'text-rose-700', body: 'text-rose-900', label: 'DECLINE' };
  }
  if (r.includes('condition') || r.includes('caveat') || r.includes('high risk')) {
    return { badge: 'bg-amber-500 text-white', card: 'bg-amber-50/40 border-amber-300', title: 'text-amber-700', body: 'text-amber-900', label: 'ACCEPT WITH CONDITIONS' };
  }
  if (!rec) {
    return { badge: 'bg-slate-400 text-white', card: 'bg-slate-50 border-slate-300', title: 'text-slate-600', body: 'text-slate-800', label: 'PENDING' };
  }
  return { badge: 'bg-emerald-500 text-white', card: 'bg-emerald-50/40 border-emerald-300', title: 'text-emerald-700', body: 'text-emerald-900', label: 'ACCEPT' };
}

function AIFitAnalysisCard({ lead }) {
  const fit = lead.fitDetermination || {};
  const style = recommendationStyle(fit.recommendation);
  const feasibleKnown = typeof fit.feasible === 'boolean';
  const risks = Array.isArray(fit.risks) ? fit.risks.filter(Boolean) : [];

  return (
    <div className={`glass-card p-6 border ${style.card}`}>
      <div className="flex items-center justify-between mb-4">
        <h5 className={`text-[10px] font-bold uppercase tracking-widest ${style.title}`}>AI Fit Analysis</h5>
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${style.badge}`}>{style.label}</span>
      </div>
      {feasibleKnown && (
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[9px] font-bold uppercase ${fit.feasible ? 'text-emerald-600' : 'text-rose-600'}`}>Clinically Feasible:</span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${fit.feasible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{fit.feasible ? 'Yes' : 'No'}</span>
        </div>
      )}
      <p className={`text-sm font-bold ${style.body}`}>{fit.reasoning || 'Awaiting AI analysis.'}</p>
      {risks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/60">
          <p className="text-[9px] font-bold uppercase text-slate-600 mb-2">Documented Risks ({risks.length})</p>
          <ul className="space-y-1">
            {risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-slate-700">
                <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {feasibleKnown && !fit.feasible && (
        <div className="mt-4 p-3 bg-rose-100/60 border border-rose-300 rounded-lg">
          <p className="text-[10px] font-bold text-rose-700">⚠ AI flagged this resident as clinically infeasible for this facility type. Admission requires explicit override and capability-gap mitigation.</p>
        </div>
      )}
    </div>
  );
}

function FacilityMatchPanel({ lead, homeData, residents }) {
  const match = matchHomeToNeeds(homeData, lead, residents);
  const capacityColor = match.capacityOk ? 'emerald' : 'rose';
  const allMet = match.gaps.length === 0;

  return (
    <div className={`glass-card p-6 border-2 ${allMet && match.capacityOk ? 'border-emerald-300 bg-emerald-50/30' : 'border-amber-300 bg-amber-50/30'}`}>
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-xs font-black uppercase tracking-widest text-slate-700">Facility Match — Needs vs. Capability & Capacity</h5>
        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${match.overallFit ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
          {match.overallFit ? 'Match' : 'Review'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Required Capabilities — Met ({match.met.length})</p>
          {match.met.length === 0 ? (
            <p className="text-[11px] text-muted italic">None inferred from extraction.</p>
          ) : (
            <ul className="space-y-1">
              {match.met.map(m => (
                <li key={m.capability} className="flex items-center gap-2 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="font-medium">{m.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10px] font-bold text-rose-700 uppercase mb-2">Capability Gaps ({match.gaps.length})</p>
          {match.gaps.length === 0 ? (
            <p className="text-[11px] text-emerald-700 font-medium">All required capabilities are licensed at this facility.</p>
          ) : (
            <ul className="space-y-1">
              {match.gaps.map(g => (
                <li key={g.capability} className="flex items-center gap-2 text-[11px]">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span className="font-medium">{g.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4">
        <div>
          <p className="text-[9px] font-bold text-muted uppercase">Bed Capacity</p>
          <p className={`text-sm font-black text-${capacityColor}-700`}>{match.occupied} / {match.capacity || '—'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-muted uppercase">Capacity Status</p>
          <p className={`text-sm font-bold text-${capacityColor}-700`}>{match.capacityOk ? 'Bed Available' : 'At Capacity'}</p>
        </div>
        <div>
          <p className="text-[9px] font-bold text-muted uppercase">Recommendation</p>
          <p className="text-sm font-bold text-slate-800">{match.overallFit ? 'Proceed to Care Plan' : 'Mitigate Gaps First'}</p>
        </div>
      </div>

      {match.gaps.length > 0 && (
        <p className="mt-3 text-[10px] text-amber-700 italic">
          Capability gaps must be mitigated via RN delegation, contract services, or external agency before admission. The generated care plan will explicitly address each gap.
        </p>
      )}
    </div>
  );
}

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
                identity: { name: 'James AX', dob: '05/12/1945', age: 80, sex: 'M', preferredName: 'Jim', primaryLanguage: 'English' },
                diagnoses: { primary: 'Vascular Dementia', secondary: ['Hypertension', 'Type 2 Diabetes Mellitus'], chronicConditions: ['Osteoarthritis'], icd10Codes: ['F01.50', 'I10', 'E11.9'] },
                medications: [
                  { name: 'Donepezil', dosage: '10mg', frequency: 'Daily', route: 'PO', indication: 'Dementia', prescriber: 'Dr. Chen' },
                  { name: 'Lisinopril', dosage: '20mg', frequency: 'Daily', route: 'PO', indication: 'HTN', prescriber: 'Dr. Chen' },
                  { name: 'Metformin', dosage: '500mg', frequency: 'BID', route: 'PO', indication: 'T2DM', prescriber: 'Dr. Chen' }
                ],
                allergies: { drug: ['Penicillin'], food: [], environmental: [] },
                adls: { bathing: 'Assist', dressing: 'Assist', grooming: 'Supervision', toileting: 'Supervision', transferring: 'Independent', eating: 'Independent', continence: 'Occasional', mobility: 'Walker' },
                iadls: { medication: 'Dependent', finances: 'Dependent', transportation: 'Dependent', housekeeping: 'Dependent', mealPrep: 'Dependent', phone: 'Assist' },
                cognitive: { status: 'Moderate Impairment', diagnosis: 'Vascular Dementia', behaviors: ['sundowning'], moodAffect: 'Pleasant, occasionally anxious' },
                safety: { fallHistory: '2 falls in past 6 months, no injury', fallRisk: 'High', wandering: true, elopementRisk: false, aggression: '', selfHarm: false },
                dietary: { diet: 'Regular', restrictions: ['Low sodium'], swallowingPrecautions: 'None', fluidRestriction: '' },
                advanceDirectives: { codeStatus: 'DNR', polst: true, healthcareProxy: 'Daughter, Marie AX', livingWill: true },
                insurance: { primary: 'Medicare A+B', secondary: 'BCBS Supplemental', medicareNumber: '1AB2-CD3-EF45', medicaidNumber: '' },
                contacts: {
                  primaryPhysician: { name: 'Dr. Linda Chen', phone: '555-201-3344' },
                  emergencyContact: { name: 'Marie AX', relation: 'Daughter', phone: '555-882-1100' },
                  powerOfAttorney: { name: 'Marie AX', phone: '555-882-1100' }
                },
                clinicalNotes: 'Pleasant gentleman, mobile with walker. Cooperates with cares. Family requests female caregivers when possible.',
                fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: 'Standard clinical fit for AFH with dementia and diabetic management capabilities.', risks: ['Fall risk due to dementia', 'Wandering at sundown'] }
              }
            }
          };
          await new Promise(r => setTimeout(r, 2000));
        } else {
          const stateCfg = getStateCompliance(homeData?.state || stateData.code || stateData.name);
          result = await clinicalAgent({
            intent: 'intake',
            messages: [{ role: 'user', content: `Analyze this clinical packet for a new resident admission in ${stateCfg.name} using the RCFEM framework. Evaluate Stage 1-4 for Part 1.` }],
            document: { data: base64, mimeType: file.type },
            stateName: stateCfg.name,
            stateCompliance: stateCfg
          });
        }
        
        if (result.data?.error) {
          console.error('[INTAKE] Backend error:', result.data.error, 'snippet:', result.data.rawSnippet);
          setError(result.data.error);
          setTerminalLogs(prev => [...prev, `ERROR: ${result.data.error}`]);
          setParsing(false);
          return;
        }
        const ext = result.data.extracted || {};
        console.log('[INTAKE] extracted keys:', Object.keys(ext), 'finishReason:', result.data.finishReason);
        if (Object.keys(ext).length === 0) {
          setError('AI returned no structured data. Check the document is a readable clinical packet and try again.');
          setTerminalLogs(prev => [...prev, 'ERROR: Extraction returned empty payload.']);
          setParsing(false);
          return;
        }
        // Defensive: if Gemini returns flat shape instead of nested, normalize.
        const flatDx = typeof ext.diagnosis === 'string' ? ext.diagnosis : '';
        const id = ext.identity || { name: ext.name || '', dob: ext.dob || '', age: ext.age ?? null, sex: ext.sex || '', preferredName: '', primaryLanguage: '' };
        const dx = ext.diagnoses || {
          primary: flatDx ? flatDx.split(',')[0]?.trim() : (ext.diagnosis?.primary || ''),
          secondary: flatDx ? flatDx.split(',').slice(1).map(s => s.trim()).filter(Boolean) : (ext.diagnosis?.secondary || []),
          chronicConditions: ext.diagnosis?.chronicConditions || [],
          icd10Codes: [],
        };
        const adls = ext.adls || {};
        const safety = ext.safety || { fallHistory: ext.fallHistory || '', fallRisk: '', wandering: false, elopementRisk: false, aggression: '', selfHarm: false };
        const cog = ext.cognitive || {};
        const primaryDx = dx.primary || (Array.isArray(ext.diagnosis) ? ext.diagnosis.join(', ') : ext.diagnosis) || '';
        const allDx = [primaryDx, ...(dx.secondary || []), ...(dx.chronicConditions || [])].filter(Boolean).join(', ');
        const nextForm = {
          ..._leadForm,
          ...CLINICAL_SCHEMA,
          identity: { ...CLINICAL_SCHEMA.identity, ...id },
          diagnoses: { ...CLINICAL_SCHEMA.diagnoses, ...dx },
          medications: ext.medications || [],
          allergies: { ...CLINICAL_SCHEMA.allergies, ...(ext.allergies || {}) },
          adls: { ...CLINICAL_SCHEMA.adls, ...adls },
          iadls: { ...CLINICAL_SCHEMA.iadls, ...(ext.iadls || {}) },
          cognitive: { ...CLINICAL_SCHEMA.cognitive, ...cog },
          safety: { ...CLINICAL_SCHEMA.safety, ...safety },
          dietary: { ...CLINICAL_SCHEMA.dietary, ...(ext.dietary || {}) },
          advanceDirectives: { ...CLINICAL_SCHEMA.advanceDirectives, ...(ext.advanceDirectives || {}) },
          insurance: { ...CLINICAL_SCHEMA.insurance, ...(ext.insurance || {}) },
          contacts: { ...CLINICAL_SCHEMA.contacts, ...(ext.contacts || {}) },
          clinicalNotes: ext.clinicalNotes || '',
          fitDetermination: ext.fitDetermination || { feasible: true, recommendation: 'Accept', reasoning: 'Standard fit.', risks: [] },
          name: id.name || ext.name || '',
          dob: id.dob || ext.dob || '',
          diagnosis: allDx,
          rcfem: {
            part1: ext.rcfem?.part1 || {
              stage1: { clinicalNeeds: allDx, adls, meds: ext.medications || [] },
              stage2: { falls: safety.fallHistory || 'None', behavior: (cog.behaviors || []).join(', ') || 'None documented' },
              stage3: { lifestyle: 'Pending interview', cultural: id.primaryLanguage || 'Default' },
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
        const stateCfg = getStateCompliance(homeData?.state || stateData.code || targetState);
        const match = matchHomeToNeeds(homeData, _leadForm, residents);
        result = await clinicalAgent({
          intent: 'generate_care_plan',
          residentData: _leadForm,
          messages: [{ role: 'user', content: `Generate care plan for ${stateCfg.name}.` }],
          stateName: stateCfg.name,
          stateCompliance: stateCfg,
          homeContext: {
            homeName: homeData?.homeName || homeData?.agencyName || '',
            licenseNumber: homeData?.licenseNumber || '',
            capacity: match.capacity,
            occupied: match.occupied,
            capabilities: homeData?.capabilities || [],
            gaps: match.gaps.map(g => g.label)
          }
        });
      }
      const cpText = result.data.choices?.[0]?.message?.content || result.data.carePlan || "Care plan generated.";
      const validation = validateCarePlanForState(cpText, homeData?.state || stateData.code || targetState);
      if (!validation.valid) {
        console.warn('[PIPELINE] Care plan missing state compliance markers:', validation.missing);
        setError(`Care plan may be missing required state markers: ${validation.missing.join(', ')}. Review carefully before admission.`);
      }
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
        <button onClick={() => { setActiveModal('upload'); setParsing(false); setError(null); setTerminalLogs([]); }} className="bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20">
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
            {(parsing || terminalLogs.length > 0) && (
              <div className="mt-8 p-8 bg-slate-900 font-mono text-xs rounded-2xl">
                {terminalLogs.map((l, i) => {
                  const isErr = /^ERROR/i.test(l);
                  return <div key={i} className={isErr ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{`> ${l}`}</div>;
                })}
                {parsing && <div className="text-indigo-300 mt-2 animate-pulse">{`> WORKING...`}</div>}
              </div>
            )}
            {error && (
              <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-rose-700">Extraction failed</p>
                  <p className="text-xs text-rose-600 mt-1 whitespace-pre-wrap">{error}</p>
                  <button
                    onClick={() => { setError(null); setTerminalLogs([]); }}
                    className="mt-3 text-xs font-bold text-rose-700 hover:underline"
                  >
                    Dismiss and retry
                  </button>
                </div>
              </div>
            )}
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

                      <AIFitAnalysisCard lead={_leadForm} />

                      {/* Stage 1: Comprehensive Clinical Extraction */}
                      <ExtractionMirror lead={_leadForm} rcfemScores={rcfemScores} setRcfemScores={setRcfemScores} rcfemRationales={rcfemRationales} setRcfemRationales={setRcfemRationales} />

                      {/* Facility Match: needs vs. home capabilities & capacity */}
                      <FacilityMatchPanel lead={_leadForm} homeData={homeData} residents={residents} />

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
                      {(() => {
                        const rec = (_leadForm.fitDetermination?.recommendation || '').toLowerCase();
                        const aiDeclined = rec.includes('decline') || rec.includes('not appropriate') || _leadForm.fitDetermination?.feasible === false;
                        const humanAllows = calculateTotalScore() > 51;
                        if (aiDeclined && humanAllows) {
                          return (
                            <div className="glass-card p-5 border-2 border-rose-400 bg-rose-50/60 flex items-start gap-3">
                              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-black text-rose-700 uppercase">AI vs Human Score Conflict</p>
                                <p className="text-xs text-rose-700 mt-1">
                                  The AI clinical analysis recommends <span className="font-bold">{_leadForm.fitDetermination?.recommendation || 'Decline'}</span>
                                  {' '}but your RCFEM score ({calculateTotalScore()}%) permits admission.
                                  Document your override reasoning in the administrator signature field below.
                                </p>
                                {Array.isArray(_leadForm.fitDetermination?.risks) && _leadForm.fitDetermination.risks.length > 0 && (
                                  <ul className="mt-2 text-[11px] text-rose-700 list-disc list-inside">
                                    {_leadForm.fitDetermination.risks.map((r, i) => <li key={i}>{r}</li>)}
                                  </ul>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div className="glass-card p-8 text-center bg-gradient-to-br from-white to-indigo-50/30">
                        <h4 className="text-3xl font-black mb-2">Admission Decision</h4>
                        <div className="mt-4 mb-6 flex flex-col items-center gap-3">
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-muted uppercase">AI Recommendation</p>
                              <p className={`text-lg font-black ${recommendationStyle(_leadForm.fitDetermination?.recommendation).title}`}>
                                {recommendationStyle(_leadForm.fitDetermination?.recommendation).label}
                              </p>
                            </div>
                            <div className="w-px h-12 bg-slate-200" />
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-muted uppercase">RCFEM Score (Human)</p>
                              <p className={`text-lg font-black ${calculateTotalScore() >= 85 ? 'text-emerald-500' : calculateTotalScore() >= 70 ? 'text-indigo-500' : 'text-rose-500'}`}>
                                {calculateTotalScore()}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mb-12">
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
