"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ShieldCheck, Zap, ArrowRight, TrendingUp } from "lucide-react";

interface NodeLicenseCardProps {
  title: string;
  price: number;
  multiplier: number;
  benefits: string[];
  isPopular?: boolean;
}

export function NodeLicenseCard({ title, price, multiplier, benefits, isPopular }: NodeLicenseCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`group relative w-full max-w-sm rounded-[24px] p-6 glass-card overflow-hidden flex flex-col gap-6 border ${isPopular ? 'border-secondary/50 shadow-secondary/10' : 'border-white/10'}`}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-bl-xl z-10">
          Most Popular
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${isPopular ? 'text-secondary' : 'text-primary'}`} />
          <h3 className="font-semibold text-xl tracking-tight text-white">{title}</h3>
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold font-mono tracking-tighter">${price.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground uppercase tracking-widest">Entry</span>
        </div>
      </div>

      {/* Multiplier Highlight */}
      <div className="bg-gradient-to-r from-primary/20 to-transparent p-4 rounded-xl border border-primary/20 flex items-center gap-4">
        <div className="bg-primary/20 p-2 rounded-lg">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="text-xs text-slate-300 font-medium uppercase tracking-wider">Yield Potential</p>
          <p className="text-lg font-bold text-white tracking-tight">Up to {multiplier}x ROI</p>
        </div>
      </div>

      {/* Benefits List */}
      <div className="flex flex-col gap-3 flex-1">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <span className="text-sm text-slate-300 leading-snug">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Action Area */}
      <Button 
        className={`w-full rounded-full py-6 text-md font-semibold tracking-wide transition-all shadow-lg mt-4 ${
          isPopular 
            ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-secondary/20' 
            : 'bg-white text-black hover:bg-gray-200 shadow-white/5'
        }`}
      >
        Acquire License <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </motion.div>
  );
}
