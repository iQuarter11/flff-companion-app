import { createClient } from "@/lib/supabase/server";
import { computeWeeklyAllPlay, type WeekScore } from "@/lib/analytics/all-play";
import { computeSeasonLuck, type SeasonLuck } from "@/lib/analytics/luck";

export type CurrentSeason = {
  id: number;
  leagueId: number;
  seasonYear: number;
  currentWeek: number | null;
};

/**
 * Read-query layer over the tables src/lib/sync/league.ts writes.
 * Separate from espn/ (raw fetch + normalize) and sync/ (writes) — pages
 * and other read paths (Trending, Search, Watchlist, team profiles) should
 * come through here rather than querying these tables ad hoc, so the
 * "what counts as the current season/roster" logic lives in one place.
 */
export async function getCurrentSeason(): Promise<CurrentSeason | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("id, league_id, season_year, current_week")
    .eq("is_current", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    leagueId: data.league_id,
    seasonYear: data.season_year,
    currentWeek: data.current_week,
  };
}

export type RosterOwner = {
  fantasyTeamId: number;
  teamName: string;
};

/**
 * For a set of ESPN player IDs, returns which are currently on a roster in
 * this league (current season, current week) and which team owns them.
 * Players not present in the returned map are free agents (or unknown).
 */
export async function getRosterOwnership(espnPlayerIds: number[]): Promise<Map<number, RosterOwner>> {
  const ownership = new Map<number, RosterOwner>();
  if (espnPlayerIds.length === 0) return ownership;

  const season = await getCurrentSeason();
  if (!season || season.currentWeek === null) return ownership;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_rosters")
    .select("espn_player_id, fantasy_teams!inner(id, name, season_id)")
    .eq("week", season.currentWeek)
    .eq("fantasy_teams.season_id", season.id)
    .in("espn_player_id", espnPlayerIds);

  if (error || !data) return ownership;

  for (const row of data as unknown as { espn_player_id: number; fantasy_teams: { id: number; name: string } }[]) {
    ownership.set(row.espn_player_id, { fantasyTeamId: row.fantasy_teams.id, teamName: row.fantasy_teams.name });
  }

  return ownership;
}

export type MyFantasyTeam = {
  id: number;
  espnTeamId: number;
  name: string;
};

/**
 * The signed-in user's fantasy team, derived from profiles.espn_team_id —
 * never from a client-supplied team id. Returns null if the profile has no
 * espn_team_id set yet, or it doesn't match any team in the current
 * season.
 */
export async function getMyFantasyTeam(): Promise<MyFantasyTeam | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("espn_team_id").eq("id", user.id).maybeSingle();
  if (!profile?.espn_team_id) return null;

  const season = await getCurrentSeason();
  if (!season) return null;

  const { data: team } = await supabase
    .from("fantasy_teams")
    .select("id, espn_team_id, name")
    .eq("season_id", season.id)
    .eq("espn_team_id", profile.espn_team_id)
    .maybeSingle();

  if (!team) return null;
  return { id: team.id, espnTeamId: team.espn_team_id, name: team.name };
}

export type TradeableRosterPlayer = {
  espnPlayerId: number;
  playerIdentityCacheId: number | null;
  fullName: string;
  position: string | null;
  nflTeam: string | null;
  lineupSlot: string;
  isStarter: boolean;
};

/**
 * A team's current roster, for the Trade Block page. playerIdentityCacheId
 * is null for players outside the identity cache's top-1000 union (deep
 * bench/IDP) — those can't be put on the trade block, since trade_block.
 * player_id is a hard FK to player_identity_cache. The UI should disable
 * the button rather than hide the player entirely.
 */
