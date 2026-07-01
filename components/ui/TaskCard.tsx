"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface TaskCardProps {
  taskId: string;
  sponsor: string;
  payout: number;
  tags: string[];
  thumbnailUrl?: string;
  onComplete?: (taskId: string) => void;
}

export function TaskCard({ taskId, sponsor, payout, tags, thumbnailUrl, onComplete }: TaskCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCooldown, setIsCooldown] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Visibility API for auto-pause when tab is minimized or card is out of view
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPlaying(false);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting && isPlaying) {
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer.disconnect();
    };
  }, [isPlaying]);

  // Simulate Timer Progress
  useEffect(() => {
    if (isPlaying && !isCooldown) {
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            handleCompletion();
            return 0;
          }
          return prev + 5; // increment progress
        });
      }, 500);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isCooldown]);

  const handleCompletion = () => {
    onComplete?.(taskId);
    setCompletedTasksCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setIsCooldown(true);
        setTimeout(() => {
          setIsCooldown(false);
          setCompletedTasksCount(0);
        }, 10000); // 10 second cooldown simulation
      }
      return newCount;
    });
  };

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative w-full max-w-sm rounded-[24px] bg-card text-card-foreground shadow-xl glass-card overflow-hidden transition-all duration-300 hover:shadow-primary/20"
    >
      {/* Top Media Area */}
      <div className="relative h-56 w-full bg-slate-800 overflow-hidden rounded-t-[24px]">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt={sponsor} width={400} height={224} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <span className="text-slate-500 font-mono text-xs opacity-50">MEDIA_SRC_NOT_FOUND</span>
          </div>
        )}
        
        {/* Floating Play Button */}
        {!isCooldown && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-black/40 backdrop-blur-md p-4 rounded-full border border-white/10 hover:bg-black/60 transition-colors"
            >
              {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
            </button>
          </div>
        )}

        {/* Progress Bar Overlay */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg leading-tight tracking-tight">{sponsor}</h3>
            <p className="text-sm text-muted-foreground mt-1 font-sans">Attention Verification</p>
          </div>
          <div className="bg-secondary/20 px-3 py-1 rounded-full border border-secondary/30">
            <span className="text-secondary font-mono font-bold tracking-tight">${payout.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] uppercase tracking-wider bg-white/5 border-white/10 text-slate-300">
              {tag.replace("_", " ")}
            </Badge>
          ))}
        </div>

        {/* Action Area */}
        <div className="mt-2">
          <AnimatePresence mode="wait">
            {isCooldown ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full bg-destructive/10 text-destructive border border-destructive/20 rounded-full py-3 flex justify-center items-center gap-2 font-medium"
              >
                <AlertCircle className="w-4 h-4" />
                Anti-Bot Cooldown
              </motion.div>
            ) : (
              <Button 
                className="w-full rounded-full py-6 text-md font-semibold tracking-wide bg-white text-black hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "Tracking Engagement..." : "Execute Task"}
              </Button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
