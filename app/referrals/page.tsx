"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { getUserProfile } from "@/lib/admin";
import { generateReferralCode, getReferralEarnings, REFERRAL_COMMISSION } from "@/lib/referrals";
import { motion } from "framer-motion";
import {
  FaArrowLeft, FaUsers, FaCopy, FaCircleCheck,
  FaChartBar, FaShare, FaLink, FaArrowTrendUp
} from "react-icons/fa6";
import Swal from "sweetalert2";

const SWAL = { background: "#020617", color: "#f8fafc", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full" } };
const BASE_URL = "https://adsfinance.vercel.app";
const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2 });
const ts  = (t: any)  => t?.seconds ? new Date(t.seconds * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

function mask(s?: string) {
  if (!s) return "Anonymous";
  if (s.includes("@")) {
    const [u, d] = s.split("@");
    return u.slice(0, 2) + "***@" + d;
  }
  return s.slice(0, 4) + "****" + s.slice(-2);
}

export default function ReferralsPage() {
  const router = useRouter();

  const [loading,   setLoading]   = useState(true);
  const [code,      setCode]      = useState("");
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings,  setEarnings]  = useState(0);
  const [copied,    setCopied]    = useState<"code"|"link"|null>(null);

  const refLink = code ? `${BASE_URL}/login?ref=${code}` : "";

  useEffect(() => {
    let unsubReferrals: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }

      try {
        const profile = await getUserProfile(u.uid);
        const rc      = profile?.referralCode ?? generateReferralCode(u.uid);
        setCode(rc);

        // ── Real-time referrals listener ───────────────────────────────────
        const q = query(collection(db, "referrals"), where("referrerUid", "==", u.uid));
        unsubReferrals = onSnapshot(q, snap => {
          const docs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          setReferrals(docs);

          const earned = docs.filter((d: any) => d.status === "active").length * REFERRAL_COMMISSION;
          setEarnings(earned);
        }, err => {
          console.error("Referrals listener:", err);
        });

      } catch (e) {
        console.error("Referrals page error:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubReferrals?.();
    };
  }, [router]);

  function copy(val: string, type: "code" | "link") {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: "Join AdsFinance", text: `Use my referral link to join AdsFinance and earn! ${refLink}`, url: refLink });
    } else {
      copy(refLink, "link");
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pending = referrals.filter((r: any) => r.status === "pending").length;
  const active  = referrals.filter((r: any) => r.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-24 md:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl px-4 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4 text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-black text-white">Referrals</h1>
          <p className="text-xs text-slate-500">Earn ₦50 for every node activation</p>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total",   value: referrals.length, color: "text-white" },
            { label: "Active",  value: active,            color: "text-teal-400" },
            { label: "Pending", value: pending,           color: "text-amber-400" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-white/10 rounded-[18px] p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Earnings card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-teal-600/20 to-teal-900/20 border border-teal-500/20 rounded-[22px] p-5 flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <FaArrowTrendUp className="w-3 h-3" /> Total Referral Earnings
            </p>
            <p className="text-3xl font-black text-white">{fmt(earnings)}</p>
            <p className="text-teal-400 text-xs mt-1">₦{REFERRAL_COMMISSION} per activated referral</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <FaChartBar className="w-7 h-7 text-teal-400" />
          </div>
        </motion.div>

        {/* Referral Code */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-slate-900 border border-white/10 rounded-[22px] p-5 space-y-4">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <FaLink className="w-4 h-4 text-teal-400" /> Your Referral Details
          </h2>

          {/* Code */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1.5">Referral Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 font-mono font-black text-teal-400 text-sm tracking-widest">
                {code || "—"}
              </div>
              <button onClick={() => copy(code, "code")}
                className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-colors shrink-0">
                {copied === "code" ? <FaCircleCheck className="w-4 h-4" /> : <FaCopy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1.5">Referral Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-slate-400 text-xs font-mono truncate">
                {refLink || "—"}
              </div>
              <button onClick={() => copy(refLink, "link")}
                className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-colors shrink-0">
                {copied === "link" ? <FaCircleCheck className="w-4 h-4" /> : <FaCopy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button onClick={share}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition-colors active:scale-95">
            <FaShare className="w-4 h-4" /> Share Referral Link
          </button>

          <div className="bg-slate-800/50 rounded-xl px-4 py-3">
            <p className="text-slate-400 text-xs leading-relaxed">
              Share your referral link. When someone signs up and activates a Validator Node, you automatically earn <strong className="text-teal-400">₦{REFERRAL_COMMISSION}</strong>.
            </p>
          </div>
        </motion.div>

        {/* Referral History */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-slate-900 border border-white/10 rounded-[22px] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <FaUsers className="w-4 h-4 text-teal-400" /> Referral History
            </h2>
            <span className="text-xs text-slate-500 font-mono">{referrals.length} total · Live</span>
          </div>

          {referrals.length === 0 ? (
            <div className="py-12 text-center">
              <FaUsers className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-sm">No referrals yet</p>
              <p className="text-slate-600 text-xs mt-1">Share your link to start earning</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {referrals.map((r: any, i) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{mask(r.refereeEmail)}</p>
                      <p className="text-xs text-slate-500">{ts(r.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      r.status === "active" ? "bg-teal-500/10 text-teal-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {r.status === "active" ? "Earned" : "Pending"}
                    </span>
                    {r.status === "active" && (
                      <p className="text-teal-400 text-xs font-bold mt-1">+₦{REFERRAL_COMMISSION}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <div className="bg-slate-900 border border-white/10 rounded-[22px] p-5 space-y-3">
          <h3 className="font-bold text-sm">How Referrals Work</h3>
          {[
            { step: "1", text: "Share your unique referral link or code" },
            { step: "2", text: "Friend signs up using your link" },
            { step: "3", text: "They activate a Validator Node" },
            { step: "4", text: `You earn ₦${REFERRAL_COMMISSION} instantly in your wallet` },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <p className="text-slate-400 text-sm">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
