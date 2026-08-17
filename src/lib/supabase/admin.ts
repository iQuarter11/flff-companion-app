import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely.
 *
 * Only use this for trusted server-side sync jobs (ESPN/Sleeper sync,
 * player-cache sync). Never use it to serve a request on behalf of a
 * specific user, and never import this module from client code — the
 * `server-only` import above makes any such mistake a build error.
 */
export function createAdminClient() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for admin/sync operations."
    );
  }

  return createSupabaseClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
