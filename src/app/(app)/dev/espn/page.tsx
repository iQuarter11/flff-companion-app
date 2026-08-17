import { getNormalizedLeague } from "@/lib/espn/normalize";
import { EspnAuthError, EspnNotConfiguredError, EspnUnavailableError } from "@/lib/espn/client";
import { getServerEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { MOCK_LEAGUE } from "@/lib/mock/espn";
import { SyncButton, HistoricalSyncButton } from "./sync-button";
import type { NormalizedLeague } from "@/types/league";

export const dynamic = "force-dynamic";

type SyncRunRow = {
  id: number;
  sync_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  error: string | null;
  meta: unknown;
};

async function loadLeague(): Promise<{ league: NormalizedLeague | null; error: string | null; isMock: boolean }> {
  const env = getServerEnv();
  const season = Number(env.ESPN_SEASON ?? new Date().getFullYear());

  try {
    const league = await getNormalizedLeague(season);
    return { league, error: null, isMock: false };
  } catch (error) {
    if (error instanceof EspnNotConfiguredError) {
      // Dev-mode fallback (spec section 29): the app should be browsable
      // before ESPN credentials exist. Never returned without the banner
      // below making it obvious this isn't real league data.
      return { league: MOCK_LEAGUE, error: null, isMock: true };
    }
    if (error instanceof EspnAuthError) {
      return { league: null, error: "ESPN authentication failed — ESPN_SWID/ESPN_S2 are likely expired. See docs/espn-integration.md.", isMock: false };
    }
    if (error instanceof EspnUnavailableError) {
      return { league: null, error: `ESPN is unavailable: ${error.message}`, isMock: false };
    }
    return {
      league: null,
      error: error instanceof Error ? error.message : "Unknown error fetching ESPN data.",
      isMock: false,
    };
  }
}

export default async function EspnDebugPage() {
  const [{ league, error, isMock }, supabase] = await Promise.all([loadLeague(), createClient()]);

  const { data: syncRuns } = await supabase
    .from("sync_runs")
    .select("id, sync_type, status, started_at, finished_at, error, meta")
    .order("started_at", { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ESPN Debug</h1>
        <p className="mt-1 text-sm text-muted">
          Internal-only page for verifying normalized ESPN data (Phase 2). Not linked from the main nav.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <SyncButton />
        <HistoricalSyncButton />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">{error}</div>
      ) : null}

      {isMock ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
          Showing mock data — ESPN_LEAGUE_ID/ESPN_SWID/ESPN_S2 aren&apos;t all set in .env.local. This is fixture
          data, not your real league.
        </div>
      ) : null}

      {league ? (
        <>
          <section>
            <h2 className="text-sm font-semibold text-muted">League</h2>
            <div className="mt-2 rounded-lg border border-surface-border bg-surface p-4 text-sm">
              <p>
                <span className="font-medium">{league.settings.name}</span> — {league.settings.size} teams — season{" "}
                {league.season}, week {league.currentWeek}
              </p>
              <p className="mt-1 text-xs text-muted">
                Regular season: {league.settings.regularSeasonMatchupCount} weeks. Playoff teams:{" "}
                {league.settings.playoffTeamCount}.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted">Standings ({league.standings.length})</h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Team</th>
                    <th className="px-3 py-2">Record</th>
                    <th className="px-3 py-2">PF</th>
                    <th className="px-3 py-2">PA</th>
                  </tr>
                </thead>
                <tbody>
                  {league.standings.map((s) => {
                    const team = league.teams.find((t) => t.espnTeamId === s.espnTeamId);
                    return (
                      <tr key={s.espnTeamId} className="border-t border-surface-border">
                        <td className="px-3 py-2">{s.rank}</td>
                        <td className="px-3 py-2">{team?.name ?? s.espnTeamId}</td>
                        <td className="px-3 py-2">
                          {s.wins}-{s.losses}
                          {s.ties ? `-${s.ties}` : ""}
                        </td>
                        <td className="px-3 py-2">{s.pointsFor.toFixed(1)}</td>
                        <td className="px-3 py-2">{s.pointsAgainst.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted">
              Week {league.currentWeek} matchups ({league.matchups.filter((m) => m.week === league.currentWeek).length})
            </h2>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {league.matchups
                .filter((m) => m.week === league.currentWeek)
                .map((m) => {
                  const home = league.teams.find((t) => t.espnTeamId === m.homeTeamId);
                  const away = m.awayTeamId ? league.teams.find((t) => t.espnTeamId === m.awayTeamId) : null;
                  return (
                    <div key={m.espnMatchupId} className="rounded-lg border border-surface-border bg-surface p-3 text-sm">
                      <p>
                        {away?.name ?? "BYE"} <span className="text-muted">{m.awayScore ?? "—"}</span> @{" "}
                        {home?.name} <span className="text-muted">{m.homeScore}</span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {m.result} {m.isPlayoff ? "· Playoff" : ""}
                      </p>
                    </div>
                  );
                })}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-muted">Sample roster — {league.teams[0]?.name}</h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-surface-border">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-surface text-xs uppercase text-muted">
                  <tr>
                    <th className="px-3 py-2">Slot</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Pos</th>
                    <th className="px-3 py-2">Team</th>
                    <th className="px-3 py-2">Starter</th>
                  </tr>
                </thead>
                <tbody>
                  {league.rosters[0]?.players.map((p) => (
                    <tr key={p.espnPlayerId} className="border-t border-surface-border">
                      <td className="px-3 py-2">{p.lineupSlot}</td>
                      <td className="px-3 py-2">{p.fullName}</td>
                      <td className="px-3 py-2">{p.position}</td>
                      <td className="px-3 py-2">{p.nflTeam ?? "—"}</td>
                      <td className="px-3 py-2">{p.isStarter ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-muted">Recent sync runs</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {((syncRuns as SyncRunRow[] | null) ?? []).map((run) => {
                const durationMs = run.finished_at
                  ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
                  : null;
                return (
                  <tr key={run.id} className="border-t border-surface-border">
                    <td className="px-3 py-2">{new Date(run.started_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          run.status === "success"
                            ? "text-accent"
                            : run.status === "error"
                              ? "text-red-500"
                              : "text-muted"
                        }
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{durationMs !== null ? `${(durationMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {run.error ?? (run.meta ? JSON.stringify(run.meta) : "—")}
                    </td>
                  </tr>
                );
              })}
              {(!syncRuns || syncRuns.length === 0) && (
                <tr>
                  <td className="px-3 py-4 text-muted" colSpan={4}>
                    No sync runs yet — run migration 0003_league_data.sql, then click &quot;Run sync now&quot; above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
