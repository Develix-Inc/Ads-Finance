"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./styles.module.css";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getUserProfile, adminGetWithdrawals, NODE_MIN_WITHDRAWAL, getSettings } from "@/lib/admin";
import { getUserReferrals } from "@/lib/referrals";
import { TIER_LIMITS } from "@/lib/adRewards";
import {
  Bell, Home, ClipboardList, Wallet, Users, User as UserIcon,
  Camera, CheckCircle2, Edit2, TrendingUp, DollarSign,
  Award, ArrowUpRight, Lock, CreditCard, FileText, Headphones, Settings, LogOut, ChevronRight
} from "lucide-react";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWLimits, setMinWLimits] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      
      try {
        const p = await getUserProfile(u.uid);
        setProfile(p);
        
        const [allW, refs, stgs] = await Promise.all([
          adminGetWithdrawals(),
          getUserReferrals(u.uid),
          getSettings()
        ]);
        
        setWithdrawals(allW.filter((w: any) => w.uid === u.uid));
        setReferrals(refs);
        if (stgs?.minWithdrawal) setMinWLimits(stgs.minWithdrawal);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const name = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const email = user?.email || "";
  const avatar = name[0].toUpperCase();

  const nodeTier = profile?.nodeTier ?? "none";
  const nodeActive = profile?.nodeStatus === "active";
  
  const balance = profile?.walletBalance ?? 0;
  const totalEarned = profile?.totalEarnings ?? 0;
  const totalWithdrawn = withdrawals.reduce((s, w) => w.status === "processed" ? s + (w.amount ?? 0) : s, 0);
  
  const activeLimits = minWLimits || NODE_MIN_WITHDRAWAL;
  const minW = (activeLimits as Record<string, number>)[nodeTier] ?? 75000;
  const taskLimit = TIER_LIMITS[nodeTier]?.maxVideos ?? 5;

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
        </div>
      </header>

      <main className={styles.content}>
        
        {/* Page Header */}
        <section className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Profile</h1>
          <p className={styles.pageSubtitle}>Manage your account and preferences</p>
        </section>

        {/* User Card */}
        <section className={styles.userCard}>
          <div className={styles.userInfoRow}>
            <div className={styles.userAvatarWrap}>
              <div className={styles.userAvatar}>{avatar}</div>
              <div className={styles.cameraBadge}>
                <Camera size={14} strokeWidth={2.5} />
              </div>
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{name}</div>
              <div className={styles.userEmail}>{email}</div>
              <div className={styles.verifiedBadge}>
                <CheckCircle2 size={14} /> Account Verified
              </div>
            </div>
            <Link href="/settings?tab=profile" className={styles.editBtn}>
              <Edit2 size={12} /> Edit Profile
            </Link>
          </div>

          <div className={styles.userStatsScroll}>
            <div className={styles.miniStat}>
              <div className={`${styles.miniStatIcon} ${styles.green}`}>
                <Wallet size={16} />
              </div>
              <div>
                <div className={styles.miniStatLabel}>Wallet Balance</div>
                <div className={styles.miniStatValue}>{fmt(balance)}</div>
              </div>
              <ChevronRight size={14} color="#CBD5E1" />
            </div>
            <div className={styles.miniStat}>
              <div className={`${styles.miniStatIcon} ${styles.blue}`}>
                <TrendingUp size={16} />
              </div>
              <div>
                <div className={styles.miniStatLabel}>Total Earned</div>
                <div className={styles.miniStatValue}>{fmt(totalEarned)}</div>
              </div>
              <ChevronRight size={14} color="#CBD5E1" />
            </div>
            <div className={styles.miniStat}>
              <div className={`${styles.miniStatIcon} ${styles.purple}`}>
                <DollarSign size={16} />
              </div>
              <div>
                <div className={styles.miniStatLabel}>Total Withdrawn</div>
                <div className={styles.miniStatValue}>{fmt(totalWithdrawn)}</div>
              </div>
              <ChevronRight size={14} color="#CBD5E1" />
            </div>
            <div className={styles.miniStat}>
              <div className={`${styles.miniStatIcon} ${styles.orange}`}>
                <Users size={16} />
              </div>
              <div>
                <div className={styles.miniStatLabel}>Referrals</div>
                <div className={styles.miniStatValue}>{referrals.length}</div>
              </div>
              <ChevronRight size={14} color="#CBD5E1" />
            </div>
          </div>
        </section>

        {/* Plan Card */}
        <section className={styles.planCard}>
          <div className={styles.planHeader}>
            <div className={styles.planNameRow}>
              <div className={styles.planIconWrap}>
                <Award size={24} />
              </div>
              <div className={styles.planTitleArea}>
                <div className={styles.planLabel}>Current Plan</div>
                <div className={styles.planNameRow}>
                  <span className={styles.planName}>Level {nodeTier.split(" ")[0]}</span>
                  {nodeActive && <span className={styles.activePill}>Active</span>}
                </div>
                <div className={styles.planDesc}>{nodeTier} Access</div>
              </div>
            </div>
            <Link href="/upgrade" className={styles.upgradeBtn}>
              <ArrowUpRight size={14} /> Upgrade Plan
            </Link>
          </div>

          <div className={styles.planStats}>
            <div className={styles.pStatItem}>
              <div className={styles.pStatLabel}>Task Limit</div>
              <div className={styles.pStatValue}>{taskLimit} tasks per day</div>
            </div>
            <div className={styles.pStatItem}>
              <div className={styles.pStatLabel}>Min. Withdrawal</div>
              <div className={styles.pStatValue}>{fmt(minW)}</div>
            </div>
            <div className={styles.pStatItem}>
              <div className={styles.pStatLabel}>Plan Benefits</div>
              <div className={styles.pStatValue}>{nodeTier.split(" ")[0]} Access</div>
            </div>
          </div>
        </section>

        {/* Menu List */}
        <section className={styles.menuList}>
          <Link href="/settings?tab=profile" className={styles.menuItem}>
            <div className={`${styles.menuIconWrap} ${styles.blue}`}>
              <UserIcon size={20} />
            </div>
            <div className={styles.menuText}>
              <div className={styles.menuTitle}>Personal Information</div>
              <div className={styles.menuDesc}>Update your personal details</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>
          <Link href="/settings?tab=pin" className={styles.menuItem}>
            <div className={`${styles.menuIconWrap} ${styles.green}`}>
              <Lock size={20} />
            </div>
            <div className={styles.menuText}>
              <div className={styles.menuTitle}>Security</div>
              <div className={styles.menuDesc}>Change password and secure your account</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>
          <Link href="/settings?tab=bank" className={styles.menuItem}>
            <div className={`${styles.menuIconWrap} ${styles.orange}`}>
              <CreditCard size={20} />
            </div>
            <div className={styles.menuText}>
              <div className={styles.menuTitle}>Payment Methods</div>
              <div className={styles.menuDesc}>Manage your withdrawal methods</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>
          <Link href="/withdrawals" className={styles.menuItem}>
            <div className={`${styles.menuIconWrap} ${styles.purple}`}>
              <FileText size={20} />
            </div>
            <div className={styles.menuText}>
              <div className={styles.menuTitle}>Transaction History</div>
              <div className={styles.menuDesc}>View your earnings and transactions</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>
          <Link href="/support" className={styles.menuItem}>
            <div className={`${styles.menuIconWrap} ${styles.blue}`}>
              <Headphones size={20} />
            </div>
            <div className={styles.menuText}>
              <div className={styles.menuTitle}>Support Center</div>
              <div className={styles.menuDesc}>Get help and support</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>
          <Link href="/settings?tab=notifications" className={styles.menuItem}>
            <div className={`${styles.menuIconWrap} ${styles.gray}`}>
              <Settings size={20} />
            </div>
            <div className={styles.menuText}>
              <div className={styles.menuTitle}>Settings</div>
              <div className={styles.menuDesc}>App preferences and notifications</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </Link>
        </section>

        {/* Log Out */}
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <div className={styles.logoutRow}>
            <LogOut size={18} /> Log Out
          </div>
          <div className={styles.logoutDesc}>Sign out of your account</div>
        </button>

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
        <Link href="/withdrawals" className={styles.navItem}>
          <Wallet className={styles.navIcon} />
          <span className={styles.navLabel}>Withdrawals</span>
        </Link>
        <Link href="/referrals" className={styles.navItem}>
          <Users className={styles.navIcon} />
          <span className={styles.navLabel}>Referrals</span>
        </Link>
        <Link href="/profile" className={`${styles.navItem} ${styles.active}`}>
          <UserIcon className={styles.navIcon} />
          <span className={styles.navLabel}>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
