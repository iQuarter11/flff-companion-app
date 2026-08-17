# Database

Migrations live in `supabase/migrations/`, run in order against the
Supabase SQL Editor (or the Supabase CLI once you set that up). Each file is
idempotent (`create table if not exists`, `drop policy if exists` before
`create policy`, etc.) so re-running is safe.

## Tables so far

### `profiles` (0001_profiles.sql)

One row per authenticated user, keyed to `auth.users.id`. Auto-created by a
trigger on user signup (`handle_new_user`), seeded with a display name
derived from the email — the app should never encounter a signed-in user
with no profile row.

| column | notes |
|---|---|
| `id` | PK, FK to `auth.users.id` |
| `display_name` | editable in `/profile` |
| `username` | unique, `^[a-z0-9_]{3,24}$` |
| `espn_team_id` | which ESPN fantasy team this person owns (Phase 2 links this to real roster data) |
| `avatar_url` | not yet editable in the UI |

RLS: any authenticated user can read all profiles (needed for team/owner
display throughout the app); only the owning user can insert/update their
own row. Never trust a client-supplied user ID for writes — the update
always targets `auth.uid()`.

### `player_identity_cache` (0002_player_identity_cache.sql)

Maps Sleeper player IDs to ESPN player IDs, holding the union of the top
1,000 fantasy-relevant players from each platform. This table predates the
rest of the app (see the original `fantasy-player-cache/` prototype) and was
carried over as-is because the design and sync script were already working.

Primary identity path:

```
Sleeper player_id -> player_identity_cache -> espn_id -> ESPN headshot
```

Name matching is **not** used for identity resolution except as an
explicitly marked fallback (`mapping_source`) — IDs are the source of truth.

| column | notes |
|---|---|
| `sleeper_id`, `espn_id` | both unique, at least one required |
| `sleeper_rank`, `espn_rank` | per-platform popularity/draft rank |
| `in_sleeper_top_1000`, `in_espn_top_1000` | coverage flags, reset and recomputed on every sync |
| `mapping_source` | e.g. `sleeper:espn_id`, `espn:player_pool`, or a fallback marker |
| `headshot_url` | ESPN CDN headshot when an `espn_id` is known; the UI must fall back to a generic silhouette otherwise |

RLS: public read (`anon` and `authenticated`); no public write policy —
only the service-role sync script (`npm run sync:players`) can write.

Query helpers: `src/lib/player-cache/queries.ts` —
`getPlayerByEspnId`, `getPlayerBySleeperId`, `getPlayersByEspnIds`,
`getPlayersBySleeperIds`, `searchPlayers`.

### League data (0003_league_data.sql)

