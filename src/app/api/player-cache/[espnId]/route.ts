import { NextResponse } from "next/server";
import { getPlayerByEspnId } from "@/lib/player-cache/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ espnId: string }> }) {
  const { espnId } = await params;
  const id = Number(espnId);

  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid ESPN player ID" }, { status: 400 });
  }

  const player = await getPlayerByEspnId(id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(player, {
    headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
