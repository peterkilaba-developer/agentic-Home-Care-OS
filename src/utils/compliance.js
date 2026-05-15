/**
 * RCFEM (Resident Compatibility & Fit Evaluation Model) Scoring Logic
 * Enforces strict clinical fit thresholds for facility admission.
 */

export const RCFEM_WEIGHTS = { 
  clinical: 0.25, 
  safety: 0.20, 
  personCentered: 0.15, 
  operational: 0.20, 
  observation: 0.15, 
  alignment: 0.05 
};

export const calculateTotalFitScore = (scores) => {
  let total = 0;
  Object.keys(RCFEM_WEIGHTS).forEach(k => {
    total += (scores[k] || 0) * RCFEM_WEIGHTS[k];
  });
  return Math.round(total);
};

export const isFitForAdmission = (score) => {
  return score > 51;
};

export const getFitRecommendation = (score) => {
  if (score >= 85) return 'Strong Fit Recommendation';
  if (score >= 70) return 'Accept with Care Plan Mods';
  if (score >= 51) return 'High Risk Admission';
  return 'Not Appropriate for Placement';
};

export const extractStateCode = (homeData) => {
  const address = homeData?.address || '';
  return address.match(/\s([A-Z]{2})\s\d{5}/)?.[1]?.toLowerCase() || 
         address.split(',').map(s => s.trim()).find(s => s.length === 2)?.toLowerCase() || 
         homeData?.state?.toLowerCase() || 
         'us';
};
