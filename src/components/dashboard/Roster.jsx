import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, X, ArrowRight, Activity, Calendar, LogOut, AlertCircle, Loader2 } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import ChartReport from './ChartReport';

const DISCHARGE_TYPES = [
  { value: 'home', label: 'Returned Home / Family' },
  { value: 'hospital', label: 'Hospitalized' },
  { value: 'snf', label: 'Transferred to SNF / Higher Level of Care' },
  { value: 'alf', label: 'Transferred to Another ALF / AFH' },
  { value: 'ama', label: 'Against Medical Advice (AMA)' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'other', label: 'Other' },
];

function DischargeModal({ resident, onClose, onDischarge }) {
  const [dischargeType, setDischargeType] = useState('');
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [dischargeReason, setDischargeReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!dischargeType) { setError('Please select a discharge type.'); return; }
    if (!dischargeDate) { setError('Please enter the discharge date.'); return; }
    if (!dischargeReason.trim()) { setError('Please provide discharge notes.'); return; }
    setSaving(true);
    setError('');
    try {
      await onDischarge(resident, { dischargeType, dischargeDate, dischargeReason });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to discharge resident. Please try again.');
      setSaving(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="bg-surface border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold">Discharge Resident</h3>
            <p className="text-sm text-muted mt-0.5">{resident.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface/60 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-500">
                This action marks the resident as discharged. A discharge record will be created and
                the resident will be removed from the active roster. This cannot be undone without
                re-admitting through the intake pipeline.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                Discharge Type *
              </label>
              <select
                value={dischargeType}
                onChange={e => setDischargeType(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select reason for discharge…</option>
                {DISCHARGE_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                Discharge Date *
              </label>
              <input
                type="date"
                value={dischargeDate}
                onChange={e => setDischargeDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                Clinical Notes / Discharge Summary *
              </label>
              <textarea
                value={dischargeReason}
                onChange={e => setDischargeReason(e.target.value)}
                rows={4}
                placeholder="Document the circumstances of discharge, resident condition at time of discharge, follow-up care instructions, and any notifications made (family, physician, case manager, regulator)…"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-rose-500 font-medium">{error}</p>
            )}
          </div>

          <div className="p-6 border-t border-border flex gap-3 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl font-bold text-sm hover:bg-surface/60 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-3 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><LogOut className="w-4 h-4" /> Confirm Discharge</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function ResidentCard({ resident, onViewChart, onDischarge }) {
  const isAdmitted = resident.status === 'admitted';
  const isActive = isAdmitted || !resident.status;

  return (
    <div className="glass-card p-6 flex flex-col">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg leading-tight">{resident.name || resident.identity?.name}</h3>
        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest flex-shrink-0 ml-2 ${
          isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {resident.status || 'admitted'}
        </span>
      </div>
      <p className="text-xs text-muted mb-1 line-clamp-2 italic flex-1">
        {resident.diagnosis || resident.diagnoses?.primary || 'No primary diagnosis recorded'}
      </p>
      {resident.admittedAt && (
        <p className="text-[10px] text-muted/60 mb-4">
          Admitted {new Date(resident.admittedAt).toLocaleDateString()}
        </p>
      )}
      <div className="flex gap-2 mt-auto pt-4">
        <button onClick={() => onViewChart(resident)}
          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs hover:opacity-90 transition-opacity">
          View Chart
        </button>
        {isActive && (
          <button
            onClick={() => onDischarge(resident)}
            title="Discharge resident"
            className="px-4 py-2 bg-surface border border-border rounded-lg font-bold text-xs hover:border-rose-500/50 hover:text-rose-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResidentRosterView({ residents, homeData, createSystemLog, impersonatingId }) {
  const [chartReportModal, setChartReportModal] = useState(null);
  const [assignmentModal, setAssignmentModal] = useState(null);
  const [dischargeModal, setDischargeModal] = useState(null);
  const [showDischarged, setShowDischarged] = useState(false);

  const allInHome = residents?.filter(r => r.homeId === homeData?.id) || [];
  const activeResidents = allInHome.filter(r => r.status !== 'discharged');
  const dischargedResidents = allInHome.filter(r => r.status === 'discharged');

  async function handleDischarge(resident, { dischargeType, dischargeDate, dischargeReason }) {
    const residentRef = doc(db, 'residents', resident.id);
    await updateDoc(residentRef, {
      status: 'discharged',
      dischargeType,
      dischargeDate,
      dischargeReason,
      dischargedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (createSystemLog) {
      const label = DISCHARGE_TYPES.find(d => d.value === dischargeType)?.label || dischargeType;
      await createSystemLog(
        'RESIDENT_DISCHARGED',
        `${resident.name || resident.identity?.name} discharged — ${label}.`,
        resident.id,
        resident.name || resident.identity?.name,
      );
    }
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resident Roster</h1>
          <p className="text-muted">Manage active residents and clinical charts.</p>
        </div>
        {dischargedResidents.length > 0 && (
          <button
            onClick={() => setShowDischarged(v => !v)}
            className="text-xs font-bold text-muted border border-border px-4 py-2 rounded-xl hover:bg-surface/60 transition-colors">
            {showDischarged ? 'Hide' : 'Show'} Discharged ({dischargedResidents.length})
          </button>
        )}
      </header>

      {/* Active residents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeResidents.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-surface/30">
            <Users className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-bold mb-2">No Active Residents</h3>
            <p className="text-sm text-muted max-w-sm mx-auto mb-8">
              Your roster is currently empty for {homeData?.homeName || 'this facility'}.
              Manage your admissions in the Clinical Intake Pipeline.
            </p>
            <Link to="/dashboard/intake"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              Go to Intake Pipeline <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          activeResidents.map(resident => (
            <ResidentCard
              key={resident.id}
              resident={resident}
              onViewChart={setChartReportModal}
              onDischarge={setDischargeModal}
            />
          ))
        )}
      </div>

      {/* Discharged residents (collapsible) */}
      <AnimatePresence>
        {showDischarged && dischargedResidents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-10 overflow-hidden"
          >
            <h2 className="text-lg font-bold text-muted mb-4 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Discharged Residents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dischargedResidents.map(resident => (
                <div key={resident.id} className="glass-card p-6 opacity-60">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{resident.name || resident.identity?.name}</h3>
                    <span className="text-[10px] bg-slate-500/10 text-slate-500 px-2 py-1 rounded font-bold uppercase tracking-widest">
                      Discharged
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-1 italic">
                    {DISCHARGE_TYPES.find(d => d.value === resident.dischargeType)?.label || resident.dischargeType || 'Discharge type not recorded'}
                  </p>
                  {resident.dischargeDate && (
                    <p className="text-[10px] text-muted/60 mb-4">
                      {new Date(resident.dischargeDate + 'T12:00:00').toLocaleDateString()}
                    </p>
                  )}
                  <button onClick={() => setChartReportModal(resident)}
                    className="w-full px-4 py-2 bg-surface border border-border rounded-lg font-bold text-xs hover:bg-surface/60 transition-colors">
                    View Historical Chart
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart report modal */}
      {chartReportModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="w-full max-w-6xl h-full bg-white rounded-3xl overflow-hidden flex flex-col">
            <ChartReport resident={chartReportModal} homeData={homeData} onClose={() => setChartReportModal(null)} />
          </div>
        </div>
      )}

      {/* Discharge modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {dischargeModal && (
            <DischargeModal
              resident={dischargeModal}
              onClose={() => setDischargeModal(null)}
              onDischarge={handleDischarge}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Staff assignment modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {assignmentModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAssignmentModal(null)} />
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-surface border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-xl font-bold">Assign Staff</h3>
                  <button onClick={() => setAssignmentModal(null)}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 h-64 overflow-y-auto">
                  <p className="text-sm text-muted">Staff list management for {assignmentModal.name} coming soon…</p>
                </div>
                <div className="p-6 border-t border-border">
                  <button onClick={() => setAssignmentModal(null)} className="w-full bg-primary text-white font-bold py-3 rounded-xl">Done</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
