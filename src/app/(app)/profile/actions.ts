"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
    return { error: "ESPN Team ID must be a whole number.", success: false };
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
    return { error: error.message, success: false };
  }

  revalidatePath("/profile");
  return { error: null, success: true };
}
