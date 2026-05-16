import { describe, it, expect } from 'vitest';
import {
  getStateCompliance,
  assertStateConfigComplete,
  getStateRequiredForms,
  validateCarePlanForState,
  buildStateSystemPrompt,
} from '../utils/stateCompliance';
import { US_STATES } from '../data/statesData';

const SAMPLE_STATES = ['wa', 'ca', 'fl', 'ny', 'tx'];

describe('State-aware compliance', () => {
  describe('config completeness', () => {
    it.each(SAMPLE_STATES)('%s has all required compliance fields', (code) => {
      const { valid, missing } = assertStateConfigComplete(code);
      expect(missing).toEqual([]);
      expect(valid).toBe(true);
    });

    it('every catalogued US state has the required fields (no silent drift)', () => {
      const broken = Object.keys(US_STATES)
        .filter(code => code !== 'us')
        .map(code => ({ code, ...assertStateConfigComplete(code) }))
        .filter(r => !r.valid);
      expect(broken).toEqual([]);
    });
  });

  describe('lookup', () => {
    it('returns the right facilityType per state', () => {
      expect(getStateCompliance('wa').facilityType).toMatch(/Adult Family Home/);
      expect(getStateCompliance('ca').facilityType).toMatch(/RCFE/);
      expect(getStateCompliance('fl').facilityType).toMatch(/ALF/);
      expect(getStateCompliance('ny').facilityType).toMatch(/Adult Care Facility/);
      expect(getStateCompliance('tx').facilityType).toMatch(/ALF/);
    });

    it('returns the right regulator + complianceLaw per state', () => {
      expect(getStateCompliance('wa')).toMatchObject({ regulator: 'DSHS', complianceLaw: 'WAC 246-335' });
      expect(getStateCompliance('ca')).toMatchObject({ regulator: 'CDSS', complianceLaw: 'Title 22, Division 6' });
      expect(getStateCompliance('fl')).toMatchObject({ regulator: 'AHCA', complianceLaw: 'Chapter 429, Part I' });
      expect(getStateCompliance('ny')).toMatchObject({ regulator: 'DOH', complianceLaw: '18 NYCRR Part 485' });
      expect(getStateCompliance('tx')).toMatchObject({ regulator: 'HHSC', complianceLaw: 'Chapter 247, HSC' });
    });

    it('accepts a homeData object and extracts the state', () => {
      const home = { address: '123 Pine St, Seattle, WA 98101' };
      expect(getStateCompliance(home).code).toBe('wa');
    });

    it('falls back to National (us) for unknown states', () => {
      expect(getStateCompliance('zz').code).toBe('us');
      expect(getStateCompliance(null).code).toBe('us');
    });
  });

  describe('required forms', () => {
    it('returns state-mandated forms for states with them defined', () => {
      const waForms = getStateRequiredForms('wa');
      expect(waForms.length).toBeGreaterThan(0);
      expect(waForms.some(f => /DSHS Assessment/i.test(f.title))).toBe(true);

      const caForms = getStateRequiredForms('ca');
      expect(caForms.some(f => /LIC 602A/i.test(f.title))).toBe(true);

      const txForms = getStateRequiredForms('tx');
      expect(txForms.some(f => /HHSC Form 3647/i.test(f.title))).toBe(true);
    });

    it('returns empty array for states without form definitions (does not throw)', () => {
      expect(getStateRequiredForms('or')).toEqual([]);
      expect(getStateRequiredForms('co')).toEqual([]);
    });
  });

  describe('care plan validation', () => {
    it('flags a care plan that omits state-specific compliance markers', () => {
      const genericPlan = 'Care plan for resident. Provide three meals and supervision.';
      const result = validateCarePlanForState(genericPlan, 'wa');
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(expect.arrayContaining(['regulator', 'complianceLaw', 'facilityType', 'stateName']));
    });

    it('accepts a care plan that references regulator, law, facility type, and state name', () => {
      const wa = US_STATES.wa;
      const carePlan = `
        NEGOTIATED CARE PLAN
        State Compliance: ${wa.complianceLaw} (${wa.name})
        Regulating Authority: ${wa.regulator}
        Facility Type: ${wa.shortFacilityType}
      `;
      const result = validateCarePlanForState(carePlan, 'wa');
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('catches state mix-ups (CA plan against WA validator)', () => {
      const ca = US_STATES.ca;
      const caPlan = `Care plan compliant with ${ca.complianceLaw} per ${ca.regulator} for ${ca.shortFacilityType} in ${ca.name}.`;
      const result = validateCarePlanForState(caPlan, 'wa');
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  describe('system prompt builder', () => {
    it.each(SAMPLE_STATES)('builds a state-specific prompt for %s', (code) => {
      const cfg = US_STATES[code];
      const prompt = buildStateSystemPrompt(code);
      expect(prompt).toContain(cfg.name);
      expect(prompt).toContain(cfg.regulator);
      expect(prompt).toContain(cfg.complianceLaw);
      expect(prompt).toContain(cfg.shortFacilityType);
    });

    it('mentions two-party consent for WA but not for FL', () => {
      expect(buildStateSystemPrompt('wa')).toMatch(/two-party consent/i);
      expect(buildStateSystemPrompt('fl')).toMatch(/two-party consent/i); // FL also has it
      expect(buildStateSystemPrompt('ny')).not.toMatch(/two-party consent/i);
    });

    it('mentions AI disclosure requirement only for Texas', () => {
      expect(buildStateSystemPrompt('tx')).toMatch(/AI-use disclosure/i);
      expect(buildStateSystemPrompt('wa')).not.toMatch(/AI-use disclosure/i);
    });

    it('mentions maxBeds for WA (6 beds) and CA (6 beds)', () => {
      expect(buildStateSystemPrompt('wa')).toMatch(/Maximum beds.*6/);
      expect(buildStateSystemPrompt('ca')).toMatch(/Maximum beds.*6/);
    });
  });
});
