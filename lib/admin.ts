import { db } from "./firebase";
import {
  doc, setDoc, updateDoc, getDoc, collection,
  addDoc, serverTimestamp, getDocs, query, orderBy, where, deleteDoc, writeBatch
} from "firebase/firestore";
import { recordTransaction } from "./transactions";
import { sendNotification, broadcastNotification } from "./notifications";
import { payReferralCommission } from "./referrals";

/* ─── Platform config (hardcoded defaults — update in /admin → Settings) ─── */
export const COMPANY_BANK = {
  name:    "Guaranty Trust Bank (GTBank)",
  account: "0123456789",                  // ← REPLACE WITH REAL ACCOUNT
  holder:  "AdsFinance Technologies Ltd", // ← REPLACE WITH REAL NAME
};

export const NODE_PRICES: Record<string, number> = {
  "Alpha": 85000,
  "Alpha Plan": 17000,
  "Sigma": 225000,
  "Sigma Plan": 45000,
  "Omega": 600000,
  "Omega Plan": 120000,
};

export const NODE_MIN_WITHDRAWAL: Record<string, number> = {
  "Alpha": 85000,
  "Alpha Plan": 85000,
  "Sigma": 225000,
  "Sigma Plan": 225000,
  "Omega": 600000,
  "Omega Plan": 600000,
};

export const NODE_MULTIPLIERS: Record<string, number> = {
  "Alpha": 4,
  "Alpha Plan": 4,
  "Sigma": 5,
  "Sigma Plan": 5,
  "Omega": 6,
  "Omega Plan": 6,
};

