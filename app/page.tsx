import { MAJORS, getMajorStatus, isSubmissionOpen } from "@/lib/majors";
import { formatScore } from "@/lib/scoring";
import { getAllParticipantsWithPicks } from "@/lib/db";
import { fetchLeaderboard, getMockLeaderboard } from "@/lib/espn";
import { scoreMajor } from "@/lib/scoring";
import MajorTabs from "@/components/MajorTabs";

export const dynamic = "force-dynamic";

interface MajorResult {
  majorId: string;
  majorScore: number | null;
  playerResults: {
    name: string; espnName: string | null; score: number | null;
    madeCut: boolean; adjusted: boolean; notStarted: boolean;
  }[];
  missedCutCount: number;
  isComplete: boolean;
  currentRound: number;
}
interface Standing {
  participantId: number; name: string;
  majorResults: MajorResult[]; totalScore: number | null; rank: number;
}

async function buildStandings(preview: boolean): Promise<{ standings: Standing[]; previewMode: boolean }> {
  let participants: Awaited<ReturnType<typeof getAllParticipantsWithPicks>> = [];
  try { participants = await getAllParticipantsWithPicks(); } catch { return { standings: [], previewMode: false }; }

  const leaderboards: Record<string, Awaited<ReturnType<typeof fetchLeaderboard>>> = {};
  for (const major of MAJORS) {
    const status = getMajorStatus(major);
    if (preview && major.id === "masters-2026") {
      leaderboards[major.id] = getMockLeaderboard();
    } else if (status === "open" || status === "complete") {
      try { leaderboards[major.id] = await fetchLeaderboard(major); } catch { leaderboards[major.id] = null; }
    }
  }

  const standings: Standing[] = participants.map((participant) => {
    const majorResults: MajorResult[] = MAJORS.map((major) => {
      const picks = participant.picks[major.id] ?? [];
      const lb = leaderboards[major.id];
      const status = preview && major.id === "masters-2026" ? "open" : getMajorStatus(major);

      if (picks.length === 0) {
        return { majorId: major.id, playerResults: [], missedCutCount: 0, majorScore: null, isComplete: false, currentRound: 0 };
      }
      if (status === "upcoming" || !lb) {
        return {
          majorId: major.id,
          playerResults: picks.map((p) => ({ name: p, espnName: null, score: null, madeCut: false, adjusted: false, notStarted: true })),
          missedCutCount: 0, majorScore: null, isComplete: false, currentRound: 0,
        };
      }
      const result = scoreMajor(picks, lb);
      return { ...result, majorId: major.id };
    });

    const completedScores = majorResults.filter((r) => r.majorScore !== null).map((r) => r.majorScore!);
    const totalScore = completedScores.length > 0 ? completedScores.reduce((a, b) => a + b, 0) : null;
    return { participantId: participant.id, name: participant.name, majorResults, totalScore, rank: 0 };
  });

  const withScore = standings.filter((s) => s.totalScore !== null);
  const withoutScore = standings.filter((s) => s.totalScore === null);
  withScore.sort((a, b) => (a.totalScore ?? 0) - (b.totalScore ?? 0));
  let rank = 1;
  withScore.forEach((s, i) => { if (i > 0 && s.totalScore !== withScore[i - 1].totalScore) rank = i + 1; s.rank = rank; });
  withoutScore.forEach((s) => { s.rank = withScore.length + 1; });

  return { standings: [...withScore, ...withoutScore], previewMode: preview };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const params = await searchParams;
  const preview = params.preview === "1";
  const { standings, previewMode } = await buildStandings(preview);

  return (
    <div className="space-y-8">
      {/* Preview banner */}
      {previewMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-amber-600 font-bold text-sm">⚠ Preview Mode</span>
          <span className="text-amber-700 text-sm">Showing simulated Masters scores to test the scoring logic.</span>
          <a href="/" className="ml-auto text-xs text-amber-600 underline">Exit preview</a>
        </div>
      )}

      {/* Major timeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MAJORS.map((major, i) => {
          const status = getMajorStatus(major);
          const submissionOpen = isSubmissionOpen(major);
          const deadline = new Date(major.submissionDeadline);
          const start = new Date(major.startDate);

          return (
            <div key={major.id} className={`rounded-2xl p-4 border-2 text-center transition-all ${
              status === "open" ? "bg-green-50 border-green-500 shadow-md"
              : status === "complete" ? "bg-gray-100 border-gray-300 opacity-70"
              : submissionOpen ? "bg-amber-50 border-amber-400"
              : "bg-white border-gray-200"
            }`}>
              <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                status === "open" ? "text-green-600"
                : status === "complete" ? "text-gray-400"
                : submissionOpen ? "text-amber-600"
                : "text-gray-400"
              }`}>
                {status === "open" ? "● Live" : status === "complete" ? "✓ Final" : submissionOpen ? "Picks Open" : "Picks Closed"}
              </div>
              <p className="font-bold text-gray-900 text-sm">{major.shortName}</p>
              <p className="text-xs text-gray-400 mt-1">
                {status === "upcoming"
                  ? `Deadline ${deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              <div className={`mt-2 text-xs font-bold text-gray-400`}>#{i + 1} of 4</div>
            </div>
          );
        })}
      </div>

      {/* How Scoring Works */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="bg-[#0a2b1e] px-6 py-4">
          <h2 className="text-white font-bold text-lg tracking-tight">How Scoring Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          <div className="p-5">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl mb-3">🏌️</div>
            <p className="font-bold text-gray-900 mb-1">Pick 6 Players</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Choose 6 golfers for each major. You can only use each player <strong>once</strong> across all 4 majors — 24 unique picks total.
            </p>
          </div>
          <div className="p-5">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl mb-3">📋</div>
            <p className="font-bold text-gray-900 mb-1">Score Your Best 4</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your major score = your <strong>4 best finishes</strong> added together (total over/under par). Your 2 worst players are dropped each major.
            </p>
          </div>
          <div className="p-5">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl mb-3">✂️</div>
            <p className="font-bold text-gray-900 mb-1">Missed Cut Rule</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              If <strong>fewer than 4</strong> of your players make the cut, every missed-cut player automatically scores the <strong>worst score</strong> of any player who did make the cut.
            </p>
          </div>
          <div className="p-5">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-xl mb-3">🏆</div>
            <p className="font-bold text-gray-900 mb-1">Lowest Score Wins</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Add up your scores across all 4 majors. <strong>Lowest total</strong> (most under par) wins. Just like real golf.
            </p>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-3 border-t">
          <p className="text-xs text-gray-400">
            Example: Your 6 players finish at <span className="font-mono">-8, -5, -3, -1, +2, MC</span> → drop <span className="font-mono">+2</span> and <span className="font-mono">MC</span> (2 worst) → your major score is <span className="font-mono font-semibold text-green-700">-17</span>
          </p>
        </div>
      </div>

      {/* Overall Standings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Overall Standings</h2>
          {standings.some(s => s.totalScore !== null) && (
            <span className="text-xs text-gray-400">Lower score = better</span>
          )}
        </div>

        {standings.length === 0 ? (
          <div className="bg-white rounded-2xl border p-10 text-center">
            <div className="text-5xl mb-3">⛳</div>
            <p className="font-semibold text-gray-700">No picks submitted yet</p>
            <p className="text-sm text-gray-400 mt-1">
              <a href="/picks" className="text-green-700 underline">Enter your picks</a> to get on the board
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0a2b1e] text-white">
                    <th className="text-left px-5 py-4 w-10 font-semibold">#</th>
                    <th className="text-left px-4 py-4 font-semibold">Participant</th>
                    {MAJORS.map((m) => (
                      <th key={m.id} className="text-center px-3 py-4 font-semibold hidden md:table-cell text-green-300 text-xs">
                        {m.shortName}
                      </th>
                    ))}
                    <th className="text-center px-5 py-4 font-bold text-yellow-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.participantId} className={`border-t border-gray-100 transition-colors hover:bg-green-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-5 py-4">
                        {s.totalScore !== null && s.rank === 1
                          ? <span className="text-lg">🏆</span>
                          : s.totalScore !== null && s.rank === 2
                          ? <span className="text-base">🥈</span>
                          : s.totalScore !== null && s.rank === 3
                          ? <span className="text-base">🥉</span>
                          : <span className="font-bold text-gray-400 text-sm">{s.rank}</span>}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-800">{s.name}</td>
                      {s.majorResults.map((mr, mi) => (
                        <td key={mi} className={`text-center px-3 py-4 hidden md:table-cell font-mono text-sm ${
                          mr.majorScore !== null
                            ? mr.majorScore < 0 ? "text-green-700 font-bold" : mr.majorScore > 0 ? "text-red-500" : "text-gray-600"
                            : mr.playerResults.length > 0 ? "text-gray-400" : "text-gray-200"
                        }`}>
                          {mr.majorScore !== null ? formatScore(mr.majorScore) : mr.playerResults.length > 0 ? "–" : "·"}
                        </td>
                      ))}
                      <td className={`text-center px-5 py-4 font-bold text-base font-mono ${
                        s.totalScore !== null
                          ? s.totalScore < 0 ? "text-green-700" : s.totalScore > 0 ? "text-red-500" : "text-gray-700"
                          : "text-gray-300"
                      }`}>
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

      {/* Picks breakdown */}
      {standings.length > 0 && <MajorTabs standings={standings} previewMode={previewMode} />}
    </div>
  );
}
