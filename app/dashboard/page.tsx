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
  Gauge, Target, History, Users,
  Settings, LogOut, Moon, Sun,
  Wallet, ArrowUpRight, Zap, ChevronRight, Lock,
  ShieldCheck, CheckCircle2, Clock, TrendingUp,
  XCircle, ArrowRightLeft, LayoutDashboard, PlaySquare, Banknote, Sparkles
} from "lucide-react";
import { FaHand } from "react-icons/fa6";

/* ── helpers ── */
const fmt = (n: number) => "₦" + (n ?? 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ts  = (t: any) => t?.seconds ? new Date(t.seconds * 1000).toLocaleDateString("en-NG", { month: "short", day: "numeric" }) : "";

const PLAN_STYLE: Record<string, { grad: string; ring: string }> = {
  "Alpha Plan": { grad: "from-slate-100 to-slate-200",     ring: "border-slate-200" },
  "Sigma Plan": { grad: "from-primary/10 to-primary/5",  ring: "border-primary/30" },
  "Omega Plan": { grad: "from-amber-100 to-amber-50", ring: "border-amber-400" },
  "Starter Plan": { grad: "from-slate-50 to-slate-100", ring: "border-slate-200" },
};

const TX_ICON: Record<string, any> = {
  deposit: Wallet, withdrawal: ArrowUpRight, task_reward: CheckCircle2,
  referral_bonus: Users, node_purchase: ShieldCheck,
  admin_credit: TrendingUp, admin_debit: XCircle, refund: ArrowRightLeft,
};

const TX_COLOR: Record<string, string> = {
  deposit: "text-emerald-500", withdrawal: "text-rose-500", task_reward: "text-primary",
  referral_bonus: "text-blue-500", node_purchase: "text-violet-500",
  admin_credit: "text-emerald-500", admin_debit: "text-rose-500", refund: "text-amber-500",
};

const NAV = [
  { href: "/dashboard",    icon: LayoutDashboard,      label: "Dashboard" },
  { href: "/tasks",        icon: PlaySquare,        label: "Task Feed" },
  { href: "/withdrawals",  icon: Banknote, label: "Withdrawals" },
  { href: "/referrals",    icon: Users,           label: "Referrals" },
  { href: "/upgrade",      icon: Sparkles,            label: "Upgrade" },
  { href: "/settings",     icon: Settings,            label: "Settings" },
];

function LockedOverlay({ reason }: { reason: string }) {
  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl z-10 flex flex-col items-center justify-center gap-2 p-6 border border-slate-200">
      <Lock className="w-5 h-5 text-slate-400" />
      <p className="text-slate-600 text-xs font-semibold text-center">{reason}</p>
      <Link href="/upgrade" className="bg-primary text-primary-foreground font-bold text-xs px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
        Upgrade Plan
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

  /* real-time balance from Firestore */
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
                Swal.default.fire({ background: "#ffffff", color: "#0f172a", icon: "success", title: "Plan Activated", text: "Your payment was successful and your premium plan is active!", customClass: { popup: "!rounded-2xl !border !border-slate-200", confirmButton: "!rounded-full !bg-primary" } });
              });
            }
          }
        }
      } catch (err) {
        console.error("Verification error:", err);
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    verifyPayment();
  }, [user?.uid]);

  const logout = async () => { await signOut(auth); router.push("/"); };

  if (loading) return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="w-24 h-4 bg-slate-200 rounded animate-pulse" />
            <div className="w-16 h-2 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="w-full h-10 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </aside>
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="h-[73px] border-b border-slate-200 bg-white px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="w-32 h-5 bg-slate-200 rounded animate-pulse" />
            <div className="w-48 h-3 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-8 bg-slate-200 rounded-full animate-pulse" />
            <div className="w-8 h-8 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </header>
        <div className="p-4 md:px-8 py-6 w-full space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="col-span-1 lg:col-span-2 h-[260px] rounded-3xl bg-white border border-slate-200 shadow-sm animate-pulse p-6">
              <div className="w-32 h-4 bg-slate-200 rounded mb-4" />
              <div className="w-64 h-12 bg-slate-200 rounded mb-6" />
            </div>
            <div className="h-[260px] rounded-3xl bg-slate-50 border border-slate-200 shadow-sm animate-pulse p-6" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 h-[400px] rounded-3xl bg-white border border-slate-200 shadow-sm animate-pulse" />
            <div className="h-[400px] rounded-3xl bg-white border border-slate-200 shadow-sm animate-pulse" />
          </div>
        </div>
      </main>
    </div>
  );

  const name       = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || user?.phoneNumber || "User";
  const avatar     = name[0].toUpperCase();
  const nodeActive = profile?.nodeStatus === "active";
  const nodePending= profile?.nodeStatus === "pending";
  const nodeTier   = profile?.nodeTier ?? "Starter Plan";
  const planStyle  = PLAN_STYLE[nodeTier] ?? PLAN_STYLE["Starter Plan"];
  const mult       = (NODE_MULTIPLIERS as Record<string, number>)[nodeTier] ?? 1;
  const minWithdraw= (NODE_MIN_WITHDRAWAL as Record<string, number>)[nodeTier] ?? 50000;

  return (
    <div className={`min-h-screen bg-background text-slate-900 flex transition-colors duration-300`}>

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
      <aside className={`hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white sticky top-0 h-screen`}>
        <div className={`p-6 border-b border-slate-100`}>
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="AdsFinance" width={32} height={32} className="w-8 h-8 object-contain" onError={e => { (e.target as any).style.display = "none"; }} />
            <div>
              <p className="font-black text-base tracking-tight text-slate-900 leading-none">AdsFinance</p>
              <p className={`text-[9px] font-bold tracking-widest uppercase mt-0.5 text-slate-400`}>User Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = item.href === "/dashboard";
            return (
              <Link key={item.label} href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all text-sm
                  ${active ? "bg-primary/10 text-primary"
                           : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-slate-100 space-y-3`}>
          <Link href="/settings" className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-slate-900 group-hover:bg-primary flex items-center justify-center font-bold text-white text-sm shrink-0 transition-colors shadow-sm">{avatar}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate capitalize">{name}</p>
              <p className={`text-xs text-slate-500 truncate`}>{user.email || user.phoneNumber}</p>
            </div>
          </Link>
          <button onClick={logout} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors`}>
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto relative">
        <header className={`sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3 md:hidden">
            <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="AdsFinance Logo" width={32} height={32} className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><span class="text-white font-bold text-xs">AF</span></div>';
                }}
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                Hello {name} <FaHand className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h1>
              <p className="text-[9px] text-slate-500 font-medium">Have you watched any ads today?</p>
            </div>
          </div>
          <div className="hidden md:flex flex-col">
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Hello {name} <FaHand className="w-4 h-4 text-amber-500 animate-pulse" />
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Have you watched any ads today?</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/upgrade" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors">
              <Zap className="w-3.5 h-3.5 text-primary" /> Upgrade Plan
            </Link>
            {user?.uid && <NotificationBell uid={user.uid} />}
            <Link href="/settings" className="md:hidden w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-white text-xs hover:scale-105 transition-transform shadow-sm">
              {avatar}
            </Link>
          </div>
        </header>

        <div className="p-4 md:px-8 py-6 max-w-7xl mx-auto w-full space-y-6 pb-24 md:pb-6">

          {/* ── ALERTS ── */}
          {profile?.accountStatus === 'suspended' && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Account Suspended</p>
                <p className="text-xs mt-1 leading-relaxed">
                  {profile.suspensionReason || "Your account has been suspended due to policy violations. All withdrawals are frozen."}
                </p>
                <p className="text-xs mt-2 font-semibold">Please contact support for resolution.</p>
              </div>
            </div>
          )}

          {nodePending && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <Clock className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-bold text-sm">Plan Activation Pending</p>
                <p className="text-xs mt-1">Your payment for <strong>{nodeTier}</strong> is currently being reviewed. This process takes up to 24 hours.</p>
              </div>
            </div>
          )}

          {/* ── TOP METRICS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            
            {/* Balance Card */}
            <div className={`col-span-1 lg:col-span-2 rounded-3xl p-6 md:p-8 bg-white border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Wallet className="w-32 h-32 text-primary group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">{fmt(balance)}</h2>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1 text-emerald-500 text-sm font-bold bg-emerald-50 px-2 py-1 rounded">
                    <TrendingUp className="w-4 h-4" /> +{fmt(profile?.dailyTaskEarnings || 0)} today
                  </div>
                </div>
              </div>
              <div className="mt-8 flex gap-3 relative z-10">
                <button onClick={() => {
                  if (!nodeActive) {
                    import("sweetalert2").then(Swal => Swal.default.fire({ background: "#ffffff", color: "#0f172a", icon: "warning", title: "Activation Required", text: "You must activate a Premium Plan to withdraw.", customClass: { popup: "!rounded-2xl !border !border-slate-200", confirmButton: "!rounded-full !bg-primary" } }));
                    return;
                  }
                  setShowWithdraw(true);
                }}
                  className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-sm transition-all shadow-md">
                  Withdraw Funds
                </button>
                <Link href="/tasks" className="flex-1 py-3.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-bold text-sm text-center transition-all">
                  Complete Tasks
                </Link>
              </div>
            </div>

            {/* Current Plan Card */}
            <div className={`rounded-3xl p-6 md:p-8 bg-gradient-to-br ${planStyle.grad} border ${planStyle.ring} shadow-sm relative overflow-hidden flex flex-col`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Current Plan</span>
                <ShieldCheck className="w-5 h-5 text-slate-700" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">{nodeTier}</h3>
              <p className="text-sm text-slate-600 font-medium mb-6">
                Status: <span className={nodeActive ? "text-primary font-bold" : nodePending ? "text-amber-600 font-bold" : "text-slate-500 font-bold"}>
                  {nodeActive ? "Active" : nodePending ? "Pending" : "Inactive"}
                </span>
              </p>
              
              <div className="mt-auto space-y-3 relative z-10">
                <div className="flex justify-between items-center text-sm border-b border-slate-200/50 pb-2">
                  <span className="text-slate-600 font-medium">Task Limits</span>
                  <span className="text-slate-900 font-bold">Standard</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-slate-200/50 pb-2">
                  <span className="text-slate-600 font-medium">Min Withdrawal</span>
                  <span className="text-slate-900 font-bold">{fmt(minWithdraw)}</span>
                </div>
              </div>
              <Link href="/upgrade" className="mt-6 w-full py-3 rounded-xl bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 font-bold text-sm text-center transition-all shadow-sm">
                Upgrade Plan
              </Link>
            </div>
          </div>

          {/* ── RECENT ACTIVITY ── */}
          <div className={`rounded-3xl p-6 bg-white border border-slate-200 shadow-sm relative min-h-[300px]`}>
              {!nodeActive && <LockedOverlay reason="Activate a premium plan to unlock full transaction history." />}
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                <Link href="/withdrawals" className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {transactions.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 border border-slate-100">
                    <History className="w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm">No recent transactions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map(tx => {
                    const Icon = TX_ICON[tx.type] || Target;
                    const cColor = TX_COLOR[tx.type] || "text-slate-400";
                    const isPos = ["deposit","task_reward","referral_bonus","admin_credit"].includes(tx.type);
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100 ${cColor}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 capitalize">{tx.type.replace("_", " ")}</p>
                            <p className="text-xs text-slate-500 font-medium">{ts(tx.createdAt)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${isPos ? "text-emerald-500" : "text-slate-900"}`}>
                            {isPos ? "+" : ""}{fmt(tx.amount)}
                          </p>
                          <p className={`text-[10px] font-bold uppercase tracking-wider ${tx.status === "completed" ? "text-primary" : tx.status === "failed" ? "text-rose-500" : "text-amber-500"}`}>
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

        </div>

        {/* ── MOBILE NAV (bottom) ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-safe">
          <div className="flex items-center justify-around p-2">
            {NAV.slice(0, 5).map(item => {
              const active = item.href === "/dashboard";
              return (
                <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${active ? "text-primary" : "text-slate-400"}`}>
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold tracking-wide">{item.label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
