"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHeadset, FaPaperPlane, FaUserShield, FaClockRotateLeft, FaCheckDouble } from "react-icons/fa6";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, getDocs, where } from "firebase/firestore";
import Swal from "sweetalert2";

interface ChatMessage {
  id: string;
  uid: string;
  userEmail: string;
  text: string;
  sender: "user" | "admin";
  createdAt: any;
  readByAdmin?: boolean;
}

interface ChatSession {
  uid: string;
  userEmail: string;
  messages: ChatMessage[];
  lastMessageAt: number;
  unreadCount: number;
}

export function SupportTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "support_messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      
      // Group by user uid
      const grouped = msgs.reduce((acc, msg) => {
        if (!acc[msg.uid]) {
          acc[msg.uid] = {
            uid: msg.uid,
            userEmail: msg.userEmail || "Unknown User",
            messages: [],
            lastMessageAt: 0,
            unreadCount: 0
          };
        }
        acc[msg.uid].messages.push(msg);
        acc[msg.uid].lastMessageAt = msg.createdAt?.seconds || 0;
        if (msg.sender === "user" && !msg.readByAdmin) {
          acc[msg.uid].unreadCount++;
        }
        return acc;
      }, {} as Record<string, ChatSession>);

      const sessionList = Object.values(grouped).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
      setSessions(sessionList);
    });
    return unsub;
  }, []);

  const activeSession = sessions.find(s => s.uid === activeUid);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!inputText.trim() || !activeUid) return;
    
    const text = inputText.trim();
    setInputText("");
    
    await addDoc(collection(db, "support_messages"), {
      uid: activeUid,
      userEmail: activeSession?.userEmail || "Unknown",
      text,
      sender: "admin",
      createdAt: serverTimestamp(),
      readByAdmin: true
    });
  }

  async function handleResolve() {
    if (!activeUid) return;
    const { isConfirmed } = await Swal.fire({
      title: "Resolve & Reset Chat?",
      text: "This will permanently delete this conversation and mark it as resolved.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#14b8a6",
      cancelButtonColor: "#f43f5e",
      confirmButtonText: "Yes, resolve it!",
      background: "#0f172a", color: "#f8fafc"
    });
    if (!isConfirmed) return;

    const q = query(collection(db, "support_messages"), where("uid", "==", activeUid));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    setActiveUid(null);
  }

  const ts = (sec: number) => {
    if (!sec) return "";
    return new Date(sec * 1000).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-[20px] overflow-hidden flex h-[600px] shadow-xl">
      
      {/* Sidebar - Users List */}
      <div className="w-1/3 border-r border-white/10 flex flex-col bg-slate-950">
        <div className="p-4 border-b border-white/10 shrink-0">
          <h2 className="text-white font-bold flex items-center gap-2">
            <FaHeadset className="text-teal-400" /> Active Chats
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No active support chats</div>
          ) : (
            sessions.map(s => (
              <button
                key={s.uid}
                onClick={() => setActiveUid(s.uid)}
                className={`w-full text-left p-4 hover:bg-white/5 transition-colors flex items-start gap-3 ${activeUid === s.uid ? "bg-white/10" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-white/10">
                  <FaUserShield className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-bold truncate ${s.unreadCount > 0 ? "text-white" : "text-slate-300"}`}>
                      {s.userEmail}
                    </p>
                    {s.unreadCount > 0 && (
                      <span className="bg-teal-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-2 shrink-0">
                        {s.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {s.messages[s.messages.length - 1]?.text}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-slate-900">
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <FaClockRotateLeft className="w-12 h-12 mb-4 text-slate-700" />
            <p>Select a conversation to view and reply</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-white/10 bg-slate-950 shrink-0 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{activeSession.userEmail}</p>
                <p className="text-xs text-slate-500 font-mono">UID: {activeSession.uid}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleResolve} title="Resolve and clear chat history"
                  className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 text-xs font-bold transition-colors flex items-center gap-2">
                  <FaCheckDouble className="w-3.5 h-3.5" /> Resolve
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeSession.messages.map((msg, i) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div key={msg.id || i} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isAdmin 
                        ? "bg-teal-500 text-slate-950 rounded-tr-sm font-medium" 
                        : "bg-slate-800 text-slate-200 border border-white/10 rounded-tl-sm"
                    }`}>
                      <p>{msg.text}</p>
                      <p className={`text-[9px] mt-1 text-right opacity-70 ${isAdmin ? "text-slate-900" : "text-slate-400"}`}>
                        {ts(msg.createdAt?.seconds)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-950 border-t border-white/10 shrink-0">
              <form onSubmit={sendMessage} className="relative flex items-center">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type a reply..."
                  className="w-full bg-slate-900 border border-white/10 text-white text-sm rounded-full pl-5 pr-14 py-3 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="absolute right-2 p-2 bg-teal-500 text-slate-950 rounded-full disabled:opacity-50 transition-colors"
                >
                  <FaPaperPlane className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
