"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import {
  adminVerifyPayment, adminRejectPayment, adminProcessWithdrawal,
  adminRejectWithdrawal, adminCreditUser, adminDebitUser,
  upsertUserProfile, getUserProfile, adminSetUserStatus, adminBroadcast,
} from "@/lib/admin";
import { motion, AnimatePresence } from "framer-motion";
import { SupportTab } from "@/components/admin/SupportTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { LogsTab } from "@/components/admin/LogsTab";
import {
  Users, BadgeDollarSign, ArrowDown, LayoutDashboard,
  CheckCircle2, XCircle, Clock, Eye,
  LogOut, ShieldHalf, Megaphone, X, TrendingUp, Headset,
  Settings
} from "lucide-react";
import Swal from "sweetalert2";

const ADMIN_EMAILS = ["info.vendrainc@gmail.com", "admin@adsfinance.com"];

const SWAL = {
  background: "#ffffff", color: "#0f172a",
  confirmButtonColor: "#0f172a",
  customClass: { popup: "!rounded-2xl !border !border-slate-200 !shadow-xl", confirmButton: "!rounded-xl px-6 py-2", cancelButton: "!rounded-xl px-6 py-2" }
};

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts  = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString() : "—";

type Tab = "overview" | "users" | "payments" | "withdrawals" | "support" | "settings" | "logs";

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin]             = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<Tab>("overview");
  const [users, setUsers]             = useState<any[]>([]);
  const [payments, setPayments]       = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editBal, setEditBal]         = useState("");
  const unsubRefs                     = useRef<(() => void)[]>([]);

  function startListeners() {
    const u1 = onSnapshot(collection(db, "users"), snap => {
      const sorted = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setUsers(sorted);
    }, err => console.error("users snapshot:", err));

    const u2 = onSnapshot(collection(db, "payments"), snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));
      setPayments(sorted);
    }, err => console.error("payments snapshot:", err));

    const u3 = onSnapshot(collection(db, "withdrawals"), snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.requestedAt?.seconds ?? 0) - (a.requestedAt?.seconds ?? 0));
      setWithdrawals(sorted);
    }, err => console.error("withdrawals snapshot:", err));

    unsubRefs.current = [u1, u2, u3];
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/dashboard"); return; }
      const email = (u.email ?? "").toLowerCase();
      const isEmailAdmin = ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email);
      if (!isEmailAdmin) {
        const profile = await getUserProfile(u.uid);
        if (!profile?.isAdmin) { router.push("/dashboard"); return; }
      }
      setAdmin(u);
      startListeners();
      setLoading(false);
    });
    return () => {
      unsub();
      unsubRefs.current.forEach(fn => fn());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function verifyPayment(p: any) {
    await adminVerifyPayment(p.id, p.uid, p.nodeTier, admin.email);
    Swal.fire({ ...SWAL, icon: "success", title: "Plan Activated", timer: 1500, showConfirmButton: false });
  }

  async function rejectPayment(p: any) {
    const { value: note } = await Swal.fire({ ...SWAL, title: "Rejection Reason", input: "textarea", inputPlaceholder: "Enter reason…", showCancelButton: true });
    if (note !== undefined) await adminRejectPayment(p.id, p.uid, note, admin.email);
  }

  async function processWithdrawal(w: any) {
    await adminProcessWithdrawal(w.id, admin.email);
    Swal.fire({ ...SWAL, icon: "success", title: "Marked Processed", timer: 1200, showConfirmButton: false });
  }

  async function rejectWithdrawal(w: any) {
    const { value: note } = await Swal.fire({ ...SWAL, title: "Rejection Reason", input: "textarea", inputPlaceholder: "Enter reason…", showCancelButton: true });
    if (note !== undefined) {
      await adminRejectWithdrawal(w.id, admin.email, note ?? "");
      Swal.fire({ ...SWAL, icon: "info", title: "Rejected & Refunded", timer: 1200, showConfirmButton: false });
    }
  }

  async function creditUser(uid: string, value: string) {
    if (!value || isNaN(Number(value))) return;
    const { value: reason, isConfirmed } = await Swal.fire({
      ...SWAL,
      title: "Confirm Credit",
      text: `Credit ₦${value} to user? Enter a reason:`,
      input: "text",
      inputPlaceholder: "e.g., Bonus reward for activity",
      showCancelButton: true
    });
    if (isConfirmed) {
      await adminCreditUser(uid, parseFloat(value), reason || "System credit", admin.email);
      setEditBal("");
      Swal.fire({ ...SWAL, icon: "success", title: "Credited", timer: 1200, showConfirmButton: false });
    }
  }

  async function debitUser(uid: string, value: string) {
    if (!value || isNaN(Number(value))) return;
    const { isConfirmed } = await Swal.fire({ ...SWAL, title: "Confirm Debit", text: `Debit ₦${value} from user?`, showCancelButton: true });
    if (isConfirmed) {
      await adminDebitUser(uid, parseFloat(value), "System debit", admin.email);
      setEditBal("");
      Swal.fire({ ...SWAL, icon: "success", title: "Debited", timer: 1200, showConfirmButton: false });
    }
  }

  async function setStatus(uid: string, status: "active" | "suspended") {
    let reason = "";
    if (status === "suspended") {
      const { value, isConfirmed } = await Swal.fire({
        ...SWAL,
        title: "Suspend Account",
        text: "Select a reason for suspension:",
        input: "select",
        inputOptions: {
          "Your account is under investigation for bot task activity. Please check back after 24hrs.": "Bot Investigation (24hrs)",
          "Your account is temporarily suspended due to suspicious activity.": "Suspicious Activity",
          "Violation of platform Terms of Service.": "TOS Violation",
          "custom": "Type custom reason..."
        },
        showCancelButton: true
      });
      if (!isConfirmed) return;
      if (value === "custom") {
        const { value: textValue, isConfirmed: textConfirmed } = await Swal.fire({
          ...SWAL,
          title: "Custom Reason",
          input: "text",
          inputPlaceholder: "Enter suspension reason...",
          showCancelButton: true
        });
        if (!textConfirmed) return;
        reason = textValue;
      } else {
        reason = value;
      }
    }
    await adminSetUserStatus(uid, status, admin.email, reason);
    setSelectedUser(null);
    Swal.fire({ ...SWAL, icon: "success", title: `Account ${status}`, timer: 1200, showConfirmButton: false });
  }

  async function broadcast() {
    const { value: msg } = await Swal.fire({
      ...SWAL, title: "Broadcast Message", html: `
        <input id="bc-title" placeholder="Title" class="swal2-input !rounded-xl" />
        <textarea id="bc-body" placeholder="Message body…" class="swal2-textarea !rounded-xl"></textarea>
      `, showCancelButton: true,
      preConfirm: () => {
        const title = (document.getElementById("bc-title") as HTMLInputElement)?.value.trim();
        const body  = (document.getElementById("bc-body") as HTMLTextAreaElement)?.value.trim();
        if (!title || !body) { Swal.showValidationMessage("Both fields required"); return false; }
        return { title, body };
      }
    });
    if (msg) {
      await adminBroadcast(msg.title, msg.body, "info");
      Swal.fire({ ...SWAL, icon: "success", title: "Broadcast Sent!", timer: 1200, showConfirmButton: false });
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-xs font-mono">Loading admin panel…</p>
    </div>
  );

  const pendingPay = payments.filter(p => p.status === "pending").length;
  const pendingWit = withdrawals.filter(w => w.status === "pending").length;
  const totalBal   = users.reduce((s, u) => s + (u.walletBalance ?? 0), 0);
  const activeNodes = users.filter(u => u.nodeStatus === "active").length;

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview",    label: "Overview",    icon: LayoutDashboard },
    { id: "users",       label: "Users",       icon: Users,             badge: users.length },
    { id: "payments",    label: "Payments",    icon: BadgeDollarSign, badge: pendingPay },
    { id: "withdrawals", label: "Withdrawals", icon: ArrowDown,         badge: pendingWit },
    { id: "support",     label: "Support",     icon: Headset },
    { id: "settings",    label: "Settings",    icon: Settings },
    { id: "logs",        label: "Logs",        icon: ShieldHalf },
  ];

  return (
    <div className="min-h-screen bg-background text-slate-900 pb-10">
      {/* header */}
      <header className="border-b border-slate-200 px-6 py-4 flex items-center justify-between bg-white/80 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" onError={e => { (e.target as any).style.display = "none"; }} />
          <div>
            <p className="font-black text-slate-900 text-base leading-none">AdsFinance</p>
            <p className="text-[10px] text-primary font-bold tracking-widest uppercase mt-0.5">Admin Control Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-bold">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live
          </div>
          <button onClick={broadcast}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-bold">
            <Megaphone className="w-3.5 h-3.5" /> Broadcast
          </button>
          <span className="text-xs font-medium text-slate-500 hidden sm:block">{admin?.email}</span>
          <button onClick={() => { auth.signOut(); router.push("/"); }}
            className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* tabs */}
      <div className="border-b border-slate-200 bg-white px-6">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${tab === t.id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-900"}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {(t.badge ?? 0) > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users",          value: users.length,  color: "text-slate-900" },
              { label: "Active Plans",          value: activeNodes,   color: "text-primary" },
              { label: "Pending Payments",      value: pendingPay,    color: "text-amber-500" },
              { label: "Pending Withdrawals",   value: pendingWit,    color: "text-rose-500" },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">{s.label}</p>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <p className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">Total Platform Balance</p>
              <p className="text-3xl font-black text-slate-900">{fmt(totalBal)}</p>
            </div>
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <p className="text-slate-500 text-xs font-bold mb-3 uppercase tracking-wider">Recent Payments</p>
              {payments.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-slate-100 text-sm last:border-0">
                  <span className="text-slate-600 font-medium truncate max-w-[200px]">{p.userEmail}</span>
                  <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${p.status === "verified" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : p.status === "pending" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="space-y-4">
            <p className="text-slate-500 text-sm font-bold">{users.length} registered users · Real-time</p>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="text-left px-5 py-4">User</th>
                      <th className="text-left px-5 py-4">Plan Tier</th>
                      <th className="text-left px-5 py-4">Balance</th>
                      <th className="text-left px-5 py-4">Bank Details</th>
                      <th className="text-left px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">{u.email || u.phone || u.uid?.slice(0, 8)}</p>
                          <p className="text-slate-500 text-xs mt-0.5 capitalize font-medium">{u.accountStatus ?? "active"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${u.nodeTier ? "bg-primary/10 text-primary border-primary/20" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {u.nodeTier || "None"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-black text-slate-900">{fmt(u.walletBalance ?? 0)}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-slate-700 truncate max-w-[150px] font-bold">{u.bankName || "No Bank"}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 font-medium">{u.accountNumber || "—"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
                            u.nodeStatus === "active"  ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                            u.nodeStatus === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" :
                            "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {u.nodeStatus || "none"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setStatus(u.uid, u.accountStatus === "suspended" ? "active" : "suspended")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border shadow-sm ${u.accountStatus === "suspended" ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100" : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"}`}>
                              {u.accountStatus === "suspended" ? "Unsuspend" : "Suspend"}
                            </button>
                            <button onClick={() => setSelectedUser(u)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-colors shadow-sm">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSelectedUser(u)}
                              className="p-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary transition-colors shadow-sm" title="Manage Funds">
                              <TrendingUp className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* user modal */}
            <AnimatePresence>
              {selectedUser && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setSelectedUser(null)}>
                  <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                    className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-7 shadow-2xl"
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-slate-900 text-lg">User Details</h3>
                      <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-1">
                    {[
                      { k: "Email",           v: selectedUser.email },
                      { k: "Plan Tier",       v: selectedUser.nodeTier || "None" },
                      { k: "Plan Status",     v: selectedUser.nodeStatus || "none" },
                      { k: "Balance",         v: fmt(selectedUser.walletBalance ?? 0) },
                      { k: "Bank",            v: selectedUser.bankName || "—" },
                      { k: "Account",         v: selectedUser.accountNumber || "—" },
                      { k: "Referral Code",   v: selectedUser.referralCode || "—" },
                      { k: "Account Status",  v: selectedUser.accountStatus || "active" },
                    ].map(r => (
                      <div key={r.k} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500 font-medium text-sm">{r.k}</span>
                        <span className="text-slate-900 text-sm font-bold capitalize">{r.v}</span>
                      </div>
                    ))}
                    </div>
                    <div className="mt-6 space-y-4">
                      <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Wallet Actions</p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₦</span>
                            <input type="number" value={editBal} onChange={e => setEditBal(e.target.value)} placeholder="0.00"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-slate-900 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all focus:outline-none font-bold" />
                          </div>
                          <button onClick={() => creditUser(selectedUser.uid, editBal)} title="Credit"
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm">
                            <TrendingUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => debitUser(selectedUser.uid, editBal)} title="Debit"
                            className="w-11 h-11 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shadow-sm">
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-4 mb-2">Account Status</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["active", "suspended"] as const).map(s => (
                          <button key={s} onClick={() => setStatus(selectedUser.uid, s)}
                            className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-colors border shadow-sm ${
                              selectedUser.accountStatus === s
                                ? "bg-slate-900 text-white border-transparent"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* PAYMENTS */}
        {tab === "payments" && (
          <div className="space-y-4">
            <p className="text-slate-500 font-bold text-sm">{pendingPay} pending · {payments.length} total · Real-time</p>
            {payments.map((p, i) => (
              <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${p.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" : p.status === "verified" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                        {p.status}
                      </span>
                      <span className="text-slate-900 font-black text-lg">{p.nodeTier}</span>
                      <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-lg text-sm">{fmt(p.amount)}</span>
                    </div>
                    <p className="text-slate-500 font-medium text-sm mt-1">{p.userEmail}</p>
                    <p className="text-slate-400 text-xs font-mono font-medium mt-1">Ref: {p.referenceCode} · {ts(p.submittedAt)}</p>
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => verifyPayment(p)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 text-sm font-bold transition-colors shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> Verify
                      </button>
                      <button onClick={() => rejectPayment(p)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-sm font-bold transition-colors shadow-sm">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && <p className="text-slate-500 font-bold text-center py-10 bg-white border border-slate-200 rounded-2xl">No payments yet</p>}
          </div>
        )}

        {/* WITHDRAWALS */}
        {tab === "withdrawals" && (
          <div className="space-y-4">
            <p className="text-slate-500 font-bold text-sm">{pendingWit} pending · {withdrawals.length} total · Real-time</p>
            {withdrawals.map((w, i) => (
              <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${w.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" : w.status === "processed" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200"}`}>
                        {w.status}
                      </span>
                      <span className="text-slate-900 font-black text-lg">{fmt(w.amount)}</span>
                    </div>
                    <p className="text-slate-700 font-bold text-sm mt-1">{w.accountName} · {w.bankName} · <span className="font-mono bg-slate-100 px-1 py-0.5 rounded">{w.accountNumber}</span></p>
                    <p className="text-slate-500 text-xs font-medium mt-1">{w.userEmail} · {ts(w.requestedAt)}</p>
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => processWithdrawal(w)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 text-sm font-bold transition-colors shadow-sm">
                        <CheckCircle2 className="w-4 h-4" /> Processed
                      </button>
                      <button onClick={() => rejectWithdrawal(w)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-sm font-bold transition-colors shadow-sm">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {withdrawals.length === 0 && <p className="text-slate-500 font-bold text-center py-10 bg-white border border-slate-200 rounded-2xl">No withdrawals yet</p>}
          </div>
        )}

        {/* SUPPORT CHATS */}
        {tab === "support" && <SupportTab />}

        {/* SETTINGS */}
        {tab === "settings" && <SettingsTab />}

        {/* LOGS */}
        {tab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}
