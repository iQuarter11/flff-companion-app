import { getCachedVideosByChannel } from "@/lib/youtube/queries";
import { RefreshVideosButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const channels = await getCachedVideosByChannel();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
          <p className="mt-1 text-sm text-muted">Latest videos from configured league YouTube channels.</p>
        </div>
        <RefreshVideosButton />
      </div>

      {channels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No YouTube channels configured yet — add one to the youtube_channels table.
        </div>
      ) : (
        channels.map((channel) => (
          <section key={channel.channelId}>
            <h2 className="text-sm font-semibold text-muted">{channel.channelName}</h2>
            {channel.videos.length === 0 ? (
              <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
                No videos cached yet — click &quot;Refresh videos&quot; above.
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {channel.videos.map((video) => (
                  <a
                    key={video.videoId}
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-lg border border-surface-border bg-surface"
                  >
                    {video.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- external CDN thumbnail
                      <img src={video.thumbnailUrl} alt={video.title} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video w-full bg-surface-border" />
                    )}
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-medium group-hover:underline">{video.title}</p>
                      {video.publishedAt ? (
                        <p className="mt-1 text-xs text-muted">{new Date(video.publishedAt).toLocaleDateString()}</p>
                      ) : null}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  );
}
