import type { ChannelVideo } from "./types";

export class YoutubeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeUnavailableError";
  }
}

const XML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

function decodeXmlEntities(text: string): string {
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/g, (m) => XML_ENTITIES[m] ?? m);
}

/**
 * YouTube's public per-channel RSS feed (no API key required) — see
 * docs/architecture.md. Returns the ~15 most recent uploads. This is
 * deliberately a small hand-rolled parser rather than a full XML library:
 * the feed's <entry> structure is stable and documented, and pulling in an
 * XML dependency for four regex-extractable fields isn't worth it.
 */
export async function fetchLatestVideosViaRss(channelId: string): Promise<ChannelVideo[]> {
  let response: Response;
  try {
    response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`, {
      next: { revalidate: 3600 },
    });
  } catch {
    throw new YoutubeUnavailableError("Could not reach YouTube.");
  }

  if (!response.ok) {
    throw new YoutubeUnavailableError(`YouTube RSS returned ${response.status} ${response.statusText}.`);
  }

  const xml = await response.text();
  const entries = xml.split("<entry>").slice(1); // first chunk is feed-level metadata, not an entry

  return entries
    .map((entry): ChannelVideo | null => {
      const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
      const title = entry.match(/<title>([^<]*)<\/title>/)?.[1];
      const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];
      const thumbnail = entry.match(/<media:thumbnail url="([^"]+)"/)?.[1];

      if (!videoId || !title || !published) return null;

      return {
        videoId,
        title: decodeXmlEntities(title),
        thumbnailUrl: thumbnail ?? null,
        publishedAt: published,
      };
    })
    .filter((v): v is ChannelVideo => v !== null);
}
