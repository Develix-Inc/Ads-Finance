"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { COMPANY_BANK, NODE_PRICES, NODE_MIN_WITHDRAWAL, submitPayment, getUserProfile, upsertUserProfile } from "@/lib/admin";
import {
  ShieldCheck, Zap, Star, CheckCircle2, ArrowLeft,
  Clock, Receipt, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

const TIERS = [
  {
    name: "Alpha Plan", icon: ShieldCheck,
    grad: "from-slate-100 to-slate-200", border: "border-slate-200", glow: "shadow-slate-200/50",
    textColor: "text-slate-900", iconColor: "text-slate-700",
    features: ["Standard Task Limits", "Referral Commission", "24h Withdrawal SLA"],
  },
  {
    name: "Sigma Plan", icon: Zap, popular: true,
    grad: "from-primary/10 to-primary/5", border: "border-primary", glow: "shadow-primary/20",
    textColor: "text-slate-900", iconColor: "text-primary",
    features: ["Expanded Task Pool", "Priority Referral Rate", "6h Withdrawal SLA", "Priority Support"],
  },
  {
    name: "Omega Plan", icon: Star,
    grad: "from-amber-100 to-amber-50", border: "border-amber-400", glow: "shadow-amber-400/20",
    textColor: "text-slate-900", iconColor: "text-amber-500",
    features: ["Institutional Tasks", "Maximum Referral Rate", "Instant Withdrawals", "Dedicated Manager"],
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
      let p = await getUserProfile(u.uid);
      if (!p) {
        // Auto-heal missing profile if the user went straight to upgrade instead of dashboard
        const defaultName = u.displayName || (u.email ? u.email.split("@")[0] : "User");
        const fallbackProfile = {
          email: u.email || "",
          displayName: defaultName,
          walletBalance: 0,
          totalEarned: 0,
          nodeTier: "",
          nodeStatus: "none",
          referralCode: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          referredBy: "",
          onboardingComplete: false,
          accountStatus: "active",
        };
        await upsertUserProfile(u.uid, fallbackProfile);
        p = { uid: u.uid, ...fallbackProfile };
      }
      setProfile(p);
      if (p?.nodeStatus === "pending") setView("pending");
    });
    return unsub;
  }, [router]);

  const handlePaystackCheckout = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const amount = NODE_PRICES[selected.name];
      const reference = `REF_${Date.now()}_${user.uid.slice(0, 6).toUpperCase()}`;

      // 1. Log payment as pending locally using the Firebase Client SDK (avoids Node.js GRPC hang)
      const paymentId = await submitPayment(user.uid, user.email || user.phoneNumber || "user@adsfinance.com", selected.name, reference);
      setPaymentId(paymentId);
      
      // 2. Initialize Paystack
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email || user.phoneNumber || "user@adsfinance.com",
          amount,
          reference
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize payment");

      // Redirect to Paystack Checkout URL
      window.location.href = data.authorization_url;
    } catch (e: any) {
      Swal.fire({ background: "#ffffff", color: "#0f172a", icon: "error", title: "Payment Initialization Failed", text: e.message || "Please try again.", customClass: { popup: "!rounded-2xl !border !border-slate-200", confirmButton: "!rounded-full !bg-rose-600" } });
      setLoading(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-slate-900 pb-16">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Upgrade Plan</h1>
          <p className="text-xs text-slate-500 font-medium">
            {view === "select" && "Choose your membership tier"}
            {view === "pay" && "Complete secure checkout"}
            {view === "receipt" && "Payment receipt"}
            {view === "pending" && "Verification in progress"}
          </p>
        </div>
        {/* step indicator */}
        {(view === "select" || view === "pay") && (
          <div className="ml-auto flex items-center gap-1.5">
            {["select","pay"].map((v,i) => (
              <div key={v} className={`h-1.5 rounded-full transition-all ${view === v ? "w-8 bg-primary" : i < ["select","pay"].indexOf(view) ? "w-4 bg-primary/40" : "w-4 bg-slate-200"}`} />
            ))}
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

        <AnimatePresence mode="wait">

          {/* ── SELECT TIER ── */}
          {view === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <p className="text-slate-600 text-sm text-center mb-8 font-medium">Select a Premium Plan to increase your task limits and earning potential.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {TIERS.map(t => {
                  const isCurrent = profile?.nodeTier === t.name && profile?.nodeStatus === "active";
                  return (
                  <motion.button key={t.name} whileTap={{ scale: isCurrent ? 1 : 0.98 }}
                    onClick={() => { if (!isCurrent) { setSelected(t); setView("pay"); } }}
                    className={`relative text-left rounded-[24px] border ${t.border} bg-white p-6 hover:shadow-2xl transition-all shadow-lg ${t.glow} group ${isCurrent ? "cursor-default opacity-90 ring-2 ring-emerald-500 ring-offset-2" : ""}`}
                  >
                    {t.popular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm">
                        Most Popular
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Plan
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${t.grad} border ${t.border} flex items-center justify-center mb-5`}>
                      <t.icon className={`w-6 h-6 ${t.iconColor}`} />
                    </div>
                    <p className={`font-bold text-xl mb-1 ${t.textColor}`}>{t.name}</p>
                    <p className="text-3xl font-black text-slate-900 mb-1">{fmt(NODE_PRICES[t.name])}</p>
                    <div className="flex gap-2 mb-4">
                      <span className="text-xs text-slate-500 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Premium Access</span>
                    </div>
                    <ul className="space-y-3">
                      {t.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isCurrent ? "text-emerald-500" : "text-emerald-500"}`} /> {f}
                        </li>
                      ))}
                    </ul>
                    <div className={`mt-6 w-full py-3 rounded-xl font-bold text-sm text-center transition-colors shadow-sm ${
                      isCurrent 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
                        : "bg-slate-900 text-white group-hover:bg-primary group-hover:text-primary-foreground"
                    }`}>
                      {isCurrent ? "Current Plan" : `Select ${t.name}`} {!isCurrent && <ChevronRight className="inline w-4 h-4" />}
                    </div>
                  </motion.button>
                )})}
              </div>
            </motion.div>
          )}

          {/* ── PAYMENT DETAILS ── */}
          {view === "pay" && selected && (
            <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="max-w-lg mx-auto space-y-5">
              <button onClick={() => setView("select")} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-semibold transition-colors">
                <ArrowLeft className="w-4 h-4" /> Change plan
              </button>

              {/* selected summary */}
              <div className={`rounded-2xl bg-gradient-to-br ${selected.grad} border ${selected.border} p-6 shadow-sm`}>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Selected Plan</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-black text-2xl ${selected.textColor}`}>{selected.name}</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{fmt(NODE_PRICES[selected.name])}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-center space-y-4">
                <p className="text-sm font-medium text-slate-600">You will be redirected to Paystack to complete your secure payment of <span className="text-slate-900 font-bold">{fmt(NODE_PRICES[selected.name])}</span>.</p>
                <button disabled={loading} onClick={handlePaystackCheckout}
                  className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold text-sm transition-colors shadow-md">
                  {loading ? "Initializing Secure Payment…" : "Pay Securely with Paystack →"}
                </button>
              </div>
              <p className="text-center text-xs text-slate-500 font-medium">Your plan activates automatically after successful payment.</p>
            </motion.div>
          )}

          {/* ── RECEIPT ── */}
          {view === "receipt" && selected && (
            <motion.div key="receipt" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto">
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl">
                {/* receipt header */}
                <div className={`bg-gradient-to-br ${selected.grad} border-b ${selected.border} p-8 text-center`}>
                  <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-8 h-8 text-slate-700" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-1">Payment Submitted</h2>
                  <p className="text-slate-600 text-sm font-medium">Your transfer has been logged for review</p>
                </div>

                {/* receipt body */}
                <div className="p-6 space-y-4">
                  {[
                    { label: "Plan Tier",       value: selected.name },
                    { label: "Amount Paid",      value: fmt(NODE_PRICES[selected.name]) },
                    { label: "Payment ID",       value: paymentId.slice(0, 16).toUpperCase(), mono: true },
                    { label: "Expected Activation", value: "Within 24 hours" },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0">
                      <span className="text-slate-500 text-sm font-medium">{r.label}</span>
                      <span className={`text-slate-900 text-sm font-bold text-right ml-4 ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                    </div>
                  ))}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mt-4">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs font-medium leading-relaxed">
                      Your payment is being reviewed. You will receive a notification once your plan is activated (minimum 24 hours). Do not make another payment.
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <Link href="/dashboard"
                    className="block w-full text-center py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors shadow-sm">
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PENDING ── */}
          {view === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto text-center py-12 bg-white rounded-3xl border border-slate-200 shadow-xl px-8 mt-10">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3">Payment Under Review</h2>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                Your subscription payment is being verified by our team. You will receive a notification once your plan is activated. This typically takes up to 24 hours.
              </p>
              <Link href="/dashboard" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-3.5 rounded-xl transition-colors text-sm shadow-md">
                Return to Dashboard
              </Link>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
