import Link from "next/link";
import { getCurrentSeason, getStandings, getMatchupsForWeek, getLatestPowerRankings } from "@/lib/league/queries";

export const dynamic = "force-dynamic";

export default async function LeagueOverviewPage() {
  const season = await getCurrentSeason();
  const [standings, matchups, powerRankings] = await Promise.all([
    getStandings(),
    season?.currentWeek ? getMatchupsForWeek(season.currentWeek) : Promise.resolve([]),
    getLatestPowerRankings(),
  ]);

  if (!season) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
        No league data synced yet — run a sync from /dev/espn.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">League Overview</h1>
        <p className="mt-1 text-sm text-muted">
          Season {season.seasonYear}, week {season.currentWeek}.
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Standings (top 5)</h2>
          <Link href="/league/standings" className="text-xs text-accent underline underline-offset-4">
            Full standings
          </Link>
        </div>
        <ol className="mt-2 flex flex-col gap-1.5">
          {standings.slice(0, 5).map((s) => (
            <li key={s.teamId} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm">
              <span>
                {s.rank}. {s.teamName}
              </span>
              <span className="text-muted">
                {s.wins}-{s.losses}
                {s.ties ? `-${s.ties}` : ""}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">This week&apos;s matchups</h2>
          <Link href="/league/matchups" className="text-xs text-accent underline underline-offset-4">
            All matchups
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {matchups.map((m) => (
            <div key={m.espnMatchupId} className="rounded-lg border border-surface-border bg-surface p-3 text-sm">
              {m.awayTeamName ?? "BYE"} @ {m.homeTeamName}
              <span className="ml-2 text-muted">
                {m.awayScore?.toFixed(1) ?? "—"} - {m.homeScore.toFixed(1)}
              </span>
            </div>
          ))}
          {matchups.length === 0 ? <p className="text-sm text-muted">No matchups this week.</p> : null}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Power rankings (top 3)</h2>
          <Link href="/league/power-rankings" className="text-xs text-accent underline underline-offset-4">
            Full rankings
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {powerRankings.slice(0, 3).map((r) => (
            <div key={r.teamId} className="rounded-lg border border-surface-border bg-surface p-3 text-sm">
              <p className="text-xs text-muted">#{r.rank}</p>
              <p className="font-medium">{r.teamName}</p>
              <p className="text-muted">{r.powerScore.toFixed(1)}</p>
            </div>
          ))}
          {powerRankings.length === 0 ? <p className="text-sm text-muted">No power rankings computed yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
