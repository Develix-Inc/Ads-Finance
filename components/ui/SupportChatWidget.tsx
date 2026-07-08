"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHeadset, FaXmark, FaPaperPlane, FaUserShield } from "react-icons/fa6";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { usePathname } from "next/navigation";

interface ChatMessage {
  id: string;
  uid: string;
  text: string;
  sender: "user" | "admin";
  createdAt: any;
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  
  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
    });
    return unsub;
  }, []);

  // Listen to messages
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "support_messages"),
      where("uid", "==", user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      msgs.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(msgs);
      
      // Check if latest message is from admin and chat is closed
      if (msgs.length > 0) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg.sender === "admin" && !open) {
          setHasUnread(true);
        }
      }
    }, (err) => {
      console.error("Chat widget error:", err);
    });
    return unsub;
  }, [user, open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  // If user opens chat, clear unread
  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Only render widget if user is logged in, and not on admin pages
  if (!user || pathname?.startsWith("/admin")) return null;

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const text = inputText.trim();
    setInputText("");
    
    await addDoc(collection(db, "support_messages"), {
      uid: user.uid,
      userEmail: user.email || user.phoneNumber || "Unknown",
      text,
      sender: "user",
      createdAt: serverTimestamp(),
      readByAdmin: false
    });
  }

  return (
    <div className="fixed bottom-[88px] sm:bottom-6 right-4 sm:right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-[320px] sm:w-[350px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl mb-4 overflow-hidden flex flex-col"
            style={{ height: "450px", maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Header */}
            <div className="bg-slate-950 px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
                  <FaUserShield className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Customer Care</p>
                  <p className="text-teal-400 text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <FaXmark className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <FaHeadset className="w-5 h-5 text-teal-400" />
                  </div>
                  <p className="text-white font-bold text-sm mb-1">How can we help?</p>
                  <p className="text-slate-400 text-xs">Send us a message and we'll reply as soon as possible.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div key={msg.id || i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        isUser 
                          ? "bg-teal-500 text-slate-950 rounded-tr-sm font-medium" 
                          : "bg-slate-800 text-slate-200 border border-white/10 rounded-tl-sm"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-slate-950 border-t border-white/10 shrink-0">
              <form onSubmit={sendMessage} className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-slate-900 border border-white/10 text-white text-sm rounded-full pl-4 pr-12 py-2.5 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 p-1.5 bg-teal-500 text-slate-950 rounded-full disabled:opacity-50 disabled:bg-slate-800 disabled:text-slate-500 transition-colors"
                >
                  <FaPaperPlane className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 bg-teal-500 text-slate-950 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:scale-105 transition-transform relative mt-4"
        >
          <FaHeadset className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 border-2 border-slate-950 rounded-full" />
          )}
        </button>
      )}
    </div>
  );
}
