import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'white', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <Shield size={32} color="#1765DC" />
          </motion.div>
          <motion.div
            style={{ position: 'absolute', inset: '-4px', borderRadius: '20px', border: '1px solid rgba(23, 101, 220, 0.2)', borderTopColor: '#1765DC' }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}