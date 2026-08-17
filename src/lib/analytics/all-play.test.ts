import { describe, expect, it } from "vitest";
import { computeWeeklyAllPlay } from "./all-play";

describe("computeWeeklyAllPlay", () => {
  it("beats every team it outscored and loses to every team that outscored it", () => {
    const result = computeWeeklyAllPlay([
      { teamId: 1, points: 120 },
      { teamId: 2, points: 100 },
      { teamId: 3, points: 90 },
      { teamId: 4, points: 80 },
    ]);

    expect(result.find((r) => r.teamId === 1)).toEqual({ teamId: 1, wins: 3, losses: 0, ties: 0 });
    expect(result.find((r) => r.teamId === 4)).toEqual({ teamId: 4, wins: 0, losses: 3, ties: 0 });
  });

  it("matches the spec's worked example: 12 teams, one team beats 8 of the other 11", () => {
    const scores = Array.from({ length: 12 }, (_, i) => ({ teamId: i + 1, points: 100 - i }));
    // Team ranked 4th (0-indexed i=3) should beat the 8 teams below it and
    // lose to the 3 above it.
    const result = computeWeeklyAllPlay(scores);
    const fourthPlace = result.find((r) => r.teamId === 4)!;
    expect(fourthPlace.wins).toBe(8);
    expect(fourthPlace.losses).toBe(3);
    expect(fourthPlace.ties).toBe(0);
  });

  it("counts ties for identical scores, not wins or losses", () => {
    const result = computeWeeklyAllPlay([
      { teamId: 1, points: 100 },
      { teamId: 2, points: 100 },
      { teamId: 3, points: 90 },
    ]);

    expect(result.find((r) => r.teamId === 1)).toEqual({ teamId: 1, wins: 1, losses: 0, ties: 1 });
  });

  it("every team's wins+losses+ties equals n-1", () => {
    const scores = [
      { teamId: 1, points: 55 },
      { teamId: 2, points: 55 },
      { teamId: 3, points: 30 },
      { teamId: 4, points: 200 },
      { teamId: 5, points: 10 },
    ];
    const result = computeWeeklyAllPlay(scores);
    for (const record of result) {
      expect(record.wins + record.losses + record.ties).toBe(scores.length - 1);
    }
  });

  it("handles a single-team week without dividing by zero or crashing", () => {
    const result = computeWeeklyAllPlay([{ teamId: 1, points: 100 }]);
    expect(result).toEqual([{ teamId: 1, wins: 0, losses: 0, ties: 0 }]);
  });
});
