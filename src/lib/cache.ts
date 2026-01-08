import { supabase } from "./supabase";
import { LyricsLine } from "@/store/usePlayerStore";

// Helper to get current time in KST (UTC+9) as timestamp string (without timezone)
function getKSTTimestamp() {
  // Get current UTC time in milliseconds (getTime() returns UTC)
  const now = new Date();
  const utcMs = now.getTime();

  // Add KST offset (UTC+9 = 9 hours = 32400000 ms)
  const kstMs = utcMs + (9 * 60 * 60 * 1000);
  const kstDate = new Date(kstMs);

  // Format as YYYY-MM-DD HH:mm:ss.SSS (PostgreSQL timestamp format)
  // kstDate represents KST time, so we use UTC methods to extract components
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');
  const hours = String(kstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(kstDate.getUTCMilliseconds()).padStart(3, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export async function getCachedLyrics(
  trackId: string,
  language: string
): Promise<LyricsLine[] | null> {
  try {
    const { data, error } = await supabase
      .from("translation_cache")
      .select("lyrics_json")
      .eq("track_id", trackId)
      .eq("language", language)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return data.lyrics_json as LyricsLine[];
  } catch (err) {
    console.error("Cache Fetch Error:", err);
    return null;
  }
}

export async function saveCachedLyrics(
  trackId: string,
  language: string,
  lyrics: LyricsLine[]
) {
  try {
    const { error } = await supabase.from("translation_cache").upsert(
      {
        track_id: trackId,
        language,
        lyrics_json: lyrics,
        created_at: getKSTTimestamp(),
      },
      { onConflict: "track_id, language" }
    );

    if (error) {
      console.error("Cache Save Error:", error);
    }
  } catch (err) {
    console.error("Cache Save Exception:", err);
  }
}

interface LogActivityData {
  user_email?: string;
  track_name?: string;
  artist?: string;
  target_lang?: string;
  is_cached?: boolean;
  user_agent?: string;
  referer?: string;
  device_type?: string;
  country_code?: string;
}

export async function logActivity(action: string, data: LogActivityData) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      action,
      user_email: data.user_email || "anonymous",
      track_name: data.track_name,
      artist: data.artist,
      target_lang: data.target_lang,
      is_cached: data.is_cached || false,
      user_agent: data.user_agent,
      referer: data.referer,
      device_type: data.device_type,
      country_code: data.country_code,
      created_at: getKSTTimestamp(),
    });

    if (error) {
      console.error("Log Activity Error:", error);
    }
  } catch (err) {
    console.error("Log Activity Exception:", err);
  }
}
