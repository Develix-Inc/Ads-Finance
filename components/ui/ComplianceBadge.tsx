"use client";

import React from "react";
import { Server, Lock, Activity } from "lucide-react";

export function ComplianceBadge() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-6 border-t border-slate-200 bg-slate-50 w-full">
      
      <div className="flex items-center gap-2 text-slate-500">
        <Server className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-mono tracking-wider">NODE STATUS: <span className="text-emerald-600 font-bold">ONLINE</span></span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-slate-300" />

      <div className="flex items-center gap-2 text-slate-500">
        <Lock className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-mono tracking-wider">ENCRYPTION: <span className="text-slate-900 font-bold">AES-256</span></span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-slate-300" />

      <div className="flex items-center gap-2 text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
        <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
        <span className="text-xs font-mono tracking-wider">ANTI-FRAUD <span className="font-bold text-emerald-600">ACTIVE</span></span>
      </div>

    </div>
  );
}
