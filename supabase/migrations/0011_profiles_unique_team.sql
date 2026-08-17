-- Each ESPN fantasy team should be claimed by at most one profile.
-- Postgres unique constraints treat NULLs as distinct from each other, so
-- any number of profiles can still have espn_team_id = null (unclaimed).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_espn_team_id_unique'
  ) then
    alter table public.profiles
      add constraint profiles_espn_team_id_unique unique (espn_team_id);
  end if;
end $$;
