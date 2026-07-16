"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Wallet, Eye, AlertTriangle, ShieldCheck } from "lucide-react";
import { VideoItem, MIN_WATCH_SECS } from "@/lib/adRewards";

const CATEGORY_COLOR: Record<string, string> = {
  Finance: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Technology: "bg-blue-50 text-blue-600 border-blue-200",
  AI: "bg-violet-50 text-violet-600 border-violet-200",
  Motivation: "bg-amber-50 text-amber-600 border-amber-200",
  Business: "bg-teal-50 text-teal-600 border-teal-200",
  Entrepreneurship: "bg-orange-50 text-orange-600 border-orange-200",
  Productivity: "bg-rose-50 text-rose-600 border-rose-200",
};

interface WatchModalProps {
  video:       VideoItem;
  onClose:     () => void;
  onClaim:     (videoId: string) => Promise<void>;
  alreadyDone: boolean;
}

export default function WatchModalWrapper({ video, onClose, onClaim, alreadyDone }: WatchModalProps) {
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
      playerRef.current = new (window as any).YT.Player(containerRef.current, {
        videoId: video.id,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1, iv_load_policy: 3, controls: 0, disablekb: 1 },
        events: {
          onStateChange: (e: any) => {
            if (e.data === (window as any).YT.PlayerState.PLAYING) {
              setPlayerState("playing");
              startTimer();
            } else if (e.data === (window as any).YT.PlayerState.PAUSED) {
              setPlayerState("paused");
              stopTimer();
            } else if (e.data === (window as any).YT.PlayerState.ENDED) {
              setPlayerState("ended");
              stopTimer();
            }
          },
        },
      });
      setYtReady(true);
    };

    if ((window as any).YT?.Player) {
      init();
    } else {
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => { prev?.(); init(); };
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
        if (playerRef.current?.getPlayerState?.() === (window as any).YT?.PlayerState?.PLAYING) {
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
            <motion.div className="h-full bg-blue-600 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        <motion.button
          onClick={handleClaim}
          disabled={!canClaim || claiming || alreadyDone}
          animate={canClaim ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
            canClaim && !alreadyDone
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25"
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
