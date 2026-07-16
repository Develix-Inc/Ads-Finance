"use client";

import React, { useState, useEffect, useRef } from "react";
import { Headset, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "./styles.module.css";

interface ChatMessage {
  id: string;
  uid: string;
  text: string;
  sender: "user" | "admin";
  createdAt: any;
}

export default function SupportPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) router.push("/login");
      else setUser(u);
    });
    return unsub;
  }, [router]);

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
    }, (err) => {
      console.error("Support error:", err);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !user) return;
    
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

  if (!user) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/profile" className={styles.backBtn}>
          <ArrowLeft size={16} strokeWidth={2.5} />
        </Link>
        <div className={styles.headerInfo}>
          <h1 className={styles.pageTitle}>Support Center</h1>
          <div className={styles.onlineIndicator}>
            <div className={styles.onlineDot} /> Online
          </div>
        </div>
      </header>

      <main className={styles.chatArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Headset size={32} />
            </div>
            <div className={styles.emptyTitle}>How can we help?</div>
            <div className={styles.emptyDesc}>Send us a message and our support team will reply as soon as possible.</div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isUser = msg.sender === "user";
            return (
              <div key={msg.id || i} className={`${styles.messageRow} ${isUser ? styles.user : styles.admin}`}>
                <div className={`${styles.bubble} ${isUser ? styles.user : styles.admin}`}>
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className={styles.inputArea}>
        <form onSubmit={sendMessage} className={styles.inputContainer}>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type your message..."
            className={styles.inputField}
          />
          <button type="submit" disabled={!inputText.trim()} className={styles.sendBtn}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
