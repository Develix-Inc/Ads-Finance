"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const mockTransactions = [
  { id: "tx_1", user: "@user_883", action: "verified attention", amount: "+$0.40" },
  { id: "tx_2", user: "@node_master", action: "yield block", amount: "+$2.50" },
  { id: "tx_3", user: "@crypto_kid", action: "ad engagement", amount: "+$0.15" },
  { id: "tx_4", user: "@whale_99", action: "validator bonus", amount: "+$15.00" },
  { id: "tx_5", user: "@anon_421", action: "verified attention", amount: "+$0.40" },
];

export function TransactionTicker() {
  const [transactions, setTransactions] = useState(mockTransactions);

  useEffect(() => {
    // Simulate real-time stream of transactions
    const interval = setInterval(() => {
      const newTx = {
        id: `tx_${Math.random().toString(36).substring(7)}`,
        user: `@user_${Math.floor(Math.random() * 1000)}`,
        action: Math.random() > 0.8 ? "validator bonus" : "verified attention",
        amount: `+$${(Math.random() * 2).toFixed(2)}`,
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
    <div className="w-full bg-slate-900/80 border-y border-white/5 backdrop-blur-md overflow-hidden relative h-10 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none" />
      
      <div className="flex w-full px-4 overflow-hidden items-center justify-center space-x-12">
        <AnimatePresence>
          {transactions.map((tx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2 text-xs font-mono whitespace-nowrap shrink-0"
            >
              <span className="text-slate-400">{tx.user}</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300">{tx.action}</span>
              <span className="text-secondary font-bold">{tx.amount}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
