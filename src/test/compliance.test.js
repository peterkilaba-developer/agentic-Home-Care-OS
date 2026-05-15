import { describe, it, expect } from 'vitest';
import { calculateTotalFitScore, isFitForAdmission, getFitRecommendation, extractStateCode } from '../utils/compliance';

describe('RCFEM Compliance Logic', () => {
  it('calculates total score correctly based on weights', () => {
    const perfectScores = {
      clinical: 100,
      safety: 100,
      personCentered: 100,
      operational: 100,
      observation: 100,
      alignment: 100
    };
    expect(calculateTotalFitScore(perfectScores)).toBe(100);

    const partialScores = {
      clinical: 80, // 0.25 * 80 = 20
      safety: 60,   // 0.20 * 60 = 12
      personCentered: 40, // 0.15 * 40 = 6
      operational: 50, // 0.20 * 50 = 10
      observation: 70, // 0.15 * 70 = 10.5
      alignment: 90    // 0.05 * 90 = 4.5
    };
    // 20 + 12 + 6 + 10 + 10.5 + 4.5 = 63
    expect(calculateTotalFitScore(partialScores)).toBe(63);
  });

  it('enforces the 51% fit threshold', () => {
    expect(isFitForAdmission(50)).toBe(false);
    expect(isFitForAdmission(51)).toBe(false);
    expect(isFitForAdmission(52)).toBe(true);
    expect(isFitForAdmission(100)).toBe(true);
  });

  it('provides correct recommendations based on score', () => {
    expect(getFitRecommendation(90)).toBe('Strong Fit Recommendation');
    expect(getFitRecommendation(75)).toBe('Accept with Care Plan Mods');
    expect(getFitRecommendation(55)).toBe('High Risk Admission');
    expect(getFitRecommendation(40)).toBe('Not Appropriate for Placement');
  });

  describe('extractStateCode', () => {
    it('extracts state from address with zip code', () => {
      expect(extractStateCode({ address: '123 Main St, Seattle, WA 98101' })).toBe('wa');
    });

    it('extracts state from comma separated string', () => {
      expect(extractStateCode({ address: '123 Main St, Portland, OR' })).toBe('or');
    });

    it('falls back to explicit state field', () => {
      expect(extractStateCode({ state: 'ID' })).toBe('id');
    });

    it('defaults to us if no state info found', () => {
      expect(extractStateCode({})).toBe('us');
    });
  });
});
