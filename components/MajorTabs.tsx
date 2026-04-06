"use client";
import { useState } from "react";
import { MAJORS, getMajorStatus } from "@/lib/majors";
import { formatScore } from "@/lib/scoring";

interface PlayerResult {
  name: string; espnName: string | null; score: number | null;
  madeCut: boolean; adjusted: boolean; notStarted: boolean;
}
interface MajorResult {
  majorId: string; playerResults: PlayerResult[];
  missedCutCount: number; majorScore: number | null; isComplete: boolean;
}
interface Standing {
  name: string; rank: number; majorResults: MajorResult[]; totalScore: number | null;
}

export default function MajorTabs({ standings, previewMode }: { standings: Standing[]; previewMode?: boolean }) {
  const [activeTab, setActiveTab] = useState(0);

  const activeMajor = MAJORS[activeTab];
  const activeMajorStatus = getMajorStatus(activeMajor);
  const picksHidden = activeMajorStatus === "upcoming" && !previewMode;

  const majorStandings = standings
    .map((s) => ({ ...s, majorResult: s.majorResults[activeTab] }))
    .sort((a, b) => {
      const sa = a.majorResult?.majorScore, sb = b.majorResult?.majorScore;
      if (sa === null && sb === null) return 0;
      if (sa === null) return 1;
      if (sb === null) return -1;
      return sa - sb;
    });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Picks by Major</h2>

      {/* Tab buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {MAJORS.map((m, i) => {
          const status = getMajorStatus(m);
          return (
            <button
              key={m.id}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                i === activeTab
                  ? "bg-[#0a2b1e] text-white border-[#0a2b1e] shadow"
                  : "bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-800"
              }`}
            >
              {m.shortName}
              {status === "open" && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {picksHidden && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 text-xs text-amber-700 font-medium">
            🔒 Picks are hidden until {activeMajor.name} begins
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0a2b1e] text-white">
                <th className="text-left px-5 py-3 w-10 font-semibold text-green-300">#</th>
                <th className="text-left px-4 py-3 font-semibold">Participant</th>
                <th className="text-left px-4 py-3 font-semibold">{picksHidden ? "Status" : "Players"}</th>
                <th className="text-center px-5 py-3 font-semibold text-yellow-400">Score</th>
              </tr>
            </thead>
            <tbody>
              {majorStandings.map((s, i) => {
                const mr = s.majorResult;
                const hasPicks = mr?.playerResults?.length > 0;

                return (
                  <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                    <td className="px-5 py-3 font-bold text-gray-400 text-sm">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{s.name}</td>
                    <td className="px-4 py-3">
                      {picksHidden ? (
                        hasPicks
                          ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">✓ Submitted</span>
                          : <span className="text-gray-400 text-xs italic">Not submitted</span>
                      ) : hasPicks ? (
                        <ul className="space-y-1">
                          {mr.playerResults.map((p: PlayerResult, pi: number) => (
                            <li key={pi} className="flex items-center gap-2 text-xs">
                              <span className={
                                p.adjusted ? "text-orange-500 line-through"
                                : !p.madeCut && !p.notStarted ? "text-red-400 line-through"
                                : "text-gray-700"
                              }>
                                {p.espnName ?? p.name}
                              </span>
                              {!p.notStarted && p.score !== null && (
                                <span className={`font-mono font-semibold ${
                                  p.score < 0 ? "text-green-700" : p.score > 0 ? "text-red-500" : "text-gray-500"
                                }`}>
                                  {formatScore(p.score)}
                                  {p.adjusted && <span className="text-orange-400 ml-0.5 text-[10px]" title="Replaced: >1 missed cut">WMC</span>}
                                  {!p.madeCut && !p.adjusted && <span className="text-gray-400 ml-0.5 text-[10px]">MC</span>}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No picks</span>
                      )}
                    </td>
                    <td className={`text-center px-5 py-3 font-bold font-mono ${
                      mr?.majorScore !== null
                        ? (mr.majorScore ?? 0) < 0 ? "text-green-700" : (mr.majorScore ?? 0) > 0 ? "text-red-500" : "text-gray-600"
                        : "text-gray-300"
                    }`}>
                      {mr?.majorScore !== null ? formatScore(mr.majorScore) : "–"}
                    </td>
                  </tr>
                );
              })}
              {majorStandings.length === 0 && (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">No picks yet for {activeMajor.name}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {majorStandings.some((s) => (s.majorResult?.missedCutCount ?? 0) > 1) && (
          <div className="px-5 py-2 bg-orange-50 border-t text-xs text-orange-600">
            WMC = Worst Made Cut — player replaced because 2+ on your team missed the cut
          </div>
        )}
      </div>
    </div>
  );
}
