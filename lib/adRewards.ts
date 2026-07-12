import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { recordTransaction } from "./transactions";
import { getUserProfile } from "./admin";

export const MIN_WATCH_SECS = 180;

export const TIER_LIMITS: Record<string, { dailyCap: number, minReward: number, maxReward: number, maxVideos: number }> = {
  "Starter Plan": { dailyCap: 500, minReward: 30, maxReward: 50, maxVideos: 10 },
  "Alpha Plan": { dailyCap: 3000, minReward: 150, maxReward: 300, maxVideos: 10 },
  "Sigma Plan": { dailyCap: 7500, minReward: 350, maxReward: 500, maxVideos: 15 },
  "Omega Plan": { dailyCap: 24000, minReward: 900, maxReward: 1200, maxVideos: 20 },
};

export interface VideoItem {
  id:          string;
  title:       string;
  category:    string;
  channelName: string;
  thumbnail:   string;
}

// ─── Curated video pool — all IDs verified & confirmed real ───────────────
export const VIDEO_POOL: VideoItem[] = [
  // Finance
  { id: "PHe0bXAIuk0", title: "How The Economic Machine Works",         category: "Finance",        channelName: "Principles by Ray Dalio",  thumbnail: "https://i.ytimg.com/vi/PHe0bXAIuk0/mqdefault.jpg" },
  { id: "rrkrvAUbU9Y", title: "The Puzzle of Motivation",               category: "Finance",        channelName: "TED",                     thumbnail: "https://i.ytimg.com/vi/rrkrvAUbU9Y/mqdefault.jpg" },
  { id: "q-7zAkwAOYg", title: "What Makes a Good Life?",               category: "Finance",        channelName: "TED",                     thumbnail: "https://i.ytimg.com/vi/q-7zAkwAOYg/mqdefault.jpg" },

  // Business & Leadership
  { id: "qp0HC3iX-7Y", title: "How Great Leaders Inspire Action",       category: "Business",       channelName: "TED · Simon Sinek",        thumbnail: "https://i.ytimg.com/vi/qp0HC3iX-7Y/mqdefault.jpg" },
  { id: "Jo_B4VAQxlI", title: "Habits of Original Thinkers",           category: "Business",       channelName: "TED · Adam Grant",         thumbnail: "https://i.ytimg.com/vi/Jo_B4VAQxlI/mqdefault.jpg" },
  { id: "eIho2S0ZahI", title: "How to Speak So People Listen",         category: "Business",       channelName: "TED · Julian Treasure",    thumbnail: "https://i.ytimg.com/vi/eIho2S0ZahI/mqdefault.jpg" },

  // Motivation & Mindset
  { id: "Lp7E973zozc", title: "How to Stop Screwing Yourself Over",    category: "Motivation",     channelName: "TEDx · Mel Robbins",       thumbnail: "https://i.ytimg.com/vi/Lp7E973zozc/mqdefault.jpg" },
  { id: "H14bB_9vg-4", title: "Grit: Power of Passion & Perseverance", category: "Motivation",     channelName: "TED · Angela Duckworth",   thumbnail: "https://i.ytimg.com/vi/H14bB_9vg-4/mqdefault.jpg" },
  { id: "arj7oStGLkU", title: "Inside the Mind of a Procrastinator",  category: "Motivation",     channelName: "TED · Tim Urban",          thumbnail: "https://i.ytimg.com/vi/arj7oStGLkU/mqdefault.jpg" },
  { id: "iCvmsMzlF7o", title: "The Power of Vulnerability",            category: "Motivation",     channelName: "TED · Brené Brown",        thumbnail: "https://i.ytimg.com/vi/iCvmsMzlF7o/mqdefault.jpg" },
  { id: "w-HYZv6HzAs", title: "The Skill of Self Confidence",          category: "Motivation",     channelName: "TEDx · Dr. Ivan Joseph",   thumbnail: "https://i.ytimg.com/vi/w-HYZv6HzAs/mqdefault.jpg" },

  // Productivity & Performance
  { id: "Ks-_Mh1QhMc", title: "Your Body Language Shapes Who You Are", category: "Productivity",   channelName: "TED · Amy Cuddy",          thumbnail: "https://i.ytimg.com/vi/Ks-_Mh1QhMc/mqdefault.jpg" },

  // Entrepreneurship
  { id: "P55z_4C0Fpk", title: "Why You Will Marry the Wrong Person",   category: "Entrepreneurship", channelName: "Google Talks",            thumbnail: "https://i.ytimg.com/vi/P55z_4C0Fpk/mqdefault.jpg" },

  // Technology / AI — Fireship shorts (verified popular channel)
  { id: "aircAruvnKk", title: "Machine Learning Explained in 100 Secs", category: "AI",            channelName: "Fireship",                 thumbnail: "https://i.ytimg.com/vi/aircAruvnKk/mqdefault.jpg" },
  { id: "rv9jRzdCmkE", title: "100+ Web Concepts Explained Quickly",   category: "Technology",     channelName: "Fireship",                 thumbnail: "https://i.ytimg.com/vi/rv9jRzdCmkE/mqdefault.jpg" },
  { id: "kCc8FmEb1nY", title: "Let's Build GPT — How AI LLMs Work",   category: "AI",             channelName: "Andrej Karpathy",          thumbnail: "https://i.ytimg.com/vi/kCc8FmEb1nY/mqdefault.jpg" },

  // More Finance / Growth
  { id: "BKorP55Aqvg", title: "Why Your Hard Work Is NOT Enough",      category: "Finance",        channelName: "TEDx",                     thumbnail: "https://i.ytimg.com/vi/BKorP55Aqvg/mqdefault.jpg" },
  { id: "Z8t4k0Q7lKw", title: "The Secret to Growing Wealth",          category: "Finance",        channelName: "TEDx",                     thumbnail: "https://i.ytimg.com/vi/Z8t4k0Q7lKw/mqdefault.jpg" },
  { id: "UF8uR6Z6KLc", title: "Steve Jobs' Commencement Speech",       category: "Entrepreneurship", channelName: "Stanford University",     thumbnail: "https://i.ytimg.com/vi/UF8uR6Z6KLc/mqdefault.jpg" },
  { id: "fLJsdqxnZb0", title: "How Successful People Think Differently", category: "Business",     channelName: "TEDx",                     thumbnail: "https://i.ytimg.com/vi/fLJsdqxnZb0/mqdefault.jpg" },
];


