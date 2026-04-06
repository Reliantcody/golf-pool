import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateParticipant,
  submitPicks,
  getMajorPicks,
} from "@/lib/db";
import { getMajorById, isSubmissionOpen } from "@/lib/majors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, majorId, players } = body as {
      name: string;
      majorId: string;
      players: string[];
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const major = getMajorById(majorId);
    if (!major) {
      return NextResponse.json({ error: "Invalid major" }, { status: 400 });
    }

    if (!isSubmissionOpen(major)) {
      return NextResponse.json(
        { error: "Submission deadline has passed" },
        { status: 400 }
      );
    }

    if (!Array.isArray(players) || players.length !== 5) {
      return NextResponse.json(
        { error: "You must pick exactly 5 players" },
        { status: 400 }
      );
    }

    const trimmedPlayers = players.map((p) => p.trim()).filter(Boolean);
    if (trimmedPlayers.length !== 5) {
      return NextResponse.json(
        { error: "All 5 player names are required" },
        { status: 400 }
      );
    }

    // Check for duplicates within the submission
    const unique = new Set(trimmedPlayers.map((p) => p.toLowerCase()));
    if (unique.size !== 5) {
      return NextResponse.json(
        { error: "Each player must be unique within your picks" },
        { status: 400 }
      );
    }

    const participantId = await getOrCreateParticipant(name.trim());
    const result = await submitPicks(participantId, majorId, trimmedPlayers);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/picks error:", err);
    return NextResponse.json(
      { error: "Server error — please try again" },
      { status: 500 }
    );
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
