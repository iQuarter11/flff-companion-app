"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyFantasyTeam } from "@/lib/league/queries";

export type TradeBlockActionState = {
  error: string | null;
};

/**
 * The team a player gets added under is always the caller's own team,
 * derived server-side via getMyFantasyTeam() (profiles.espn_team_id) —
 * never a client-supplied team id. RLS (0005_trade_block.sql) enforces the
 * same constraint again at the database layer.
 */
export async function addToTradeBlock(playerIdentityCacheId: number): Promise<TradeBlockActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const myTeam = await getMyFantasyTeam();
  if (!myTeam) return { error: "Your profile isn't linked to a team in this league yet — set your ESPN Team ID in /profile." };

  const { error } = await supabase
    .from("trade_block")
    .insert({ team_id: myTeam.id, player_id: playerIdentityCacheId, added_by: user.id });

  if (error) return { error: error.message };

  revalidatePath("/trades");
  return { error: null };
}

export async function removeFromTradeBlock(playerIdentityCacheId: number): Promise<TradeBlockActionState> {
  const supabase = await createClient();
  const myTeam = await getMyFantasyTeam();
  if (!myTeam) return { error: "Your profile isn't linked to a team in this league yet." };

  const { error } = await supabase
    .from("trade_block")
    .delete()
    .eq("team_id", myTeam.id)
    .eq("player_id", playerIdentityCacheId);

  if (error) return { error: error.message };

  revalidatePath("/trades");
  return { error: null };
}
