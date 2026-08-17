import { createClient } from "@/lib/supabase/server";

type SeasonRow = { id: number; season_year: number; playoff_team_count: number | null; is_current: boolean };
type TeamRow = {
  id: number;
  season_id: number;
  espn_team_id: number;
  name: string;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  playoff_seed: number | null;
  final_rank: number | null;
};
type MatchupRow = {
  season_id: number;
  week: number;
  is_playoff: boolean;
  home_team_id: number;
  away_team_id: number | null;
  home_score: number;
  away_score: number | null;
  result: string;
};
type WeeklyScoreRow = { season_id: number; week: number; fantasy_team_id: number; points: number };

async function loadHistoryData() {
  const supabase = await createClient();
  const [{ data: seasons }, { data: teams }, { data: matchups }, { data: weeklyScores }] = await Promise.all([
    supabase.from("seasons").select("id, season_year, playoff_team_count, is_current").order("season_year", { ascending: true }),
    supabase
      .from("fantasy_teams")
      .select("id, season_id, espn_team_id, name, wins, losses, ties, points_for, points_against, playoff_seed, final_rank"),
    supabase
      .from("matchups")
      .select("season_id, week, is_playoff, home_team_id, away_team_id, home_score, away_score, result"),
    supabase.from("weekly_team_scores").select("season_id, week, fantasy_team_id, points"),
  ]);

  return {
    seasons: (seasons ?? []) as SeasonRow[],
    teams: (teams ?? []) as TeamRow[],
    matchups: (matchups ?? []) as MatchupRow[],
    weeklyScores: (weeklyScores ?? []) as WeeklyScoreRow[],
  };
}

/** Groups a team's rows across seasons by its stable ESPN team id, for franchise-level aggregates (championships, playoff appearances). */
function franchiseKey(team: TeamRow) {
  return team.espn_team_id;
}

export type Champion = {
  seasonYear: number;
  teamName: string;
  espnTeamId: number;
  wins: number;
  losses: number;
  pointsFor: number;
};

export async function getChampions(): Promise<Champion[]> {
  const { seasons, teams } = await loadHistoryData();
  const seasonById = new Map(seasons.map((s) => [s.id, s]));

  return teams
    .filter((t) => t.final_rank === 1)
    .map((t) => {
      const season = seasonById.get(t.season_id);
      return {
        seasonYear: season?.season_year ?? 0,
        teamName: t.name,
        espnTeamId: t.espn_team_id,
        wins: t.wins,
        losses: t.losses,
        pointsFor: t.points_for,
      };
    })
    .sort((a, b) => b.seasonYear - a.seasonYear);
}

export type SeasonSummary = {
  seasonYear: number;
  isCurrent: boolean;
  teamCount: number;
  champion: string | null;
};

export async function getSeasons(): Promise<SeasonSummary[]> {
  const { seasons, teams } = await loadHistoryData();

  return seasons
    .map((season) => {
      const seasonTeams = teams.filter((t) => t.season_id === season.id);
      const champion = seasonTeams.find((t) => t.final_rank === 1);
      return {
        seasonYear: season.season_year,
        isCurrent: season.is_current,
        teamCount: seasonTeams.length,
        champion: champion?.name ?? null,
      };
    })
    .sort((a, b) => b.seasonYear - a.seasonYear);
}

export type RecordEntry = {
  label: string;
  value: string;
  team: string;
  opponent?: string;
  season: number;
  week?: number;
};

