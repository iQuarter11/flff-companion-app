"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getClaimableTeams } from "@/lib/league/queries";

export type ProfileActionState = {
  error: string | null;
  success: boolean;
};

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in.", success: false };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const username = usernameRaw.length > 0 ? usernameRaw : null;
  const espnTeamIdRaw = String(formData.get("espn_team_id") ?? "").trim();
  const espnTeamId = espnTeamIdRaw.length > 0 ? Number(espnTeamIdRaw) : null;

  if (username && !/^[a-z0-9_]{3,24}$/.test(username)) {
    return { error: "Username must be 3-24 characters: lowercase letters, numbers, underscores.", success: false };
  }

  if (espnTeamIdRaw.length > 0 && (!Number.isInteger(espnTeamId) || espnTeamId === null || espnTeamId < 0)) {
    return { error: "Invalid team selection.", success: false };
  }

  // The <select> only lists real teams and disables ones another user
  // already claimed, but the value is still client-supplied — re-validate
  // both facts server-side rather than trusting the DOM wasn't tampered
  // with. The DB's unique constraint (0011) is the final backstop below.
  if (espnTeamId !== null) {
    const claimableTeams = await getClaimableTeams(user.id);
    const team = claimableTeams.find((t) => t.espnTeamId === espnTeamId);

    if (!team) {
      return { error: "That team doesn't exist in the current season.", success: false };
    }
    if (team.claimedByDisplayName) {
      return { error: `${team.name} is already claimed by ${team.claimedByDisplayName}.`, success: false };
    }
  }

  // Ownership is derived from the authenticated session (auth.uid()), never
  // from a client-supplied ID — the update targets `user.id` and RLS
  // enforces the same constraint server-side as defense in depth.
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      username,
      espn_team_id: espnTeamId,
    })
    .eq("id", user.id);

  if (error) {
    // Unique violation on espn_team_id — someone else claimed the same
    // team in the moment between our check above and this write.
    if (error.code === "23505" && error.message.includes("espn_team_id")) {
      return { error: "That team was just claimed by someone else. Pick another.", success: false };
    }
    return { error: error.message, success: false };
  }

  revalidatePath("/profile");
  revalidatePath("/");
  revalidatePath("/trades");
  return { error: null, success: true };
}
