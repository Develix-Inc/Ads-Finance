"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/admin";
import { ArrowLeft, User, Building, Bell, Shield, CheckCircle2, Eye, EyeOff, Key } from "lucide-react";
import Swal from "sweetalert2";

const SWAL = { background: "#ffffff", color: "#0f172a", customClass: { popup: "!rounded-2xl !border !border-slate-200 !shadow-xl", confirmButton: "!rounded-xl px-6 py-2 !bg-primary" } };
type Tab = "profile" | "bank" | "pin" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab]         = useState<Tab>("profile");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // form states
  const [displayName, setDisplayName]     = useState("");
  const [bankName, setBankName]           = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName]     = useState("");

  // PIN states
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin]         = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin]       = useState(false);
  const [hasPin, setHasPin]         = useState(false);

  // notif prefs
  const [notifPrefs, setNotifPrefs] = useState({ payments: true, withdrawals: true, tasks: true, referrals: true, announcements: true });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      const p = await getUserProfile(u.uid);
      setProfile(p);
      setDisplayName(p?.displayName || u.displayName || "");
      setBankName(p?.bankName || "");
      setAccountNumber(p?.accountNumber || "");
      setAccountName(p?.accountName || "");
      setNotifPrefs(p?.notifPrefs ?? { payments: true, withdrawals: true, tasks: true, referrals: true, announcements: true });
      setHasPin(!!p?.withdrawalPin);
    });
    return unsub;
  }, [router]);

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile(user, { displayName });
      await upsertUserProfile(user.uid, { displayName });
      flash();
    } catch { Swal.fire({ ...SWAL, icon: "error", title: "Failed to save profile" }); }
    setSaving(false);
  }

  async function saveBank() {
    if (!bankName || !accountNumber || !accountName) {
      Swal.fire({ ...SWAL, icon: "warning", title: "All fields required" }); return;
    }
    if (accountNumber.length !== 10 || isNaN(Number(accountNumber))) {
      Swal.fire({ ...SWAL, icon: "warning", title: "Account number must be 10 digits" }); return;
    }
    setSaving(true);
    await upsertUserProfile(user.uid, { bankName, accountNumber, accountName });
    flash(); setSaving(false);
  }

  async function savePin() {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      Swal.fire({ ...SWAL, icon: "warning", title: "PIN must be exactly 4 digits" }); return;
    }
    if (newPin !== confirmPin) {
      Swal.fire({ ...SWAL, icon: "warning", title: "PINs do not match" }); return;
    }
    // if user has an existing PIN, verify it first
    if (hasPin) {
      if (!currentPin) {
        Swal.fire({ ...SWAL, icon: "warning", title: "Enter your current PIN to change it" }); return;
      }
      if (profile?.withdrawalPin !== currentPin) {
        Swal.fire({ ...SWAL, icon: "error", title: "Current PIN is incorrect" }); return;
      }
    }
    setSaving(true);
    await upsertUserProfile(user.uid, { withdrawalPin: newPin });
    setHasPin(true);
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
    Swal.fire({ ...SWAL, icon: "success", title: hasPin ? "PIN Updated!" : "Withdrawal PIN Set!", text: "This PIN is required every time you request a withdrawal." });
    setSaving(false);
  }

  async function saveNotifPrefs() {
    setSaving(true);
    await upsertUserProfile(user.uid, { notifPrefs });
    flash(); setSaving(false);
  }

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "profile",       label: "Profile",         icon: User },
    { id: "bank",          label: "Bank Account",    icon: Building },
    { id: "pin",           label: "Withdrawal PIN",  icon: Key },
    { id: "notifications", label: "Notifications",   icon: Bell },
  ];

  if (!user) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-slate-900 pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl px-4 md:px-8 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Settings</h1>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        {/* tabs */}
        <div className="flex gap-2 bg-white border border-slate-200 shadow-sm rounded-2xl p-1.5 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-1 justify-center ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
            <h2 className="font-bold text-slate-900 text-base">Profile Information</h2>
            
            {/* Avatar display */}
            <div className="flex items-center gap-5 py-2 border-b border-slate-100 pb-6">
              {profile?.photoURL || user?.photoURL ? (
                <Image src={profile?.photoURL || user?.photoURL} alt={displayName} width={72} height={72} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-slate-200 shadow-sm" />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 text-2xl shadow-sm">
                  {(displayName || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-base font-bold text-slate-900">{displayName || "Premium Member"}</p>
                <p className="text-sm font-medium text-slate-500">{user?.email || "No email"}</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Display Name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Email / Phone</label>
                <input value={user?.email || user?.phoneNumber || ""} disabled
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 text-sm font-medium cursor-not-allowed" />
                <p className="text-xs font-medium text-slate-400 mt-1.5">Cannot be changed.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Referral Code</label>
                <input value={profile?.referralCode || "—"} disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-primary text-sm font-mono font-bold cursor-not-allowed tracking-wider" />
              </div>
              <button onClick={saveProfile} disabled={saving}
                className="w-full py-4 mt-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm transition-colors shadow-sm">
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </div>
        )}

        {/* BANK */}
        {tab === "bank" && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Withdrawal Bank Account</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">This account receives all your withdrawals. Ensure details are exactly correct.</p>
            </div>
            
            <div className="space-y-5">
              {[
                { label: "Bank Name",      val: bankName,      set: setBankName,      ph: "e.g. GTBank, Access, UBA" },
                { label: "Account Number", val: accountNumber, set: setAccountNumber, ph: "10-digit account number", max: 10 },
                { label: "Account Name",   val: accountName,   set: setAccountName,   ph: "Account holder full name" },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{f.label}</label>
                  <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} maxLength={f.max}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              ))}
              <button onClick={saveBank} disabled={saving}
                className="w-full py-4 mt-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm transition-colors shadow-sm">
                {saving ? "Saving…" : "Save Bank Details"}
              </button>
            </div>
          </div>
        )}

        {/* WITHDRAWAL PIN */}
        {tab === "pin" && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-base">Withdrawal PIN</h2>
                <p className="text-sm font-medium text-slate-500 mt-0.5">{hasPin ? "Change your 4-digit withdrawal security PIN" : "Set a 4-digit PIN required for all withdrawals"}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <p className="text-amber-800 text-xs font-medium leading-relaxed">
                This PIN protects your withdrawals. You will be asked to enter it every time you request a payout. Keep it secret.
              </p>
            </div>

            <div className="space-y-5">
              {hasPin && (
                <div className="relative">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Current PIN</label>
                  <input type={showPin ? "text" : "password"} value={currentPin} onChange={e => setCurrentPin(e.target.value.slice(0, 4))}
                    placeholder="••••" maxLength={4} inputMode="numeric"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-900 text-sm text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              )}

              <div className="relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">{hasPin ? "New PIN" : "Set PIN"}</label>
                <input type={showPin ? "text" : "password"} value={newPin} onChange={e => setNewPin(e.target.value.slice(0, 4))}
                  placeholder="••••" maxLength={4} inputMode="numeric"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 text-slate-900 text-sm text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
                <button onClick={() => setShowPin(p => !p)} className="absolute right-4 top-10 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Confirm PIN</label>
                <input type={showPin ? "text" : "password"} value={confirmPin} onChange={e => setConfirmPin(e.target.value.slice(0, 4))}
                  placeholder="••••" maxLength={4} inputMode="numeric"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm text-center tracking-[0.5em] font-mono font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>

              <button onClick={savePin} disabled={saving}
                className="w-full py-4 mt-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm transition-colors shadow-sm">
                {saving ? "Saving…" : hasPin ? "Update PIN" : "Set Withdrawal PIN"}
              </button>
            </div>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8 space-y-6">
            <h2 className="font-bold text-slate-900 text-base">Notification Preferences</h2>
            <div className="space-y-2">
              {(Object.keys(notifPrefs) as (keyof typeof notifPrefs)[]).map(k => (
                <label key={k} className="flex items-center justify-between py-4 border-b border-slate-100 cursor-pointer">
                  <span className="text-sm font-bold capitalize text-slate-700">{k.charAt(0).toUpperCase() + k.slice(1)} notifications</span>
                  <button onClick={() => setNotifPrefs(p => ({ ...p, [k]: !p[k] }))}
                    className={`relative w-12 h-6 rounded-full transition-colors shadow-inner ${notifPrefs[k] ? "bg-primary" : "bg-slate-200"}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifPrefs[k] ? "left-7" : "left-1"}`} />
                  </button>
                </label>
              ))}
            </div>
            <button onClick={saveNotifPrefs} disabled={saving}
              className="w-full py-4 mt-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-bold text-sm transition-colors shadow-sm">
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
