import { db } from "./firebase";
import {
  doc, collection, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import { recordTransaction } from "./transactions";
import { sendNotification } from "./notifications";

export const TIER_COMMISSIONS: Record<string, number> = {
  "Alpha Plan": 450,
  "Sigma Plan": 700,
  "Omega Plan": 1000,
};

/** Generate a deterministic referral code from uid */
export function generateReferralCode(uid: string): string {
  return "AF" + uid.slice(0, 6).toUpperCase();
}

/** Called when a new user signs up with a referral code. */
export async function processReferralSignup(newUid: string, referralCode: string) {
  const q    = query(collection(db, "users"), where("referralCode", "==", referralCode));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const referrerDoc = snap.docs[0];
  const referrerUid = referrerDoc.id;
  if (referrerUid === newUid) return; // can't refer yourself

  // check if referral already exists
  const existQ = query(collection(db, "referrals"),
    where("referrerUid", "==", referrerUid),
    where("refereeUid", "==", newUid));
  const existSnap = await getDocs(existQ);
  if (!existSnap.empty) return; // already linked

  // fetch referee profile for display
  const refSnap = await getDocs(query(collection(db, "users"), where("uid", "==", newUid)));
  const refereeEmail = refSnap.docs[0]?.data()?.email || "";

  // Get referrer tier
  const referrerData = referrerDoc.data();
  const referrerTier = referrerData.nodeTier || "none";
  const commission = TIER_COMMISSIONS[referrerTier] || 200;

  // Add the referral as instantly active
  await addDoc(collection(db, "referrals"), {
    referrerUid,
    refereeUid:    newUid,
    refereeEmail,
    status:        "active",
    commission:    commission,
    createdAt:     serverTimestamp(),
    paidAt:        serverTimestamp(),
  });

  // Pay referrer immediately
  await recordTransaction(referrerUid, "referral_bonus", commission, `Referral bonus — new user registered`);
  await sendNotification(referrerUid, "Referral Bonus Earned!", `You earned ₦${commission} because a new user signed up with your link.`, "success");
}

/** Legacy: No longer needed since commission is paid instantly on sign up */
export async function payReferralCommission(refereeUid: string) {
  // no-op
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
    let total = 0;
    snap.docs.forEach(doc => {
      total += (doc.data().commission || 0);
    });
    return total;
  } catch { return 0; }
}
