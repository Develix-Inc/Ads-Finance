"use client";

import React, { useState, useEffect, useRef } from "react";
import { Headset, X, Send, UserCheck } from "lucide-react";
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
            className="w-[320px] sm:w-[350px] bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] mb-4 overflow-hidden flex flex-col"
            style={{ height: "450px", maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Header */}
            <div className="bg-slate-50 px-4 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold text-sm">Customer Support</p>
                  <p className="text-primary font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Headset className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-slate-900 font-bold text-sm mb-1">How can we help?</p>
                  <p className="text-slate-500 font-medium text-xs">Send us a message and we'll reply as soon as possible.</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div key={msg.id || i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium ${
                        isUser 
                          ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm" 
                          : "bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-sm shadow-sm"
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
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={sendMessage} className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 hover:bg-primary/90 transition-all relative mt-4"
        >
          <Headset className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full shadow-sm" />
          )}
        </button>
      )}
    </div>
  );
}
