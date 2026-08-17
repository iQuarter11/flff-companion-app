import { describe, expect, it } from "vitest";
import { computeSeasonLuck } from "./luck";
import type { AllPlayRecord } from "./all-play";

describe("computeSeasonLuck", () => {
  it("sums weekly all-play win fractions into expected wins, then diffs against actual wins", () => {
    // 4-team league (3 opponents/week) across 3 weeks: team 1 goes 3-0,
    // 2-1, 1-2. Expected wins = 3/3 + 2/3 + 1/3 = 2. Actual wins = 3 -> +1
    // luck. Each week's array must include every team's record (not just
    // team 1's) — that's how opponentsPerTeam is derived from week.length.
    const weeklyAllPlay: AllPlayRecord[][] = [
      [
        { teamId: 1, wins: 3, losses: 0, ties: 0 },
        { teamId: 2, wins: 0, losses: 0, ties: 0 },
        { teamId: 3, wins: 0, losses: 0, ties: 0 },
        { teamId: 4, wins: 0, losses: 0, ties: 0 },
      ],
      [
        { teamId: 1, wins: 2, losses: 1, ties: 0 },
        { teamId: 2, wins: 0, losses: 0, ties: 0 },
        { teamId: 3, wins: 0, losses: 0, ties: 0 },
        { teamId: 4, wins: 0, losses: 0, ties: 0 },
      ],
      [
        { teamId: 1, wins: 1, losses: 2, ties: 0 },
        { teamId: 2, wins: 0, losses: 0, ties: 0 },
        { teamId: 3, wins: 0, losses: 0, ties: 0 },
        { teamId: 4, wins: 0, losses: 0, ties: 0 },
      ],
    ];

    const result = computeSeasonLuck(new Map([[1, 3]]), weeklyAllPlay);
    const team1 = result.find((r) => r.teamId === 1)!;

    expect(team1.actualWins).toBe(3);
    expect(team1.expectedWins).toBeCloseTo(2, 10);
    expect(team1.luckDifferential).toBeCloseTo(1, 10);
  });

  it("ties count as half a win toward expected wins", () => {
    // 4-team week (3 opponents), team 1 goes 1 win + 1 tie + 1 loss ->
    // winFraction = (1 + 0.5) / 3.
    const weeklyAllPlay: AllPlayRecord[][] = [
      [
        { teamId: 1, wins: 1, losses: 1, ties: 1 },
        { teamId: 2, wins: 0, losses: 0, ties: 0 },
        { teamId: 3, wins: 0, losses: 0, ties: 0 },
        { teamId: 4, wins: 0, losses: 0, ties: 0 },
      ],
    ];
    const result = computeSeasonLuck(new Map([[1, 1]]), weeklyAllPlay);
    expect(result[0].expectedWins).toBeCloseTo(0.5, 10);
  });

  it("a team with no all-play data gets zero expected wins, not a crash", () => {
    const result = computeSeasonLuck(new Map([[1, 3]]), []);
    expect(result[0]).toEqual({ teamId: 1, actualWins: 3, expectedWins: 0, luckDifferential: 3 });
  });

  it("perfectly average performance nets zero luck", () => {
    // 3-team league every week: team always exactly splits (1 win, 1 loss)
    // across 8 weeks -> expected wins = 8 * 0.5 = 4; actual wins = 4.
    const weeklyAllPlay: AllPlayRecord[][] = Array.from({ length: 8 }, () => [
      { teamId: 1, wins: 1, losses: 1, ties: 0 },
      { teamId: 2, wins: 1, losses: 1, ties: 0 },
      { teamId: 3, wins: 1, losses: 1, ties: 0 },
    ]);
    const result = computeSeasonLuck(new Map([[1, 4]]), weeklyAllPlay);
    expect(result[0].luckDifferential).toBeCloseTo(0, 10);
  });

  it("a week with only one team (no opponents) contributes nothing, without dividing by zero", () => {
    const weeklyAllPlay: AllPlayRecord[][] = [[{ teamId: 1, wins: 0, losses: 0, ties: 0 }]];
    const result = computeSeasonLuck(new Map([[1, 0]]), weeklyAllPlay);
    expect(result[0].expectedWins).toBe(0);
  });
});
