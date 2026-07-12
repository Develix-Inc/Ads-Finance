"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  getTodayVideos, getAdRewardData, claimAdReward,
  TIER_LIMITS, MIN_WATCH_SECS, VideoItem, AdRewardData
} from "@/lib/adRewards";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, CheckCircle2, Lock, Clock, ShieldCheck,
  Target, Wallet, RefreshCw, Eye, AlertTriangle, ShieldAlert
} from "lucide-react";
import Swal from "sweetalert2";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const SWAL_LIGHT = {
  background: "#ffffff", color: "#0f172a",
  customClass: { popup: "!rounded-2xl !border !border-slate-200 !shadow-xl", confirmButton: "!rounded-xl !bg-primary !text-primary-foreground !font-bold px-6 py-2" }
};

const CATEGORY_COLOR: Record<string, string> = {
  Finance: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Technology: "bg-blue-50 text-blue-600 border-blue-200",
  AI: "bg-violet-50 text-violet-600 border-violet-200",
  Motivation: "bg-amber-50 text-amber-600 border-amber-200",
  Business: "bg-teal-50 text-teal-600 border-teal-200",
  Entrepreneurship: "bg-orange-50 text-orange-600 border-orange-200",
  Productivity: "bg-rose-50 text-rose-600 border-rose-200",
};

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0 });

// ─── Watch Modal Component ────────────────────────────────────────────────────
interface WatchModalProps {
  video:       VideoItem;
  onClose:     () => void;
  onClaim:     (videoId: string) => Promise<void>;
  alreadyDone: boolean;
}

