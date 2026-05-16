import { describe, it, expect } from 'vitest';
import {
  CLINICAL_SCHEMA,
  deriveRequiredCapabilities,
  deriveAcuityGaps,
  matchHomeToNeeds,
  buildSchemaPromptBlock,
} from '../utils/clinicalSchema';

describe('Clinical schema & facility matching', () => {
  describe('CLINICAL_SCHEMA shape', () => {
    it('declares every top-level section a downstream consumer expects', () => {
      expect(Object.keys(CLINICAL_SCHEMA)).toEqual(expect.arrayContaining([
        'identity', 'diagnoses', 'medications', 'allergies',
        'adls', 'iadls', 'cognitive', 'safety', 'dietary',
        'advanceDirectives', 'insurance', 'contacts',
        'clinicalNotes', 'fitDetermination',
      ]));
    });
  });

  describe('deriveRequiredCapabilities', () => {
    it('flags diabetic_mgmt when diagnoses mention diabetes', () => {
      const ext = { diagnoses: { primary: 'Type 2 Diabetes Mellitus', secondary: [], chronicConditions: [] } };
      const caps = deriveRequiredCapabilities(ext).map(c => c.capability);
      expect(caps).toContain('diabetic_mgmt');
    });

    it('flags dementia_care when diagnosis or cognitive status indicates impairment', () => {
      expect(deriveRequiredCapabilities({ diagnoses: { primary: 'Vascular Dementia' } })
        .map(c => c.capability)).toContain('dementia_care');
      expect(deriveRequiredCapabilities({ cognitive: { status: 'Moderate Impairment' } })
        .map(c => c.capability)).toContain('dementia_care');
    });

    it('flags med_admin when any medication is listed', () => {
      const ext = { medications: [{ name: 'Lisinopril' }] };
      expect(deriveRequiredCapabilities(ext).map(c => c.capability)).toContain('med_admin');
    });

    it('flags wound_care for pressure ulcers / skin breakdown', () => {
      const ext = { diagnoses: { primary: 'Stage 2 pressure ulcer, sacrum' } };
      expect(deriveRequiredCapabilities(ext).map(c => c.capability)).toContain('wound_care');
    });

    it('flags hospice_care for DNR code status or terminal diagnosis', () => {
      expect(deriveRequiredCapabilities({ advanceDirectives: { codeStatus: 'DNR' } })
        .map(c => c.capability)).toContain('hospice_care');
      expect(deriveRequiredCapabilities({ diagnoses: { primary: 'Terminal pancreatic cancer' } })
        .map(c => c.capability)).toContain('hospice_care');
    });

    it('flags incontinence_mgmt when continence requires assist', () => {
      expect(deriveRequiredCapabilities({ adls: { continence: 'Incontinent' } })
        .map(c => c.capability)).toContain('incontinence_mgmt');
    });

    it('flags behavioral_support for documented behaviors or wandering', () => {
      expect(deriveRequiredCapabilities({ safety: { wandering: true } })
        .map(c => c.capability)).toContain('behavioral_support');
      expect(deriveRequiredCapabilities({ cognitive: { behaviors: ['sundowning', 'agitation'] } })
        .map(c => c.capability)).toContain('behavioral_support');
    });

    it('flags adl_support when any ADL needs assistance', () => {
      const ext = { adls: { bathing: 'Assist', dressing: 'Independent' } };
      expect(deriveRequiredCapabilities(ext).map(c => c.capability)).toContain('adl_support');
    });

    it('returns empty array for fully independent resident with no dx and no meds', () => {
      const ext = { adls: { bathing: 'Independent' }, medications: [] };
      expect(deriveRequiredCapabilities(ext)).toEqual([]);
    });
  });

  describe('matchHomeToNeeds', () => {
    const jamesAxLike = {
      identity: { name: 'James AX', age: 79 },
      diagnoses: { primary: 'Vascular Dementia', secondary: ['Hypertension', 'Type 2 Diabetes'] },
      medications: [{ name: 'Donepezil' }, { name: 'Lisinopril' }, { name: 'Metformin' }],
      adls: { bathing: 'Assist', dressing: 'Assist', mobility: 'Independent', continence: 'Continent' },
      cognitive: { status: 'Moderate Impairment' },
      safety: { fallRisk: 'High', wandering: true },
      advanceDirectives: { codeStatus: 'DNR' },
    };

    it('marks gaps when home lacks required capabilities', () => {
      const home = { capacity: 6, capabilities: ['adl_support', 'med_admin'] };
      const result = matchHomeToNeeds(home, jamesAxLike, []);
      const gapCaps = result.gaps.map(g => g.capability);
      expect(gapCaps).toEqual(expect.arrayContaining(['dementia_care', 'diabetic_mgmt', 'hospice_care', 'behavioral_support']));
      expect(result.overallFit).toBe(false);
    });

    it('reports overallFit=true when all needs are met and beds available', () => {
      const home = {
        capacity: 6,
        capabilities: ['adl_support', 'med_admin', 'dementia_care', 'diabetic_mgmt', 'hospice_care', 'behavioral_support'],
      };
      const result = matchHomeToNeeds(home, jamesAxLike, [{}, {}]);
      expect(result.gaps).toEqual([]);
      expect(result.capacityOk).toBe(true);
      expect(result.overallFit).toBe(true);
    });

    it('flags capacity violation when residents >= capacity', () => {
      const home = { capacity: 2, capabilities: [] };
      const fullResidents = [{}, {}];
      const result = matchHomeToNeeds(home, jamesAxLike, fullResidents);
      expect(result.capacityOk).toBe(false);
      expect(result.overallFit).toBe(false);
    });

    it('treats capacity 0 (agency) as always OK on capacity', () => {
      const agency = { capacity: 0, capabilities: ['adl_support', 'med_admin', 'dementia_care', 'diabetic_mgmt', 'hospice_care', 'behavioral_support'] };
      const result = matchHomeToNeeds(agency, jamesAxLike, []);
      expect(result.capacityOk).toBe(true);
    });
  });

  describe('deriveAcuityGaps — flag care levels beyond ALF/AFH scope', () => {
    it('flags total ADL dependence as blocking', () => {
      const ext = { adls: { bathing: 'Total Care', dressing: 'Total Care', grooming: 'Total Care', toileting: 'Total Care', transferring: 'Total Care', eating: 'Total Care', continence: 'Incontinent', mobility: 'Bedbound' } };
      const gaps = deriveAcuityGaps(ext);
      expect(gaps.some(g => /total adl dependence/i.test(g.label) && g.severity === 'block')).toBe(true);
    });

    it('flags bedfast / non-ambulatory mobility as blocking', () => {
      const ext = { adls: { mobility: 'Bedbound' } };
      expect(deriveAcuityGaps(ext).some(g => /bedfast|non-ambulatory/i.test(g.label) && g.severity === 'block')).toBe(true);
    });

    it('flags Hoyer / two-person transfer as a warn', () => {
      const ext = { clinicalNotes: 'Requires Hoyer lift for all transfers.' };
      expect(deriveAcuityGaps(ext).some(g => /mechanical lift|two-person/i.test(g.label))).toBe(true);
    });

    it('flags vent/trach/feeding tube/IV as SNF-required (block)', () => {
      expect(deriveAcuityGaps({ clinicalNotes: 'Has G-tube feeding.' })
        .some(g => g.severity === 'block')).toBe(true);
      expect(deriveAcuityGaps({ diagnoses: { primary: 'Vent-dependent respiratory failure' } })
        .some(g => g.severity === 'block')).toBe(true);
    });

    it('returns no gaps for routine assisted-living needs', () => {
      const ext = { adls: { bathing: 'Assist', mobility: 'Walker' } };
      expect(deriveAcuityGaps(ext)).toEqual([]);
    });
  });

  describe('matchHomeToNeeds — AI override + acuity gating', () => {
    const fullCapsHome = {
      capacity: 6,
      capabilities: ['adl_support', 'med_admin', 'dementia_care', 'diabetic_mgmt', 'hospice_care', 'behavioral_support', 'incontinence_mgmt', 'wound_care'],
    };

    it('overallFit=false when AI recommendation is Decline, even if all capability boxes are checked', () => {
      const ext = {
        adls: { bathing: 'Assist' },
        medications: [{ name: 'X' }],
        fitDetermination: { feasible: false, recommendation: 'Decline', reasoning: 'Needs SNF.', risks: ['skin breakdown'] },
      };
      const result = matchHomeToNeeds(fullCapsHome, ext, []);
      expect(result.aiDeclined).toBe(true);
      expect(result.overallFit).toBe(false);
    });

    it('overallFit=false when acuity is blocking (e.g., Hoyer + total dependence), even with all caps met', () => {
      const ext = {
        adls: { bathing: 'Total Care', dressing: 'Total Care', grooming: 'Total Care', toileting: 'Total Care', transferring: 'Total Care', eating: 'Total Care', continence: 'Incontinent', mobility: 'Bedbound' },
        medications: [{ name: 'X' }],
        clinicalNotes: 'Two-person Hoyer transfers required.',
        fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: '', risks: [] },
      };
      const result = matchHomeToNeeds(fullCapsHome, ext, []);
      expect(result.acuityBlocking).toBe(true);
      expect(result.overallFit).toBe(false);
    });

    it('extracts wound_care need from risks/notes, not just diagnoses', () => {
      const ext = { fitDetermination: { risks: ['high risk for skin breakdown'] } };
      const caps = deriveRequiredCapabilities(ext).map(c => c.capability);
      expect(caps).toContain('wound_care');
    });

    it('extracts incontinence_mgmt from "indwelling catheter" mentioned anywhere', () => {
      const ext = { clinicalNotes: 'Has indwelling Foley catheter.' };
      expect(deriveRequiredCapabilities(ext).map(c => c.capability)).toContain('incontinence_mgmt');
    });
  });

  describe('buildSchemaPromptBlock', () => {
    it('mentions every required field block name', () => {
      const block = buildSchemaPromptBlock();
      ['identity', 'diagnoses', 'medications', 'allergies', 'adls', 'iadls',
       'cognitive', 'safety', 'dietary', 'advanceDirectives', 'insurance',
       'contacts', 'clinicalNotes', 'fitDetermination'].forEach(k => {
        expect(block).toContain(`"${k}"`);
      });
    });

    it('enforces the strict-JSON requirement language', () => {
      expect(buildSchemaPromptBlock()).toMatch(/STRICT JSON/);
      expect(buildSchemaPromptBlock()).toMatch(/Do NOT omit fields/i);
    });
  });
});
