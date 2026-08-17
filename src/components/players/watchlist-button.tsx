"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toggleWatchlist } from "@/app/(app)/players/watchlist-actions";
import { cn } from "@/lib/utils";

export function WatchlistButton({ playerId, initiallyWatched }: { playerId: number; initiallyWatched: boolean }) {
  const [watched, setWatched] = useState(initiallyWatched);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const next = !watched;
        setWatched(next); // optimistic
        startTransition(async () => {
          const result = await toggleWatchlist(playerId, watched);
          setWatched(result.watched);
        });
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
        watched
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-surface-border text-muted hover:text-foreground"
      )}
    >
      {watched ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
      {watched ? "Watching" : "Watch"}
    </button>
  );
}
