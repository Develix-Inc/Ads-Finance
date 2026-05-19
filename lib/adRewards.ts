import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { recordTransaction } from "./transactions";

export const DAILY_AD_LIMIT   = 3000;  // ₦3,000/day hard cap
export const MIN_REWARD       = 40;    // ₦40 minimum per video
export const MAX_REWARD       = 200;   // ₦200 maximum per video
export const MIN_WATCH_SECS   = 180;   // 3 minutes active watch to unlock reward

export interface VideoItem {
  id:          string;
  title:       string;
  category:    string;
  channelName: string;
  thumbnail:   string;
}

// ─── Curated video pool across categories ──────────────────────────────────
// Admin: swap IDs any time — format: youtu.be/<ID>
export const VIDEO_POOL: VideoItem[] = [
  // Finance
  { id: "PHe0bXAIuk0", title: "How The Economic Machine Works", category: "Finance",        channelName: "Ray Dalio",         thumbnail: "https://i.ytimg.com/vi/PHe0bXAIuk0/mqdefault.jpg" },
  { id: "f5j9v9dfinQ", title: "The Power of Compound Interest", category: "Finance",        channelName: "Finance Explained",  thumbnail: "https://i.ytimg.com/vi/f5j9v9dfinQ/mqdefault.jpg" },
  { id: "1bUG5KZtKY0", title: "How to Build Wealth From Zero",  category: "Finance",        channelName: "Graham Stephan",     thumbnail: "https://i.ytimg.com/vi/1bUG5KZtKY0/mqdefault.jpg" },
  { id: "8CRMbF50ZNM", title: "Understanding Inflation Simply", category: "Finance",        channelName: "Economics Explained", thumbnail: "https://i.ytimg.com/vi/8CRMbF50ZNM/mqdefault.jpg" },
  // Technology
  { id: "rI8tNMsozo0", title: "The Future of the Internet",     category: "Technology",     channelName: "TED",               thumbnail: "https://i.ytimg.com/vi/rI8tNMsozo0/mqdefault.jpg" },
  { id: "ztpN2RjRoiQ", title: "How Search Engines Work",        category: "Technology",     channelName: "Google",            thumbnail: "https://i.ytimg.com/vi/ztpN2RjRoiQ/mqdefault.jpg" },
  { id: "1kFHmuVTG08", title: "The Digital Revolution Explained", category: "Technology",   channelName: "Kurzgesagt",        thumbnail: "https://i.ytimg.com/vi/1kFHmuVTG08/mqdefault.jpg" },
  // AI
  { id: "kCc8FmEb1nY", title: "How AI Language Models Work",    category: "AI",             channelName: "Andrej Karpathy",   thumbnail: "https://i.ytimg.com/vi/kCc8FmEb1nY/mqdefault.jpg" },
  { id: "aircAruvnKk", title: "Machine Learning in 5 Minutes", category: "AI",             channelName: "Fireship",          thumbnail: "https://i.ytimg.com/vi/aircAruvnKk/mqdefault.jpg" },
  { id: "zjkBMFhNj_g", title: "ChatGPT & the AI Revolution",   category: "AI",             channelName: "TED-Ed",            thumbnail: "https://i.ytimg.com/vi/zjkBMFhNj_g/mqdefault.jpg" },
  // Motivation
  { id: "H14bBuluwB8", title: "Stop Screwing Yourself Over",    category: "Motivation",     channelName: "TEDx",              thumbnail: "https://i.ytimg.com/vi/H14bBuluwB8/mqdefault.jpg" },
  { id: "lFZdOhrbS5I", title: "Habits of Original Thinkers",   category: "Motivation",     channelName: "TED",               thumbnail: "https://i.ytimg.com/vi/lFZdOhrbS5I/mqdefault.jpg" },
  { id: "1MC4rmf8o7Q", title: "Define Your Fears, Not Goals",  category: "Motivation",     channelName: "TED",               thumbnail: "https://i.ytimg.com/vi/1MC4rmf8o7Q/mqdefault.jpg" },
  // Business
  { id: "0SARbwvhupQ", title: "How Successful People Think",   category: "Business",       channelName: "TED Business",      thumbnail: "https://i.ytimg.com/vi/0SARbwvhupQ/mqdefault.jpg" },
  { id: "anQ2d6hMicU", title: "Building a Business Mindset",   category: "Business",       channelName: "GaryVee",           thumbnail: "https://i.ytimg.com/vi/anQ2d6hMicU/mqdefault.jpg" },
  { id: "5EjZNR7YQFY", title: "Brand Building Fundamentals",   category: "Business",       channelName: "Simon Sinek",       thumbnail: "https://i.ytimg.com/vi/5EjZNR7YQFY/mqdefault.jpg" },
  // Entrepreneurship
  { id: "Lam0Jnm8vVM", title: "Multiple Income Streams Guide", category: "Entrepreneurship", channelName: "Ali Abdaal",       thumbnail: "https://i.ytimg.com/vi/Lam0Jnm8vVM/mqdefault.jpg" },
  { id: "vVmfBk9MDtQ", title: "From Zero to Entrepreneur",    category: "Entrepreneurship", channelName: "Y Combinator",     thumbnail: "https://i.ytimg.com/vi/vVmfBk9MDtQ/mqdefault.jpg" },
  // Productivity
  { id: "QiKfzIdTSJ8", title: "Deep Work: Focus Strategies",  category: "Productivity",    channelName: "Cal Newport",       thumbnail: "https://i.ytimg.com/vi/QiKfzIdTSJ8/mqdefault.jpg" },
  { id: "YwgDSkdHnVU", title: "Getting Things Done System",   category: "Productivity",    channelName: "Thomas Frank",      thumbnail: "https://i.ytimg.com/vi/YwgDSkdHnVU/mqdefault.jpg" },
];

