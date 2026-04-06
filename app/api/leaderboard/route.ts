import { NextResponse } from "next/server";
import { getAllParticipantsWithPicks } from "@/lib/db";
import { MAJORS, getMajorStatus } from "@/lib/majors";
import { fetchLeaderboard } from "@/lib/espn";
import { scoreMajor, rankStandings, ParticipantStanding, MajorResult } from "@/lib/scoring";

export const revalidate = 300; // cache 5 minutes

export async function GET() {
  try {
    const participants = await getAllParticipantsWithPicks();

    // Fetch leaderboards for all majors that have started
    const leaderboards: Record<string, Awaited<ReturnType<typeof fetchLeaderboard>>> = {};
    for (const major of MAJORS) {
      const status = getMajorStatus(major);
      if (status === "open" || status === "complete") {
        leaderboards[major.id] = await fetchLeaderboard(major);
      }
    }

    const standings: ParticipantStanding[] = participants.map((participant) => {
      const majorResults: MajorResult[] = MAJORS.map((major) => {
        const picks = participant.picks[major.id] ?? [];
        const lb = leaderboards[major.id];
        const status = getMajorStatus(major);

        if (status === "upcoming" || !lb || picks.length === 0) {
          return {
            majorId: major.id,
            playerResults: picks.map((p) => ({
              name: p,
              espnName: null,
              score: null,
              madeCut: false,
              adjusted: false,
              notStarted: true,
            })),
            missedCutCount: 0,
            majorScore: null,
            isComplete: false,
            currentRound: 0,
          };
        }

        const result = scoreMajor(picks, lb);
        return { ...result, majorId: major.id };
      });

      const completedScores = majorResults
        .filter((r) => r.majorScore !== null)
        .map((r) => r.majorScore!);

      const totalScore = completedScores.length > 0
        ? completedScores.reduce((a, b) => a + b, 0)
        : null;

      return {
        participantId: participant.id,
        name: participant.name,
        majorResults,
        totalScore,
        rank: 0,
      };
    });

    const ranked = rankStandings(standings);
    return NextResponse.json({ standings: ranked, majors: MAJORS });
  } catch (err) {
    console.error("GET /api/leaderboard error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
