"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaBuildingColumns, FaCreditCard, FaShieldHalved, FaCircleCheck } from "react-icons/fa6";
import { submitWithdrawal } from "@/lib/admin";
import Swal from "sweetalert2";

interface Props {
  uid: string;
  userEmail: string;
  balance: number;
  minWithdrawal?: number;
  withdrawalPin?: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = ["Amount", "Confirm", "Processing", "Done"] as const;

const INTERLOCK_STAGES = [
  { label: "Initiating Transfer",    ms: 1800, icon: FaCreditCard },
  { label: "Node Security Audit",    ms: 3000, icon: FaShieldHalved },
  { label: "Processing on Ledger",   ms: 2500, icon: FaBuildingColumns },
  { label: "Disbursement Complete",  ms: 1000, icon: FaCircleCheck },
];

export function WithdrawModal({ uid, userEmail, balance, minWithdrawal = 500, withdrawalPin, bankName, accountNumber, accountName, onClose, onSuccess }: Props) {
  // -1 = PIN gate (if pin set), 0 = amount, 1 = confirm, 2 = processing, 3 = done
  const [step, setStep]         = useState(withdrawalPin ? -1 : 0);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [amount, setAmount]     = useState("");
  const [editBank, setEditBank] = useState({ bankName, accountNumber, accountName });
  const [interlockStep, setInterlockStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const valid     = numAmount >= minWithdrawal && numAmount <= balance;

  function verifyPin() {
    if (pinInput === withdrawalPin) { setStep(0); setPinError(""); }
    else { setPinError("Incorrect PIN. Try again."); setPinInput(""); }
  }

  /* run the interlock animation then submit */
  async function runInterlock() {
    setIsRunning(true);
    setStep(2);
    setInterlockStep(INTERLOCK_STAGES.length);
    try {
      await submitWithdrawal(uid, userEmail, numAmount, editBank);
      setStep(3);
    } catch (e: any) { 
      console.error(e);
      Swal.fire({
        background: "#020617",
        color: "#f8fafc",
        icon: "error",
        title: "Withdrawal Failed",
        text: e.message || "An error occurred.",
        customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-rose-600" }
      });
      setStep(1);
    }
    setIsRunning(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={!isRunning ? onClose : undefined}
    >
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 22 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[28px] overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="px-7 pt-7 pb-5 border-b border-white/10">
          <p className="text-xs font-mono text-teal-400 uppercase tracking-widest mb-1">Withdrawal Interlock</p>
          <h2 className="text-xl font-black text-white">
            {step === -1 && "Security Verification"}
            {step === 0 && "Enter Amount"}
            {step === 1 && "Confirm Details"}
            {step === 2 && "Processing…"}
            {step === 3 && "Request Submitted"}
          </h2>
          {/* progress dots */}
          <div className="flex gap-2 mt-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? "bg-teal-500" : "bg-white/10"}`} />
            ))}
          </div>
        </div>

        <div className="px-7 py-6">
          <AnimatePresence mode="wait">

            {/* ── PIN Gate ── */}
            {step === -1 && (
              <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-slate-400 text-sm">Enter your 4-digit withdrawal PIN to continue.</p>
                <input
                  type="password" value={pinInput} onChange={e => setPinInput(e.target.value.slice(0, 4))}
                  onKeyDown={e => e.key === "Enter" && verifyPin()}
                  placeholder="••••" maxLength={4} inputMode="numeric"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl text-center tracking-[1em] font-mono focus:outline-none focus:border-teal-500 transition-colors"
                  autoFocus
                />
                {pinError && <p className="text-rose-400 text-xs text-center">{pinError}</p>}
                <button onClick={verifyPin} disabled={pinInput.length !== 4}
                  className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-slate-950 font-black text-sm transition-colors">
                  Verify PIN
                </button>
                <p className="text-center text-xs text-slate-600">
                  Forgot PIN? Update it in <a href="/settings" className="text-teal-400 hover:underline">Settings → Withdrawal PIN</a>.
                </p>
              </motion.div>
            )}

            {/* ── Step 0: Amount ── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Balance</label>
                  <p className="text-3xl font-black text-white mt-1">₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Withdrawal Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₦</span>
                    <input
                      type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      min={minWithdrawal} max={balance} step={100}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-white text-xl font-bold focus:outline-none focus:border-teal-500 transition-colors"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Minimum withdrawal: ₦{minWithdrawal.toLocaleString()}</p>
                  {amount && !valid && <p className="text-xs text-rose-400 mt-1">{numAmount < minWithdrawal ? `Minimum is ₦${minWithdrawal.toLocaleString()}` : "Insufficient balance"}</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5 transition-colors">Cancel</button>
                  <button disabled={!valid} onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-sm font-black transition-colors">
                    Continue →
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Confirm ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="bg-slate-950 rounded-2xl border border-white/10 p-5 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Amount</span>
                    <span className="text-white font-black text-lg">₦{numAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  {(["bankName","accountNumber","accountName"] as const).map(k => (
                    <div key={k}>
                      <label className="text-[11px] text-slate-500 uppercase tracking-wider font-bold block mb-1">{k.replace(/([A-Z])/g," $1").trim()}</label>
                      <input value={editBank[k]} onChange={e => setEditBank(p => ({ ...p, [k]: e.target.value }))}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-semibold focus:outline-none focus:border-teal-500 transition-colors" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 text-center">Your withdrawal will be processed within 24 hours after support review.</p>
                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-3.5 rounded-2xl border border-white/10 text-slate-400 text-sm font-semibold hover:bg-white/5 transition-colors">← Back</button>
                  <button onClick={runInterlock}
                    className="flex-1 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-black transition-colors">
                    Confirm Withdrawal
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Interlock ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-2">
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-white font-bold">Processing Withdrawal…</p>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Done ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-500/20 border-2 border-teal-500 flex items-center justify-center mx-auto">
                  <FaCircleCheck className="w-8 h-8 text-teal-400" />
                </div>
                <div>
                  <p className="text-white font-black text-xl">Request Received</p>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                    Your withdrawal of <strong className="text-white">₦{numAmount.toLocaleString()}</strong> has been submitted. Support will process it within <strong className="text-white">24 hours</strong>.
                  </p>
                </div>
                <button onClick={() => { onClose(); onSuccess?.(); }}
                  className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-colors">
                  Done
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
