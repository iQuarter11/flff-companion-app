"use client";

import { useState, useTransition } from "react";
import { addToTradeBlock, removeFromTradeBlock } from "@/app/(app)/trades/actions";
import { cn } from "@/lib/utils";

export function TradeBlockToggle({
  playerIdentityCacheId,
  initiallyOnBlock,
}: {
  playerIdentityCacheId: number | null;
  initiallyOnBlock: boolean;
}) {
  const [onBlock, setOnBlock] = useState(initiallyOnBlock);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (playerIdentityCacheId === null) {
    return <span className="text-xs text-muted">Not tradeable</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = onBlock
              ? await removeFromTradeBlock(playerIdentityCacheId)
              : await addToTradeBlock(playerIdentityCacheId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError(null);
            setOnBlock(!onBlock);
          });
        }}
        className={cn(
          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
          onBlock ? "border-red-500/30 text-red-500 hover:bg-red-500/10" : "border-accent/40 text-accent hover:bg-accent/10"
        )}
      >
        {onBlock ? "Remove from Trade Block" : "Add to Trade Block"}
      </button>
      {error ? <span className="text-xs text-red-500">{error}</span> : null}
    </div>
  );
}
