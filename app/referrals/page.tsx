"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/lib/admin";
import { getUserReferrals, getReferralEarnings, generateReferralCode, REFERRAL_COMMISSION } from "@/lib/referrals";
import { FaArrowLeft, FaUsers, FaCopy, FaShareNodes, FaCircleCheck, FaClock, FaLink } from "react-icons/fa6";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

const fmt  = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts   = (t: any)    => t?.seconds ? new Date(t.seconds * 1000).toLocaleDateString("en-NG", { dateStyle: "medium" }) : "";
const SWAL = { background: "#020617", color: "#f8fafc", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-600" } };

export default function ReferralsPage() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [code, setCode]         = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      try {
        const profile = await getUserProfile(u.uid);
        const rc      = profile?.referralCode ?? generateReferralCode(u.uid);
        setCode(rc);
        const [refs, earn] = await Promise.all([getUserReferrals(u.uid), getReferralEarnings(u.uid)]);
        setReferrals(refs);
        setEarnings(earn);
      } catch (e) {
        console.error("Referrals load error:", e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  const BASE_URL = "https://adsfinance.vercel.app";
  const refLink  = code ? `${BASE_URL}/login?ref=${code}` : "";

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    Swal.fire({ ...SWAL, icon: "success", title: `${label} Copied!`, timer: 1000, showConfirmButton: false });
  };

  const active = referrals.filter(r => r.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-10">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Referrals</h1>
          <p className="text-xs text-slate-500">Earn ₦{REFERRAL_COMMISSION} per activated referral</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {/* stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Referrals",  value: referrals.length, color: "text-white" },
                { label: "Active Nodes",     value: active,            color: "text-teal-400" },
                { label: "Total Earned",     value: fmt(earnings),     color: "text-emerald-400" },
              ].map((s, i) => (
                <div key={i} className="bg-slate-900 border border-white/10 rounded-[18px] p-4 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* referral code */}
            <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
              <p className="text-sm font-bold text-white">Your Referral Code</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 font-mono text-teal-400 font-bold text-lg tracking-widest">
                  {code}
                </div>
                <button onClick={() => copy(code, "Code")}
                  className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-colors">
                  <FaCopy className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm font-bold text-white">Referral Link</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-slate-400 text-xs font-mono truncate">
                  {refLink}
                </div>
                <button onClick={() => copy(refLink, "Link")}
                  className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-colors">
                  <FaLink className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-teal-500/8 border border-teal-500/20 rounded-xl p-4">
                <p className="text-teal-300 text-xs leading-relaxed">
                  Share your code or link. When someone signs up and activates a Validator Node, you earn <strong>₦{REFERRAL_COMMISSION}</strong> automatically credited to your wallet.
                </p>
              </div>
            </div>

            {/* referrals list */}
            <div>
              <h3 className="font-bold text-base mb-3">Your Referrals ({referrals.length})</h3>
              {referrals.length === 0 ? (
                <div className="text-center py-12 bg-slate-900 border border-white/10 rounded-[22px]">
                  <FaUsers className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-semibold">No referrals yet</p>
                  <p className="text-slate-600 text-sm mt-1">Share your link to start earning commission.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-white/10 rounded-[22px] divide-y divide-white/5 overflow-hidden">
                  {referrals.map((r, i) => (
                    <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                          {r.status === "active" ? <FaCircleCheck className="w-4 h-4" /> : <FaClock className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">Referral #{r.id.slice(0, 8)}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{ts(r.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-black ${r.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                          {r.status === "active" ? `+₦${REFERRAL_COMMISSION}` : "Pending"}
                        </p>
                        <p className="text-[11px] text-slate-500 capitalize">{r.status}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
