"use client";

import { NotificationBell } from "@/components/ui/NotificationBell";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import styles from "./styles.module.css";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  getTodayVideos, getAdRewardData, claimAdReward,
  TIER_LIMITS, VideoItem, AdRewardData, CHECKIN_REWARDS
} from "@/lib/adRewards";
import {
  Bell, List, Clock, Calendar, ShieldCheck, ChevronRight,
  Filter, Play, CheckCircle2, Lock, Gift, Home, ClipboardList, Wallet, Users, User as UserIcon
} from "lucide-react";
import Swal from "sweetalert2";

// Import the existing WatchModal
import WatchModalWrapper from "@/components/ui/WatchModalWrapper";

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TasksPage() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [rewardData, setRewardData] = useState<AdRewardData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Tasks");
  
  // Modal state
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      // Calculate time until next midnight
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub1 = onSnapshot(doc(db, "ad_rewards", uid), snap => {
      if (snap.exists()) setRewardData(snap.data() as AdRewardData);
    });
    const unsub2 = onSnapshot(doc(db, "users", uid), snap => {
      if (snap.exists()) setProfile(snap.data());
    });
    return () => { unsub1(); unsub2(); };
  }, [uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setUid(u.uid);
      try {
        const [data, todayVids] = await Promise.all([
          getAdRewardData(u.uid),
          getTodayVideos(),
        ]);
        setRewardData(data);
        if (todayVids.length > 0) setVideos(todayVids);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  const handleClaim = useCallback(async (videoId: string) => {
    if (!uid) return;
    try {
      const result = await claimAdReward(uid, videoId, profile?.nodeTier);
      setActiveVideo(null);
      if (result.success) {
        const fresh = await getAdRewardData(uid);
        setRewardData(fresh);
        setTimeout(() => {
          Swal.fire({
            icon: "success", title: "Task Verified", text: `You earned ₦${result.reward.toLocaleString()}`
          });
        }, 150);
      } else {
        setTimeout(() => Swal.fire({ icon: "info", text: result.message }), 150);
      }
    } catch (err: any) {
      setActiveVideo(null);
      setTimeout(() => Swal.fire({ icon: "error", title: "Failed", text: "Something went wrong." }), 150);
    }
  }, [uid, profile]);

  if (loading) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading tasks...</div>;

  const name = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";
  const avatar = name[0].toUpperCase();
  
  const nodeTier = profile?.nodeTier || "none";
  const limits = TIER_LIMITS[nodeTier] || TIER_LIMITS["none"];
  const maxVideos = limits.maxVideos;
  const watched = rewardData?.watchedToday ?? [];
  const completedCount = watched.length;
  const remainingCount = Math.max(maxVideos - completedCount, 0);
  const limitHit = (rewardData?.dailyEarnings ?? 0) >= limits.dailyCap || completedCount >= maxVideos;
  
  const bonusAvailable = CHECKIN_REWARDS[nodeTier] || 50;
  const allTasksCompleted = completedCount >= maxVideos;

  const filteredVideos = videos.slice(0, maxVideos).filter(v => {
    if (activeTab === "YouTube Videos") return v.category !== "Internal";
    if (activeTab === "Completed") return watched.includes(v.id);
    return true;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image src="/logo.png" alt="AdsFinance Logo" width={32} height={32} className={styles.logoIcon} />
          <span className={styles.logoText}>AdsFinance</span>
        </div>
        <div className={styles.headerRight}>
          {user?.uid && <NotificationBell uid={user.uid} />}
          <Link href="/profile" className={styles.avatar}>{avatar}</Link>
        </div>
      </header>

      <main className={styles.content}>
        
        {/* Page Header */}
        <section className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Tasks</h1>
            <p className={styles.pageSubtitle}>Complete tasks and earn rewards</p>
          </div>
          <div className={styles.earnedBadge}>
            <div className={styles.earnedIcon}>🪙</div>
            <div className={styles.earnedText}>
              <span className={styles.earnedAmount}>+{fmt(rewardData?.dailyEarnings || 0)}</span>
              <span className={styles.earnedLabel}>Earned Today</span>
            </div>
          </div>
        </section>

        {/* Top Stats */}
        <section className={styles.statsCard}>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.green}`}>
              <List size={20} />
            </div>
            <div className={styles.statValue}>{completedCount} / {maxVideos}</div>
            <div className={styles.statLabel}>Completed Today</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.blue}`}>
              <Clock size={20} />
            </div>
            <div className={styles.statValue}>{remainingCount}</div>
            <div className={styles.statLabel}>Remaining</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.orange}`}>
              ⭐
            </div>
            <div className={styles.statValue}>+{fmt(bonusAvailable)}</div>
            <div className={styles.statLabel}>Bonus Available</div>
          </div>
          <div className={styles.statItem}>
            <div className={`${styles.statIconWrap} ${styles.purple}`}>
              <Calendar size={20} />
            </div>
            <div className={styles.statValue}>{timeLeft}</div>
            <div className={styles.statLabel}>Resets In</div>
          </div>
        </section>

        {/* Trust Banner */}
        <section className={styles.trustBanner}>
          <ShieldCheck className={styles.shieldIcon} />
          <div className={styles.trustContent}>
            <div className={styles.trustTitle}>Fair & Transparent</div>
            <div className={styles.trustDesc}>Watch full videos (3 mins) to earn. No skips. No hidden fees.</div>
          </div>
          <Link href="#" className={styles.trustLink} style={{ textDecoration: 'none' }}>
            Learn more <ChevronRight size={16} />
          </Link>
        </section>

        {/* Tabs & Filter */}
        <section className={styles.tabsContainer}>
          <div className={styles.tabsLeft}>
            <div className={`${styles.tab} ${activeTab === 'All Tasks' ? styles.active : ''}`} onClick={() => setActiveTab('All Tasks')}>
              All Tasks
            </div>
            <div className={`${styles.tab} ${activeTab === 'YouTube Videos' ? styles.active : ''}`} onClick={() => setActiveTab('YouTube Videos')}>
              <Play size={14} fill="currentColor" color="#FF0000" /> YouTube Videos
            </div>
            <div className={`${styles.tab} ${activeTab === 'Completed' ? styles.active : ''}`} onClick={() => setActiveTab('Completed')}>
              <CheckCircle2 size={14} color="#059669" /> Completed
            </div>
          </div>
          <div className={styles.filterBtn}>
            <Filter size={14} /> Filter ▾
          </div>
        </section>

        {/* Video List */}
        <section className={styles.videoList}>
          {filteredVideos.map((video, index) => {
            const isWatched = watched.includes(video.id);
            // Lock logic requested by user: lock based on daily cap limit hit.
            // If they haven't watched it, and they hit the cap, it's locked.
            // But we also show a few extra videos (maxVideos + 2) to match mock, which are just permanently locked until tomorrow/upgrade.
            const isLocked = !isWatched && (limitHit || index >= maxVideos);
            
            return (
              <div key={video.id} className={`${styles.videoCard} ${isLocked ? styles.locked : ''}`}>
                <div className={styles.thumbnailWrap}>
                  <Image src={video.thumbnail} alt={video.title} width={320} height={180} className={styles.thumbnailImg}
                    onError={e => { (e.target as any).src = "https://i.ytimg.com/vi/default/mqdefault.jpg"; }} />
                  <div className={styles.timestamp}>03:00</div>
                  {!isLocked && !isWatched && (
                    <Play className={styles.youtubePlay} />
                  )}
                  {isLocked && (
                    <div className={styles.lockIconWrap}>
                      <Lock className={styles.lockIcon} />
                    </div>
                  )}
                </div>
                
                <div className={styles.videoInfo}>
                  <div className={styles.videoHeader}>
                    <div className={styles.videoTitleWrap}>
                      <div className={styles.videoTitle}>{video.title}</div>
                      <div className={styles.videoMeta}>{video.category === "Internal" ? "Internal" : "YouTube"} • 3:00 min</div>
                      <div className={styles.videoDesc}>Complete this task to earn your reward and increase your daily progress.</div>
                    </div>
                    <div className={`${styles.rewardBadge} ${isLocked ? styles.locked : ''}`}>
                      +{fmt(limits.minReward)} {isLocked && <Lock size={12} />}
                    </div>
                  </div>
                  
                  <div className={styles.videoFooter}>
                    <div style={{ flex: 1 }}></div>
                    {isWatched ? (
                      <div className={`${styles.rewardBadge}`} style={{ background: 'transparent' }}>
                        <CheckCircle2 size={16} /> Completed
                      </div>
                    ) : isLocked ? (
                      <div className={styles.lockedText}>
                        {limitHit ? "Daily limit reached. Unlock tomorrow." : "Complete previous tasks to unlock"}
                      </div>
                    ) : (
                      <button className={styles.watchBtn} onClick={() => setActiveVideo(video)}>
                        Watch Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Bonus Banner */}
        <section className={styles.bonusBanner}>
          <div className={styles.bonusIconWrap}>
            <Gift size={24} fill="currentColor" />
          </div>
          <div className={styles.bonusContent}>
            <div className={styles.bonusTitle}>Complete all {maxVideos} tasks</div>
            <div className={styles.bonusDesc}>Complete all tasks today and get an extra {fmt(bonusAvailable)} bonus!</div>
          </div>
          <div className={styles.bonusBadge}>
            +{fmt(bonusAvailable)} Bonus
          </div>
        </section>

      </main>

      {/* Bottom Nav */}
      <nav className={styles.bottomNav}>
        <Link href="/dashboard" className={styles.navItem}>
          <Home className={styles.navIcon} />
          <span className={styles.navLabel}>Dashboard</span>
        </Link>
        <Link href="/tasks" className={`${styles.navItem} ${styles.active}`}>
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
        <Link href="/profile" className={styles.navItem}>
          <UserIcon className={styles.navIcon} />
          <span className={styles.navLabel}>Profile</span>
        </Link>
      </nav>

      {/* Modals */}
      {activeVideo && (
        <WatchModalWrapper
          video={activeVideo}
          alreadyDone={watched.includes(activeVideo.id)}
          onClose={() => setActiveVideo(null)}
          onClaim={handleClaim}
        />
      )}
    </div>
  );
}
