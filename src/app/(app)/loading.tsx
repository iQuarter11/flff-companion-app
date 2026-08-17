/**
 * Applies to every route under (app)/ — a single shared skeleton instead
 * of per-page loading.tsx files, since the pattern (title bar + a few
 * card/row placeholders) is the same everywhere in this app.
 */
export default function AppLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-surface-border" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-14 rounded-lg bg-surface-border" />
        ))}
      </div>
    </div>
  );
}
