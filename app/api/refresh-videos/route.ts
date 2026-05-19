import { NextRequest, NextResponse } from "next/server";
import { todayStr, VIDEO_POOL, VideoItem } from "@/lib/adRewards";

// ─── Category search queries ──────────────────────────────────────────────────
const SEARCH_QUERIES = [
  { q: "finance investing money tips",             category: "Finance" },
  { q: "business leadership entrepreneurship",     category: "Business" },
  { q: "motivation self improvement mindset",      category: "Motivation" },
  { q: "artificial intelligence technology 2024",  category: "AI" },
  { q: "startup entrepreneurship success",         category: "Entrepreneurship" },
  { q: "productivity focus deep work habits",      category: "Productivity" },
  { q: "financial freedom wealth building",        category: "Finance" },
];

const YT = "https://www.googleapis.com/youtube/v3";
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ── Fetch a Firestore doc via REST (no admin SDK required) ───────────────────
async function fsGet(collection: string, docId: string) {
  const res = await fetch(`${FS_BASE}/${collection}/${docId}?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.fields ? json : null;
}

async function fsSet(collection: string, docId: string, data: Record<string, any>) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) {
      fields[k] = { arrayValue: { values: v.map(item => typeof item === "object" ? { mapValue: { fields: Object.fromEntries(Object.entries(item).map(([ik, iv]) => [ik, { stringValue: String(iv) }])) } } : { stringValue: String(item) }) } };
    } else if (typeof v === "string") {
      fields[k] = { stringValue: v };
    } else if (typeof v === "number") {
      fields[k] = { integerValue: String(v) };
    }
  }
  const url = `${FS_BASE}/${collection}/${docId}?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
  await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
}

// ── Fetch one video from YouTube Data API ─────────────────────────────────────
async function fetchVideo(q: string, category: string, apiKey: string, usedIds: Set<string>): Promise<VideoItem | null> {
  const params = new URLSearchParams({
    part: "snippet", q, type: "video",
    videoDuration: "medium", videoEmbeddable: "true",
    safeSearch: "strict", maxResults: "10",
    order: "relevance", key: apiKey,
  });

  try {
    const res  = await fetch(`${YT}/search?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.items?.length) return null;

    // Pick first item not already used
    for (const item of data.items) {
      const id = item.id?.videoId;
      if (!id || usedIds.has(id)) continue;
      usedIds.add(id);
      const snip = item.snippet;
      return {
        id,
        title:       snip.title?.slice(0, 80) ?? "Video",
        category,
        channelName: snip.channelTitle ?? "",
        thumbnail:   snip.thumbnails?.medium?.url ?? `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      };
    }
  } catch (_) {}
  return null;
}

export async function GET(req: NextRequest) {
  // Security check
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY not configured in Vercel environment variables" }, { status: 500 });
  }

  const today = todayStr();

  try {
    // Check if today already fetched
    const existing = await fsGet("daily_videos", today);
    if (existing) {
      return NextResponse.json({ message: "Already fetched today", date: today });
    }

    // Fetch videos from YouTube
    const usedIds = new Set<string>();
    const results = await Promise.allSettled(
      SEARCH_QUERIES.map(({ q, category }) => fetchVideo(q, category, apiKey, usedIds))
    );

    const videos: VideoItem[] = results
      .filter(r => r.status === "fulfilled" && r.value)
      .map(r => (r as PromiseFulfilledResult<VideoItem>).value!);

    if (videos.length < 3) {
      // Insufficient YouTube results — log and return error (static pool will be used by clients)
      console.error("YouTube API returned insufficient results:", videos.length);
      return NextResponse.json({ warning: "Too few results from YouTube API. Static pool will be used.", count: videos.length }, { status: 200 });
    }

    // Store in Firestore
    await fsSet("daily_videos", today, {
      date:      today,
      fetchedAt: new Date().toISOString(),
      source:    "youtube_api",
      count:     videos.length,
      // Note: storing videos array via the helper above
    });

    // Also store videos array separately since our fsSet doesn't handle complex nested arrays perfectly
    const url = `${FS_BASE}/daily_videos/${today}?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
    const videoFields = {
      fields: {
        date:      { stringValue: today },
        fetchedAt: { stringValue: new Date().toISOString() },
        source:    { stringValue: "youtube_api" },
        videos: {
          arrayValue: {
            values: videos.map(v => ({
              mapValue: {
                fields: {
                  id:          { stringValue: v.id },
                  title:       { stringValue: v.title },
                  category:    { stringValue: v.category },
                  channelName: { stringValue: v.channelName },
                  thumbnail:   { stringValue: v.thumbnail },
                }
              }
            }))
          }
        }
      }
    };
    await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(videoFields) });

    return NextResponse.json({ success: true, date: today, count: videos.length, videoIds: videos.map(v => v.id) });

  } catch (err: any) {
    console.error("refresh-videos error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
