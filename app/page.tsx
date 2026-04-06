import { MAJORS, getMajorStatus, isSubmissionOpen } from "@/lib/majors";
import { formatScore } from "@/lib/scoring";
import { getAllParticipantsWithPicks } from "@/lib/db";
import { fetchLeaderboard } from "@/lib/espn";
import { scoreMajor } from "@/lib/scoring";
import MajorTabs from "@/components/MajorTabs";

export const dynamic = "force-dynamic"; // always fresh — no stale caching

interface MajorResult {
  majorId: string;
  majorScore: number | null;
  playerResults: {
    name: string;
    espnName: string | null;
    score: number | null;
    madeCut: boolean;
    adjusted: boolean;
    notStarted: boolean;
  }[];
  missedCutCount: number;
  isComplete: boolean;
  currentRound: number;
}

interface Standing {
  participantId: number;
  name: string;
  majorResults: MajorResult[];
  totalScore: number | null;
  rank: number;
}

async function buildStandings(): Promise<Standing[]> {
  let participants: Awaited<ReturnType<typeof getAllParticipantsWithPicks>> = [];
  try {
    participants = await getAllParticipantsWithPicks();
  } catch {
    return [];
  }

  // Fetch ESPN leaderboards for active/complete majors
  const leaderboards: Record<string, Awaited<ReturnType<typeof fetchLeaderboard>>> = {};
  for (const major of MAJORS) {
    const status = getMajorStatus(major);
    if (status === "open" || status === "complete") {
      try {
        leaderboards[major.id] = await fetchLeaderboard(major);
      } catch {
        leaderboards[major.id] = null;
      }
    }
  }

  const standings: Standing[] = participants.map((participant) => {
    const majorResults: MajorResult[] = MAJORS.map((major) => {
      const picks = participant.picks[major.id] ?? [];
      const lb = leaderboards[major.id];
      const status = getMajorStatus(major);

      if (picks.length === 0) {
        return {
          majorId: major.id,
          playerResults: [],
          missedCutCount: 0,
          majorScore: null,
          isComplete: false,
          currentRound: 0,
        };
      }

      // Tournament not started yet — show picks, no score
      if (status === "upcoming" || !lb) {
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

    const totalScore =
      completedScores.length > 0
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

  // Rank by total score (lower = better); unscored go to the bottom
  const withScore = standings.filter((s) => s.totalScore !== null);
  const withoutScore = standings.filter((s) => s.totalScore === null);
  withScore.sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));
  let rank = 1;
  withScore.forEach((s, i) => {
    if (i > 0 && s.totalScore !== withScore[i - 1].totalScore) rank = i + 1;
    s.rank = rank;
  });
  withoutScore.forEach((s) => { s.rank = withScore.length + 1; });

  return [...withScore, ...withoutScore];
}

export default async function HomePage() {
  const standings = await buildStandings();

  return (
    <div className="space-y-8">
      {/* Major status cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MAJORS.map((major) => {
          const status = getMajorStatus(major);
          const submissionOpen = isSubmissionOpen(major);
          const deadline = new Date(major.submissionDeadline);

          return (
            <div
              key={major.id}
              className={`rounded-xl p-4 text-center border-2 ${
                status === "open"
                  ? "bg-green-50 border-green-500"
                  : status === "complete"
                  ? "bg-gray-100 border-gray-300"
                  : submissionOpen
                  ? "bg-yellow-50 border-yellow-400"
                  : "bg-white border-gray-200"
              }`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {status === "open"
                  ? "Live Now"
                  : status === "complete"
                  ? "Complete"
                  : submissionOpen
                  ? "Picks Open"
                  : "Picks Closed"}
              </p>
              <p className="font-bold text-green-900">{major.shortName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {status === "upcoming"
                  ? `Deadline: ${deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : new Date(major.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Rules */}
      <div className="bg-green-900 text-white rounded-xl p-4 text-sm">
        <p className="font-semibold mb-1">Pool Rules</p>
        <ul className="text-green-200 space-y-0.5 text-xs">
          <li>Pick 5 players per major · Score = best 4 of your 5 players (lowest wins)</li>
          <li>If more than 1 player misses the cut → replaced by worst made-cut score in the field</li>
          <li>No repeating players across the 4 majors (20 unique picks total)</li>
          <li>Picks close Wednesday 10 PM ET the night before each major</li>
        </ul>
      </div>

      {/* Overall standings */}
      <div>
        <h2 className="text-xl font-bold text-green-900 mb-4">Overall Standings</h2>
        {standings.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">⛳</p>
            <p className="font-semibold">No picks submitted yet</p>
            <p className="text-sm mt-1">
              Be the first to{" "}
              <a href="/picks" className="text-green-600 underline">enter your picks</a>
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-900 text-white">
                  <tr>
                    <th className="text-left px-4 py-3 w-10">#</th>
                    <th className="text-left px-4 py-3">Participant</th>
                    {MAJORS.map((m) => (
                      <th key={m.id} className="text-center px-3 py-3 hidden md:table-cell">
                        {m.shortName}
                      </th>
                    ))}
                    <th className="text-center px-4 py-3 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr
                      key={s.participantId}
                      className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-green-50 transition-colors`}
                    >
                      <td className="px-4 py-3 font-bold text-gray-500">
                        {s.totalScore !== null && s.rank === 1 ? "🏆" : s.rank}
                      </td>
                      <td className="px-4 py-3 font-semibold">{s.name}</td>
                      {s.majorResults.map((mr, mi) => (
                        <td
                          key={mi}
                          className={`text-center px-3 py-3 hidden md:table-cell ${
                            mr.majorScore !== null
                              ? mr.majorScore < 0
                                ? "text-green-700 font-semibold"
                                : mr.majorScore > 0
                                ? "text-red-600"
                                : ""
                              : mr.playerResults.length > 0
                              ? "text-gray-400"
                              : "text-gray-200"
                          }`}
                        >
                          {mr.majorScore !== null
                            ? formatScore(mr.majorScore)
                            : mr.playerResults.length > 0
                            ? "–"    // picks in but no score yet
                            : "·"}  // no picks
                        </td>
                      ))}
                      <td
                        className={`text-center px-4 py-3 font-bold text-base ${
                          s.totalScore !== null
                            ? s.totalScore < 0
                              ? "text-green-700"
                              : s.totalScore > 0
                              ? "text-red-600"
                              : ""
                            : "text-gray-300"
                        }`}
                      >
                        {s.totalScore !== null ? formatScore(s.totalScore) : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Picks breakdown by major */}
      {standings.length > 0 && <MajorTabs standings={standings} />}
    </div>
  );
}
