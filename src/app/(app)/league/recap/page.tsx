import { getRecap } from "@/lib/league/queries";

export const dynamic = "force-dynamic";

export default async function RecapPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: weekParam } = await searchParams;
  const recap = await getRecap(weekParam ? Number(weekParam) : undefined);

  if (!recap) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
        No recap generated yet. Recaps are generated automatically after each sync from /dev/espn, once a week has
        completed.
      </div>
    );
  }

  const r = recap.payload;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Week {recap.week} Recap</h1>
        <p className="mt-1 text-xs text-muted">Generated {new Date(recap.createdAt).toLocaleString()}</p>
      </div>

      {r.gameOfTheWeek ? (
        <section className="rounded-xl border border-accent/30 bg-accent/5 p-4">
          <p className="text-xs font-semibold uppercase text-accent">Game of the Week</p>
          <p className="mt-1 text-lg font-medium">
            {r.gameOfTheWeek.away} {r.gameOfTheWeek.awayScore.toFixed(1)} @ {r.gameOfTheWeek.home}{" "}
            {r.gameOfTheWeek.homeScore.toFixed(1)}
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {r.biggestBlowout ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Biggest Beatdown</p>
            <p className="mt-1 text-sm">
              {r.biggestBlowout.winner} {r.biggestBlowout.winnerScore.toFixed(1)} — {r.biggestBlowout.loser}{" "}
              {r.biggestBlowout.loserScore.toFixed(1)}
            </p>
            <p className="text-xs text-muted">Margin: {r.biggestBlowout.margin.toFixed(1)}</p>
          </div>
        ) : null}

        {r.closestGame ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Closest Game</p>
            <p className="mt-1 text-sm">
              {r.closestGame.away} {r.closestGame.awayScore.toFixed(1)} @ {r.closestGame.home}{" "}
              {r.closestGame.homeScore.toFixed(1)}
            </p>
            <p className="text-xs text-muted">Margin: {r.closestGame.margin.toFixed(1)}</p>
          </div>
        ) : null}

        {r.highestScorer ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Highest Scorer</p>
            <p className="mt-1 text-sm">
              {r.highestScorer.team} — {r.highestScorer.points.toFixed(1)}
            </p>
          </div>
        ) : null}

        {r.lowestScorer ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Lowest Scorer</p>
            <p className="mt-1 text-sm">
              {r.lowestScorer.team} — {r.lowestScorer.points.toFixed(1)}
            </p>
          </div>
        ) : null}

        {r.biggestUpset ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Biggest Upset</p>
            <p className="mt-1 text-sm">
              {r.biggestUpset.winner} over {r.biggestUpset.loser}
            </p>
          </div>
        ) : null}

        {r.powerMove ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Power Move</p>
            <p className="mt-1 text-sm">
              {r.powerMove.team} rises from #{r.powerMove.from} to #{r.powerMove.to}
            </p>
          </div>
        ) : null}

        {r.luckiestWin ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Luckiest Win</p>
            <p className="mt-1 text-sm">{r.luckiestWin.team} won despite an all-play losing week.</p>
          </div>
        ) : null}

        {r.unluckiestLoss ? (
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Heartbreak</p>
            <p className="mt-1 text-sm">{r.unluckiestLoss.team} posted an all-play winning week and still lost.</p>
          </div>
        ) : null}
      </div>

      {r.standingsChanges.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-muted">Standings changes</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {r.standingsChanges.map((c) => (
              <li key={c.team} className="rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm">
                {c.team}: #{c.from} → #{c.to}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
