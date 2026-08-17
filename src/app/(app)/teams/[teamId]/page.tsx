import { getTeamProfile, getLatestPowerRankings, getSeasonLuck } from "@/lib/league/queries";

export const dynamic = "force-dynamic";

export default async function TeamProfilePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const espnTeamId = Number(teamId);

  const [team, powerRankings, luck] = await Promise.all([
    getTeamProfile(espnTeamId),
    getLatestPowerRankings(),
    getSeasonLuck(),
  ]);

  if (!team) {
    return (
      <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
        No team found for ID {teamId} in the current season. Run a sync from /dev/espn if this is unexpected.
      </div>
    );
  }

  const powerRanking = powerRankings.find((r) => r.teamId === team.fantasyTeamId);
  const teamLuck = luck.find((l) => l.teamId === team.fantasyTeamId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{team.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {team.wins}-{team.losses}
          {team.ties ? `-${team.ties}` : ""} · {team.pointsFor.toFixed(1)} PF · {team.pointsAgainst.toFixed(1)} PA
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-surface-border bg-surface p-3">
          <p className="text-xs text-muted">Power rank</p>
          <p className="text-lg font-semibold">{powerRanking ? `#${powerRanking.rank}` : "—"}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface p-3">
          <p className="text-xs text-muted">Power score</p>
          <p className="text-lg font-semibold">{powerRanking ? powerRanking.powerScore.toFixed(1) : "—"}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface p-3">
          <p className="text-xs text-muted">Luck rating</p>
          <p className="text-lg font-semibold">
            {teamLuck ? `${teamLuck.luckDifferential >= 0 ? "+" : ""}${teamLuck.luckDifferential.toFixed(1)}` : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface p-3">
          <p className="text-xs text-muted">On trade block</p>
          <p className="text-lg font-semibold">{team.tradeBlockPlayerIds.size}</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted">Roster</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {team.roster.map((p) => (
            <li key={p.espnPlayerId} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm">
              <span>
                {p.fullName} <span className="text-xs text-muted">{p.position}</span>
              </span>
              <span className="text-xs text-muted">{p.lineupSlot}</span>
            </li>
          ))}
          {team.roster.length === 0 ? <p className="text-sm text-muted">No roster data yet.</p> : null}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">Recent results</h2>
        <ul className="mt-2 flex flex-col gap-1.5">
          {team.recentMatchups.map((m) => (
            <li key={m.week} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm">
              <span>
                Week {m.week} vs {m.opponentName ?? "BYE"}
              </span>
              <span className="text-muted">
                {m.teamScore.toFixed(1)} - {m.opponentScore?.toFixed(1) ?? "—"}
              </span>
            </li>
          ))}
          {team.recentMatchups.length === 0 ? <p className="text-sm text-muted">No completed matchups yet.</p> : null}
        </ul>
      </section>
    </div>
  );
}
