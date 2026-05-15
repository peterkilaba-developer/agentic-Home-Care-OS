import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { MessageSquare, Clock, Search, Filter } from 'lucide-react';

export default function SystemActivityLogsView({ stateData, homeData, isLocalDemo = false, localLogs = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const residentId = searchParams.get('residentId');

  useEffect(() => {
    if (isLocalDemo) return undefined;

    const targetId = homeData?.id;
    if (!targetId) return;

    let q = query(
      collection(db, 'system_logs'),
      where('homeId', '==', targetId),
      orderBy('createdAt', 'desc')
    );

    if (residentId) {
      q = query(
        collection(db, 'system_logs'),
        where('homeId', '==', targetId),
        where('residentId', '==', residentId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
      console.error("[LOGS] Subscription error:", err);
      // Fallback: If orderBy failed (missing index), try without it
      if (err.code === 'failed-precondition' || err.message.includes('index')) {
        console.warn("[LOGS] Missing index detected, falling back to unordered query.");
        const fallbackQ = query(
          collection(db, 'system_logs'),
          where('homeId', '==', targetId)
        );
        onSnapshot(fallbackQ, (fSnap) => {
          const fetched = fSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setLogs(fetched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [homeData?.id, residentId, isLocalDemo]);

  const visibleLogs = isLocalDemo ? localLogs : logs;
  const visibleLoading = isLocalDemo ? false : loading;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <header className="flex justify-between items-end mb-4">
         <div>
           <h1 className="text-3xl font-bold">System Activity Logs</h1>
           <p className="text-muted">Immutable audit trail of all AI actions and clinical reviews for {stateData?.name || 'jurisdictional'} {stateData?.regulator || 'compliance'}.</p>
         </div>
         <div className="flex items-center gap-4">
           <div className="bg-surface border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
             <Search className="w-4 h-4 text-muted" />
             <input type="text" placeholder="Filter logs..." className="bg-transparent border-none outline-none text-foreground" />
           </div>
         </div>
      </header>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-widest">
            <Clock className="w-4 h-4" /> Real-time Audit Stream
          </div>
          {residentId && (
            <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
              Filtering by Resident
            </div>
          )}
        </div>
        <div className="divide-y divide-border">
          {visibleLoading ? (
            <div className="p-12 text-center text-muted">Loading logs...</div>
          ) : visibleLogs.length === 0 ? (
            <div className="p-12 text-center text-muted">No activity logs found for this site.</div>
          ) : (
            visibleLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-surface-hover transition-colors flex gap-4">
                <div className="shrink-0 mt-1">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                      <MessageSquare className="w-4 h-4" />
                   </div>
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">{log.type?.toUpperCase()}</span>
                      <span className="text-[10px] text-muted">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : log.createdAt?.iso ? new Date(log.createdAt.iso).toLocaleString() : 'Just now'}</span>
                   </div>
                   <p className="text-sm text-muted-foreground leading-relaxed">{log.message}</p>
                   {log.residentName && <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2 block">Resident: {log.residentName}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
