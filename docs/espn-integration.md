# ESPN Integration

**Status: built.** League/team/roster/matchup/standings sync is live for
the current season, plus every prior season ESPN reports for this league
(`src/lib/sync/historical.ts`, triggered from `/dev/espn`). Draft results
and transactions aren't built — ESPN's data for those isn't confirmed
available for this league yet, and the spec explicitly scopes them to
"when obtainable."

## Why this needs care

ESPN's Fantasy Football API is unofficial and undocumented. Endpoints,
response shapes, and required headers have changed before and will change
again. All ESPN-specific logic lives behind `src/lib/espn/` so the rest of
the app never touches ESPN's raw JSON.

```
src/lib/espn/
  client.ts      fetchLeague() — base URL, auth cookie header, typed errors
                 (EspnAuthError, EspnUnavailableError, EspnNotConfiguredError)
  types.ts       raw ESPN response types (internal only, not exported to UI)
  constants.ts   defaultPositionId / lineupSlotId / proTeamId maps —
                 derived empirically, see below
  teams.ts       teams + owners
  rosters.ts     current lineup + bench, per team
  matchups.ts    weekly matchups + scores, playoff detection
  standings.ts   win/loss standings (NOT power rankings — see docs/analytics.md)
  players.ts     position/team normalization for roster players
  history.ts     getHistoricalSeasons() — which prior seasons exist, for src/lib/sync/historical.ts
  normalize.ts   getNormalizedLeague() — the one entry point everything else calls
```

`normalize.ts` is the only module anything outside `src/lib/espn/` should
import from — it returns `NormalizedLeague` (defined in
`src/types/league.ts`), never ESPN's raw shape. `src/lib/sync/league.ts`
calls it and upserts the result into Supabase; the `/dev/espn` debug page
calls it directly to show live data independent of whether a sync has run.

## Endpoint used

```
GET https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{leagueId}
    ?view=mTeam&view=mRoster&view=mMatchup&view=mSettings
```

One request returns teams, members, rosters, the full schedule, and league
settings — Phase 2 didn't need any other endpoint. The response is large
(~1.7-2.3MB for a 12-team league), which is why `client.ts` uses
`cache: "no-store"` instead of Next.js's fetch cache: that payload exceeds
Next's per-entry cache size limit, so attempting to cache it there just
produced a silent-failure warning on every request. Real caching happens
one layer up, in Supabase, via the sync job — this fetch is meant to always
be live.

## ID mappings (undocumented, verified empirically)

ESPN encodes positions, roster slots, and NFL teams as small integers with
no published mapping. Rather than trust half-remembered community
documentation, the maps in `constants.ts` were built by fetching this
league's real roster data and cross-referencing `proTeamId` against known
players (e.g. Puka Nacua -> 14 -> LAR, Travis Kelce -> 12 -> KC, Denver
D/ST -> 7 -> DEN) and confirming `lineupSlotCounts` in league settings only
uses the slot IDs this league actually has data for. Unrecognized IDs
render as `POS_${id}` / `SLOT_${id}` rather than a guessed label — if a
future season introduces a code not in the map, it'll be visibly obvious
instead of silently mislabeled.

Playoff detection (`is_playoff` on matchups) is similarly derived, not
read from an ESPN field: `settings.scheduleSettings.playoffTierType` was
empty/unreliable in this league's actual response, but
`matchupPeriodCount` (regular season length) was reliable, so
`is_playoff = week > matchupPeriodCount`.

## Authentication

The league is private. The server authenticates as a logged-in member using
two cookie values captured from a logged-in browser session against
fantasy.espn.com:

- `ESPN_SWID`
- `ESPN_S2`

Both are set in `.env.local` and read only in server-side code
(`getServerEnv()` in `src/lib/env.ts`). They must never reach the browser,
never appear in logs, and never be committed.

### How to get SWID and espn_s2 (for whoever runs the sync)

1. Log into fantasy.espn.com in a browser, with access to the league.
2. Open DevTools -> Application/Storage -> Cookies for `fantasy.espn.com`.
3. Copy the `SWID` value (including the curly braces) and the `espn_s2`
   value.
4. Put them in `.env.local` as `ESPN_SWID` and `ESPN_S2`. Don't URL-decode
   `espn_s2` — use it exactly as ESPN sends it.

These cookies expire periodically (typically when you log out or after an
extended period) and will need refreshing. When they do, `fetchLeague()`
throws `EspnAuthError` on a 401/403 response, which `/dev/espn` and
`POST /api/sync/espn` both surface as a clear "ESPN authentication failed"
message — never as a raw stack trace, and never including the cookie
values themselves.

## Sync, not request-time fetching

Pages never call ESPN directly. `src/lib/sync/league.ts` fetches and
normalizes the league, then upserts into the tables from
`0003_league_data.sql`, recording a `sync_runs` row either way. Triggered
via `POST /api/sync/espn` (bearer-token protected, suitable for a future
cron job) or the `/dev/espn` debug page's "Run sync now" button (a Server
Action, so the app never needs to send the sync secret to the browser).
Regular app pages (once Phase 2's UI lands beyond the debug page) will read
from Supabase, not ESPN directly.

## Error handling

`client.ts` throws three typed errors so callers can distinguish "not
configured" from "ESPN rejected the request" from "ESPN is down":
`EspnNotConfiguredError`, `EspnAuthError`, `EspnUnavailableError`. Both
`/dev/espn` and `POST /api/sync/espn` catch all three and return a clear
message rather than crashing or leaking a stack trace. A failed ESPN sync
never crashes pages that only need Supabase data — it just means that
sync's data doesn't get refreshed until the next attempt.

## Mock mode

When `ESPN_LEAGUE_ID`/`ESPN_SWID`/`ESPN_S2` aren't all set,
`getNormalizedLeague()` throws `EspnNotConfiguredError`, and `/dev/espn`
falls back to `src/lib/mock/espn.ts` (`MOCK_LEAGUE`) — a small,
clearly-labeled fixture (4 teams, one matchup week), always shown with an
amber "showing mock data" banner so it's never mistaken for real league
data. Mock data is never written to Supabase — it exists only to keep the
debug page browsable before ESPN credentials are configured.
into a real response.
