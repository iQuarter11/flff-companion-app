"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileActionState } from "./actions";
import type { Profile } from "./page";
import type { ClaimableTeam } from "@/lib/league/queries";

const initialState: ProfileActionState = { error: null, success: false };

export function ProfileForm({ profile, claimableTeams }: { profile: Profile; claimableTeams: ClaimableTeam[] }) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="display_name" className="text-sm font-medium">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          defaultValue={profile.username ?? ""}
          placeholder="lowercase_letters_numbers"
          className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="espn_team_id" className="text-sm font-medium">
          Your team
        </label>

        {claimableTeams.length === 0 ? (
          <p className="text-xs text-muted">
            No teams synced yet — once someone runs a sync from /dev/espn, you&apos;ll be able to pick your team here.
          </p>
        ) : (
          <>
            <select
              id="espn_team_id"
              name="espn_team_id"
              defaultValue={profile.espn_team_id ?? ""}
              className="rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">— Not selected —</option>
              {claimableTeams.map((team) => (
                <option key={team.espnTeamId} value={team.espnTeamId} disabled={team.claimedByDisplayName !== null}>
                  {team.name}
                  {team.claimedByDisplayName ? ` (claimed by ${team.claimedByDisplayName})` : ""}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted">Which of the 12 league teams is yours. Each team can only be claimed once.</span>
          </>
        )}
      </div>

      {state.error ? <p className="text-sm text-red-500">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-accent">Profile updated.</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
