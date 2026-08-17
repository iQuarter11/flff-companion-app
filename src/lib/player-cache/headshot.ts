/**
 * ESPN headshot is preferred (higher resolution, used elsewhere in the
 * app), but Sleeper hosts headshots by Sleeper ID directly — no identity
 * mapping required — so it's a solid fallback whenever a player has a
 * Sleeper ID but no ESPN mapping/headshot. Only when neither is available
 * does the UI fall back to the generic silhouette (see PlayerHeadshot).
 */
export function resolveHeadshotUrl(player: { headshot_url: string | null; sleeper_id: string | null }): string | null {
  if (player.headshot_url) return player.headshot_url;
  if (player.sleeper_id) return `https://sleepercdn.com/content/nfl/players/${player.sleeper_id}.jpg`;
  return null;
}

/** For a bare Sleeper ID with no player_identity_cache row at all (see the Trending page). */
export function sleeperHeadshotUrl(sleeperId: string): string {
  return `https://sleepercdn.com/content/nfl/players/${sleeperId}.jpg`;
}
