"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the Trade Block page live: subscribes to trade_block changes and
 * re-fetches the Server Component tree when anyone (including another
 * browser tab) adds or removes an entry. Deliberately simple — refetching
 * via router.refresh() instead of hand-rolling client-side state that
 * would duplicate the server-rendered list's logic.
 */
export function TradeBlockRealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("trade_block_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trade_block" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
