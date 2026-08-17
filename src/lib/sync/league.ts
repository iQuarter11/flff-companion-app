import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNormalizedLeague } from "@/lib/espn/normalize";
import { getPlayersByEspnIds } from "@/lib/player-cache/queries";
import type { NormalizedLeague } from "@/types/league";

export type SyncResult = {
  syncRunId: number;
  season: number;
  seasonId: number;
  teamCount: number;
  matchupCount: number;
  rosterPlayerCount: number;
};

/**
 * Fetches this league's current ESPN data and upserts it into the
 * normalized tables from 0003_league_data.sql. Idempotent — safe to re-run
 * (e.g. from a cron-triggered route or the debug page's "Sync now" button).
 *
 * Uses the service-role client because these tables are read-only to
 * regular users via RLS; only this trusted server-side job writes to them.
 */
export async function runLeagueSync(season: number, options?: { isCurrent?: boolean }): Promise<SyncResult> {
  const isCurrent = options?.isCurrent ?? true;
  const supabase = createAdminClient();

  const { data: syncRun, error: syncRunError } = await supabase
    .from("sync_runs")
    .insert({ sync_type: isCurrent ? "espn_league" : "espn_league_historical", status: "running" })
    .select("id")
    .single();

  if (syncRunError || !syncRun) {
    throw new Error(`Failed to create sync_runs row: ${syncRunError?.message}`);
  }

  try {
    const league = await getNormalizedLeague(season);
    const result = await writeLeagueToDatabase(supabase, league, isCurrent);

    await supabase
      .from("sync_runs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        meta: {
          season: league.season,
          teams: result.teamCount,
          matchups: result.matchupCount,
          rosterPlayers: result.rosterPlayerCount,
        },
      })
      .eq("id", syncRun.id);

    return { syncRunId: syncRun.id, season: league.season, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await supabase
      .from("sync_runs")
      .update({ status: "error", finished_at: new Date().toISOString(), error: message })
      .eq("id", syncRun.id);
    throw error;
  }
}

