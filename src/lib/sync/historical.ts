import "server-only";
import { getHistoricalSeasons } from "@/lib/espn/history";
import { runLeagueSync } from "./league";

export type HistoricalSyncResult = {
  season: number;
  ok: boolean;
  error?: string;
};

/**
 * Syncs every season ESPN reports for this league other than the current
 * one, so Rivalries/Records/Champions have real data instead of only the
 * current season. Each season is its own runLeagueSync() call with
 * isCurrent: false, so it never overwrites which season is "current" —
 * and one season failing (e.g. ESPN's data for a very old year is thin)
 * doesn't abort the rest.
 */
export async function syncAllHistoricalSeasons(currentSeason: number): Promise<HistoricalSyncResult[]> {
  const seasons = await getHistoricalSeasons(currentSeason);
  const results: HistoricalSyncResult[] = [];

  for (const season of seasons) {
    try {
      await runLeagueSync(season, { isCurrent: false });
      results.push({ season, ok: true });
    } catch (error) {
      results.push({ season, ok: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return results;
}
