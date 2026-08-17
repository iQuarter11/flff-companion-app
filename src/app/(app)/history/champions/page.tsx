import { getChampions } from "@/lib/history/queries";

export const dynamic = "force-dynamic";

export default async function ChampionsPage() {
  const champions = await getChampions();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Champions</h1>
        <p className="mt-1 text-sm text-muted">Every league champion, by season.</p>
      </div>

      {champions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-surface-border p-8 text-center text-sm text-muted">
          No finalized champions yet. ESPN only marks a season&apos;s final rank once it&apos;s complete — sync
          historical seasons from /dev/espn once available.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {champions.map((c) => (
            <li key={c.seasonYear} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface p-4">
              <div>
                <p className="text-xs text-muted">{c.seasonYear}</p>
                <p className="text-base font-semibold">{c.teamName}</p>
              </div>
              <p className="text-sm text-muted">
                {c.wins}-{c.losses} · {c.pointsFor.toFixed(1)} pts
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
