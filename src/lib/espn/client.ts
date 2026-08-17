import "server-only";
import { getServerEnv } from "@/lib/env";
import type { EspnLeagueRaw } from "./types";

const BASE_URL = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl";

export class EspnAuthError extends Error {
  constructor(message = "ESPN authentication expired or invalid. Refresh ESPN_SWID/ESPN_S2.") {
    super(message);
    this.name = "EspnAuthError";
  }
}

export class EspnUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EspnUnavailableError";
  }
}

export class EspnNotConfiguredError extends Error {
  constructor() {
    super("ESPN_LEAGUE_ID, ESPN_SWID, and ESPN_S2 must all be set to call the ESPN API.");
    this.name = "EspnNotConfiguredError";
  }
}

const VIEWS = ["mTeam", "mRoster", "mMatchup", "mSettings"] as const;

/**
 * Fetches the full league payload (teams, rosters, schedule, settings) for
 * a given season. This is the one ESPN endpoint Phase 2 needs — later
 * phases (transactions, draft results, free agents) will add their own
 * narrowly-scoped fetchers rather than widening this one.
 */
export async function fetchLeague(season: number): Promise<EspnLeagueRaw> {
  const env = getServerEnv();

  if (!env.ESPN_LEAGUE_ID || !env.ESPN_SWID || !env.ESPN_S2) {
    throw new EspnNotConfiguredError();
  }

  const viewParams = VIEWS.map((v) => `view=${v}`).join("&");
  const url = `${BASE_URL}/seasons/${season}/segments/0/leagues/${env.ESPN_LEAGUE_ID}?${viewParams}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Cookie: `espn_s2=${env.ESPN_S2}; SWID=${env.ESPN_SWID}`,
      },
      // This payload (2MB+) exceeds Next.js's fetch cache entry size limit,
      // so trying to cache it here just produces a warning and does
      // nothing. Real caching happens one layer up: the sync job writes
      // normalized results to Supabase, and pages read from there — this
      // raw ESPN fetch is meant to always be live (used by the sync job
      // and the debug page only, never called from a normal page render).
      cache: "no-store",
    });
  } catch {
    throw new EspnUnavailableError("Could not reach ESPN. Network error or ESPN is down.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new EspnAuthError();
  }

  if (!response.ok) {
    throw new EspnUnavailableError(`ESPN returned ${response.status} ${response.statusText}.`);
  }

  return (await response.json()) as EspnLeagueRaw;
}
