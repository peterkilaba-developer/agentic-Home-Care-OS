import { US_STATES, DEFAULT_STATE } from '../data/statesData';
import { extractStateCode } from './compliance';

const REQUIRED_CONFIG_FIELDS = ['code', 'name', 'facilityType', 'shortFacilityType', 'complianceLaw', 'regulator'];

export function getStateCompliance(input) {
  if (!input) return DEFAULT_STATE;
  const code = typeof input === 'string'
    ? input.toLowerCase()
    : extractStateCode(input);
  return US_STATES[code] || DEFAULT_STATE;
}

export function assertStateConfigComplete(stateCode) {
  const cfg = US_STATES[stateCode?.toLowerCase()];
  if (!cfg) return { valid: false, missing: ['state not found'] };
  const missing = REQUIRED_CONFIG_FIELDS.filter(f => !cfg[f]);
  return { valid: missing.length === 0, missing };
}

export function getStateRequiredForms(stateCode) {
  return getStateCompliance(stateCode).forms || [];
}

export function validateCarePlanForState(carePlanText, stateCode) {
  const cfg = getStateCompliance(stateCode);
  const haystack = (carePlanText || '').toLowerCase();
  const checks = {
    regulator: cfg.regulator && haystack.includes(cfg.regulator.toLowerCase()),
    complianceLaw: cfg.complianceLaw && haystack.includes(cfg.complianceLaw.toLowerCase()),
    facilityType: cfg.shortFacilityType && haystack.includes(cfg.shortFacilityType.toLowerCase()),
    stateName: cfg.name && haystack.includes(cfg.name.toLowerCase()),
  };
  const missing = Object.keys(checks).filter(k => !checks[k]);
  return { valid: missing.length === 0, missing, checks, state: cfg };
}

export function buildStateSystemPrompt(stateCode) {
  const cfg = getStateCompliance(stateCode);
  const formsLine = cfg.forms?.length
    ? `Reference these state-mandated forms: ${cfg.forms.map(f => f.title).join('; ')}.`
    : `No state-specific forms are catalogued — apply ${cfg.regulator} general assisted-living standards.`;
  return [
    `You are operating under ${cfg.name} state compliance.`,
    `Facility type: ${cfg.facilityType} (${cfg.shortFacilityType}).`,
    `Governing law: ${cfg.complianceLaw}. Regulator: ${cfg.regulator}.`,
    cfg.maxBeds ? `Maximum beds for this facility type: ${cfg.maxBeds}.` : null,
    cfg.twoPartyConsent ? `${cfg.name} is a two-party consent state — any voice/recording features require explicit consent.` : null,
    cfg.aiDisclosureRequired ? `${cfg.name} requires AI-use disclosure on resident-facing materials.` : null,
    formsLine,
    `Care plans must explicitly reference ${cfg.complianceLaw}, ${cfg.regulator}, and the ${cfg.shortFacilityType} facility type.`,
  ].filter(Boolean).join('\n');
}
