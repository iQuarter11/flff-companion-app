import { describe, expect, it } from "vitest";
import { normalizeMinMax, computePowerRankings, type PowerRankingInput } from "./power-rankings";
import { POWER_RANKING_WEIGHTS } from "./power-rankings-config";

describe("normalizeMinMax", () => {
  it("maps the min to 0 and the max to 1", () => {
    const result = normalizeMinMax([10, 20, 30]);
    expect(result[0]).toBe(0);
    expect(result[2]).toBe(1);
    expect(result[1]).toBeCloseTo(0.5, 10);
  });

  it("returns the neutral midpoint for every value when all values are equal, not NaN", () => {
    const result = normalizeMinMax([5, 5, 5]);
    expect(result).toEqual([0.5, 0.5, 0.5]);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeMinMax([])).toEqual([]);
  });
});

describe("POWER_RANKING_WEIGHTS", () => {
  it("sums to 1 (the module throws at import time otherwise)", () => {
    const sum = Object.values(POWER_RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

function makeInput(overrides: Partial<PowerRankingInput> & { teamId: number }): PowerRankingInput {
  return {
    allPlayWinPct: 0.5,
    pointsFor: 1000,
    recentPointsFor: 100,
    winPct: 0.5,
    healthyStarterFraction: 1,
    ...overrides,
  };
}

describe("computePowerRankings", () => {
  it("ranks the team that dominates every metric first, with a score near 100", () => {
    const inputs = [
      makeInput({ teamId: 1, allPlayWinPct: 1, pointsFor: 2000, recentPointsFor: 200, winPct: 1, healthyStarterFraction: 1 }),
      makeInput({ teamId: 2, allPlayWinPct: 0, pointsFor: 500, recentPointsFor: 50, winPct: 0, healthyStarterFraction: 0 }),
    ];

    const result = computePowerRankings(inputs);
    expect(result[0].teamId).toBe(1);
    expect(result[0].rank).toBe(1);
    expect(result[0].powerScore).toBeCloseTo(100, 10);
    expect(result[1].teamId).toBe(2);
    expect(result[1].powerScore).toBeCloseTo(0, 10);
  });

  it("produces a stable 1..n rank sequence with no gaps or duplicates", () => {
    const inputs = Array.from({ length: 6 }, (_, i) =>
      makeInput({ teamId: i + 1, pointsFor: 900 + i * 37, winPct: (i % 4) / 4 })
    );
    const result = computePowerRankings(inputs);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(new Set(result.map((r) => r.teamId)).size).toBe(6);
  });

  it("scores are sorted descending", () => {
    const inputs = Array.from({ length: 5 }, (_, i) => makeInput({ teamId: i + 1, pointsFor: 800 + i * 53 }));
    const result = computePowerRankings(inputs);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].powerScore).toBeGreaterThanOrEqual(result[i].powerScore);
    }
  });

  it("returns an empty array for no teams", () => {
    expect(computePowerRankings([])).toEqual([]);
  });

  it("when every metric is tied, every team scores the same (50) and rank is a stable tiebreak, not arbitrary skew", () => {
    const inputs = [makeInput({ teamId: 1 }), makeInput({ teamId: 2 }), makeInput({ teamId: 3 })];
    const result = computePowerRankings(inputs);
    for (const r of result) {
      expect(r.powerScore).toBeCloseTo(50, 10);
    }
  });
});
