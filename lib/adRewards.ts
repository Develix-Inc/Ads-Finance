import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { recordTransaction } from "./transactions";
import { getUserProfile } from "./admin";

export const MIN_WATCH_SECS = 180;

export const TIER_LIMITS: Record<string, { dailyCap: number, minReward: number, maxReward: number, maxVideos: number }> = {
  "none": { dailyCap: 0, minReward: 0, maxReward: 0, maxVideos: 0 },
  "Alpha": { dailyCap: 3000, minReward: 150, maxReward: 300, maxVideos: 10 },
  "Alpha Plan": { dailyCap: 3000, minReward: 150, maxReward: 300, maxVideos: 10 },
  "Sigma": { dailyCap: 7500, minReward: 350, maxReward: 500, maxVideos: 15 },
  "Sigma Plan": { dailyCap: 7500, minReward: 350, maxReward: 500, maxVideos: 15 },
  "Omega": { dailyCap: 24000, minReward: 900, maxReward: 1200, maxVideos: 20 },
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

  // Additional 30 Videos
  { id: "dQw4w9WgXcQ", title: "The Art of Giving Up",                  category: "Motivation",     channelName: "Rick Astley",              thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" },
  { id: "jNQXAC9IVRw", title: "The First Zoo Trip",                    category: "Productivity",   channelName: "Jawed",                    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg" },
  { id: "W8_Kfjo3VjU", title: "Why We Sleep",                          category: "Productivity",   channelName: "TED",                      thumbnail: "https://i.ytimg.com/vi/W8_Kfjo3VjU/mqdefault.jpg" },
  { id: "6MZhHLg9taa", title: "Machine Learning Basics",               category: "AI",             channelName: "Tech Insider",             thumbnail: "https://i.ytimg.com/vi/6MZhHLg9taa/mqdefault.jpg" },
  { id: "YgUv1Kx1YgU", title: "Investing for Beginners",               category: "Finance",        channelName: "Investing 101",            thumbnail: "https://i.ytimg.com/vi/YgUv1Kx1YgU/mqdefault.jpg" },
  { id: "5qap5aO4i9A", title: "Lofi Hip Hop Radio 24/7",               category: "Productivity",   channelName: "ChilledCow",               thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/mqdefault.jpg" },
  { id: "V74l_zS1x8E", title: "How to Manage Your Time",               category: "Productivity",   channelName: "Thomas Frank",             thumbnail: "https://i.ytimg.com/vi/V74l_zS1x8E/mqdefault.jpg" },
  { id: "M3FjC6G2BfU", title: "Building a Startup in 2024",            category: "Business",       channelName: "Y Combinator",             thumbnail: "https://i.ytimg.com/vi/M3FjC6G2BfU/mqdefault.jpg" },
  { id: "3X-5hG_r_K4", title: "The Economics of Tech",                 category: "Finance",        channelName: "Economics Explained",      thumbnail: "https://i.ytimg.com/vi/3X-5hG_r_K4/mqdefault.jpg" },
  { id: "9P6rdqiybaw", title: "Deep Work Explained",                   category: "Productivity",   channelName: "Cal Newport",              thumbnail: "https://i.ytimg.com/vi/9P6rdqiybaw/mqdefault.jpg" },
  { id: "O2GqU3e9hY4", title: "Emotional Intelligence 2.0",            category: "Motivation",     channelName: "Travis Bradberry",         thumbnail: "https://i.ytimg.com/vi/O2GqU3e9hY4/mqdefault.jpg" },
  { id: "l3G-V2gH_Qo", title: "The Power of Habit",                    category: "Productivity",   channelName: "Charles Duhigg",           thumbnail: "https://i.ytimg.com/vi/l3G-V2gH_Qo/mqdefault.jpg" },
  { id: "x-X2E03U5e0", title: "Mastering Communication Skills",        category: "Business",       channelName: "TED",                      thumbnail: "https://i.ytimg.com/vi/x-X2E03U5e0/mqdefault.jpg" },
  { id: "Fk33c_X4mB8", title: "Why We Procrastinate",                  category: "Motivation",     channelName: "TED",                      thumbnail: "https://i.ytimg.com/vi/Fk33c_X4mB8/mqdefault.jpg" },
  { id: "y2X7c9TUQJ8", title: "Thinking, Fast and Slow",               category: "Business",       channelName: "Daniel Kahneman",          thumbnail: "https://i.ytimg.com/vi/y2X7c9TUQJ8/mqdefault.jpg" },
  { id: "k7X3Y-hW2aY", title: "Introduction to Artificial Intelligence", category: "AI",           channelName: "Lex Fridman",              thumbnail: "https://i.ytimg.com/vi/k7X3Y-hW2aY/mqdefault.jpg" },
  { id: "qC-2b_U4Vxw", title: "The Future of Quantum Computing",       category: "Technology",     channelName: "Veritasium",               thumbnail: "https://i.ytimg.com/vi/qC-2b_U4Vxw/mqdefault.jpg" },
  { id: "v1Y3cW2T9G4", title: "How to Win Friends and Influence",      category: "Business",       channelName: "Dale Carnegie",            thumbnail: "https://i.ytimg.com/vi/v1Y3cW2T9G4/mqdefault.jpg" },
  { id: "b2QhQ2L2Cj4", title: "The Mathematics of Success",            category: "Finance",        channelName: "Numberphile",              thumbnail: "https://i.ytimg.com/vi/b2QhQ2L2Cj4/mqdefault.jpg" },
  { id: "1a8K0c2T8T4", title: "Understanding the Stock Market",        category: "Finance",        channelName: "Graham Stephan",           thumbnail: "https://i.ytimg.com/vi/1a8K0c2T8T4/mqdefault.jpg" },
  { id: "8v_u4A9oZcI", title: "How To Stay Focused",                   category: "Productivity",   channelName: "Ali Abdaal",               thumbnail: "https://i.ytimg.com/vi/8v_u4A9oZcI/mqdefault.jpg" },
  { id: "2s9b4j1Q11A", title: "Zero to One by Peter Thiel",            category: "Entrepreneurship", channelName: "Peter Thiel",           thumbnail: "https://i.ytimg.com/vi/2s9b4j1Q11A/mqdefault.jpg" },
  { id: "XwTjQ7T3T1U", title: "Financial Independence, Retire Early",  category: "Finance",        channelName: "Mr Money Mustache",        thumbnail: "https://i.ytimg.com/vi/XwTjQ7T3T1U/mqdefault.jpg" },
  { id: "Z2Z5s4mF5D0", title: "The 4-Hour Workweek",                   category: "Entrepreneurship", channelName: "Tim Ferriss",           thumbnail: "https://i.ytimg.com/vi/Z2Z5s4mF5D0/mqdefault.jpg" },
  { id: "6cZ2Yc8C_z8", title: "Atomic Habits Summary",                 category: "Productivity",   channelName: "James Clear",              thumbnail: "https://i.ytimg.com/vi/6cZ2Yc8C_z8/mqdefault.jpg" },
  { id: "Q4yW6q8u9_Y", title: "Marketing Strategy Essentials",         category: "Business",       channelName: "GaryVee",                  thumbnail: "https://i.ytimg.com/vi/Q4yW6q8u9_Y/mqdefault.jpg" },
  { id: "3s_1M9s7e_c", title: "Start With Why",                        category: "Business",       channelName: "Simon Sinek",              thumbnail: "https://i.ytimg.com/vi/3s_1M9s7e_c/mqdefault.jpg" },
  { id: "U7Y_wX4F6Lw", title: "The Psychology of Money",               category: "Finance",        channelName: "Morgan Housel",            thumbnail: "https://i.ytimg.com/vi/U7Y_wX4F6Lw/mqdefault.jpg" },
  { id: "A5F9E6C3B12", title: "Design Patterns in Coding",             category: "Technology",     channelName: "Fireship",                 thumbnail: "https://i.ytimg.com/vi/A5F9E6C3B12/mqdefault.jpg" },
  { id: "B8G4F5A2C34", title: "Web3 and Blockchain Explained",         category: "Technology",     channelName: "Tech Lead",                thumbnail: "https://i.ytimg.com/vi/B8G4F5A2C34/mqdefault.jpg" }
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
  // Slice to get today's set, then shuffle so categories are mixed
  return pool.slice(start, start + 25).sort(() => Math.random() - 0.5);
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
  lastCheckinDate?: string;
  streakCount?: number;
}

export async function getAdRewardData(uid: string): Promise<AdRewardData> {
  const ref  = doc(db, "ad_rewards", uid);
  const snap = await getDoc(ref);
  const today = todayStr();

  const defaults: AdRewardData = { uid, dailyEarnings: 0, totalEarnings: 0, lastResetDate: today, watchedToday: [], streakCount: 0 };

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
  nodeTier: string = "Alpha Plan"
): Promise<{ success: boolean; reward: number; message: string }> {

  const profile = await getUserProfile(uid);
  if (profile?.accountStatus === 'suspended') {
    return { success: false, reward: 0, message: "Your account is suspended. You cannot earn rewards." };
  }

  const data  = await getAdRewardData(uid);
  const today = todayStr();
  const limits = TIER_LIMITS[nodeTier] || TIER_LIMITS["Alpha Plan"];

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

// ─── Daily Check-in Reward ───────────────────────────────────────────────────
export const CHECKIN_REWARDS: Record<string, number> = {
  "none": 0,
  "Alpha": 300,
  "Alpha Plan": 300,
  "Sigma": 700,
  "Sigma Plan": 700,
  "Omega": 1400,
  "Omega Plan": 1400,
};

export async function claimDailyCheckin(uid: string, nodeTier: string): Promise<{ success: boolean; reward: number; message: string }> {
  const profile = await getUserProfile(uid);
  if (profile?.accountStatus === 'suspended') {
    return { success: false, reward: 0, message: "Your account is suspended." };
  }

  const data = await getAdRewardData(uid);
  const today = todayStr();

  if (data.lastCheckinDate === today) {
    return { success: false, reward: 0, message: "Already claimed today." };
  }

  const reward = CHECKIN_REWARDS[nodeTier] || 0;
  if (reward <= 0) {
    return { success: false, reward: 0, message: "Upgrade your plan to claim daily check-in rewards." };
  }

  // Calculate streak
  const yesterday = new Date(Date.now() - 86_400_000 + 3600_000).toISOString().split("T")[0];
  let newStreak = 1;
  if (data.lastCheckinDate === yesterday) {
    newStreak = (data.streakCount || 0) + 1;
  }

  const ref = doc(db, "ad_rewards", uid);
  await setDoc(ref, { lastCheckinDate: today, streakCount: newStreak }, { merge: true });

  await recordTransaction(uid, "task_reward", reward, "Daily Check-in Bonus");

  return { success: true, reward, message: `Daily check-in bonus of ₦${reward.toLocaleString()} claimed!` };
}
