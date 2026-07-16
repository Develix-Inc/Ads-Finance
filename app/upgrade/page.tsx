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
import styles from "./styles.module.css";

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG");

const TIERS = [
  {
    name: "Alpha Plan", 
    icon: ShieldCheck,
    cssClass: "alpha",
    features: ["Standard Task Limits", "Referral Commission", "24h Withdrawal SLA"],
  },
  {
    name: "Sigma Plan", 
    icon: Zap, 
    popular: true,
    cssClass: "sigma",
    features: ["Expanded Task Pool", "Priority Referral Rate", "6h Withdrawal SLA", "Priority Support"],
  },
  {
    name: "Omega Plan", 
    icon: Star,
    cssClass: "omega",
    features: ["Institutional Tasks", "Maximum Referral Rate", "Instant Withdrawals", "Dedicated Manager"],
  },
];

type View = "select" | "pay" | "receipt" | "pending";

export default function UpgradePage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [selected, setSelected] = useState<typeof TIERS[0] | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView]       = useState<View>("select");
  const [paymentId, setPaymentId] = useState("");

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

      // 1. Log payment as pending locally
      const pid = await submitPayment(user.uid, user.email || user.phoneNumber || "user@adsfinance.com", selected.name, reference);
      setPaymentId(pid);
      
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
      Swal.fire({ 
        background: "#ffffff", 
        color: "#0f172a", 
        icon: "error", 
        title: "Payment Initialization Failed", 
        text: e.message || "Please try again.", 
        customClass: { popup: "!rounded-2xl !border !border-slate-200", confirmButton: "!rounded-full !bg-rose-600" } 
      });
      setLoading(false);
    }
  };

  if (!user) return (
    <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading...
    </div>
  );

  return (
    <div className={styles.container}>
      {/* header */}
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.backBtn}>
          <ArrowLeft size={16} strokeWidth={2.5} />
        </Link>
        <div className={styles.headerInfo}>
          <h1 className={styles.pageTitle}>Upgrade Plan</h1>
          <p className={styles.pageSubtitle}>
            {view === "select" && "Choose your membership tier"}
            {view === "pay" && "Complete secure checkout"}
            {view === "receipt" && "Payment receipt"}
            {view === "pending" && "Verification in progress"}
          </p>
        </div>
        {/* step indicator */}
        {(view === "select" || view === "pay") && (
          <div className={styles.stepIndicator}>
            {["select","pay"].map((v,i) => {
              const currentIdx = ["select","pay"].indexOf(view);
              let stateClass = styles.future;
              if (view === v) stateClass = styles.active;
              else if (i < currentIdx) stateClass = styles.past;
              
              return <div key={v} className={`${styles.stepDot} ${stateClass}`} />;
            })}
          </div>
        )}
      </header>

      <main className={styles.content}>
        <AnimatePresence mode="wait">

          {/* ── SELECT TIER ── */}
          {view === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <p className={styles.introText}>
                Select a Premium Plan to increase your daily task limits and unlock greater earning potential.
              </p>
              
              <div className={styles.plansGrid}>
                {TIERS.map(t => {
                  const isCurrent = profile?.nodeTier === t.name && profile?.nodeStatus === "active";
                  const cardClass = `${styles.planCard} ${styles[t.cssClass]} ${isCurrent ? styles.current : ''}`;
                  
                  return (
                    <motion.div 
                      key={t.name} 
                      whileTap={{ scale: isCurrent ? 1 : 0.98 }}
                      onClick={() => { if (!isCurrent) { setSelected(t); setView("pay"); } }}
                      className={cardClass}
                    >
                      {t.popular && !isCurrent && (
                        <div className={styles.popularBadge}>Most Popular</div>
                      )}
                      {isCurrent && (
                        <div className={styles.activeBadge}>
                          <CheckCircle2 size={12} strokeWidth={3} /> Active Plan
                        </div>
                      )}
                      
                      <div className={styles.iconWrap}>
                        <t.icon size={24} strokeWidth={2.5} />
                      </div>
                      
                      <h2 className={styles.planName}>{t.name}</h2>
                      <div className={styles.planPrice}>{fmt(NODE_PRICES[t.name])}</div>
                      
                      <div className={styles.premiumTag}>Premium Access</div>
                      
                      <ul className={styles.featuresList}>
                        {t.features.map((f, i) => (
                          <li key={i} className={styles.featureItem}>
                            <CheckCircle2 size={16} strokeWidth={2.5} className={styles.featureIcon} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <button className={styles.selectBtn}>
                        {isCurrent ? "Current Plan" : `Select ${t.name}`} 
                        {!isCurrent && <ChevronRight size={16} />}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── PAYMENT DETAILS ── */}
          {view === "pay" && selected && (
            <motion.div key="pay" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className={styles.payContainer}>
              <button onClick={() => setView("select")} className={styles.changePlanBtn}>
                <ArrowLeft size={16} strokeWidth={2.5} /> Change plan
              </button>

              {/* selected summary */}
              <div className={`${styles.summaryCard} ${styles[selected.cssClass]}`}>
                <div className={styles.summaryLabel}>Selected Plan</div>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryName}>{selected.name}</div>
                  <div className={styles.summaryPrice}>{fmt(NODE_PRICES[selected.name])}</div>
                </div>
              </div>

              <div className={styles.checkoutCard}>
                <p className={styles.checkoutText}>
                  You will be redirected to Paystack to complete your secure payment of <span className={styles.checkoutPrice}>{fmt(NODE_PRICES[selected.name])}</span>.
                </p>
                <button disabled={loading} onClick={handlePaystackCheckout} className={styles.paystackBtn}>
                  {loading ? "Initializing Secure Payment…" : "Pay Securely with Paystack →"}
                </button>
              </div>
              <p className={styles.activationText}>Your plan activates automatically after successful payment.</p>
            </motion.div>
          )}

          {/* ── RECEIPT ── */}
          {view === "receipt" && selected && (
            <motion.div key="receipt" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <div className={styles.receiptCard}>
                {/* receipt header */}
                <div className={`${styles.receiptHeader} ${styles[selected.cssClass]}`}>
                  <div className={styles.receiptIconWrap}>
                    <Receipt size={32} strokeWidth={2} />
                  </div>
                  <h2 className={styles.receiptTitle}>Payment Submitted</h2>
                  <p className={styles.receiptSubtitle}>Your transfer has been logged for review</p>
                </div>

                {/* receipt body */}
                <div className={styles.receiptBody}>
                  {[
                    { label: "Plan Tier",       value: selected.name },
                    { label: "Amount Paid",      value: fmt(NODE_PRICES[selected.name]) },
                    { label: "Payment ID",       value: paymentId.slice(0, 16).toUpperCase(), mono: true },
                    { label: "Expected Activation", value: "Within 24 hours" },
                  ].map(r => (
                    <div key={r.label} className={styles.receiptRow}>
                      <span className={styles.receiptLabel}>{r.label}</span>
                      <span className={`${styles.receiptValue} ${r.mono ? styles.mono : ""}`}>{r.value}</span>
                    </div>
                  ))}

                  <div className={styles.warningBox}>
                    <Clock size={20} strokeWidth={2.5} className={styles.warningIcon} />
                    <p className={styles.warningText}>
                      Your payment is being reviewed. You will receive a notification once your plan is activated (minimum 24 hours). Do not make another payment.
                    </p>
                  </div>
                </div>

                <Link href="/dashboard" className={styles.returnBtn}>
                  Return to Dashboard
                </Link>
              </div>
            </motion.div>
          )}

          {/* ── PENDING ── */}
          {view === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className={styles.pendingContainer}>
                <div className={styles.pendingIconWrap}>
                  <Clock size={40} strokeWidth={2.5} className="text-amber-500 animate-pulse" style={{ color: '#D97706' }} />
                </div>
                <h2 className={styles.pendingTitle}>Payment Under Review</h2>
                <p className={styles.pendingDesc}>
                  Your subscription payment is being verified by our team. You will receive a notification once your plan is activated. This typically takes up to 24 hours.
                </p>
                <Link href="/dashboard" className={styles.pendingBtn}>
                  Return to Dashboard
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
