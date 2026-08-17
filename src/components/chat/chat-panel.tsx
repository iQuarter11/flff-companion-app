"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/(app)/chat/actions";
import type { ChatMessage } from "@/lib/chat/queries";

const FALLBACK_NAME = "League member";

export function ChatPanel({
  initialMessages,
  currentUserId,
}: {
  initialMessages: ChatMessage[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameCache = useRef(new Map<string, string>(initialMessages.map((m) => [m.userId, m.senderName])));
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("chat_messages_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const row = payload.new as { id: number; user_id: string; body: string; created_at: string };

          const cached = nameCache.current.get(row.user_id);
          let senderName: string = cached ?? FALLBACK_NAME;
          if (!cached) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, username")
              .eq("id", row.user_id)
              .maybeSingle();
            senderName = (profile?.display_name || profile?.username || FALLBACK_NAME) as string;
            nameCache.current.set(row.user_id, senderName);
          }

          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [...prev, { id: row.id, userId: row.user_id, senderName, body: row.body, createdAt: row.created_at }]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-surface-border bg-surface">
      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted">No messages yet — say hello.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message) => {
              const isMe = message.userId === currentUserId;
              return (
                <li key={message.id} className={isMe ? "text-right" : "text-left"}>
                  <p className="text-xs text-muted">
                    {message.senderName} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p
                    className={
                      "mt-0.5 inline-block max-w-[85%] rounded-lg px-3 py-1.5 text-sm " +
                      (isMe ? "bg-accent text-accent-foreground" : "bg-background")
                    }
                  >
                    {message.body}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t border-surface-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft;
          if (!body.trim()) return;
          setDraft("");
          startTransition(async () => {
            const result = await sendMessage(body);
            setError(result.error);
          });
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message the league…"
          maxLength={2000}
          className="flex-1 rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error ? <p className="px-3 pb-2 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
