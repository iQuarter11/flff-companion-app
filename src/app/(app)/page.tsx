import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentSeason,
  getMyFantasyTeam,
  getMatchupsForWeek,
  getStandings,
  getLatestPowerRankings,
  getSeasonLuck,
  getTradeBlock,
  getRecap,
} from "@/lib/league/queries";
import { getTrendingPlayerIds } from "@/lib/sleeper/trending";
import { getPlayersBySleeperIds } from "@/lib/player-cache/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const season = await getCurrentSeason();

  const [myTeam, standings, matchups, powerRankings, luck, tradeBlock, recap] = await Promise.all([
    getMyFantasyTeam(),
    getStandings(),
    season?.currentWeek ? getMatchupsForWeek(season.currentWeek) : Promise.resolve([]),
    getLatestPowerRankings(),
    getSeasonLuck(),
    getTradeBlock(),
    getRecap(),
  ]);

  const myStanding = myTeam ? standings.find((s) => s.teamId === myTeam.id) : undefined;
  const myMatchup = myTeam
    ? matchups.find((m) => m.homeTeamName === myTeam.name || m.awayTeamName === myTeam.name)
    : undefined;
  const myPowerRank = myTeam ? powerRankings.find((r) => r.teamId === myTeam.id) : undefined;
  const myLuck = myTeam ? luck.find((l) => l.teamId === myTeam.id) : undefined;

  let trendingName: string | null = null;
  try {
    const trending = await getTrendingPlayerIds("add", 24, 1);
    if (trending[0]) {
      const [identity] = await getPlayersBySleeperIds([trending[0].player_id]);
      trendingName = identity?.full_name ?? null;
    }
  } catch (e) {
    // This is a decorative quick-card, not core page content — a failure
    // here (Sleeper down, player_identity_cache not migrated yet, a
    // transient Supabase error) should never take down the whole Home
    // page. Log server-side so it's still visible, but never rethrow.
    console.error("Home page trending card failed to load:", e);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.email ? `, ${user.email}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">What&apos;s happening in our league right now.</p>
      </div>

      {recap ? (
        <Link
          href={`/league/recap?week=${recap.week}`}
          className="block rounded-xl border border-accent/30 bg-accent/5 p-4 hover:border-accent/50"
        >
          <p className="text-xs font-semibold uppercase text-accent">Week {recap.week} Recap</p>
          {recap.payload.gameOfTheWeek ? (
            <p className="mt-1 text-sm">
              Game of the Week: {recap.payload.gameOfTheWeek.away} {recap.payload.gameOfTheWeek.awayScore.toFixed(1)} @{" "}
              {recap.payload.gameOfTheWeek.home} {recap.payload.gameOfTheWeek.homeScore.toFixed(1)}
            </p>
          ) : null}
        </Link>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold text-muted">Current Week</h2>
        {!season ? (
          <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No league data synced yet — run a sync from /dev/espn.
          </div>
        ) : !myTeam ? (
          <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            Link your ESPN Team ID in <Link href="/profile" className="underline">your profile</Link> to see your matchup here.
          </div>
        ) : (
          <div className="mt-2 rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">
              {myMatchup ? `${myMatchup.awayTeamName} ${myMatchup.awayScore?.toFixed(1) ?? "—"} @ ${myMatchup.homeTeamName} ${myMatchup.homeScore.toFixed(1)}` : "No matchup this week."}
            </p>
            <p className="mt-1 text-xs text-muted">
              Record {myStanding ? `${myStanding.wins}-${myStanding.losses}${myStanding.ties ? `-${myStanding.ties}` : ""}` : "—"} · League rank{" "}
              {myStanding ? `#${myStanding.rank}` : "—"}
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">Around the League</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {matchups.map((m) => (
            <div key={m.espnMatchupId} className="rounded-lg border border-surface-border bg-surface p-3 text-sm">
              {m.awayTeamName ?? "BYE"} {m.awayScore?.toFixed(1) ?? "—"} @ {m.homeTeamName} {m.homeScore.toFixed(1)}
            </div>
          ))}
          {matchups.length === 0 ? <p className="text-sm text-muted">No matchups synced yet.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">Quick Cards</h2>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">Power Ranking</p>
            <p className="mt-1 text-xs text-muted">
              {myPowerRank ? `You're #${myPowerRank.rank} (${myPowerRank.powerScore.toFixed(1)})` : "Not computed yet — run a sync."}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">Luck Rating</p>
            <p className="mt-1 text-xs text-muted">
              {myLuck ? `${myLuck.luckDifferential >= 0 ? "+" : ""}${myLuck.luckDifferential.toFixed(1)} ${myLuck.luckDifferential >= 0 ? "🍀" : ""}` : "No data yet."}
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">Trending Player</p>
            <p className="mt-1 text-xs text-muted">{trendingName ?? "Unavailable right now."}</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">Trade Block Activity</p>
            <p className="mt-1 text-xs text-muted">{tradeBlock.length} player{tradeBlock.length === 1 ? "" : "s"} available league-wide.</p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">League Records</p>
            <p className="mt-1 text-xs text-muted">
              <Link href="/league/records" className="underline">
                View the record book
              </Link>
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface p-4">
            <p className="text-sm font-medium">Latest Video</p>
            <p className="mt-1 text-xs text-muted">Media lands in Phase 8.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
