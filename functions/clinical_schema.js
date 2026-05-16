function buildSchemaPromptBlock() {
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

exports.buildSchemaPromptBlock = buildSchemaPromptBlock;
