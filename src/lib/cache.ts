import { supabase } from "./supabase";
import { LyricsLine } from "@/store/usePlayerStore";

export async function getCachedLyrics(trackId: string, language: string): Promise<LyricsLine[] | null> {
  try {
    const { data, error } = await supabase
      .from("translation_cache")
      .select("lyrics_json")
      .eq("track_id", trackId)
      .eq("language", language)
      .single();

    if (error || !data) return null;

    return data.lyrics_json as LyricsLine[];
  } catch (err) {
    console.error("Cache Fetch Error:", err);
    return null;
  }
}

export async function saveCachedLyrics(trackId: string, language: string, lyrics: LyricsLine[]) {
  try {
    const { error } = await supabase
      .from("translation_cache")
      .upsert(
        {
          track_id: trackId,
          language: language,
          lyrics_json: lyrics,
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

export async function logActivity(
  action: string,
  data: {
    user_email?: string;
    track_name?: string;
    artist?: string;
    target_lang?: string;
  }
) {
  try {
    const { error } = await supabase.from("activity_logs").insert({
      action,
      user_email: data.user_email || "anonymous", // or null if you prefer
      track_name: data.track_name,
      artist: data.artist,
      target_lang: data.target_lang,
    });

    if (error) {
      console.error("Log Activity Error:", error);
    }
  } catch (err) {
    console.error("Log Activity Exception:", err);
  }
}
