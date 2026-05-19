"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/admin";
import { FaArrowLeft, FaUser, FaBuildingColumns, FaBell, FaShield, FaCircleCheck, FaEye, FaEyeSlash, FaKey } from "react-icons/fa6";
import Swal from "sweetalert2";

const SWAL = { background: "#020617", color: "#f8fafc", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-600" } };
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
    { id: "profile",       label: "Profile",         icon: FaUser },
    { id: "bank",          label: "Bank Account",    icon: FaBuildingColumns },
    { id: "pin",           label: "Withdrawal PIN",  icon: FaKey },
    { id: "notifications", label: "Notifications",   icon: FaBell },
  ];

  if (!user) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-10">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl px-5 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white tracking-tight">Settings</h1>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <FaCircleCheck className="w-3.5 h-3.5" /> Saved
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* tabs */}
        <div className="flex gap-1 bg-slate-900 border border-white/10 rounded-2xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${tab === t.id ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"}`}>
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* PROFILE */}
        {tab === "profile" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <h2 className="font-bold text-base">Profile Information</h2>
            
            {/* Avatar display */}
            <div className="flex items-center gap-4 py-2 border-b border-white/5 pb-4">
              {profile?.photoURL || user?.photoURL ? (
                <img src={profile?.photoURL || user?.photoURL} alt={displayName} className="w-16 h-16 rounded-full object-cover border-2 border-teal-500/30 shadow-lg" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-slate-800 flex items-center justify-center font-black text-white text-2xl shadow-lg">
                  {(displayName || "V")[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-white">{displayName || "Validator Node Owner"}</p>
                <p className="text-xs text-slate-500">{user?.email || "No email"}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Email / Phone</label>
              <input value={user?.email || user?.phoneNumber || ""} disabled
                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed" />
              <p className="text-xs text-slate-600 mt-1">Cannot be changed.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Referral Code</label>
              <input value={profile?.referralCode || "—"} disabled
                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-teal-400 text-sm font-mono font-bold cursor-not-allowed" />
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-colors">
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}

        {/* BANK */}
        {tab === "bank" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <h2 className="font-bold text-base">Withdrawal Bank Account</h2>
            <p className="text-slate-400 text-xs">This account receives all your withdrawals. Ensure details are exactly correct.</p>
            {[
              { label: "Bank Name",      val: bankName,      set: setBankName,      ph: "e.g. GTBank, Access, UBA" },
              { label: "Account Number", val: accountNumber, set: setAccountNumber, ph: "10-digit account number", max: 10 },
              { label: "Account Name",   val: accountName,   set: setAccountName,   ph: "Account holder full name" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} maxLength={f.max}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
            ))}
            <button onClick={saveBank} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-colors">
              {saving ? "Saving…" : "Save Bank Details"}
            </button>
          </div>
        )}

        {/* WITHDRAWAL PIN */}
        {tab === "pin" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <FaShield className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h2 className="font-bold text-base">Withdrawal PIN</h2>
                <p className="text-xs text-slate-400">{hasPin ? "Change your 4-digit withdrawal security PIN" : "Set a 4-digit PIN required for all withdrawals"}</p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-amber-300 text-xs leading-relaxed">
                This PIN protects your withdrawals. You will be asked to enter it every time you request a payout. Keep it secret.
              </p>
            </div>

            {hasPin && (
              <div className="relative">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Current PIN</label>
                <input type={showPin ? "text" : "password"} value={currentPin} onChange={e => setCurrentPin(e.target.value.slice(0, 4))}
                  placeholder="••••" maxLength={4} inputMode="numeric"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm text-center tracking-widest font-mono focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
            )}

            <div className="relative">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{hasPin ? "New PIN" : "Set PIN"}</label>
              <input type={showPin ? "text" : "password"} value={newPin} onChange={e => setNewPin(e.target.value.slice(0, 4))}
                placeholder="••••" maxLength={4} inputMode="numeric"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm text-center tracking-widest font-mono focus:outline-none focus:border-teal-500 transition-colors" />
              <button onClick={() => setShowPin(p => !p)} className="absolute right-4 top-9 text-slate-500 hover:text-white transition-colors">
                {showPin ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Confirm PIN</label>
              <input type={showPin ? "text" : "password"} value={confirmPin} onChange={e => setConfirmPin(e.target.value.slice(0, 4))}
                placeholder="••••" maxLength={4} inputMode="numeric"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm text-center tracking-widest font-mono focus:outline-none focus:border-teal-500 transition-colors" />
            </div>

            <button onClick={savePin} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-colors">
              {saving ? "Saving…" : hasPin ? "Update PIN" : "Set Withdrawal PIN"}
            </button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <h2 className="font-bold text-base">Notification Preferences</h2>
            <div className="space-y-3">
              {(Object.keys(notifPrefs) as (keyof typeof notifPrefs)[]).map(k => (
                <label key={k} className="flex items-center justify-between py-3 border-b border-white/5 cursor-pointer">
                  <span className="text-sm font-medium capitalize text-slate-300">{k.charAt(0).toUpperCase() + k.slice(1)} notifications</span>
                  <button onClick={() => setNotifPrefs(p => ({ ...p, [k]: !p[k] }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifPrefs[k] ? "bg-teal-500" : "bg-slate-700"}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${notifPrefs[k] ? "left-6" : "left-1"}`} />
                  </button>
                </label>
              ))}
            </div>
            <button onClick={saveNotifPrefs} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-colors">
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
