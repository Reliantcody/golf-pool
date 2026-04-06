"use client";
import { useState } from "react";
import { MAJORS } from "@/lib/majors";
import { formatScore } from "@/lib/scoring";

interface PlayerResult {
  name: string;
  espnName: string | null;
  score: number | null;
  madeCut: boolean;
  adjusted: boolean;
  notStarted: boolean;
}

interface MajorResult {
  majorId: string;
  playerResults: PlayerResult[];
  missedCutCount: number;
  majorScore: number | null;
  isComplete: boolean;
}

interface Standing {
  name: string;
  rank: number;
  majorResults: MajorResult[];
  totalScore: number | null;
}

export default function MajorTabs({ standings }: { standings: Standing[] }) {
  const [activeTab, setActiveTab] = useState(0);

  const activeMajor = MAJORS[activeTab];
  const majorStandings = standings
    .map((s) => ({
      ...s,
      majorResult: s.majorResults[activeTab],
    }))
    .sort((a, b) => {
      const sa = a.majorResult?.majorScore;
      const sb = b.majorResult?.majorScore;
      if (sa === null && sb === null) return 0;
      if (sa === null) return 1;
      if (sb === null) return -1;
      return sa - sb;
    });

  return (
    <div>
      <h2 className="text-xl font-bold text-green-900 mb-4">Picks by Major</h2>
      <div className="flex gap-2 mb-4 flex-wrap">
        {MAJORS.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              i === activeTab
                ? "bg-green-900 text-white"
                : "bg-white text-green-900 border border-green-300 hover:bg-green-50"
            }`}
          >
            {m.shortName}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-green-800 text-white">
              <tr>
                <th className="text-left px-4 py-3">#</th>
                <th className="text-left px-4 py-3">Participant</th>
                <th className="text-left px-4 py-3">Picks</th>
                <th className="text-center px-4 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {majorStandings.map((s, i) => {
                const mr = s.majorResult;
                const hasPicks = mr?.playerResults?.length > 0 && !mr.playerResults[0]?.notStarted;

                return (
                  <tr
                    key={i}
                    className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="px-4 py-3 text-gray-500 font-bold">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold">{s.name}</td>
                    <td className="px-4 py-3">
                      {mr?.playerResults?.length > 0 ? (
                        <ul className="space-y-0.5">
                          {mr.playerResults.map((p: PlayerResult, pi: number) => (
                            <li key={pi} className="flex items-center gap-2 text-xs">
                              <span
                                className={
                                  p.notStarted
                                    ? "text-gray-600"
                                    : p.adjusted
                                    ? "text-orange-600 line-through"
                                    : !p.madeCut
                                    ? "text-red-500 line-through"
                                    : "text-gray-800"
                                }
                              >
                                {p.espnName ?? p.name}
                              </span>
                              {!p.notStarted && (
                                <span
                                  className={`font-mono font-semibold ${
                                    (p.score ?? 0) < 0
                                      ? "text-green-700"
                                      : (p.score ?? 0) > 0
                                      ? "text-red-600"
                                      : ""
                                  }`}
                                >
                                  {formatScore(p.score)}
                                  {p.adjusted && (
                                    <span className="text-orange-500 ml-1" title="Replaced (>1 missed cut)">
                                      *
                                    </span>
                                  )}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No picks submitted</span>
                      )}
                    </td>
                    <td
                      className={`text-center px-4 py-3 font-bold ${
                        mr?.majorScore !== null
                          ? (mr.majorScore ?? 0) < 0
                            ? "text-green-700"
                            : (mr.majorScore ?? 0) > 0
                            ? "text-red-600"
                            : ""
                          : "text-gray-300"
                      }`}
                    >
                      {mr?.majorScore !== null ? formatScore(mr.majorScore) : "--"}
                    </td>
                  </tr>
                );
              })}
              {majorStandings.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No picks yet for {activeMajor.name}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {majorStandings.some((s) => s.majorResult?.missedCutCount > 1) && (
          <div className="px-4 py-2 bg-orange-50 border-t text-xs text-orange-700">
            * Player replaced by worst made-cut score (more than 1 missed cut)
          </div>
        )}
      </div>
    </div>
  );
}
