export const CLINICAL_SCHEMA = {
  identity: {
    name: '',
    dob: '',
    age: null,
    sex: '',
    preferredName: '',
    primaryLanguage: '',
  },
  diagnoses: {
    primary: '',
    secondary: [],
    chronicConditions: [],
    icd10Codes: [],
  },
  medications: [],
  allergies: {
    drug: [],
    food: [],
    environmental: [],
  },
  adls: {
    bathing: '',
    dressing: '',
    grooming: '',
    toileting: '',
    transferring: '',
    eating: '',
    continence: '',
    mobility: '',
  },
  iadls: {
    medication: '',
    finances: '',
    transportation: '',
    housekeeping: '',
    mealPrep: '',
    phone: '',
  },
  cognitive: {
    status: '',
    diagnosis: '',
    behaviors: [],
    moodAffect: '',
  },
  safety: {
    fallHistory: '',
    fallRisk: '',
    wandering: false,
    elopementRisk: false,
    aggression: '',
    selfHarm: false,
  },
  dietary: {
    diet: '',
    restrictions: [],
    swallowingPrecautions: '',
    fluidRestriction: '',
  },
  advanceDirectives: {
    codeStatus: '',
    polst: false,
    healthcareProxy: '',
    livingWill: false,
  },
  insurance: {
    primary: '',
    secondary: '',
    medicareNumber: '',
    medicaidNumber: '',
  },
  contacts: {
    primaryPhysician: { name: '', phone: '' },
    emergencyContact: { name: '', relation: '', phone: '' },
    powerOfAttorney: { name: '', phone: '' },
  },
  clinicalNotes: '',
  fitDetermination: {
    feasible: true,
    recommendation: 'Accept',
    reasoning: '',
    risks: [],
  },
};

export const ADL_LEVELS = ['Independent', 'Supervision', 'Assist', 'Total Care'];

export const NEEDS_TO_CAPABILITIES = [
  { needTest: e => hasDx(e, /diabet|dm|t1dm|t2dm|hyperglyc|hypoglyc/i), capability: 'diabetic_mgmt', label: 'Diabetic Management' },
  { needTest: e => hasDx(e, /dementia|alzheimer|cogn|mci|delirium/i) || e?.cognitive?.status?.toLowerCase().includes('impair'), capability: 'dementia_care', label: 'Specialized Dementia Care' },
  { needTest: e => (e?.medications?.length || 0) > 0 || hasDx(e, /chronic|hypertens|cardiac/i), capability: 'med_admin', label: 'Medication Administration' },
  { needTest: e => hasDx(e, /wound|ulcer|pressure|skin breakdown/i), capability: 'wound_care', label: 'Wound Care' },
  { needTest: e => hasDx(e, /hospice|terminal|palliative|end[- ]of[- ]life/i) || e?.advanceDirectives?.codeStatus?.toUpperCase() === 'DNR', capability: 'hospice_care', label: 'Hospice Coordination' },
  { needTest: e => isContinenceImpaired(e?.adls?.continence) || isContinenceImpaired(e?.adls?.toileting), capability: 'incontinence_mgmt', label: 'Incontinence Management' },
  { needTest: e => (e?.cognitive?.behaviors?.length || 0) > 0 || /aggress|combat|agitat|exit[- ]seek/i.test(e?.safety?.aggression || '') || e?.safety?.wandering, capability: 'behavioral_support', label: 'Behavioral Support' },
  { needTest: e => needsAnyAdlAssistance(e?.adls), capability: 'adl_support', label: 'ADL Support' },
];

function hasDx(e, regex) {
  if (!e?.diagnoses) return false;
  const parts = [
    e.diagnoses.primary,
    ...(e.diagnoses.secondary || []),
    ...(e.diagnoses.chronicConditions || []),
  ].filter(Boolean).join(' ');
  return regex.test(parts);
}

function isContinenceImpaired(level) {
  if (!level) return false;
  return /incontinent|assist|total|dependent/i.test(level);
}

