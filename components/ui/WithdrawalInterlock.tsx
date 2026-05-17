"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle2, Loader2, Lock, ArrowRight } from "lucide-react";

export function WithdrawalInterlock() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    { title: "Initiating Transfer", duration: 1500, icon: Loader2 },
    { title: "Node Security Audit", duration: 3000, icon: ShieldAlert },
    { title: "Processing on Ledger", duration: 2500, icon: Lock },
    { title: "Funds Disbursed", duration: 1000, icon: CheckCircle2 },
  ];

  useEffect(() => {
    if (!isOpen || step >= steps.length) return;

    const timer = setTimeout(() => {
      setStep((prev) => prev + 1);
    }, steps[step].duration);

    return () => clearTimeout(timer);
  }, [isOpen, step]);

  if (!isOpen) {
    return (
      <Button 
        onClick={() => { setIsOpen(true); setStep(0); }}
        className="bg-slate-800 text-white hover:bg-slate-700 font-mono tracking-wider w-full max-w-xs border border-slate-700"
      >
        Withdraw Yield
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-[24px] shadow-2xl border border-white/10 glass-card">
        <h2 className="text-2xl font-semibold mb-6 text-center text-white tracking-tight">Withdrawal Interlock</h2>
        
        <div className="flex flex-col gap-6 relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-6 bottom-6 w-[2px] bg-slate-800 z-0" />

          {steps.map((s, index) => {
            const isActive = step === index;
            const isCompleted = step > index;
            const Icon = s.icon;

            return (
              <div key={index} className={`flex items-center gap-4 z-10 transition-opacity duration-500 ${step >= index ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${isCompleted ? 'bg-primary/20 border-primary text-primary' : isActive ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                  {isActive && <Icon className="w-5 h-5 animate-spin" />}
                  {isCompleted && <CheckCircle2 className="w-6 h-6" />}
                  {!isActive && !isCompleted && <Icon className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className={`font-medium ${isCompleted ? 'text-primary' : isActive ? 'text-secondary' : 'text-slate-500'}`}>
                    {s.title}
                  </h4>
                  {isActive && <p className="text-xs text-slate-400 mt-1 font-mono tracking-wider">Verifying protocol...</p>}
                </div>
              </div>
            );
          })}
        </div>

        {step >= steps.length && (
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-center">
            <Button 
              onClick={() => setIsOpen(false)}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              Close Ledger <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
