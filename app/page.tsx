"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ComplianceBadge } from "@/components/ui/ComplianceBadge";
import { TransactionTicker } from "@/components/ui/TransactionTicker";
import { SubscriptionPlanCard } from "@/components/ui/SubscriptionPlanCard";
import { TaskCard } from "@/components/ui/TaskCard";
import { ArrowRight, Shield, Layers, Lock, Cpu, ChevronRight, Activity, CheckCircle2 } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";

const Marquee = () => {
  const logos = ["Acme Corp", "GlobalTech", "Quantum Finance", "Omni Digital", "Stark Industries", "Wayne Enterprises", "LexCorp", "Massive Dynamic"];
  return (
    <div className="w-full overflow-hidden bg-white border-y border-slate-100 py-6 flex items-center relative">
      <div className="absolute left-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10" />
      <div className="absolute right-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10" />
      <motion.div 
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
        className="flex whitespace-nowrap gap-16 px-8 items-center"
      >
        {[...logos, ...logos].map((logo, i) => (
          <span key={i} className="text-xl font-bold text-slate-300 tracking-tighter uppercase">{logo}</span>
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
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -50]);

  return (
    <main className="flex flex-col min-h-screen bg-background overflow-hidden relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-100 via-background to-background" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <Image src="/logo.png" alt="AdsFinance Logo" width={40} height={40} className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-slate-900 font-black text-lg">AF</span>';
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-xl tracking-tighter text-slate-900 leading-none">AdsFinance</span>
              <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5 hidden sm:block">Digital Engagement Network</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6 text-sm font-semibold">
            <Link href="/login" className="text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-wider text-xs sm:text-sm">Login</Link>
            <Link href="/login">
              <button className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-md px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm flex items-center gap-1.5">
                Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 sm:pt-40 pb-24 flex flex-col items-center justify-center min-h-[90vh] px-4 sm:px-6">
        <motion.div 
          style={{ opacity, scale, y }}
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"
        >
          <div className="flex flex-col items-start text-left z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white border border-slate-200 rounded-full px-4 py-1.5 mb-6 flex items-center gap-2 shadow-sm"
            >
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">Premium Infrastructure</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] text-slate-900"
            >
              Verified <span className="text-primary">Engagement.</span> <br /> Real Rewards.
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg md:text-xl text-slate-600 max-w-xl font-medium leading-relaxed text-balance"
            >
              Join the institutional-grade advertising network. Complete verified engagement tasks for top-tier brands and unlock premium earning opportunities through our subscription tiers.
            </motion.p>

            <motion.ul 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-6 flex flex-col gap-3"
            >
              {[
                "Priority Task Access",
                "Transparent Earnings Tracking",
                "Strict Anti-Fraud Verification"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {item}
                </li>
              ))}
            </motion.ul>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 w-full"
            >
              <Link href="/login">
                <Button className="w-full sm:w-auto rounded-xl h-14 px-8 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20">
                  Create Account <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Floating UI Elements */}
          <div className="relative h-[500px] w-full hidden lg:block perspective-1000">
            <motion.div 
              initial={{ opacity: 0, x: 100, rotateY: -10 }}
              animate={{ opacity: 1, x: 0, rotateY: -5 }}
              transition={{ duration: 1, type: "spring" }}
              className="absolute top-10 right-0 w-full max-w-[340px] z-20 shadow-2xl rounded-2xl bg-white border border-slate-100 p-2"
              style={{ transformStyle: 'preserve-3d' }}
            >
              <TaskCard 
                taskId="demo" 
                sponsor="Acme Corporation" 
                payout={250} 
                tags={["Verified_Brand", "Video_Task"]} 
                thumbnailUrl="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop"
              />
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50, y: 100 }}
              animate={{ opacity: 1, x: -40, y: 260, rotateZ: -2 }}
              transition={{ duration: 1, delay: 0.3, type: "spring" }}
              className="absolute top-0 right-32 z-10 p-6 bg-white rounded-2xl border border-slate-100 shadow-xl w-64"
            >
              <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-widest">Total Earned</div>
              <div className="text-3xl font-black text-slate-900 tracking-tighter">₦45,200</div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Recent Deposit</span>
                <span className="text-emerald-500 font-bold">+₦1,500</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <Marquee />

      {/* How It Works */}
      <section className="py-24 relative bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">How It Works</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">A transparent, secure process designed to provide genuine engagement to advertisers while fairly rewarding users.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px bg-slate-200" />
            
            {[
              { icon: Cpu, title: "1. Register", desc: "Create your AdsFinance account and optionally select a premium subscription plan." },
              { icon: Layers, title: "2. Engage", desc: "Watch promotional videos and complete simple verifications to prove human attention." },
              { icon: Lock, title: "3. Earn", desc: "Accumulate rewards in your balance and withdraw securely to your local bank account." }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative flex flex-col items-center text-center z-10"
              >
                <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-24 bg-slate-50 relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 mb-4">Membership Plans</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium">Upgrade your account to access higher task limits, priority withdrawals, and better earning opportunities.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">
            <SubscriptionPlanCard 
              title="Alpha Plan"
              price={17000}
              highlightText="3x more daily opportunities"
              benefits={[
                "Expanded Task Pool",
                "24hr Withdrawal SLA",
                "Email Support"
              ]}
            />
            <SubscriptionPlanCard 
              title="Sigma Plan"
              price={45000}
              highlightText="5x more daily opportunities"
              isPopular={true}
              benefits={[
                "Premium Video Tasks",
                "6hr Withdrawal SLA",
                "Priority Support",
                "Beta Features"
              ]}
            />
            <SubscriptionPlanCard 
              title="Omega Plan"
              price={120000}
              highlightText="Unlimited daily opportunities"
              benefits={[
                "Institutional Tasks",
                "Instant Processing",
                "Dedicated Manager",
                "Highest Priority"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Security Spotlight */}
      <section className="py-24 bg-white text-slate-900 relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs mb-6 uppercase tracking-wider">
                <Shield className="w-4 h-4 text-emerald-500" /> Enterprise Security
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Built on Trust</h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed font-medium">
                Our infrastructure is built to protect advertisers from bot traffic while ensuring users receive their rewards securely. Every withdrawal goes through automated fraud-detection checks.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {["Encrypted Traffic", "Anti-Bot Verification", "Secure Payouts", "Real-Time Monitoring"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700 font-semibold text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200">
              <TransactionTicker />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-16 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                <Image src="/logo.png" alt="AdsFinance Logo" width={32} height={32} className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-8 h-8 rounded bg-slate-900 flex items-center justify-center"><span class="text-white font-bold text-xs">AF</span></div>';
                  }}
                />
              </div>
              <span className="font-black text-lg tracking-tight text-slate-900">AdsFinance</span>
            </div>
            <p className="text-slate-500 max-w-sm text-sm font-medium">The transparent digital engagement network. Connecting genuine users with high-quality advertising campaigns.</p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-sm">Platform</h4>
            <ul className="space-y-3 text-slate-500 text-sm font-medium">
              <li><Link href="#" className="hover:text-primary transition-colors">Membership Plans</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Advertiser Portal</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-4 text-sm">Legal</h4>
            <ul className="space-y-3 text-slate-500 text-sm font-medium">
              <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Anti-Fraud Policy</Link></li>
            </ul>
          </div>
        </div>
        <ComplianceBadge />
      </footer>
    </main>
  );
}
