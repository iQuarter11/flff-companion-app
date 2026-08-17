"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server-side errors are already logged by Next.js; this just keeps a
    // client-visible trace during development without leaking anything
    // sensitive (Error messages here never include secrets — see the
    // typed ESPN/Sleeper errors, which are the errors most likely to
    // reach a page boundary).
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-surface-border p-10 text-center">
      <p className="text-sm font-medium">Something went wrong loading this page.</p>
      <p className="max-w-sm text-xs text-muted">
        {error.message || "An unexpected error occurred."} One page failing shouldn&apos;t take down the rest of the
        app — try again, or use the nav to go elsewhere.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Try again
      </button>
    </div>
  );
}
