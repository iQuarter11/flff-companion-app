import { computeWeeklyAllPlay } from "./all-play";

export type RecapMatchupInput = {
  homeTeamId: number;
  homeTeamName: string;
  awayTeamId: number;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
};

export type RecapRankInput = { teamId: number; teamName: string; rank: number; previousRank: number | null };

export type WeeklyRecap = {
  week: number;
  gameOfTheWeek: { home: string; away: string; homeScore: number; awayScore: number } | null;
  biggestBlowout: { winner: string; loser: string; winnerScore: number; loserScore: number; margin: number } | null;
  closestGame: { home: string; away: string; homeScore: number; awayScore: number; margin: number } | null;
  highestScorer: { team: string; points: number } | null;
  lowestScorer: { team: string; points: number } | null;
  biggestUpset: { winner: string; loser: string; rankGap: number } | null;
  powerMove: { team: string; from: number; to: number } | null;
  luckiestWin: { team: string; allPlayLosses: number } | null;
  unluckiestLoss: { team: string; allPlayWins: number } | null;
  standingsChanges: { team: string; from: number; to: number }[];
};

/**
 * Pure function: no I/O, no ESPN/Supabase calls — everything it needs is
 * passed in. src/lib/sync/recap.ts fetches the inputs and stores the
 * result. Kept pure specifically so the selection logic (game of the
 * week, upsets, luckiest win) can be unit tested without a database.
 *
 * "Best Player Performance" from the spec is deliberately omitted: it
 * requires per-player weekly scoring, which isn't synced yet (roster
 * snapshots don't currently carry points) — see docs/analytics.md. Adding
 * a fabricated number here would violate "never fabricate ESPN data."
 */
