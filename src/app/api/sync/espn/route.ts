import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { runLeagueSync } from "@/lib/sync/league";
import { computeAndStorePowerRankings } from "@/lib/sync/power-rankings";
import { EspnAuthError, EspnNotConfiguredError, EspnUnavailableError } from "@/lib/espn/client";

/**
 * Triggers an ESPN -> Supabase sync. Protected by a bearer secret so it's
 * safe to wire up to Vercel Cron later without exposing writes to anyone
 * who finds the URL. Call manually for now via the debug page's "Sync now"
 * button or:
 *   curl -X POST -H "Authorization: Bearer $SYNC_SECRET" http://localhost:3000/api/sync/espn
 */
export async function POST(request: Request) {
  const env = getServerEnv();

  if (!env.SYNC_SECRET) {
    return NextResponse.json({ error: "SYNC_SECRET is not configured on the server." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.SYNC_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = Number(env.ESPN_SEASON ?? new Date().getFullYear());

  try {
    const result = await runLeagueSync(season);
    const powerRankings = await computeAndStorePowerRankings(result.seasonId);
    return NextResponse.json({ ...result, powerRankings });
  } catch (error) {
    if (error instanceof EspnNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof EspnAuthError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    if (error instanceof EspnUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unknown sync error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