export async function getTeamRosterForTrade(fantasyTeamId: number): Promise<TradeableRosterPlayer[]> {
  const season = await getCurrentSeason();
  if (!season || season.currentWeek === null) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("team_rosters")
    .select("espn_player_id, player_identity_cache_id, full_name, position, nfl_team, lineup_slot, is_starter")
    .eq("fantasy_team_id", fantasyTeamId)
    .eq("week", season.currentWeek)
    .order("is_starter", { ascending: false });

  return (data ?? []).map((r) => ({
    espnPlayerId: r.espn_player_id,
    playerIdentityCacheId: r.player_identity_cache_id,
    fullName: r.full_name,
    position: r.position,
    nflTeam: r.nfl_team,
    lineupSlot: r.lineup_slot,
    isStarter: r.is_starter,
  }));
}

export type TradeBlockEntry = {
  id: number;
  teamId: number;
  teamName: string;
  playerId: number;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  headshotUrl: string | null;
  addedBy: string;
};

export async function getTradeBlock(): Promise<TradeBlockEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("trade_block")
    .select(
      "id, added_by, fantasy_teams(id, name), player_identity_cache(id, full_name, position, nfl_team, headshot_url)"
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: number;
    added_by: string;
    fantasy_teams: { id: number; name: string };
    player_identity_cache: { id: number; full_name: string | null; position: string | null; nfl_team: string | null; headshot_url: string | null };
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    teamId: row.fantasy_teams.id,
    teamName: row.fantasy_teams.name,
    playerId: row.player_identity_cache.id,
    playerName: row.player_identity_cache.full_name ?? "Unknown player",
    position: row.player_identity_cache.position,
    nflTeam: row.player_identity_cache.nfl_team,
    headshotUrl: row.player_identity_cache.headshot_url,
    addedBy: row.added_by,
  }));
}

export type TeamPowerRanking = {
  teamId: number;
  teamName: string;
  rank: number;
  previousRank: number | null;
  powerScore: number;
  allPlayScore: number;
  pointsScore: number;
  recentScore: number;
  recordScore: number;
  rosterScore: number;
};

/** Latest computed power rankings for the current season/week. See src/lib/sync/power-rankings.ts. */
export async function getLatestPowerRankings(): Promise<TeamPowerRanking[]> {
  const season = await getCurrentSeason();
  if (!season || season.currentWeek === null) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("power_rankings")
    .select("rank, previous_rank, power_score, all_play_score, points_score, recent_score, record_score, roster_score, fantasy_teams(id, name)")
    .eq("season_id", season.id)
    .eq("week", season.currentWeek)
    .order("rank", { ascending: true });

  type Row = {
    rank: number;
    previous_rank: number | null;
    power_score: number;
    all_play_score: number;
    points_score: number;
    recent_score: number;
    record_score: number;
    roster_score: number;
    fantasy_teams: { id: number; name: string };
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    teamId: row.fantasy_teams.id,
    teamName: row.fantasy_teams.name,
    rank: row.rank,
    previousRank: row.previous_rank,
    powerScore: row.power_score,
    allPlayScore: row.all_play_score,
    pointsScore: row.points_score,
    recentScore: row.recent_score,
    recordScore: row.record_score,
    rosterScore: row.roster_score,
  }));
}

export type TeamLuck = SeasonLuck & { teamName: string };

/**
 * Computed live from weekly_team_scores + fantasy_teams.wins — there's no
 * dedicated luck table (see docs/analytics.md): the stored weekly scores
 * already are "sufficient weekly data" per the spec, so recomputing here
 * avoids a second, easy-to-desync source of truth.
 */
