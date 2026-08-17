import { fetchLeague } from "./client";
import type { EspnLeagueRaw } from "./types";

export function getAvailableSeasons(league: EspnLeagueRaw): number[] {
  return [...league.status.previousSeasons, league.seasonId].sort((a, b) => a - b);
}

/**
 * Seasons other than the current one, available for historical sync (see
 * src/lib/sync/historical.ts). Fetches the current season just to read its
 * `previousSeasons` list — ESPN doesn't expose that any other way.
 */
export async function getHistoricalSeasons(currentSeason: number): Promise<number[]> {
  const league = await fetchLeague(currentSeason);
  return getAvailableSeasons(league).filter((year) => year !== currentSeason);
}
