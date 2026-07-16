import React from "react";
import { X, PlayCircle, Users, Wallet, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface HowItWorksModalProps {
  onClose: () => void;
}

export function HowItWorksModal({ onClose }: HowItWorksModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-900">How It Works</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Your quick guide to earning on AdsFinance</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <PlayCircle size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">1. Complete Daily Tasks</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">Watch short sponsored videos or interact with ads in your Tasks tab. Each completed task instantly adds funds to your wallet based on your active Node Tier.</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">2. Invite Friends & Earn</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">Share your unique referral link. The moment a friend signs up using your link, you instantly earn a cash bonus! Your bonus amount depends on your current tier.</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Wallet size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">3. Withdraw Earnings</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">Once your wallet balance reaches your tier's minimum withdrawal limit, head to the Withdrawals page. Enter your secure PIN and get paid directly to your bank account.</p>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2">
            Got it <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
