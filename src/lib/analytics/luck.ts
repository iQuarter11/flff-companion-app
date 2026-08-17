import type { AllPlayRecord } from "./all-play";

/**
 * Luck Rating: Actual Wins - Expected Wins, where Expected Wins is the sum
 * of each week's all-play win fraction (ties count as half a win). See
 * docs/analytics.md.
 */

export type SeasonLuck = {
  teamId: number;
  actualWins: number;
  expectedWins: number;
  luckDifferential: number;
};

/**
 * weeklyAllPlay must be one entry per week, each containing EVERY team's
 * AllPlayRecord for that week (i.e. the direct output of
 * computeWeeklyAllPlay) — not just the team being evaluated. The opponent
 * count for the win-fraction calculation is derived from week.length - 1,
 * so a week array missing teams silently understates opponentsPerTeam.
 */
export function computeSeasonLuck(
  actualWinsByTeam: Map<number, number>,
  weeklyAllPlay: AllPlayRecord[][]
): SeasonLuck[] {
  const expectedByTeam = new Map<number, number>();

  for (const week of weeklyAllPlay) {
    const opponentsPerTeam = week.length - 1;
    if (opponentsPerTeam <= 0) continue;

    for (const record of week) {
      const winFraction = (record.wins + record.ties * 0.5) / opponentsPerTeam;
      expectedByTeam.set(record.teamId, (expectedByTeam.get(record.teamId) ?? 0) + winFraction);
    }
  }

  return [...actualWinsByTeam.entries()].map(([teamId, actualWins]) => {
    const expectedWins = expectedByTeam.get(teamId) ?? 0;
    return {
      teamId,
      actualWins,
      expectedWins,
      luckDifferential: actualWins - expectedWins,
    };
  });
}
