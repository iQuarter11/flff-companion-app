"use client";

import { useActionState } from "react";
import { refreshVideos, type MediaSyncState } from "./actions";

const initialState: MediaSyncState = { error: null, summary: null };

export function RefreshVideosButton() {
  const [state, formAction, isPending] = useActionState(refreshVideos, initialState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          {isPending ? "Refreshing…" : "Refresh videos"}
        </button>
      </form>
      {state.error ? <p className="text-xs text-red-500">{state.error}</p> : null}
      {state.summary ? <p className="text-xs text-muted">{state.summary}</p> : null}
    </div>
  );
}
