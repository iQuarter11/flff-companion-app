import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

/**
 * The player_identity_cache table is public-read (see
 * supabase/migrations/0002_player_identity_cache.sql), so these helpers use
 * a plain anon-key client rather than the cookie-aware server/browser
 * clients — they work identically from Server Components, Route Handlers,
 * or Client Components.
 */
function client() {
  const env = getPublicEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export type PlayerIdentity = {
  id: number;
  sleeper_id: string | null;
  espn_id: number | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  nfl_team: string | null;
  status: string | null;
  headshot_url: string | null;
  sleeper_rank: number | null;
  espn_rank: number | null;
  in_sleeper_top_1000: boolean;
  in_espn_top_1000: boolean;
  created_at: string;
  updated_at: string;
};

export async function getPlayerByEspnId(espnId: number): Promise<PlayerIdentity | null> {
  const { data, error } = await client()
    .from("player_identity_cache")
    .select("*")
    .eq("espn_id", espnId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPlayerBySleeperId(sleeperId: string): Promise<PlayerIdentity | null> {
  const { data, error } = await client()
    .from("player_identity_cache")
    .select("*")
    .eq("sleeper_id", sleeperId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPlayersByEspnIds(espnIds: number[]): Promise<PlayerIdentity[]> {
  if (espnIds.length === 0) return [];

  const { data, error } = await client().from("player_identity_cache").select("*").in("espn_id", espnIds);

  if (error) throw error;
  return data ?? [];
}

/**
 * Resolves Sleeper player IDs (e.g. from a trending response) against the
 * cache, preserving the input order — Sleeper trending results are already
 * ranked, and callers shouldn't have to re-sort.
 */
export async function getPlayersBySleeperIds(sleeperIds: string[]): Promise<PlayerIdentity[]> {
  if (sleeperIds.length === 0) return [];

  const { data, error } = await client().from("player_identity_cache").select("*").in("sleeper_id", sleeperIds);

  if (error) throw error;

  const byId = new Map((data ?? []).map((p) => [p.sleeper_id, p]));
  return sleeperIds.map((id) => byId.get(id)).filter((p): p is PlayerIdentity => Boolean(p));
}

/**
 * Name/team/position search over the cache, for the Player Search page.
 * This is the one place name matching is expected — everywhere else,
 * Sleeper ID / ESPN ID should be the primary lookup key.
 */
export async function searchPlayers(query: string, limit = 25): Promise<PlayerIdentity[]> {
  // PostgREST's `.or()` filter syntax treats `,`, `(`, and `)` as
  // structural characters, so strip them from user input before building
  // the filter string — otherwise a query like "a,full_name.ilike.%" could
  // append arbitrary extra filter clauses.
  const sanitized = query.replace(/[,()%]/g, "").trim();
  if (!sanitized) return [];

  const pattern = `%${sanitized}%`;
  const { data, error } = await client()
    .from("player_identity_cache")
    .select("*")
    .or(`full_name.ilike.${pattern},nfl_team.ilike.${pattern},position.ilike.${pattern}`)
    .order("sleeper_rank", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
