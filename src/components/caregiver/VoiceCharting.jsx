import React, { useState, useEffect, useRef } from 'react';
import { Mic, UserSquare2, Loader2, Type, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db, functions } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

function EmptyResidentState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 h-full min-h-[50vh]">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 border border-primary/20">
        <UserSquare2 className="w-10 h-10 text-primary opacity-80" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">No Resident Selected</h2>
      <p className="text-sm text-muted max-w-[250px]">Please select a resident from the Residents tab to view their specific chart and tasks.</p>
    </div>
  );
}

export default function VoiceCharting({ stateData, activeShiftId, homeId, staffProfile, distance, activeResidentId, residents }) {
  const activeResident = residents.find(p => p.id === activeResidentId) || residents[0];
  const pName = activeResident?.name ? activeResident.name.split(' ')[0] : 'Resident';
  const residentId = activeResident?.id || 'unknown';
  const [recording, setRecording] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [synthesizedNote, setSynthesizedNote] = useState('');
  const [agentEngine, setAgentEngine] = useState('');
  const [railsApplied, setRailsApplied] = useState([]);
  const [inputMode, setInputMode] = useState('voice');
  const [textInput, setTextInput] = useState('');
  const [history, setHistory] = useState([]);
  const [consentObtained, setConsentObtained] = useState(false);

  useEffect(() => {
    if (!homeId || !residentId) return;
    const q = query(collection(db, 'clinical_notes'), where('residentId', '==', residentId), orderBy('createdAt', 'desc'), limit(5));
    const unsub = onSnapshot(q, (snap) => {
      let arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setHistory(arr);
    });
    return () => unsub();
  }, [homeId, residentId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(prev => prev + ' ' + currentTranscript);
        };
        recognitionRef.current = rec;
      }
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {
          // The browser can throw if recognition was never started.
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const handleRecord = async () => {
    const recognition = recognitionRef.current;
    if (stateData?.twoPartyConsent && !consentObtained && !recording) {
      alert(`Resident consent is required for audio recording in ${stateData.name} per state eavesdropping statutes.`);
      return;
    }
    if (recording) {
      if (recognition) recognition.stop();
      setRecording(false);
      setShowLog(true);
      await processNote(transcript);
    } else {
      setTranscript('');
      setSynthesizedNote('');
      setAgentEngine('');
      setRailsApplied([]);
      if (recognition) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('Speech recognition failed to start', e);
        }
      }
      setRecording(true);
      if (!recognition) {
        setTimeout(async () => {
          const mockTranscript = `${pName} ate about half her eggs this morning. She bumped her arm on the dining chair but her skin is intact. No bruising. Also her SSN is 123-45-6789 and I am a doctor so I diagnose her with a contusion.`;
          setTranscript(mockTranscript);
          setRecording(false);
          setShowLog(true);
          await processNote(mockTranscript);
        }, 3000);
      }
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setTranscript(textInput);
    setSynthesizedNote('');
    setAgentEngine('');
    setRailsApplied([]);
    setShowLog(true);
    await processNote(textInput);
  };

  const processNote = async (textToProcess) => {
    setIsProcessing(true);
    try {
      const callClinicalAgent = httpsCallable(functions, 'clinicalAgent');
      const response = await callClinicalAgent({
        intent: 'scribe',
        messages: [
          { 
            role: 'system', 
            content: `You are a clinical AI scribe. Format the following raw audio transcript into a professional, objective, compliant nursing shift note for a patient named ${activeResident?.name}. 
            TODAY'S DATE: ${new Date().toLocaleDateString()}
            CURRENT TIME: ${new Date().toLocaleTimeString()}
            Do not use subjective language. If specific data like vitals or times are missing, use [ ] placeholders but prefer using the provided current date/time where appropriate.` 
          },
          { role: 'user', content: textToProcess }
        ]
      });

      const data = response.data;
      if (data.choices && data.choices.length > 0) {
        setSynthesizedNote(data.choices[0].message.content);
        if (data.nemoclaw) {
          setAgentEngine(data.nemoclaw.target_engine);
          if (data.nemoclaw.rails_applied) {
            setRailsApplied(data.nemoclaw.rails_applied);
          }
        }
      } else {
        setSynthesizedNote("Failed to synthesize note.");
      }
    } catch (err) {
      console.error("Clinical Agent Error:", err);
      setSynthesizedNote(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const redactPII = (text) => {
    if (!text) return '';
    return text
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED-PHONE]');
  };

  const handleSubmit = async () => {
    try {
      const redactedTranscript = redactPII(transcript);
      const logData = {
        type: 'AI_SCRIBE',
        message: `Shift Note Recorded: ${redactedTranscript.substring(0, 50)}...`,
        residentId: residentId,
        residentName: activeResident?.name || 'Resident',
        fullTranscript: redactedTranscript,
        synthesizedNote: synthesizedNote,
        agentEngine: agentEngine,
        createdAt: serverTimestamp(),
        caregiverId: auth.currentUser?.uid || 'unknown',
        caregiverName: staffProfile?.name || auth.currentUser?.email || 'Caregiver',
        homeId: homeId || 'unknown',
        shiftId: activeShiftId || 'unknown',
        geofenceDistance: distance !== null ? distance : 'unknown',
        verifiedOnPremises: distance !== null && distance <= 150
      };

      // 1. Log to telemetry
      await addDoc(collection(db, 'system_logs'), logData);

      // 2. Persist to permanent clinical records
      await addDoc(collection(db, 'clinical_notes'), logData);

      setShowLog(false);
      setTranscript('');
      setSynthesizedNote('');
      setTextInput('');
    } catch (e) { console.error(e); }
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pt-2 h-full flex flex-col">
      <div className="px-4 mb-4 mt-4 flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-foreground flex items-center gap-2"><Mic className="w-5 h-5 text-accent" /> AI Scribe</h3>
          <p className="text-xs text-muted">Clinical documentation for {pName}</p>
        </div>
        <div className="flex bg-surface rounded-lg p-1 border border-border">
          <button onClick={() => setInputMode('voice')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${inputMode === 'voice' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>Voice</button>
          <button onClick={() => setInputMode('text')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${inputMode === 'text' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}>Text</button>
        </div>
      </div>

      <div className="flex-1 px-4 overflow-y-auto pb-20">
        {!showLog ? (
          <div className="h-64 flex flex-col items-center justify-center relative">
            {inputMode === 'voice' ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  {recording && <div className="w-32 h-32 bg-primary/20 rounded-full animate-ping" />}
                </div>
                <button onClick={handleRecord} className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-rose-500 scale-110 shadow-[0_0_30px_rgba(244,63,94,0.6)]' : 'bg-primary shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105'}`}>
                  {recording ? <div className="w-8 h-8 bg-white rounded-sm" /> : <Mic className="w-10 h-10 text-white" />}
                </button>
                <p className="mt-8 text-foreground font-bold">{recording ? 'Listening...' : 'Tap to Record Note'}</p>
                <p className="text-xs text-muted mt-2 max-w-[250px] text-center">Speak naturally. The AI will extract clinical data and format it securely.</p>
                
                {stateData?.twoPartyConsent && !recording && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl max-w-sm">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={consentObtained}
                        onChange={(e) => setConsentObtained(e.target.checked)}
                        className="w-5 h-5 rounded border-white/20 bg-surface text-primary focus:ring-primary"
                      />
                      <span className="text-[10px] text-slate-400 group-hover:text-white transition-colors leading-tight text-left">
                        I certify that I have obtained verbal or written consent from the resident/representative to record this encounter per {stateData.name} law.
                      </span>
                    </label>
                  </motion.div>
                )}
              </>
            ) : (
              <div className="w-full flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type your raw shift notes here. The AI will format and synthesize them objectively..."
                  className="w-full h-40 bg-surface/50 border border-border rounded-2xl p-4 text-foreground text-sm focus:outline-none focus:border-primary resize-none placeholder:text-muted/50"
                />
                <button 
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-full bg-primary hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" /> Synthesize Note
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-surface/50 border border-border rounded-2xl overflow-hidden glass-card shadow-lg shadow-black/5">
              <div className="bg-background/50 p-3 border-b border-border flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Raw Input ({inputMode})</span>
              </div>
              <div className="p-4">
                <p className="text-sm text-foreground italic opacity-70">"{transcript}"</p>
              </div>
            </div>

            <div className="bg-surface/50 border border-border rounded-2xl overflow-hidden glass-card shadow-lg shadow-black/5 border-primary/20">
              <div className="bg-primary/10 p-3 border-b border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isProcessing ? <Loader2 className="w-4 h-4 text-primary animate-spin" /> : <Mic className="w-4 h-4 text-primary" />}
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                    {isProcessing ? `AI Synthesizing...` : `Synthesized Note`}
                  </span>
                </div>
                {!isProcessing && agentEngine && (
                  <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded font-mono font-bold border border-primary/30">
                    {agentEngine}
                  </span>
                )}
              </div>
              <div className="p-4">
                {isProcessing ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-foreground/5 rounded w-3/4" />
                    <div className="h-3 bg-foreground/5 rounded w-1/2" />
                    <div className="h-3 bg-foreground/5 rounded w-5/6" />
                  </div>
                ) : (
                  <textarea 
                    value={synthesizedNote}
                    onChange={(e) => setSynthesizedNote(e.target.value)}
                    className="w-full h-64 bg-transparent text-sm text-foreground leading-relaxed focus:outline-none resize-none border-none p-0"
                    placeholder="Refine the AI note or fill in missing details here..."
                  />
                )}
              </div>
              
              {railsApplied.length > 0 && !isProcessing && (
                <div className="bg-background/50 p-2 px-4 border-t border-white/5 flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-slate-500">RAILS APPLIED:</span>
                  {railsApplied.map(rail => (
                    <span key={rail} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-mono">{rail}</span>
                  ))}
                </div>
              )}
            </div>
            
            <button disabled={isProcessing} onClick={handleSubmit} className="w-full mt-6 bg-primary py-4 rounded-xl font-bold text-white hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
              Submit Note to RN Delegator
            </button>
          </div>
        )}

        {/* RECENT HISTORY */}
        {history.length > 0 && !showLog && (
          <div className="mt-8 animate-in slide-in-from-bottom-4 duration-500">
            <h4 className="text-[10px] font-bold text-muted uppercase tracking-widest mb-3 px-1">Recent Records</h4>
            <div className="flex flex-col gap-3">
              {history.map(note => (
                <div key={note.id} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-muted">{note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Just now'}</span>
                    <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold border border-primary/20">{note.agentEngine}</span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed line-clamp-3 opacity-80">{note.synthesizedNote}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
