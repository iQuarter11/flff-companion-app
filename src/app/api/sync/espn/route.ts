import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { runLeagueSync } from "@/lib/sync/league";
import { computeAndStorePowerRankings } from "@/lib/sync/power-rankings";
import { generateAndStoreRecap } from "@/lib/sync/recap";
import { EspnAuthError, EspnNotConfiguredError, EspnUnavailableError } from "@/lib/espn/client";

/**
 * Triggers an ESPN -> Supabase sync (teams/rosters/matchups/standings,
 * power rankings, and a recap for the most recently completed week — the
 * same three steps the /dev/espn "Run sync now" button runs).
 *
 * GET is what Vercel Cron calls (see vercel.json) — Vercel automatically
 * attaches `Authorization: Bearer $CRON_SECRET` to cron requests when an
 * env var named exactly CRON_SECRET is set, so no extra config is needed
 * beyond setting that var. POST with the same bearer token still works for
 * manual/scripted triggering:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sync/espn
 */
async function handleSync(request: Request) {
  const env = getServerEnv();

  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on the server." }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = Number(env.ESPN_SEASON ?? new Date().getFullYear());

  try {
    const result = await runLeagueSync(season);
    const powerRankings = await computeAndStorePowerRankings(result.seasonId);

    let recapWeek: number | null = null;
    if (powerRankings && powerRankings.week > 1) {
      await generateAndStoreRecap(result.seasonId, powerRankings.week - 1);
      recapWeek = powerRankings.week - 1;
    }

    return NextResponse.json({ ...result, powerRankings, recapWeek });
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

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
