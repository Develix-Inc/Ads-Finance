"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { auth } from "@/lib/firebase";
import { upsertUserProfile } from "@/lib/admin";
import { sendNotification } from "@/lib/notifications";
import { generateReferralCode, processReferralSignup } from "@/lib/referrals";

const SWAL_LIGHT = {
  background: "#ffffff",
  color: "#0f172a",
  confirmButtonColor: "#0f172a", // slate-900 (primary)
  cancelButtonColor: "#f1f5f9", // slate-100
  customClass: {
    popup: "!rounded-[24px] !border !border-slate-200 !shadow-xl",
    confirmButton: "!rounded-xl !px-8 !py-3 !font-bold !text-sm !text-white",
    cancelButton: "!rounded-xl !px-8 !py-3 !font-semibold !text-sm !text-slate-900",
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
    /* ── Step 1: Welcome & Skip Option ── */
    const welcomeResult = await Swal.fire({
      ...SWAL_LIGHT,
      title: "Welcome to AdsFinance",
      html: `
        <div style="text-align:center; padding: 8px 0">
          <img src="/logo.png" style="width:80px; margin: 0 auto 16px; display:block" onerror="this.style.display='none'"/>
          <p style="color:#64748b; font-size:15px; line-height:1.6">
            You're about to join an <strong style="color:#0f172a">institutional-grade</strong> digital engagement network.<br/><br/>
            We'll set up your account in a few quick steps.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Let's Go →",
      cancelButtonText: "Skip Setup ✕",
      allowOutsideClick: false,
    });

    if (welcomeResult.isDismissed || welcomeResult.dismiss === Swal.DismissReason.cancel) {
      await saveProfileAndFinish(
        "passive_income",
        "10_mins",
        "Pending Setup",
        "0000000000",
        "Pending Setup"
      );
      
      await Swal.fire({
        ...SWAL_LIGHT,
        icon: "success",
        title: "Setup Skipped",
        html: `<p style="color:#64748b; font-size:15px">Your account has been initialized with basic defaults. You can update your bank settings anytime under Profile Settings.</p>`,
        showCancelButton: true,
        confirmButtonText: "⚡ Upgrade Plan",
        cancelButtonText: "📅 Go to Dashboard",
        allowOutsideClick: false,
      }).then(r => {
        onComplete();
        if (r.isConfirmed) {
          router.push("/upgrade");
        } else {
          router.push("/dashboard");
        }
      });
      return;
    }

    /* ── Step 2: Primary Goal ── */
    const goalResult = await Swal.fire({
      ...SWAL_LIGHT,
      title: "What's your primary goal?",
      html: `
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px; text-align:left">
          ${["Earn passive income", "Save for a specific goal", "Just exploring"].map((g, i) => `
            <label style="display:flex; align-items:center; gap:12px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; cursor:pointer; transition:all 0.2s">
              <input type="radio" name="goal" value="${["passive_income","savings","exploring"][i]}" style="accent-color:#0f172a; width:20px; height:20px"/>
              <span style="color:#334155; font-size:15px; font-weight:600">${g}</span>
            </label>
          `).join("")}
        </div>
      `,
      confirmButtonText: "Next →",
      showCancelButton: true,
      cancelButtonText: "Skip Setup ✕",
      allowOutsideClick: false,
      preConfirm: () => {
        const val = (document.querySelector('input[name="goal"]:checked') as HTMLInputElement)?.value;
        if (!val) { Swal.showValidationMessage("Please select an option"); return false; }
        return val;
      },
    });

    if (goalResult.isDismissed || goalResult.dismiss === Swal.DismissReason.cancel) {
      await saveProfileAndFinish("passive_income", "10_mins", "Pending Setup", "0000000000", "Pending Setup");
      onComplete();
      router.push("/dashboard");
      return;
    }
    const investmentGoal = goalResult.value;

    /* ── Step 3: Time Commitment ── */
    const timeResult = await Swal.fire({
      ...SWAL_LIGHT,
      title: "How much time can you dedicate daily?",
      html: `
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px; text-align:left">
          ${[
            { label: "Less than 10 mins (Casual)", val: "less_10" },
            { label: "10-30 mins (Active)", val: "10_30" },
            { label: "1 hour+ (Power User)", val: "1_hour" },
          ].map(r => `
            <label style="display:flex; align-items:center; gap:12px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; cursor:pointer; transition:all 0.2s">
              <input type="radio" name="time" value="${r.val}" style="accent-color:#0f172a; width:20px; height:20px"/>
              <span style="color:#334155; font-size:15px; font-weight:600">${r.label}</span>
            </label>
          `).join("")}
        </div>
      `,
      confirmButtonText: "Next →",
      showCancelButton: true,
      cancelButtonText: "Skip Setup ✕",
      allowOutsideClick: false,
      preConfirm: () => {
        const val = (document.querySelector('input[name="time"]:checked') as HTMLInputElement)?.value;
        if (!val) { Swal.showValidationMessage("Please select an option"); return false; }
        return val;
      },
    });

    if (timeResult.isDismissed || timeResult.dismiss === Swal.DismissReason.cancel) {
      await saveProfileAndFinish(investmentGoal, "10_mins", "Pending Setup", "0000000000", "Pending Setup");
      onComplete();
      router.push("/dashboard");
      return;
    }
    const timeCommitment = timeResult.value;

    /* ── Step 4: Bank Account Setup ── */
    const bankResult = await Swal.fire({
      ...SWAL_LIGHT,
      title: "Set up your withdrawal account",
      html: `
        <p style="color:#64748b; font-size:14px; margin-bottom:20px">This is where your earnings will be sent. You can update this later in Settings.</p>
        <div style="display:flex; flex-direction:column; gap:16px; text-align:left">
          <div>
            <label style="color:#94a3b8; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em">Bank Name</label>
            <input id="swal-bank" placeholder="e.g. GTBank, Access, UBA" style="width:100%; margin-top:8px; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; color:#0f172a; font-size:15px; font-weight:500; outline:none; box-sizing:border-box"/>
          </div>
          <div>
            <label style="color:#94a3b8; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em">Account Number</label>
            <input id="swal-accnum" placeholder="10-digit account number" maxlength="10" style="width:100%; margin-top:8px; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; color:#0f172a; font-size:15px; font-weight:500; outline:none; box-sizing:border-box"/>
          </div>
          <div>
            <label style="color:#94a3b8; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em">Account Name</label>
            <input id="swal-accname" placeholder="Account holder name" style="width:100%; margin-top:8px; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; color:#0f172a; font-size:15px; font-weight:500; outline:none; box-sizing:border-box"/>
          </div>
        </div>
      `,
      confirmButtonText: "Save & Continue →",
      showCancelButton: true,
      cancelButtonText: "Skip Setup ✕",
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

    if (bankResult.isDismissed || bankResult.dismiss === Swal.DismissReason.cancel) {
      await saveProfileAndFinish(investmentGoal, timeCommitment, "Pending Setup", "0000000000", "Pending Setup");
      onComplete();
      router.push("/dashboard");
      return;
    }
    const { bankName, accountNumber, accountName } = bankResult.value;

    /* ── Save to Firestore ── */
    await saveProfileAndFinish(investmentGoal, timeCommitment, bankName, accountNumber, accountName);

    /* ── Step 5: All done → go to upgrade ── */
    const choiceResult = await Swal.fire({
      ...SWAL_LIGHT,
      icon: "success",
      title: "Profile Complete!",
      html: `<p style="color:#64748b; font-size:15px">Your account has been successfully set up.<br/><br/>Choose to activate your Premium Plan now, or head straight to the dashboard to look around.</p>`,
      showCancelButton: true,
      confirmButtonText: "⚡ Activate Premium",
      cancelButtonText: "📅 Pay Later (Dashboard)",
      allowOutsideClick: false,
    });

    onComplete();
    if (choiceResult.isConfirmed) {
      router.push("/upgrade");
    } else {
      router.push("/dashboard");
    }
  }

  async function saveProfileAndFinish(goal: string, time: string, bank: string, accnum: string, accname: string) {
    try {
      const currentUser = auth.currentUser;
      const referralCode = generateReferralCode(uid);
      await upsertUserProfile(uid, {
        email: userEmail,
        displayName: currentUser?.displayName || userEmail.split("@")[0],
        photoURL: currentUser?.photoURL || "",
        investmentGoal: goal,
        riskLevel: time, // Repurposing 'riskLevel' field in DB to store time commitment instead
        bankName: bank,
        accountNumber: accnum,
        accountName: accname,
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
        `Your profile is set up. Your referral code is ${referralCode}. Now activate a Premium Plan to start earning.`,
        "success"
      );
      // process referral if someone referred this user
      const pendingRef = localStorage.getItem("pendingRef");
      if (pendingRef) {
        await processReferralSignup(uid, pendingRef);
        localStorage.removeItem("pendingRef");
      }
      // Mark onboarding done locally so next login is instant
      localStorage.setItem(`onboarding_${uid}`, "done");
    } catch (e) {
      console.error("Firestore save error", e);
    }
  }

  return null; // wizard is fully SweetAlert driven
}
