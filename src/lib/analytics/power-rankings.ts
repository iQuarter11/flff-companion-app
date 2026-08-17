import { POWER_RANKING_WEIGHTS } from "./power-rankings-config";

/**
 * Min-max normalization to [0, 1]. When every value is identical (no
 * signal to differentiate teams on this metric), everyone gets the neutral
 * midpoint rather than an arbitrary 0 or a division by zero.
 */
export function normalizeMinMax(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

export type PowerRankingInput = {
  teamId: number;
  allPlayWinPct: number;
  pointsFor: number;
  recentPointsFor: number;
  winPct: number;
  /**
   * Roster/starter performance proxy. True per-player weekly scoring isn't
   * synced yet (see docs/analytics.md), so this is currently the fraction
   * of starters not listed as injured/out — a real signal, just a narrower
   * one than "starter fantasy points" would be.
   */
  healthyStarterFraction: number;
};

export type PowerRanking = {
  teamId: number;
  rank: number;
  powerScore: number;
  allPlayScore: number;
  pointsScore: number;
  recentScore: number;
  recordScore: number;
  rosterScore: number;
};

export function computePowerRankings(inputs: PowerRankingInput[]): PowerRanking[] {
  if (inputs.length === 0) return [];

  const allPlay = normalizeMinMax(inputs.map((i) => i.allPlayWinPct));
  const points = normalizeMinMax(inputs.map((i) => i.pointsFor));
  const recent = normalizeMinMax(inputs.map((i) => i.recentPointsFor));
  const record = normalizeMinMax(inputs.map((i) => i.winPct));
  const roster = normalizeMinMax(inputs.map((i) => i.healthyStarterFraction));

  const scored = inputs.map((input, i) => {
    const allPlayScore = allPlay[i] * 100;
    const pointsScore = points[i] * 100;
    const recentScore = recent[i] * 100;
    const recordScore = record[i] * 100;
    const rosterScore = roster[i] * 100;

    const powerScore =
      allPlayScore * POWER_RANKING_WEIGHTS.allPlay +
      pointsScore * POWER_RANKING_WEIGHTS.points +
      recentScore * POWER_RANKING_WEIGHTS.recent +
      recordScore * POWER_RANKING_WEIGHTS.record +
      rosterScore * POWER_RANKING_WEIGHTS.roster;

    return {
      teamId: input.teamId,
      powerScore,
      allPlayScore,
      pointsScore,
      recentScore,
      recordScore,
      rosterScore,
    };
  });

  scored.sort((a, b) => b.powerScore - a.powerScore);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
