export const US_STATES = {
  al: { code: 'al', name: "Alabama", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Chapter 420-5-4", regulator: "ADPH", pricing: "$497/mo" },
  ak: { code: 'ak', name: "Alaska", facilityType: "Assisted Living Home (ALH)", shortFacilityType: "ALH", complianceLaw: "7 AAC 75", regulator: "DHSS", pricing: "$497/mo" },
  az: { code: 'az', name: "Arizona", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Title 9, Chapter 10", regulator: "ADHS", pricing: "$497/mo" },
  ar: { code: 'ar', name: "Arkansas", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Rules for ALF", regulator: "DHS", pricing: "$497/mo" },
  ca: { 
    code: 'ca', 
    name: "California", 
    facilityType: "Residential Care Facility for the Elderly (RCFE)", 
    shortFacilityType: "RCFE", 
    complianceLaw: "Title 22, Division 6", 
    regulator: "CDSS", 
    pricing: "$597/mo", 
    twoPartyConsent: true,
    maxBeds: 6,
    forms: [
      { id: 'ca-1', title: 'LIC 602A Physician\'s Report', description: 'Mandatory health assessment for RCFE residents.', type: 'PDF' },
      { id: 'ca-2', title: 'LIC 603 Pre-Admission Appraisal', description: 'Required appraisal of prospective residents.', type: 'PDF' },
      { id: 'ca-3', title: 'LIC 9020 Resident Rights', description: 'Standardized rights and responsibilities poster.', type: 'PDF' },
      { id: 'ca-4', title: 'LIC 601 Incident Report', description: 'Standard unusual incident reporting form.', type: 'PDF' }
    ]
  },
  co: { code: 'co', name: "Colorado", facilityType: "Assisted Living Residence (ALR)", shortFacilityType: "ALR", complianceLaw: "6 CCR 1011-1", regulator: "CDPHE", pricing: "$497/mo" },
  ct: { code: 'ct', name: "Connecticut", facilityType: "Assisted Living Services Agency (ALSA)", shortFacilityType: "ALSA", complianceLaw: "Public Health Code", regulator: "DPH", pricing: "$497/mo" },
  de: { code: 'de', name: "Delaware", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Title 16", regulator: "DHSS", pricing: "$497/mo" },
  fl: { 
    code: 'fl', 
    name: "Florida", 
    facilityType: "Assisted Living Facility (ALF)", 
    shortFacilityType: "ALF", 
    complianceLaw: "Chapter 429, Part I", 
    regulator: "AHCA", 
    pricing: "$497/mo", 
    twoPartyConsent: true,
    maxBeds: 15,
    forms: [
      { id: 'fl-1', title: 'AHCA Form 1823', description: 'Resident Health Assessment for ALFs.', type: 'PDF' },
      { id: 'fl-2', title: 'Standard Resident Contract', description: 'Required Florida ALF residency agreement.', type: 'Docx' },
      { id: 'fl-3', title: 'Incident Reporting (18-Day)', description: 'Adverse incident report for AHCA.', type: 'PDF' }
    ]
  },
  ga: { code: 'ga', name: "Georgia", facilityType: "Personal Care Home (PCH)", shortFacilityType: "PCH", complianceLaw: "Chapter 111-8-62", regulator: "DCH", pricing: "$497/mo" },
  hi: { code: 'hi', name: "Hawaii", facilityType: "Adult Residential Care Home (ARCH)", shortFacilityType: "ARCH", complianceLaw: "Chapter 11-100.1", regulator: "DOH", pricing: "$497/mo" },
  id: { code: 'id', name: "Idaho", facilityType: "Residential Care or Assisted Living Facility (RALF)", shortFacilityType: "RALF", complianceLaw: "IDAPA 16.03.22", regulator: "DHW", pricing: "$497/mo" },
  il: { code: 'il', name: "Illinois", facilityType: "Assisted Living Establishment (ALE)", shortFacilityType: "ALE", complianceLaw: "77 Ill. Adm. Code 295", regulator: "IDPH", pricing: "$497/mo", twoPartyConsent: true },
  in: { code: 'in', name: "Indiana", facilityType: "Residential Care Facility (RCF)", shortFacilityType: "RCF", complianceLaw: "410 IAC 16.2", regulator: "ISDH", pricing: "$497/mo" },
  ia: { 
    code: 'ia', 
    name: "Iowa", 
    facilityType: "Assisted Living Program (ALP)", 
    shortFacilityType: "ALP", 
    complianceLaw: "Chapter 69", 
    regulator: "DIA", 
    pricing: "$497/mo",
    agencyPricing: "$497/mo + $249/staff",
    medicaidName: "IA Health Link",
    forms: [
      { id: 'ia-1', title: 'DIA Resident Assessment', description: 'Standard Iowa Chapter 69 assessment.', type: 'PDF' },
      { id: 'ia-2', title: 'Nurse Delegation Logs', description: 'RN tasks for Iowa ALP medication management.', type: 'PDF' }
    ]
  },
  ks: { code: 'ks', name: "Kansas", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "K.A.R. 28-39", regulator: "KDADS", pricing: "$497/mo" },
  ky: { code: 'ky', name: "Kentucky", facilityType: "Assisted Living Community (ALC)", shortFacilityType: "ALC", complianceLaw: "910 KAR 1:090", regulator: "CHFS", pricing: "$497/mo" },
  la: { code: 'la', name: "Louisiana", facilityType: "Adult Residential Care Provider (ARCP)", shortFacilityType: "ARCP", complianceLaw: "Title 48, Part I", regulator: "LDH", pricing: "$497/mo" },
  me: { code: 'me', name: "Maine", facilityType: "Assisted Housing Program", shortFacilityType: "AHP", complianceLaw: "10-144 CMR Ch. 113", regulator: "DHHS", pricing: "$497/mo" },
  md: { code: 'md', name: "Maryland", facilityType: "Assisted Living Program (ALP)", shortFacilityType: "ALP", complianceLaw: "COMAR 10.07.14", regulator: "MDH", pricing: "$497/mo", twoPartyConsent: true },
  ma: { code: 'ma', name: "Massachusetts", facilityType: "Assisted Living Residence (ALR)", shortFacilityType: "ALR", complianceLaw: "651 CMR 12.00", regulator: "EOEA", pricing: "$497/mo", twoPartyConsent: true },
  mi: { code: 'mi', name: "Michigan", facilityType: "Adult Foster Care Home (AFC)", shortFacilityType: "AFC", complianceLaw: "Public Act 218", regulator: "LARA", pricing: "$497/mo", twoPartyConsent: true },
  mn: { code: 'mn', name: "Minnesota", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Chapter 144G", regulator: "MDH", pricing: "$497/mo" },
  ms: { code: 'ms', name: "Mississippi", facilityType: "Personal Care Home (PCH)", shortFacilityType: "PCH", complianceLaw: "Title 15, Part 3", regulator: "MSDH", pricing: "$497/mo" },
  mo: { code: 'mo', name: "Missouri", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "19 CSR 30-82", regulator: "DHSS", pricing: "$497/mo" },
  mt: { code: 'mt', name: "Montana", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "ARM 37.106", regulator: "DPHHS", pricing: "$497/mo", twoPartyConsent: true },
  ne: { code: 'ne', name: "Nebraska", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Title 175 NAC 12", regulator: "DHHS", pricing: "$497/mo" },
  nv: { code: 'nv', name: "Nevada", facilityType: "Residential Facility for Groups (RFG)", shortFacilityType: "RFG", complianceLaw: "NAC 449", regulator: "DPBH", pricing: "$497/mo", twoPartyConsent: true },
  nh: { code: 'nh', name: "New Hampshire", facilityType: "Supported Residential Health Care Facility", shortFacilityType: "SRHCF", complianceLaw: "He-P 805", regulator: "DHHS", pricing: "$497/mo", twoPartyConsent: true },
  nj: { 
    code: 'nj', 
    name: "New Jersey", 
    facilityType: "Assisted Living Residence (ALR)", 
    shortFacilityType: "ALR", 
    complianceLaw: "N.J.A.C. 8:36", 
    regulator: "DCA", 
    pricing: "$497/mo",
    forms: [
      { id: 'nj-1', title: 'DCA Uniform Assessment', description: 'Standardized assessment for NJ ALR residency.', type: 'PDF' },
      { id: 'nj-2', title: 'General Service Plan', description: 'Required NJ state-aligned care planning template.', type: 'PDF' }
    ]
  },
  nm: { code: 'nm', name: "New Mexico", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "7.8.2 NMAC", regulator: "DOH", pricing: "$497/mo" },
  ny: { 
    code: 'ny', 
    name: "New York", 
    facilityType: "Adult Care Facility (ACF)", 
    shortFacilityType: "ACF", 
    complianceLaw: "18 NYCRR Part 485", 
    regulator: "DOH", 
    pricing: "$597/mo",
    forms: [
      { id: 'ny-1', title: 'DOH-4397 Medical Evaluation', description: 'Mandatory NY state medical report for ACF admission.', type: 'PDF' },
      { id: 'ny-2', title: 'Resident Individualized Service Plan', description: 'Required New York state care planning framework.', type: 'PDF' }
    ]
  },
  nc: { code: 'nc', name: "North Carolina", facilityType: "Adult Care Home (ACH)", shortFacilityType: "ACH", complianceLaw: "10A NCAC 13F", regulator: "DHHS", pricing: "$497/mo" },
  nd: { code: 'nd', name: "North Dakota", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "NDAC 33-03-24.1", regulator: "DHS", pricing: "$497/mo" },
  oh: { code: 'oh', name: "Ohio", facilityType: "Residential Care Facility (RCF)", shortFacilityType: "RCF", complianceLaw: "OAC 3701-16", regulator: "ODH", pricing: "$497/mo" },
  ok: { code: 'ok', name: "Oklahoma", facilityType: "Assisted Living Center (ALC)", shortFacilityType: "ALC", complianceLaw: "OAC 310:663", regulator: "OSDH", pricing: "$497/mo" },
  or: { code: 'or', name: "Oregon", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "OAR 411-054", regulator: "DHS", pricing: "$497/mo" },
  pa: { code: 'pa', name: "Pennsylvania", facilityType: "Personal Care Home (PCH)", shortFacilityType: "PCH", complianceLaw: "55 Pa. Code Ch. 2600", regulator: "DHS", pricing: "$497/mo", twoPartyConsent: true },
  ri: { code: 'ri', name: "Rhode Island", facilityType: "Assisted Living Residence (ALR)", shortFacilityType: "ALR", complianceLaw: "216-RICR-40-10-2", regulator: "DOH", pricing: "$497/mo" },
  sc: { code: 'sc', name: "South Carolina", facilityType: "Community Residential Care Facility (CRCF)", shortFacilityType: "CRCF", complianceLaw: "Regulation 61-84", regulator: "DHEC", pricing: "$497/mo" },
  sd: { code: 'sd', name: "South Dakota", facilityType: "Assisted Living Center (ALC)", shortFacilityType: "ALC", complianceLaw: "ARSD 44:70", regulator: "DOH", pricing: "$497/mo" },
  tn: { code: 'tn', name: "Tennessee", facilityType: "Assisted Care Living Facility (ACLF)", shortFacilityType: "ACLF", complianceLaw: "Chapter 1200-08-25", regulator: "DOH", pricing: "$497/mo" },
  tx: { 
    code: 'tx', 
    name: "Texas", 
    facilityType: "Assisted Living Facility (ALF)", 
    shortFacilityType: "ALF", 
    complianceLaw: "Chapter 247, HSC", 
    regulator: "HHSC", 
    pricing: "$497/mo", 
    aiDisclosureRequired: true,
    forms: [
      { id: 'tx-1', title: 'HHSC Form 3647', description: 'Comprehensive Client Assessment.', type: 'PDF' },
      { id: 'tx-2', title: 'Admission Disclosure', description: 'Required Texas facility disclosure statement.', type: 'Docx' }
    ]
  },
  ut: { code: 'ut', name: "Utah", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "R432-270", regulator: "DHHS", pricing: "$497/mo" },
  vt: { code: 'vt', name: "Vermont", facilityType: "Assisted Living Residence (ALR)", shortFacilityType: "ALR", complianceLaw: "ALR Licensing Regulations", regulator: "DAIL", pricing: "$497/mo" },
  va: { code: 'va', name: "Virginia", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "22VAC40-73", regulator: "DSS", pricing: "$497/mo" },
  wa: { 
    code: 'wa', 
    name: "Washington", 
    facilityType: "Adult Family Home (AFH)", 
    shortFacilityType: "AFH", 
    complianceLaw: "WAC 246-335", 
    regulator: "DSHS", 
    pricing: "$497/mo", 
    agencyPricing: "$497/mo + $249/staff",
    medicaidName: "Apple Health", 
    twoPartyConsent: true,
    maxBeds: 6,
    forms: [
      { id: 'wa-1', title: 'DSHS Assessment (13-712)', description: 'Comprehensive Assessment for WA AFH residents.', type: 'PDF' },
      { id: 'wa-2', title: 'Negotiated Care Plan', description: 'Standard WAC 388-76-10440 compliance template.', type: 'PDF' },
      { id: 'wa-3', title: 'RCW 70.129 Resident Rights', description: 'Mandatory WA state resident rights disclosure.', type: 'PDF' },
      { id: 'wa-4', title: 'Nurse Delegation Request', description: 'Official DSHS RN delegation task form.', type: 'PDF' }
    ]
  },
  wv: { code: 'wv', name: "West Virginia", facilityType: "Assisted Living Residence (ALR)", shortFacilityType: "ALR", complianceLaw: "CSR 64-14", regulator: "DHHR", pricing: "$497/mo" },
  wi: { code: 'wi', name: "Wisconsin", facilityType: "Community Based Residential Facility (CBRF)", shortFacilityType: "CBRF", complianceLaw: "DHS 83", regulator: "DHS", pricing: "$497/mo" },
  wy: { code: 'wy', name: "Wyoming", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "Chapter 12", regulator: "WDH", pricing: "$497/mo" },
  us: { code: 'us', name: "National", facilityType: "Assisted Living Facility (ALF)", shortFacilityType: "ALF", complianceLaw: "State Regulations", regulator: "Local DOH", pricing: "$497/mo (Small Home) | $497/mo + $97/staff (Large Facility)", agencyPricing: "$497/mo + $249/staff", medicaidName: "State Medicaid", maxBeds: 6 }
};

export const DEFAULT_STATE = US_STATES.us;
