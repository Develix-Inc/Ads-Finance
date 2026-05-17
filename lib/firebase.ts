import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATf0t63qcDyMUT895MzFCpt3PMLe_Q8hE",
  authDomain: "adsfinancearn.firebaseapp.com",
  projectId: "adsfinancearn",
  storageBucket: "adsfinancearn.firebasestorage.app",
  messagingSenderId: "392037356679",
  appId: "1:392037356679:web:07f40335ed7e7cf7f95422"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
