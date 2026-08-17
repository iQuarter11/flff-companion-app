import Link from "next/link";
import { getTrendingPlayerIds, type TrendingDirection } from "@/lib/sleeper/trending";
import { getPlayersBySleeperIds } from "@/lib/player-cache/queries";
import { sleeperHeadshotUrl } from "@/lib/player-cache/headshot";
import { getRosterOwnership, getWatchlistedPlayerIds } from "@/lib/league/queries";
import { SleeperUnavailableError } from "@/lib/sleeper/client";
import { PlayerHeadshot } from "@/components/players/player-headshot";
import { WatchlistButton } from "@/components/players/watchlist-button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const POSITIONS = ["All", "QB", "RB", "WR", "TE", "K", "DST"] as const;
const DEFAULT_LOOKBACK_HOURS = 24;
const DEFAULT_LIMIT = 25;

function TabLink({ direction, active }: { direction: TrendingDirection; active: boolean }) {
  return (
    <Link
      href={`/players?direction=${direction}`}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium",
        active ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
      )}
    >
      {direction === "add" ? "Trending Adds" : "Trending Drops"}
    </Link>
  );
}

function PositionFilterLink({
  position,
  active,
  direction,
}: {
  position: (typeof POSITIONS)[number];
  active: boolean;
  direction: TrendingDirection;
}) {
  return (
    <Link
      href={`/players?direction=${direction}${position === "All" ? "" : `&position=${position}`}`}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium",
        active ? "border-accent/40 bg-accent/10 text-accent" : "border-surface-border text-muted hover:text-foreground"
      )}
    >
      {position}
    </Link>
  );
}

export default async function TrendingPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; position?: string }>;
}) {
  const params = await searchParams;
  const direction: TrendingDirection = params.direction === "drop" ? "drop" : "add";
  const positionFilter = (params.position ?? "All").toUpperCase();

  let error: string | null = null;
  let rows: { sleeperId: string; count: number; identity: Awaited<ReturnType<typeof getPlayersBySleeperIds>>[number] | undefined }[] = [];

  try {
    const trending = await getTrendingPlayerIds(direction, DEFAULT_LOOKBACK_HOURS, DEFAULT_LIMIT);
    const identities = await getPlayersBySleeperIds(trending.map((t) => t.player_id));
    const identityBySleeperId = new Map(identities.map((i) => [i.sleeper_id, i]));
    rows = trending.map((t) => ({ sleeperId: t.player_id, count: t.count, identity: identityBySleeperId.get(t.player_id) }));
  } catch (e) {
    error = e instanceof SleeperUnavailableError ? e.message : "Failed to load trending players.";
  }

  if (positionFilter !== "ALL") {
    rows = rows.filter((r) => r.identity?.position === positionFilter);
  }

  const espnIds = rows.map((r) => r.identity?.espn_id).filter((id): id is number => id !== null && id !== undefined);
  const [ownership, watchlisted] = await Promise.all([getRosterOwnership(espnIds), getWatchlistedPlayerIds()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1">
        <TabLink direction="add" active={direction === "add"} />
        <TabLink direction="drop" active={direction === "drop"} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {POSITIONS.map((p) => (
          <PositionFilterLink key={p} position={p} active={positionFilter === p.toUpperCase()} direction={direction} />
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No trending players in this window/position.
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const owner = row.identity?.espn_id ? ownership.get(row.identity.espn_id) : undefined;
            const name = row.identity?.full_name ?? `Sleeper #${row.sleeperId}`;
            const headshotSrc = row.identity?.headshot_url ?? sleeperHeadshotUrl(row.sleeperId);

            return (
              <li key={row.sleeperId} className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface p-3">
                <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted">{index + 1}</span>
                <PlayerHeadshot src={headshotSrc} name={name} size={40} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted">
                    {row.identity?.position ?? "—"} {row.identity?.nfl_team ? `· ${row.identity.nfl_team}` : ""}
                  </p>
                </div>

                <div className="hidden shrink-0 text-right sm:block">
                  <p className={cn("text-sm font-semibold", direction === "add" ? "text-accent" : "text-red-500")}>
                    {direction === "add" ? "▲" : "▼"} {row.count.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted">{owner ? `Owned by ${owner.teamName}` : "Available"}</p>
                </div>

                {row.identity ? (
                  <WatchlistButton playerId={row.identity.id} initiallyWatched={watchlisted.has(row.identity.id)} />
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
