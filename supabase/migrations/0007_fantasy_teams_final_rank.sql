-- ESPN's final standing for a completed season (team.rankCalculatedFinal /
-- team.rankFinal in the raw response) — the authoritative source for who
-- won the league, used by the Champions page. 0/absent for an in-progress
-- season.
alter table public.fantasy_teams add column if not exists final_rank integer;
