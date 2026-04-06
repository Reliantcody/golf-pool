"use client";
import { useState, useEffect } from "react";
import PlayerAutocomplete from "./PlayerAutocomplete";

interface PicksFormProps {
  majorId: string;
  majorName: string;
  participantId: number;
  participantName: string;
  existingPicks: string[];
}

export default function PicksForm({
  majorId,
  majorName,
  participantId,
  participantName,
  existingPicks,
}: PicksFormProps) {
  const [players, setPlayers] = useState<string[]>(
    existingPicks.length === 6
      ? existingPicks
      : [...existingPicks, ...Array(6 - existingPicks.length).fill("")]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [usedPlayers, setUsedPlayers] = useState<string[]>([]);
  const [fieldPlayers, setFieldPlayers] = useState<string[]>([]);
  const [fieldLoading, setFieldLoading] = useState(true);

  const isEditing = existingPicks.length > 0;

  useEffect(() => {
    // Load player field for this major
    fetch(`/api/field?majorId=${majorId}`)
      .then((r) => r.json())
      .then((d) => setFieldPlayers(d.players ?? []))
      .catch(() => setFieldPlayers([]))
      .finally(() => setFieldLoading(false));

    // Load players used in OTHER majors
    fetch(`/api/picks/used?name=${encodeURIComponent(participantName)}&majorId=${majorId}`)
      .then((r) => r.json())
      .then((d) => setUsedPlayers(d.usedPlayers ?? []))
      .catch(() => {});
  }, [majorId, participantName]);

  const updatePlayer = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedPlayers = players.map((p) => p.trim());
    if (trimmedPlayers.some((p) => !p)) {
      setError("Please select all 6 players.");
      return;
    }
    const unique = new Set(trimmedPlayers.map((p) => p.toLowerCase()));
    if (unique.size !== 6) {
      setError("Each player must be different.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ majorId, players: trimmedPlayers }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <p className="text-5xl mb-3">🏌️</p>
        <h3 className="text-xl font-bold text-green-900">
          {isEditing ? "Picks Updated!" : "Picks Submitted!"}
        </h3>
        <p className="text-gray-500 mt-2 text-sm">Good luck at {majorName}!</p>
        <div className="mt-4 bg-green-50 rounded-lg p-3 text-sm text-left">
          <p className="font-semibold text-green-800 mb-1">Your picks:</p>
          <ul className="text-green-700 space-y-0.5">
            {players.map((p, i) => <li key={i}>{i + 1}. {p}</li>)}
          </ul>
        </div>
        <a href="/" className="mt-4 inline-block text-sm text-green-700 underline">
          View leaderboard
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
      <h3 className="font-bold text-green-900 text-lg">
        {isEditing ? "Update Your Picks" : "Submit Your Picks"} — {majorName}
      </h3>

      {isEditing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          You already submitted picks for {majorName}. You can update them until the deadline.
        </div>
      )}

      {usedPlayers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
          <p className="font-semibold mb-1">Already used this year (unavailable):</p>
          <p>{usedPlayers.join(", ")}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Pick 6 Players
          <span className="text-gray-400 font-normal ml-2 text-xs">
            {fieldLoading ? "Loading field..." : `${fieldPlayers.length} players · type to search`}
          </span>
        </label>
        <div className="space-y-2">
          {players.map((player, i) => {
            const isUsed =
              usedPlayers.some((u) => u.toLowerCase() === player.trim().toLowerCase()) &&
              player.trim().length > 0;
            const isDupe = players.some(
              (p, j) => j !== i && p.toLowerCase() === player.toLowerCase() && player.length > 0
            );
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm font-bold text-gray-400 flex-shrink-0">
                  {i + 1}
                </span>
                <PlayerAutocomplete
                  value={player}
                  onChange={(v) => updatePlayer(i, v)}
                  players={fieldPlayers}
                  usedPlayers={usedPlayers}
                  index={i}
                />
                {isUsed && <span className="text-red-500 text-xs flex-shrink-0">Used</span>}
                {isDupe && !isUsed && <span className="text-orange-500 text-xs flex-shrink-0">Duplicate</span>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Type 2+ letters to search. Select from the dropdown to ensure exact spelling.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || fieldLoading}
        className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors text-sm"
      >
        {loading ? "Submitting..." : isEditing ? "Update Picks" : "Submit Picks"}
      </button>
    </form>
  );
}
