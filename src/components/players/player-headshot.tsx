import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ESPN headshots are hosted on their CDN and can 404 for players outside
 * the identity cache's coverage. Since <img> onError requires a Client
 * Component and this needs to render in server-rendered lists cheaply,
 * the fallback is: no headshot_url -> silhouette icon, immediately, no
 * network request attempted.
 */
export function PlayerHeadshot({
  src,
  name,
  size = 40,
  className,
}: {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-surface-border text-muted", className)}
        style={{ width: size, height: size }}
        aria-label={name}
      >
        <UserRound className="size-1/2" aria-hidden="true" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN, no next/image domain config for now
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-full bg-surface-border object-cover", className)}
    />
  );
}
