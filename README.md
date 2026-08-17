# FFFL — Fantasy Football Companion

A private analytics and social layer on top of an existing ESPN Fantasy
Football league. ESPN stays the system of record for lineups, rosters, and
trades — this app adds power rankings, luck ratings, league history,
rivalries, a trade block, a watchlist, trending players, weekly recaps,
league chat, and media on top of it.

See `docs/` for architecture, database, ESPN integration, and analytics
details.

## Status: Phases 1–9 built

- **Foundation** — Next.js app shell, Supabase auth (email/password),
  profiles, the six-section responsive navigation (desktop sidebar +
  mobile header/bottom nav), dark mode with a toggle.
- **ESPN data** — `src/lib/espn/` fetches and normalizes this league's
  teams, rosters, matchups, and standings (current season + historical
  seasons); synced into Supabase via `src/lib/sync/`. Verify at `/dev/espn`
  (internal-only, not in the main nav).
- **Players** — the player identity cache (Sleeper ↔ ESPN ↔ headshots),
  Sleeper trending (adds/drops, position filters), player search, a
  per-user watchlist.
- **Social** — a live trade block (Supabase Realtime) and a league-wide
  chat, both showing each user's real display name — never a
  client-supplied one.
- **Analytics** — custom power rankings (weights in
  `src/lib/analytics/power-rankings-config.ts`), all-play-based luck
  ratings, deterministic weekly recaps. Unit tested — `npm run test`.
- **History** — champions, seasons, a league record book, and a rivalry
  explorer, all computed from synced matchup history (never invented when
  data is missing).
- **Media** — cached YouTube videos per configured channel, no API key
  required (falls back to the official Data API if `YOUTUBE_API_KEY` is
  set).
- **Polish** — shared loading/error/not-found states, graceful ESPN/
  Sleeper/YouTube failure handling throughout.

Not yet built: draft results and transaction history (ESPN data
permitting), achievements, trade interest UI (schema exists), an LLM-
generated recap narrative (architecture supports adding one — see
`docs/analytics.md`).

## Stack

Next.js (App Router) · TypeScript · React · Tailwind CSS v4 · Supabase
(Postgres, Auth, RLS, Realtime) · Vitest · Vercel.

## Local setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com) (free tier is
   fine).
2. In **Project Settings -> API**, copy the **Project URL** and the
   **anon public** key.
3. Also copy the **service_role** key. Treat it like a root password — it
   bypasses Row Level Security entirely.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — from step 2.
- `ESPN_LEAGUE_ID`, `ESPN_SEASON` — already set for this league.
- `ESPN_SWID`, `ESPN_S2` — see `docs/espn-integration.md` for how to get
  these from a logged-in browser session. Without them, `/dev/espn` falls
  back to visibly-labeled mock data instead of failing.
- `SYNC_SECRET` — bearer token that protects `POST /api/sync/espn`.
  Generate one with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
- `YOUTUBE_API_KEY` — optional. Media works without it (RSS fallback).

`.env.local` is gitignored. Never commit it.

### 4. Run the database migrations

**This step is required before any data-driven page (Home, League, Players,
Trade Block, /dev/espn, etc.) will work.** Skipping it is the #1 cause of
"table not found" / "Could not find the table 'public.X' in the schema
cache" errors.

In the Supabase dashboard, open the **SQL Editor**, open
`supabase/combined_migrations.sql` from this repo, paste its **entire**
contents into one query, and click **Run**. That's every migration
(0001-0011 as of this writing) in one idempotent script — safe to re-run
if you're ever unsure whether it's already been applied.

