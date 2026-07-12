"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const mockTransactions = [
  { id: "tx_1", user: "@user_883", action: "verified attention", amount: "+₦400" },
  { id: "tx_2", user: "@plan_master", action: "premium bonus", amount: "+₦2,500" },
  { id: "tx_3", user: "@crypto_kid", action: "ad engagement", amount: "+₦150" },
  { id: "tx_4", user: "@whale_99", action: "referral reward", amount: "+₦1,500" },
  { id: "tx_5", user: "@anon_421", action: "verified attention", amount: "+₦400" },
];

export function TransactionTicker() {
  const [transactions, setTransactions] = useState(mockTransactions);

  useEffect(() => {
    // Simulate real-time stream of transactions
    const interval = setInterval(() => {
      const newTx = {
        id: `tx_${Math.random().toString(36).substring(7)}`,
        user: `@user_${Math.floor(Math.random() * 1000)}`,
        action: Math.random() > 0.8 ? "premium bonus" : "verified attention",
        amount: `+₦${(Math.random() * 1000).toFixed(0)}`,
      };

      setTransactions((prev) => {
        const next = [newTx, ...prev];
        if (next.length > 5) next.pop(); // Keep only 5 to save memory
        return next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200 backdrop-blur-md overflow-hidden relative h-10 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />
      
      <div className="flex w-full px-4 overflow-hidden items-center justify-center space-x-12">
        <AnimatePresence>
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 text-xs font-medium whitespace-nowrap shrink-0"
            >
              <span className="text-slate-500 font-bold">{tx.user}</span>
              <span className="text-slate-400">→</span>
              <span className="text-slate-600">{tx.action}</span>
              <span className="text-primary font-black">{tx.amount}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
