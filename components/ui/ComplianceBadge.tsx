"use client";

import React from "react";
import { Server, Lock, Activity } from "lucide-react";

export function ComplianceBadge() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-8 border-t border-white/5 bg-black/40 backdrop-blur-sm w-full">
      
      <div className="flex items-center gap-2 text-slate-400">
        <Server className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono tracking-wider">NODE STATUS: <span className="text-primary font-bold">ONLINE</span></span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-white/10" />

      <div className="flex items-center gap-2 text-slate-400">
        <Lock className="w-4 h-4 text-emerald-500" />
        <span className="text-xs font-mono tracking-wider">ENCRYPTION: <span className="text-emerald-500 font-bold">AES-256</span></span>
      </div>

      <div className="hidden sm:block w-px h-4 bg-white/10" />

      <div className="flex items-center gap-2 text-slate-400 bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
        <Activity className="w-4 h-4 text-secondary animate-pulse" />
        <span className="text-xs font-mono tracking-wider text-secondary">ANTI-FRAUD <span className="font-bold">ACTIVE</span></span>
      </div>

    </div>
  );
}
