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
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const MySwal = withReactContent(Swal);

// SweetAlert dark theme configuration
const swalConfig = {
  background: '#020617', // slate-950
  color: '#f8fafc', // slate-50
  confirmButtonColor: '#0D9488', // primary
  cancelButtonColor: '#1e293b', // slate-800
  customClass: {
    popup: 'border border-white/10 rounded-[24px] shadow-2xl glass-card',
    confirmButton: 'rounded-full px-8 py-3 font-semibold',
    cancelButton: 'rounded-full px-8 py-3 font-semibold'
  }
};

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Capture referral code from URL and save to localStorage
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      localStorage.setItem("pendingRef", ref);
    }
  }, [searchParams]);

  // Redirect if already logged in
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

      // Auto-create/sync Firestore profile immediately on sign in so there is absolutely no lag!
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

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none -z-10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="relative w-40 h-40 mb-2 flex items-center justify-center drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <Image 
              src="/logo-transparent.png" 
              alt="AdsFinance Logo" 
              width={160} height={160}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-white font-black text-5xl">AF</span>';
              }}
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">AdsFinance</h1>
          <p className="text-sm font-mono text-slate-400 mt-2 tracking-widest uppercase">ADS. GROWTH. FINANCIAL FREEDOM.</p>
        </div>

        {/* Auth Container */}
        <div className="bg-slate-900/80 border border-white/10 p-8 rounded-[32px] glass-card shadow-2xl relative">
          
          <div className="flex flex-col gap-4">
            <div className="mb-4 text-center">
              <h2 className="text-xl font-bold text-white mb-2">Secure Gateway</h2>
              <p className="text-slate-400 text-sm">Sign in to access your Validator Node and dashboard.</p>
            </div>
            
            <Button 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-14 bg-white hover:bg-slate-200 text-black rounded-full font-semibold text-base shadow-lg transition-all"
            >
              <Mail className="w-5 h-5 mr-3 text-red-500" /> Continue with Google
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Gateway Active
          </div>
        </div>
      </motion.div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <LoginInner />
    </Suspense>
  );
}
