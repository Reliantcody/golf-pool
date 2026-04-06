import PicksForm from "@/components/PicksForm";
import { MAJORS, getActiveMajor, getMajorStatus, isSubmissionOpen } from "@/lib/majors";

async function getMajorPicksList(majorId: string) {
  try {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const res = await fetch(`${base}/api/picks?majorId=${majorId}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.picks ?? [];
  } catch {
    return [];
  }
}

export default async function PicksPage() {
  const activeMajor = getActiveMajor();

  if (!activeMajor) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">🏆</p>
        <h2 className="text-2xl font-bold text-green-900">Season Complete!</h2>
        <p className="text-gray-500 mt-2">All 4 majors for 2026 are done.</p>
        <a href="/" className="mt-4 inline-block text-green-700 underline">
          View final standings
        </a>
      </div>
    );
  }

  const status = getMajorStatus(activeMajor);
  const submissionOpen = isSubmissionOpen(activeMajor);
  const existingPicks = await getMajorPicksList(activeMajor.id);
  const deadline = new Date(activeMajor.submissionDeadline);
  const startDate = new Date(activeMajor.startDate);

  // Build list of players already picked for this major (to show transparency)
  const allPickedPlayers: string[] = existingPicks.flatMap(
    (e: { players: string[] }) => e.players
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Major header */}
      <div className="bg-green-900 text-white rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-300 text-sm font-semibold uppercase tracking-wide">
              Next Major
            </p>
            <h2 className="text-2xl font-bold mt-1">{activeMajor.name}</h2>
            <p className="text-green-300 text-sm mt-1">
              {startDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                submissionOpen
                  ? "bg-green-400 text-green-900"
                  : "bg-red-400 text-white"
              }`}
            >
              {submissionOpen ? "Picks Open" : "Picks Closed"}
            </span>
            {submissionOpen && (
              <p className="text-green-300 text-xs mt-2">
                Deadline:{" "}
                {deadline.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rules reminder */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <p className="font-semibold mb-1">Remember</p>
        <ul className="space-y-0.5 text-xs">
          <li>• Pick exactly 5 players</li>
          <li>• You cannot reuse a player you picked in a previous major this year</li>
          <li>• Your score = best 4 of your 5 players (lowest total score wins)</li>
          <li>• If more than 1 of your players misses the cut, they score the worst made-cut score</li>
        </ul>
      </div>

      {submissionOpen ? (
        <PicksForm majorId={activeMajor.id} majorName={activeMajor.name} />
      ) : (
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="font-semibold text-gray-700">Submission window is closed</p>
          <p className="text-sm text-gray-500 mt-1">
            Picks closed on{" "}
            {deadline.toLocaleString("en-US", {
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            })}
          </p>
        </div>
      )}

      {/* Who has submitted */}
      {existingPicks.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-green-900 mb-3">
            Submitted Picks ({existingPicks.length})
          </h3>
          <div className="space-y-3">
            {existingPicks.map(
              (entry: { participantName: string; players: string[] }, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold text-sm flex-shrink-0">
                    {entry.participantName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{entry.participantName}</p>
                    <p className="text-xs text-gray-500">
                      {entry.players.join(" · ")}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
