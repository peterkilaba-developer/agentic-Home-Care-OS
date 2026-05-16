const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { buildStateSystemPrompt } = require('./state_compliance');
const { buildSchemaPromptBlock } = require('./clinical_schema');

// ---------------------------------------------------------
// CLINICAL GUARDRAILS (Deterministic Layer)
// ---------------------------------------------------------
class ClinicalGuardrails {
  static JAILBREAK_PATTERNS = [
    /ignore\s+(all\s+)?(prior|previous|above)/i,
    /disregard\s+(all\s+)?(prior|previous|above)/i,
    /you\s+are\s+now/i,
    /system\s+prompt/i,
    /\bDAN\b/,
    /bypass\s+restrictions/i,
    /jailbreak/i,
    /unrestricted\s+mode/i,
  ];

  static OUT_OF_SCOPE_PATTERNS = [
    /how\s+to\s+diagnose/i,
    /what\s+disease\s+is\s+this/i,
    /prescribe\s+me/i,
    /medical\s+advice/i,
    /clinical\s+advice/i,
  ];

  static PII_PATTERNS = [
    { regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED-SSN]' },
    { regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[REDACTED-PHONE]' },
  ];

  static UPM_PHRASES = [
    /(?:I|this AI)\s+(?:am|is)\s+(?:a|your)\s+doctor/i,
    /(?:I|this AI)\s+(?:can|will)\s+diagnose\s+you/i,
  ];

  static checkInput(messages) {
    for (const msg of messages) {
      if (msg.role !== 'user') continue;
      const content = msg.content || '';

      for (const pattern of this.JAILBREAK_PATTERNS) {
        if (pattern.test(content)) {
          return { allowed: false, reason: 'Security Protocol: Prompt injection attempt detected.', rail: 'clinical.input.jailbreak_shield' };
        }
      }

      for (const pattern of this.OUT_OF_SCOPE_PATTERNS) {
        if (pattern.test(content)) {
          return { allowed: false, reason: 'Compliance Protocol: As a clinical AI assistant, I cannot diagnose or prescribe.', rail: 'clinical.input.scope_guard' };
        }
      }
    }
    return { allowed: true };
  }

  static checkOutput(content) {
    let finalContent = content;
    const rails_applied = [];
    for (const { regex, replacement } of this.PII_PATTERNS) {
      if (regex.test(finalContent)) {
        finalContent = finalContent.replace(regex, replacement);
        if (!rails_applied.includes('clinical.output.pii_redaction')) rails_applied.push('clinical.output.pii_redaction');
      }
    }
    for (const pattern of this.UPM_PHRASES) {
      if (pattern.test(finalContent)) {
        finalContent += "\n\nCOMPLIANCE NOTICE: AI-generated content is not medical advice. Professional review required.";
        rails_applied.push('clinical.output.upm_guard');
        break;
      }
    }
    return { content: finalContent, rails_applied };
  }
}

// ---------------------------------------------------------
// POLY-MODEL ROUTER
// ---------------------------------------------------------
async function callGemini(messages, maxTokens = 8192, temperature = 0.05, document = null, model = 'gemini-2.5-flash') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: 'GEMINI_API_KEY not set' };

  const contents = [];
  let systemInstruction = null;

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = m.content;
    } else {
      const parts = [];
      if (systemInstruction && contents.length === 0) {
        parts.push({ text: `SYSTEM INSTRUCTION: ${systemInstruction}\n\n` });
      }
      if (document && m.role === 'user') {
        parts.push({
          inlineData: {
            mimeType: document.mimeType || 'application/pdf',
            data: document.data.replace(/\s/g, '')
          }
        });
      }
      parts.push({ text: m.content });
      contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: parts });
    }
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature, maxOutputTokens: maxTokens } })
    });

    if (!response.ok) return { error: `Gemini API Error: ${await response.text()}` };
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) return { error: 'Gemini Error: No candidates returned.', promptFeedback: data.promptFeedback };

    const text = candidate.content?.parts?.[0]?.text || '';
    const finishReason = candidate.finishReason;
    return {
      choices: [{ message: { role: 'assistant', content: text }, finishReason }],
      model,
      usage: data.usageMetadata
    };
  } catch (err) { return { error: err.message }; }
}

async function callOpenAI(messages, maxTokens = 1024, temperature = 0.05) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { error: 'OPENAI_API_KEY not set' };
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens, temperature })
    });
    if (!response.ok) return { error: `OpenAI Error: ${await response.text()}` };
    return await response.json();
  } catch (err) { return { error: err.message }; }
}

