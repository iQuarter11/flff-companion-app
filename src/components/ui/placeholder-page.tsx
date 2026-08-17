export function PlaceholderPage({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-xl text-sm text-muted">{description}</p>
      <div className="mt-4 rounded-lg border border-dashed border-surface-border p-8 text-center">
        <p className="text-sm font-medium text-muted">Coming in {phase}</p>
      </div>
    </div>
  );
}