export async function getSeasonLuck(): Promise<TeamLuck[]> {
  const season = await getCurrentSeason();
  if (!season) return [];

  const supabase = await createClient();
  const [{ data: teams }, { data: weeklyScores }] = await Promise.all([
    supabase.from("fantasy_teams").select("id, name, wins, ties").eq("season_id", season.id),
    supabase.from("weekly_team_scores").select("week, fantasy_team_id, points").eq("season_id", season.id),
  ]);

  if (!teams || teams.length === 0) return [];

  const scoresByWeek = new Map<number, WeekScore[]>();
  for (const row of weeklyScores ?? []) {
    const list = scoresByWeek.get(row.week) ?? [];
    list.push({ teamId: row.fantasy_team_id, points: row.points });
    scoresByWeek.set(row.week, list);
  }

  const weeklyAllPlay = [...scoresByWeek.values()].map((scores) => computeWeeklyAllPlay(scores));
  const actualWinsByTeam = new Map(teams.map((t) => [t.id, t.wins + t.ties * 0.5]));

  const luck = computeSeasonLuck(actualWinsByTeam, weeklyAllPlay);
  const nameByTeam = new Map(teams.map((t) => [t.id, t.name]));

  return luck
    .map((l) => ({ ...l, teamName: nameByTeam.get(l.teamId) ?? `Team ${l.teamId}` }))
    .sort((a, b) => b.luckDifferential - a.luckDifferential);
}

export type StandingRow = {
  teamId: number;
  teamName: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  streakType: string;
  streakLength: number;
};

export async function getStandings(): Promise<StandingRow[]> {
  const season = await getCurrentSeason();
  if (!season) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("fantasy_teams")
    .select("id, name, wins, losses, ties, points_for, points_against, streak_type, streak_length")
    .eq("season_id", season.id);

  const withPct = (data ?? []).map((t) => {
    const games = t.wins + t.losses + t.ties;
    return { ...t, pct: games === 0 ? 0 : (t.wins + t.ties * 0.5) / games };
  });
  withPct.sort((a, b) => b.pct - a.pct || b.points_for - a.points_for);

  return withPct.map((t, i) => ({
    teamId: t.id,
    teamName: t.name,
    rank: i + 1,
    wins: t.wins,
    losses: t.losses,
    ties: t.ties,
    pointsFor: t.points_for,
    pointsAgainst: t.points_against,
    streakType: t.streak_type,
    streakLength: t.streak_length,
  }));
}

export type WeekMatchup = {
  espnMatchupId: number;
  week: number;
  isPlayoff: boolean;
  homeTeamName: string;
  awayTeamName: string | null;
  homeScore: number;
  awayScore: number | null;
  result: string;
};

export async function getMatchupsForWeek(week?: number): Promise<WeekMatchup[]> {
  const season = await getCurrentSeason();
  if (!season) return [];
  const targetWeek = week ?? season.currentWeek;
  if (targetWeek === null) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("matchups")
    .select("espn_matchup_id, week, is_playoff, home_score, away_score, result, home:fantasy_teams!matchups_home_team_id_fkey(name), away:fantasy_teams!matchups_away_team_id_fkey(name)")
    .eq("season_id", season.id)
    .eq("week", targetWeek);

  type Row = {
    espn_matchup_id: number;
    week: number;
    is_playoff: boolean;
    home_score: number;
    away_score: number | null;
    result: string;
    home: { name: string } | null;
    away: { name: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    espnMatchupId: row.espn_matchup_id,
    week: row.week,
    isPlayoff: row.is_playoff,
    homeTeamName: row.home?.name ?? "Unknown",
    awayTeamName: row.away?.name ?? null,
    homeScore: row.home_score,
    awayScore: row.away_score,
    result: row.result,
  }));
}

export type TeamProfile = {
  fantasyTeamId: number;
  espnTeamId: number;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  roster: TradeableRosterPlayer[];
  tradeBlockPlayerIds: Set<number>;
  recentMatchups: { week: number; opponentName: string | null; teamScore: number; opponentScore: number | null; result: string }[];
};