function WatchModal({ video, onClose, onClaim, alreadyDone }: WatchModalProps) {
  const playerRef       = useRef<any>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const hiddenRef       = useRef(false);
  const claimedRef      = useRef(false);

  const [ytReady,     setYtReady]     = useState(false);
  const [watchSecs,   setWatchSecs]   = useState(0);
  const [canClaim,    setCanClaim]    = useState(false);
  const [claiming,    setClaiming]    = useState(false);
  const [tabWarning,  setTabWarning]  = useState(false);
  const [playerState, setPlayerState] = useState<"idle"|"playing"|"paused"|"ended">("idle");

  const MIN = MIN_WATCH_SECS;

  useEffect(() => {
    const init = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: video.id,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, controls: 0, disablekb: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              setPlayerState("playing");
              startTimer();
            } else if (e.data === window.YT.PlayerState.PAUSED) {
              setPlayerState("paused");
              stopTimer();
            } else if (e.data === window.YT.PlayerState.ENDED) {
              setPlayerState("ended");
              stopTimer();
            }
          },
        },
      });
      setYtReady(true);
    };

    if (window.YT?.Player) {
      init();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); init(); };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const s = document.createElement("script");
        s.src   = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }
    return () => { stopTimer(); playerRef.current?.destroy?.(); };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenRef.current = true;
        stopTimer();
        if (playerRef.current?.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) {
          setTabWarning(true);
        }
      } else {
        hiddenRef.current = false;
        setTabWarning(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function startTimer() {
    if (timerRef.current || hiddenRef.current) return;
    timerRef.current = setInterval(() => {
      if (hiddenRef.current) return;
      setWatchSecs(s => {
        const next = s + 1;
        if (next >= MIN) setCanClaim(true);
        return next;
      });
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function handleClaim() {
    if (claimedRef.current || claiming) return;
    claimedRef.current = true;
    setClaiming(true);
    stopTimer();
    playerRef.current?.pauseVideo?.();
    await onClaim(video.id);
    setClaiming(false);
  }

  const progress = Math.min((watchSecs / MIN) * 100, 100);
  const remaining = Math.max(MIN - watchSecs, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div>
            <p className="text-slate-900 font-bold text-sm leading-tight truncate max-w-[200px] sm:max-w-none">{video.title}</p>
            <p className="text-slate-500 text-xs font-medium">{video.channelName}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[video.category] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
          {video.category}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start bg-slate-900 overflow-hidden">
        <div className="w-full max-w-3xl aspect-video bg-black">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        <AnimatePresence>
          {tabWarning && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-3 rounded-xl mt-4 shadow-lg">
              <AlertTriangle className="w-4 h-4" />
              Security Check: Timer paused because tab was switched. Return here to continue.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-4 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-600 font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {canClaim ? "Reward Unlocked!" : `Watch ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} more to unlock`}
            </span>
            <span className="text-slate-900 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        <motion.button
          onClick={handleClaim}
          disabled={!canClaim || claiming || alreadyDone}
          animate={canClaim ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
            canClaim && !alreadyDone
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}>
          {claiming ? (
            <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Processing…</>
          ) : alreadyDone ? (
            <><CheckCircle2 className="w-4 h-4" /> Already Claimed Today</>
          ) : canClaim ? (
            <><Wallet className="w-4 h-4" /> Claim Reward</>
          ) : (
            <><Eye className="w-4 h-4" /> Keep Watching to Unlock</>
          )}
        </motion.button>

        <p className="text-center text-xs text-slate-500 font-medium">
          <ShieldCheck className="inline w-3.5 h-3.5 mr-1 text-emerald-500" />
          Anti-Fraud Active: Tab switching automatically pauses verification.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ video, watched, onWatch, disabled, limits }: { video: VideoItem; watched: boolean; onWatch: () => void; disabled: boolean; limits: any }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white border rounded-2xl overflow-hidden transition-all shadow-sm ${watched ? "border-primary/30" : "border-slate-200 hover:border-slate-300 hover:shadow-md"}`}>
      
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        <Image src={video.thumbnail} alt={video.title} width={640} height={360} className="w-full h-full object-cover"
          onError={e => { (e.target as any).src = "https://i.ytimg.com/vi/default/mqdefault.jpg"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
        
        {watched && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
        )}
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white ${CATEGORY_COLOR[video.category] ?? "text-slate-500 border-slate-200"}`}>
          {video.category}
        </span>
      </div>

      <div className="p-4">
        <p className="text-slate-900 font-bold text-sm leading-snug mb-1 line-clamp-2">{video.title}</p>
        <p className="text-slate-500 font-medium text-xs mb-4">{video.channelName}</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reward</p>
            <p className="text-slate-900 font-black text-sm">₦{limits?.minReward} – ₦{limits?.maxReward}</p>
          </div>

          {watched ? (
            <span className="flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/10 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" /> Earned
            </span>
          ) : (
            <button onClick={onWatch} disabled={disabled}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                disabled ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20"
              }`}>
              <Play className="w-3.5 h-3.5" /> Watch Task
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse shadow-sm">
      <div className="aspect-video bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
        <div className="h-9 bg-slate-100 rounded-xl mt-4 w-28 ml-auto" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const router = useRouter();

  const [uid,         setUid]         = useState("");
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(false);
  const [rewardData,  setRewardData]  = useState<AdRewardData | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [videos,      setVideos]      = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "ad_rewards", uid), snap => {
      if (snap.exists()) {
        setRewardData(snap.data() as AdRewardData);
      }
    }, err => console.error("ad_rewards snapshot error:", err));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, "users", uid), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setWalletBalance(data.walletBalance ?? 0);
      }
    }, err => console.error("users snapshot error:", err));
  }, [uid]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUid(u.uid);
      try {
        const [data, todayVids] = await Promise.all([
          getAdRewardData(u.uid),
          getTodayVideos(),
        ]);
        setRewardData(data);
        if (todayVids.length > 0) {
          setVideos(todayVids);
        } else {
          setLoadError(true);
        }
      } catch (e: any) {
        console.error("Tasks page load error:", e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src   = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  }, []);

  const handleClaim = useCallback(async (videoId: string) => {
    if (!uid) return;
    try {
      const result = await claimAdReward(uid, videoId, profile?.nodeTier);

      if (result.success) {
        const fresh = await getAdRewardData(uid);
        setRewardData(fresh);
        setActiveVideo(null);

        setTimeout(() => {
          Swal.fire({
            ...SWAL_LIGHT,
            icon: "success",
            title: "Task Verified",
            html: `
              <div style="font-family: inherit; text-align: center;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 8px;">You successfully completed the verification task and earned</p>
                <p style="color: #0f172a; font-size: 2.25rem; font-weight: 900; margin: 12px 0;">₦${result.reward.toLocaleString()}</p>
                <p style="color: #94a3b8; font-size: 12px;">Funds have been credited to your dashboard wallet.</p>
              </div>
            `,
            confirmButtonText: "Return to Dashboard",
            timer: 5000,
            timerProgressBar: true,
          }).then(r => {
            if (r.isConfirmed) router.push("/dashboard");
          });
        }, 150);
      } else {
        setActiveVideo(null);
        setTimeout(() => {
          Swal.fire({
            ...SWAL_LIGHT,
            icon: "info",
            title: "Heads up",
            text: result.message,
          });
        }, 150);
      }
    } catch (err: any) {
      console.error("Error claiming reward:", err);
      setActiveVideo(null);
      setTimeout(() => {
        Swal.fire({
          ...SWAL_LIGHT,
          icon: "error",
          title: "Verification Failed",
          text: "Something went wrong while processing your task. Please try again.",
        });
      }, 150);
    }
  }, [uid, router, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-slate-900 pb-10">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded-xl w-64 animate-pulse" />
          <div className="h-20 bg-white border border-slate-200 shadow-sm rounded-2xl animate-pulse mt-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const nodeTier    = profile?.nodeTier || "Starter Plan";
  const limits      = TIER_LIMITS[nodeTier] || TIER_LIMITS["Starter Plan"];
  const dailyCap    = limits.dailyCap;
  
  const daily       = rewardData?.dailyEarnings ?? 0;
  const limitPct    = Math.min((daily / dailyCap) * 100, 100);
  const limitHit    = daily >= dailyCap;
  const watched     = rewardData?.watchedToday ?? [];

  return (
    <div className="min-h-screen bg-background text-slate-900 pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Task Feed</h1>
            <p className="text-xs text-slate-500 font-medium">Verified Ads & Engagement</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2 shadow-sm">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider leading-none">Today</p>
            <p className="text-primary font-black text-sm mt-0.5">{fmt(daily)}</p>
          </div>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider leading-none">Wallet</p>
            <p className="text-slate-900 font-black text-sm mt-0.5">{fmt(walletBalance)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">

        {profile?.accountStatus === 'suspended' ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="font-black text-rose-900 text-lg">Account Suspended</p>
            <p className="text-rose-700 text-sm mt-2 font-medium">Your account has been suspended by the system due to policy violations. You cannot earn rewards.</p>
          </div>
        ) : profile?.nodeStatus !== 'active' ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Lock className="w-32 h-32" />
            </div>
            <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3 relative z-10" />
            <p className="font-black text-slate-900 text-lg relative z-10">Premium Plan Required</p>
            <p className="text-slate-500 text-sm mt-2 font-medium relative z-10">You need an active membership plan to access verified tasks and earn rewards.</p>
            <Link href="/upgrade" className="inline-block mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-3 rounded-xl transition-colors text-sm shadow-md relative z-10">
              Upgrade Account
            </Link>
          </div>
        ) : (
          <>
        {/* Daily limit bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-bold text-slate-900">Daily Earning Progress</span>
            </div>
            <span className="text-sm text-slate-500 font-bold">{fmt(daily)} / {fmt(dailyCap)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className={`h-full rounded-full ${limitHit ? "bg-rose-500" : "bg-primary"}`}
              initial={{ width: 0 }}
              animate={{ width: `${limitPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {limitHit ? (
            <p className="text-rose-600 text-xs font-bold mt-3 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Daily limit reached. New tasks unlock tomorrow.
            </p>
          ) : (
            <p className="text-slate-500 font-medium text-xs mt-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              {fmt(dailyCap - daily)} remaining today · Resets at midnight
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Watched",    value: `${watched.length}/${limits.maxVideos}`,   color: "text-slate-900" },
            { label: "Earned",     value: fmt(daily),                              color: "text-primary" },
            { label: "Remaining",  value: fmt(Math.max(dailyCap - daily, 0)), color: "text-amber-500" },
          ].map((s, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Refresh note */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-xl">
          <RefreshCw className="w-4 h-4" />
          Verified tasks refresh daily. Complete all {limits.maxVideos} available tasks to maximize your earning potential.
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {videos.slice(0, limits.maxVideos).map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <VideoCard
                video={v}
                watched={watched.includes(v.id)}
                disabled={limitHit || watched.includes(v.id)}
                onWatch={() => setActiveVideo(v)}
                limits={limits}
              />
            </motion.div>
          ))}
        </div>

        {/* Watched all */}
        {videos.length > 0 && watched.length >= limits.maxVideos && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-black text-emerald-900 text-lg">All Tasks Completed!</p>
            <p className="text-emerald-700 font-medium text-sm mt-1">Excellent work. New verified tasks will be available tomorrow.</p>
          </div>
        )}

        {/* Error loading videos */}
        {loadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center shadow-sm">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="font-black text-rose-900 text-lg">Unable to load tasks</p>
            <p className="text-rose-700 font-medium text-sm mt-1">Please try again later or contact support if the issue persists.</p>
          </div>
        )}
        </>
        )}
      </div>

      <AnimatePresence>
        {activeVideo && (
          <WatchModal
            video={activeVideo}
            alreadyDone={(rewardData?.watchedToday ?? []).includes(activeVideo.id)}
            onClose={() => setActiveVideo(null)}
            onClaim={handleClaim}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
