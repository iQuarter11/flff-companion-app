import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateWeeklyRecap, type RecapMatchupInput, type RecapRankInput, type WeeklyRecap } from "@/lib/analytics/recap";

/**
 * Fetches everything generateWeeklyRecap() needs for one week and stores
 * the result. Generation itself is deterministic and pure (no LLM) per
 * the spec — see docs/analytics.md for what could plug in later.
 */
export async function generateAndStoreRecap(seasonId: number, week: number): Promise<WeeklyRecap> {
  const supabase = createAdminClient();

  const { data: matchupRows } = await supabase
    .from("matchups")
    .select(
      "home_team_id, away_team_id, home_score, away_score, result, home:fantasy_teams!matchups_home_team_id_fkey(id,name), away:fantasy_teams!matchups_away_team_id_fkey(id,name)"
    )
    .eq("season_id", seasonId)
    .eq("week", week)
    .neq("result", "UNDECIDED");

  type MatchupRow = {
    home_team_id: number;
    away_team_id: number | null;
    home_score: number;
    away_score: number | null;
    home: { id: number; name: string } | null;
    away: { id: number; name: string } | null;
  };

  const matchups: RecapMatchupInput[] = ((matchupRows ?? []) as unknown as MatchupRow[])
    .filter((m) => m.away_team_id !== null && m.away_score !== null && m.home && m.away)
    .map((m) => ({
      homeTeamId: m.home_team_id,
      homeTeamName: m.home!.name,
      awayTeamId: m.away_team_id as number,
      awayTeamName: m.away!.name,
      homeScore: m.home_score,
      awayScore: m.away_score as number,
    }));

  const { data: powerRows } = await supabase
    .from("power_rankings")
    .select("team_id, rank, previous_rank, fantasy_teams(name)")
    .eq("season_id", seasonId)
    .eq("week", week);

  type PowerRow = { team_id: number; rank: number; previous_rank: number | null; fantasy_teams: { name: string } | null };
  const powerRankings: RecapRankInput[] = ((powerRows ?? []) as unknown as PowerRow[]).map((r) => ({
    teamId: r.team_id,
    teamName: r.fantasy_teams?.name ?? `Team ${r.team_id}`,
    rank: r.rank,
    previousRank: r.previous_rank,
  }));

  const [{ data: currentSnap }, { data: prevSnap }] = await Promise.all([
    supabase.from("standings_snapshots").select("fantasy_team_id, rank, fantasy_teams(name)").eq("season_id", seasonId).eq("week", week),
    supabase.from("standings_snapshots").select("fantasy_team_id, rank").eq("season_id", seasonId).eq("week", week - 1),
  ]);

  type SnapRow = { fantasy_team_id: number; rank: number; fantasy_teams: { name: string } | null };
  const prevRankByTeam = new Map((prevSnap ?? []).map((s) => [s.fantasy_team_id, s.rank as number]));
  const standings: RecapRankInput[] = ((currentSnap ?? []) as unknown as SnapRow[]).map((s) => ({
    teamId: s.fantasy_team_id,
    teamName: s.fantasy_teams?.name ?? `Team ${s.fantasy_team_id}`,
    rank: s.rank,
    previousRank: prevRankByTeam.get(s.fantasy_team_id) ?? null,
  }));

  const recap = generateWeeklyRecap(week, matchups, powerRankings, standings);

  const { error } = await supabase
    .from("weekly_recaps")
    .upsert({ season_id: seasonId, week, payload: recap }, { onConflict: "season_id,week" });
  if (error) throw new Error(`weekly_recaps upsert failed: ${error.message}`);

  return recap;
}
