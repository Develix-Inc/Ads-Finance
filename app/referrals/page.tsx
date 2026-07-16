"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./styles.module.css";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/lib/admin";
import { getUserReferrals, generateReferralCode } from "@/lib/referrals";
import { HowItWorksModal } from "@/components/ui/HowItWorksModal";
import {
  Bell, Home, ClipboardList, Wallet, Users, User as UserIcon,
  Copy, ChevronRight, Gift, HelpCircle, CheckCircle2, Share2, Award, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

export default function ReferralsPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [refLink, setRefLink] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      
      try {
        const p = await getUserProfile(u.uid);
        setProfile(p);
        
        const refs = await getUserReferrals(u.uid);
        setReferrals(refs);
        
        const code = p?.referralCode || generateReferralCode(u.uid);
        setRefLink(`${window.location.origin}/register?ref=${code}`);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  const copyLink = async () => {
    if (!refLink) return;
    try {
      await navigator.clipboard.writeText(refLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join AdsFinance",
          text: "Earn money by completing simple tasks. Sign up using my referral link!",
          url: refLink,
        });
      } catch (e) {
        console.error(e);
      }
    } else {
      copyLink();
    }
  };

  if (loading) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const name = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const avatar = name[0].toUpperCase();

  const activeRefs = referrals.filter(r => r.status === "active");
  const pendingRefs = referrals.filter(r => r.status === "pending");

  const totalEarnings = activeRefs.reduce((sum, r) => sum + (r.commission || 0), 0);
  const pendingEarnings = pendingRefs.reduce((sum, r) => sum + (r.commission || 0), 0);

  // Simple leveling system logic based on active referrals
  let level = "Bronze";
  let nextLevel = "Silver";
  let req = 20;
  if (activeRefs.length >= 20) { level = "Silver"; nextLevel = "Gold"; req = 50; }
  if (activeRefs.length >= 50) { level = "Gold"; nextLevel = "Platinum"; req = 100; }
  if (activeRefs.length >= 100) { level = "Platinum"; nextLevel = "Diamond"; req = 250; }
  
  const levelProgress = Math.min((activeRefs.length / req) * 100, 100);

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
          <div>
            <h1 className={styles.pageTitle}>Referrals</h1>
            <p className={styles.pageSubtitle}>Invite friends and earn rewards together</p>
          </div>
          <div className={styles.totalEarningsPill}>
            <div className={styles.pillIconWrap}>
              <Wallet size={14} />
            </div>
            <div>
              <div className={styles.pillLabel}>Total Earnings</div>
              <div className={styles.pillAmount}>{fmt(totalEarnings)}</div>
            </div>
            <ChevronRight size={16} color="#94A3B8" />
          </div>
        </section>

        {/* Hero Banner */}
        <section className={styles.heroBanner}>
          <div className={styles.heroGraphic}>
            <img src="https://cdn-icons-png.flaticon.com/512/8150/8150244.png" alt="Gift" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
          </div>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>Earn More, Together!</h2>
            <p className={styles.heroDesc}>Invite your friends to join AdsFinance and earn instantly for each successful registration.</p>
            <button className={styles.howItWorksBtn} onClick={() => setShowGuide(true)}>
              <HelpCircle size={12} /> How it Works
            </button>
          </div>
        </section>

        {/* Guide Modal */}
        <AnimatePresence>
          {showGuide && <HowItWorksModal onClose={() => setShowGuide(false)} />}
        </AnimatePresence>

        {/* Referral Link Card */}
        <section className={styles.linkCard}>
          <h3 className={styles.cardTitle}>Your Referral Link</h3>
          <p className={styles.cardSubtitle}>Share your unique link and start earning</p>

          <div className={styles.linkInputWrapper}>
            <div className={styles.linkIconWrap}>
              <Copy size={16} />
            </div>
            <input type="text" className={styles.linkInput} value={refLink} readOnly />
            <button className={styles.copyBtn} onClick={copyLink}>
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} 
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className={styles.divider}>or share via</div>

          <div className={styles.socialButtons}>
            <a href={`https://wa.me/?text=${encodeURIComponent("Join me on AdsFinance and start earning money today! " + refLink)}`} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} style={{ textDecoration: 'none' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/3670/3670051.png" width="20" height="20" alt="WhatsApp" />
              WhatsApp
            </a>
            <a href={`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Join AdsFinance!")}`} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} style={{ textDecoration: 'none' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/2111/2111646.png" width="20" height="20" alt="Telegram" />
              Telegram
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}`} target="_blank" rel="noopener noreferrer" className={styles.socialBtn} style={{ textDecoration: 'none' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/145/145802.png" width="20" height="20" alt="Facebook" />
              Facebook
            </a>
            <button onClick={shareLink} className={styles.socialBtn} style={{ border: '1px solid #E2E8F0' }}>
              <Share2 size={20} color="#4A5568" />
              More
            </button>
          </div>
        </section>

        {/* Stats Grid */}
        <section className={styles.statsCard}>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.blue}`}>
              <Users size={18} strokeWidth={2.5} />
            </div>
            <div className={styles.statValue}>{referrals.length}</div>
            <div className={styles.statLabel}>Total Referrals</div>
            <div className={styles.statSub}>All time</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.green}`}>
              <CheckCircle2 size={18} strokeWidth={2.5} />
            </div>
            <div className={styles.statValue}>{activeRefs.length}</div>
            <div className={styles.statLabel}>Verified Referrals</div>
            <div className={styles.statSub}>Successful</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.orange}`}>
              <Wallet size={18} strokeWidth={2.5} />
            </div>
            <div className={`${styles.statValue} ${styles.orange}`}>{fmt(totalEarnings)}</div>
            <div className={styles.statLabel}>Total Earnings</div>
            <div className={styles.statSub}>All time</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.purple}`}>
              <Gift size={18} strokeWidth={2.5} />
            </div>
            <div className={styles.statValue}>{fmt(pendingEarnings)}</div>
            <div className={styles.statLabel}>Pending Earnings</div>
            <div className={styles.statSub}>From {pendingRefs.length} referrals</div>
          </div>
        </section>

        {/* History List */}
        <section>
          <div className={styles.historyHeader}>
            <h3 className={styles.historyTitle}>Recent Referrals</h3>
            <Link href="#" className={styles.viewAll}>View All <ChevronRight size={14} /></Link>
          </div>
          
          {referrals.length === 0 ? (
            <div className={styles.emptyState} style={{ background: 'white', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
              <div className={styles.emptyStateIcon}>
                <Users size={28} />
              </div>
              <div className={styles.emptyStateTitle}>No referrals yet</div>
              <div className={styles.emptyStateDesc}>Share your link above to start earning!</div>
            </div>
          ) : (
            <div className={styles.historyList}>
              {referrals.slice(0, 5).map((r, i) => {
                const isVerified = r.status === "active";
                const refName = r.refereeEmail ? r.refereeEmail.split("@")[0] : "User";
                const initials = refName.substring(0, 2).toUpperCase();
                
                return (
                  <div key={r.id || i} className={styles.historyItem}>
                    <div className={styles.userInitials} style={{ background: isVerified ? '#ECFDF5' : '#FFFBEB', color: isVerified ? '#059669' : '#D97706' }}>
                      {initials}
                    </div>
                    <div className={styles.historyInfo}>
                      <div className={styles.historyName}>{refName}</div>
                      <div className={styles.historyDate}>Joined • {ts(r.createdAt)}</div>
                    </div>
                    <span className={`${styles.statusBadge} ${isVerified ? styles.verified : styles.pending}`}>
                      {isVerified ? 'Verified' : 'Pending'}
                    </span>
                    <div className={styles.historyAmount}>
                      {fmt(r.commission || 0)} <ChevronRight size={14} color="#94A3B8" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Referral Level */}
        <section className={styles.levelCard}>
          <div className={styles.levelIconWrap}>
            <Award size={24} />
          </div>
          <div className={styles.levelInfo}>
            <div className={styles.levelLabel}>Referral Level</div>
            <div className={styles.levelName}>{level}</div>
            <div className={styles.levelDesc}>Refer {Math.max(req - activeRefs.length, 0)} more friends to reach <span style={{ color: '#1765DC', fontWeight: 700 }}>{nextLevel}</span> level</div>
          </div>
          <div className={styles.levelProgressArea}>
            <div className={styles.levelFraction}>{activeRefs.length} / {req}</div>
            <div className={styles.levelBarContainer}>
              <motion.div 
                className={styles.levelBarFill} 
                initial={{ width: 0 }} 
                animate={{ width: `${levelProgress}%` }} 
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
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
        <Link href="/withdrawals" className={styles.navItem}>
          <Wallet className={styles.navIcon} />
          <span className={styles.navLabel}>Withdrawals</span>
        </Link>
        <Link href="/referrals" className={`${styles.navItem} ${styles.active}`}>
          <Users className={styles.navIcon} />
          <span className={styles.navLabel}>Referrals</span>
        </Link>
        <Link href="/profile" className={styles.navItem}>
          <UserIcon className={styles.navIcon} />
          <span className={styles.navLabel}>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
