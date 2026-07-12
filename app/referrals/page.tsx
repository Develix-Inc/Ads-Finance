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
  ArrowLeft, Users, Copy, CheckCircle2,
  BarChart3, Share, Link as LinkIcon, TrendingUp
} from "lucide-react";
import Swal from "sweetalert2";

const SWAL = { background: "#ffffff", color: "#0f172a", customClass: { popup: "!rounded-2xl !border !border-slate-200 !shadow-xl", confirmButton: "!rounded-xl px-6 py-2" } };
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const pending = referrals.filter((r: any) => r.status === "pending").length;
  const active  = referrals.filter((r: any) => r.status === "active").length;

  return (
    <div className="min-h-screen bg-background text-slate-900 pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900">Referrals</h1>
          <p className="text-xs text-slate-500 font-medium">Earn ₦{REFERRAL_COMMISSION} for every premium plan activation</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total",   value: referrals.length, color: "text-slate-900" },
            { label: "Active",  value: active,            color: "text-primary" },
            { label: "Pending", value: pending,           color: "text-amber-500" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Earnings card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-600 text-xs font-bold mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Total Referral Earnings
            </p>
            <p className="text-3xl font-black text-primary">{fmt(earnings)}</p>
            <p className="text-slate-500 font-medium text-xs mt-1.5">₦{REFERRAL_COMMISSION} per activated referral</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white border border-primary/20 shadow-sm flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
        </motion.div>

        {/* Referral Code */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary" /> Your Referral Details
          </h2>

          {/* Code */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-2">Referral Code</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-black text-slate-900 text-sm tracking-widest text-center sm:text-left">
                {code || "—"}
              </div>
              <button onClick={() => copy(code, "code")}
                className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors shrink-0 shadow-sm">
                {copied === "code" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-2">Referral Link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 font-medium text-xs font-mono truncate">
                {refLink || "—"}
              </div>
              <button onClick={() => copy(refLink, "link")}
                className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors shrink-0 shadow-sm">
                {copied === "link" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button onClick={share}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm transition-colors active:scale-95 shadow-sm">
            <Share className="w-4 h-4" /> Share Referral Link
          </button>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-slate-500 font-medium text-xs leading-relaxed text-center sm:text-left">
              Share your referral link. When someone signs up and activates a premium plan, you automatically earn <strong className="text-primary font-bold">₦{REFERRAL_COMMISSION}</strong>.
            </p>
          </div>
        </motion.div>

        {/* Referral History */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Referral History
            </h2>
            <span className="text-xs text-slate-500 font-bold">{referrals.length} total · Live</span>
          </div>

          {referrals.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold text-sm">No referrals yet</p>
              <p className="text-slate-500 font-medium text-xs mt-1">Share your link to start earning</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {referrals.map((r: any, i) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{mask(r.refereeEmail)}</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">{ts(r.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      r.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                    }`}>
                      {r.status === "active" ? "Earned" : "Pending"}
                    </span>
                    {r.status === "active" && (
                      <p className="text-primary text-xs font-black mt-1.5">+₦{REFERRAL_COMMISSION}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-900 text-sm">How Referrals Work</h3>
          <div className="space-y-3">
            {[
              { step: "1", text: "Share your unique referral link or code" },
              { step: "2", text: "Your friend signs up using your link" },
              { step: "3", text: "They activate a premium membership plan" },
              { step: "4", text: `You instantly earn ₦${REFERRAL_COMMISSION} in your wallet` },
            ].map(s => (
              <div key={s.step} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                <p className="text-slate-600 font-medium text-sm pt-0.5">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
