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

/** Called when a new user signs up with a referral code.
 *  Links them to referrer — commission is paid when their node is verified. */
export async function processReferralSignup(newUid: string, referralCode: string) {
  // find referrer by code
  const q    = query(collection(db, "users"), where("referralCode", "==", referralCode));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const referrerDoc  = snap.docs[0];
  const referrerUid  = referrerDoc.id;

  // link referral record
  await addDoc(collection(db, "referrals"), {
    referrerUid,
    refereeUid:  newUid,
    status:      "pending",    // becomes "active" when referee buys a node
    commission:  REFERRAL_COMMISSION,
    createdAt:   serverTimestamp(),
    paidAt:      null,
  });
}

/** Called when a referee's node payment is verified — pay the referrer ₦50 */
export async function payReferralCommission(refereeUid: string) {
  const q    = query(collection(db, "referrals"), where("refereeUid", "==", refereeUid), where("status", "==", "pending"));
  const snap = await getDocs(q);
  if (snap.empty) return;

  for (const refDoc of snap.docs) {
    const data = refDoc.data();

    await recordTransaction(
      data.referrerUid,
      "referral_bonus",
      REFERRAL_COMMISSION,
      `Referral bonus — new node activated`
    );

    await sendNotification(
      data.referrerUid,
      "Referral Bonus Earned!",
      `You earned ₦${REFERRAL_COMMISSION} — one of your referrals just activated their node.`,
      "success"
    );

    await updateDoc(refDoc.ref, { status: "active", paidAt: serverTimestamp() });
  }
}

/** Get all referrals made by a user */
export async function getUserReferrals(uid: string) {
  const q    = query(collection(db, "referrals"), where("referrerUid", "==", uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Get total referral earnings for a user */
export async function getReferralEarnings(uid: string) {
  const q    = query(collection(db, "referrals"), where("referrerUid", "==", uid), where("status", "==", "active"));
  const snap = await getDocs(q);
  return snap.size * REFERRAL_COMMISSION;
}
