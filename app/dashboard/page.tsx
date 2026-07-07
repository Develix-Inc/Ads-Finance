"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot, query, collection, where, getDocs } from "firebase/firestore";
import { getUserProfile, upsertUserProfile, NODE_MULTIPLIERS, NODE_MIN_WITHDRAWAL, adminVerifyPayment } from "@/lib/admin";
import { listenTransactions } from "@/lib/transactions";
import { OnboardingWizard } from "@/components/ui/OnboardingWizard";
import { WithdrawModal } from "@/components/ui/WithdrawModal";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { ComplianceBadge } from "@/components/ui/ComplianceBadge";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaGaugeHigh, FaBullseye, FaClockRotateLeft, FaUsers,
  FaGear, FaRightFromBracket, FaMoon, FaSun,
  FaWallet, FaArrowUp, FaBolt, FaChevronRight, FaLock,
  FaShieldHalved, FaCircleCheck, FaClock, FaArrowTrendUp,
  FaCircleXmark, FaMoneyBillTransfer
} from "react-icons/fa6";

/* ── helpers ── */
const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts  = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "";

const NODE_STYLE: Record<string, { grad: string; ring: string }> = {
  "Node Alpha": { grad: "from-teal-600 to-teal-900",     ring: "border-teal-500/40" },
  "Node Sigma": { grad: "from-amber-500 to-orange-800",  ring: "border-amber-500/40" },
  "Node Omega": { grad: "from-violet-600 to-purple-900", ring: "border-violet-500/40" },
};

const TX_ICON: Record<string, any> = {
  deposit: FaWallet, withdrawal: FaArrowUp, task_reward: FaCircleCheck,
  referral_bonus: FaUsers, node_purchase: FaShieldHalved,
  admin_credit: FaArrowTrendUp, admin_debit: FaCircleXmark, refund: FaMoneyBillTransfer,
};

const TX_COLOR: Record<string, string> = {
  deposit: "text-emerald-400", withdrawal: "text-rose-400", task_reward: "text-teal-400",
  referral_bonus: "text-blue-400", node_purchase: "text-violet-400",
  admin_credit: "text-emerald-400", admin_debit: "text-rose-400", refund: "text-amber-400",
};

const NAV = [
  { href: "/dashboard",    icon: FaGaugeHigh,      label: "Dashboard" },
  { href: "/tasks",        icon: FaBullseye,        label: "Task Feed" },
  { href: "/withdrawals",  icon: FaClockRotateLeft, label: "Withdrawals" },
  { href: "/referrals",    icon: FaUsers,           label: "Referrals" },
  { href: "/upgrade",      icon: FaBolt,            label: "Upgrade" },
  { href: "/settings",     icon: FaGear,            label: "Settings" },
];