// ---------------------------------------------------------
// FIT DETERMINATION NORMALIZER
// Catches AI inconsistency (e.g., feasible=true but reasoning says "unfit")
// and forces internal consistency before returning to the client.
// ---------------------------------------------------------
function normalizeFitDetermination(extracted) {
  if (!extracted || !extracted.fitDetermination) return extracted;
  const fit = extracted.fitDetermination;
  const rec = (fit.recommendation || '').toLowerCase();
  const reasoning = (fit.reasoning || '').toLowerCase();
  const risks = Array.isArray(fit.risks) ? fit.risks : [];

  const reasoningHasDecline = /\b(unfit|not appropriate|decline|cannot be met|exceed|too complex|inappropriate)\b/i.test(reasoning);
  const recDeclines = rec.includes('decline') || rec.includes('not appropriate') || rec.includes('unfit');
  const recAccepts = rec === 'accept' || rec.startsWith('accept') && !rec.includes('condition');

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

// ---------------------------------------------------------
// EXPORTED CLOUD FUNCTION
// ---------------------------------------------------------
exports.clinicalAgent = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login required.');

  const { intent, messages, maxTokens, temperature, document, stateName, stateCompliance, homeContext } = data;
  const stateBlock = buildStateSystemPrompt(stateCompliance);
  if (!messages || !Array.isArray(messages)) throw new HttpsError('invalid-argument', 'Messages array required.');

  // Input Guards
  const inputCheck = ClinicalGuardrails.checkInput(messages);
  if (!inputCheck.allowed) return { choices: [{ message: { role: 'assistant', content: inputCheck.reason } }], nemoclaw: { blocked: true } };

  let result = null;
  if (intent === 'intake') {
    if (!messages || !Array.isArray(messages)) throw new HttpsError('invalid-argument', 'Messages array required.');
    // Specialized Intake Logic with State Template Mirroring
    const intakeSystemPrompt = `${stateBlock}

You are an Enterprise Clinical Intake Auditor analyzing the attached clinical packet for admission to an assisted-living facility.

EXTRACTION RULES:
1. EXHAUSTIVE EXTRACTION: Extract EVERY clinical detail from the packet — identity, full medication list with dose/frequency/route, all diagnoses (primary, secondary, chronic conditions, ICD-10 codes when present), allergies (drug/food/environmental), ALL eight ADLs with assistance level, all six IADLs, cognitive status and behaviors, safety/fall history, dietary needs, code status and advance directives, insurance, primary physician, emergency contact, and power of attorney.
2. STRICT SCHEMA: Match the schema below exactly. Every field is required. When a value is genuinely absent from the source document, return empty string / empty array / false / null — never omit the key.
3. NO INVENTION: Do not fabricate data. If the document does not state a value, leave it empty. Do invert obvious negatives (e.g., "no known allergies" → empty arrays).
4. ADL LEVELS: Use only one of: "Independent", "Supervision", "Assist", "Total Care" (or for continence: "Continent", "Occasional", "Incontinent"; for mobility: "Independent", "Cane", "Walker", "Wheelchair", "Bedbound").
5. STATE COMPLIANCE: The extraction must mirror the clinical sections required by the state regulations cited above.
6. FIT DETERMINATION — INTERNAL CONSISTENCY REQUIRED:
   - "feasible" (boolean): true ONLY if the resident's clinical needs can plausibly be met in the ${stateCompliance?.shortFacilityType || 'facility'} type cited above.
   - "recommendation" (one of "Accept" | "Accept with Conditions" | "Decline"): MUST be consistent with feasible. If feasible=false, recommendation MUST be "Decline". If feasible=true with significant risks (falls, behaviors, wandering, complex meds), recommendation MUST be "Accept with Conditions". Only use "Accept" when feasible=true AND risks are routine.
   - "reasoning" (string): MUST narratively justify the chosen recommendation. Do not write reasoning that contradicts the recommendation.
   - "risks" (array): list every clinically significant risk you identified from the document. Be exhaustive — falls, wandering, aggression, complex meds, infection control, behavioral, dietary, swallowing, etc.

${buildSchemaPromptBlock()}

RESPOND WITH ONLY THE JSON OBJECT. No preamble, no markdown fences, no trailing text.`;
    
    const intakeMessages = [{ role: 'system', content: intakeSystemPrompt }, ...messages.filter(m => m.role === 'user')];
    result = await callGemini(intakeMessages, maxTokens || 16384, 0, document, 'gemini-2.5-pro');
  } else if (intent === 'generate_care_plan') {
    const { residentData } = data;
    const homeBlock = homeContext
      ? `FACILITY CONTEXT:
- Home/Agency: ${homeContext.homeName || 'Unspecified'}
- Total beds: ${homeContext.capacity || 'Unspecified'}, currently occupied: ${homeContext.occupied || 0}
- Licensed capabilities: ${(homeContext.capabilities || []).join(', ') || 'None declared'}
- Capability gaps for this resident: ${(homeContext.gaps || []).join(', ') || 'None'}
- License #: ${homeContext.licenseNumber || 'N/A'}
The care plan must explicitly state how each capability gap (if any) will be mitigated (RN delegation, contract services, outside agency, decline).`
      : 'FACILITY CONTEXT: not provided — write a generic facility-agnostic plan.';

    const carePlanPrompt = `${stateBlock}

${homeBlock}

Generate a COMPREHENSIVE, NEGOTIATED CARE PLAN for the following resident.
RESIDENT DATA (extracted from intake packet):
${JSON.stringify(residentData, null, 2)}

The care plan must include each of these sections, in order, each as its own heading:
1. RESIDENT PROFILE — full identity, DOB, room (if assigned), primary language, code status.
2. CLINICAL OVERVIEW — primary and secondary diagnoses, chronic conditions, ICD-10 codes if present.
3. MEDICATION MANAGEMENT — full med list with dose/frequency/route/indication, who administers (delegated nurse vs. self-admin), MAR cadence.
4. ADL SUPPORT PLAN — line-by-line plan for bathing, dressing, grooming, toileting, transferring, eating, continence, mobility, citing the assistance level extracted.
5. IADL SUPPORT — medication assistance, finance, transport, housekeeping, meal prep, phone.
6. COGNITIVE & BEHAVIORAL PLAN — cognitive status, documented behaviors, triggers, intervention strategies (redirection, reassurance, etc.).
7. SAFETY & FALL PREVENTION — fall risk level, history, specific interventions (bed alarm, gait belt, etc.), wandering/elopement controls if applicable.
8. DIETARY & SWALLOWING — diet texture, restrictions, swallowing precautions, fluid restriction.
9. ADVANCE DIRECTIVES & END-OF-LIFE — code status, POLST, healthcare proxy, hospice coordination if applicable.
10. CAPABILITY GAP MITIGATION — for each licensed-capability gap above, state the mitigation (or recommend decline).
11. STATE COMPLIANCE STATEMENT — explicitly cite the governing law, regulator, and facility type from the state compliance block above, and state that the plan meets those requirements.
12. SIGNATURES — placeholder lines for resident/representative and administrator with date fields.

Format as a professional, narrative-style care plan suitable for state audit. Use plain text, not markdown.`;
    
    const cpMessages = [{ role: 'user', content: carePlanPrompt }];
    result = await callGemini(cpMessages, 4096, 0.1, null, 'gemini-2.5-pro');
  } else {
    if (!messages || !Array.isArray(messages)) throw new HttpsError('invalid-argument', 'Messages array required.');
    result = await callOpenAI(messages, maxTokens, temperature);
  }

  if (!result || result.error) return { error: result?.error || 'Inference failed.' };

  // Post-Processing for Intake
  if (intent === 'intake' && result.choices) {
    const raw = result.choices[0].message.content || '';
    const finishReason = result.choices[0].finishReason;
    const usage = result.usage;
    console.log(`[intake] finishReason=${finishReason} rawLen=${raw.length} usage=${JSON.stringify(usage)}`);

    if (!raw.trim()) {
      result.error = `Gemini returned no content. finishReason=${finishReason || 'unknown'}. Check safety filters or input.`;
      return result;
    }
    if (finishReason && finishReason !== 'STOP') {
      // MAX_TOKENS, SAFETY, RECITATION etc. — JSON likely truncated.
      console.warn(`[intake] non-STOP finishReason=${finishReason} — extraction may be incomplete`);
    }

    try {
      const clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : clean;
      const parsed = JSON.parse(jsonStr);
      result.extracted = normalizeFitDetermination(parsed);
      result.finishReason = finishReason;
    } catch (e) {
      // Surface the actual parse failure with a snippet so the client can react.
      const snippet = raw.slice(0, 500);
      console.error(`[intake] JSON parse failed: ${e.message}. Snippet: ${snippet}`);
      result.error = `Extraction parse failed: ${e.message}. finishReason=${finishReason || 'unknown'}.`;
      result.rawSnippet = snippet;
      result.finishReason = finishReason;
    }
  }

  return result;
});
