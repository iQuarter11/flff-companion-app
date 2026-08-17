# Architecture

## Overview

FFFL is a Next.js (App Router) app that layers custom analytics, social features,
and presentation on top of an existing ESPN Fantasy Football league. ESPN
remains the system of record for lineups, rosters, and transactions — this
app never writes back to ESPN.

```
ESPN Fantasy API (unofficial)  ---\
                                    >  server-side sync  ->  Supabase (Postgres)  ->  Next.js app
Sleeper public API              ---/
```

## Layers

- **`src/app/`** — routes, grouped by concern:
  - `(auth)/` — login/signup, unauthenticated, centered layout.
  - `(app)/` — the six primary sections (Home, League, Players, Trades,
    Media, History) plus `/teams/[teamId]`, `/profile`, `/chat`, and
    `/dev/espn`. This group's `layout.tsx` requires an authenticated
    session and renders the sidebar (desktop) / header + bottom nav
    (mobile).
  - `auth/callback`, `auth/signout` — Route Handlers for the Supabase auth
    flow that shouldn't live under either layout.
  - `api/` — small server endpoints (player-cache lookups, the
    bearer-protected ESPN sync trigger).
- **`src/lib/supabase/`** — three clients, each scoped to where it can run:
  - `client.ts` — browser client (anon key only).
  - `server.ts` — Server Component / Server Action / Route Handler client,
    cookie-aware, still anon key (RLS enforces access).
  - `admin.ts` — service-role client. Marked `server-only`; for trusted sync
    jobs exclusively, never for serving a user request.
- **`src/lib/espn/`** — all ESPN-specific fetching and normalization.
  Nothing outside this folder should know ESPN's raw JSON shape; everything
  else imports `getNormalizedLeague()` from `normalize.ts` and the shared
  types from `src/types/league.ts`. See `docs/espn-integration.md`.
- **`src/lib/sleeper/`** — trending fetch (`getTrendingPlayerIds`), no
  credentials needed.
- **`src/lib/youtube/`** — `rss.ts` (default, no API key) and `api.ts`
  (official Data API, used when `YOUTUBE_API_KEY` is set), unified behind
  `service.ts` so callers don't need to know which is active.
- **`src/lib/sync/`** — everything that writes to Supabase: `league.ts`
  (teams/rosters/matchups/standings, current + historical seasons via
  `historical.ts`), `power-rankings.ts`, `recap.ts`, `youtube.ts`. Kept
  separate from `espn/`/`youtube/` so those folders stay pure
  fetch-and-normalize, with no database dependency.
- **`src/lib/league/`** — the read-query layer over everything `sync/`
  writes (standings, matchups, rosters, power rankings, luck, trade block,
  team profiles, current season/week). Pages should read through here
  rather than querying Supabase tables directly, so "what counts as the
  current season" logic lives in one place.
- **`src/lib/history/`** — champions, seasons, the league record book, and
  rivalry head-to-heads, computed live from synced matchup history across
  every season. Never invents a result when the underlying data is
  missing (e.g. an unfinalized season has no champion, not a guessed one).
- **`src/lib/analytics/`** — pure calculation functions (all-play, luck,
  power rankings, weekly recap), unit tested. No I/O — see
  `docs/analytics.md`.
- **`src/lib/chat/`** — chat message queries (sender name always resolved
  server-side from `profiles`, never trusted from the client).
- **`src/lib/player-cache/`** — Sleeper <-> ESPN player identity mapping.
  See `docs/database.md`.
- **`src/lib/mock/`** — representative fixture data so the app is usable
  before ESPN/Supabase credentials exist locally (`espn.ts` so far). Never
  written to Supabase, and never shown without a visible "mock data"
  indicator — see the `/dev/espn` page.
- **`src/types/`** — normalized domain types shared across the app
  (`league.ts`: `Team`, `Matchup`, `TeamRoster`, `Standing`, etc.).
  `src/lib/espn/` produces these; everything else consumes them.

## Why a player identity cache

Sleeper and ESPN each have their own player IDs. The cache
(`player_identity_cache`) is the single source of truth mapping one to the
other, populated by a daily sync job — not computed on the fly, and not
matched by name except as an explicitly-marked fallback. See
`docs/database.md`.

## Data sync

The app never calls ESPN, Sleeper, or YouTube directly from a page render
that a regular user hits — the one exception is `/dev/espn`, deliberately,
since its job is verifying the live ESPN normalizer output. Everything
else reads from Supabase, written by `src/lib/sync/`. Every ESPN
`sync_runs` row records status/timing/error so failures are visible
instead of silent (surfaced on `/dev/espn`). Sleeper trending is fetched
live per-request (small, fast, no credentials — different cost profile
than ESPN's 2MB+ payload) rather than pre-synced.

ESPN sync runs automatically once deployed: `vercel.json` defines a daily
Vercel Cron job hitting `/api/sync/espn` (bearer-token protected via
`CRON_SECRET`, which Vercel attaches to cron requests automatically). The
`/dev/espn` "Run sync now" button and `POST /api/sync/espn` still work for
on-demand syncs in between. See the README's "Automatic sync" section for
the Hobby-plan cadence limit (once/day) and how to change the schedule.
Historical season sync and the media refresh button stay manual-only —
neither needs to run on a fixed schedule.

## Rendering strategy

Server Components by default. Client Components only where interaction
requires them (forms, drag-and-drop trade block, realtime subscriptions).
Auth state is read server-side in `(app)/layout.tsx`; the session cookie is
kept fresh by `src/middleware.ts` on every request.
