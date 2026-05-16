function buildStateSystemPrompt(cfg) {
  if (!cfg || !cfg.name) {
    return 'You are operating under U.S. national assisted-living standards. No state-specific overrides supplied.';
  }
  const formsLine = Array.isArray(cfg.forms) && cfg.forms.length
    ? `Reference these state-mandated forms: ${cfg.forms.map(f => f.title).join('; ')}.`
    : `No state-specific forms catalogued — apply ${cfg.regulator} general assisted-living standards.`;
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

exports.buildStateSystemPrompt = buildStateSystemPrompt;
