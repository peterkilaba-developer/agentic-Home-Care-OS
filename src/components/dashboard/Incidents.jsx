import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Plus, X, Loader2, ChevronDown, ChevronUp,
  User, Clock, FileText, Printer, CheckCircle2, Circle
} from 'lucide-react';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy
} from 'firebase/firestore';
import { db } from '../../firebase';

const INCIDENT_TYPES = [
  { value: 'fall', label: 'Fall / Near-Fall', color: 'rose' },
  { value: 'medication_error', label: 'Medication Error', color: 'orange' },
  { value: 'behavioral', label: 'Behavioral Incident', color: 'amber' },
  { value: 'medical_emergency', label: 'Medical Emergency', color: 'red' },
  { value: 'elopement', label: 'Elopement / Wandering', color: 'violet' },
  { value: 'property_damage', label: 'Property Damage', color: 'sky' },
  { value: 'abuse_neglect', label: 'Suspected Abuse / Neglect', color: 'red' },
  { value: 'other', label: 'Other', color: 'slate' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low — No injury, minor concern' },
  { value: 'moderate', label: 'Moderate — Required intervention, first aid' },
  { value: 'serious', label: 'Serious — Injury requiring professional medical care' },
  { value: 'critical', label: 'Critical — Life-threatening, hospitalization, or death' },
];

const NOTIFICATION_OPTIONS = [
  { value: 'family', label: 'Family / Emergency Contact' },
  { value: 'physician', label: 'Primary Physician' },
  { value: 'doh', label: 'Department of Health (DOH)' },
  { value: 'case_manager', label: 'Case Manager / Social Worker' },
  { value: 'ems', label: 'Emergency Medical Services (EMS)' },
  { value: 'law_enforcement', label: 'Law Enforcement' },
  { value: 'ombudsman', label: 'Long-Term Care Ombudsman' },
];

function colorClass(color, type = 'bg') {
  const map = {
    rose:   { bg: 'bg-rose-500/10',   text: 'text-rose-500',   border: 'border-rose-500/30' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
    amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-500',  border: 'border-amber-500/30' },
    red:    { bg: 'bg-red-600/10',    text: 'text-red-600',    border: 'border-red-600/30' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
    sky:    { bg: 'bg-sky-500/10',    text: 'text-sky-500',    border: 'border-sky-500/30' },
    slate:  { bg: 'bg-slate-500/10',  text: 'text-slate-500',  border: 'border-slate-500/30' },
  };
  return map[color]?.[type] || map.slate[type];
}

function IncidentForm({ homeData, residents, onClose, createSystemLog }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    incidentType: '',
    severity: '',
    residentId: '',
    residentName: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: new Date().toTimeString().slice(0, 5),
    location: '',
    description: '',
    immediateActions: '',
    injuries: '',
    witnesses: '',
    notifications: [],
    notificationNotes: '',
    reportedBy: '',
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function toggleNotification(val) {
    setForm(f => ({
      ...f,
      notifications: f.notifications.includes(val)
        ? f.notifications.filter(n => n !== val)
        : [...f.notifications, val],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.incidentType) { setError('Please select an incident type.'); return; }
    if (!form.severity) { setError('Please select a severity level.'); return; }
    if (!form.incidentDate) { setError('Please enter the incident date.'); return; }
    if (!form.incidentTime) { setError('Please enter the time the incident occurred.'); return; }
    if (!form.description.trim()) { setError('Please describe what happened.'); return; }
    if (!form.reportedBy.trim()) { setError('Please enter the name of the person reporting.'); return; }

    setSaving(true);
    setError('');
    try {
      const incidentRef = await addDoc(collection(db, 'incidents'), {
        homeId: homeData.id,
        ownerId: homeData.ownerId,
        ...form,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const typLabel = INCIDENT_TYPES.find(t => t.value === form.incidentType)?.label || form.incidentType;
      const residentLabel = form.residentName ? ` — ${form.residentName}` : '';
      if (createSystemLog) {
        await createSystemLog(
          'INCIDENT_REPORTED',
          `Incident reported: ${typLabel}${residentLabel} (${form.severity} severity).`,
          form.residentId || null,
          form.residentName || null,
        );
      }
      onClose(incidentRef.id);
    } catch (err) {
      console.error('Incident save error:', err);
      setError('Failed to save incident report. Please try again.');
      setSaving(false);
    }
  }

  const activeResidents = residents?.filter(r => r.homeId === homeData?.id && r.status !== 'discharged') || [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => onClose(null)} />
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-surface border border-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[92vh]">

        <div className="p-6 border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" /> New Incident Report
            </h3>
            <p className="text-xs text-muted mt-0.5">All fields marked * are required for state compliance.</p>
          </div>
          <button onClick={() => onClose(null)} className="p-2 hover:bg-surface/60 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Incident type + severity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Incident Type *</label>
                <select value={form.incidentType} onChange={e => set('incidentType', e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Select type…</option>
                  {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Severity *</label>
                <select value={form.severity} onChange={e => set('severity', e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Select severity…</option>
                  {SEVERITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>

            {/* Resident + location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Resident Involved</label>
                <select
                  value={form.residentId}
                  onChange={e => {
                    const r = activeResidents.find(x => x.id === e.target.value);
                    set('residentId', e.target.value);
                    set('residentName', r?.name || r?.identity?.name || '');
                  }}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Not resident-specific / Unknown</option>
                  {activeResidents.map(r => (
                    <option key={r.id} value={r.id}>{r.name || r.identity?.name || '(Unnamed Resident)'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Location in Facility</label>
                <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                  placeholder="e.g. Bedroom #2, Hallway, Bathroom…"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            {/* Date + time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Date of Incident *</label>
                <input type="date" value={form.incidentDate} onChange={e => set('incidentDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Time of Incident *</label>
                <input type="time" value={form.incidentTime} onChange={e => set('incidentTime', e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Narrative Description *</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={4} placeholder="Describe what happened in detail. Include the sequence of events, who was present, and the resident's condition at the time…"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
            </div>

            {/* Injuries + immediate actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Injuries / Condition</label>
                <textarea value={form.injuries} onChange={e => set('injuries', e.target.value)}
                  rows={3} placeholder="Describe any injuries observed or 'No visible injuries noted'…"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Immediate Actions Taken</label>
                <textarea value={form.immediateActions} onChange={e => set('immediateActions', e.target.value)}
                  rows={3} placeholder="First aid given, 911 called, resident moved to safe location…"
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
            </div>

            {/* Witnesses */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Witnesses</label>
              <input type="text" value={form.witnesses} onChange={e => set('witnesses', e.target.value)}
                placeholder="Names of staff, residents, or other witnesses present…"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Notifications Made</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {NOTIFICATION_OPTIONS.map(n => (
                  <button key={n.value} type="button"
                    onClick={() => toggleNotification(n.value)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                      form.notifications.includes(n.value)
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-border bg-surface/50 text-muted hover:border-primary/40'
                    }`}>
                    {form.notifications.includes(n.value)
                      ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      : <Circle className="w-4 h-4 flex-shrink-0 opacity-40" />}
                    {n.label}
                  </button>
                ))}
              </div>
              {form.notifications.length > 0 && (
                <textarea value={form.notificationNotes} onChange={e => set('notificationNotes', e.target.value)}
                  rows={2} placeholder="Notification details (times notified, names of individuals contacted, responses received)…"
                  className="w-full mt-3 bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              )}
            </div>

            {/* Reported by */}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">Report Completed By *</label>
              <input type="text" value={form.reportedBy} onChange={e => set('reportedBy', e.target.value)}
                placeholder="Full name and title of staff completing this report…"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>

            {error && <p className="text-sm text-rose-500 font-medium">{error}</p>}
          </div>

          <div className="p-6 border-t border-border flex gap-3 flex-shrink-0">
            <button type="button" onClick={() => onClose(null)}
              className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl font-bold text-sm hover:bg-surface/60 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><AlertTriangle className="w-4 h-4" /> Submit Incident Report</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function IncidentCard({ incident, onExpand, expanded }) {
  const typeInfo = INCIDENT_TYPES.find(t => t.value === incident.incidentType) || { label: incident.incidentType, color: 'slate' };
  const severityColors = {
    low: 'text-emerald-500 bg-emerald-500/10',
    moderate: 'text-amber-500 bg-amber-500/10',
    serious: 'text-orange-500 bg-orange-500/10',
    critical: 'text-red-600 bg-red-600/10',
  };

  return (
    <div className={`glass-card overflow-hidden border ${colorClass(typeInfo.color, 'border')}`}>
      <button className="w-full p-5 text-left" onClick={onExpand}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${colorClass(typeInfo.color, 'bg')} ${colorClass(typeInfo.color, 'text')}`}>
                {typeInfo.label}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest ${severityColors[incident.severity] || 'text-muted bg-surface'}`}>
                {incident.severity}
              </span>
            </div>
            <p className="text-sm font-semibold line-clamp-1">{incident.description}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {incident.incidentDate} {incident.incidentTime && `at ${incident.incidentTime}`}
              </span>
              {incident.residentName && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {incident.residentName}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-border/50">
            <div className="p-5 space-y-4 text-sm">
              {incident.injuries && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Injuries / Condition</p>
                  <p>{incident.injuries}</p>
                </div>
              )}
              {incident.immediateActions && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Immediate Actions Taken</p>
                  <p>{incident.immediateActions}</p>
                </div>
              )}
              {incident.witnesses && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Witnesses</p>
                  <p>{incident.witnesses}</p>
                </div>
              )}
              {incident.notifications?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Notifications Made</p>
                  <div className="flex flex-wrap gap-1">
                    {incident.notifications.map(n => {
                      const opt = NOTIFICATION_OPTIONS.find(o => o.value === n);
                      return (
                        <span key={n} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
                          {opt?.label || n}
                        </span>
                      );
                    })}
                  </div>
                  {incident.notificationNotes && (
                    <p className="mt-2 text-muted text-xs italic">{incident.notificationNotes}</p>
                  )}
                </div>
              )}
              {incident.location && (
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Location</p>
                  <p>{incident.location}</p>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <p className="text-xs text-muted">
                  Reported by: <span className="font-semibold">{incident.reportedBy}</span>
                </p>
                <button onClick={() => window.print()}
                  className="flex items-center gap-1 text-xs font-bold text-muted hover:text-foreground transition-colors px-3 py-1.5 border border-border rounded-lg">
                  <Printer className="w-3 h-3" /> Print
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IncidentsView({ homeData, residents = [], createSystemLog }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!homeData?.id) return;
    const q = query(
      collection(db, 'incidents'),
      where('homeId', '==', homeData.id),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setIncidents(arr);
      setLoading(false);
    }, err => {
      console.error('Incidents fetch error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [homeData?.id]);

  const filtered = filter === 'all'
    ? incidents
    : incidents.filter(i => i.incidentType === filter);

  const criticalCount = incidents.filter(i => i.severity === 'critical' || i.severity === 'serious').length;
  const thisMonthCount = incidents.filter(i => {
    const d = new Date(i.incidentDate);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  function handleFormClose(newId) {
    setShowForm(false);
    if (newId) setExpandedId(newId);
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incident Reports</h1>
          <p className="text-muted">State-mandated incident logging and tracking for {homeData?.homeName || 'this facility'}.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-rose-500 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform text-sm">
          <Plus className="w-4 h-4" /> Report Incident
        </button>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Total Incidents</p>
          <p className="text-3xl font-black">{incidents.length}</p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">This Month</p>
          <p className="text-3xl font-black">{thisMonthCount}</p>
        </div>
        <div className={`glass-card p-5 ${criticalCount > 0 ? 'border-rose-500/30' : ''}`}>
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-1">Serious / Critical</p>
          <p className={`text-3xl font-black ${criticalCount > 0 ? 'text-rose-500' : ''}`}>{criticalCount}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
            filter === 'all' ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:border-primary/40'
          }`}>
          All Types
        </button>
        {INCIDENT_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`text-xs font-bold px-4 py-2 rounded-xl border transition-colors ${
              filter === t.value
                ? `${colorClass(t.color, 'bg')} ${colorClass(t.color, 'text')} ${colorClass(t.color, 'border')}`
                : 'border-border text-muted hover:border-primary/40'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Incident list */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted opacity-40" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center glass-card bg-surface/30">
          <FileText className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
          <h3 className="text-xl font-bold mb-2">
            {incidents.length === 0 ? 'No Incidents Reported' : 'No incidents match this filter'}
          </h3>
          <p className="text-sm text-muted max-w-sm mx-auto mb-8">
            {incidents.length === 0
              ? 'Document all incidents promptly to maintain state compliance and audit readiness.'
              : 'Try selecting a different incident type or clear the filter.'}
          </p>
          {incidents.length === 0 && (
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" /> Report First Incident
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(incident => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              expanded={expandedId === incident.id}
              onExpand={() => setExpandedId(v => v === incident.id ? null : incident.id)}
            />
          ))}
        </div>
      )}

      {/* New incident form modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showForm && (
            <IncidentForm
              homeData={homeData}
              residents={residents}
              onClose={handleFormClose}
              createSystemLog={createSystemLog}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
