import { getStandings } from "@/lib/league/queries";

export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const standings = await getStandings();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Standings</h1>
        <p className="mt-1 text-sm text-muted">Current league standings, synced from ESPN.</p>
      </div>

      {standings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No standings yet — run a sync from /dev/espn.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Team</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">PF</th>
                <th className="px-3 py-2">PA</th>
                <th className="px-3 py-2">Streak</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.teamId} className="border-t border-surface-border">
                  <td className="px-3 py-2">{s.rank}</td>
                  <td className="px-3 py-2 font-medium">{s.teamName}</td>
                  <td className="px-3 py-2">
                    {s.wins}-{s.losses}
                    {s.ties ? `-${s.ties}` : ""}
                  </td>
                  <td className="px-3 py-2">{s.pointsFor.toFixed(1)}</td>
                  <td className="px-3 py-2">{s.pointsAgainst.toFixed(1)}</td>
                  <td className="px-3 py-2 text-muted">
                    {s.streakLength > 0 ? `${s.streakType === "WIN" ? "W" : "L"}${s.streakLength}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
