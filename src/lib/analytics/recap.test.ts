import { describe, expect, it } from "vitest";
import { generateWeeklyRecap, type RecapMatchupInput, type RecapRankInput } from "./recap";

const M = (over: Partial<RecapMatchupInput>): RecapMatchupInput => ({
  homeTeamId: 1,
  homeTeamName: "Home",
  awayTeamId: 2,
  awayTeamName: "Away",
  homeScore: 100,
  awayScore: 90,
  ...over,
});

describe("generateWeeklyRecap", () => {
  it("picks the highest combined-score matchup as game of the week", () => {
    const matchups = [
      M({ homeTeamId: 1, awayTeamId: 2, homeScore: 100, awayScore: 90 }), // 190
      M({ homeTeamId: 3, awayTeamId: 4, homeScore: 141.2, awayScore: 139.8, homeTeamName: "A", awayTeamName: "B" }), // 281
    ];
    const recap = generateWeeklyRecap(8, matchups, [], []);
    expect(recap.gameOfTheWeek).toEqual({ home: "A", away: "B", homeScore: 141.2, awayScore: 139.8 });
  });

  it("biggest blowout is the largest-margin matchup, with winner/loser assigned correctly", () => {
    const matchups = [
      M({ homeTeamId: 1, awayTeamId: 2, homeScore: 100, awayScore: 90, homeTeamName: "Close-Home", awayTeamName: "Close-Away" }),
      M({
        homeTeamId: 3,
        awayTeamId: 4,
        homeScore: 166.8,
        awayScore: 92.1,
        homeTeamName: "Team C",
        awayTeamName: "Team D",
      }),
    ];
    const recap = generateWeeklyRecap(8, matchups, [], []);
    expect(recap.biggestBlowout).toEqual({
      winner: "Team C",
      loser: "Team D",
      winnerScore: 166.8,
      loserScore: 92.1,
      margin: expect.closeTo(74.7, 1),
    });
  });

  it("closest game is the smallest-margin decided matchup", () => {
    const matchups = [
      M({ homeTeamId: 1, awayTeamId: 2, homeScore: 100, awayScore: 90 }),
      M({ homeTeamId: 3, awayTeamId: 4, homeScore: 105.2, awayScore: 105.1, homeTeamName: "X", awayTeamName: "Y" }),
    ];
    const recap = generateWeeklyRecap(8, matchups, [], []);
    expect(recap.closestGame?.home).toBe("X");
    expect(recap.closestGame?.margin).toBeCloseTo(0.1, 5);
  });

  it("highest and lowest scorer are found across both sides of every matchup, not just winners", () => {
    const matchups = [
      M({ homeTeamId: 1, awayTeamId: 2, homeScore: 200, awayScore: 10, homeTeamName: "Highest", awayTeamName: "Lowest" }),
      M({ homeTeamId: 3, awayTeamId: 4, homeScore: 120, awayScore: 115 }),
    ];
    const recap = generateWeeklyRecap(8, matchups, [], []);
    expect(recap.highestScorer).toEqual({ team: "Highest", points: 200 });
    expect(recap.lowestScorer).toEqual({ team: "Lowest", points: 10 });
  });

  it("biggest upset requires the winner to have been ranked worse than the loser last week", () => {
    const matchups = [M({ homeTeamId: 1, awayTeamId: 2, homeScore: 100, awayScore: 90, homeTeamName: "Underdog", awayTeamName: "Favorite" })];
    const powerRankings: RecapRankInput[] = [
      { teamId: 1, teamName: "Underdog", rank: 9, previousRank: 10 },
      { teamId: 2, teamName: "Favorite", rank: 2, previousRank: 1 },
    ];
    const recap = generateWeeklyRecap(8, matchups, powerRankings, []);
    expect(recap.biggestUpset).toEqual({ winner: "Underdog", loser: "Favorite", rankGap: 9 });
  });

  it("no upset is reported when the higher-ranked team wins (expected outcome)", () => {
    const matchups = [M({ homeTeamId: 1, awayTeamId: 2, homeScore: 100, awayScore: 90, homeTeamName: "Favorite", awayTeamName: "Underdog" })];
    const powerRankings: RecapRankInput[] = [
      { teamId: 1, teamName: "Favorite", rank: 1, previousRank: 1 },
      { teamId: 2, teamName: "Underdog", rank: 10, previousRank: 10 },
    ];
    const recap = generateWeeklyRecap(8, matchups, powerRankings, []);
    expect(recap.biggestUpset).toBeNull();
  });

  it("power move picks the team that rose the most, ignoring teams with no previous rank", () => {
    const powerRankings: RecapRankInput[] = [
      { teamId: 1, teamName: "Rose 3", rank: 1, previousRank: 4 },
      { teamId: 2, teamName: "Rose 1", rank: 5, previousRank: 6 },
      { teamId: 3, teamName: "New team", rank: 2, previousRank: null },
    ];
    const recap = generateWeeklyRecap(8, [], powerRankings, []);
    expect(recap.powerMove).toEqual({ team: "Rose 3", from: 4, to: 1 });
  });

  it("luckiest win is the winner with the most all-play losses that week (won despite a rough week)", () => {
    // 4-team week: team 1 (100) beats team 2 (99) narrowly but both score
    // low relative to teams 3/4 — team 1 has the most all-play losses
    // among winners.
    const matchups = [
      M({ homeTeamId: 1, awayTeamId: 2, homeScore: 100, awayScore: 99, homeTeamName: "LuckyWinner", awayTeamName: "Loser1" }),
      M({ homeTeamId: 3, awayTeamId: 4, homeScore: 150, awayScore: 140, homeTeamName: "GoodWinner", awayTeamName: "Loser2" }),
    ];
    const recap = generateWeeklyRecap(8, matchups, [], []);
    // Team 1 (100) loses its all-play to teams scoring 150 and 140 -> 2 all-play losses.
    // Team 3 (150) wins all its all-play matchups -> 0 all-play losses.
    expect(recap.luckiestWin?.team).toBe("LuckyWinner");
  });

  it("unluckiest loss is the loser with the most all-play wins that week (lost despite a great week)", () => {
    const matchups = [
      M({ homeTeamId: 1, awayTeamId: 2, homeScore: 145, awayScore: 150, homeTeamName: "UnluckyLoser", awayTeamName: "NarrowWinner" }),
      M({ homeTeamId: 3, awayTeamId: 4, homeScore: 60, awayScore: 55, homeTeamName: "WeakWinner", awayTeamName: "WeakLoser" }),
    ];
    const recap = generateWeeklyRecap(8, matchups, [], []);
    // UnluckyLoser (145) beats WeakWinner and WeakLoser in all-play despite losing its actual matchup.
    expect(recap.unluckiestLoss?.team).toBe("UnluckyLoser");
  });

  it("standings changes only include teams whose rank actually moved", () => {
    const standings: RecapRankInput[] = [
      { teamId: 1, teamName: "Moved up", rank: 1, previousRank: 3 },
      { teamId: 2, teamName: "Unchanged", rank: 2, previousRank: 2 },
      { teamId: 3, teamName: "New", rank: 3, previousRank: null },
    ];
    const recap = generateWeeklyRecap(8, [], [], standings);
    expect(recap.standingsChanges).toEqual([{ team: "Moved up", from: 3, to: 1 }]);
  });

  it("returns nulls and an empty array for a week with no data, instead of crashing", () => {
    const recap = generateWeeklyRecap(1, [], [], []);
    expect(recap.gameOfTheWeek).toBeNull();
    expect(recap.biggestBlowout).toBeNull();
    expect(recap.closestGame).toBeNull();
    expect(recap.highestScorer).toBeNull();
    expect(recap.lowestScorer).toBeNull();
    expect(recap.biggestUpset).toBeNull();
    expect(recap.powerMove).toBeNull();
    expect(recap.luckiestWin).toBeNull();
    expect(recap.unluckiestLoss).toBeNull();
    expect(recap.standingsChanges).toEqual([]);
  });
});