Normalized ESPN league data, written exclusively by
`src/lib/sync/league.ts` via the service-role client (`POST /api/sync/espn`
or the `/dev/espn` debug page's "Run sync now" button). Read-only to
regular users via RLS.

| table | grain | notes |
|---|---|---|
| `leagues` | one row per ESPN league | just identity (`espn_league_id`, `name`) |
| `seasons` | one row per league per year | `is_current` flags the active one; carries `regular_season_matchup_count` / `playoff_team_count` so playoff detection doesn't need a second lookup |
| `fantasy_teams` | one row per team per season | team identity is scoped to a season deliberately — names/logos/owners can change year to year, and this matches how ESPN's API actually returns team data |
| `team_rosters` | one row per player per team per week | `player_identity_cache_id` is a best-effort FK resolved at sync time; `full_name`/`position`/`nfl_team` are also stored directly from ESPN so display never breaks for players outside the identity cache's top-1000 union (deep bench, IDP) |
| `matchups` | one row per matchup per week | `result` is `HOME`/`AWAY`/`TIE`/`UNDECIDED` (not yet played); `is_playoff` is derived from `week > regular_season_matchup_count`, not from an ESPN field (ESPN's `playoffTierType` was empty/unreliable in this league's data) |
| `weekly_team_scores` | one row per team per week | derived from `matchups`, but kept as its own table (rather than joined from matchups) because Phase 5's all-play calculations need every team's score for a week, not just matchup pairs |
| `standings_snapshots` | one row per team per week | written on every sync, tagged with the league's current week — this is what gives Phase 5 (power rankings/luck trends) and Phase 7 (recaps) real history instead of needing a backfill later |
| `sync_runs` | one row per sync attempt | `status` (`running`/`success`/`error`), timing, and `error` — surfaced in the `/dev/espn` debug page |

Team identity across seasons (e.g. "has this owner's team always been
called X") is resolved at the application layer by matching
`espn_team_id` + `primary_owner_espn_member_id` across `fantasy_teams`
rows, not by a single persistent team row — this is intentional, see the
table note above.

ESPN's `defaultPositionId` / `lineupSlotId` / `proTeamId` codes are
undocumented integers. The maps in `src/lib/espn/constants.ts` were derived
empirically (fetched this league's real roster data, cross-checked
`proTeamId` against known players) rather than assumed from memory —
unrecognized IDs fall back to `POS_${id}` / `SLOT_${id}` rather than
asserting a wrong label. See `docs/espn-integration.md`.

`fantasy_teams` also gained a `final_rank` column (0007) — ESPN's
finalized standing for a completed season (`rankCalculatedFinal`), null
until the season is over. It's the source of truth for Champions
(`final_rank = 1`).

### `watchlist` (0004_watchlist.sql)

`user_id` + `player_id` (FK to `player_identity_cache`), unique together.
RLS: a user can only read/insert/delete their own rows — not "read all,
write own" like most tables here, since a watchlist is genuinely private.

### `trade_block` / `trade_interest` (0005_trade_block.sql)

`trade_block`: `team_id` (FK `fantasy_teams`), `player_id` (FK
`player_identity_cache`), `added_by`. Anyone in the league can read every
entry; only the row's owning team's user can insert/delete — enforced in
RLS via a join from `auth.uid()` -> `profiles.espn_team_id` ->
`fantasy_teams.espn_team_id`, not just in the Server Action, so a bug in
application code can't grant cross-team write access. Realtime-enabled
(`supabase_realtime` publication) so `src/components/trades/realtime-refresh.tsx`
can live-refresh other users' browsers.

`trade_interest`: schema for the future "I'm Interested" feature (per
spec section 21). Not wired into the UI yet.

Note: a player can only go on the trade block if they're in
`player_identity_cache` (the FK requires it) — deep bench/IDP players
outside the top-1000 union can't be, and the UI shows "Not tradeable"
rather than silently failing.

### `power_rankings` (0006_power_rankings.sql)

One row per team per week, written by
`src/lib/sync/power-rankings.ts` after every ESPN sync. `previous_rank` is
captured from last week's row at write time (not recomputed later), so
movement arrows in the UI never need a second query. See
`docs/analytics.md` for the weighting formula.

There's no separate `luck_ratings` table — Luck Rating is computed live
from `weekly_team_scores` + `fantasy_teams.wins` on every page load
(`getSeasonLuck()` in `src/lib/league/queries.ts`). The weekly scores
already are the "sufficient weekly data" the spec asks for; a second
stored/derived table would just be another thing to keep in sync.

### `chat_messages` (0008_chat.sql)

`user_id` + `body`, RLS: any authenticated user reads all, inserts only as
themselves (`user_id = auth.uid()`), deletes only their own. Realtime-
enabled. The sender's display name is **never** stored on the message
row or sent by the client — it's resolved from `profiles.display_name` at
read time (initial load) or via a one-off lookup cached client-side
(new realtime messages), so a client can't claim to be someone else's name.

### `weekly_recaps` (0009_weekly_recaps.sql)

One row per season per week. Unlike the other tables, the recap's content
lives in a single `payload jsonb` column rather than a column per field —
see `docs/analytics.md` for why, and the shape (`WeeklyRecap` in
`src/lib/analytics/recap.ts`).

### `youtube_channels` / `youtube_videos_cache` (0010_youtube.sql)

`youtube_channels`: configured channels (`enabled`, `display_order`).
Seeded with the channel provided during setup; add more with a plain
`insert`. `youtube_videos_cache`: the last-fetched videos per channel,
refreshed by `src/lib/sync/youtube.ts` (any authenticated user can trigger
a refresh from `/media` — unlike ESPN sync, this touches no private
credentials). Both public-read to authenticated users, service-role write
only.

## Planned tables (not built yet)

`transactions`, `draft_results`, `achievements` — deferred until ESPN's
data for them is confirmed available for this league (transactions/draft
history aren't guaranteed to be exposed the same way roster/matchup data
is) and until achievements has an actual feature design.

## Conventions

- Every table: `created_at timestamptz default now()`, and `updated_at`
  with a `touch_*_updated_at` trigger where rows are mutable.
- RLS is enabled on every table from the migration that creates it — there
  is no "add RLS later" step.
- The service-role key is never used to serve a per-user request; it's
  reserved for sync jobs (`src/lib/supabase/admin.ts`).
