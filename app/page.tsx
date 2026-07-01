"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComplianceBadge } from "@/components/ui/ComplianceBadge";
import { TransactionTicker } from "@/components/ui/TransactionTicker";
import { NodeLicenseCard } from "@/components/ui/NodeLicenseCard";
import { TaskCard } from "@/components/ui/TaskCard";
import { ArrowRight, Shield, Zap, Layers, Lock, Cpu, Globe2, ChevronRight, Activity } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

const Marquee = () => {
  const logos = ["Acme Corp", "GlobalTech", "Quantum Finance", "Omni Digital", "Stark Industries", "Wayne Enterprises", "LexCorp", "Massive Dynamic"];
  return (
    <div className="w-full overflow-hidden bg-white/5 border-y border-white/10 py-6 flex items-center relative">
      <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-slate-950 to-transparent z-10" />
      <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-slate-950 to-transparent z-10" />
      <motion.div 
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="flex whitespace-nowrap gap-16 px-8 items-center"
      >
        {[...logos, ...logos].map((logo, i) => (
          <span key={i} className="text-xl font-bold text-slate-500 tracking-tighter uppercase">{logo}</span>
        ))}
      </motion.div>
    </div>
  );
};

export default function PremiumLandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

  return (
    <main className="flex flex-col min-h-screen bg-slate-950 overflow-hidden relative">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] opacity-50 mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[100px] opacity-50 mix-blend-screen" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
              <Image src="/logo-transparent.png" alt="AdsFinance Logo" width={48} height={48} className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-white font-black text-lg">AF</span>';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-2xl tracking-tighter text-white leading-none">AdsFinance</span>
              <span className="text-[8px] font-mono text-slate-400 tracking-[0.15em] uppercase mt-0.5 hidden sm:block">ADS. GROWTH. FINANCIAL FREEDOM.</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
            <Link href="#" className="text-slate-400 hover:text-white transition-colors hidden md:block uppercase tracking-wider text-xs">Merchants</Link>
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors uppercase tracking-wider text-xs sm:text-sm">Login</Link>
            <Link href="/login">
              <button className="rounded-full font-bold bg-white text-black hover:bg-slate-200 transition-colors shadow-lg px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm flex items-center gap-1.5">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 sm:pt-32 pb-32 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6">
        <motion.div 
          style={{ opacity, scale, y }}
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"
        >
          <div className="flex flex-col items-start text-left z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white/5 border border-white/10 rounded-full px-5 py-2 mb-8 flex items-center gap-3 glass-card"
            >
              <Activity className="w-4 h-4 text-secondary animate-pulse" />
              <span className="text-sm font-mono text-slate-300 tracking-widest uppercase">AdsFinance</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-6xl md:text-8xl font-black tracking-tighter leading-[1.1] text-white"
            >
              Watch. Verify. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Earn.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 text-xl md:text-2xl text-slate-400 max-w-xl font-light leading-relaxed text-balance"
            >
              Turn your attention into income through our secure advertising rewards platform. Complete verified ad engagement tasks for trusted brands and earn rewards in a transparent, fraud-protected ecosystem.
            </motion.p>

            <motion.ul 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-6 space-y-2"
            >
              {[
                "Verified Tasks",
                "Fast Payouts",
                "Human-Only Verification"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                  <CheckCircle className="w-5 h-5 text-emerald-500" /> {item}
                </li>
              ))}
            </motion.ul>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-12 flex flex-col sm:flex-row gap-4 w-full"
            >
              <Link href="/login">
                <Button className="w-full sm:w-auto rounded-full h-16 px-10 text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-2xl shadow-secondary/20">
                  Get Started <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button variant="outline" className="w-full sm:w-auto rounded-full h-16 px-10 text-lg font-semibold border-white/20 hover:bg-white/5" onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}>
                How It Works
              </Button>
            </motion.div>
          </div>

          {/* 3D Floating Elements */}
          <div className="relative h-[600px] w-full hidden lg:block perspective-1000">
            <motion.div 
              initial={{ opacity: 0, x: 100, rotateY: -20 }}
              animate={{ opacity: 1, x: 0, rotateY: -15 }}
              transition={{ duration: 1, type: "spring" }}
              className="absolute top-10 right-0 w-full max-w-[380px] z-20 shadow-2xl"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <TaskCard 
                taskId="demo" 
                sponsor="Premium Merchant" 
                payout={2.50} 
                tags={["High_Yield", "Video_Verification"]} 
                thumbnailUrl="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50, y: 100 }}
              animate={{ opacity: 1, x: -50, y: 300, rotateZ: -5 }}
              transition={{ duration: 1, delay: 0.3, type: "spring" }}
              className="absolute top-0 right-32 z-10 p-6 glass-card rounded-[24px] border border-white/10 shadow-xl w-64 bg-slate-900/80"
            >
              <div className="text-sm font-mono text-slate-400 mb-2 uppercase tracking-widest">Active Yield</div>
              <div className="text-4xl font-black text-white tracking-tighter">$14,290<span className="text-primary">.50</span></div>
              <div className="mt-4 h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-3/4" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Social Proof */}
      <Marquee />

      {/* How It Works Pipeline */}
      <section className="py-32 relative z-10 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">How It Works</h2>
            <p className="text-xl text-white font-bold mb-2">Simple. Transparent. Rewarding.</p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">A straightforward process designed to protect advertisers while rewarding genuine user engagement.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            
            {[
              { icon: Cpu, title: "1. Create Your Account", desc: "Join AdsFinance and activate your account to access available advertising campaigns." },
              { icon: Layers, title: "2. Complete Verified Tasks", desc: "Watch videos, engage with promotional content, and complete simple verification steps to prove genuine attention." },
              { icon: Lock, title: "3. Receive Your Earnings", desc: "Once your completed tasks are verified, your earnings are added to your balance and become available for withdrawal according to your account plan." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center z-10"
              >
                <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center mb-8 shadow-xl shadow-black/50 glass-card">
                  <step.icon className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed text-balance">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose AdsFinance */}
      <section className="py-32 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Why Choose AdsFinance</h2>
            <p className="text-xl text-white font-bold mb-4">Built for Trust</p>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Our platform is designed to eliminate fake engagement and ensure every advertiser pays only for real human attention.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              "Human verification technology",
              "Advanced fraud detection",
              "Secure encrypted infrastructure",
              "Transparent task tracking",
              "Reliable payment processing"
            ].map((item, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-white/10 transition-colors">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-4" />
                <p className="font-semibold text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance Spotlight */}
      <section className="py-32 bg-black relative border-y border-white/5">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-sm mb-6 uppercase tracking-wider">
                <Shield className="w-4 h-4" /> Security Section
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Security Comes First</h2>
              <p className="text-xl text-slate-400 mb-6 leading-relaxed text-balance">
                Every withdrawal goes through automated and manual verification checks to protect both users and advertisers from fraudulent activity.
              </p>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed text-balance">
                Because security matters more than speed, some withdrawals may require additional verification before processing.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["AES-256 Encryption", "Anti-Bot Protection", "Secure Payment Verification", "Real-Time Fraud Monitoring"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-300 font-medium bg-slate-900/50 p-3 rounded-xl border border-white/5">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative p-1 bg-gradient-to-br from-slate-800 to-slate-950 rounded-[32px] overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-primary/10 blur-3xl" />
              <div className="relative bg-slate-950 rounded-[28px] overflow-hidden border border-white/5">
                <TransactionTicker />
                <div className="p-12 flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <Lock className="w-16 h-16 text-slate-700 mx-auto mb-6" />
                    <div className="font-mono text-sm text-slate-500 uppercase tracking-widest">Awaiting Manual Override</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Validator Licenses Pricing */}
      <section className="py-32 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">Initialize Your Node</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">Select a Validator License to define your network permissions and yield multiplier ceiling.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center">
            <NodeLicenseCard 
              title="Node Alpha"
              price={17000}
              multiplier={4}
              benefits={[
                "Standard Attention Tasks",
                "24hr Withdrawal Processing",
                "Basic Support SLA"
              ]}
            />
            <NodeLicenseCard 
              title="Node Sigma"
              price={45000}
              multiplier={5}
              isPopular={true}
              benefits={[
                "High-Yield Video Tasks",
                "6hr Withdrawal Processing",
                "Priority Support SLA",
                "Merchant Beta Access"
              ]}
            />
            <NodeLicenseCard 
              title="Node Omega"
              price={120000}
              multiplier={6}
              benefits={[
                "Institutional Merchant Tasks",
                "Instant Withdrawal Processing",
                "Dedicated Account Manager",
                "Early Access to New Pools"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent -z-10" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-white">Ready to harvest?</h2>
          <Link href="/login">
            <Button className="rounded-full h-16 px-12 text-xl font-bold bg-white text-black hover:bg-slate-200 shadow-2xl shadow-white/20">
              Get Started <ArrowRight className="w-6 h-6 ml-3" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black pt-16 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                <Image src="/logo-transparent.png" alt="AdsFinance Logo" width={48} height={48} className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><span class="text-white font-bold">A</span></div>';
                  }}
                />
              </div>
              <span className="font-bold text-xl tracking-tighter text-white">AdsFinance</span>
            </div>
            <p className="text-slate-500 max-w-sm text-sm">The leading institutional-grade digital engagement network. Friction-by-design architecture ensuring maximum security for attention verification.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-sm">Platform</h4>
            <ul className="space-y-3 text-slate-500 text-sm font-medium">
              <li><Link href="#" className="hover:text-primary transition-colors">Validator Nodes</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Merchant Portal</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Live Ledger</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-wider text-sm">Compliance</h4>
            <ul className="space-y-3 text-slate-500 text-sm font-medium">
              <li><Link href="#" className="hover:text-primary transition-colors">Security Audit</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Protocol</Link></li>
            </ul>
          </div>
        </div>
        <ComplianceBadge />
      </footer>
    </main>
  );
}

// Icon helper for the security list
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
