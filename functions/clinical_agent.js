const { onCall, HttpsError } = require('firebase-functions/v2/https');

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
async function callGemini(messages, maxTokens = 8192, temperature = 0.05, document = null, model = 'gemini-1.5-flash') {
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
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { temperature, maxOutputTokens: maxTokens } })
    });

    if (!response.ok) return { error: `Gemini API Error: ${await response.text()}` };
    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) return { error: 'Gemini Error: No candidates returned.' };
    
    return { choices: [{ message: { role: 'assistant', content: candidate.content?.parts?.[0]?.text || '' } }], model };
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
// EXPORTED CLOUD FUNCTION
// ---------------------------------------------------------
exports.clinicalAgent = onCall(async (request) => {
  const { auth, data } = request;
  if (!auth) throw new HttpsError('unauthenticated', 'Login required.');

  const { intent, messages, maxTokens, temperature, document, stateName } = data;
  if (!messages || !Array.isArray(messages)) throw new HttpsError('invalid-argument', 'Messages array required.');

  // Input Guards
  const inputCheck = ClinicalGuardrails.checkInput(messages);
  if (!inputCheck.allowed) return { choices: [{ message: { role: 'assistant', content: inputCheck.reason } }], nemoclaw: { blocked: true } };

  let result = null;
  if (intent === 'intake') {
    if (!messages || !Array.isArray(messages)) throw new HttpsError('invalid-argument', 'Messages array required.');
    // Specialized Intake Logic with State Template Mirroring
    const intakeSystemPrompt = `You are an Enterprise Clinical Intake Auditor. 
    1. EXHAUSTIVE EXTRACTION: Extract EVERY clinical detail, including identity, medications, ADLs, and history.
    2. STATE COMPLIANCE: The extraction MUST fully mirror the clinical sections of the state-specific intake template for: ${stateName || 'National'}.
    3. FIT DETERMINATION: Perform a professional analysis. Determine if this client is a good fit for a standard ${stateName || ''} facility based on their clinical complexity.
    4. RESPOND IN JSON: Respond ONLY with a JSON object.`;
    
    const intakeMessages = [{ role: 'system', content: intakeSystemPrompt }, ...messages.filter(m => m.role === 'user')];
    result = await callGemini(intakeMessages, maxTokens, temperature, document);
  } else if (intent === 'generate_care_plan') {
    const { residentData } = data;
    const carePlanPrompt = `Generate a COMPREHENSIVE, NEGOTIATED CARE PLAN for the following resident in ${stateName || 'Washington'}.
    Resident Info: ${JSON.stringify(residentData)}
    
    The care plan must include:
    1. Clinical Overview & Diagnosis
    2. ADL Support Plan (Dressing, Bathing, etc.)
    3. Medication Management Strategy
    4. Behavioral Interventions (if applicable)
    5. Fall Prevention & Safety Protocols
    
    Format the response as a professional, narrative-style care plan suitable for state audit.`;
    
    const cpMessages = [{ role: 'user', content: carePlanPrompt }];
    result = await callGemini(cpMessages, 2048, 0.1, null, 'gemini-1.5-pro');
  } else {
    if (!messages || !Array.isArray(messages)) throw new HttpsError('invalid-argument', 'Messages array required.');
    result = await callOpenAI(messages, maxTokens, temperature);
  }

  if (!result || result.error) return { error: result?.error || 'Inference failed.' };

  // Post-Processing for Intake
  if (intent === 'intake' && result.choices) {
    try {
      const raw = result.choices[0].message.content;
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}/);
      result.extracted = JSON.parse(match ? match[0] : clean);
    } catch (e) { result.error = "Data Parsing Failed."; }
  }

  return result;
});
