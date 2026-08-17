import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  id: number;
  userId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

const FALLBACK_NAME = "League member";

export async function getRecentMessages(limit = 50): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, user_id, body, created_at, profiles(display_name, username)")
    .order("created_at", { ascending: false })
    .limit(limit);

  type Row = {
    id: number;
    user_id: string;
    body: string;
    created_at: string;
    profiles: { display_name: string | null; username: string | null } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      senderName: row.profiles?.display_name ?? row.profiles?.username ?? FALLBACK_NAME,
      body: row.body,
      createdAt: row.created_at,
    }))
    .reverse();
}
