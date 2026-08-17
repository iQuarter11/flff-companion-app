import { z } from "zod";

/**
 * Public env vars are validated eagerly (they're safe to read at import time).
 * Server-only secrets are validated lazily via getServerEnv() so a missing
 * optional integration (ESPN, YouTube) never crashes pages that don't use it.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL",
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ESPN_LEAGUE_ID: z.string().optional(),
  ESPN_SEASON: z.string().optional(),
  ESPN_SWID: z.string().optional(),
  ESPN_S2: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  SYNC_SECRET: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedPublicEnv: PublicEnv | null = null;
let cachedServerEnv: ServerEnv | null = null;

/**
 * Supabase URL/anon key are required for auth to function at all, so they're
 * validated the first time anything actually needs them (not at module load,
 * so pages that don't touch Supabase still render before setup is finished).
 */
export function getPublicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Missing or invalid Supabase public environment variables. " +
        "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. " +
        "See .env.example and the README Supabase setup section."
    );
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ESPN_LEAGUE_ID: process.env.ESPN_LEAGUE_ID,
    ESPN_SEASON: process.env.ESPN_SEASON,
    ESPN_SWID: process.env.ESPN_SWID,
    ESPN_S2: process.env.ESPN_S2,
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
    SYNC_SECRET: process.env.SYNC_SECRET,
  });

  if (!parsed.success) {
    throw new Error(`Invalid server environment variables: ${parsed.error.message}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** True once ESPN_SWID/ESPN_S2/ESPN_LEAGUE_ID are all present (Phase 2+). */
export function hasEspnCredentials(): boolean {
  const env = getServerEnv();
  return Boolean(env.ESPN_LEAGUE_ID && env.ESPN_SWID && env.ESPN_S2);
}
