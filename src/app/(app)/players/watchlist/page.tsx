import { createClient } from "@/lib/supabase/server";
import { getRosterOwnership } from "@/lib/league/queries";
import { PlayerHeadshot } from "@/components/players/player-headshot";
import { WatchlistButton } from "@/components/players/watchlist-button";
import type { PlayerIdentity } from "@/lib/player-cache/queries";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // (app)/layout.tsx already redirects unauthenticated users
  }

  const { data } = await supabase
    .from("watchlist")
    .select("player_id, player_identity_cache(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const players = ((data ?? []) as unknown as { player_id: number; player_identity_cache: PlayerIdentity }[])
    .map((row) => row.player_identity_cache)
    .filter(Boolean);

  const espnIds = players.map((p) => p.espn_id).filter((id): id is number => id !== null);
  const ownership = await getRosterOwnership(espnIds);

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
        You haven&apos;t watchlisted any players yet. Add players from Trending or Search.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => {
        const owner = player.espn_id ? ownership.get(player.espn_id) : undefined;
        const name = player.full_name ?? `ESPN #${player.espn_id}`;

        return (
          <li key={player.id} className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface p-3">
            <PlayerHeadshot src={player.headshot_url} name={name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-xs text-muted">
                {player.position ?? "—"} {player.nfl_team ? `· ${player.nfl_team}` : ""}
              </p>
            </div>
            <p className="hidden shrink-0 text-xs text-muted sm:block">{owner ? `Owned by ${owner.teamName}` : "Available"}</p>
            <WatchlistButton playerId={player.id} initiallyWatched />
          </li>
        );
      })}
    </ul>
  );
}
