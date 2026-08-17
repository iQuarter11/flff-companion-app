import { mapPosition, mapProTeam } from "./constants";
import type { EspnPlayerRaw } from "./types";
import type { Position } from "@/types/league";

export function normalizePlayerPosition(player: EspnPlayerRaw): Position {
  return mapPosition(player.defaultPositionId);
}

export function normalizePlayerNflTeam(player: EspnPlayerRaw): string | null {
  return mapProTeam(player.proTeamId);
}
