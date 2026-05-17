import { db } from "./firebase";
import {
  doc, collection, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import { recordTransaction } from "./transactions";
import { sendNotification } from "./notifications";

export const REFERRAL_COMMISSION = 50; // ₦50 flat per referral node purchase

/** Generate a deterministic referral code from uid */
export function generateReferralCode(uid: string): string {
  return "AF" + uid.slice(0, 6).toUpperCase();
}

/** Called when a new user signs up with a referral code. */
export async function processReferralSignup(newUid: string, referralCode: string) {
  const q    = query(collection(db, "users"), where("referralCode", "==", referralCode));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const referrerUid = snap.docs[0].id;
  if (referrerUid === newUid) return; // can't refer yourself

  // check if referral already exists
  const existQ = query(collection(db, "referrals"),
    where("referrerUid", "==", referrerUid),
    where("refereeUid", "==", newUid));
  const existSnap = await getDocs(existQ);
  if (!existSnap.empty) return; // already linked

  await addDoc(collection(db, "referrals"), {
    referrerUid,
    refereeUid:  newUid,
    status:      "pending",
    commission:  REFERRAL_COMMISSION,
    createdAt:   serverTimestamp(),
    paidAt:      null,
  });
}

/** Pay referrer when referee activates a node */
export async function payReferralCommission(refereeUid: string) {
  const q    = query(collection(db, "referrals"),
    where("refereeUid", "==", refereeUid),
    where("status", "==", "pending"));
  const snap = await getDocs(q);
  if (snap.empty) return;

  for (const refDoc of snap.docs) {
    const data = refDoc.data();
    await recordTransaction(data.referrerUid, "referral_bonus", REFERRAL_COMMISSION, `Referral bonus — new node activated`);
    await sendNotification(data.referrerUid, "Referral Bonus Earned!", `You earned ₦${REFERRAL_COMMISSION} — one of your referrals just activated their node.`, "success");
    await updateDoc(refDoc.ref, { status: "active", paidAt: serverTimestamp() });
  }
}

/** Get all referrals made by a user (no orderBy — avoids composite index) */
export async function getUserReferrals(uid: string) {
  try {
    const q    = query(collection(db, "referrals"), where("referrerUid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
  } catch { return []; }
}

/** Get total referral earnings */
export async function getReferralEarnings(uid: string) {
  try {
    const q    = query(collection(db, "referrals"), where("referrerUid", "==", uid), where("status", "==", "active"));
    const snap = await getDocs(q);
    return snap.size * REFERRAL_COMMISSION;
  } catch { return 0; }
}