/* ─── User profile ─── */
export async function upsertUserProfile(uid: string, data: Record<string, any>) {
  await setDoc(doc(db, "users", uid), { uid, ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/* ─── Payments (node upgrades) ─── */
export async function submitPayment(uid: string, userEmail: string, nodeTier: string, refCode: string) {
  const profile = await getUserProfile(uid);
  if (profile?.accountStatus === 'suspended') {
    throw new Error("Your account is suspended. You cannot make payments.");
  }
  const amount = NODE_PRICES[nodeTier] ?? 0;
  const ref    = await addDoc(collection(db, "payments"), {
    uid, userEmail, nodeTier, amount, referenceCode: refCode,
    status: "pending", submittedAt: serverTimestamp(),
    verifiedAt: null, verifiedBy: null, notes: "",
  });
  await upsertUserProfile(uid, { nodeStatus: "pending", nodeTier });

  // notification: payment under review
  await sendNotification(uid,
    "Payment Received — Under Review",
    `Your ${nodeTier} payment of ₦${amount.toLocaleString()} is being reviewed. Please allow a minimum of 24 hours for verification.`,
    "payment"
  );

  return ref.id;
}

/* ─── Withdrawals ─── */
export async function submitWithdrawal(
  uid: string, userEmail: string, amount: number,
  bank: { bankName: string; accountNumber: string; accountName: string }
) {
  const profile = await getUserProfile(uid);
  if (profile?.accountStatus === 'suspended') {
    throw new Error("Your account is suspended. You cannot make withdrawals.");
  }
  
  const tier = profile?.nodeTier || "Alpha Plan";
  const minWithdrawal = NODE_MIN_WITHDRAWAL[tier] || 85000;

  if (amount < minWithdrawal) {
    throw new Error(`Minimum withdrawal for your node tier is ₦${minWithdrawal.toLocaleString()}`);
  }

  // deduct atomically via recordTransaction
  await recordTransaction(uid, "withdrawal", -amount, `Withdrawal request to ${bank.bankName}`);

  const ref = await addDoc(collection(db, "withdrawals"), {
    uid, userEmail, amount, ...bank,
    status: "pending", requestedAt: serverTimestamp(),
    processedAt: null, processedBy: null, notes: "",
  });

  await sendNotification(uid,
    "Withdrawal Request Submitted",
    `Your withdrawal of ₦${amount.toLocaleString()} is pending support review.`,
    "withdrawal"
  );

  return ref.id;
}

/* ═══════════ ADMIN FUNCTIONS ═══════════ */

async function logAdminAction(adminEmail: string, action: string, target: string, meta?: any) {
  await addDoc(collection(db, "admin_logs"), {
    adminEmail, action, target, meta: meta ?? {},
    createdAt: serverTimestamp(),
  });
}

/* users */
export async function adminGetAllUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => d.data());
}

/* payments */
export async function adminGetAllPayments() {
  const snap = await getDocs(query(collection(db, "payments"), orderBy("submittedAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function adminVerifyPayment(paymentId: string, uid: string, nodeTier: string, adminEmail: string) {
  await updateDoc(doc(db, "payments", paymentId), {
    status: "verified", verifiedAt: serverTimestamp(), verifiedBy: adminEmail,
  });
  await upsertUserProfile(uid, {
    nodeStatus: "active", nodeTier, onboardingComplete: true, nodeActivatedAt: serverTimestamp(),
  });

  // pay referral commission if applicable
  await payReferralCommission(uid);

  await sendNotification(uid,
    `Node Activated — ${nodeTier}`,
    `Your ${nodeTier} has been successfully activated! You can now access tasks and start earning.`,
    "success"
  );

  await logAdminAction(adminEmail, "verify_payment", uid, { paymentId, nodeTier });
}

export async function adminRejectPayment(paymentId: string, uid: string, note: string, adminEmail: string) {
  await updateDoc(doc(db, "payments", paymentId), {
    status: "rejected", verifiedAt: serverTimestamp(), verifiedBy: adminEmail, notes: note,
  });
  await upsertUserProfile(uid, { nodeStatus: "none", nodeTier: null });

  await sendNotification(uid,
    "Payment Rejected",
    `Your node payment was rejected. Reason: ${note || "No reason provided"}. Please contact support.`,
    "error"
  );

  await logAdminAction(adminEmail, "reject_payment", uid, { paymentId, note });
}

/* withdrawals */
export async function adminGetWithdrawals() {
  const snap = await getDocs(query(collection(db, "withdrawals"), orderBy("requestedAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function adminProcessWithdrawal(withdrawalId: string, adminEmail: string) {
  await updateDoc(doc(db, "withdrawals", withdrawalId), {
    status: "processed", processedAt: serverTimestamp(), processedBy: adminEmail,
  });

  const snap = await getDoc(doc(db, "withdrawals", withdrawalId));
  const data = snap.data()!;

  await sendNotification(data.uid,
    "Withdrawal Processed",
    `Your withdrawal of ₦${data.amount?.toLocaleString()} has been processed and sent to your bank account.`,
    "success"
  );

  await logAdminAction(adminEmail, "process_withdrawal", data.uid, { withdrawalId, amount: data.amount });
}

export async function adminRejectWithdrawal(withdrawalId: string, adminEmail: string, note: string) {
  const snap = await getDoc(doc(db, "withdrawals", withdrawalId));
  const data = snap.data()!;

  // refund the amount
  await recordTransaction(data.uid, "refund", data.amount, `Withdrawal rejected — refunded`);

  await updateDoc(doc(db, "withdrawals", withdrawalId), {
    status: "rejected", processedAt: serverTimestamp(), processedBy: adminEmail, notes: note,
  });

  await sendNotification(data.uid,
    "Withdrawal Rejected — Refunded",
    `Your withdrawal of ₦${data.amount?.toLocaleString()} was rejected and refunded to your wallet. Reason: ${note || "See admin"}`,
    "warning"
  );

  await logAdminAction(adminEmail, "reject_withdrawal", data.uid, { withdrawalId, note });
}

/* wallet management */
export async function adminCreditUser(uid: string, amount: number, reason: string, adminEmail: string) {
  await recordTransaction(uid, "admin_credit", amount, reason);
  await sendNotification(
    uid, 
    "Wallet Credited", 
    `AdsFinance has credited you with ₦${amount.toLocaleString()} as per ${reason}. Keep earning, watch more ads, you're almost there!`, 
    "success"
  );
  await logAdminAction(adminEmail, "credit_user", uid, { amount, reason });
}

export async function adminDebitUser(uid: string, amount: number, reason: string, adminEmail: string) {
  await recordTransaction(uid, "admin_debit", -amount, reason);
  await sendNotification(uid, "Wallet Debited", `₦${amount.toLocaleString()} was deducted from your wallet. ${reason}`, "warning");
  await logAdminAction(adminEmail, "debit_user", uid, { amount, reason });
}

export async function adminFreezeWallet(uid: string, frozen: boolean, adminEmail: string) {
  await upsertUserProfile(uid, { walletFrozen: frozen });
  await sendNotification(uid,
    frozen ? "Wallet Frozen" : "Wallet Unfrozen",
    frozen ? "Your wallet has been frozen by Support. Contact customer care." : "Your wallet has been unfrozen.",
    frozen ? "error" : "success"
  );
  await logAdminAction(adminEmail, frozen ? "freeze_wallet" : "unfreeze_wallet", uid);
}

export async function adminSetUserStatus(uid: string, status: "active" | "suspended", adminEmail: string, reason?: string) {
  const profileUpdates: any = { accountStatus: status };
  if (status === "suspended") {
    profileUpdates.suspensionReason = reason || "Suspended by the system. Please contact support.";
  } else {
    profileUpdates.suspensionReason = null; // clear it when reactivated
  }
  
  await upsertUserProfile(uid, profileUpdates);
  
  const notifMsg = status === "active" 
    ? "Your account has been reactivated. You can now resume your activities." 
    : (reason || `Your account has been suspended. Please contact support.`);
    
  await sendNotification(uid,
    `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    notifMsg,
    status === "active" ? "success" : "error"
  );
  await logAdminAction(adminEmail, `set_status_${status}`, uid, { reason });
}

export async function adminSetUserRole(uid: string, isAdmin: boolean) {
  await upsertUserProfile(uid, { isAdmin });
}

/* tasks */
export async function adminCreateTask(data: {
  title: string; description: string; category: string;
  reward: number; maxCompletions: number; active: boolean;
}) {
  return await addDoc(collection(db, "tasks"), {
    ...data, completions: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export async function adminUpdateTask(taskId: string, data: Partial<{ title: string; description: string; category: string; reward: number; maxCompletions: number; active: boolean }>) {
  await updateDoc(doc(db, "tasks", taskId), { ...data, updatedAt: serverTimestamp() });
}

export async function adminDeleteTask(taskId: string) {
  await deleteDoc(doc(db, "tasks", taskId));
}

export async function adminGetTaskSubmissions() {
  const snap = await getDocs(query(collection(db, "task_submissions"), where("status", "==", "pending"), orderBy("submittedAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function adminApproveSubmission(submissionId: string, adminEmail: string) {
  const snap = await getDoc(doc(db, "task_submissions", submissionId));
  const data = snap.data()!;

  await recordTransaction(data.uid, "task_reward", data.reward, `Task reward: ${data.taskTitle}`);
  await updateDoc(doc(db, "task_submissions", submissionId), {
    status: "approved", reviewedAt: serverTimestamp(), reviewedBy: adminEmail,
  });
  // increment task completion count
  await updateDoc(doc(db, "tasks", data.taskId), { completions: (data.completions ?? 0) + 1, updatedAt: serverTimestamp() });

  await sendNotification(data.uid,
    "Task Approved!",
    `Your task "${data.taskTitle}" was approved. ₦${data.reward} has been added to your wallet.`,
    "success"
  );
  await logAdminAction(adminEmail, "approve_task", data.uid, { submissionId });
}

export async function adminRejectSubmission(submissionId: string, note: string, adminEmail: string) {
  const snap = await getDoc(doc(db, "task_submissions", submissionId));
  const data = snap.data()!;

  await updateDoc(doc(db, "task_submissions", submissionId), {
    status: "rejected", notes: note, reviewedAt: serverTimestamp(), reviewedBy: adminEmail,
  });

  await sendNotification(data.uid,
    "Task Rejected",
    `Your task "${data.taskTitle}" was rejected. Reason: ${note}`,
    "error"
  );
  await logAdminAction(adminEmail, "reject_task", data.uid, { submissionId, note });
}

/* admin broadcast */
export async function adminBroadcast(title: string, body: string, type = "info") {
  await broadcastNotification(title, body, type as any);
}

/* admin logs */
export async function adminGetLogs() {
  const snap = await getDocs(query(collection(db, "admin_logs"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* platform settings */
export async function getSettings() {
  const snap = await getDoc(doc(db, "settings", "platform"));
  return snap.exists() ? snap.data() : {
    bankName:      COMPANY_BANK.name,
    bankAccount:   COMPANY_BANK.account,
    bankHolder:    COMPANY_BANK.holder,
    minWithdrawal: { "Alpha": 85000, "Alpha Plan": 85000, "Sigma": 225000, "Sigma Plan": 225000, "Omega": 600000, "Omega Plan": 600000 },
    referralBonus: 50,
  };
}

export async function saveSettings(data: Record<string, any>) {
  await setDoc(doc(db, "settings", "platform"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
