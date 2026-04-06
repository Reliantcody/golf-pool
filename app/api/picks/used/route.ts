import { NextRequest, NextResponse } from "next/server";
import { getUsedPlayersByName } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const majorId = searchParams.get("majorId");

  if (!name || !majorId) {
    return NextResponse.json({ usedPlayers: [] });
  }

  try {
    const usedPlayers = await getUsedPlayersByName(name, majorId);
    return NextResponse.json({ usedPlayers });
  } catch {
    return NextResponse.json({ usedPlayers: [] });
  }
}