// ─── Daily video rotation (7 videos/day, changes every day) ────────────────
export function getTodayVideos(): VideoItem[] {
  const today     = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86_400_000);
  const start     = (dayOfYear * 7) % VIDEO_POOL.length;
  const pool      = [...VIDEO_POOL, ...VIDEO_POOL]; // double to handle wraparound
  return pool.slice(start, start + 7);
}

// ─── Today's date string (YYYY-MM-DD) ────────────────────────────────────────
export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Fetch (or initialise) the user's daily reward doc ───────────────────────
export interface AdRewardData {
  uid:           string;
  dailyEarnings: number;
  totalEarnings: number;
  lastResetDate: string;
  watchedToday:  string[];
}

export async function getAdRewardData(uid: string): Promise<AdRewardData> {
  const ref  = doc(db, "ad_rewards", uid);
  const snap = await getDoc(ref);
  const today = todayStr();

  const defaults: AdRewardData = { uid, dailyEarnings: 0, totalEarnings: 0, lastResetDate: today, watchedToday: [] };

  if (!snap.exists()) {
    await setDoc(ref, { ...defaults, createdAt: serverTimestamp() });
    return defaults;
  }

  const data = snap.data() as AdRewardData;

  // Auto-reset at midnight
  if (data.lastResetDate !== today) {
    const reset: AdRewardData = { ...data, dailyEarnings: 0, watchedToday: [], lastResetDate: today };
    await setDoc(ref, reset, { merge: true });
    return reset;
  }

  return data;
}

// ─── Generate a random reward (₦40–₦200) ─────────────────────────────────────
export function generateReward(remaining: number): number {
  const raw = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD;
  return Math.min(raw, remaining); // cap to not exceed daily limit
}

// ─── Claim reward after verified watch ───────────────────────────────────────
export async function claimAdReward(
  uid: string,
  videoId: string
): Promise<{ success: boolean; reward: number; message: string }> {

  const data  = await getAdRewardData(uid);
  const today = todayStr();

  if (data.dailyEarnings >= DAILY_AD_LIMIT) {
    return { success: false, reward: 0, message: "Daily ad earning limit reached. Come back tomorrow." };
  }

  if (data.watchedToday?.includes(videoId)) {
    return { success: false, reward: 0, message: "You've already earned from this video today." };
  }

  const remaining = DAILY_AD_LIMIT - (data.dailyEarnings ?? 0);
  const reward    = generateReward(remaining);

  const ref = doc(db, "ad_rewards", uid);
  await setDoc(ref, {
    uid,
    dailyEarnings: (data.dailyEarnings ?? 0) + reward,
    totalEarnings: (data.totalEarnings ?? 0) + reward,
    lastResetDate: today,
    watchedToday:  arrayUnion(videoId),
    lastRewardAt:  serverTimestamp(),
  }, { merge: true });

  await recordTransaction(uid, "task_reward", reward, `Ad reward — video watched`);

  return { success: true, reward, message: `₦${reward.toLocaleString()} added to your wallet!` };
}
