"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import styles from "./styles.module.css";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { getUserProfile, upsertUserProfile } from "@/lib/admin";
import { ArrowLeft, User, Building, Bell, Shield, CheckCircle2, Eye, EyeOff, Key } from "lucide-react";
import Swal from "sweetalert2";

const SWAL = { background: "#ffffff", color: "#0f172a", customClass: { popup: "!rounded-2xl !border !border-slate-200 !shadow-xl", confirmButton: "!rounded-xl px-6 py-2 !bg-[#059669]" } };
type Tab = "profile" | "bank" | "pin" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab]         = useState<Tab>("profile");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // read initial tab from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab") as Tab;
      if (t && ["profile", "bank", "pin", "notifications"].includes(t)) {
        setTab(t);
      }
    }
  }, []);

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

  const TABS: Record<Tab, { label: string }> = {
    profile: { label: "Personal Information" },
    bank: { label: "Payment Methods" },
    pin: { label: "Security" },
    notifications: { label: "Notifications" },
  };

  if (!user) return <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/profile" className={styles.backBtn}>
          <ArrowLeft size={16} strokeWidth={2.5} />
        </Link>
        <h1 className={styles.pageTitle}>{TABS[tab].label}</h1>
        {saved && (
          <div className={styles.savedPill}>
            <CheckCircle2 size={14} strokeWidth={3} /> Saved
          </div>
        )}
      </header>

      <main className={styles.content}>

        {/* PROFILE */}
        {tab === "profile" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <User size={24} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Profile Information</h2>
                <p className={styles.cardSubtitle}>Update your personal details</p>
              </div>
            </div>
            
            {/* Avatar display */}
            <div className={styles.avatarEditRow}>
              {profile?.photoURL || user?.photoURL ? (
                <Image src={profile?.photoURL || user?.photoURL} alt={displayName} width={72} height={72} className={styles.avatarDisplay} />
              ) : (
                <div className={styles.avatarDisplay}>
                  {(displayName || "U")[0].toUpperCase()}
                </div>
              )}
              <div className={styles.avatarInfo}>
                <p className={styles.avatarName}>{displayName || "Premium Member"}</p>
                <p className={styles.avatarEmail}>{user?.email || "No email"}</p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email / Phone</label>
              <input value={user?.email || user?.phoneNumber || ""} disabled className={styles.input} />
              <p className={styles.helperText}>Cannot be changed.</p>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Referral Code</label>
              <input value={profile?.referralCode || "—"} disabled className={styles.input} style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1765DC' }} />
            </div>
            
            <button onClick={saveProfile} disabled={saving} className={styles.submitBtn}>
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        )}

        {/* BANK */}
        {tab === "bank" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <Building size={24} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Withdrawal Bank Account</h2>
                <p className={styles.cardSubtitle}>This account receives all your withdrawals</p>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Bank Name</label>
              <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank, Access, UBA" className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Account Number</label>
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10-digit account number" maxLength={10} className={styles.input} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Account Name</label>
              <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account holder full name" className={styles.input} />
            </div>
            
            <button onClick={saveBank} disabled={saving} className={styles.submitBtn}>
              {saving ? "Saving…" : "Save Bank Details"}
            </button>
          </div>
        )}

        {/* WITHDRAWAL PIN */}
        {tab === "pin" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <Shield size={24} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Withdrawal PIN</h2>
                <p className={styles.cardSubtitle}>{hasPin ? "Change your 4-digit security PIN" : "Set a 4-digit PIN required for all withdrawals"}</p>
              </div>
            </div>

            <div className={styles.warningBanner}>
              <p className={styles.warningText}>
                This PIN protects your withdrawals. You will be asked to enter it every time you request a payout. Keep it secret.
              </p>
            </div>

            {hasPin && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Current PIN</label>
                <div className={styles.inputWrap}>
                  <input type={showPin ? "text" : "password"} value={currentPin} onChange={e => setCurrentPin(e.target.value.slice(0, 4))}
                    placeholder="••••" maxLength={4} inputMode="numeric" className={`${styles.input} ${styles.inputPin}`} />
                </div>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>{hasPin ? "New PIN" : "Set PIN"}</label>
              <div className={styles.inputWrap}>
                <input type={showPin ? "text" : "password"} value={newPin} onChange={e => setNewPin(e.target.value.slice(0, 4))}
                  placeholder="••••" maxLength={4} inputMode="numeric" className={`${styles.input} ${styles.inputPin}`} />
                <button onClick={() => setShowPin(p => !p)} className={styles.eyeBtn}>
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Confirm PIN</label>
              <div className={styles.inputWrap}>
                <input type={showPin ? "text" : "password"} value={confirmPin} onChange={e => setConfirmPin(e.target.value.slice(0, 4))}
                  placeholder="••••" maxLength={4} inputMode="numeric" className={`${styles.input} ${styles.inputPin}`} />
              </div>
            </div>

            <button onClick={savePin} disabled={saving} className={styles.submitBtn}>
              {saving ? "Saving…" : hasPin ? "Update PIN" : "Set Withdrawal PIN"}
            </button>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrap}>
                <Bell size={24} />
              </div>
              <div>
                <h2 className={styles.cardTitle}>Notification Preferences</h2>
                <p className={styles.cardSubtitle}>Manage your alerts and emails</p>
              </div>
            </div>

            <div className={styles.notifList}>
              {(Object.keys(notifPrefs) as (keyof typeof notifPrefs)[]).map(k => (
                <div key={k} className={styles.notifRow} onClick={() => setNotifPrefs(p => ({ ...p, [k]: !p[k] }))}>
                  <span className={styles.notifLabel}>{k}</span>
                  <button className={`${styles.toggleSwitch} ${notifPrefs[k] ? styles.active : ""}`}>
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
              ))}
            </div>

            <button onClick={saveNotifPrefs} disabled={saving} className={styles.submitBtn}>
              {saving ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