async function writeLeagueToDatabase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  league: NormalizedLeague,
  isCurrent: boolean
) {
  const { data: leagueRow, error: leagueError } = await supabase
    .from("leagues")
    .upsert({ espn_league_id: league.espnLeagueId, name: league.settings.name }, { onConflict: "espn_league_id" })
    .select("id")
    .single();
  if (leagueError) throw new Error(`leagues upsert failed: ${leagueError.message}`);
  const leagueId = leagueRow.id;

  // Only one season per league is "current" at a time.
  if (isCurrent) {
    await supabase.from("seasons").update({ is_current: false }).eq("league_id", leagueId);
  }

  const { data: seasonRow, error: seasonError } = await supabase
    .from("seasons")
    .upsert(
      {
        league_id: leagueId,
        season_year: league.season,
        current_week: league.currentWeek,
        is_current: isCurrent,
        regular_season_matchup_count: league.settings.regularSeasonMatchupCount,
        playoff_team_count: league.settings.playoffTeamCount,
      },
      { onConflict: "league_id,season_year" }
    )
    .select("id")
    .single();
  if (seasonError) throw new Error(`seasons upsert failed: ${seasonError.message}`);
  const seasonId = seasonRow.id;

  const teamRows = league.teams.map((team) => ({
    season_id: seasonId,
    espn_team_id: team.espnTeamId,
    name: team.name,
    abbrev: team.abbrev,
    logo_url: team.logoUrl,
    division_id: team.divisionId,
    primary_owner_espn_member_id: team.primaryOwnerEspnMemberId,
    owner_espn_member_ids: team.ownerEspnMemberIds,
    wins: team.record.wins,
    losses: team.record.losses,
    ties: team.record.ties,
    points_for: team.record.pointsFor,
    points_against: team.record.pointsAgainst,
    streak_type: team.record.streakType,
    streak_length: team.record.streakLength,
    playoff_seed: team.playoffSeed,
    final_rank: team.finalRank,
  }));

  const { data: upsertedTeams, error: teamsError } = await supabase
    .from("fantasy_teams")
    .upsert(teamRows, { onConflict: "season_id,espn_team_id" })
    .select("id, espn_team_id");
  if (teamsError) throw new Error(`fantasy_teams upsert failed: ${teamsError.message}`);

  const teamIdByEspnId = new Map<number, number>(
    (upsertedTeams as { id: number; espn_team_id: number }[]).map((t) => [t.espn_team_id, t.id])
  );

  const rosterPlayerCount = await writeRosters(supabase, league, teamIdByEspnId);
  await writeMatchups(supabase, league, seasonId, teamIdByEspnId);
  await writeWeeklyScoresAndStandings(supabase, league, seasonId, teamIdByEspnId);

  return { seasonId, teamCount: teamRows.length, matchupCount: league.matchups.length, rosterPlayerCount };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeRosters(supabase: any, league: NormalizedLeague, teamIdByEspnId: Map<number, number>) {
  const allEspnPlayerIds = league.rosters.flatMap((r) => r.players.map((p) => p.espnPlayerId));
  const identities = await getPlayersByEspnIds(allEspnPlayerIds);
  const identityIdByEspnId = new Map(identities.filter((i) => i.espn_id !== null).map((i) => [i.espn_id as number, i.id]));

  const rosterRows = league.rosters.flatMap((roster) => {
    const fantasyTeamId = teamIdByEspnId.get(roster.espnTeamId);
    if (!fantasyTeamId) return [];

    return roster.players.map((player) => ({
      fantasy_team_id: fantasyTeamId,
      week: league.currentWeek,
      espn_player_id: player.espnPlayerId,
      player_identity_cache_id: identityIdByEspnId.get(player.espnPlayerId) ?? null,
      full_name: player.fullName,
      position: player.position,
      nfl_team: player.nflTeam,
      lineup_slot: player.lineupSlot,
      is_starter: player.isStarter,
      injury_status: player.injuryStatus,
    }));
  });

  if (rosterRows.length === 0) return 0;

  const { error } = await supabase
    .from("team_rosters")
    .upsert(rosterRows, { onConflict: "fantasy_team_id,week,espn_player_id" });
  if (error) throw new Error(`team_rosters upsert failed: ${error.message}`);

  return rosterRows.length;
}

async function writeMatchups(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  league: NormalizedLeague,
  seasonId: number,
  teamIdByEspnId: Map<number, number>
) {
  const matchupRows = league.matchups.flatMap((matchup) => {
    const homeTeamId = teamIdByEspnId.get(matchup.homeTeamId);
    if (!homeTeamId) return [];
    const awayTeamId = matchup.awayTeamId ? (teamIdByEspnId.get(matchup.awayTeamId) ?? null) : null;

    return [
      {
        season_id: seasonId,
        espn_matchup_id: matchup.espnMatchupId,
        week: matchup.week,
        is_playoff: matchup.isPlayoff,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: matchup.homeScore,
        away_score: matchup.awayScore,
        result: matchup.result,
      },
    ];
  });

  if (matchupRows.length === 0) return;

  const { error } = await supabase.from("matchups").upsert(matchupRows, { onConflict: "season_id,espn_matchup_id" });
  if (error) throw new Error(`matchups upsert failed: ${error.message}`);
}

async function writeWeeklyScoresAndStandings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  league: NormalizedLeague,
  seasonId: number,
  teamIdByEspnId: Map<number, number>
) {
  const playedMatchups = league.matchups.filter((m) => m.result !== "UNDECIDED");

  const scoreRows = playedMatchups.flatMap((matchup) => {
    const rows: { season_id: number; week: number; fantasy_team_id: number; points: number }[] = [];
    const homeTeamId = teamIdByEspnId.get(matchup.homeTeamId);
    if (homeTeamId) rows.push({ season_id: seasonId, week: matchup.week, fantasy_team_id: homeTeamId, points: matchup.homeScore });

    const awayTeamId = matchup.awayTeamId ? teamIdByEspnId.get(matchup.awayTeamId) : undefined;
    if (awayTeamId && matchup.awayScore !== null) {
      rows.push({ season_id: seasonId, week: matchup.week, fantasy_team_id: awayTeamId, points: matchup.awayScore });
    }
    return rows;
  });

  if (scoreRows.length > 0) {
    const { error } = await supabase
      .from("weekly_team_scores")
      .upsert(scoreRows, { onConflict: "season_id,week,fantasy_team_id" });
    if (error) throw new Error(`weekly_team_scores upsert failed: ${error.message}`);
  }

  // Current standings snapshot, tagged with the league's current week.
  const standingsRows = league.standings.flatMap((standing) => {
    const fantasyTeamId = teamIdByEspnId.get(standing.espnTeamId);
    if (!fantasyTeamId) return [];
    return [
      {
        season_id: seasonId,
        week: league.currentWeek,
        fantasy_team_id: fantasyTeamId,
        rank: standing.rank,
        wins: standing.wins,
        losses: standing.losses,
        ties: standing.ties,
        points_for: standing.pointsFor,
        points_against: standing.pointsAgainst,
      },
    ];
  });

  if (standingsRows.length > 0) {
    const { error } = await supabase
      .from("standings_snapshots")
      .upsert(standingsRows, { onConflict: "season_id,week,fantasy_team_id" });
    if (error) throw new Error(`standings_snapshots upsert failed: ${error.message}`);
  }
}
