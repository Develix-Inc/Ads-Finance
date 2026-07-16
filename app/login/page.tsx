"use client";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { getUserProfile, upsertUserProfile } from "@/lib/admin";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const MySwal = withReactContent(Swal);

// SweetAlert light theme configuration
const swalConfig = {
  background: '#ffffff',
  color: '#0f172a', // slate-900
  confirmButtonColor: '#0f172a', // primary
  cancelButtonColor: '#f1f5f9', // slate-100
  customClass: {
    popup: 'border border-slate-200 rounded-2xl shadow-xl',
    confirmButton: 'rounded-xl px-8 py-3 font-semibold',
    cancelButton: 'rounded-xl px-8 py-3 font-semibold text-slate-900'
  }
};

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const mode = searchParams?.get("mode");
    if (mode === "signup") {
      setIsSignUp(true);
    }
    const ref = searchParams?.get("ref");
    if (ref) {
      localStorage.setItem("pendingRef", ref);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const u = cred.user;

      const p = await getUserProfile(u.uid);
      if (!p) {
        const defaultName = u.displayName || u.email?.split("@")[0] || "User";
        const placeholderReferralCode = u.uid.slice(0, 6).toUpperCase();
        await upsertUserProfile(u.uid, {
          email: u.email || "",
          displayName: defaultName,
          photoURL: u.photoURL || "",
          investmentGoal: "passive_income",
          riskLevel: "moderate",
          bankName: "Pending Setup",
          accountNumber: "0000000000",
          accountName: "Pending Setup",
          onboardingComplete: false,
          referralCode: placeholderReferralCode,
          walletBalance: 0,
          totalEarned: 0,
          dailyTaskEarnings: 0,
          salesCommission: 0,
          nodeStatus: "none",
          nodeTier: null,
          accountStatus: "active",
          createdAt: new Date().toISOString(),
        });
      }

      MySwal.fire({
        ...swalConfig,
        icon: 'success',
        title: 'Authentication Successful',
        text: 'Welcome to AdsFinance.',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        router.push("/dashboard");
      });
    } catch (error: any) {
      MySwal.fire({
        ...swalConfig,
        icon: 'error',
        title: 'Authentication Failed',
        text: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      let cred;
      if (isSignUp) {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        cred = await signInWithEmailAndPassword(auth, email, password);
      }
      const u = cred.user;

      const p = await getUserProfile(u.uid);
      if (!p) {
        const defaultName = u.displayName || u.email?.split("@")[0] || "User";
        const placeholderReferralCode = u.uid.slice(0, 6).toUpperCase();
        await upsertUserProfile(u.uid, {
          email: u.email || "",
          displayName: defaultName,
          photoURL: u.photoURL || "",
          investmentGoal: "passive_income",
          riskLevel: "moderate",
          bankName: "Pending Setup",
          accountNumber: "0000000000",
          accountName: "Pending Setup",
          onboardingComplete: false,
          referralCode: placeholderReferralCode,
          walletBalance: 0,
          totalEarned: 0,
          dailyTaskEarnings: 0,
          salesCommission: 0,
          nodeStatus: "none",
          nodeTier: null,
          accountStatus: "active",
          createdAt: new Date().toISOString(),
        });
      }

      MySwal.fire({
        ...swalConfig,
        icon: 'success',
        title: 'Authentication Successful',
        text: 'Welcome to AdsFinance.',
        timer: 1500,
        showConfirmButton: false
      }).then(() => {
        router.push("/dashboard");
      });
    } catch (error: any) {
      let errorMsg = error.message;
      if (error.code === 'auth/email-already-in-use') errorMsg = 'Email already exists. Please sign in.';
      if (error.code === 'auth/wrong-password') errorMsg = 'Incorrect password.';
      if (error.code === 'auth/user-not-found') errorMsg = 'No account found with this email.';

      MySwal.fire({
        ...swalConfig,
        icon: 'error',
        title: 'Authentication Failed',
        text: errorMsg
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="relative w-32 h-32 mb-2 flex items-center justify-center">
            <Image 
              src="/logo.png" 
              alt="AdsFinance Logo" 
              width={128} height={128}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-900 font-black text-5xl">AF</span>';
              }}
            />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">AdsFinance</h1>
          <p className="text-xs font-bold text-slate-500 mt-2 tracking-widest uppercase">Digital Engagement Network</p>
        </div>

        {/* Auth Container */}
        <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-xl relative">
          
          <div className="flex flex-col gap-4">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Secure Portal</h2>
              <p className="text-slate-500 text-sm font-medium">Sign in to access your dashboard.</p>
            </div>
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
              
              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-base shadow-md transition-all"
              >
                {isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>

            <div className="flex items-center gap-2 text-slate-400 text-sm mt-2 mb-2">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="font-medium">OR</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            <Button 
              onClick={handleGoogleSignIn}
              type="button"
              disabled={isLoading}
              className="w-full h-14 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-xl font-semibold text-base shadow-sm transition-all flex items-center justify-center gap-3"
            >
              <Image src="/google-logo.svg" alt="Google" width={20} height={20} onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} /> 
              Continue with Google
            </Button>
            
            <p className="text-center text-sm text-slate-600 mt-2 font-medium">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-bold"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Enterprise Security Active
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginInner />
    </Suspense>
  );
}
