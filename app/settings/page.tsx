"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/admin";
import { FaArrowLeft, FaUser, FaBuildingColumns, FaBell, FaLock, FaCircleCheck, FaEye, FaEyeSlash } from "react-icons/fa6";
import Swal from "sweetalert2";

const SWAL = { background: "#020617", color: "#f8fafc", customClass: { popup: "!rounded-2xl !border !border-white/10", confirmButton: "!rounded-full !bg-teal-600" } };
type Tab = "profile" | "bank" | "security" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab]         = useState<Tab>("profile");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [showPw, setShowPw]   = useState(false);

  // form states
  const [displayName, setDisplayName]   = useState("");
  const [bankName, setBankName]         = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName]   = useState("");
  const [currentPw, setCurrentPw]       = useState("");
  const [newPw, setNewPw]               = useState("");
  const [notifPrefs, setNotifPrefs]     = useState({ payments: true, withdrawals: true, tasks: true, referrals: true, announcements: true });

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

  async function changePw() {
    if (!currentPw || !newPw || newPw.length < 6) {
      Swal.fire({ ...SWAL, icon: "warning", title: "Password must be at least 6 characters" }); return;
    }
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPw);
      setCurrentPw(""); setNewPw("");
      Swal.fire({ ...SWAL, icon: "success", title: "Password Updated!" });
    } catch (e: any) {
      Swal.fire({ ...SWAL, icon: "error", title: "Failed", text: e.message?.includes("wrong-password") ? "Current password is incorrect." : e.message });
    }
    setSaving(false);
  }

  async function saveNotifPrefs() {
    setSaving(true);
    await upsertUserProfile(user.uid, { notifPrefs });
    flash(); setSaving(false);
  }

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "profile",       label: "Profile",       icon: FaUser },
    { id: "bank",          label: "Bank Account",  icon: FaBuildingColumns },
    { id: "security",      label: "Security",      icon: FaLock },
    { id: "notifications", label: "Notifications", icon: FaBell },
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${tab === t.id ? "bg-teal-500 text-slate-950" : "text-slate-400 hover:text-white"}`}>
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* profile */}
        {tab === "profile" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <h2 className="font-bold text-base">Profile Information</h2>
            {[
              { label: "Display Name", val: displayName, set: setDisplayName, ph: "Your name" },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
            ))}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Email</label>
              <input value={user?.email || user?.phoneNumber || ""} disabled
                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed" />
              <p className="text-xs text-slate-600 mt-1">Email cannot be changed.</p>
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-colors">
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}

        {/* bank */}
        {tab === "bank" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <h2 className="font-bold text-base">Withdrawal Bank Account</h2>
            <p className="text-slate-400 text-xs">This account receives your withdrawals. Ensure details are correct before saving.</p>
            {[
              { label: "Bank Name",      val: bankName,       set: setBankName,       ph: "e.g. GTBank, Access, UBA" },
              { label: "Account Number", val: accountNumber,  set: setAccountNumber,  ph: "10-digit account number",  max: 10 },
              { label: "Account Name",   val: accountName,    set: setAccountName,    ph: "Account holder name" },
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

        {/* security */}
        {tab === "security" && (
          <div className="bg-slate-900 border border-white/10 rounded-[22px] p-6 space-y-4">
            <h2 className="font-bold text-base">Change Password</h2>
            {!user?.email ? (
              <p className="text-slate-400 text-sm">Password change is only available for email accounts.</p>
            ) : (
              <>
                {[
                  { label: "Current Password", val: currentPw, set: setCurrentPw },
                  { label: "New Password",      val: newPw,    set: setNewPw },
                ].map(f => (
                  <div key={f.label} className="relative">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{f.label}</label>
                    <input type={showPw ? "text" : "password"} value={f.val} onChange={e => f.set(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white text-sm focus:outline-none focus:border-teal-500 transition-colors" />
                    <button onClick={() => setShowPw(p => !p)} className="absolute right-4 top-9 text-slate-500 hover:text-white transition-colors">
                      {showPw ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
                <button onClick={changePw} disabled={saving}
                  className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black text-sm transition-colors">
                  {saving ? "Updating…" : "Update Password"}
                </button>
              </>
            )}
          </div>
        )}

        {/* notifications */}
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
