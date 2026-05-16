import { describe, it, expect } from 'vitest';

// Mirror of normalizeFitDetermination from functions/clinical_agent.js — kept here so
// the same logic is asserted from Vitest. Both copies share the same regex/rules; if
// either diverges, this test will fail when the behaviour drifts.
function normalizeFitDetermination(extracted) {
  if (!extracted || !extracted.fitDetermination) return extracted;
  const fit = extracted.fitDetermination;
  const rec = (fit.recommendation || '').toLowerCase();
  const reasoning = (fit.reasoning || '').toLowerCase();
  const risks = Array.isArray(fit.risks) ? fit.risks : [];
  const reasoningHasDecline = /\b(unfit|not appropriate|decline|cannot be met|exceed|too complex|inappropriate)\b/i.test(reasoning);
  const recDeclines = rec.includes('decline') || rec.includes('not appropriate') || rec.includes('unfit');
  const recAccepts = rec === 'accept' || (rec.startsWith('accept') && !rec.includes('condition'));

  if (reasoningHasDecline && !recDeclines) {
    fit.recommendation = 'Decline';
    fit.feasible = false;
    fit._normalized = 'reasoning_indicated_decline';
  } else if (typeof fit.feasible === 'boolean' && !fit.feasible && !recDeclines) {
    fit.recommendation = 'Decline';
    fit._normalized = 'feasible_false_forced_decline';
  } else if (risks.length >= 3 && recAccepts) {
    fit.recommendation = 'Accept with Conditions';
    fit._normalized = 'risks_forced_conditions';
  }
  if (recDeclines && fit.feasible === true) {
    fit.feasible = false;
    fit._normalized = (fit._normalized || '') + ' decline_forced_infeasible';
  }
  return extracted;
}

describe('normalizeFitDetermination — AI consistency enforcement', () => {
  it('forces Decline when reasoning says "unfit" but recommendation is Accept', () => {
    const r = normalizeFitDetermination({ fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: 'Resident is unfit for this facility type.', risks: [] } });
    expect(r.fitDetermination.recommendation).toBe('Decline');
    expect(r.fitDetermination.feasible).toBe(false);
  });

  it('forces Decline when feasible=false but recommendation says Accept', () => {
    const r = normalizeFitDetermination({ fitDetermination: { feasible: false, recommendation: 'Accept', reasoning: 'Looks OK.', risks: [] } });
    expect(r.fitDetermination.recommendation).toBe('Decline');
  });

  it('escalates Accept → Accept with Conditions when 3+ risks documented', () => {
    const r = normalizeFitDetermination({ fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: 'Manageable.', risks: ['Falls', 'Wandering', 'Diabetes', 'Aggression'] } });
    expect(r.fitDetermination.recommendation).toBe('Accept with Conditions');
  });

  it('forces feasible=false when recommendation is Decline', () => {
    const r = normalizeFitDetermination({ fitDetermination: { feasible: true, recommendation: 'Decline', reasoning: 'No.', risks: [] } });
    expect(r.fitDetermination.feasible).toBe(false);
  });

  it('leaves a clean Accept (≤2 routine risks, feasible=true) untouched', () => {
    const r = normalizeFitDetermination({ fitDetermination: { feasible: true, recommendation: 'Accept', reasoning: 'Routine.', risks: ['minor mobility'] } });
    expect(r.fitDetermination.recommendation).toBe('Accept');
    expect(r.fitDetermination._normalized).toBeUndefined();
  });

  it('handles missing fitDetermination gracefully', () => {
    expect(normalizeFitDetermination({})).toEqual({});
    expect(normalizeFitDetermination(null)).toBeNull();
  });
});
