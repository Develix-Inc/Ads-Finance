import { db } from "./firebase";
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, writeBatch, limit
} from "firebase/firestore";

export type NotifType = "info" | "success" | "warning" | "error" | "payment" | "withdrawal" | "task";

export interface Notification {
  id: string;
  uid: string;
  title: string;
  body: string;
  type: NotifType;
  read: boolean;
  createdAt: any;
}

/** Send a notification to a single user */
export async function sendNotification(
  uid: string,
  title: string,
  body: string,
  type: NotifType = "info"
) {
  await addDoc(collection(db, "notifications", uid, "items"), {
    uid, title, body, type,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Broadcast to ALL users */
export async function broadcastNotification(
  title: string,
  body: string,
  type: NotifType = "info"
) {
  const usersSnap = await getDocs(collection(db, "users"));
  const batch     = writeBatch(db);

  usersSnap.docs.forEach(u => {
    const ref = doc(collection(db, "notifications", u.id, "items"));
    batch.set(ref, {
      uid: u.id, title, body, type,
      read: false,
      createdAt: serverTimestamp(),
    });
  });

  await batch.commit();
}

/** Broadcast to a list of UIDs */
export async function sendToUsers(
  uids: string[],
  title: string,
  body: string,
  type: NotifType = "info"
) {
  const batch = writeBatch(db);
  uids.forEach(uid => {
    const ref = doc(collection(db, "notifications", uid, "items"));
    batch.set(ref, { uid, title, body, type, read: false, createdAt: serverTimestamp() });
  });
  await batch.commit();
}

/** Real-time listener for user notifications */
export function listenNotifications(uid: string, cb: (notifs: Notification[]) => void) {
  const q = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  return onSnapshot(q, snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notification))
  );
}

/** Mark single notification as read */
export async function markRead(uid: string, notifId: string) {
  await updateDoc(doc(db, "notifications", uid, "items", notifId), { read: true });
}

/** Mark all notifications as read */
export async function markAllRead(uid: string) {
  const q    = query(collection(db, "notifications", uid, "items"), where("read", "==", false));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}
