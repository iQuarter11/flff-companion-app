import { getMyFantasyTeam, getTeamRosterForTrade, getTradeBlock } from "@/lib/league/queries";
import { PlayerHeadshot } from "@/components/players/player-headshot";
import { TradeBlockToggle } from "@/components/trades/trade-block-toggle";
import { TradeBlockRealtimeRefresh } from "@/components/trades/realtime-refresh";

export const dynamic = "force-dynamic";

export default async function TradeBlockPage() {
  const myTeam = await getMyFantasyTeam();
  const [myRoster, tradeBlock] = await Promise.all([
    myTeam ? getTeamRosterForTrade(myTeam.id) : Promise.resolve([]),
    getTradeBlock(),
  ]);

  const myTradeBlockPlayerIds = new Set(
    tradeBlock.filter((entry) => entry.teamId === myTeam?.id).map((entry) => entry.playerId)
  );

  const entriesByTeam = new Map<number, { teamName: string; entries: typeof tradeBlock }>();
  for (const entry of tradeBlock) {
    if (!entriesByTeam.has(entry.teamId)) entriesByTeam.set(entry.teamId, { teamName: entry.teamName, entries: [] });
    entriesByTeam.get(entry.teamId)!.entries.push(entry);
  }

  return (
    <div className="flex flex-col gap-8">
      <TradeBlockRealtimeRefresh />

      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Trade Block</h1>
        <p className="mt-1 text-sm text-muted">
          Mark your own players as available, and see what the rest of the league is offering. Updates live.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">Your roster</h2>
        {!myTeam ? (
          <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            Link your ESPN Team ID in <a href="/profile" className="underline">your profile</a> to manage your trade block.
          </div>
        ) : myRoster.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No roster data yet — run an ESPN sync from /dev/espn.
          </div>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {myRoster.map((player) => (
              <li
                key={player.espnPlayerId}
                className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{player.fullName}</p>
                  <p className="text-xs text-muted">
                    {player.lineupSlot} · {player.position ?? "—"} {player.nflTeam ? `· ${player.nflTeam}` : ""}
                  </p>
                </div>
                <TradeBlockToggle
                  playerIdentityCacheId={player.playerIdentityCacheId}
                  initiallyOnBlock={player.playerIdentityCacheId !== null && myTradeBlockPlayerIds.has(player.playerIdentityCacheId)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted">League trade block ({tradeBlock.length})</h2>
        {entriesByTeam.size === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-surface-border p-6 text-center text-sm text-muted">
            No players on the trade block yet.
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[...entriesByTeam.entries()].map(([teamId, { teamName, entries }]) => (
              <div key={teamId} className="rounded-lg border border-surface-border bg-surface p-3">
                <p className="text-sm font-semibold">{teamName}</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {entries.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2">
                      <PlayerHeadshot src={entry.headshotUrl} name={entry.playerName} size={28} />
                      <span className="truncate text-sm">{entry.playerName}</span>
                      <span className="text-xs text-muted">{entry.position}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
