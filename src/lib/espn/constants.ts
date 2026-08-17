import type { LineupSlot, Position } from "@/types/league";

/**
 * ESPN's fantasy API is undocumented. These ID maps were derived empirically
 * by fetching this league's real roster/settings data and cross-checking
 * proTeamId against known player teams (see docs/espn-integration.md) —
 * not guessed from memory. Unknown IDs fall back to a `POS_${id}` /
 * `SLOT_${id}` / raw abbreviation rather than asserting a wrong label.
 */

export const POSITION_MAP: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DST",
};

// Confirmed against this league's actual lineupSlotCounts + rostered
// players. Slots 7 (OP/Superflex) and other FLEX variants are included
// from general ESPN API knowledge but unverified against real data since
// this league doesn't use them (lineupSlotCounts[7] === 0).
export const LINEUP_SLOT_MAP: Record<number, string> = {
  0: "QB",
  2: "RB",
  4: "WR",
  6: "TE",
  7: "OP",
  16: "DST",
  17: "K",
  20: "BENCH",
  21: "IR",
  23: "FLEX",
};

// Verified against this league's real rosters (Puka Nacua -> 14, Jayden
// Daniels -> 28, Travis Kelce -> 12, Denver D/ST -> 7, Derrick Henry /
// Baltimore D/ST -> 33, Josh Allen -> 2, Jacksonville D/ST + Cam Little ->
// 30, Houston D/ST -> 34).
export const PRO_TEAM_MAP: Record<number, string> = {
  0: "FA",
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WSH",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};

export function mapPosition(id: number): Position {
  return (POSITION_MAP[id] as Position) ?? `POS_${id}`;
}

export function mapLineupSlot(id: number): LineupSlot {
  return (LINEUP_SLOT_MAP[id] as LineupSlot) ?? `SLOT_${id}`;
}

export function mapProTeam(id: number | undefined | null): string | null {
  if (id === undefined || id === null) return null;
  return PRO_TEAM_MAP[id] ?? null;
}
