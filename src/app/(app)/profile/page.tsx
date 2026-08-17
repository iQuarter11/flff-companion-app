import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClaimableTeams } from "@/lib/league/queries";
import { ProfileForm } from "./profile-form";

export type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  espn_team_id: number | null;
  avatar_url: string | null;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, espn_team_id, avatar_url")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface p-6 text-sm text-muted">
        Couldn&apos;t load your profile. If this is a fresh Supabase project, make sure migration
        0001_profiles.sql has been run.
      </div>
    );
  }

  const claimableTeams = await getClaimableTeams(user.id);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 text-sm text-muted">{user.email}</p>

      <div className="mt-6 rounded-xl border border-surface-border bg-surface p-6">
        <ProfileForm profile={profile} claimableTeams={claimableTeams} />
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-surface-border bg-surface p-4 text-sm">
        <a href="/players/watchlist" className="font-medium underline underline-offset-4">
          View your watchlist
        </a>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-muted hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
        Achievements will appear here starting in a later phase.
      </div>
    </div>
  );
}
