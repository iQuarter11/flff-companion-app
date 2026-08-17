import type { EspnLeagueRaw, EspnMatchupRaw } from "./types";
import type { Matchup } from "@/types/league";

export function normalizeMatchup(raw: EspnMatchupRaw, regularSeasonMatchupCount: number): Matchup {
  return {
    espnMatchupId: raw.id,
    week: raw.matchupPeriodId,
    isPlayoff: raw.matchupPeriodId > regularSeasonMatchupCount,
    homeTeamId: raw.home.teamId,
    awayTeamId: raw.away?.teamId ?? null,
    homeScore: raw.home.totalPoints,
    awayScore: raw.away?.totalPoints ?? null,
    result: raw.winner,
  };
}

export function normalizeMatchups(league: EspnLeagueRaw): Matchup[] {
  const regularSeasonMatchupCount = league.settings.scheduleSettings.matchupPeriodCount;
  return league.schedule.map((raw) => normalizeMatchup(raw, regularSeasonMatchupCount));
}
