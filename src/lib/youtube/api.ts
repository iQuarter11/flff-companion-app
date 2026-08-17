import "server-only";
import { YoutubeUnavailableError } from "./rss";
import type { ChannelVideo } from "./types";

type SearchResponse = {
  items: {
    id: { videoId: string };
    snippet: { title: string; publishedAt: string; thumbnails?: { medium?: { url: string } } };
  }[];
};

/**
 * Official YouTube Data API v3 path, used only when YOUTUBE_API_KEY is
 * set. Not the default (see rss.ts) because it needs a key and consumes
 * API quota; kept as an upgrade path per the spec (better metadata,
 * higher rate limits) rather than a requirement.
 */
export async function fetchLatestVideosViaApi(channelId: string, apiKey: string, limit = 5): Promise<ChannelVideo[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("channelId", channelId);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("type", "video");

  let response: Response;
  try {
    response = await fetch(url, { next: { revalidate: 3600 } });
  } catch {
    throw new YoutubeUnavailableError("Could not reach the YouTube Data API.");
  }

  if (!response.ok) {
    throw new YoutubeUnavailableError(`YouTube Data API returned ${response.status} ${response.statusText}.`);
  }

  const data = (await response.json()) as SearchResponse;

  return data.items
    .filter((item) => item.id.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
      publishedAt: item.snippet.publishedAt,
    }));
}
