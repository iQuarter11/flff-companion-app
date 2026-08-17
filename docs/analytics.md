# Analytics

**Status: built.** `src/lib/analytics/` holds every calculation as a pure
function (no I/O), unit tested in the same folder — `npm run test`.

## All-Play Record (`all-play.ts`)

For every completed week, compare each team's score against every other
team's score that week (not just their actual opponent).

> 12-team league, Team A's score beats 8 of the other 11 teams that week ->
> weekly all-play record of 8-3.

`computeWeeklyAllPlay(scores)` takes one week's `{teamId, points}[]` and
returns each team's wins/losses/ties against the field.

## Luck Rating (`luck.ts`)

```
Expected Wins = sum over every completed week of (wins + ties * 0.5) / opponentsPerWeek
Luck Differential = Actual Wins - Expected Wins
```

Positive = lucky, negative = unlucky. `computeSeasonLuck(actualWinsByTeam,
weeklyAllPlay)` — **`weeklyAllPlay` must contain every team's record for
each week**, not just the team being evaluated, since the opponent count
is derived from `week.length - 1`. This is documented directly on the
function because it's an easy contract to get backwards (a test caught
exactly this during development).

Computed live, not stored: `getSeasonLuck()` in
`src/lib/league/queries.ts` recomputes from `weekly_team_scores` +
`fantasy_teams.wins` on every page load rather than reading from a
dedicated table — see `docs/database.md`.

## Power Rankings (`power-rankings.ts` + `power-rankings-config.ts`)

Weighted composite, weights centralized in `power-rankings-config.ts` (the
module throws at import time if they don't sum to 1 — a cheap guard
against a typo silently skewing every score):

| component | weight | source |
|---|---|---|
| All-Play Performance | 30% | season-long all-play win % |
| Points Scored | 25% | season `points_for` |
| Recent Performance | 20% | average points, last 3 played weeks |
| Win/Loss Record | 15% | actual win % (ties = 0.5) |
| Roster/Starter Performance | 10% | fraction of current starters not injured — see caveat below |

Each component is min-max normalized to [0, 1] across the field before
weighting (`normalizeMinMax`); when every team ties on a metric, everyone
gets 0.5 rather than an arbitrary 0 or a division by zero. Combined score
is scaled to 0-100. `src/lib/sync/power-rankings.ts` computes this from
data already in Supabase (no ESPN call) and stores it in `power_rankings`,
capturing `previous_rank` from last week's row so the UI shows movement
without recomputing history.

**Known simplification:** "Roster/Starter Performance" is meant to reflect
starter *scoring* strength, but per-player weekly fantasy points aren't
synced yet (`team_rosters` has composition, not points). Using healthy-
starter fraction instead is a real signal, just a narrower one. Syncing
`appliedStatTotal` per roster entry would let this become an actual
points-based metric — noted as a follow-up, not implemented, since
fabricating a plausible-looking number would be worse than an honest proxy.

## Weekly Recap (`recap.ts`)

Deterministic, no LLM — `generateWeeklyRecap(week, matchups, powerRankings,
standings)` is a pure function; `src/lib/sync/recap.ts` fetches the inputs
and stores the result as JSON in `weekly_recaps` (see `docs/database.md`
for why JSON instead of a column per field).

Selections:

- **Game of the Week** — highest combined score.
- **Biggest Blowout** / **Closest Game** — largest / smallest margin among
  decided matchups.
- **Highest / Lowest Scorer** — across both sides of every matchup, not
  just winners.
- **Biggest Upset** — winner had a worse *previous week's* power rank than
  the loser; the gap is the upset size. No upset is reported if either
  team lacks a previous rank (first week) or the favorite won.
- **Power Move** — team with the largest single-week power-rank rise.
- **Luckiest Win** / **Unluckiest Loss** — the winner with the most
  all-play losses that week / the loser with the most all-play wins that
  week (i.e. won or lost despite the underlying performance saying
  otherwise).
- **Standings Changes** — any team whose rank moved since the prior week's
  snapshot.

**Deliberately omitted:** "Best Player Performance" from the original
spec — it needs per-player weekly points, which aren't synced (same gap
as the roster-score caveat above). Left out rather than faked.

## Testing

Every function above has unit tests in `src/lib/analytics/*.test.ts`
(`npm run test`) — the kind of subtle error (an off-by-one in all-play
comparisons, a wrong normalization direction, a rank-delta sign flip)
that's hard to notice by eye but would be wrong for an entire season.