function LockedOverlay({ reason }: { reason: string }) {
  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm rounded-[22px] z-10 flex flex-col items-center justify-center gap-2 p-6">
      <FaLock className="w-5 h-5 text-slate-500" />
      <p className="text-slate-400 text-xs font-semibold text-center">{reason}</p>
      <Link href="/upgrade" className="bg-teal-500 text-slate-950 font-black text-xs px-4 py-2 rounded-full hover:bg-teal-400 transition-colors">
        Activate Node
      </Link>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]           = useState<any>(null);
  const [profile, setProfile]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [balance, setBalance]     = useState(0);
  const [transactions, setTxs]    = useState<any[]>([]);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  /* auth + profile */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      let p = await getUserProfile(u.uid);

      if (!p) {
        // Auto-heal missing Firestore profile doc to ensure Auth & Firestore sync immediately!
        const defaultName = u.displayName || u.email?.split("@")[0] || "User";
        const placeholderReferralCode = u.uid.slice(0, 6).toUpperCase();
        const fallbackProfile = {
          email: u.email || "",
          displayName: defaultName,
          photoURL: u.photoURL || "",
          investmentGoal: "passive_income",
          riskLevel: "moderate",
          bankName: "Pending Setup",
          accountNumber: "0000000000",
          accountName: "Pending Setup",
          onboardingComplete: false,
          referralCode: placeholderReferralCode,
          walletBalance: 0,
          totalEarned: 0,
          dailyTaskEarnings: 0,
          salesCommission: 0,
          nodeStatus: "none",
          nodeTier: null,
          accountStatus: "active",
          createdAt: new Date().toISOString(),
        };
        await upsertUserProfile(u.uid, fallbackProfile);
        p = { uid: u.uid, ...fallbackProfile };
      }

      setProfile(p);
      setBalance(p?.walletBalance ?? 0);
      if (!p || !p.onboardingComplete) {
        setShowOnboarding(true);
      }
      setLoading(false);
    });
    return unsub;
  }, [router]);

  /* real-time balance from Firestore (NO fake ticker) */
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) {
        setBalance(snap.data().walletBalance ?? 0);
        setProfile(snap.data());
      }
    });
    return unsub;
  }, [user?.uid]);

  /* real-time transaction history */
  useEffect(() => {
    if (!user?.uid) return;
    return listenTransactions(user.uid, 5, setTxs);
  }, [user?.uid]);

  /* handle paystack callback verification */
  useEffect(() => {
    if (!user?.uid || typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("verify");
    if (!reference) return;

    async function verifyPayment() {
      try {
        const res = await fetch(`/api/paystack/verify?reference=${reference}`);
        const data = await res.json();
        if (data.success) {
          const q = query(collection(db, "payments"), where("referenceCode", "==", reference));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const paymentDoc = snap.docs[0];
            const paymentData = paymentDoc.data();
            
            if (paymentData.status !== "verified") {
              await adminVerifyPayment(paymentDoc.id, paymentData.uid, paymentData.nodeTier, "system@paystack");
              import("sweetalert2").then(Swal => {
                Swal.default.fire({ background: "#020617", color: "#f8fafc", icon: "success", title: "Node Activated", text: "Your payment was successful and your node is active!", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-600" } });
              });
            }
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
      } finally {
        // Remove param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    verifyPayment();
  }, [user?.uid]);

  const logout = async () => { await signOut(auth); router.push("/"); };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
      <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Initializing Node…</p>
    </div>
  );

  const name       = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || user?.phoneNumber || "Validator";
  const avatar     = name[0].toUpperCase();
  const nodeActive = profile?.nodeStatus === "active";
  const nodePending= profile?.nodeStatus === "pending";
  const nodeTier   = profile?.nodeTier ?? "Node Alpha";
  const nodeStyle  = NODE_STYLE[nodeTier] ?? NODE_STYLE["Node Alpha"];
  const mult       = (NODE_MULTIPLIERS as Record<string, number>)[nodeTier] ?? 4;
  const minWithdraw= (NODE_MIN_WITHDRAWAL as Record<string, number>)[nodeTier] ?? 75000;

  const bg   = "bg-slate-950 text-slate-200";
  const card = "bg-slate-900 border-white/10";
  const sub  = "text-slate-500";

  return (
    <div className={`min-h-screen ${bg} flex transition-colors duration-300`}>

      {showOnboarding && user && (
        <OnboardingWizard uid={user.uid} userEmail={user.email || user.phoneNumber || ""} onComplete={() => setShowOnboarding(false)} />
      )}

      <AnimatePresence>
        {showWithdraw && nodeActive && (
          <WithdrawModal
            uid={user.uid} userEmail={user.email || user.phoneNumber || ""}
            balance={balance} minWithdrawal={minWithdraw}
            withdrawalPin={profile?.withdrawalPin}
            bankName={profile?.bankName ?? ""} accountNumber={profile?.accountNumber ?? ""} accountName={profile?.accountName ?? ""}
            onClose={() => setShowWithdraw(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR (md+) ── */}
      <aside className={`hidden md:flex w-64 shrink-0 flex-col border-r border-white/10 bg-slate-900/60 sticky top-0 h-screen`}>
        <div className={`p-6 border-b border-white/10`}>
          <div className="flex items-center gap-3">
            <Image src="/logo-transparent.png" alt="AdsFinance" width={36} height={36} className="w-9 h-9 object-contain" onError={e => { (e.target as any).style.display = "none"; }} />
            <div>
              <p className="font-black text-base tracking-tight leading-none">AdsFinance</p>
              <p className={`text-[9px] font-mono tracking-widest uppercase mt-0.5 ${sub}`}>Node Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = item.href === "/dashboard";
            return (
              <Link key={item.label} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm
                  ${active ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                           : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-white/10 space-y-3`}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-600 to-slate-800 flex items-center justify-center font-black text-white text-sm shrink-0">{avatar}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate capitalize">{name}</p>
              <p className={`text-[11px] truncate ${sub}`}>{user?.email || user?.phoneNumber}</p>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium">
            <FaRightFromBracket className="w-4 h-4" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* topbar */}
        <header className={`sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3 md:hidden">
            <Image src="/logo-transparent.png" alt="AdsFinance" width={32} height={32} className="w-8 h-8 object-contain" onError={e => { (e.target as any).style.display = "none"; }} />
            <span className="font-black text-base tracking-tight">AdsFinance</span>
          </div>
          <h1 className="hidden md:block text-xl font-black tracking-tight">My Dashboard</h1>

          <div className="flex items-center gap-2">
            {nodePending && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                <FaClock className="w-3 h-3 animate-pulse" /> Node Pending
              </span>
            )}
            {nodeActive && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-teal-400 bg-teal-400/10 px-3 py-1.5 rounded-full border border-teal-400/20">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" /> Online
              </span>
            )}
            {user?.uid && <NotificationBell uid={user.uid} />}
            <button onClick={logout} className="md:hidden p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <FaRightFromBracket className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-5 pb-28 md:pb-10">

            {/* pending banner */}
            {nodePending && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                <FaClock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-amber-300 font-bold text-sm">Payment Verification Pending</p>
                  <p className="text-amber-500/80 text-xs mt-0.5">Your node will be activated within 24 hours once our team confirms your transfer.</p>
                </div>
              </div>
            )}

            {/* welcome */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${sub}`}>Welcome back</p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight capitalize">{name}</h2>
              </div>
              <Link href="/settings" className="hover:opacity-80 transition-opacity">
                {profile?.photoURL || user?.photoURL ? (
                  <Image src={profile?.photoURL || user?.photoURL} alt={name} width={48} height={48} className="w-12 h-12 rounded-full object-cover border-2 border-teal-500/30 shadow-lg" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-slate-800 flex items-center justify-center font-black text-white text-xl shadow-lg">{avatar}</div>
                )}
              </Link>
            </div>

            {/* WALLET CARD */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="relative rounded-[28px] bg-gradient-to-br from-[#081022] via-[#0d1f3a] to-[#081022] border border-white/10 p-6 md:p-8 overflow-hidden shadow-2xl">
              <div className="absolute -top-20 -right-20 w-72 h-72 bg-teal-600/6 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-white/8 rounded-xl border border-white/10">
                    <FaWallet className="w-4 h-4 text-teal-400" />
                  </div>
                  <span className="text-slate-400 text-sm font-medium">Wallet Balance</span>
                  <div className="ml-auto flex items-center gap-1.5 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Real-time</span>
                  </div>
                </div>

                <p className="text-4xl md:text-5xl font-black tracking-tight text-white mb-1">{fmt(balance)}</p>
                <p className="text-slate-500 text-xs font-mono mb-6">≈ ${(balance / 1600).toFixed(4)} USD</p>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: "Withdraw",  icon: FaArrowUp,   action: () => {
                      if (profile?.accountStatus === 'suspended') {
                        import("sweetalert2").then(Swal => Swal.default.fire({
                          background: "#020617", color: "#f8fafc", icon: "error", title: "Account Suspended",
                          text: "Your account is suspended. You cannot make withdrawals.",
                          customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-600" }
                        }));
                      } else if (nodeActive) {
                        setShowWithdraw(true);
                      }
                    } },
                    { label: "Referrals", icon: FaUsers,     action: () => router.push("/referrals") },
                    { label: "Upgrade",   icon: FaBolt,      action: () => router.push("/upgrade") },
                  ].map((a, i) => (
                    <button key={i} onClick={a.action}
                      className="flex flex-col items-center gap-2 group py-1">
                      <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center group-hover:bg-white/15 group-active:scale-95 transition-all">
                        <a.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{a.label}</span>
                    </button>
                  ))}
                </div>

                {nodeActive && (
                  <p className="text-center text-xs text-slate-600 font-mono">
                    Min withdrawal: {fmt(minWithdraw)} · Node: {nodeTier}
                  </p>
                )}
              </div>
            </motion.div>

            {/* STATS */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Daily Task Yield",  value: fmt(profile?.dailyTaskEarnings ?? 0),  icon: FaBullseye,    acc: "teal" },
                { label: "Sales Commission",  value: fmt(profile?.salesCommission ?? 0),     icon: FaArrowTrendUp, acc: "amber" },
              ].map((s, i) => (
                <div key={i} className={`relative rounded-[22px] p-5 border ${card} shadow-sm`}>
                  {profile?.accountStatus === 'suspended' ? (
                    <LockedOverlay reason="Account Suspended" />
                  ) : !nodeActive ? (
                    <LockedOverlay reason="Node required to earn" />
                  ) : null}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.acc === "teal" ? "bg-teal-500/10 text-teal-400" : "bg-amber-500/10 text-amber-400"}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <p className={`text-xs font-medium mb-0.5 ${sub}`}>{s.label}</p>
                  <p className="text-xl font-black">{s.value}</p>
                </div>
              ))}
            </div>

            {/* NODE LICENSE */}
            {nodeActive && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-base">Active Node License</h3>
                  <Link href="/upgrade" className="text-xs text-teal-400 font-semibold flex items-center gap-1 hover:text-teal-300 transition-colors">
                    Upgrade <FaChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className={`relative rounded-[22px] bg-gradient-to-r ${nodeStyle.grad} p-6 shadow-xl border ${nodeStyle.ring}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-black/20 border border-white/20 flex items-center justify-center">
                        <FaShieldHalved className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider mb-0.5">Validator License</p>
                        <p className="text-white font-black text-xl">{nodeTier}</p>
                        <p className="text-white/60 text-xs mt-0.5">Multiplier: <span className="text-white font-black">{mult}.0×</span> · Min Withdrawal: <span className="text-white font-bold">{fmt(minWithdraw)}</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Status</span>
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-white font-black text-sm">ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NO NODE CTA */}
            {!nodeActive && !nodePending && (
              <div className={`rounded-[22px] border ${card} p-6 text-center`}>
                <FaShieldHalved className="w-10 h-10 text-teal-500/30 mx-auto mb-3" />
                <p className="font-bold text-base mb-1">No Active Node</p>
                <p className={`text-sm ${sub} mb-5`}>Purchase a Validator Node License to unlock tasks, earnings, and withdrawals.</p>
                <Link href="/upgrade" className="inline-block bg-teal-500 hover:bg-teal-400 text-slate-950 font-black px-8 py-3 rounded-2xl text-sm transition-colors">
                  Initialize My Node
                </Link>
              </div>
            )}

            {/* RECENT TRANSACTIONS (real from Firestore) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-base">Recent Transactions</h3>
                <Link href="/withdrawals" className={`text-xs text-teal-400 font-semibold flex items-center gap-1 hover:text-teal-300 transition-colors`}>
                  History <FaChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className={`rounded-[22px] border ${card} overflow-hidden divide-y divide-white/5`}>
                {transactions.length === 0 ? (
                  <div className="py-10 text-center">
                    <FaWallet className={`w-8 h-8 ${sub} mx-auto mb-2`} />
                    <p className={`text-sm ${sub}`}>No transactions yet</p>
                  </div>
                ) : transactions.map((tx, i) => {
                  const Icon  = TX_ICON[tx.type] ?? FaWallet;
                  const color = TX_COLOR[tx.type] ?? "text-slate-400";
                  const pos   = tx.amount > 0;
                  return (
                    <motion.div key={tx.id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-4 px-5 py-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pos ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{tx.description}</p>
                        <p className={`text-xs ${sub} mt-0.5`}>{tx.type?.replace("_", " ")} · {ts(tx.createdAt)}</p>
                      </div>
                      <span className={`text-sm font-black shrink-0 ${pos ? "text-emerald-400" : "text-rose-400"}`}>
                        {pos ? "+" : ""}{fmt(tx.amount)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <ComplianceBadge />
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/98 backdrop-blur-xl safe-area-bottom`}>
        <div className="grid grid-cols-5 h-16">
          {NAV.slice(0, 5).map((item, i) => {
            const active = item.href === "/dashboard";
            return (
              <Link key={i} href={item.href}
                className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${active ? "text-teal-400" : "text-slate-500 hover:text-slate-300"}`}>
                <item.icon className="w-[18px] h-[18px]" />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
