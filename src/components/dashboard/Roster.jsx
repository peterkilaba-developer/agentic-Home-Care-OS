import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, X, ArrowRight, Activity, Calendar } from 'lucide-react';
import ChartReport from './ChartReport';

export default function ResidentRosterView({ residents, homeData, createSystemLog, impersonatingId }) {
  const [chartReportModal, setChartReportModal] = useState(null);
  const [assignmentModal, setAssignmentModal] = useState(null);

  const residentsInHome = residents?.filter(r => r.homeId === homeData?.id) || [];

  return (
    <div className="p-8">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resident Roster</h1>
          <p className="text-muted">Manage active residents and clinical charts.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {residentsInHome.length === 0 ? (
          <div className="col-span-full py-20 text-center glass-card bg-surface/30">
             <Users className="w-16 h-16 text-muted mx-auto mb-4 opacity-20" />
             <h3 className="text-xl font-bold mb-2">No Active Residents</h3>
             <p className="text-sm text-muted max-w-sm mx-auto mb-8">
               Your roster is currently empty for {homeData?.homeName || 'this facility'}. 
               Manage your admissions in the Clinical Intake Pipeline.
             </p>
             <Link to="/dashboard/intake" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
               Go to Intake Pipeline <ArrowRight className="w-4 h-4" />
             </Link>
          </div>
        ) : (
          residentsInHome.map(resident => (
            <div key={resident.id} className="glass-card p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">{resident.name}</h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold uppercase tracking-widest">{resident.status}</span>
              </div>
              <p className="text-xs text-muted mb-6 line-clamp-2 italic">{resident.diagnosis}</p>
              <div className="flex gap-2">
                <button onClick={() => setChartReportModal(resident)} className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold text-xs">View Chart</button>
                <button onClick={() => setAssignmentModal(resident)} className="px-4 py-2 bg-surface border border-border rounded-lg font-bold text-xs"><Users className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {chartReportModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="w-full max-w-6xl h-full bg-white rounded-3xl overflow-hidden flex flex-col">
            <ChartReport resident={chartReportModal} homeData={homeData} onClose={() => setChartReportModal(null)} />
          </div>
        </div>
      )}

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {assignmentModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAssignmentModal(null)} />
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-surface border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col">
                <div className="p-6 border-b border-border flex justify-between items-center">
                  <h3 className="text-xl font-bold">Assign Staff</h3>
                  <button onClick={() => setAssignmentModal(null)}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 h-64 overflow-y-auto">
                  <p className="text-sm text-muted">Staff list management for {assignmentModal.name} coming soon...</p>
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
