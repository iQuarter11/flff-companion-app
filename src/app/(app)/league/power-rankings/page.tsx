import { getLatestPowerRankings, getSeasonLuck } from "@/lib/league/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Movement({ rank, previousRank }: { rank: number; previousRank: number | null }) {
  if (previousRank === null) return <span className="text-xs text-muted">NEW</span>;
  const delta = previousRank - rank;
  if (delta === 0) return <span className="text-xs text-muted">—</span>;
  return (
    <span className={cn("text-xs font-medium", delta > 0 ? "text-accent" : "text-red-500")}>
      {delta > 0 ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
}

export default async function PowerRankingsPage() {
  const [rankings, luck] = await Promise.all([getLatestPowerRankings(), getSeasonLuck()]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Power Rankings</h1>
        <p className="mt-1 text-sm text-muted">
          30% all-play · 25% points · 20% recent form · 15% record · 10% roster health. Not the same as ESPN
          standings — see docs/analytics.md for the formula.
        </p>
      </section>

      {rankings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No power rankings yet — run a sync from /dev/espn (it computes these automatically after every ESPN sync).
        </div>
      ) : (
        <ol className="flex flex-col gap-2">
          {rankings.map((team) => (
            <li key={team.teamId} className="flex items-center gap-4 rounded-lg border border-surface-border bg-surface p-3">
              <span className="w-6 shrink-0 text-center text-lg font-semibold">{team.rank}</span>
              <div className="w-8 shrink-0">
                <Movement rank={team.rank} previousRank={team.previousRank} />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{team.teamName}</span>
              <span className="shrink-0 text-lg font-semibold tabular-nums">{team.powerScore.toFixed(1)}</span>
            </li>
          ))}
        </ol>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted">Luck Rating</h2>
        <p className="mt-1 text-xs text-muted">
          Actual wins vs. expected wins from all-play performance. Positive = lucky, negative = unlucky.
        </p>

        {luck.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No luck data yet — needs at least one completed week.
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {luck.map((team) => (
              <div key={team.teamId} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface p-3">
                <div>
                  <p className="text-sm font-medium">{team.teamName}</p>
                  <p className="text-xs text-muted">
                    Actual {team.actualWins.toFixed(1)} · Expected {team.expectedWins.toFixed(1)}
                  </p>
                </div>
                <span className={cn("text-sm font-semibold", team.luckDifferential >= 0 ? "text-accent" : "text-red-500")}>
                  {team.luckDifferential >= 0 ? "+" : ""}
                  {team.luckDifferential.toFixed(1)} {team.luckDifferential >= 0 ? "🍀" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
