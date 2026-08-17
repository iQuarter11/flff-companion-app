import type { EspnLeagueRaw, EspnMemberRaw, EspnTeamRaw } from "./types";
import type { Member, Team } from "@/types/league";

export function normalizeMember(raw: EspnMemberRaw): Member {
  return {
    espnMemberId: raw.id,
    displayName: raw.displayName,
    firstName: raw.firstName ?? null,
    lastName: raw.lastName ?? null,
  };
}

export function normalizeTeam(raw: EspnTeamRaw): Team {
  const overall = raw.record.overall;

  return {
    espnTeamId: raw.id,
    name: raw.name,
    abbrev: raw.abbrev,
    logoUrl: raw.logo ?? null,
    divisionId: raw.divisionId ?? null,
    ownerEspnMemberIds: raw.owners,
    primaryOwnerEspnMemberId: raw.primaryOwner ?? raw.owners[0] ?? null,
    record: {
      wins: overall.wins,
      losses: overall.losses,
      ties: overall.ties,
      pointsFor: overall.pointsFor,
      pointsAgainst: overall.pointsAgainst,
      streakType: overall.streakType,
      streakLength: overall.streakLength,
    },
    playoffSeed: raw.playoffSeed ?? null,
    finalRank: raw.rankCalculatedFinal && raw.rankCalculatedFinal > 0 ? raw.rankCalculatedFinal : null,
  };
}

export function normalizeMembers(league: EspnLeagueRaw): Member[] {
  return league.members.map(normalizeMember);
}

export function normalizeTeams(league: EspnLeagueRaw): Team[] {
  return league.teams.map(normalizeTeam);
}
