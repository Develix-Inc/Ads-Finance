"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaBell, FaCheckDouble, FaXmark } from "react-icons/fa6";
import { listenNotifications, markAllRead, markRead, type Notification } from "@/lib/notifications";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TYPE_COLOR: Record<string, string> = {
  success:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  error:      "text-rose-400 bg-rose-500/10 border-rose-500/20",
  warning:    "text-amber-400 bg-amber-500/10 border-amber-500/20",
  payment:    "text-blue-400 bg-blue-500/10 border-blue-500/20",
  withdrawal: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  task:       "text-teal-400 bg-teal-500/10 border-teal-500/20",
  info:       "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

const ts = (t: any) => {
  if (!t?.seconds) return "";
  const d = new Date(t.seconds * 1000);
  return d.toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

interface Props { uid: string }

export function NotificationBell({ uid }: Props) {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen]     = useState(false);
  const ref                  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = listenNotifications(uid, setNotifs);
    return unsub;
  }, [uid]);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread  = notifs.filter(n => !n.read).length;
  const preview = notifs.slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2.5 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <FaBell className="w-4 h-4 text-slate-300" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 border border-slate-950"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-slate-900 border border-white/10 rounded-[20px] shadow-2xl z-[200] overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <span className="font-bold text-white text-sm">Notifications {unread > 0 && <span className="text-teal-400">({unread})</span>}</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={() => markAllRead(uid)} className="text-xs text-slate-400 hover:text-teal-400 flex items-center gap-1 transition-colors font-medium">
                    <FaCheckDouble className="w-3 h-3" /> Read all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-white transition-colors">
                  <FaXmark className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {preview.length === 0 ? (
                <div className="py-10 text-center">
                  <FaBell className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              ) : preview.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(uid, n.id)}
                  className={`px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors ${!n.read ? "bg-white/3" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex shrink-0 mt-0.5 w-2 h-2 rounded-full ${!n.read ? "bg-teal-400" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold mb-0.5 ${!n.read ? "text-white" : "text-slate-300"}`}>{n.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-600 mt-1 font-mono">{ts(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="border-t border-white/10 px-5 py-3">
              <Link href="/notifications" onClick={() => setOpen(false)}
                className="text-xs text-teal-400 font-semibold hover:text-teal-300 transition-colors">
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
