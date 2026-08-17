/**
 * Normalized domain types. Everything outside src/lib/espn/ should import
 * from here, never from src/lib/espn/types.ts (which mirrors ESPN's raw,
 * undocumented response shape and can change without notice).
 */

export type Member = {
  espnMemberId: string; // SWID, e.g. "{AE296F09-...}"
  displayName: string;
  firstName: string | null;
  lastName: string | null;
};

export type TeamRecord = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streakType: "WIN" | "LOSS" | "NONE";
  streakLength: number;
};

export type Team = {
  espnTeamId: number;
  name: string;
  abbrev: string;
  logoUrl: string | null;
  divisionId: number | null;
  ownerEspnMemberIds: string[];
  primaryOwnerEspnMemberId: string | null;
  record: TeamRecord;
  playoffSeed: number | null;
  finalRank: number | null;
};

export type LineupSlot =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "FLEX"
  | "OP"
  | "DST"
  | "K"
  | "BENCH"
  | "IR"
  | `SLOT_${number}`;

export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST" | `POS_${number}`;

export type RosterPlayer = {
  espnPlayerId: number;
  fullName: string;
  position: Position;
  nflTeam: string | null; // abbreviation, e.g. "KC"; null for free agents / unknown
  injuryStatus: string | null;
  lineupSlot: LineupSlot;
  isStarter: boolean;
};

export type TeamRoster = {
  espnTeamId: number;
  players: RosterPlayer[];
};

export type MatchupResult = "HOME" | "AWAY" | "TIE" | "UNDECIDED";

export type Matchup = {
  espnMatchupId: number;
  week: number;
  isPlayoff: boolean;
  homeTeamId: number;
  awayTeamId: number | null; // null on a bye week
  homeScore: number;
  awayScore: number | null;
  result: MatchupResult;
};

export type Standing = {
  espnTeamId: number;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streakType: "WIN" | "LOSS" | "NONE";
  streakLength: number;
};

export type LeagueSettings = {
  name: string;
  size: number;
  regularSeasonMatchupCount: number;
  playoffTeamCount: number;
};

export type NormalizedLeague = {
  espnLeagueId: number;
  season: number;
  currentWeek: number;
  settings: LeagueSettings;
  members: Member[];
  teams: Team[];
  rosters: TeamRoster[];
  matchups: Matchup[];
  standings: Standing[];
};