const ASSISTANCE_LEVELS = new Set([
  'supervision', 'assist', 'total care', 'dependent',
  'occasional', 'incontinent',
  'cane', 'walker', 'wheelchair', 'bedbound',
]);

function needsAnyAdlAssistance(adls) {
  if (!adls) return false;
  return Object.values(adls).some(v => {
    if (typeof v !== 'string') return false;
    return ASSISTANCE_LEVELS.has(v.trim().toLowerCase());
  });
}

export function deriveRequiredCapabilities(extracted) {
  if (!extracted) return [];
  return NEEDS_TO_CAPABILITIES
    .filter(rule => rule.needTest(extracted))
    .map(rule => ({ capability: rule.capability, label: rule.label }));
}

export function matchHomeToNeeds(homeData, extracted, residents) {
  const required = deriveRequiredCapabilities(extracted);
  const offered = new Set(homeData?.capabilities || []);
  const met = required.filter(r => offered.has(r.capability));
  const gaps = required.filter(r => !offered.has(r.capability));
  const capacity = homeData?.capacity || 0;
  const occupied = Array.isArray(residents) ? residents.length : 0;
  const capacityOk = capacity === 0 || occupied < capacity;
  return {
    required,
    met,
    gaps,
    capacityOk,
    occupied,
    capacity,
    overallFit: gaps.length === 0 && capacityOk,
  };
}

export function buildSchemaPromptBlock() {
  return `RETURN STRICT JSON MATCHING THIS SHAPE. Every field is required — use empty string, empty array, false, or null when a value is genuinely absent from the source document. Do NOT omit fields.

{
  "identity": { "name": "string", "dob": "MM/DD/YYYY", "age": number|null, "sex": "M"|"F"|"", "preferredName": "string", "primaryLanguage": "string" },
  "diagnoses": { "primary": "string", "secondary": ["string"], "chronicConditions": ["string"], "icd10Codes": ["string"] },
  "medications": [{ "name": "string", "dosage": "string", "frequency": "string", "route": "string", "indication": "string", "prescriber": "string" }],
  "allergies": { "drug": ["string"], "food": ["string"], "environmental": ["string"] },
  "adls": { "bathing": "Independent|Supervision|Assist|Total Care", "dressing": "...", "grooming": "...", "toileting": "...", "transferring": "...", "eating": "...", "continence": "Continent|Occasional|Incontinent", "mobility": "Independent|Cane|Walker|Wheelchair|Bedbound" },
  "iadls": { "medication": "Independent|Assist|Dependent", "finances": "...", "transportation": "...", "housekeeping": "...", "mealPrep": "...", "phone": "..." },
  "cognitive": { "status": "Alert|MCI|Moderate Impairment|Severe Impairment", "diagnosis": "string", "behaviors": ["wandering", "agitation", "sundowning", "etc"], "moodAffect": "string" },
  "safety": { "fallHistory": "string with dates/counts", "fallRisk": "Low|Moderate|High", "wandering": boolean, "elopementRisk": boolean, "aggression": "string", "selfHarm": boolean },
  "dietary": { "diet": "Regular|Mechanical Soft|Pureed|NPO|other", "restrictions": ["string"], "swallowingPrecautions": "string", "fluidRestriction": "string" },
  "advanceDirectives": { "codeStatus": "Full Code|DNR|DNI|Comfort", "polst": boolean, "healthcareProxy": "string", "livingWill": boolean },
  "insurance": { "primary": "string", "secondary": "string", "medicareNumber": "string", "medicaidNumber": "string" },
  "contacts": { "primaryPhysician": { "name": "string", "phone": "string" }, "emergencyContact": { "name": "string", "relation": "string", "phone": "string" }, "powerOfAttorney": { "name": "string", "phone": "string" } },
  "clinicalNotes": "any salient narrative details not captured above",
  "fitDetermination": { "feasible": boolean, "recommendation": "Accept|Accept with Conditions|Decline", "reasoning": "string", "risks": ["string"] }
}`;
}
