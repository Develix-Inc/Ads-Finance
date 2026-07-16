"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./styles.module.css";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile, adminGetWithdrawals, NODE_MIN_WITHDRAWAL, getSettings } from "@/lib/admin";
import { WithdrawModal } from "@/components/ui/WithdrawModal";
import { AnimatePresence } from "framer-motion";
import {
  Bell, CheckCircle2, Clock, ShieldCheck, ChevronRight,
  Wallet, Home, ClipboardList, Users, User as UserIcon, Lock,
  ArrowLeft
} from "lucide-react";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const ts = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

export default function WithdrawalsPage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [minWLimits, setMinWLimits] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setUid(u.uid);
      
      try {
        const p = await getUserProfile(u.uid);
        setProfile(p);
        
        const all = await adminGetWithdrawals();
        setHistory(all.filter((w: any) => w.uid === u.uid));
        
        const stgs = await getSettings();
        if (stgs?.minWithdrawal) setMinWLimits(stgs.minWithdrawal);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  if (loading) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const name = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const avatar = name[0].toUpperCase();

  const nodeActive = profile?.nodeStatus === "active";
  const nodeTier = profile?.nodeTier ?? "none";
  const minW = (minWLimits || NODE_MIN_WITHDRAWAL as Record<string, number>)[nodeTier] ?? 85000;
  const balance = profile?.walletBalance ?? 0;
  
  const canWithdraw = nodeActive && balance >= minW;
  const progressPercent = Math.min((balance / minW) * 100, 100);
  const remaining = Math.max(minW - balance, 0);

  const pending = history.filter(w => w.status === "pending").length;
  const processed = history.filter(w => w.status === "processed").length;
  const totalPaid = history.reduce((s, w) => w.status === "processed" ? s + (w.amount ?? 0) : s, 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>AF</div>
          <span className={styles.logoText}>AdsFinance</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.bellWrapper}>
            <Bell className={styles.bellIcon} />
            <span className={styles.bellBadge}>2</span>
          </div>
          <div className={styles.avatar}>{avatar}</div>
        </div>
      </header>

      <main className={styles.content}>
        
        {/* Page Header */}
        <section className={styles.pageHeader}>
          <Link href="/dashboard" className={styles.backBtn}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Withdrawals</h1>
            <p className={styles.pageSubtitle}>Manage your earnings and withdraw securely</p>
          </div>
        </section>

        {/* Available Balance Card */}
        <section className={styles.balanceCard}>
          <div className={styles.balanceLeft}>
            <div className={styles.balanceLabel}>Available Balance</div>
            <div className={styles.balanceAmount}>{fmt(balance)}</div>
            <div className={styles.minWithdrawBadge}>
              <ShieldCheck size={14} /> Minimum Withdrawal: {fmt(minW)}
            </div>
          </div>
          <div 
            className={`${styles.withdrawBtnBox} ${canWithdraw ? styles.active : ''}`}
            onClick={() => { if (canWithdraw) setShowModal(true); }}
          >
            <div className={styles.withdrawBtnTitle}>
              {canWithdraw ? <Wallet size={16} /> : <Lock size={16} />} 
              Withdraw
            </div>
            <div className={styles.withdrawBtnSub}>
              {canWithdraw ? "Ready to cash out" : `Available at ${fmt(minW)}`}
            </div>
          </div>
        </section>

        {/* Withdrawal Progress */}
        <section className={styles.progressCard}>
          <div className={styles.progressLeft}>
            <div className={styles.progressTitle}>Withdrawal Progress</div>
            <div className={styles.progressFraction}>{fmt(balance)} / {fmt(minW)}</div>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className={styles.progressFooter}>
              <span className={styles.progressPercent}>{progressPercent.toFixed(1)}%</span>
              <span className={styles.progressRemaining}>{fmt(remaining)} more to unlock</span>
            </div>
          </div>
          <div className={styles.progressWalletGraphic}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="30" width="70" height="50" rx="10" fill="#A7F3D0" />
              <path d="M15 45 C 35 35, 65 35, 85 45 L 85 70 C 65 80, 35 80, 15 70 Z" fill="#6EE7B7" />
              <circle cx="50" cy="55" r="14" fill="white" />
              <rect x="47" y="52" width="6" height="8" rx="2" fill="#059669" />
              <circle cx="80" cy="50" r="4" fill="#34D399" opacity="0.5" />
            </svg>
          </div>
        </section>

        {/* Stats */}
        <section className={styles.statsCard}>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.orange}`}>
              <Clock size={18} strokeWidth={2.5} />
            </div>
            <div className={`${styles.statValue} ${styles.orange}`}>{pending}</div>
            <div className={styles.statLabel}>Pending</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.green}`}>
              <CheckCircle2 size={18} strokeWidth={2.5} />
            </div>
            <div className={`${styles.statValue} ${styles.green}`}>{processed}</div>
            <div className={styles.statLabel}>Completed</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.blue}`}>
              <Wallet size={18} strokeWidth={2.5} />
            </div>
            <div className={`${styles.statValue} ${styles.blue}`}>{fmt(totalPaid)}</div>
            <div className={styles.statLabel}>Total Paid</div>
          </div>
        </section>

        {/* Trust Banner */}
        <section className={styles.trustBanner}>
          <div className={styles.shieldWrap}>
            <ShieldCheck size={20} />
          </div>
          <div className={styles.trustContent}>
            <div className={styles.trustTitle}>Secure & Transparent</div>
            <div className={styles.trustDesc}>Your payments are safe with us. No hidden fees, no delays.</div>
          </div>
          <ChevronRight size={16} color="#1765DC" />
        </section>

        {/* History List */}
        <section>
          <div className={styles.historyHeader}>
            <div className={styles.historyTitle}>Withdrawal History</div>
            <Link href="#" className={styles.viewAll}>View All <ChevronRight size={14} /></Link>
          </div>
          
          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <ClipboardList size={32} />
              </div>
              <div className={styles.emptyContent}>
                <div className={styles.emptyTitle}>No withdrawals yet</div>
                <div className={styles.emptyDesc}>Complete tasks and reach the minimum withdrawal balance to withdraw your earnings.</div>
              </div>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map((w, i) => (
                <div key={w.id} className={styles.historyItem}>
                  <div className={styles.bankLogo}>{w.bankName?.substring(0, 3).toUpperCase() || 'BNK'}</div>
                  <div className={styles.historyInfo}>
                    <div className={styles.historyAmountRow}>
                      <span className={styles.historyAmount}>{fmt(w.amount)}</span>
                      <span className={`${styles.statusBadge} ${styles[w.status] || styles.pending}`}>
                        {w.status === 'processed' ? 'Processed' : w.status === 'pending' ? 'Pending' : 'Rejected'} 
                        {w.status === 'processed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      </span>
                    </div>
                    <div className={styles.historyDetails}>{w.bankName} • {w.accountNumber}</div>
                    <div className={styles.historyFooter}>
                      <span>{ts(w.requestedAt)}</span>
                      <span className={styles.historyRef}>Ref. #{w.id.substring(0, 8).toUpperCase()} <ChevronRight size={12} /></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard" className={styles.navItem}>
          <Home className={styles.navIcon} />
          <span className={styles.navLabel}>Dashboard</span>
        </Link>
        <Link href="/tasks" className={styles.navItem}>
          <ClipboardList className={styles.navIcon} />
          <span className={styles.navLabel}>Tasks</span>
        </Link>
        <Link href="/withdrawals" className={`${styles.navItem} ${styles.active}`}>
          <Wallet className={styles.navIcon} />
          <span className={styles.navLabel}>Withdrawals</span>
        </Link>
        <Link href="/referrals" className={styles.navItem}>
          <Users className={styles.navIcon} />
          <span className={styles.navLabel}>Referrals</span>
        </Link>
        <Link href="/profile" className={styles.navItem}>
          <UserIcon className={styles.navIcon} />
          <span className={styles.navLabel}>Profile</span>
        </Link>
      </nav>

      {/* Modal */}
      <AnimatePresence>
        {showModal && nodeActive && (
          <WithdrawModal
            uid={uid} 
            userEmail={user.email || user.phoneNumber || ""}
            balance={balance} 
            minWithdrawal={minW}
            bankName={profile?.bankName ?? ""} 
            accountNumber={profile?.accountNumber ?? ""} 
            accountName={profile?.accountName ?? ""}
            onClose={() => { setShowModal(false); router.refresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
