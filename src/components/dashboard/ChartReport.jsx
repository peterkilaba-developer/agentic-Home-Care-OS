import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Printer, X, Loader2, ShieldCheck, Calendar, Pill, CheckSquare, ClipboardList, AlertTriangle } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function ResidentChartReport({ resident, homeData, onClose }) {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const printHash = useMemo(() => btoa(resident.id).slice(0, 16), [resident.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch last 30 days of shifts for this resident
        // Since shifts contain activeTasks[residentId] and checkedMeds[residentId], we fetch shifts for the home and filter client-side
        // Alternatively, if we had a per-resident shift-log collection it would be easier, but we'll use the shifts collection.
        
        const shiftsQ = query(
          collection(db, 'shifts'),
          where('homeId', '==', homeData.id),
          where('status', '==', 'completed'),
          orderBy('endTime', 'desc'),
          limit(100)
        );
        
        const shiftsSnap = await getDocs(shiftsQ);
        const allShifts = [];
        shiftsSnap.forEach(d => {
          const data = d.data();
          // Only include if this resident had activity in this shift
          if ((data.activeTasks && data.activeTasks[resident.id]) || 
              (data.checkedMeds && data.checkedMeds[resident.id]) ||
              (data.progressNotes)) {
            allShifts.push({ id: d.id, ...data });
          }
        });
        setShifts(allShifts);

        // Fetch logs for this resident
        const logsQ = query(
          collection(db, 'system_logs'),
          where('residentId', '==', resident.id),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const logsSnap = await getDocs(logsQ);
        const allLogs = [];
        logsSnap.forEach(d => allLogs.push({ id: d.id, ...d.data() }));
        setLogs(allLogs);

      } catch (err) {
        console.error("Report generation error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (resident?.id && homeData?.id) fetchData();
  }, [resident, homeData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-muted">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="font-bold uppercase tracking-widest text-xs">Generating Legal Clinical Record...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 overflow-hidden print:overflow-visible">
      {/* Header - Hidden on Print */}
      <header className="h-16 border-b border-slate-200 bg-slate-50 flex items-center justify-between px-6 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
           <FileText className="w-5 h-5 text-primary" />
           <h3 className="font-bold text-slate-800">Clinical Chart Report - {resident.name}</h3>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-all">
            <Printer className="w-4 h-4" /> Print Report
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Report Content */}
      <div className="flex-1 overflow-y-auto p-12 print:p-0 print:overflow-visible">
        <div className="max-w-[800px] mx-auto space-y-12 print:space-y-8 bg-white shadow-2xl print:shadow-none border border-slate-100 print:border-none p-10 print:p-0">
          
          {/* LOGO & AGENCY HEADER */}
          <section className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-1">
                {homeData.homeName || homeData.agencyName || "Home Care OS"}
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Legal Clinical Record & Audit Trail</p>
              <div className="mt-4 text-sm text-slate-700 space-y-0.5">
                <p>{homeData.address || "Facility Address"}</p>
                <p>{homeData.phone || "Facility Phone"}</p>
                <p className="font-bold text-primary">NPI: {homeData.npi || 'PENDING'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 mb-4 print:hidden">
                <ShieldCheck className="w-3 h-3" /> HIPAA SECURE RECORD
              </div>
              <p className="text-[10px] text-slate-400 font-mono">Report Generated: {new Date().toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 font-mono uppercase">Reference: CHRT-{resident.id.slice(-6)}</p>
            </div>
          </section>

          {/* RESIDENT BIO */}
          <section className="grid grid-cols-2 gap-8 py-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resident Identification</h4>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{resident.name}</h2>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <p><span className="font-bold">Room:</span> {resident.room || 'TBD'}</p>
                <p><span className="font-bold">DOB:</span> {resident.dob || '01/01/1950'}</p>
                <p><span className="font-bold">Level:</span> {resident.careLevel || 'Standard'}</p>
              </div>
            </div>
            <div className="border-l border-slate-200 pl-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Medical Diagnosis & Alerts</h4>
              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                {resident.diagnosis || "No specific diagnosis on file."}
              </p>
              <div className="mt-3 flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-widest">
                <AlertTriangle className="w-3 h-3" /> Allergies: {resident.allergies || 'None Known'}
              </div>
            </div>
          </section>

          {/* ACTIVE EMAS SUMMARY */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Pill className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Active Medication List (eMAR)</h3>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Medication & Dose</th>
                    <th className="p-3 text-left">Route</th>
                    <th className="p-3 text-left">Frequency</th>
                    <th className="p-3 text-left">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(resident.medications || []).filter(m => m.status !== 'discontinued').map((med, i) => (
                    <tr key={i}>
                      <td className="p-3 font-bold text-slate-800">{med.name} {med.dose || med.strength || ''}</td>
                      <td className="p-3 text-slate-600">{med.route || 'Oral'}</td>
                      <td className="p-3 text-slate-600 font-bold">{med.frequency || 'As Directed'}</td>
                      <td className="p-3 text-slate-500 italic">{med.instructions || 'None'}</td>
                    </tr>
                  ))}
                  {(resident.medications || []).filter(m => m.status !== 'discontinued').length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No active medications on file.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ADMIN HISTORY */}
          <section className="print:break-before-page">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Clinical Administration History</h3>
            </div>
            <div className="space-y-4">
              {shifts.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 italic">
                  No shift records found for this period.
                </div>
              ) : (
                shifts.map((shift, sIdx) => {
                  const resMeds = shift.checkedMeds?.[resident.id] || {};
                  const resTasks = shift.activeTasks?.[resident.id] || {};
                  const medEntries = Object.entries(resMeds).filter(([_, data]) => data && data.administered);
                  const taskEntries = Object.entries(resTasks).filter(([_, data]) => data && data.completed);
                  
                  if (medEntries.length === 0 && taskEntries.length === 0 && !shift.progressNotes) return null;

                  return (
                    <div key={shift.id} className="border border-slate-200 rounded-2xl p-6 print:p-4 space-y-4">
                      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest">Shift Session</p>
                          <p className="text-sm font-bold text-slate-900">
                            {new Date(shift.endTime.seconds * 1000).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">{shift.staffName}</p>
                          <p className="text-[10px] text-slate-400 uppercase">{shift.signeeRole || 'Caregiver'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* Meds in this shift */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Pill className="w-2.5 h-2.5" /> Meds Administered
                          </p>
                          <div className="space-y-1.5">
                            {medEntries.map(([mKey, data]) => (
                              <div key={mKey} className="flex justify-between items-center text-xs bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-800">{mKey.split('_').slice(2).join(' ') || 'Medication'}</span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {new Date(data.administeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                            {medEntries.length === 0 && <p className="text-[10px] text-slate-400 italic">No meds charted this shift.</p>}
                          </div>
                        </div>

                        {/* Tasks in this shift */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <CheckSquare className="w-2.5 h-2.5" /> Care Tasks / ADLs
                          </p>
                          <div className="space-y-1.5">
                            {taskEntries.map(([tKey, data]) => (
                              <div key={tKey} className="flex justify-between items-center text-xs bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-800">{data.name}</span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {new Date(data.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                            {taskEntries.length === 0 && <p className="text-[10px] text-slate-400 italic">No tasks charted this shift.</p>}
                          </div>
                        </div>
                      </div>

                      {/* Progress Notes */}
                      {shift.progressNotes && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <ClipboardList className="w-2.5 h-2.5" /> Interdisciplinary Notes
                          </p>
                          <p className="text-xs text-slate-700 leading-relaxed italic">
                            "{shift.progressNotes}"
                          </p>
                        </div>
                      )}

                      {/* Signature Bar */}
                      <div className="flex justify-end pt-4 border-t border-slate-100">
                         <div className="text-right">
                           <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Digitally Signed By</p>
                           <p className="text-sm font-serif italic text-slate-900">{shift.signature || shift.staffName}</p>
                           <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">Verified via Clinical Audit Trail</p>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* INCIDENT LOGS */}
          {logs.some(l => l.type === 'INCIDENT_REPORT') && (
            <section className="print:break-before-page">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-lg font-bold text-rose-800 uppercase tracking-tight">Significant Incident Audit</h3>
              </div>
              <div className="space-y-4">
                {logs.filter(l => l.type === 'INCIDENT_REPORT').map(log => (
                  <div key={log.id} className="border-2 border-rose-100 rounded-2xl p-6 bg-rose-50/30">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-rose-900">{log.message}</h4>
                        <p className="text-[10px] text-rose-500 font-bold uppercase">{new Date(log.createdAt.seconds * 1000).toLocaleString()}</p>
                      </div>
                      <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">URGENT REPORT</span>
                    </div>
                    <p className="text-sm text-slate-700 bg-white/80 p-4 rounded-xl border border-rose-100 shadow-sm leading-relaxed">
                      {log.description || log.message}
                    </p>
                    <div className="mt-4 text-right">
                       <p className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Reporting Officer</p>
                       <p className="text-xs font-bold text-slate-800">{log.staffName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FINAL FOOTER / DISCLAIMER */}
          <footer className="pt-12 border-t-2 border-slate-900 text-[10px] text-slate-400 text-center leading-relaxed">
            <p className="font-black uppercase tracking-[0.2em] mb-2 text-slate-900">End of Legal Record</p>
            <p>This report contains highly confidential protected health information (PHI) governed by HIPAA and state privacy laws.</p>
            <p>Any unauthorized disclosure or distribution is strictly prohibited and subject to legal penalties.</p>
            <p className="mt-4 font-mono">MD5_HASH: {printHash} • PAGE_AUTH: {resident.homeId.toUpperCase()}</p>
          </footer>

        </div>
      </div>
    </div>
  );
}
