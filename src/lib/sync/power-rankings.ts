import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeWeeklyAllPlay, type WeekScore } from "@/lib/analytics/all-play";
import { computePowerRankings, type PowerRankingInput } from "@/lib/analytics/power-rankings";

const RECENT_WEEKS = 3;
const UNHEALTHY_STATUSES = new Set(["OUT", "INJURY_RESERVE", "DOUBTFUL"]);

export type PowerRankingsResult = {
  seasonId: number;
  week: number;
  teamCount: number;
};

/**
 * Recomputes power rankings for a season's current week from data already
 * in Supabase (weekly_team_scores, fantasy_teams, team_rosters) — no ESPN
 * call here. Run this after src/lib/sync/league.ts, not instead of it.
 */
export async function computeAndStorePowerRankings(seasonId: number): Promise<PowerRankingsResult | null> {
  const supabase = createAdminClient();

  const { data: season } = await supabase.from("seasons").select("id, current_week").eq("id", seasonId).single();
  if (!season?.current_week) return null;
  const currentWeek = season.current_week as number;

  const { data: teams } = await supabase
    .from("fantasy_teams")
    .select("id, wins, losses, ties, points_for")
    .eq("season_id", seasonId);
  if (!teams || teams.length === 0) return null;

  const { data: weeklyScores } = await supabase
    .from("weekly_team_scores")
    .select("week, fantasy_team_id, points")
    .eq("season_id", seasonId)
    .lte("week", currentWeek);

  const scoresByWeek = new Map<number, WeekScore[]>();
  for (const row of weeklyScores ?? []) {
    const list = scoresByWeek.get(row.week) ?? [];
    list.push({ teamId: row.fantasy_team_id, points: row.points });
    scoresByWeek.set(row.week, list);
  }

  const allPlayByWeek = [...scoresByWeek.entries()].sort(([a], [b]) => a - b).map(([, scores]) => computeWeeklyAllPlay(scores));

  // Season-long all-play win pct per team = total (wins + ties*0.5) / total opponent-games played.
  const seasonAllPlayWinPct = new Map<number, number>();
  const seasonAllPlayGames = new Map<number, number>();
  for (const week of allPlayByWeek) {
    for (const record of week) {
      const games = record.wins + record.losses + record.ties;
      seasonAllPlayWinPct.set(
        record.teamId,
        (seasonAllPlayWinPct.get(record.teamId) ?? 0) + record.wins + record.ties * 0.5
      );
      seasonAllPlayGames.set(record.teamId, (seasonAllPlayGames.get(record.teamId) ?? 0) + games);
    }
  }

  // Recent points: average of the last RECENT_WEEKS played weeks per team.
  const playedWeeks = [...scoresByWeek.keys()].sort((a, b) => b - a).slice(0, RECENT_WEEKS);
  const recentPointsByTeam = new Map<number, number[]>();
  for (const week of playedWeeks) {
    for (const score of scoresByWeek.get(week) ?? []) {
      const list = recentPointsByTeam.get(score.teamId) ?? [];
      list.push(score.points);
      recentPointsByTeam.set(score.teamId, list);
    }
  }

  const { data: rosterRows } = await supabase
    .from("team_rosters")
    .select("fantasy_team_id, is_starter, injury_status")
    .eq("week", currentWeek)
    .in("fantasy_team_id", teams.map((t) => t.id));

  const starterHealthByTeam = new Map<number, { healthy: number; total: number }>();
  for (const row of rosterRows ?? []) {
    if (!row.is_starter) continue;
    const entry = starterHealthByTeam.get(row.fantasy_team_id) ?? { healthy: 0, total: 0 };
    entry.total += 1;
    if (!row.injury_status || !UNHEALTHY_STATUSES.has(row.injury_status)) entry.healthy += 1;
    starterHealthByTeam.set(row.fantasy_team_id, entry);
  }

  const { data: previousRankings } = await supabase
    .from("power_rankings")
    .select("team_id, rank")
    .eq("season_id", seasonId)
    .eq("week", currentWeek - 1);
  const previousRankByTeam = new Map((previousRankings ?? []).map((r) => [r.team_id, r.rank]));

  const inputs: PowerRankingInput[] = teams.map((team) => {
    const games = team.wins + team.losses + team.ties;
    const winPct = games === 0 ? 0 : (team.wins + team.ties * 0.5) / games;

    const allPlayGames = seasonAllPlayGames.get(team.id) ?? 0;
    const allPlayWinPct = allPlayGames === 0 ? 0 : (seasonAllPlayWinPct.get(team.id) ?? 0) / allPlayGames;

    const recentList = recentPointsByTeam.get(team.id) ?? [];
    const recentPointsFor = recentList.length === 0 ? 0 : recentList.reduce((a, b) => a + b, 0) / recentList.length;

    const health = starterHealthByTeam.get(team.id);
    const healthyStarterFraction = health && health.total > 0 ? health.healthy / health.total : 1;

    return {
      teamId: team.id,
      allPlayWinPct,
      pointsFor: team.points_for,
      recentPointsFor,
      winPct,
      healthyStarterFraction,
    };
  });

  const rankings = computePowerRankings(inputs);

  const rows = rankings.map((r) => ({
    season_id: seasonId,
    week: currentWeek,
    team_id: r.teamId,
    rank: r.rank,
    previous_rank: previousRankByTeam.get(r.teamId) ?? null,
    power_score: r.powerScore,
    all_play_score: r.allPlayScore,
    points_score: r.pointsScore,
    recent_score: r.recentScore,
    record_score: r.recordScore,
    roster_score: r.rosterScore,
  }));

  const { error } = await supabase.from("power_rankings").upsert(rows, { onConflict: "season_id,week,team_id" });
  if (error) throw new Error(`power_rankings upsert failed: ${error.message}`);

  return { seasonId, week: currentWeek, teamCount: rows.length };
}
