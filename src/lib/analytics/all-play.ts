/**
 * All-play: for a given week, how would each team have done if it played
 * every other team that week (not just its actual opponent)? See
 * docs/analytics.md for the formula.
 */

export type WeekScore = {
  teamId: number;
  points: number;
};

export type AllPlayRecord = {
  teamId: number;
  wins: number;
  losses: number;
  ties: number;
};

export function computeWeeklyAllPlay(scores: WeekScore[]): AllPlayRecord[] {
  return scores.map((team) => {
    let wins = 0;
    let losses = 0;
    let ties = 0;

    for (const other of scores) {
      if (other.teamId === team.teamId) continue;
      if (team.points > other.points) wins++;
      else if (team.points < other.points) losses++;
      else ties++;
    }

    return { teamId: team.teamId, wins, losses, ties };
  });
}
