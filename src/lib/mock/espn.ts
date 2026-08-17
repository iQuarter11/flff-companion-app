import type { NormalizedLeague } from "@/types/league";

/**
 * Small representative fixture so the app is browsable before ESPN
 * credentials are configured. Deliberately tiny (4 teams, one matchup
 * week) — enough to exercise every UI state, not a full league
 * simulation. Never returned silently; callers must show a "mock data"
 * indicator alongside it (see src/app/(app)/dev/espn/page.tsx).
 */
export const MOCK_LEAGUE: NormalizedLeague = {
  espnLeagueId: 0,
  season: new Date().getFullYear(),
  currentWeek: 1,
  settings: {
    name: "Mock League (no ESPN credentials configured)",
    size: 4,
    regularSeasonMatchupCount: 13,
    playoffTeamCount: 2,
  },
  members: [
    { espnMemberId: "mock-1", displayName: "Alex", firstName: "Alex", lastName: null },
    { espnMemberId: "mock-2", displayName: "Sam", firstName: "Sam", lastName: null },
    { espnMemberId: "mock-3", displayName: "Jordan", firstName: "Jordan", lastName: null },
    { espnMemberId: "mock-4", displayName: "Casey", firstName: "Casey", lastName: null },
  ],
  teams: [
    {
      espnTeamId: 1,
      name: "Mock Team Alpha",
      abbrev: "ALFA",
      logoUrl: null,
      divisionId: null,
      ownerEspnMemberIds: ["mock-1"],
      primaryOwnerEspnMemberId: "mock-1",
      record: { wins: 2, losses: 0, ties: 0, pointsFor: 245.6, pointsAgainst: 210.1, streakType: "WIN", streakLength: 2 },
      playoffSeed: 1, finalRank: null,
    },
    {
      espnTeamId: 2,
      name: "Mock Team Beta",
      abbrev: "BETA",
      logoUrl: null,
      divisionId: null,
      ownerEspnMemberIds: ["mock-2"],
      primaryOwnerEspnMemberId: "mock-2",
      record: { wins: 1, losses: 1, ties: 0, pointsFor: 220.3, pointsAgainst: 218.9, streakType: "LOSS", streakLength: 1 },
      playoffSeed: 2, finalRank: null,
    },
    {
      espnTeamId: 3,
      name: "Mock Team Gamma",
      abbrev: "GAMA",
      logoUrl: null,
      divisionId: null,
      ownerEspnMemberIds: ["mock-3"],
      primaryOwnerEspnMemberId: "mock-3",
      record: { wins: 1, losses: 1, ties: 0, pointsFor: 205.7, pointsAgainst: 208.2, streakType: "LOSS", streakLength: 1 },
      playoffSeed: 3, finalRank: null,
    },
    {
      espnTeamId: 4,
      name: "Mock Team Delta",
      abbrev: "DLTA",
      logoUrl: null,
      divisionId: null,
      ownerEspnMemberIds: ["mock-4"],
      primaryOwnerEspnMemberId: "mock-4",
      record: { wins: 0, losses: 2, ties: 0, pointsFor: 198.4, pointsAgainst: 231.8, streakType: "LOSS", streakLength: 2 },
      playoffSeed: 4, finalRank: null,
    },
  ],
  rosters: [
    {
      espnTeamId: 1,
      players: [
        { espnPlayerId: 900001, fullName: "Mock Quarterback", position: "QB", nflTeam: "KC", injuryStatus: null, lineupSlot: "QB", isStarter: true },
        { espnPlayerId: 900002, fullName: "Mock Running Back", position: "RB", nflTeam: "SF", injuryStatus: null, lineupSlot: "RB", isStarter: true },
        { espnPlayerId: 900003, fullName: "Mock Wide Receiver", position: "WR", nflTeam: "MIA", injuryStatus: null, lineupSlot: "WR", isStarter: true },
        { espnPlayerId: 900004, fullName: "Mock Bench Player", position: "RB", nflTeam: "DAL", injuryStatus: null, lineupSlot: "BENCH", isStarter: false },
      ],
    },
    { espnTeamId: 2, players: [] },
    { espnTeamId: 3, players: [] },
    { espnTeamId: 4, players: [] },
  ],
  matchups: [
    { espnMatchupId: 1, week: 1, isPlayoff: false, homeTeamId: 1, awayTeamId: 2, homeScore: 128.4, awayScore: 110.2, result: "HOME" },
    { espnMatchupId: 2, week: 1, isPlayoff: false, homeTeamId: 3, awayTeamId: 4, homeScore: 105.1, awayScore: 98.6, result: "HOME" },
  ],
  standings: [
    { espnTeamId: 1, rank: 1, wins: 2, losses: 0, ties: 0, pointsFor: 245.6, pointsAgainst: 210.1, streakType: "WIN", streakLength: 2 },
    { espnTeamId: 2, rank: 2, wins: 1, losses: 1, ties: 0, pointsFor: 220.3, pointsAgainst: 218.9, streakType: "LOSS", streakLength: 1 },
    { espnTeamId: 3, rank: 3, wins: 1, losses: 1, ties: 0, pointsFor: 205.7, pointsAgainst: 208.2, streakType: "LOSS", streakLength: 1 },
    { espnTeamId: 4, rank: 4, wins: 0, losses: 2, ties: 0, pointsFor: 198.4, pointsAgainst: 231.8, streakType: "LOSS", streakLength: 2 },
  ],
};
