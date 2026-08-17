import { getCurrentSeason, getMatchupsForWeek } from "@/lib/league/queries";

export const dynamic = "force-dynamic";

export default async function MatchupsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams;
  const season = await getCurrentSeason();
  const week = weekParam ? Number(weekParam) : (season?.currentWeek ?? undefined);
  const matchups = week ? await getMatchupsForWeek(week) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matchups</h1>
          <p className="mt-1 text-sm text-muted">Week {week ?? "—"}</p>
        </div>
        {season?.currentWeek ? (
          <form className="flex items-center gap-2" method="get">
            <select name="week" defaultValue={week} className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm">
              {Array.from({ length: season.currentWeek }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground">
              Go
            </button>
          </form>
        ) : null}
      </div>

      {matchups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No matchups for this week yet — run a sync from /dev/espn.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {matchups.map((m) => (
            <div key={m.espnMatchupId} className="rounded-lg border border-surface-border bg-surface p-4">
              <div className="flex items-center justify-between text-sm">
                <span className={m.result === "AWAY" ? "font-semibold" : ""}>{m.awayTeamName ?? "BYE"}</span>
                <span className="tabular-nums text-muted">{m.awayScore?.toFixed(1) ?? "—"}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className={m.result === "HOME" ? "font-semibold" : ""}>{m.homeTeamName}</span>
                <span className="tabular-nums text-muted">{m.homeScore.toFixed(1)}</span>
              </div>
              <p className="mt-2 text-xs text-muted">
                {m.result === "UNDECIDED" ? "Not yet played" : m.result === "TIE" ? "Tied" : "Final"}
                {m.isPlayoff ? " · Playoff" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
