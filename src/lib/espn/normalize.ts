import { fetchLeague } from "./client";
import { normalizeMembers, normalizeTeams } from "./teams";
import { normalizeRosters } from "./rosters";
import { normalizeMatchups } from "./matchups";
import { computeStandings } from "./standings";
import type { NormalizedLeague } from "@/types/league";

/**
 * Fetches this league's current ESPN data and normalizes it into our own
 * types in one pass. The single entry point Phase 2 code (the debug page,
 * the sync job) should use — nothing outside src/lib/espn/ should call
 * fetchLeague() or touch the raw response shape directly.
 */
export async function getNormalizedLeague(season: number): Promise<NormalizedLeague> {
  const raw = await fetchLeague(season);

  return {
    espnLeagueId: raw.id,
    season: raw.seasonId,
    currentWeek: raw.status.currentMatchupPeriod,
    settings: {
      name: raw.settings.name,
      size: raw.settings.size,
      regularSeasonMatchupCount: raw.settings.scheduleSettings.matchupPeriodCount,
      playoffTeamCount: raw.settings.scheduleSettings.playoffTeamCount,
    },
    members: normalizeMembers(raw),
    teams: normalizeTeams(raw),
    rosters: normalizeRosters(raw),
    matchups: normalizeMatchups(raw),
    standings: computeStandings(raw),
  };
}