// ─── Today's date string (YYYY-MM-DD in WAT/UTC+1) ──────────────────────────
export function todayStr(): string {
  return new Date(Date.now() + 3600_000).toISOString().split("T")[0]; // WAT = UTC+1
}

// ─── Static fallback rotation (25 videos/day from pool) ───────────────────────
export function getStaticTodayVideos(): VideoItem[] {
  const dayOfYear = Math.floor((Date.now() + 3600_000) / 86_400_000); // WAT days since epoch
  const start     = (dayOfYear * 15) % VIDEO_POOL.length;
  const pool      = [...VIDEO_POOL, ...VIDEO_POOL, ...VIDEO_POOL];
  return pool.slice(start, start + 25);
}

// ─── Primary: read from Firestore daily_videos (filled by YouTube API cron) ──
export async function getTodayVideos(): Promise<VideoItem[]> {
  try {
    const today = todayStr();
    const snap  = await getDoc(doc(db, "daily_videos", today));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.videos) && data.videos.length > 0) {
        return data.videos as VideoItem[];
      }
    }
  } catch (_) { /* silent – fall through to static */ }
  return getStaticTodayVideos();
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

// ─── Generate a random reward ─────────────────────────────────────
export function generateReward(remaining: number, minReward: number, maxReward: number): number {
  const raw = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
  return Math.min(raw, remaining); // cap to not exceed daily limit
}

// ─── Claim reward after verified watch ───────────────────────────────────────
export async function claimAdReward(
  uid: string,
  videoId: string,
  nodeTier: string = "Node Alpha"
): Promise<{ success: boolean; reward: number; message: string }> {

  const profile = await getUserProfile(uid);
  if (profile?.accountStatus === 'suspended') {
    return { success: false, reward: 0, message: "Your account is suspended. You cannot earn rewards." };
  }

  const data  = await getAdRewardData(uid);
  const today = todayStr();
  const limits = TIER_LIMITS[nodeTier] || TIER_LIMITS["Node Alpha"];

  if (data.dailyEarnings >= limits.dailyCap) {
    return { success: false, reward: 0, message: "Daily ad earning limit reached. Come back tomorrow." };
  }

  if (data.watchedToday?.includes(videoId)) {
    return { success: false, reward: 0, message: "You've already earned from this video today." };
  }

  const remaining = limits.dailyCap - (data.dailyEarnings ?? 0);
  const reward    = generateReward(remaining, limits.minReward, limits.maxReward);

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
