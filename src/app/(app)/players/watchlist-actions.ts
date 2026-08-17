"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type WatchlistActionState = {
  error: string | null;
  watched: boolean;
};

/**
 * Ownership is always the authenticated session's user_id — a player_id is
 * the only client-supplied value, and RLS on watchlist (0004_watchlist.sql)
 * enforces the same constraint server-side regardless.
 */
export async function toggleWatchlist(
  playerId: number,
  currentlyWatched: boolean
): Promise<WatchlistActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in.", watched: currentlyWatched };
  }

  if (currentlyWatched) {
    const { error } = await supabase.from("watchlist").delete().eq("user_id", user.id).eq("player_id", playerId);
    if (error) return { error: error.message, watched: true };
    revalidatePath("/players/watchlist");
    revalidatePath("/players");
    revalidatePath("/players/search");
    return { error: null, watched: false };
  }

  const { error } = await supabase.from("watchlist").insert({ user_id: user.id, player_id: playerId });
  if (error) return { error: error.message, watched: false };
  revalidatePath("/players/watchlist");
  revalidatePath("/players");
  revalidatePath("/players/search");
  return { error: null, watched: true };
}
