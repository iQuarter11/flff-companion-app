"use server";

import { revalidatePath } from "next/cache";
import { syncYoutubeVideos } from "@/lib/sync/youtube";

export type MediaSyncState = {
  error: string | null;
  summary: string | null;
};

/**
 * Any authenticated league member can refresh the video cache — unlike
 * ESPN sync, this touches no private credentials and costs nothing
 * sensitive to run.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by useActionState's (state, ...) signature
export async function refreshVideos(_prevState: MediaSyncState): Promise<MediaSyncState> {
  try {
    const results = await syncYoutubeVideos();
    revalidatePath("/media");
    revalidatePath("/");

    if (results.length === 0) {
      return { error: null, summary: "No enabled channels configured." };
    }

    const failed = results.filter((r) => !r.ok);
    const summary = `Refreshed ${results.length - failed.length}/${results.length} channels.`;
    return { error: failed.length > 0 ? failed.map((f) => `${f.channel}: ${f.error}`).join("; ") : null, summary };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error", summary: null };
  }
}
