"use server";

import { revalidatePath } from "next/cache";
import { runLeagueSync } from "@/lib/sync/league";
import { computeAndStorePowerRankings } from "@/lib/sync/power-rankings";
import { syncAllHistoricalSeasons } from "@/lib/sync/historical";
import { generateAndStoreRecap } from "@/lib/sync/recap";
import { getServerEnv } from "@/lib/env";

export type SyncActionState = {
  error: string | null;
  success: boolean;
  summary: string | null;
};

/**
 * Runs the sync directly server-side (this page is already behind the
 * (app) auth gate) — deliberately not going through /api/sync/espn, so the
 * SYNC_SECRET used to protect that public endpoint never needs to reach
 * the browser.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, ...) signature
export async function triggerSync(_prevState: SyncActionState): Promise<SyncActionState> {
  const env = getServerEnv();
  const season = Number(env.ESPN_SEASON ?? new Date().getFullYear());

  try {
    const result = await runLeagueSync(season);
    const powerRankings = await computeAndStorePowerRankings(result.seasonId);

    // Recap the most recently completed week (currentWeek is normally the
    // upcoming/in-progress one). A more thorough version would backfill
    // every completed-but-unrecapped week; this covers the common case of
    // syncing roughly once per week.
    let recapSummary = "";
    if (powerRankings && powerRankings.week > 1) {
      const recap = await generateAndStoreRecap(result.seasonId, powerRankings.week - 1);
      recapSummary = recap.gameOfTheWeek ? `, recap for week ${powerRankings.week - 1}` : "";
    }

    revalidatePath("/dev/espn");
    revalidatePath("/league/power-rankings");
    revalidatePath("/history");
    revalidatePath("/");

    const rankingsSummary = powerRankings ? `, power rankings for week ${powerRankings.week}` : "";
    return {
      error: null,
      success: true,
      summary: `Synced ${result.teamCount} teams, ${result.matchupCount} matchups, ${result.rosterPlayerCount} roster players${rankingsSummary}${recapSummary}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    return { error: message, success: false, summary: null };
  }
}

/**
 * Syncs every prior season ESPN reports for this league (see
 * src/lib/sync/historical.ts) — needed for Rivalries/Records/Champions.
 * Separate button from the main sync since it's several large ESPN
 * requests (one per season) and is normally a one-time or occasional
 * action, not something to run on every page load.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, ...) signature
export async function triggerHistoricalSync(_prevState: SyncActionState): Promise<SyncActionState> {
  const env = getServerEnv();
  const currentSeason = Number(env.ESPN_SEASON ?? new Date().getFullYear());

  try {
    const results = await syncAllHistoricalSeasons(currentSeason);
    revalidatePath("/dev/espn");
    revalidatePath("/history");

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const failedSummary = failed.length > 0 ? ` Failed: ${failed.map((f) => `${f.season} (${f.error})`).join(", ")}` : "";

    return {
      error: null,
      success: true,
      summary: `Synced ${succeeded.length}/${results.length} historical seasons (${succeeded.map((s) => s.season).join(", ") || "none"}).${failedSummary}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown historical sync error";
    return { error: message, success: false, summary: null };
  }
}
