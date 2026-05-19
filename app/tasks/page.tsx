"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getTodayVideos, getAdRewardData, claimAdReward,
  DAILY_AD_LIMIT, MIN_WATCH_SECS, VideoItem, AdRewardData
} from "@/lib/adRewards";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft, FaPlay, FaCircleCheck, FaLock, FaClock, FaShield,
  FaBullseye, FaWallet, FaRotate, FaEye, FaTriangleExclamation
} from "react-icons/fa6";
import Swal from "sweetalert2";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const SWAL_DARK = {
  background: "#020617", color: "#f8fafc",
  customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-500 !text-slate-950 !font-black" }
};

const CATEGORY_COLOR: Record<string, string> = {
  Finance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Technology: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  AI: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  Motivation: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Business: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  Entrepreneurship: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Productivity: "bg-rose-500/15 text-rose-400 border-rose-500/20",
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

  // ── Load YouTube IFrame API once ────────────────────────────────────────────
  useEffect(() => {
    const init = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: video.id,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1, iv_load_policy: 3 },
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
              setCanClaim(true);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tab-switch detection ─────────────────────────────────────────────────────
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
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            <FaArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div>
            <p className="text-white font-bold text-sm leading-tight truncate max-w-[200px] sm:max-w-none">{video.title}</p>
            <p className="text-slate-500 text-xs">{video.channelName}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLOR[video.category] ?? "bg-slate-700 text-slate-400"}`}>
          {video.category}
        </span>
      </div>

      {/* Player */}
      <div className="flex-1 flex flex-col items-center justify-start bg-black overflow-hidden">
        <div className="w-full max-w-3xl aspect-video">
          <div ref={containerRef} className="w-full h-full" />
        </div>

        {/* Tab warning */}
        <AnimatePresence>
          {tabWarning && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold px-4 py-2 rounded-xl mt-3">
              <FaTriangleExclamation className="w-3.5 h-3.5" />
              Timer paused — tab was switched. Return to this tab to continue.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress & Claim */}
      <div className="shrink-0 bg-slate-950 border-t border-white/10 px-4 py-4 space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <FaClock className="w-3 h-3" />
              {canClaim ? "Reward unlocked!" : `Watch ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} more`}
            </span>
            <span className="text-slate-500">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-teal-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        {/* Claim button */}
        <motion.button
          onClick={handleClaim}
          disabled={!canClaim || claiming || alreadyDone}
          animate={canClaim ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 ${
            canClaim && !alreadyDone
              ? "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/25"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}>
          {claiming ? (
            <><div className="w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" /> Processing…</>
          ) : alreadyDone ? (
            <><FaCircleCheck className="w-5 h-5" /> Already Claimed Today</>
          ) : canClaim ? (
            <><FaWallet className="w-5 h-5" /> Claim Reward</>
          ) : (
            <><FaEye className="w-5 h-5" /> Keep Watching to Unlock</>
          )}
        </motion.button>

        <p className="text-center text-xs text-slate-600">
          <FaShield className="inline w-3 h-3 mr-1" />
          Tab switching pauses the timer. Do not refresh the page.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────
function VideoCard({ video, watched, onWatch, disabled }: { video: VideoItem; watched: boolean; onWatch: () => void; disabled: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`relative bg-slate-900 border rounded-[22px] overflow-hidden transition-all ${watched ? "border-teal-500/30" : "border-white/10 hover:border-white/20"}`}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-800 overflow-hidden">
        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover"
          onError={e => { (e.target as any).src = "https://i.ytimg.com/vi/default/mqdefault.jpg"; }} />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        {watched && (
          <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
              <FaCircleCheck className="w-6 h-6 text-slate-950" />
            </div>
          </div>
        )}
        {/* Category badge */}
        <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLOR[video.category] ?? "bg-slate-700 text-slate-400"}`}>
          {video.category}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4">
        <p className="text-white font-bold text-sm leading-snug mb-1 line-clamp-2">{video.title}</p>
        <p className="text-slate-500 text-xs mb-4">{video.channelName}</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Reward</p>
            <p className="text-teal-400 font-black text-sm">₦40 – ₦200</p>
          </div>

          {watched ? (
            <span className="flex items-center gap-1.5 text-xs text-teal-400 font-bold">
              <FaCircleCheck className="w-3.5 h-3.5" /> Earned
            </span>
          ) : (
            <button onClick={onWatch} disabled={disabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
                disabled ? "bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md"
              }`}>
              <FaPlay className="w-3 h-3" /> Watch
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
    <div className="bg-slate-900 border border-white/10 rounded-[22px] overflow-hidden animate-pulse">
      <div className="aspect-video bg-slate-800" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-800 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-800 rounded-lg w-1/2" />
        <div className="h-9 bg-slate-800 rounded-xl mt-4 w-24 ml-auto" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const router = useRouter();

  const [uid,         setUid]         = useState("");
  const [loading,     setLoading]     = useState(true);
  const [rewardData,  setRewardData]  = useState<AdRewardData | null>(null);
  const [videos,      setVideos]      = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUid(u.uid);
      try {
        const [data, todayVids] = await Promise.all([
          getAdRewardData(u.uid),
          Promise.resolve(getTodayVideos()),
        ]);
        setRewardData(data);
        setVideos(todayVids);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [router]);

  // Load YouTube API script once on page mount
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
    const result = await claimAdReward(uid, videoId);

    if (result.success) {
      // Refresh reward data
      const fresh = await getAdRewardData(uid);
      setRewardData(fresh);
      setActiveVideo(null);

      await Swal.fire({
        ...SWAL_DARK,
        icon: "success",
        title: "Congratulations!",
        html: `<p style="color:#94a3b8;font-size:15px">You earned</p>
               <p style="color:#14b8a6;font-size:2.5rem;font-weight:900;margin:8px 0">₦${result.reward.toLocaleString()}</p>
               <p style="color:#64748b;font-size:13px">Added to your wallet instantly.</p>`,
        confirmButtonText: "View Wallet",
        timer: 4000,
        timerProgressBar: true,
      }).then(r => { if (r.isConfirmed) router.push("/dashboard"); });
    } else {
      setActiveVideo(null);
      Swal.fire({ ...SWAL_DARK, icon: "info", title: "Heads up", text: result.message });
    }
  }, [uid, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-10">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          <div className="h-8 bg-slate-800 rounded-xl w-48 animate-pulse" />
          <div className="h-4 bg-slate-800 rounded-xl w-64 animate-pulse" />
          <div className="h-16 bg-slate-900 rounded-2xl animate-pulse mt-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  const daily       = rewardData?.dailyEarnings ?? 0;
  const limitPct    = Math.min((daily / DAILY_AD_LIMIT) * 100, 100);
  const limitHit    = daily >= DAILY_AD_LIMIT;
  const watched     = rewardData?.watchedToday ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 md:pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl px-4 py-3 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4 text-slate-400" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-white tracking-tight">Ad Feed</h1>
          <p className="text-xs text-slate-500">Watch videos · Earn daily rewards</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Today</p>
            <p className="text-teal-400 font-black text-sm">{fmt(daily)}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

        {/* Daily limit bar */}
        <div className="bg-slate-900 border border-white/10 rounded-[20px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaBullseye className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-sm">Daily Earning Progress</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{fmt(daily)} / {fmt(DAILY_AD_LIMIT)}</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${limitHit ? "bg-rose-500" : "bg-teal-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${limitPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          {limitHit ? (
            <p className="text-rose-400 text-xs font-semibold mt-2 flex items-center gap-1.5">
              <FaLock className="w-3 h-3" /> Daily limit reached. Come back tomorrow.
            </p>
          ) : (
            <p className="text-slate-500 text-xs mt-2">
              {fmt(DAILY_AD_LIMIT - daily)} remaining today · Resets midnight
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Watched",    value: `${watched.length}/${videos.length}`,   color: "text-white" },
            { label: "Earned",     value: fmt(daily),                              color: "text-teal-400" },
            { label: "Remaining",  value: fmt(Math.max(DAILY_AD_LIMIT - daily, 0)), color: "text-amber-400" },
          ].map((s, i) => (
            <div key={i} className="bg-slate-900 border border-white/10 rounded-[18px] p-4 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Refresh note */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FaRotate className="w-3 h-3" />
          Videos refresh daily at midnight. Watch all 7 to maximise earnings.
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {videos.map((v, i) => (
            <motion.div key={v.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <VideoCard
                video={v}
                watched={watched.includes(v.id)}
                disabled={limitHit || watched.includes(v.id)}
                onWatch={() => setActiveVideo(v)}
              />
            </motion.div>
          ))}
        </div>

        {/* Watched all */}
        {watched.length === videos.length && (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-[20px] p-6 text-center">
            <FaCircleCheck className="w-8 h-8 text-teal-400 mx-auto mb-2" />
            <p className="font-black text-white text-base">All videos watched!</p>
            <p className="text-slate-400 text-sm mt-1">New videos available tomorrow. Check back at midnight.</p>
          </div>
        )}
      </div>

      {/* Watch Modal */}
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
