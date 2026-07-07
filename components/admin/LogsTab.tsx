"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit } from "firebase/firestore";
import { FaShieldHalved } from "react-icons/fa6";

export function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only get the latest 100 logs for performance
    const q = query(collection(db, "admin_logs"), orderBy("createdAt", "desc"), limit(100));
    const unsub = onSnapshot(q, snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const ts = (sec: number) => {
    if (!sec) return "";
    return new Date(sec * 1000).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading audit logs...</div>;

  return (
    <div className="bg-slate-900 border border-white/10 rounded-[20px] p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
          <FaShieldHalved className="text-violet-400 w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">System Audit Logs</h2>
          <p className="text-xs text-slate-500">Immutable trail of admin actions (last 100 entries)</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-slate-500 font-bold bg-slate-950">
              <th className="p-4 rounded-tl-xl">Timestamp</th>
              <th className="p-4">Admin</th>
              <th className="p-4">Action</th>
              <th className="p-4">Target (UID)</th>
              <th className="p-4 rounded-tr-xl">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
            {logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No logs found.</td></tr>}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5 transition-colors font-mono">
                <td className="p-4 text-xs text-slate-400 whitespace-nowrap">{ts(log.createdAt?.seconds)}</td>
                <td className="p-4 text-white truncate max-w-[150px]">{log.adminEmail}</td>
                <td className="p-4">
                  <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-teal-400 truncate max-w-[150px]">{log.target}</td>
                <td className="p-4 text-xs text-slate-500">
                  {Object.keys(log.meta || {}).length > 0 ? (
                    <pre className="bg-slate-950 p-2 rounded-lg border border-white/5 overflow-x-auto max-w-[300px]">
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
