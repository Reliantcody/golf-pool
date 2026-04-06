import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getActiveMajor, getMajorStatus, isSubmissionOpen } from "@/lib/majors";
import { getMajorPicks } from "@/lib/db";
import PicksForm from "@/components/PicksForm";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function PicksPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/picks");

  const activeMajor = getActiveMajor();

  if (!activeMajor) {
    return (
      <div className="text-center py-16">
        <p className="text-5xl mb-4">🏆</p>
        <h2 className="text-2xl font-bold text-green-900">Season Complete!</h2>
        <p className="text-gray-500 mt-2">All 4 majors for 2026 are done.</p>
        <a href="/" className="mt-4 inline-block text-green-700 underline">View final standings</a>
      </div>
    );
  }

  const status = getMajorStatus(activeMajor);
  const submissionOpen = isSubmissionOpen(activeMajor);
  const allPicks = await getMajorPicks(activeMajor.id);
  const deadline = new Date(activeMajor.submissionDeadline);
  const startDate = new Date(activeMajor.startDate);

  const myEntry = allPicks.find(
    (e) => e.participantName.toLowerCase() === session.name.toLowerCase()
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Major header */}
      <div className="bg-green-900 text-white rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-green-300 text-sm font-semibold uppercase tracking-wide">
              {status === "open" ? "In Progress" : status === "complete" ? "Complete" : "Next Major"}
            </p>
            <h2 className="text-2xl font-bold mt-1">{activeMajor.name}</h2>
            <p className="text-green-300 text-sm mt-1">
              {startDate.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            submissionOpen ? "bg-green-400 text-green-900" : "bg-red-400 text-white"
          }`}>
            {submissionOpen ? "Picks Open" : "Picks Closed"}
          </span>
        </div>
        {submissionOpen && (
          <p className="text-green-300 text-xs mt-3">
            Deadline: {deadline.toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
            })}
          </p>
        )}
      </div>

      {/* Logged-in banner */}
      <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm">
            {session.name[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{session.name}</p>
            <p className="text-xs text-gray-400">Logged in</p>
          </div>
        </div>
        <LogoutButton />
      </div>

      {/* Rules */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <p className="font-semibold mb-1">Remember</p>
        <ul className="space-y-0.5 text-xs">
          <li>• Pick exactly 5 players · Score = best 4 of your 5</li>
          <li>• Cannot reuse a player from a previous major this year</li>
          <li>• If more than 1 player misses the cut, they score the worst made-cut score</li>
        </ul>
      </div>

      {/* Picks form or closed message */}
      {submissionOpen ? (
        <PicksForm
          majorId={activeMajor.id}
          majorName={activeMajor.name}
          participantId={session.id}
          participantName={session.name}
          existingPicks={myEntry?.players ?? []}
        />
      ) : (
        <div className="bg-white rounded-xl border p-6">
          <p className="text-3xl mb-2 text-center">🔒</p>
          <p className="font-semibold text-gray-700 text-center">Submission window is closed</p>
          {myEntry && (
            <div className="mt-4 bg-green-50 rounded-lg p-3 text-sm">
              <p className="font-semibold text-green-800 mb-1">Your picks:</p>
              <ul className="text-green-700 space-y-0.5">
                {myEntry.players.map((p, i) => <li key={i}>{i + 1}. {p}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Who has submitted */}
      {allPicks.length > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <h3 className="font-semibold text-green-900 mb-3">
            Submitted ({allPicks.length})
            {status === "upcoming" && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                · picks revealed when the tournament begins
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {allPicks.map((entry, i) => {
              const isMe = entry.participantName.toLowerCase() === session.name.toLowerCase();
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    isMe ? "bg-green-700 text-white" : "bg-green-100 text-green-800"
                  }`}>
                    {entry.participantName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {entry.participantName}
                      {isMe && <span className="ml-1 text-green-600 text-xs">(you)</span>}
                    </p>
                    {/* Only show picks once tournament has started */}
                    {status !== "upcoming" && (
                      <p className="text-xs text-gray-500 truncate">
                        {entry.players.join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-green-600 font-semibold flex-shrink-0">✓</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