export async function getLeagueRecords(): Promise<RecordEntry[]> {
  const { seasons, teams, matchups, weeklyScores } = await loadHistoryData();
  const seasonById = new Map(seasons.map((s) => [s.id, s]));
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const records: RecordEntry[] = [];

  const teamLabel = (teamId: number) => teamById.get(teamId)?.name ?? `Team ${teamId}`;
  const seasonYear = (seasonId: number) => seasonById.get(seasonId)?.season_year ?? 0;

  // Highest / lowest single-week score.
  if (weeklyScores.length > 0) {
    const highest = weeklyScores.reduce((a, b) => (b.points > a.points ? b : a));
    const lowest = weeklyScores.reduce((a, b) => (b.points < a.points ? b : a));
    records.push({
      label: "Highest single-week score",
      value: highest.points.toFixed(1),
      team: teamLabel(highest.fantasy_team_id),
      season: seasonYear(highest.season_id),
      week: highest.week,
    });
    records.push({
      label: "Lowest single-week score",
      value: lowest.points.toFixed(1),
      team: teamLabel(lowest.fantasy_team_id),
      season: seasonYear(lowest.season_id),
      week: lowest.week,
    });
  }

  // Margin of victory / closest game / highest & lowest scoring matchups (decided games only).
  const decided = matchups.filter((m) => m.away_team_id !== null && m.away_score !== null && m.result !== "UNDECIDED");
  if (decided.length > 0) {
    const withMargin = decided.map((m) => ({ ...m, margin: Math.abs(m.home_score - (m.away_score as number)), total: m.home_score + (m.away_score as number) }));

    const biggest = withMargin.reduce((a, b) => (b.margin > a.margin ? b : a));
    records.push({
      label: "Largest margin of victory",
      value: biggest.margin.toFixed(1),
      team: teamLabel(biggest.home_score >= (biggest.away_score as number) ? biggest.home_team_id : (biggest.away_team_id as number)),
      opponent: teamLabel(biggest.home_score >= (biggest.away_score as number) ? (biggest.away_team_id as number) : biggest.home_team_id),
      season: seasonYear(biggest.season_id),
      week: biggest.week,
    });

    const closest = withMargin.reduce((a, b) => (b.margin < a.margin ? b : a));
    records.push({
      label: "Closest matchup",
      value: closest.margin.toFixed(1),
      team: teamLabel(closest.home_team_id),
      opponent: teamLabel(closest.away_team_id as number),
      season: seasonYear(closest.season_id),
      week: closest.week,
    });

    const highestScoring = withMargin.reduce((a, b) => (b.total > a.total ? b : a));
    records.push({
      label: "Highest-scoring matchup",
      value: highestScoring.total.toFixed(1),
      team: teamLabel(highestScoring.home_team_id),
      opponent: teamLabel(highestScoring.away_team_id as number),
      season: seasonYear(highestScoring.season_id),
      week: highestScoring.week,
    });

    const lowestScoring = withMargin.reduce((a, b) => (b.total < a.total ? b : a));
    records.push({
      label: "Lowest-scoring matchup",
      value: lowestScoring.total.toFixed(1),
      team: teamLabel(lowestScoring.home_team_id),
      opponent: teamLabel(lowestScoring.away_team_id as number),
      season: seasonYear(lowestScoring.season_id),
      week: lowestScoring.week,
    });
  }

  // Most / fewest points in a season, best / worst regular-season record.
  if (teams.length > 0) {
    const mostPoints = teams.reduce((a, b) => (b.points_for > a.points_for ? b : a));
    records.push({ label: "Most points in a season", value: mostPoints.points_for.toFixed(1), team: mostPoints.name, season: seasonYear(mostPoints.season_id) });

    const fewestPoints = teams.reduce((a, b) => (b.points_for < a.points_for ? b : a));
    records.push({ label: "Fewest points in a season", value: fewestPoints.points_for.toFixed(1), team: fewestPoints.name, season: seasonYear(fewestPoints.season_id) });

    const withPct = teams.map((t) => {
      const games = t.wins + t.losses + t.ties;
      return { ...t, pct: games === 0 ? 0 : (t.wins + t.ties * 0.5) / games };
    });
    const best = withPct.reduce((a, b) => (b.pct > a.pct ? b : a));
    records.push({ label: "Best regular-season record", value: `${best.wins}-${best.losses}${best.ties ? `-${best.ties}` : ""}`, team: best.name, season: seasonYear(best.season_id) });

    const worst = withPct.reduce((a, b) => (b.pct < a.pct ? b : a));
    records.push({ label: "Worst regular-season record", value: `${worst.wins}-${worst.losses}${worst.ties ? `-${worst.ties}` : ""}`, team: worst.name, season: seasonYear(worst.season_id) });
  }

  // Most championships / most playoff appearances (franchise-level, grouped by stable espn_team_id).
  const championsByFranchise = new Map<number, number>();
  for (const t of teams) {
    if (t.final_rank === 1) championsByFranchise.set(franchiseKey(t), (championsByFranchise.get(franchiseKey(t)) ?? 0) + 1);
  }
  const playoffAppearancesByFranchise = new Map<number, number>();
  for (const t of teams) {
    const season = seasonById.get(t.season_id);
    if (t.playoff_seed && season?.playoff_team_count && t.playoff_seed <= season.playoff_team_count) {
      playoffAppearancesByFranchise.set(franchiseKey(t), (playoffAppearancesByFranchise.get(franchiseKey(t)) ?? 0) + 1);
    }
  }
  const latestNameByFranchise = new Map<number, string>();
  for (const t of [...teams].sort((a, b) => seasonYear(a.season_id) - seasonYear(b.season_id))) {
    latestNameByFranchise.set(franchiseKey(t), t.name);
  }

  if (championsByFranchise.size > 0) {
    const [franchiseId, count] = [...championsByFranchise.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    records.push({ label: "Most championships", value: String(count), team: latestNameByFranchise.get(franchiseId) ?? "Unknown", season: 0 });
  }
  if (playoffAppearancesByFranchise.size > 0) {
    const [franchiseId, count] = [...playoffAppearancesByFranchise.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    records.push({ label: "Most playoff appearances", value: String(count), team: latestNameByFranchise.get(franchiseId) ?? "Unknown", season: 0 });
  }

  return records;
}

export type FranchiseOption = { espnTeamId: number; name: string };

/** One entry per stable ESPN team id, using its most recent season's name — for the rivalry team-selector. */
export async function getAllFranchises(): Promise<FranchiseOption[]> {
  const { teams } = await loadHistoryData();
  const latestByFranchise = new Map<number, TeamRow>();
  for (const t of teams) {
    const existing = latestByFranchise.get(t.espn_team_id);
    if (!existing || t.season_id > existing.season_id) latestByFranchise.set(t.espn_team_id, t);
  }
  return [...latestByFranchise.values()]
    .map((t) => ({ espnTeamId: t.espn_team_id, name: t.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

type RivalryGame = { season: number; week: number; isPlayoff: boolean; teamAScore: number; teamBScore: number };

export type RivalryStats = {
  teamA: FranchiseOption;
  teamB: FranchiseOption;
  gamesPlayed: number;
  teamAWins: number;
  teamBWins: number;
  ties: number;
  teamATotalPoints: number;
  teamBTotalPoints: number;
  biggestVictory: { winner: "A" | "B"; margin: number; season: number; week: number } | null;
  closestGame: { margin: number; season: number; week: number } | null;
  highestScoringGame: { total: number; season: number; week: number } | null;
  playoffMeetings: number;
  currentStreak: { holder: "A" | "B" | null; length: number };
};

/** Never invents data: returns null if these two franchises have no matchup history in our synced data. */
export async function getRivalry(teamAEspnId: number, teamBEspnId: number): Promise<RivalryStats | null> {
  const { teams, matchups, seasons } = await loadHistoryData();
  const seasonById = new Map(seasons.map((s) => [s.id, s]));
  const espnIdByTeamRowId = new Map(teams.map((t) => [t.id, t.espn_team_id]));
  const franchises = await getAllFranchises();
  const teamA = franchises.find((f) => f.espnTeamId === teamAEspnId);
  const teamB = franchises.find((f) => f.espnTeamId === teamBEspnId);
  if (!teamA || !teamB) return null;

  const rawGames: (RivalryGame & { winner: "A" | "B" | "tie" })[] = [];
  for (const m of matchups) {
    if (m.away_team_id === null || m.away_score === null || m.result === "UNDECIDED") continue;
    const homeEspn = espnIdByTeamRowId.get(m.home_team_id);
    const awayEspn = espnIdByTeamRowId.get(m.away_team_id);
    const season = seasonById.get(m.season_id)?.season_year ?? 0;

    let teamAScore: number, teamBScore: number;
    if (homeEspn === teamAEspnId && awayEspn === teamBEspnId) {
      teamAScore = m.home_score;
      teamBScore = m.away_score;
    } else if (homeEspn === teamBEspnId && awayEspn === teamAEspnId) {
      teamAScore = m.away_score;
      teamBScore = m.home_score;
    } else {
      continue;
    }

    const winner = teamAScore > teamBScore ? "A" : teamAScore < teamBScore ? "B" : "tie";
    rawGames.push({ season, week: m.week, isPlayoff: m.is_playoff, teamAScore, teamBScore, winner });
  }

  if (rawGames.length === 0) return null;

  rawGames.sort((a, b) => a.season - b.season || a.week - b.week);

  let teamAWins = 0,
    teamBWins = 0,
    ties = 0;
  let teamATotalPoints = 0,
    teamBTotalPoints = 0;
  let playoffMeetings = 0;
  let biggestVictory: RivalryStats["biggestVictory"] = null;
  let closestGame: RivalryStats["closestGame"] = null;
  let highestScoringGame: RivalryStats["highestScoringGame"] = null;

  for (const game of rawGames) {
    if (game.winner === "A") teamAWins++;
    else if (game.winner === "B") teamBWins++;
    else ties++;
    teamATotalPoints += game.teamAScore;
    teamBTotalPoints += game.teamBScore;
    if (game.isPlayoff) playoffMeetings++;

    const margin = Math.abs(game.teamAScore - game.teamBScore);
    const total = game.teamAScore + game.teamBScore;

    if (game.winner !== "tie" && (!biggestVictory || margin > biggestVictory.margin)) {
      biggestVictory = { winner: game.winner, margin, season: game.season, week: game.week };
    }
    if (!closestGame || margin < closestGame.margin) {
      closestGame = { margin, season: game.season, week: game.week };
    }
    if (!highestScoringGame || total > highestScoringGame.total) {
      highestScoringGame = { total, season: game.season, week: game.week };
    }
  }

  // Current streak: walk from most recent game backward while the same side keeps winning.
  let currentStreak: RivalryStats["currentStreak"] = { holder: null, length: 0 };
  for (let i = rawGames.length - 1; i >= 0; i--) {
    const game = rawGames[i];
    if (game.winner === "tie") break;
    if (currentStreak.holder === null) {
      currentStreak = { holder: game.winner, length: 1 };
    } else if (game.winner === currentStreak.holder) {
      currentStreak.length++;
    } else {
      break;
    }
  }

  return {
    teamA,
    teamB,
    gamesPlayed: rawGames.length,
    teamAWins,
    teamBWins,
    ties,
    teamATotalPoints,
    teamBTotalPoints,
    biggestVictory,
    closestGame,
    highestScoringGame,
    playoffMeetings,
    currentStreak,
  };
}

/** Auto-highlighted rivalries: the pairs with the most meetings, most playoff meetings, or closest overall records. */
export async function getNotableRivalries(limit = 5): Promise<RivalryStats[]> {
  const franchises = await getAllFranchises();
  const pairs: [number, number][] = [];
  for (let i = 0; i < franchises.length; i++) {
    for (let j = i + 1; j < franchises.length; j++) {
      pairs.push([franchises[i].espnTeamId, franchises[j].espnTeamId]);
    }
  }

  const rivalries = (await Promise.all(pairs.map(([a, b]) => getRivalry(a, b)))).filter((r): r is RivalryStats => r !== null);

  return rivalries
    .sort((a, b) => {
      const scoreA = a.gamesPlayed + a.playoffMeetings * 2;
      const scoreB = b.gamesPlayed + b.playoffMeetings * 2;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}
