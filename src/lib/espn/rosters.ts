import { mapLineupSlot } from "./constants";
import { normalizePlayerNflTeam, normalizePlayerPosition } from "./players";
import type { EspnLeagueRaw, EspnTeamRaw } from "./types";
import type { RosterPlayer, TeamRoster } from "@/types/league";

const NON_STARTING_SLOTS = new Set(["BENCH", "IR"]);

export function normalizeTeamRoster(team: EspnTeamRaw): TeamRoster {
  const entries = team.roster?.entries ?? [];

  const players: RosterPlayer[] = entries.map((entry) => {
    const player = entry.playerPoolEntry.player;
    const lineupSlot = mapLineupSlot(entry.lineupSlotId);

    return {
      espnPlayerId: player.id,
      fullName: player.fullName,
      position: normalizePlayerPosition(player),
      nflTeam: normalizePlayerNflTeam(player),
      injuryStatus: entry.injuryStatus ?? player.injuryStatus ?? null,
      lineupSlot,
      isStarter: !NON_STARTING_SLOTS.has(lineupSlot),
    };
  });

  return { espnTeamId: team.id, players };
}

export function normalizeRosters(league: EspnLeagueRaw): TeamRoster[] {
  return league.teams.map(normalizeTeamRoster);
}
