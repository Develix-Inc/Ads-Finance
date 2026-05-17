"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet } from "lucide-react";
import { TaskCard } from "@/components/ui/TaskCard";
import { WithdrawalInterlock } from "@/components/ui/WithdrawalInterlock";
import { Button } from "@/components/ui/button";

const MOCK_TASKS = [
  { task_id: "af_1", sponsor: "Global Tech Brand", payout: 0.40, tags: ["High_Yield", "Video_Ad"] },
  { task_id: "af_2", sponsor: "FinTech Startup", payout: 0.25, tags: ["App_Review", "New_Partner"] },
  { task_id: "af_3", sponsor: "Crypto Exchange", payout: 0.80, tags: ["KYC_Required", "High_Yield"] },
  { task_id: "af_4", sponsor: "Automotive Co.", payout: 0.15, tags: ["Quick_Task"] },
  { task_id: "af_5", sponsor: "Luxury Retailer", payout: 0.50, tags: ["Premium_Node_Only"] },
  { task_id: "af_6", sponsor: "Streaming Service", payout: 0.30, tags: ["Video_Ad", "Trending"] },
];

export default function TaskFeed() {
  const [balance, setBalance] = useState(14.50);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  
  // SSE Integration for real-time balance ticks
  useEffect(() => {
    const eventSource = new EventSource("/api/balance-stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "tick" && typeof data.amount === "number") {
          setBalance((prev) => prev + data.amount);
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleTaskComplete = (taskId: string) => {
    const task = tasks.find((t) => t.task_id === taskId);
    if (task) {
      setBalance((prev) => prev + task.payout);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        
        {/* Live Balance Widget */}
        <div className="flex items-center gap-4 bg-slate-800/50 rounded-full pl-4 pr-1 py-1 border border-white/5 shadow-inner shadow-black/20">
          <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
            <Wallet className="w-4 h-4 text-primary" />
            <span>Yield:</span>
            <span className="text-white font-bold text-lg tracking-tight min-w-[80px]">
              ${balance.toFixed(2)}
            </span>
          </div>
          <WithdrawalInterlock />
        </div>
      </header>

      {/* Task Feed */}
      <div className="max-w-7xl mx-auto px-6 pt-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Available Tasks</h1>
          <p className="text-slate-400 font-mono text-sm">
            Active License: <span className="text-secondary font-bold">Node Alpha</span> • Multiplier: <span className="text-primary font-bold">4.0x</span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center sm:justify-items-start">
          {tasks.map((task) => (
            <TaskCard 
              key={task.task_id}
              taskId={task.task_id}
              sponsor={task.sponsor}
              payout={task.payout}
              tags={task.tags}
              thumbnailUrl={`https://picsum.photos/seed/${task.task_id}/400/300`}
              onComplete={handleTaskComplete}
            />
          ))}
        </div>
        
        {/* Infinite Scroll trigger area (mocked) */}
        <div className="mt-20 flex justify-center">
          <div className="flex items-center gap-3 text-slate-500 font-mono text-sm animate-pulse">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Hydrating additional yield sources...</span>
          </div>
        </div>
      </div>
    </main>
  );
}
