import type { EspnLeagueRaw } from "./types";
import type { Standing } from "@/types/league";

/**
 * Standings are win/loss standings, not to be confused with Power Rankings
 * (Phase 5), which is a deliberately different, custom-weighted metric.
 *
 * Ranked by win percentage (ties counted as half a win), then points for as
 * a tiebreaker. ESPN's own tiebreaker rules (division record, head-to-head,
 * etc.) aren't exposed in this payload, so this is a reasonable
 * approximation, not a guarantee of matching ESPN's displayed order exactly
 * in a tied scenario.
 */
export function computeStandings(league: EspnLeagueRaw): Standing[] {
  const withPct = league.teams.map((team) => {
    const { wins, losses, ties, pointsFor, pointsAgainst, streakType, streakLength } = team.record.overall;
    const games = wins + losses + ties;
    const pct = games === 0 ? 0 : (wins + ties * 0.5) / games;

    return {
      espnTeamId: team.id,
      wins,
      losses,
      ties,
      pointsFor,
      pointsAgainst,
      streakType,
      streakLength,
      pct,
    };
  });

  withPct.sort((a, b) => b.pct - a.pct || b.pointsFor - a.pointsFor);

  return withPct.map((team, index): Standing => ({
    espnTeamId: team.espnTeamId,
    rank: index + 1,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointsFor: team.pointsFor,
    pointsAgainst: team.pointsAgainst,
    streakType: team.streakType,
    streakLength: team.streakLength,
  }));
}