export async function getTeamProfile(espnTeamId: number): Promise<TeamProfile | null> {
  const season = await getCurrentSeason();
  if (!season) return null;

  const supabase = await createClient();
  const { data: team } = await supabase
    .from("fantasy_teams")
    .select("id, espn_team_id, name, wins, losses, ties, points_for, points_against")
    .eq("season_id", season.id)
    .eq("espn_team_id", espnTeamId)
    .maybeSingle();

  if (!team) return null;

  const [roster, tradeBlock, matchupsData] = await Promise.all([
    getTeamRosterForTrade(team.id),
    supabase.from("trade_block").select("player_id").eq("team_id", team.id),
    supabase
      .from("matchups")
      .select("week, home_team_id, away_team_id, home_score, away_score, result, home:fantasy_teams!matchups_home_team_id_fkey(name), away:fantasy_teams!matchups_away_team_id_fkey(name)")
      .eq("season_id", season.id)
      .neq("result", "UNDECIDED")
      .order("week", { ascending: false })
      .limit(5),
  ]);

  type MatchupRow = {
    week: number;
    home_team_id: number;
    away_team_id: number | null;
    home_score: number;
    away_score: number | null;
    result: string;
    home: { name: string } | null;
    away: { name: string } | null;
  };

  const recentMatchups = ((matchupsData.data ?? []) as unknown as MatchupRow[])
    .filter((m) => m.home_team_id === team.id || m.away_team_id === team.id)
    .map((m) => {
      const isHome = m.home_team_id === team.id;
      return {
        week: m.week,
        opponentName: (isHome ? m.away?.name : m.home?.name) ?? null,
        teamScore: isHome ? m.home_score : (m.away_score ?? 0),
        opponentScore: isHome ? m.away_score : m.home_score,
        result: m.result,
      };
    });

  return {
    fantasyTeamId: team.id,
    espnTeamId: team.espn_team_id,
    name: team.name,
    wins: team.wins,
    losses: team.losses,
    ties: team.ties,
    pointsFor: team.points_for,
    pointsAgainst: team.points_against,
    roster,
    tradeBlockPlayerIds: new Set((tradeBlock.data ?? []).map((r) => r.player_id as number)),
    recentMatchups,
  };
}

export type StoredRecap = {
  week: number;
  createdAt: string;
  payload: import("@/lib/analytics/recap").WeeklyRecap;
};

/** The most recently generated recap, or a specific week if provided. */
export async function getRecap(week?: number): Promise<StoredRecap | null> {
  const season = await getCurrentSeason();
  if (!season) return null;

  const supabase = await createClient();
  let query = supabase.from("weekly_recaps").select("week, created_at, payload").eq("season_id", season.id);
  query = week ? query.eq("week", week) : query.order("week", { ascending: false });

  const { data } = await query.limit(1).maybeSingle();
  if (!data) return null;

  return { week: data.week, createdAt: data.created_at, payload: data.payload };
}

export type ClaimableTeam = {
  espnTeamId: number;
  name: string;
  claimedByDisplayName: string | null; // null = unclaimed or claimed by the current user
};

/**
 * Every team in the current season, annotated with whether another user
 * has already claimed it (profiles.espn_team_id). Used to render a real
 * team picker on /profile instead of a raw numeric ID field — a team
 * claimed by someone else shows who and is disabled, not just hidden, so
 * it's clear why it's unavailable.
 */
export async function getClaimableTeams(currentUserId: string): Promise<ClaimableTeam[]> {
  const season = await getCurrentSeason();
  if (!season) return [];

  const supabase = await createClient();
  const [{ data: teams }, { data: claims }] = await Promise.all([
    supabase.from("fantasy_teams").select("espn_team_id, name").eq("season_id", season.id).order("name", { ascending: true }),
    supabase.from("profiles").select("espn_team_id, display_name, username").not("espn_team_id", "is", null).neq("id", currentUserId),
  ]);

  const claimByTeamId = new Map(
    (claims ?? []).map((c) => [c.espn_team_id as number, c.display_name ?? c.username ?? "another member"])
  );

  return (teams ?? []).map((t) => ({
    espnTeamId: t.espn_team_id,
    name: t.name,
    claimedByDisplayName: claimByTeamId.get(t.espn_team_id) ?? null,
  }));
}

export async function getWatchlistedPlayerIds(): Promise<Set<number>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase.from("watchlist").select("player_id").eq("user_id", user.id);
  return new Set((data ?? []).map((row) => row.player_id as number));
}