export function generateWeeklyRecap(
  week: number,
  matchups: RecapMatchupInput[],
  powerRankings: RecapRankInput[],
  standings: RecapRankInput[]
): WeeklyRecap {
  const decided = matchups.filter((m) => m.homeScore !== m.awayScore);

  const gameOfTheWeek = matchups.length === 0 ? null : matchups.reduce((a, b) => (b.homeScore + b.awayScore > a.homeScore + a.awayScore ? b : a));

  const biggestBlowoutMatchup = decided.length === 0 ? null : decided.reduce((a, b) =>
    Math.abs(b.homeScore - b.awayScore) > Math.abs(a.homeScore - a.awayScore) ? b : a
  );
  const closestGameMatchup = decided.length === 0 ? null : decided.reduce((a, b) =>
    Math.abs(b.homeScore - b.awayScore) < Math.abs(a.homeScore - a.awayScore) ? b : a
  );

  const teamScores = matchups.flatMap((m) => [
    { teamId: m.homeTeamId, teamName: m.homeTeamName, points: m.homeScore },
    { teamId: m.awayTeamId, teamName: m.awayTeamName, points: m.awayScore },
  ]);
  const highestScorer = teamScores.length === 0 ? null : teamScores.reduce((a, b) => (b.points > a.points ? b : a));
  const lowestScorer = teamScores.length === 0 ? null : teamScores.reduce((a, b) => (b.points < a.points ? b : a));

  const powerRankByTeam = new Map(powerRankings.map((r) => [r.teamId, r]));
  let biggestUpset: WeeklyRecap["biggestUpset"] = null;
  for (const m of decided) {
    const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
    const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
    const winnerName = m.homeScore > m.awayScore ? m.homeTeamName : m.awayTeamName;
    const loserName = m.homeScore > m.awayScore ? m.awayTeamName : m.homeTeamName;

    const winnerPrevRank = powerRankByTeam.get(winnerId)?.previousRank;
    const loserPrevRank = powerRankByTeam.get(loserId)?.previousRank;
    if (winnerPrevRank == null || loserPrevRank == null) continue;

    const rankGap = winnerPrevRank - loserPrevRank; // positive = winner was ranked worse than loser
    if (rankGap > 0 && (!biggestUpset || rankGap > biggestUpset.rankGap)) {
      biggestUpset = { winner: winnerName, loser: loserName, rankGap };
    }
  }

  // The team that rose the most (biggest positive previousRank - rank delta).
  let powerMove: WeeklyRecap["powerMove"] = null;
  let bestDelta = -Infinity;
  for (const r of powerRankings) {
    if (r.previousRank === null) continue;
    const delta = r.previousRank - r.rank;
    if (delta > bestDelta) {
      bestDelta = delta;
      powerMove = { team: r.teamName, from: r.previousRank, to: r.rank };
    }
  }

  const allPlay = computeWeeklyAllPlay(teamScores.map((t) => ({ teamId: t.teamId, points: t.points })));
  const allPlayByTeam = new Map(allPlay.map((a) => [a.teamId, a]));

  let luckiestWin: WeeklyRecap["luckiestWin"] = null;
  let unluckiestLoss: WeeklyRecap["unluckiestLoss"] = null;
  for (const m of decided) {
    const winnerId = m.homeScore > m.awayScore ? m.homeTeamId : m.awayTeamId;
    const winnerName = m.homeScore > m.awayScore ? m.homeTeamName : m.awayTeamName;
    const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId;
    const loserName = m.homeScore > m.awayScore ? m.awayTeamName : m.homeTeamName;

    const winnerAllPlay = allPlayByTeam.get(winnerId);
    const loserAllPlay = allPlayByTeam.get(loserId);

    if (winnerAllPlay && (!luckiestWin || winnerAllPlay.losses > luckiestWin.allPlayLosses)) {
      luckiestWin = { team: winnerName, allPlayLosses: winnerAllPlay.losses };
    }
    if (loserAllPlay && (!unluckiestLoss || loserAllPlay.wins > unluckiestLoss.allPlayWins)) {
      unluckiestLoss = { team: loserName, allPlayWins: loserAllPlay.wins };
    }
  }

  const standingsChanges = standings
    .filter((s) => s.previousRank !== null && s.previousRank !== s.rank)
    .map((s) => ({ team: s.teamName, from: s.previousRank as number, to: s.rank }));

  return {
    week,
    gameOfTheWeek: gameOfTheWeek
      ? { home: gameOfTheWeek.homeTeamName, away: gameOfTheWeek.awayTeamName, homeScore: gameOfTheWeek.homeScore, awayScore: gameOfTheWeek.awayScore }
      : null,
    biggestBlowout: biggestBlowoutMatchup
      ? {
          winner: biggestBlowoutMatchup.homeScore > biggestBlowoutMatchup.awayScore ? biggestBlowoutMatchup.homeTeamName : biggestBlowoutMatchup.awayTeamName,
          loser: biggestBlowoutMatchup.homeScore > biggestBlowoutMatchup.awayScore ? biggestBlowoutMatchup.awayTeamName : biggestBlowoutMatchup.homeTeamName,
          winnerScore: Math.max(biggestBlowoutMatchup.homeScore, biggestBlowoutMatchup.awayScore),
          loserScore: Math.min(biggestBlowoutMatchup.homeScore, biggestBlowoutMatchup.awayScore),
          margin: Math.abs(biggestBlowoutMatchup.homeScore - biggestBlowoutMatchup.awayScore),
        }
      : null,
    closestGame: closestGameMatchup
      ? {
          home: closestGameMatchup.homeTeamName,
          away: closestGameMatchup.awayTeamName,
          homeScore: closestGameMatchup.homeScore,
          awayScore: closestGameMatchup.awayScore,
          margin: Math.abs(closestGameMatchup.homeScore - closestGameMatchup.awayScore),
        }
      : null,
    highestScorer: highestScorer ? { team: highestScorer.teamName, points: highestScorer.points } : null,
    lowestScorer: lowestScorer ? { team: lowestScorer.teamName, points: lowestScorer.points } : null,
    biggestUpset,
    powerMove,
    luckiestWin,
    unluckiestLoss,
    standingsChanges,
  };
}
