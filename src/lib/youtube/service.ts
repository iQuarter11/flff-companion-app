import "server-only";
import { getServerEnv } from "@/lib/env";
import { fetchLatestVideosViaRss } from "./rss";
import { fetchLatestVideosViaApi } from "./api";
import type { ChannelVideo } from "./types";

/**
 * The one function callers should use — picks RSS (no key needed) or the
 * official API (if YOUTUBE_API_KEY is configured) without the caller
 * needing to know which. See docs/architecture.md.
 */
export async function fetchLatestVideos(channelId: string, limit = 5): Promise<ChannelVideo[]> {
  const env = getServerEnv();

  if (env.YOUTUBE_API_KEY) {
    return fetchLatestVideosViaApi(channelId, env.YOUTUBE_API_KEY, limit);
  }

  const videos = await fetchLatestVideosViaRss(channelId);
  return videos.slice(0, limit);
}
