/**
 * Raw shapes returned by ESPN's undocumented fantasy API
 * (lm-api-reads.fantasy.espn.com), scoped to the `mTeam` + `mRoster` +
 * `mMatchup` + `mSettings` views. Only fields this app actually reads are
 * typed — ESPN's real payload has many more.
 *
 * These types are internal to src/lib/espn/. Nothing outside this folder
 * should import from here — use src/types/league.ts instead.
 */

export type EspnRecordSplit = {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streakType: "WIN" | "LOSS" | "NONE";
  streakLength: number;
};

export type EspnTeamRaw = {
  id: number;
  name: string;
  abbrev: string;
  logo?: string;
  divisionId?: number;
  owners: string[];
  primaryOwner?: string;
  playoffSeed?: number;
  // 0/absent until ESPN finalizes standings at season end — see
  // docs/espn-integration.md for how this drives the Champions page.
  rankCalculatedFinal?: number;
  record: {
    overall: EspnRecordSplit;
  };
  roster?: {
    entries: EspnRosterEntryRaw[];
  };
};

export type EspnRosterEntryRaw = {
  playerId: number;
  lineupSlotId: number;
  injuryStatus?: string;
  playerPoolEntry: {
    player: EspnPlayerRaw;
  };
};

export type EspnPlayerRaw = {
  id: number;
  fullName: string;
  defaultPositionId: number;
  proTeamId?: number;
  injured?: boolean;
  injuryStatus?: string;
};

export type EspnMemberRaw = {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
};

export type EspnMatchupSideRaw = {
  teamId: number;
  totalPoints: number;
};

export type EspnMatchupRaw = {
  id: number;
  matchupPeriodId: number;
  winner: "HOME" | "AWAY" | "TIE" | "UNDECIDED";
  home: EspnMatchupSideRaw;
  away?: EspnMatchupSideRaw; // absent on a bye week
};

export type EspnLeagueSettingsRaw = {
  name: string;
  size: number;
  scheduleSettings: {
    matchupPeriodCount: number;
    playoffTeamCount: number;
  };
};

export type EspnLeagueStatusRaw = {
  currentMatchupPeriod: number;
  latestScoringPeriod: number;
  finalScoringPeriod: number;
  previousSeasons: number[];
  isActive: boolean;
};

export type EspnLeagueRaw = {
  id: number;
  seasonId: number;
  status: EspnLeagueStatusRaw;
  settings: EspnLeagueSettingsRaw;
  members: EspnMemberRaw[];
  teams: EspnTeamRaw[];
  schedule: EspnMatchupRaw[];
};
