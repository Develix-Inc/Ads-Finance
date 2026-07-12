"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/lib/admin";
import { adminGetWithdrawals, NODE_MIN_WITHDRAWAL, getSettings } from "@/lib/admin";
import { WithdrawModal } from "@/components/ui/WithdrawModal";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock, XCircle, Wallet, Lock } from "lucide-react";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts  = (t: any)    => t?.seconds ? new Date(t.seconds * 1000).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

const STATUS_STYLE: Record<string, { color: string; icon: any }> = {
  pending:   { color: "text-amber-500 bg-amber-50 border-amber-200",   icon: Clock },
  processed: { color: "text-emerald-500 bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  rejected:  { color: "text-rose-500 bg-rose-50 border-rose-200",      icon: XCircle },
};

export default function WithdrawalsPage() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [profile, setProfile]     = useState<any>(null);
  const [history, setHistory]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [minWLimits, setMinWLimits] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      // get only this user's withdrawals
      const all = await adminGetWithdrawals();
      setHistory(all.filter((w: any) => w.uid === u.uid));
      // fetch dynamic limits
      const stgs = await getSettings();
      if (stgs?.minWithdrawal) setMinWLimits(stgs.minWithdrawal);
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const nodeActive  = profile?.nodeStatus === "active";
  const nodeTier    = profile?.nodeTier ?? "Starter Plan";
  const activeLimits= minWLimits || NODE_MIN_WITHDRAWAL;
  const minW        = (activeLimits as Record<string, number>)[nodeTier] ?? 50000;
  const balance     = profile?.walletBalance ?? 0;
  const canWithdraw = nodeActive && balance >= minW;

  const pending   = history.filter(w => w.status === "pending").length;
  const processed = history.filter(w => w.status === "processed").length;
  const total     = history.reduce((s, w) => w.status !== "rejected" ? s + (w.amount ?? 0) : s, 0);

  return (
    <div className="min-h-screen bg-background text-slate-900 pb-10">
      <AnimatePresence>
        {showModal && nodeActive && (
          <WithdrawModal
            uid={user.uid} userEmail={user.email || user.phoneNumber || ""}
            balance={balance} minWithdrawal={minW}
            bankName={profile?.bankName ?? ""} accountNumber={profile?.accountNumber ?? ""} accountName={profile?.accountName ?? ""}
            onClose={() => { setShowModal(false); router.refresh(); }}
          />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Withdrawals</h1>
          <p className="text-xs text-slate-500 font-medium">Min: {fmt(minW)} · Balance: {fmt(balance)}</p>
        </div>
        {nodeActive && (
          <button onClick={() => setShowModal(true)} disabled={!canWithdraw}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-sm">
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </button>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {!canWithdraw && nodeActive && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="text-amber-800 font-bold text-sm">Minimum Balance Not Reached</p>
            <p className="text-amber-700/80 text-xs mt-1 font-medium leading-relaxed">
              You need {fmt(minW)} to withdraw on your {nodeTier}. Current balance: {fmt(balance)}. Keep earning!
            </p>
          </div>
        )}

        {!nodeActive && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 p-8 opacity-5 pointer-events-none">
              <Lock className="w-32 h-32" />
            </div>
            <Wallet className="w-12 h-12 text-slate-400 mx-auto mb-4 relative z-10" />
            <p className="font-black text-slate-900 text-lg relative z-10">Premium Plan Required</p>
            <p className="text-slate-500 text-sm mt-2 mb-6 font-medium relative z-10">Activate a membership plan to enable withdrawals to your local bank account.</p>
            <Link href="/upgrade" className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow-md relative z-10">
              Upgrade Account
            </Link>
          </div>
        )}

        {/* stats */}
        {nodeActive && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Pending",   value: pending,        color: "text-amber-500" },
              { label: "Processed", value: processed,      color: "text-emerald-500" },
              { label: "Total Paid",value: fmt(total),     color: "text-slate-900" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* history */}
        <div>
          <h3 className="font-bold text-slate-900 text-base mb-4 px-2">Withdrawal History</h3>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <ArrowUpRight className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-bold text-sm">No withdrawals yet</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
              {history.map((w, i) => {
                const s = STATUS_STYLE[w.status] ?? STATUS_STYLE.pending;
                return (
                  <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-colors">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${s.color.split(" ").slice(1).join(" ")}`}>
                      <s.icon className={`w-5 h-5 ${s.color.split(" ")[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{fmt(w.amount)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{w.status}</span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1 font-medium truncate">{w.bankName} · {w.accountNumber}</p>
                      <p className="text-slate-400 text-[10px] font-bold tracking-wider uppercase mt-1">{ts(w.requestedAt)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
