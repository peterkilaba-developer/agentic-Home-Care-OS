import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserSquare2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function HandoverDashboard({ resident }) {
  const [recentLogs, setRecentLogs] = useState([]);

  useEffect(() => {
    if (!resident?.id) return;
    const q = query(collection(db, 'system_logs'), where('residentId', '==', resident.id), orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      let arr = [];
      snapshot.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setRecentLogs(arr);
    });
    return () => unsub();
  }, [resident?.id]);

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="pt-2 px-4 pb-20">
      <div className="mb-6 mt-4">
        <h3 className="text-2xl font-bold text-foreground">Shift Handover</h3>
        <p className="text-xs text-muted">Recent activity for {resident?.name}</p>
      </div>

      {recentLogs.length === 0 ? (
        <div className="text-center px-4 py-12 border border-dashed border-border rounded-2xl">
          <p className="text-muted text-sm">No recent activity logged for this resident.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recentLogs.map(log => (
            <div key={log.id} className="bg-surface border border-border p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">{log.type}</span>
                <span className="text-[10px] text-muted">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}</span>
              </div>
              <p className="text-sm text-foreground font-medium mb-2">{log.message}</p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <UserSquare2 className="w-3 h-3" /> {log.caregiverName}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
