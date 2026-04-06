import { NextRequest, NextResponse } from "next/server";
import { fetchLeaderboard } from "@/lib/espn";
import { getMajorById } from "@/lib/majors";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const majorId = searchParams.get("majorId");

  if (!majorId) {
    return NextResponse.json({ error: "majorId required" }, { status: 400 });
  }

  const major = getMajorById(majorId);
  if (!major) {
    return NextResponse.json({ error: "Invalid major" }, { status: 400 });
  }

  try {
    const leaderboard = await fetchLeaderboard(major);
    if (!leaderboard) {
      return NextResponse.json(
        { leaderboard: null, message: "No ESPN data available yet" },
        { status: 200 }
      );
    }
    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error("GET /api/scores error:", err);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
