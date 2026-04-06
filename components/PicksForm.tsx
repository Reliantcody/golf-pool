"use client";
import { useState, useEffect } from "react";

interface PicksFormProps {
  majorId: string;
  majorName: string;
}

export default function PicksForm({ majorId, majorName }: PicksFormProps) {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [usedPlayers, setUsedPlayers] = useState<string[]>([]);

  // Load used players when name is entered
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/picks/used?name=${encodeURIComponent(trimmed)}&majorId=${majorId}`
        );
        if (res.ok) {
          const data = await res.json();
          setUsedPlayers(data.usedPlayers ?? []);
        }
      } catch {
        // ignore
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [name, majorId]);

  const updatePlayer = (index: number, value: string) => {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedPlayers = players.map((p) => p.trim());

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (trimmedPlayers.some((p) => !p)) {
      setError("Please enter all 5 player names.");
      return;
    }

    const unique = new Set(trimmedPlayers.map((p) => p.toLowerCase()));
    if (unique.size !== 5) {
      setError("Each player must be unique within your submission.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          majorId,
          players: trimmedPlayers,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <p className="text-5xl mb-3">🏌️</p>
        <h3 className="text-xl font-bold text-green-900">Picks Submitted!</h3>
        <p className="text-gray-500 mt-2 text-sm">
          Good luck at {majorName}, {name}!
        </p>
        <div className="mt-4 bg-green-50 rounded-lg p-3 text-sm text-left">
          <p className="font-semibold text-green-800 mb-1">Your picks:</p>
          <ul className="text-green-700 space-y-0.5">
            {players.map((p, i) => (
              <li key={i}>
                {i + 1}. {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex gap-3 justify-center">
          <a href="/" className="text-sm text-green-700 underline">
            View leaderboard
          </a>
          <button
            onClick={() => {
              setSuccess(false);
              setPlayers(["", "", "", "", ""]);
            }}
            className="text-sm text-gray-500 underline"
          >
            Submit for someone else
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border p-6 space-y-5"
    >
      <h3 className="font-bold text-green-900 text-lg">
        Submit Your Picks — {majorName}
      </h3>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Smith"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Use the same name each week to update your picks before the deadline.
        </p>
      </div>

      {/* Previously used players warning */}
      {usedPlayers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
          <p className="font-semibold mb-1">Players you&apos;ve already used this year:</p>
          <p>{usedPlayers.join(", ")}</p>
          <p className="mt-1 text-orange-500">You cannot pick these players again.</p>
        </div>
      )}

      {/* Players */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Pick 5 Players
          <span className="text-gray-400 font-normal ml-2 text-xs">
            (enter full names as they appear on the PGA Tour)
          </span>
        </label>
        <div className="space-y-2">
          {players.map((player, i) => {
            const isUsed =
              usedPlayers.some(
                (u) => u.toLowerCase() === player.trim().toLowerCase()
              ) && player.trim().length > 0;

            return (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm font-bold text-gray-400">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={player}
                  onChange={(e) => updatePlayer(i, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    isUsed
                      ? "border-red-400 focus:ring-red-400 bg-red-50"
                      : "border-gray-300 focus:ring-green-500"
                  }`}
                  required
                />
                {isUsed && (
                  <span className="text-red-500 text-xs">Already used</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors text-sm"
      >
        {loading ? "Submitting..." : "Submit Picks"}
      </button>
    </form>
  );
}
