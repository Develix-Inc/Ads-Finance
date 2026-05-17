"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/lib/admin";
import { adminGetWithdrawals, NODE_MIN_WITHDRAWAL } from "@/lib/admin";
import { WithdrawModal } from "@/components/ui/WithdrawModal";
import { AnimatePresence, motion } from "framer-motion";
import { FaArrowLeft, FaArrowUp, FaCircleCheck, FaClock, FaCircleXmark, FaWallet } from "react-icons/fa6";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts  = (t: any)    => t?.seconds ? new Date(t.seconds * 1000).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

const STATUS_STYLE: Record<string, { color: string; icon: any }> = {
  pending:   { color: "text-amber-400 bg-amber-500/10 border-amber-500/20",   icon: FaClock },
  processed: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: FaCircleCheck },
  rejected:  { color: "text-rose-400 bg-rose-500/10 border-rose-500/20",      icon: FaCircleXmark },
};

export default function WithdrawalsPage() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [profile, setProfile]     = useState<any>(null);
  const [history, setHistory]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      // get only this user's withdrawals
      const all = await adminGetWithdrawals();
      setHistory(all.filter((w: any) => w.uid === u.uid));
      setLoading(false);
    });
    return unsub;
  }, [router]);

  const nodeActive  = profile?.nodeStatus === "active";
  const nodeTier    = profile?.nodeTier ?? "Node Alpha";
  const minW        = (NODE_MIN_WITHDRAWAL as Record<string, number>)[nodeTier] ?? 75000;
  const balance     = profile?.walletBalance ?? 0;
  const canWithdraw = nodeActive && balance >= minW;

  const pending   = history.filter(w => w.status === "pending").length;
  const processed = history.filter(w => w.status === "processed").length;
  const total     = history.reduce((s, w) => w.status !== "rejected" ? s + (w.amount ?? 0) : s, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-10">
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

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white tracking-tight">Withdrawals</h1>
          <p className="text-xs text-slate-500">Min: {fmt(minW)} · Balance: {fmt(balance)}</p>
        </div>
        {nodeActive && (
          <button onClick={() => setShowModal(true)} disabled={!canWithdraw}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black px-4 py-2.5 rounded-xl text-sm transition-colors">
            <FaArrowUp className="w-3.5 h-3.5" /> Withdraw
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {!canWithdraw && nodeActive && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4">
            <p className="text-amber-300 font-bold text-sm">Minimum Not Reached</p>
            <p className="text-amber-500/80 text-xs mt-1">
              You need {fmt(minW)} to withdraw on {nodeTier}. Current balance: {fmt(balance)}. Keep earning!
            </p>
          </div>
        )}

        {!nodeActive && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 text-center">
            <FaWallet className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="font-bold">No Active Node</p>
            <p className="text-slate-500 text-sm mt-1 mb-4">Activate a Validator Node to enable withdrawals.</p>
            <Link href="/upgrade" className="inline-block bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-sm transition-colors">
              Get a Node
            </Link>
          </div>
        )}

        {/* stats */}
        {nodeActive && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pending",   value: pending,        color: "text-amber-400" },
              { label: "Processed", value: processed,      color: "text-emerald-400" },
              { label: "Total Paid",value: fmt(total),     color: "text-white" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900 border border-white/10 rounded-[18px] p-4 text-center">
                <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* history */}
        <div>
          <h3 className="font-bold text-base mb-3">Withdrawal History</h3>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 bg-slate-900 border border-white/10 rounded-[22px]">
              <FaArrowUp className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400 font-semibold">No withdrawals yet</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-white/10 rounded-[22px] divide-y divide-white/5 overflow-hidden">
              {history.map((w, i) => {
                const s = STATUS_STYLE[w.status] ?? STATUS_STYLE.pending;
                return (
                  <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color.split(" ").slice(1).join(" ")}`}>
                      <s.icon className={`w-4 h-4 ${s.color.split(" ")[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{fmt(w.amount)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{w.status}</span>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{w.bankName} · {w.accountNumber}</p>
                      <p className="text-slate-600 text-[11px] font-mono mt-0.5">{ts(w.requestedAt)}</p>
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
