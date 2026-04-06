import { NextRequest, NextResponse } from "next/server";
import { submitPicks, getMajorPicks } from "@/lib/db";
import { getMajorById, isSubmissionOpen } from "@/lib/majors";
import { getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // Must be logged in
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Please log in to submit picks." }, { status: 401 });
    }

    const body = await req.json();
    const { majorId, players } = body as { majorId: string; players: string[] };

    const major = getMajorById(majorId);
    if (!major) {
      return NextResponse.json({ error: "Invalid major" }, { status: 400 });
    }
    if (!isSubmissionOpen(major)) {
      return NextResponse.json({ error: "Submission deadline has passed" }, { status: 400 });
    }
    if (!Array.isArray(players) || players.length !== 6) {
      return NextResponse.json({ error: "You must pick exactly 6 players" }, { status: 400 });
    }

    const trimmedPlayers = players.map((p) => p.trim()).filter(Boolean);
    if (trimmedPlayers.length !== 6) {
      return NextResponse.json({ error: "All 6 player names are required" }, { status: 400 });
    }

    const unique = new Set(trimmedPlayers.map((p) => p.toLowerCase()));
    if (unique.size !== 5) {
      return NextResponse.json({ error: "Each player must be unique" }, { status: 400 });
    }

    // Use the session's participant ID — can only submit for yourself
    const result = await submitPicks(session.id, majorId, trimmedPlayers);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/picks error:", err);
    return NextResponse.json({ error: "Server error — please try again" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const majorId = searchParams.get("majorId");
  if (!majorId) {
    return NextResponse.json({ error: "majorId required" }, { status: 400 });
  }
  try {
    const picks = await getMajorPicks(majorId);
    return NextResponse.json({ picks });
  } catch (err) {
    console.error("GET /api/picks error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
