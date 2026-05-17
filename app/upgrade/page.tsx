"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { COMPANY_BANK, NODE_PRICES, NODE_MULTIPLIERS, NODE_MIN_WITHDRAWAL, submitPayment, getUserProfile } from "@/lib/admin";
import {
  FaShieldHalved, FaBolt, FaStar, FaCircleCheck, FaArrowLeft,
  FaCopy, FaClock, FaReceipt, FaChevronRight
} from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

const TIERS = [
  {
    name: "Node Alpha", icon: FaShieldHalved,
    grad: "from-teal-600 to-teal-900", border: "border-teal-500/30", glow: "shadow-teal-500/10",
    features: ["Standard Ad Verification", "Referral Commission", "24h Withdrawal Processing"],
  },
  {
    name: "Node Sigma", icon: FaBolt, popular: true,
    grad: "from-amber-500 to-orange-800", border: "border-amber-500/30", glow: "shadow-amber-500/10",
    features: ["High-Yield Video Ads", "Priority Referral Commission", "6h Withdrawal Processing", "Priority Support"],
  },
  {
    name: "Node Omega", icon: FaStar,
    grad: "from-violet-600 to-purple-900", border: "border-violet-500/30", glow: "shadow-violet-500/10",
    features: ["Institutional Merchant Tasks", "Maximum Referral Rate", "Instant Withdrawals", "Dedicated Manager"],
  },
];

type View = "select" | "pay" | "receipt" | "pending";

