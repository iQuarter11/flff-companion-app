"use client";

import { useActionState } from "react";
import { signup, type AuthActionState } from "../actions";

const initialState: AuthActionState = { error: null };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <span className="text-xs text-muted">At least 8 characters.</span>
      </div>

      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {isPending ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}
