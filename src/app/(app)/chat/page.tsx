import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentMessages } from "@/lib/chat/queries";
import { ChatPanel } from "@/components/chat/chat-panel";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const messages = await getRecentMessages();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">League Chat</h1>
        <p className="mt-1 text-sm text-muted">Live, league-wide. Messages show your display name from /profile.</p>
      </div>
      <ChatPanel initialMessages={messages} currentUserId={user.id} />
    </div>
  );
}