(The individual files in `supabase/migrations/` are the source of truth if
you're using the Supabase CLI / `supabase db push` instead — the combined
file is regenerated from them and shouldn't be hand-edited.)

**Verify it worked**: in the Supabase dashboard, go to **Table Editor** and
confirm you see tables like `profiles`, `leagues`, `sync_runs`, and
`player_identity_cache`. If they're not there, the SQL Editor run above
either didn't complete or errored partway through — check for a red error
in the SQL Editor's output.

### 5. Enable email/password auth

**Authentication -> Providers -> Email** is on by default. For local dev,
you can turn off "Confirm email" under **Authentication -> Settings** so
signup logs you in immediately — turn it back on before sharing this with
the league.

### 6. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. You'll be redirected to `/login`; use
**Sign up** to create the first account, then pick **your team** from the
dropdown in `/profile` (populated from synced league data — run a sync
from `/dev/espn` first if the list is empty). Needed for the Trade Block
and the Home page's "Current Week" card to know which team is yours. Each
team can only be claimed by one account.

### 7. Populate real data

```bash
npm run sync:players     # player identity cache (Sleeper <-> ESPN)
```

Then, signed in, visit `/dev/espn` and click **Run sync now** (pulls this
season's teams/rosters/matchups/standings and computes power rankings +
a recap for the most recently completed week). Click **Sync historical
seasons** once, whenever convenient, to populate Champions/Records/
Rivalries — it's several large ESPN requests, so it's slower and meant to
be run occasionally, not on every sync.

## Running tests

```bash
npm run test
```

Covers the calculations that would be hard to notice as wrong just by
looking at the UI: all-play records, luck ratings, power-ranking
normalization/ordering, and weekly recap selection logic (game of the
week, upsets, luckiest win, etc.) — see `src/lib/analytics/*.test.ts`.

## Commands

```bash
npm run dev           # start the dev server
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint            # eslint
npm run test             # vitest
npm run sync:players      # populate the player identity cache
```

## Project structure

```
src/
  app/
    (auth)/          login, signup — unauthenticated layout
    (app)/           Home, League (+matchups/standings/power-rankings/
                      records/recap), Players (+search/watchlist), Trades
                      (+history), Media, History (+champions/seasons/
                      records/rivalries), Chat, teams/[teamId], profile,
                      dev/espn — authenticated shell
    auth/            Supabase auth callback + signout route handlers
    api/             player-cache lookup, POST /api/sync/espn
  components/
    nav/             sidebar, mobile header/nav, sub-nav, theme toggle
    players/         headshot (silhouette fallback), watchlist button
    trades/           trade block toggle, realtime refresh
    chat/            chat panel (realtime)
    ui/              shared presentational components
  lib/
    supabase/        client.ts (browser), server.ts (SSR), admin.ts (service-role, sync-only)
    player-cache/     Sleeper <-> ESPN player identity queries
    espn/            fetch + normalize only — client, types, constants, teams,
                      rosters, matchups, standings, players, history, normalize
    sleeper/         trending fetch
    youtube/         RSS (default) + official API fallback, unified in service.ts
    chat/            chat message queries
    league/          read-query layer over synced tables (standings, matchups,
                      rosters, power rankings, luck, trade block, team profiles)
    history/         champions, seasons, league records, rivalries — computed
                      live from synced matchup history
    analytics/       all-play, luck, power rankings (+ config), weekly recap —
                      pure, unit-tested calculation functions
    sync/            league.ts, historical.ts, power-rankings.ts, recap.ts,
                      youtube.ts — everything that writes to Supabase
    mock/            dev-mode fixture data (espn.ts), shown only with a visible banner
    env.ts           environment variable validation
    nav.ts            central navigation config
  types/
    league.ts        normalized domain types shared by espn/, sync/, league/, and pages
supabase/
  migrations/        numbered, idempotent SQL migrations (0001-0010)
scripts/
  sync-player-cache.mjs   standalone Node script, run via npm run sync:players
docs/
  architecture.md, database.md, espn-integration.md, analytics.md
vitest.config.mts
```

## Security notes

- `ESPN_SWID`, `ESPN_S2`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only,
  read exclusively through `getServerEnv()` / `createAdminClient()`.
- `src/lib/supabase/admin.ts` imports the `server-only` package, which
  turns an accidental client-side import into a build error.
- `POST /api/sync/espn` requires a `SYNC_SECRET` bearer token. The
  `/dev/espn` page's "Run sync now" button doesn't call this route; it
  runs the sync via a Server Action instead, so `SYNC_SECRET` never has to
  reach the browser.
- Row Level Security is enabled on every table from the migration that
  creates it — including chat, trade block, and watchlist, which are the
  tables where getting this wrong would let one user write as another.
- User-supplied IDs/names are never trusted for authorization or display —
  team ownership (`getMyFantasyTeam()`) and chat sender names both derive
  from the authenticated session (`auth.uid()`), server-side, checked
  again by RLS.

## Common problems

- **"Missing or invalid Supabase public environment variables"** — fill in
  `.env.local` and restart `npm run dev`.
- **Any page says it couldn't load data / a table doesn't exist** (e.g.
  "Could not find the table 'public.X' in the schema cache") — run
  `supabase/combined_migrations.sql` (see step 4 above); it hasn't been
  applied to this Supabase project yet.
- **Media page says "No YouTube channels configured"** — same cause:
  migration `0010_youtube.sql` (part of the combined script) seeds one
  channel; it just hasn't run yet.
- **`/dev/espn` shows an amber "mock data" banner** — `ESPN_LEAGUE_ID`,
  `ESPN_SWID`, or `ESPN_S2` isn't set. Expected until configured; see
  `docs/espn-integration.md`.
- **ESPN authentication error** — `ESPN_SWID`/`ESPN_S2` cookies expire
  periodically; re-capture them from a logged-in browser session.
- **Trade Block says your profile isn't linked to a team** — set your ESPN
  Team ID in `/profile`.
- **Signup redirects to a confirmation-email screen you can't easily test
  locally** — turn off "Confirm email" in Supabase Auth settings.

## Deploying

1. **GitHub**: push this repo to a private GitHub repository.
2. **Vercel**: import the repo at [vercel.com/new](https://vercel.com/new).
   Framework preset auto-detects Next.js — no config changes needed.
3. **Environment variables**: in Vercel's project settings, add every
   variable from `.env.example` with production values. Use a
   **different** `SUPABASE_SERVICE_ROLE_KEY` / `SYNC_SECRET` than local if
   you're using a separate production Supabase project (recommended).
   Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
4. **Supabase**: either point production at the same project used in
   development, or create a separate one and re-run every migration in
   `supabase/migrations/` (in order) against it via the SQL Editor.
5. **Auth redirect**: in Supabase, **Authentication -> URL Configuration**,
   add your Vercel URL to the allowed redirect URLs (needed for the email
   confirmation flow to work in production).
6. **Cron (optional)**: `POST /api/sync/espn` is ready for Vercel Cron —
   add a `vercel.json` cron entry pointing at it with the `SYNC_SECRET`
   bearer token, once you're ready to automate syncing instead of using
   the `/dev/espn` button.

Not done yet: this hasn't actually been pushed to GitHub or deployed —
that's a deliberate stopping point since both are visible, external
actions on your accounts.
