"use client";

import { useActionState } from "react";
import { triggerSync, triggerHistoricalSync, type SyncActionState } from "./actions";

const initialState: SyncActionState = { error: null, success: false, summary: null };

export function SyncButton() {
  const [state, formAction, isPending] = useActionState(triggerSync, initialState);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {isPending ? "Syncing…" : "Run sync now"}
        </button>
      </form>
      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-accent">{state.summary}</p> : null}
    </div>
  );
}

export function HistoricalSyncButton() {
  const [state, formAction, isPending] = useActionState(triggerHistoricalSync, initialState);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md border border-surface-border px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isPending ? "Syncing past seasons (this can take a minute)…" : "Sync historical seasons"}
        </button>
      </form>
      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-accent">{state.summary}</p> : null}
    </div>
  );
}
