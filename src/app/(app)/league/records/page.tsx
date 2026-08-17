import { getLeagueRecords } from "@/lib/history/queries";

export const dynamic = "force-dynamic";

export default async function LeagueRecordsPage() {
  const records = await getLeagueRecords();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">League Records</h1>
        <p className="mt-1 text-sm text-muted">
          The permanent record book. Also under <span className="underline">History → Records</span>.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No completed matchups synced yet — run a sync from /dev/espn.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {records.map((r) => (
            <li key={r.label} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface p-4">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted">
                  {r.team}
                  {r.opponent ? ` vs ${r.opponent}` : ""} {r.season ? `· ${r.season}` : ""} {r.week ? `Week ${r.week}` : ""}
                </p>
              </div>
              <span className="text-lg font-semibold tabular-nums">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
