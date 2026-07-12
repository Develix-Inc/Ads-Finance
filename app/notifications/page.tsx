"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { listenNotifications, markAllRead, markRead, deleteNotification, type Notification } from "@/lib/notifications";
import { Bell, CheckCheck, ArrowLeft, Info, CheckCircle2, AlertTriangle, XCircle, CreditCard, ArrowDown, Target, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const ICON: Record<string, any> = {
  success: CheckCircle2, error: XCircle, warning: AlertTriangle,
  payment: CreditCard, withdrawal: ArrowDown, task: Target, info: Info,
};

const COLOR: Record<string, string> = {
  success: "text-emerald-500 bg-emerald-50", 
  error: "text-rose-500 bg-rose-50",
  warning: "text-amber-500 bg-amber-50", 
  payment: "text-blue-500 bg-blue-50",
  withdrawal: "text-violet-500 bg-violet-50", 
  task: "text-primary bg-primary/10",
  info: "text-slate-500 bg-slate-50",
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
    <div className="min-h-screen bg-background text-slate-900 pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4 shadow-sm">
        <Link href="/dashboard" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-500 font-medium">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={() => markAllRead(uid)}
            className="flex items-center gap-2 text-xs text-primary font-bold hover:text-primary/80 transition-colors">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-900 font-bold">No notifications yet</p>
            <p className="text-slate-500 text-sm mt-1 font-medium">You'll see account updates and alerts here.</p>
          </div>
        ) : notifs.map((n, i) => {
          const Icon  = ICON[n.type] ?? Info;
          const color = COLOR[n.type] ?? COLOR.info;
          return (
            <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className={`flex items-start gap-4 p-5 rounded-[18px] border relative group transition-all ${n.read ? "bg-white border-slate-200 shadow-sm" : "bg-primary/5 border-primary/20 shadow-md shadow-primary/5"}`}
            >
              <div onClick={() => !n.read && markRead(uid, n.id)} className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-bold leading-tight ${n.read ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5 shadow-sm" />}
                  </div>
                  <p className="text-slate-500 text-xs mt-1 leading-relaxed font-medium">{n.body}</p>
                  <p className="text-slate-400 text-[11px] font-semibold mt-2">{ts(n.createdAt)}</p>
                </div>
              </div>

              {/* Clear single notification button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(uid, n.id);
                }}
                title="Delete notification"
                className="p-2 rounded-lg bg-white/0 hover:bg-rose-50 hover:text-rose-500 border border-transparent hover:border-rose-100 transition-all text-slate-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 self-center shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
