import { createClient } from "@/lib/supabase/server";

export type CachedChannelVideos = {
  channelName: string;
  channelId: string;
  videos: {
    videoId: string;
    title: string;
    thumbnailUrl: string | null;
    publishedAt: string | null;
  }[];
};

export async function getCachedVideosByChannel(): Promise<CachedChannelVideos[]> {
  const supabase = await createClient();
  const { data: channels } = await supabase
    .from("youtube_channels")
    .select("name, channel_id")
    .eq("enabled", true)
    .order("display_order", { ascending: true });

  if (!channels || channels.length === 0) return [];

  const { data: videos } = await supabase
    .from("youtube_videos_cache")
    .select("channel_id, video_id, title, thumbnail_url, published_at")
    .in("channel_id", channels.map((c) => c.channel_id))
    .order("published_at", { ascending: false });

  return channels.map((channel) => ({
    channelName: channel.name,
    channelId: channel.channel_id,
    videos: (videos ?? [])
      .filter((v) => v.channel_id === channel.channel_id)
      .map((v) => ({ videoId: v.video_id, title: v.title, thumbnailUrl: v.thumbnail_url, publishedAt: v.published_at })),
  }));
}
