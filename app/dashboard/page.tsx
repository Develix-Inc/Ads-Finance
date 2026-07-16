"use client";

import Image from "next/image";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./styles.module.css";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, query, collection, where, getDocs } from "firebase/firestore";
import { getUserProfile, upsertUserProfile, NODE_MIN_WITHDRAWAL, adminVerifyPayment } from "@/lib/admin";
import { WithdrawModal } from "@/components/ui/WithdrawModal";
import { OnboardingWizard } from "@/components/ui/OnboardingWizard";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { TIER_LIMITS, getAdRewardData } from "@/lib/adRewards";

import {
  Bell, Wallet, List, CheckCircle2, Clock, Gift, ShieldCheck, ChevronRight,
  Play, Users, HelpCircle, Home, ClipboardList, User as UserIcon, TrendingUp, Award,
  XCircle
} from "lucide-react";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [adData, setAdData] = useState<any>(null);

  /* Auth + Profile Load */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      
      let p = await getUserProfile(u.uid);
      if (!p) {
        const defaultName = u.displayName || u.email?.split("@")[0] || "User";
        const fallbackProfile = {
          email: u.email || "",
          displayName: defaultName,
          photoURL: u.photoURL || "",
          onboardingComplete: false,
          walletBalance: 0,
          totalEarned: 0,
          dailyTaskEarnings: 0,
          nodeStatus: "none",
          nodeTier: null,
          accountStatus: "active",
        };
        await upsertUserProfile(u.uid, fallbackProfile);
        p = { uid: u.uid, ...fallbackProfile };
      }
      
      setProfile(p);
      setBalance(p?.walletBalance ?? 0);
      if (!p?.onboardingComplete) setShowOnboarding(true);

      // Fetch Ad Reward Data to see today's completed tasks
      const rewardData = await getAdRewardData(u.uid);
      setAdData(rewardData);

      setLoading(false);
    });
    return unsub;
  }, [router]);

  /* Real-time balance & profile updates */
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) {
        setBalance(snap.data().walletBalance ?? 0);
        setProfile(snap.data());
      }
    });
    return unsub;
  }, [user?.uid]);

  /* Paystack verification callback */
  useEffect(() => {
    if (!user?.uid || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("verify");
    if (!reference) return;

    async function verifyPayment() {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();
        if (data.success) {
          const q = query(collection(db, "payments"), where("referenceCode", "==", reference));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const paymentDoc = snap.docs[0];
            const paymentData = paymentDoc.data();
            if (paymentData.status !== "verified") {
              await adminVerifyPayment(paymentDoc.id, paymentData.uid, paymentData.nodeTier, "system@paystack");
              import("sweetalert2").then(Swal => Swal.default.fire({ 
                icon: "success", title: "Plan Activated", text: "Your premium plan is active!"
              }));
            }
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    verifyPayment();
  }, [user?.uid]);

  if (loading) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const name = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const avatar = name[0].toUpperCase();
  const nodeActive = profile?.nodeStatus === "active";
  const nodePending = profile?.nodeStatus === "pending";
  const nodeTier = profile?.nodeTier ?? "none";
  
  const minWithdraw = (NODE_MIN_WITHDRAWAL as Record<string, number>)[nodeTier] ?? 85000;
  const taskLimits = TIER_LIMITS[nodeTier] || TIER_LIMITS["none"];
  const maxTasks = taskLimits.maxVideos;
  
  const completedTasks = adData?.watchedToday?.length || 0;
  const remainingTasks = Math.max(maxTasks - completedTasks, 0);
  const progressPercent = maxTasks > 0 ? Math.min(Math.round((completedTasks / maxTasks) * 100), 100) : 0;
  
  // Real streak based on consecutive checkins
  const streakCount = adData?.streakCount || 0;

  const handleWithdrawClick = () => {
    if (!nodeActive) {
      import("sweetalert2").then(Swal => Swal.default.fire({
        icon: "warning", title: "Activation Required", text: "Activate a Premium Plan to withdraw."
      }));
      return;
    }
    setShowWithdraw(true);
  };

  return (
    <div className={styles.container}>
      {showOnboarding && user && (
        <OnboardingWizard uid={user.uid} userEmail={user.email || ""} onComplete={() => setShowOnboarding(false)} />
      )}
      
      {showWithdraw && nodeActive && (
        <WithdrawModal
          uid={user.uid} userEmail={user.email || ""}
          balance={balance} minWithdrawal={minWithdraw}
          withdrawalPin={profile?.withdrawalPin}
          bankName={profile?.bankName ?? ""} accountNumber={profile?.accountNumber ?? ""} accountName={profile?.accountName ?? ""}
          onClose={() => setShowWithdraw(false)}
        />
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image src="/logo.png" alt="AdsFinance Logo" width={32} height={32} className={styles.logoIcon} />
          <span className={styles.logoText}>AdsFinance</span>
        </div>
        <div className={styles.headerRight}>
          <Link href="/notifications" className={styles.bellWrapper}>
            <Bell className={styles.bellIcon} />
            {user?.uid && <span className={styles.bellBadge}>2</span> /* Real notifications count could go here */}
          </Link>
          <Link href="/profile" className={styles.avatar}>{avatar}</Link>
        </div>
      </header>

      <main className={styles.content}>
        
        {/* Alerts */}
        {profile?.accountStatus === 'suspended' && (
          <div style={{ background: '#FFF1F2', color: '#BE123C', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <XCircle size={20} />
            <div>
              <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Account Suspended</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>{profile.suspensionReason || "Your account has been suspended due to policy violations. All withdrawals are frozen."}</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={styles.heroLeft}>
            <h1 className={styles.heroTitle}>
              Hello, {name} <span role="img" aria-label="wave">👋</span>
            </h1>
            <p className={styles.heroSubtitle}>Great to see you back!</p>
            {profile?.accountStatus !== 'suspended' && (
              <div className={styles.heroVerify}>
                <CheckCircle2 size={14} /> Your account is secure and verified
              </div>
            )}
          </div>
          <div className={styles.streakCard}>
            <div className={styles.streakHeader}>
              <span role="img" aria-label="fire">🔥</span> Streak
            </div>
            <div className={styles.streakCount}>{streakCount}</div>
            <div className={styles.streakSub}>days active</div>
          </div>
        </section>

        {/* Available Balance */}
        <section className={styles.walletCard}>
          <div className={styles.walletTop}>
            <div className={styles.walletInfo}>
              <div className={styles.walletLabel}>AVAILABLE BALANCE</div>
              <div className={styles.walletAmount}>{fmt(balance)}</div>
              <div className={styles.walletToday}>
                <TrendingUp size={14} /> +{fmt(profile?.dailyTaskEarnings || 0)} today
              </div>
            </div>
            <div className={styles.walletGraphic}>
              <svg viewBox="0 0 140 120" className={styles.walletIllustration} fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="30" width="100" height="70" rx="12" fill="#EBF4FF"/>
                <path d="M20 50 C 40 40, 100 40, 120 50 L 120 100 C 100 110, 40 110, 20 100 Z" fill="#F4F8FF"/>
                <rect x="90" y="55" width="40" height="20" rx="6" fill="#1765DC"/>
                <circle cx="100" cy="65" r="3" fill="white"/>
                <circle cx="70" cy="25" r="16" fill="#F4F8FF" opacity="0.8"/>
                <text x="65" y="30" fill="#CBD5E1" fontSize="12" fontWeight="bold">₦</text>
                <circle cx="95" cy="15" r="12" fill="#F4F8FF" opacity="0.5"/>
                <text x="91" y="19" fill="#E2E8F0" fontSize="10" fontWeight="bold">₦</text>
              </svg>
            </div>
          </div>
          <div className={styles.walletButtons}>
            <button className={styles.btnPrimary} onClick={handleWithdrawClick}>
              <Wallet size={18} /> Withdraw Funds
            </button>
            <Link href="/tasks" className={styles.btnSecondary} style={{ textDecoration: 'none' }}>
              <List size={18} /> Start Tasks
            </Link>
          </div>
        </section>

        {/* Today's Progress */}
        <section className={styles.progressCard}>
          <div className={styles.progressLabel}>TODAY'S PROGRESS</div>
          <div className={styles.progressFlex}>
            <span className={styles.progressText}>{completedTasks} of {maxTasks} tasks completed</span>
            <span className={styles.progressPercent}>{progressPercent}%</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className={styles.progressStats}>
            <div className={styles.statItem}>
              <div className={`${styles.statIconWrap} ${styles.green}`}>
                <CheckCircle2 size={16} />
              </div>
              <div>
                <div className={styles.statValue}>{completedTasks}</div>
                <div className={styles.statLabel}>Completed</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIconWrap} ${styles.yellow}`}>
                <Clock size={16} />
              </div>
              <div>
                <div className={styles.statValue}>{remainingTasks}</div>
                <div className={styles.statLabel}>Remaining</div>
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={`${styles.statIconWrap} ${styles.blue}`}>
                <Gift size={16} />
              </div>
              <div>
                <div className={styles.statValue}>Bonus</div>
                <div className={styles.statLabel}>{fmt(adData?.dailyEarnings || 0)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Banner */}
        <section className={styles.trustBanner}>
          <ShieldCheck className={styles.shieldIcon} />
          <div className={styles.trustContent}>
            <div className={styles.trustTitle}>We're anti-scam & transparent</div>
            <div className={styles.trustDesc}>No hidden fees. No false promises. Just real rewards.</div>
          </div>
          <Link href="/settings" className={styles.trustLink} style={{ textDecoration: 'none' }}>
            Learn more <ChevronRight size={16} />
          </Link>
        </section>

        {/* Current Tier */}
        <section className={styles.tierCard}>
          <div className={styles.tierRibbon}>
            <Award size={24} />
          </div>
          <div className={styles.tierInfo}>
            <div className={styles.tierLabel}>CURRENT TIER</div>
            <div className={styles.tierTitleFlex}>
              <div className={styles.tierTitle}>{nodeTier}</div>
              {nodeActive ? (
                <div className={styles.badgeActive}>Active</div>
              ) : nodePending ? (
                <div className={styles.badgeActive} style={{ background: '#FFFBEB', color: '#D97706' }}>Pending</div>
              ) : (
                <div className={styles.badgeActive} style={{ background: '#F1F5F9', color: '#64748B' }}>Inactive</div>
              )}
            </div>
            <div className={styles.tierPlan}>Standard Plan</div>
          </div>
          <Link href="/upgrade" className={styles.upgradeBtn} style={{ textDecoration: 'none' }}>
            <TrendingUp size={14} /> Upgrade Tier
          </Link>

          <div className={styles.tierStats}>
            <div className={styles.tierStatCol}>
              <div className={styles.tierStatLabel}>Task Limit</div>
              <div className={styles.tierStatValue}>{maxTasks} tasks per day</div>
            </div>
            <div className={styles.tierStatCol}>
              <div className={styles.tierStatLabel}>Min. Withdrawal</div>
              <div className={styles.tierStatValue}>{fmt(minWithdraw)}</div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className={styles.quickLabel}>QUICK ACTIONS</div>
          <div className={styles.quickGrid}>
            <Link href="/tasks" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.quickCard}>
                <div className={`${styles.quickIconWrap} ${styles.green}`}>
                  <Play size={20} fill="currentColor" />
                </div>
                <div className={styles.quickTitle}>Watch Ads</div>
                <div className={styles.quickSub}>Earn Rewards</div>
              </div>
            </Link>
            <Link href="/referrals" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.quickCard}>
                <div className={`${styles.quickIconWrap} ${styles.blue}`}>
                  <Users size={20} fill="currentColor" />
                </div>
                <div className={styles.quickTitle}>Referrals</div>
                <div className={styles.quickSub}>Invite & Earn</div>
              </div>
            </Link>
            <Link href="/upgrade" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.quickCard}>
                <div className={`${styles.quickIconWrap} ${styles.purple}`}>
                  <Gift size={20} fill="currentColor" />
                </div>
                <div className={styles.quickTitle}>Plans</div>
                <div className={styles.quickSub}>Upgrade Now</div>
              </div>
            </Link>
            <Link href="/settings" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={styles.quickCard}>
                <div className={`${styles.quickIconWrap} ${styles.orange}`}>
                  <HelpCircle size={20} fill="currentColor" />
                </div>
                <div className={styles.quickTitle}>Help Center</div>
                <div className={styles.quickSub}>Get Support</div>
              </div>
            </Link>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
          <Home className={styles.navIcon} />
          <span className={styles.navLabel}>Dashboard</span>
        </Link>
        <Link href="/tasks" className={styles.navItem}>
          <ClipboardList className={styles.navIcon} />
          <span className={styles.navLabel}>Tasks</span>
        </Link>
        <Link href="/withdrawals" className={styles.navItem}>
          <Wallet className={styles.navIcon} />
          <span className={styles.navLabel}>Withdrawals</span>
        </Link>
        <Link href="/referrals" className={styles.navItem}>
          <Users className={styles.navIcon} />
          <span className={styles.navLabel}>Referrals</span>
        </Link>
        <Link href="/settings" className={styles.navItem}>
          <UserIcon className={styles.navIcon} />
          <span className={styles.navLabel}>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
