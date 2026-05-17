"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { listenNotifications, markAllRead, markRead, type Notification } from "@/lib/notifications";
import { FaBell, FaCheckDouble, FaArrowLeft, FaCircleInfo, FaCircleCheck, FaTriangleExclamation, FaCircleXmark, FaCreditCard, FaArrowDown, FaBullseye } from "react-icons/fa6";
import { motion } from "framer-motion";

const ICON: Record<string, any> = {
  success: FaCircleCheck, error: FaCircleXmark, warning: FaTriangleExclamation,
  payment: FaCreditCard, withdrawal: FaArrowDown, task: FaBullseye, info: FaCircleInfo,
};
const COLOR: Record<string, string> = {
  success: "text-emerald-400 bg-emerald-500/10", error: "text-rose-400 bg-rose-500/10",
  warning: "text-amber-400 bg-amber-500/10", payment: "text-blue-400 bg-blue-500/10",
  withdrawal: "text-violet-400 bg-violet-500/10", task: "text-teal-400 bg-teal-500/10",
  info: "text-slate-400 bg-slate-500/10",
};
const ts = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) : "";

export default function NotificationsPage() {
  const router = useRouter();
  const [uid, setUid]       = useState("");
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.push("/login"); return; }
      setUid(u.uid);
      setLoading(false);
    });
    return unsub;
  }, [router]);

  useEffect(() => {
    if (!uid) return;
    return listenNotifications(uid, ns => { setNotifs(ns); });
  }, [uid]);

  const unread = notifs.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-10">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markAllRead(uid)}
            className="flex items-center gap-2 text-xs text-teal-400 font-semibold hover:text-teal-300 transition-colors">
            <FaCheckDouble className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-20">
            <FaBell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">No notifications yet</p>
            <p className="text-slate-600 text-sm mt-1">You'll see account updates and alerts here.</p>
          </div>
        ) : notifs.map((n, i) => {
          const Icon  = ICON[n.type] ?? FaCircleInfo;
          const color = COLOR[n.type] ?? COLOR.info;
          return (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => !n.read && markRead(uid, n.id)}
              className={`flex items-start gap-4 p-5 rounded-[18px] border cursor-pointer transition-all ${n.read ? "bg-slate-900 border-white/10" : "bg-slate-900 border-teal-500/20 shadow-lg shadow-teal-500/5"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold leading-tight ${n.read ? "text-slate-300" : "text-white"}`}>{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-teal-400 rounded-full shrink-0 mt-1.5" />}
                </div>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{n.body}</p>
                <p className="text-slate-600 text-[11px] font-mono mt-2">{ts(n.createdAt)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
