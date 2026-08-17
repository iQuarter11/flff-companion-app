"use server";

import { createClient } from "@/lib/supabase/server";

export type SendMessageState = {
  error: string | null;
};

/**
 * The message's author is always the authenticated session's user_id —
 * never a client-supplied name, so a user can't post as anyone else. RLS
 * (0008_chat.sql) enforces the same constraint at the database layer.
 */
export async function sendMessage(body: string): Promise<SendMessageState> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Message can't be empty." };
  if (trimmed.length > 2000) return { error: "Message is too long (2000 characters max)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("chat_messages").insert({ user_id: user.id, body: trimmed });
  if (error) return { error: error.message };

  return { error: null };
}
