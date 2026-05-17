"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { upsertUserProfile } from "@/lib/admin";
import { sendNotification } from "@/lib/notifications";
import { generateReferralCode } from "@/lib/referrals";

const SWAL_DARK = {
  background: "#020617",
  color: "#f8fafc",
  confirmButtonColor: "#14b8a6",
  cancelButtonColor: "#1e293b",
  customClass: {
    popup: "!rounded-[24px] !border !border-white/10 !shadow-2xl",
    confirmButton: "!rounded-full !px-8 !py-3 !font-bold !text-sm",
    cancelButton: "!rounded-full !px-8 !py-3 !font-semibold !text-sm",
  },
};

interface Props {
  uid: string;
  userEmail: string;
  onComplete: () => void;
}

export function OnboardingWizard({ uid, userEmail, onComplete }: Props) {
  const router = useRouter();

  useEffect(() => {
    runWizard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runWizard() {
    /* ── Step 1: Welcome ── */
    await Swal.fire({
      ...SWAL_DARK,
      title: "Welcome to AdsFinance",
      html: `
        <div style="text-align:center; padding: 8px 0">
          <img src="/logo-transparent.png" style="width:80px; margin: 0 auto 16px; display:block" onerror="this.style.display='none'"/>
          <p style="color:#94a3b8; font-size:14px; line-height:1.6">
            You're about to join an <strong style="color:#fff">institutional-grade</strong> digital engagement network.<br/><br/>
            We'll set up your Validator Node in a few quick steps.
          </p>
        </div>
      `,
      confirmButtonText: "Let's Go →",
      showCancelButton: false,
      allowOutsideClick: false,
    });

    /* ── Step 2: Investment Goal ── */
    const goalResult = await Swal.fire({
      ...SWAL_DARK,
      title: "What's your investment goal?",
      html: `
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px; text-align:left">
          ${["Passive Income", "Full-Time Income", "Capital Growth & Savings"].map((g, i) => `
            <label style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; cursor:pointer">
              <input type="radio" name="goal" value="${["passive_income","full_time","savings"][i]}" style="accent-color:#14b8a6; width:18px; height:18px"/>
              <span style="color:#e2e8f0; font-size:14px; font-weight:600">${g}</span>
            </label>
          `).join("")}
        </div>
      `,
      confirmButtonText: "Next →",
      showCancelButton: false,
      allowOutsideClick: false,
      preConfirm: () => {
        const val = (document.querySelector('input[name="goal"]:checked') as HTMLInputElement)?.value;
        if (!val) { Swal.showValidationMessage("Please select an option"); return false; }
        return val;
      },
    });
    if (!goalResult.isConfirmed) return;
    const investmentGoal = goalResult.value;

    /* ── Step 3: Risk Level ── */
    const riskResult = await Swal.fire({
      ...SWAL_DARK,
      title: "Your risk appetite?",
      html: `
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px; text-align:left">
          ${[
            { label: "Conservative — steady, low risk", val: "conservative" },
            { label: "Moderate — balanced growth", val: "moderate" },
            { label: "Aggressive — max yield, higher risk", val: "aggressive" },
          ].map(r => `
            <label style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:14px; cursor:pointer">
              <input type="radio" name="risk" value="${r.val}" style="accent-color:#14b8a6; width:18px; height:18px"/>
              <span style="color:#e2e8f0; font-size:14px; font-weight:600">${r.label}</span>
            </label>
          `).join("")}
        </div>
      `,
      confirmButtonText: "Next →",
      showCancelButton: false,
      allowOutsideClick: false,
      preConfirm: () => {
        const val = (document.querySelector('input[name="risk"]:checked') as HTMLInputElement)?.value;
        if (!val) { Swal.showValidationMessage("Please select an option"); return false; }
        return val;
      },
    });
    if (!riskResult.isConfirmed) return;
    const riskLevel = riskResult.value;

    /* ── Step 4: Bank Account Setup ── */
    const bankResult = await Swal.fire({
      ...SWAL_DARK,
      title: "Set up your withdrawal account",
      html: `
        <p style="color:#94a3b8; font-size:13px; margin-bottom:16px">This is where your earnings will be sent. You can update this in Settings.</p>
        <div style="display:flex; flex-direction:column; gap:10px; text-align:left">
          <div>
            <label style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em">Bank Name</label>
            <input id="swal-bank" placeholder="e.g. GTBank, Access, UBA" style="width:100%; margin-top:6px; padding:12px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#fff; font-size:14px; outline:none; box-sizing:border-box"/>
          </div>
          <div>
            <label style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em">Account Number</label>
            <input id="swal-accnum" placeholder="10-digit account number" maxlength="10" style="width:100%; margin-top:6px; padding:12px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#fff; font-size:14px; outline:none; box-sizing:border-box"/>
          </div>
          <div>
            <label style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em">Account Name</label>
            <input id="swal-accname" placeholder="Account holder name" style="width:100%; margin-top:6px; padding:12px 14px; background:#0f172a; border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:#fff; font-size:14px; outline:none; box-sizing:border-box"/>
          </div>
        </div>
      `,
      confirmButtonText: "Save & Continue →",
      showCancelButton: false,
      allowOutsideClick: false,
      preConfirm: () => {
        const bank    = (document.getElementById("swal-bank") as HTMLInputElement)?.value.trim();
        const accnum  = (document.getElementById("swal-accnum") as HTMLInputElement)?.value.trim();
        const accname = (document.getElementById("swal-accname") as HTMLInputElement)?.value.trim();
        if (!bank || !accnum || !accname) { Swal.showValidationMessage("All fields are required"); return false; }
        if (accnum.length !== 10 || isNaN(Number(accnum))) { Swal.showValidationMessage("Account number must be 10 digits"); return false; }
        return { bankName: bank, accountNumber: accnum, accountName: accname };
      },
    });
    if (!bankResult.isConfirmed) return;
    const { bankName, accountNumber, accountName } = bankResult.value;

    /* ── Save to Firestore ── */
    try {
      const referralCode = generateReferralCode(uid);
      await upsertUserProfile(uid, {
        email: userEmail,
        investmentGoal,
        riskLevel,
        bankName,
        accountNumber,
        accountName,
        onboardingComplete: true,
        referralCode,
        walletBalance: 0,
        totalEarned: 0,
        dailyTaskEarnings: 0,
        salesCommission: 0,
        nodeStatus: "none",
        nodeTier: null,
        accountStatus: "active",
        createdAt: new Date().toISOString(),
      });
      // welcome notification
      await sendNotification(
        uid,
        "Welcome to AdsFinance!",
        `Your profile is set up. Your referral code is ${generateReferralCode(uid)}. Now activate a Validator Node to start earning.`,
        "success"
      );
    } catch (e) {
      console.error("Firestore save error", e);
    }

    /* ── Step 5: All done → go to upgrade ── */
    await Swal.fire({
      ...SWAL_DARK,
      icon: "success",
      title: "Profile Complete!",
      html: `<p style="color:#94a3b8; font-size:14px">Now choose a <strong style="color:#fff">Validator Node</strong> to activate your account and start earning.</p>`,
      confirmButtonText: "Choose My Node →",
      showCancelButton: false,
      allowOutsideClick: false,
    });

    onComplete();
    router.push("/upgrade");
  }

  return null; // wizard is fully SweetAlert driven
}
