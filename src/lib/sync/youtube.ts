import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLatestVideos } from "@/lib/youtube/service";

export type YoutubeSyncResult = {
  channel: string;
  ok: boolean;
  videoCount: number;
  error?: string;
};

/**
 * Refreshes youtube_videos_cache for every enabled channel. One channel
 * failing (a bad channel_id, YouTube being briefly unavailable) doesn't
 * block the others.
 */
export async function syncYoutubeVideos(): Promise<YoutubeSyncResult[]> {
  const supabase = createAdminClient();
  const { data: channels } = await supabase
    .from("youtube_channels")
    .select("name, channel_id")
    .eq("enabled", true);

  if (!channels || channels.length === 0) return [];

  const results: YoutubeSyncResult[] = [];

  for (const channel of channels) {
    try {
      const videos = await fetchLatestVideos(channel.channel_id, 5);

      if (videos.length > 0) {
        const { error } = await supabase.from("youtube_videos_cache").upsert(
          videos.map((v) => ({
            channel_id: channel.channel_id,
            video_id: v.videoId,
            title: v.title,
            thumbnail_url: v.thumbnailUrl,
            published_at: v.publishedAt,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: "channel_id,video_id" }
        );
        if (error) throw new Error(error.message);
      }

      results.push({ channel: channel.name, ok: true, videoCount: videos.length });
    } catch (error) {
      results.push({ channel: channel.name, ok: false, videoCount: 0, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return results;
}
