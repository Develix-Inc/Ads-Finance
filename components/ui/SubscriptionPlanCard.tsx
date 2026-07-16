"use client";

import Link from "next/link";

import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2, ArrowRight, TrendingUp } from "lucide-react";

interface SubscriptionPlanCardProps {
  title: string;
  price: number;
  highlightText: string;
  benefits: string[];
  isPopular?: boolean;
}

export function SubscriptionPlanCard({ title, price, highlightText, benefits, isPopular }: SubscriptionPlanCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={`group relative w-full max-w-sm rounded-[24px] p-8 overflow-hidden flex flex-col gap-6 border bg-white ${isPopular ? 'border-primary shadow-xl shadow-primary/10' : 'border-slate-200 shadow-lg shadow-slate-200/50'}`}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-bl-xl z-10">
          Most Popular
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${isPopular ? 'text-primary' : 'text-slate-400'}`} />
          <h3 className="font-semibold text-xl tracking-tight text-slate-900">{title}</h3>
        </div>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-3xl font-bold font-mono tracking-tighter text-slate-900">{price === 0 ? "Free" : `₦${price.toLocaleString()}`}</span>
          {price > 0 && <span className="text-sm text-slate-500 font-medium">/ lifetime</span>}
        </div>
      </div>

      {/* Highlight Box */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Earning Potential</p>
          <p className="text-sm font-semibold text-slate-900 tracking-tight">{highlightText}</p>
        </div>
      </div>

      {/* Benefits List */}
      <div className="flex flex-col gap-3 flex-1 mt-2">
        {benefits.map((benefit, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-sm text-slate-600 leading-snug">{benefit}</span>
          </div>
        ))}
      </div>

      {/* Action Area */}
      <Link href="/login?mode=signup" className="w-full mt-4">
        <Button 
          className={`w-full rounded-xl py-6 text-sm font-semibold tracking-wide transition-all shadow-md ${
            isPopular 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          Select Plan <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
    </motion.div>
  );
}
