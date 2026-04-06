import { MAJORS, getMajorStatus, getActiveMajor } from "@/lib/majors";
import { formatScore } from "@/lib/scoring";
import MajorTabs from "@/components/MajorTabs";

async function getLeaderboard() {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${base}/api/leaderboard`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await getLeaderboard();
  const standings = data?.standings ?? [];
  const activeMajor = getActiveMajor();

  return (
    <div className="space-y-8">
      {/* Major Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MAJORS.map((major) => {
          const status = getMajorStatus(major);
          const deadline = new Date(major.submissionDeadline);
          const now = new Date();
          const isOpen = now < deadline;

          return (
            <div
              key={major.id}
              className={`rounded-xl p-4 text-center border-2 ${
                status === "open"
                  ? "bg-green-50 border-green-500"
                  : status === "complete"
                  ? "bg-gray-100 border-gray-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                {status === "open"
                  ? "Live Now"
                  : status === "complete"
                  ? "Complete"
                  : isOpen
                  ? "Picks Open"
                  : "Picks Closed"}
              </p>
              <p className="font-bold text-green-900">{major.shortName}</p>
              <p className="text-xs text-gray-500 mt-1">
                {status === "upcoming"
                  ? `Deadline: ${deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : new Date(major.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
              </p>
            </div>
          );
        })}
      </div>

      {/* Rules summary */}
      <div className="bg-green-900 text-white rounded-xl p-4 text-sm">
        <p className="font-semibold mb-1">Pool Rules</p>
        <ul className="text-green-200 space-y-0.5 text-xs">
          <li>Pick 5 players per major · Score = best 4 of your 5 players</li>
          <li>If more than 1 player misses the cut → they each score the worst made-cut score in the field</li>
          <li>No repeating players across the 4 majors (20 unique picks total)</li>
          <li>Picks close Wednesday at 10 PM ET the night before each major</li>
        </ul>
      </div>

      {/* Overall Leaderboard */}
      <div>
        <h2 className="text-xl font-bold text-green-900 mb-4">
          Overall Standings
        </h2>

        {standings.length === 0 ? (
          <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
            <p className="text-4xl mb-3">⛳</p>
            <p className="font-semibold">No picks submitted yet</p>
            <p className="text-sm mt-1">
              Be the first to{" "}
              <a href="/picks" className="text-green-600 underline">
                enter your picks
              </a>
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-900 text-white">
                  <tr>
                    <th className="text-left px-4 py-3 w-12">#</th>
                    <th className="text-left px-4 py-3">Player</th>
                    {MAJORS.map((m) => (
                      <th key={m.id} className="text-center px-3 py-3 hidden md:table-cell">
                        {m.shortName}
                      </th>
                    ))}
                    <th className="text-center px-4 py-3 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map(
                    (
                      s: {
                        rank: number;
                        name: string;
                        majorResults: { majorScore: number | null }[];
                        totalScore: number | null;
                      },
                      i: number
                    ) => (
                      <tr
                        key={i}
                        className={`border-t ${
                          i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } hover:bg-green-50 transition-colors`}
                      >
                        <td className="px-4 py-3 font-bold text-gray-500">
                          {s.rank === 1 ? "🏆" : s.rank}
                        </td>
                        <td className="px-4 py-3 font-semibold">{s.name}</td>
                        {s.majorResults.map(
                          (
                            mr: { majorScore: number | null },
                            mi: number
                          ) => (
                            <td
                              key={mi}
                              className={`text-center px-3 py-3 hidden md:table-cell ${
                                mr.majorScore !== null
                                  ? mr.majorScore < 0
                                    ? "text-green-700 font-semibold"
                                    : mr.majorScore > 0
                                    ? "text-red-600"
                                    : ""
                                  : "text-gray-300"
                              }`}
                            >
                              {formatScore(mr.majorScore)}
                            </td>
                          )
                        )}
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
                          {formatScore(s.totalScore)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Picks by major */}
      {standings.length > 0 && <MajorTabs standings={standings} />}
    </div>
  );
}
