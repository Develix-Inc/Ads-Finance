"use client";

import React, { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { listenNotifications, markAllRead, markRead, type Notification } from "@/lib/notifications";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const TYPE_COLOR: Record<string, string> = {
  success:    "text-emerald-500 bg-emerald-50 border-emerald-100",
  error:      "text-rose-500 bg-rose-50 border-rose-100",
  warning:    "text-amber-500 bg-amber-50 border-amber-100",
  payment:    "text-blue-500 bg-blue-50 border-blue-100",
  withdrawal: "text-violet-500 bg-violet-50 border-violet-100",
  task:       "text-primary bg-primary/10 border-primary/20",
  info:       "text-slate-500 bg-slate-50 border-slate-200",
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
        className="relative p-2.5 rounded-xl border bg-white border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-600" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 border border-white shadow-sm"
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
            className="fixed inset-x-4 top-20 sm:absolute sm:inset-auto sm:right-0 sm:mt-2 sm:w-80 max-w-[320px] mx-auto bg-white border border-slate-200 rounded-[20px] shadow-2xl z-[200] overflow-hidden"
          >
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <span className="font-bold text-slate-900 text-sm">Notifications {unread > 0 && <span className="text-primary">({unread})</span>}</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={() => markAllRead(uid)} className="text-xs text-slate-500 hover:text-primary flex items-center gap-1 transition-colors font-medium">
                    <CheckCheck className="w-3 h-3" /> Read all
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 bg-white">
              {preview.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm font-medium">No notifications yet</p>
                </div>
              ) : preview.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(uid, n.id)}
                  className={`px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex shrink-0 mt-0.5 w-2 h-2 rounded-full ${!n.read ? "bg-primary" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold mb-0.5 ${!n.read ? "text-slate-900" : "text-slate-600"}`}>{n.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold tracking-wide">{ts(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 text-center">
              <Link href="/notifications" onClick={() => setOpen(false)}
                className="text-xs text-primary font-bold hover:text-primary/80 transition-colors inline-flex items-center gap-1">
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
