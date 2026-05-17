import { db } from "./firebase";
import {
  doc, collection, addDoc, updateDoc, runTransaction,
  serverTimestamp, query, where, orderBy, limit, getDocs, getDoc, onSnapshot
} from "firebase/firestore";

export type TxType =
  | "deposit" | "withdrawal" | "task_reward" | "referral_bonus"
  | "node_purchase" | "admin_credit" | "admin_debit" | "refund";

/** Atomic balance update + transaction record. Returns transaction doc ID. */
export async function recordTransaction(
  uid: string,
  type: TxType,
  amount: number,           // positive = credit, negative = debit
  description: string,
  meta?: Record<string, any>
): Promise<string> {
  const userRef = doc(db, "users", uid);
  const txCol   = collection(db, "transactions");

  let txId = "";
  await runTransaction(db, async t => {
    const snap = await t.get(userRef);
    const current = snap.exists() ? (snap.data().walletBalance ?? 0) : 0;
    const newBal  = Math.max(0, current + amount);

    t.update(userRef, {
      walletBalance: newBal,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(txCol);
    txId = txRef.id;
    t.set(txRef, {
      id: txRef.id,
      uid,
      type,
      amount,
      description,
      balanceAfter: newBal,
      status: "completed",
      createdAt: serverTimestamp(),
      ...(meta ?? {}),
    });
  });

  return txId;
}

/** Get paginated transaction history for a user */
export async function getUserTransactions(uid: string, pageLimit = 20) {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

/** Real-time listener for user transactions */
export function listenTransactions(uid: string, pageLimit: number, cb: (txs: any[]) => void) {
  const q = query(
    collection(db, "transactions"),
    where("uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageLimit)
  );
  return onSnapshot(q, snap => cb(snap.docs.map(d => d.data())));
}

/** System-wide stats for admin overview */
export async function getSystemStats() {
  const usersSnap = await getDocs(collection(db, "users"));
  const users     = usersSnap.docs.map(d => d.data());

  const totalBalance  = users.reduce((s, u) => s + (u.walletBalance ?? 0), 0);
  const activeNodes   = users.filter(u => u.nodeStatus === "active").length;
  const pendingNodes  = users.filter(u => u.nodeStatus === "pending").length;

  const wSnap = await getDocs(query(collection(db, "withdrawals"), where("status","==","pending")));
  const pSnap = await getDocs(query(collection(db, "payments"),    where("status","==","pending")));

  return {
    totalUsers:         users.length,
    activeNodes,
    pendingNodes,
    totalBalance,
    pendingWithdrawals: wSnap.size,
    pendingPayments:    pSnap.size,
  };
}
