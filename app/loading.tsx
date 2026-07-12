"use client";

import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background pointer-events-none">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Logo Container */}
        <div className="relative w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-xl flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Shield className="w-8 h-8 text-primary" />
          </motion.div>
          {/* Subtle spinning ring */}
          <motion.div
            className="absolute -inset-1 rounded-[20px] border border-primary/20 border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </div>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="text-slate-500 text-xs font-bold tracking-widest uppercase"
        >
          Loading AdsFinance
        </motion.p>
      </div>
    </div>
  );
}
