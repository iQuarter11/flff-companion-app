import { getAllFranchises, getRivalry, getNotableRivalries } from "@/lib/history/queries";

export const dynamic = "force-dynamic";

export default async function RivalriesPage({
  searchParams,
}: {
  searchParams: Promise<{ teamA?: string; teamB?: string }>;
}) {
  const { teamA: teamAParam, teamB: teamBParam } = await searchParams;
  const franchises = await getAllFranchises();

  const teamAId = teamAParam ? Number(teamAParam) : franchises[0]?.espnTeamId;
  const teamBId = teamBParam ? Number(teamBParam) : franchises[1]?.espnTeamId;

  const [rivalry, notable] = await Promise.all([
    teamAId && teamBId && teamAId !== teamBId ? getRivalry(teamAId, teamBId) : Promise.resolve(null),
    getNotableRivalries(5),
  ]);

  if (franchises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
        No teams synced yet — run a sync from /dev/espn.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rivalries</h1>
        <p className="mt-1 text-sm text-muted">Head-to-head history between any two teams, across every synced season.</p>
      </div>

      <form className="flex flex-wrap items-center gap-2" method="get">
        <select name="teamA" defaultValue={teamAId} className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm">
          {franchises.map((f) => (
            <option key={f.espnTeamId} value={f.espnTeamId}>
              {f.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">vs</span>
        <select name="teamB" defaultValue={teamBId} className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm">
          {franchises.map((f) => (
            <option key={f.espnTeamId} value={f.espnTeamId}>
              {f.name}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
          Compare
        </button>
      </form>

      {!rivalry ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No recorded matchups between these two teams yet.
        </div>
      ) : (
        <div className="rounded-xl border border-surface-border bg-surface p-6">
          <div className="flex items-center justify-center gap-6 text-center">
            <div>
              <p className="text-lg font-semibold">{rivalry.teamA.name}</p>
              <p className="text-2xl font-bold tabular-nums">{rivalry.teamAWins}</p>
            </div>
            <p className="text-sm text-muted">all-time{rivalry.ties ? ` (${rivalry.ties} tied)` : ""}</p>
            <div>
              <p className="text-lg font-semibold">{rivalry.teamB.name}</p>
              <p className="text-2xl font-bold tabular-nums">{rivalry.teamBWins}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">Total meetings</dt>
              <dd className="font-medium">{rivalry.gamesPlayed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Playoff meetings</dt>
              <dd className="font-medium">{rivalry.playoffMeetings}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Total points</dt>
              <dd className="font-medium">
                {rivalry.teamATotalPoints.toFixed(1)} - {rivalry.teamBTotalPoints.toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Average score</dt>
              <dd className="font-medium">
                {(rivalry.teamATotalPoints / rivalry.gamesPlayed).toFixed(1)} - {(rivalry.teamBTotalPoints / rivalry.gamesPlayed).toFixed(1)}
              </dd>
            </div>
            {rivalry.biggestVictory ? (
              <div>
                <dt className="text-xs text-muted">Biggest victory</dt>
                <dd className="font-medium">
                  {rivalry.biggestVictory.winner === "A" ? rivalry.teamA.name : rivalry.teamB.name} by{" "}
                  {rivalry.biggestVictory.margin.toFixed(1)} ({rivalry.biggestVictory.season} wk {rivalry.biggestVictory.week})
                </dd>
              </div>
            ) : null}
            {rivalry.closestGame ? (
              <div>
                <dt className="text-xs text-muted">Closest game</dt>
                <dd className="font-medium">
                  {rivalry.closestGame.margin.toFixed(1)} pts ({rivalry.closestGame.season} wk {rivalry.closestGame.week})
                </dd>
              </div>
            ) : null}
            {rivalry.highestScoringGame ? (
              <div>
                <dt className="text-xs text-muted">Highest-scoring matchup</dt>
                <dd className="font-medium">
                  {rivalry.highestScoringGame.total.toFixed(1)} combined ({rivalry.highestScoringGame.season} wk{" "}
                  {rivalry.highestScoringGame.week})
                </dd>
              </div>
            ) : null}
            {rivalry.currentStreak.holder ? (
              <div>
                <dt className="text-xs text-muted">Current streak</dt>
                <dd className="font-medium">
                  {rivalry.currentStreak.holder === "A" ? rivalry.teamA.name : rivalry.teamB.name} · {rivalry.currentStreak.length}{" "}
                  straight
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted">Notable rivalries</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {notable.map((r) => (
            <a
              key={`${r.teamA.espnTeamId}-${r.teamB.espnTeamId}`}
              href={`/history/rivalries?teamA=${r.teamA.espnTeamId}&teamB=${r.teamB.espnTeamId}`}
              className="rounded-lg border border-surface-border bg-surface p-3 hover:border-accent/40"
            >
              <p className="text-sm font-medium">
                {r.teamA.name} vs {r.teamB.name}
              </p>
              <p className="text-xs text-muted">
                {r.gamesPlayed} meetings{r.playoffMeetings ? ` · ${r.playoffMeetings} in the playoffs` : ""}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
