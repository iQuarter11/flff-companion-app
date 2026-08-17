import { getSeasons } from "@/lib/history/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const seasons = await getSeasons();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seasons</h1>
        <p className="mt-1 text-sm text-muted">Every season synced from ESPN.</p>
      </div>

      {seasons.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No seasons synced yet — run a sync from /dev/espn.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {seasons.map((s) => (
            <li key={s.seasonYear} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold">{s.seasonYear}</span>
                {s.isCurrent ? <span className={cn("rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent")}>Current</span> : null}
              </div>
              <div className="text-right text-sm text-muted">
                <p>{s.teamCount} teams</p>
                {s.champion ? <p className="text-foreground">🏆 {s.champion}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
