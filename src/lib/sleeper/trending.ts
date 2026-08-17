import { sleeperFetch } from "./client";

export type TrendingDirection = "add" | "drop";

export type SleeperTrendingEntry = {
  player_id: string;
  count: number;
};

/**
 * Raw Sleeper trending fetch — just IDs + counts, in Sleeper's own ranked
 * order. Resolving those IDs to display data (name, headshot, league
 * ownership) is a separate concern; see src/lib/league/queries.ts and the
 * Trending page, which join this against player_identity_cache and
 * team_rosters.
 */
export async function getTrendingPlayerIds(
  direction: TrendingDirection,
  lookbackHours = 24,
  limit = 25
): Promise<SleeperTrendingEntry[]> {
  return sleeperFetch<SleeperTrendingEntry[]>(
    `/players/nfl/trending/${direction}?lookback_hours=${lookbackHours}&limit=${limit}`
  );
}
