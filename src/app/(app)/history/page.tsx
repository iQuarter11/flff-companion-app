import Link from "next/link";
import { getChampions, getSeasons, getNotableRivalries } from "@/lib/history/queries";

export const dynamic = "force-dynamic";

export default async function HistoryOverviewPage() {
  const [champions, seasons, rivalries] = await Promise.all([getChampions(), getSeasons(), getNotableRivalries(3)]);

  if (seasons.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
        No historical data synced yet — run &quot;Sync historical seasons&quot; from /dev/espn.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">League History</h1>
        <p className="mt-1 text-sm text-muted">
          {seasons.length} season{seasons.length === 1 ? "" : "s"} synced, {champions.length} champion
          {champions.length === 1 ? "" : "s"} recorded.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">Recent champions</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {champions.slice(0, 3).map((c) => (
            <div key={c.seasonYear} className="rounded-lg border border-surface-border bg-surface p-3">
              <p className="text-xs text-muted">{c.seasonYear}</p>
              <p className="text-sm font-medium">{c.teamName}</p>
            </div>
          ))}
          {champions.length === 0 ? <p className="text-sm text-muted">No completed season has a finalized champion yet.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">Notable rivalries</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {rivalries.map((r) => (
            <Link
              key={`${r.teamA.espnTeamId}-${r.teamB.espnTeamId}`}
              href={`/history/rivalries?teamA=${r.teamA.espnTeamId}&teamB=${r.teamB.espnTeamId}`}
              className="rounded-lg border border-surface-border bg-surface p-3 hover:border-accent/40"
            >
              <p className="text-sm font-medium">
                {r.teamA.name} vs {r.teamB.name}
              </p>
              <p className="text-xs text-muted">
                {r.gamesPlayed} meetings · {r.teamAWins}-{r.teamBWins}
                {r.ties ? `-${r.ties}` : ""}
              </p>
            </Link>
          ))}
          {rivalries.length === 0 ? <p className="text-sm text-muted">Not enough matchup history yet.</p> : null}
        </div>
      </section>
    </div>
  );
}
