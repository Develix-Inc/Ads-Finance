"use client";

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged } from "firebase/auth";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Button } from "@/components/ui/button";
import { Phone, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const [authMethod, setAuthMethod] = useState<"select" | "phone">("select");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
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

  // Setup reCAPTCHA for phone auth
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved
        }
      });
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
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

  const requestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      MySwal.fire({
        ...swalConfig,
        icon: 'info',
        title: 'OTP Sent',
        text: 'Please check your messages.',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error: any) {
      MySwal.fire({
        ...swalConfig,
        icon: 'error',
        title: 'Verification Failed',
        text: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await confirmationResult.confirm(verificationCode);
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
        title: 'Invalid OTP',
        text: 'The code you entered is incorrect.'
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
            <img 
              src="/logo-transparent.png" 
              alt="AdsFinance Logo" 
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
          <div id="recaptcha-container"></div>
          
          <AnimatePresence mode="wait">
            {authMethod === "select" ? (
              <motion.div 
                key="select"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-4"
              >
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-white mb-2">Secure Gateway</h2>
                  <p className="text-slate-400 text-sm">Select an authentication method to access your Validator Node.</p>
                </div>
                
                <Button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full h-14 bg-white hover:bg-slate-200 text-black rounded-full font-semibold text-base shadow-lg transition-all"
                >
                  <Mail className="w-5 h-5 mr-3 text-red-500" /> Continue with Google
                </Button>
                
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-mono">Or secure via SMS</span></div>
                </div>

                <Button 
                  onClick={() => setAuthMethod("phone")}
                  variant="outline"
                  className="w-full h-14 border-white/20 hover:bg-white/5 rounded-full font-semibold text-base transition-all text-white"
                >
                  <Phone className="w-5 h-5 mr-3 text-slate-300" /> Continue with Phone Number
                </Button>
              </motion.div>

            ) : (

              <motion.div 
                key="phone"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-white mb-2">2-Step Verification</h2>
                  <p className="text-slate-400 text-sm">Enter your phone number to receive a secure OTP.</p>
                </div>

                {!confirmationResult ? (
                  <form onSubmit={requestOTP} className="flex flex-col gap-4">
                    <input 
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="w-full h-14 bg-slate-950 border border-white/10 rounded-2xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      required
                    />
                    <Button 
                      type="submit"
                      disabled={isLoading || !phoneNumber}
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-full font-semibold shadow-lg shadow-primary/20 transition-all"
                    >
                      {isLoading ? "Initiating Protocol..." : "Send Secure OTP"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={verifyOTP} className="flex flex-col gap-4">
                    <input 
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full h-14 bg-slate-950 border border-white/10 rounded-2xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all tracking-widest text-center font-mono text-xl"
                      required
                      maxLength={6}
                    />
                    <Button 
                      type="submit"
                      disabled={isLoading || verificationCode.length < 6}
                      className="w-full h-14 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-full font-bold shadow-lg shadow-secondary/20 transition-all"
                    >
                      {isLoading ? "Verifying..." : "Access Node"}
                    </Button>
                  </form>
                )}

                <div className="mt-4 text-center">
                  <button 
                    onClick={() => {
                      setAuthMethod("select");
                      setConfirmationResult(null);
                    }}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Return to Selection
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
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
