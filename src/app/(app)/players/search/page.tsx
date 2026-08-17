import { searchPlayers } from "@/lib/player-cache/queries";
import { resolveHeadshotUrl } from "@/lib/player-cache/headshot";
import { getRosterOwnership, getWatchlistedPlayerIds } from "@/lib/league/queries";
import { PlayerHeadshot } from "@/components/players/player-headshot";
import { WatchlistButton } from "@/components/players/watchlist-button";

export const dynamic = "force-dynamic";

export default async function PlayerSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query ? await searchPlayers(query, 25) : [];
  const espnIds = results.map((r) => r.espn_id).filter((id): id is number => id !== null);
  const [ownership, watchlisted] = await Promise.all([getRosterOwnership(espnIds), getWatchlistedPlayerIds()]);

  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by name, team, or position…"
          autoFocus
          className="flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          Search
        </button>
      </form>

      {!query ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          Search the cached player database by name, team, or position.
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No players found for &quot;{query}&quot;.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {results.map((player) => {
            const owner = player.espn_id ? ownership.get(player.espn_id) : undefined;
            const name = player.full_name ?? `ESPN #${player.espn_id}`;

            return (
              <li key={player.id} className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface p-3">
                <PlayerHeadshot src={resolveHeadshotUrl(player)} name={name} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted">
                    {player.position ?? "—"} {player.nfl_team ? `· ${player.nfl_team}` : ""}
                  </p>
                </div>
                <p className="hidden shrink-0 text-xs text-muted sm:block">{owner ? `Owned by ${owner.teamName}` : "Available"}</p>
                <WatchlistButton playerId={player.id} initiallyWatched={watchlisted.has(player.id)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