export default function UpgradePage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selected, setSelected] = useState<typeof TIERS[0] | null>(null);
  const [refCode, setRefCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView]       = useState<View>("select");
  const [paymentId, setPaymentId] = useState("");
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      if (p?.nodeStatus === "pending") setView("pending");
    });
    return unsub;
  }, [router]);

  const copyAccount = () => {
    navigator.clipboard.writeText(COMPANY_BANK.account);
    Swal.fire({ background: "#020617", color: "#f8fafc", icon: "success", title: "Copied!", timer: 1000, showConfirmButton: false, customClass: { popup: "!rounded-2xl !border !border-white/10" } });
  };

  const handleSubmit = async () => {
    if (!selected || !refCode.trim()) {
      Swal.fire({ background: "#020617", color: "#f8fafc", icon: "warning", title: "Enter Reference Code", text: "Please enter your bank transfer reference code.", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-600" } });
      return;
    }
    setLoading(true);
    try {
      const id = await submitPayment(user.uid, user.email || user.phoneNumber, selected.name, refCode.trim());
      setPaymentId(id);
      setSubmittedAt(new Date());
      setView("receipt");
    } catch (e) {
      Swal.fire({ background: "#020617", color: "#f8fafc", icon: "error", title: "Submission Failed", text: "Please try again.", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-rose-600" } });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-16">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Validator Node</h1>
          <p className="text-xs text-slate-500 font-mono">
            {view === "select" && "Choose your license tier"}
            {view === "pay" && "Make transfer & submit proof"}
            {view === "receipt" && "Payment receipt"}
            {view === "pending" && "Verification in progress"}
          </p>
        </div>
        {/* step indicator */}
        {(view === "select" || view === "pay") && (
          <div className="ml-auto flex items-center gap-1.5">
            {["select","pay"].map((v,i) => (
              <div key={v} className={`h-1.5 rounded-full transition-all ${view === v ? "w-8 bg-teal-500" : i < ["select","pay"].indexOf(view) ? "w-4 bg-teal-700" : "w-4 bg-slate-700"}`} />
            ))}
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

        <AnimatePresence mode="wait">

          {/* ── SELECT TIER ── */}
          {view === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <p className="text-slate-400 text-sm text-center mb-8">Select a Validator Node License to begin earning on AdsFinance.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {TIERS.map(t => (
                  <motion.button key={t.name} whileTap={{ scale: 0.98 }}
                    onClick={() => { setSelected(t); setView("pay"); }}
                    className={`relative text-left rounded-[24px] border ${t.border} bg-slate-900 p-6 hover:border-opacity-60 transition-all shadow-xl ${t.glow} group`}
                  >
                    {t.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full">
                        Most Popular
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.grad} flex items-center justify-center mb-5 shadow-lg`}>
                      <t.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-white font-black text-xl mb-1">{t.name}</p>
                    <p className="text-3xl font-black text-white mb-1">{fmt(NODE_PRICES[t.name])}</p>
                    <div className="flex gap-3 mb-4">
                      <span className="text-xs text-slate-500 font-mono">{NODE_MULTIPLIERS[t.name]}× multiplier</span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500 font-mono">Min withdraw {fmt(NODE_MIN_WITHDRAWAL[t.name])}</span>
                    </div>
                    <ul className="space-y-2">
                      {t.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                          <FaCircleCheck className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" /> {f}
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-5 w-full py-3 rounded-2xl bg-gradient-to-r ${t.grad} text-white font-black text-sm text-center group-hover:opacity-90 transition-opacity`}>
                      Select {t.name} <FaChevronRight className="inline w-3 h-3" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PAYMENT DETAILS ── */}
          {view === "pay" && selected && (
            <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="max-w-lg mx-auto space-y-5">
              <button onClick={() => setView("select")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                <FaArrowLeft className="w-3.5 h-3.5" /> Change tier
              </button>

              {/* selected summary */}
              <div className={`rounded-[22px] bg-gradient-to-br ${selected.grad} p-5 text-white`}>
                <p className="text-white/60 text-xs font-mono uppercase tracking-wider mb-1">Selected Node</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-2xl">{selected.name}</p>
                    <p className="text-white/70 text-sm mt-0.5">{NODE_MULTIPLIERS[selected.name]}× ROI · Min withdraw {fmt(NODE_MIN_WITHDRAWAL[selected.name])}</p>
                  </div>
                  <p className="text-3xl font-black">{fmt(NODE_PRICES[selected.name])}</p>
                </div>
              </div>

              {/* bank details */}
              <div className="bg-slate-900 border border-white/10 rounded-[22px] p-5 space-y-4">
                <p className="text-sm font-bold text-slate-300">Transfer <span className="text-white">{fmt(NODE_PRICES[selected.name])}</span> to this account:</p>
                {[
                  { label: "Bank Name",      value: COMPANY_BANK.name },
                  { label: "Account Name",   value: COMPANY_BANK.holder },
                  { label: "Account Number", value: COMPANY_BANK.account, copy: true },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">{row.label}</p>
                      <p className="text-white font-bold text-sm mt-0.5 font-mono">{row.value}</p>
                    </div>
                    {row.copy && (
                      <button onClick={copyAccount} className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-colors">
                        <FaCopy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* reference code */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Your Transfer Reference Code</label>
                <input value={refCode} onChange={e => setRefCode(e.target.value)}
                  placeholder="e.g. TRF2025051700123"
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm font-mono focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-600" />
                <p className="text-xs text-slate-600 mt-2">This is the reference/transaction ID from your bank app after making the transfer.</p>
              </div>

              <button disabled={loading || !refCode.trim()} onClick={handleSubmit}
                className="w-full py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition-colors shadow-lg shadow-teal-500/20">
                {loading ? "Submitting…" : "I Have Sent the Money →"}
              </button>
              <p className="text-center text-xs text-slate-600">Your node activates after admin verifies your payment (up to 24 hours).</p>
            </motion.div>
          )}

          {/* ── RECEIPT ── */}
          {view === "receipt" && selected && (
            <motion.div key="receipt" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
              <div className="bg-slate-900 border border-white/10 rounded-[28px] overflow-hidden shadow-2xl">
                {/* receipt header */}
                <div className={`bg-gradient-to-br ${selected.grad} p-8 text-center`}>
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center mx-auto mb-4">
                    <FaReceipt className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1">Payment Submitted</h2>
                  <p className="text-white/70 text-sm">Your transfer has been logged for review</p>
                </div>

                {/* receipt body */}
                <div className="p-6 space-y-4">
                  {[
                    { label: "Node Tier",       value: selected.name },
                    { label: "Amount Paid",      value: fmt(NODE_PRICES[selected.name]) },
                    { label: "Reference Code",   value: refCode, mono: true },
                    { label: "Payment ID",       value: paymentId.slice(0, 16).toUpperCase(), mono: true },
                    { label: "Submitted At",     value: submittedAt?.toLocaleString("en-NG") ?? "" },
                    { label: "Expected Activation", value: "Within 24 hours" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-start py-2 border-b border-white/5">
                      <span className="text-slate-500 text-sm">{r.label}</span>
                      <span className={`text-white text-sm font-bold text-right ml-4 ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                    </div>
                  ))}

                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 mt-2">
                    <FaClock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-amber-300 text-xs leading-relaxed">
                      Your payment is being reviewed. You will receive a notification once your node is activated (minimum 24 hours). Do not make another payment.
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <Link href="/dashboard"
                    className="block w-full text-center py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-colors">
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PENDING ── */}
          {view === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto text-center py-10">
              <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                <FaClock className="w-10 h-10 text-amber-400 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Payment Under Review</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                Your node payment is being verified by our team. You will receive a notification once your node is activated. This typically takes up to 24 hours.
              </p>
              <Link href="/dashboard" className="inline-block bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-10 py-3.5 rounded-full transition-colors text-sm">
                Return to Dashboard
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
