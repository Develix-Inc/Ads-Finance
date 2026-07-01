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
  upsertUserProfile, getUserProfile,
  adminSetUserStatus, adminBroadcast,
} from "@/lib/admin";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUsers, FaMoneyBillTransfer, FaArrowDown, FaGaugeHigh,
  FaCircleCheck, FaCircleXmark, FaClockRotateLeft, FaEye,
  FaRightFromBracket, FaShieldHalved, FaBullhorn, FaX, FaArrowTrendUp
} from "react-icons/fa6";
import Swal from "sweetalert2";

const ADMIN_EMAILS = ["info.vendrainc@gmail.com", "admin@adsfinance.com"];

const SWAL = {
  background: "#020617", color: "#f8fafc",
  confirmButtonColor: "#14b8a6",
  customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full", cancelButton: "!rounded-full" }
};

const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts  = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleString() : "—";

type Tab = "overview" | "users" | "payments" | "withdrawals";

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

  /* ── Real-time listeners (no orderBy = no composite index needed) ── */
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
    Swal.fire({ ...SWAL, icon: "success", title: "Node Activated", timer: 1500, showConfirmButton: false });
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

  async function creditUser(uid: string) {
    const { value } = await Swal.fire({ ...SWAL, title: "Credit Amount (₦)", input: "number", inputPlaceholder: "e.g. 5000", showCancelButton: true });
    if (value && parseFloat(value) > 0) {
      await adminCreditUser(uid, parseFloat(value), "Admin manual credit", admin.email);
      Swal.fire({ ...SWAL, icon: "success", title: "Credited!", timer: 1200, showConfirmButton: false });
    }
  }

  async function debitUser(uid: string) {
    const { value } = await Swal.fire({ ...SWAL, title: "Debit Amount (₦)", input: "number", inputPlaceholder: "e.g. 5000", showCancelButton: true });
    if (value && parseFloat(value) > 0) {
      await adminDebitUser(uid, parseFloat(value), "Admin manual debit", admin.email);
      Swal.fire({ ...SWAL, icon: "info", title: "Debited", timer: 1200, showConfirmButton: false });
    }
  }

  async function setStatus(uid: string, status: "active" | "suspended" | "banned") {
    await adminSetUserStatus(uid, status, admin.email);
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center gap-3">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-xs font-mono">Loading admin panel…</p>
    </div>
  );

  const pendingPay = payments.filter(p => p.status === "pending").length;
  const pendingWit = withdrawals.filter(w => w.status === "pending").length;
  const totalBal   = users.reduce((s, u) => s + (u.walletBalance ?? 0), 0);
  const activeNodes = users.filter(u => u.nodeStatus === "active").length;

  const TABS: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview",    label: "Overview",    icon: FaGaugeHigh },
    { id: "users",       label: "Users",       icon: FaUsers,             badge: users.length },
    { id: "payments",    label: "Payments",    icon: FaMoneyBillTransfer, badge: pendingPay },
    { id: "withdrawals", label: "Withdrawals", icon: FaArrowDown,         badge: pendingWit },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-slate-900/60 sticky top-0 z-40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Image src="/logo-transparent.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" onError={e => { (e.target as any).style.display = "none"; }} />
          <div>
            <p className="font-black text-white text-base leading-none">AdsFinance</p>
            <p className="text-[10px] text-teal-400 font-mono tracking-widest uppercase">Admin Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-mono">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live
          </div>
          <button onClick={broadcast}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-colors text-xs font-semibold">
            <FaBullhorn className="w-3.5 h-3.5" /> Broadcast
          </button>
          <span className="text-xs text-slate-500 hidden sm:block">{admin?.email}</span>
          <button onClick={() => { auth.signOut(); router.push("/"); }}
            className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors">
            <FaRightFromBracket className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* tabs */}
      <div className="border-b border-white/10 bg-slate-900/30 px-6">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${tab === t.id ? "border-teal-500 text-teal-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
              <t.icon className="w-4 h-4" />
              {t.label}
              {(t.badge ?? 0) > 0 && <span className="bg-teal-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Users",          value: users.length,  color: "text-teal-400" },
              { label: "Active Nodes",          value: activeNodes,   color: "text-violet-400" },
              { label: "Pending Payments",      value: pendingPay,    color: "text-amber-400" },
              { label: "Pending Withdrawals",   value: pendingWit,    color: "text-rose-400" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900 border border-white/10 rounded-[20px] p-6">
                <p className="text-slate-400 text-xs font-medium mb-2">{s.label}</p>
                <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
              </div>
            ))}
            <div className="col-span-2 bg-slate-900 border border-white/10 rounded-[20px] p-6">
              <p className="text-slate-400 text-xs font-medium mb-2">Total Platform Balance</p>
              <p className="text-3xl font-black text-white">{fmt(totalBal)}</p>
            </div>
            <div className="col-span-2 bg-slate-900 border border-white/10 rounded-[20px] p-6">
              <p className="text-slate-400 text-xs font-medium mb-2">Recent Payments</p>
              {payments.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between py-1.5 border-b border-white/5 text-sm">
                  <span className="text-slate-400 truncate max-w-[200px]">{p.userEmail}</span>
                  <span className={`font-bold ${p.status === "verified" ? "text-emerald-400" : p.status === "pending" ? "text-amber-400" : "text-rose-400"}`}>{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === "users" && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">{users.length} registered users · Real-time</p>
            <div className="bg-slate-900 border border-white/10 rounded-[20px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-4">User</th>
                      <th className="text-left px-5 py-4">Node</th>
                      <th className="text-left px-5 py-4">Balance</th>
                      <th className="text-left px-5 py-4">Bank Details</th>
                      <th className="text-left px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u, i) => (
                      <tr key={i} className="hover:bg-white/3 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white truncate max-w-[180px]">{u.email || u.phone || u.uid?.slice(0, 8)}</p>
                          <p className="text-slate-500 text-xs mt-0.5 capitalize">{u.accountStatus ?? "active"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${u.nodeTier ? "bg-teal-500/10 text-teal-400" : "bg-slate-700 text-slate-400"}`}>
                            {u.nodeTier || "None"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-white">{fmt(u.walletBalance ?? 0)}</td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-slate-300 truncate max-w-[150px] font-semibold">{u.bankName || "No Bank"}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{u.accountNumber || "—"}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            u.nodeStatus === "active"  ? "bg-emerald-500/10 text-emerald-400" :
                            u.nodeStatus === "pending" ? "bg-amber-500/10 text-amber-400" :
                            "bg-slate-700/50 text-slate-500"}`}>
                            {u.nodeStatus || "none"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => setStatus(u.uid, u.accountStatus === "suspended" ? "active" : "suspended")}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${u.accountStatus === "suspended" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"}`}>
                              {u.accountStatus === "suspended" ? "Unsuspend" : "Suspend"}
                            </button>
                            <button onClick={() => setSelectedUser(u)}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors">
                              <FaEye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => creditUser(u.uid)}
                              className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 transition-colors">
                              <FaArrowTrendUp className="w-3.5 h-3.5" />
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
                  className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                  onClick={() => setSelectedUser(null)}>
                  <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                    className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[24px] p-7 shadow-2xl"
                    onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-black text-white text-lg">User Details</h3>
                      <button onClick={() => setSelectedUser(null)} className="text-slate-500 hover:text-white"><FaX className="w-4 h-4" /></button>
                    </div>
                    {[
                      { k: "Email",           v: selectedUser.email },
                      { k: "Node Tier",       v: selectedUser.nodeTier || "None" },
                      { k: "Node Status",     v: selectedUser.nodeStatus || "none" },
                      { k: "Balance",         v: fmt(selectedUser.walletBalance ?? 0) },
                      { k: "Bank",            v: selectedUser.bankName || "—" },
                      { k: "Account",         v: selectedUser.accountNumber || "—" },
                      { k: "Referral Code",   v: selectedUser.referralCode || "—" },
                      { k: "Account Status",  v: selectedUser.accountStatus || "active" },
                    ].map(r => (
                      <div key={r.k} className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-slate-500 text-sm">{r.k}</span>
                        <span className="text-white text-sm font-semibold capitalize">{r.v}</span>
                      </div>
                    ))}
                    <div className="mt-5 space-y-3">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Wallet Actions</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => { creditUser(selectedUser.uid); setSelectedUser(null); }}
                          className="py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20 transition-colors">
                          Credit Wallet
                        </button>
                        <button onClick={() => { debitUser(selectedUser.uid); setSelectedUser(null); }}
                          className="py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 transition-colors">
                          Debit Wallet
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-3">Account Status</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["active", "suspended", "banned"] as const).map(s => (
                          <button key={s} onClick={() => setStatus(selectedUser.uid, s)}
                            className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-colors border ${
                              selectedUser.accountStatus === s
                                ? "bg-teal-500 text-slate-950 border-transparent"
                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"}`}>
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
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">{pendingPay} pending · {payments.length} total · Real-time</p>
            {payments.map((p, i) => (
              <div key={i} className="bg-slate-900 border border-white/10 rounded-[20px] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.status === "pending" ? "bg-amber-500/10 text-amber-400" : p.status === "verified" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {p.status}
                      </span>
                      <span className="text-white font-black">{p.nodeTier}</span>
                      <span className="text-slate-400 font-bold">{fmt(p.amount)}</span>
                    </div>
                    <p className="text-slate-400 text-xs">{p.userEmail}</p>
                    <p className="text-slate-600 text-xs font-mono mt-0.5">Ref: {p.referenceCode} · {ts(p.submittedAt)}</p>
                  </div>
                  {p.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => verifyPayment(p)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-bold transition-colors">
                        <FaCircleCheck className="w-4 h-4" /> Verify
                      </button>
                      <button onClick={() => rejectPayment(p)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-sm font-bold transition-colors">
                        <FaCircleXmark className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {payments.length === 0 && <p className="text-slate-600 text-center py-10">No payments yet</p>}
          </div>
        )}

        {/* WITHDRAWALS */}
        {tab === "withdrawals" && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">{pendingWit} pending · {withdrawals.length} total · Real-time</p>
            {withdrawals.map((w, i) => (
              <div key={i} className="bg-slate-900 border border-white/10 rounded-[20px] p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${w.status === "pending" ? "bg-amber-500/10 text-amber-400" : w.status === "processed" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {w.status}
                      </span>
                      <span className="text-white font-black">{fmt(w.amount)}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{w.accountName} · {w.bankName} · <span className="font-mono">{w.accountNumber}</span></p>
                    <p className="text-slate-500 text-xs mt-0.5">{w.userEmail} · {ts(w.requestedAt)}</p>
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => processWithdrawal(w)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-sm font-bold transition-colors">
                        <FaCircleCheck className="w-4 h-4" /> Processed
                      </button>
                      <button onClick={() => rejectWithdrawal(w)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-sm font-bold transition-colors">
                        <FaCircleXmark className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {withdrawals.length === 0 && <p className="text-slate-600 text-center py-10">No withdrawals yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}
