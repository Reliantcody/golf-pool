"use client";
import { useState, useEffect } from "react";
import PlayerAutocomplete from "./PlayerAutocomplete";

interface PicksFormProps {
  majorId: string;
  majorName: string;
}

interface KnownParticipant {
  name: string;
  pickCount: number;
}

const STORAGE_KEY = "golf_pool_name";

export default function PicksForm({ majorId, majorName }: PicksFormProps) {
  const [name, setName] = useState("");
  const [players, setPlayers] = useState(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [usedPlayers, setUsedPlayers] = useState<string[]>([]);
  const [fieldPlayers, setFieldPlayers] = useState<string[]>([]);
  const [fieldLoading, setFieldLoading] = useState(true);
  const [knownParticipants, setKnownParticipants] = useState<KnownParticipant[]>([]);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [existingMajorPicks, setExistingMajorPicks] = useState<string[]>([]);

  // Load field + known participants on mount
  useEffect(() => {
    fetch(`/api/field?majorId=${majorId}`)
      .then((r) => r.json())
      .then((d) => setFieldPlayers(d.players ?? []))
      .catch(() => setFieldPlayers([]))
      .finally(() => setFieldLoading(false));

    fetch("/api/participants")
      .then((r) => r.json())
      .then((d) => setKnownParticipants(d.participants ?? []))
      .catch(() => {});

    // Pre-fill name from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setName(saved);
    }
  }, [majorId]);

  // When name is confirmed, load their used players + existing picks for this major
  useEffect(() => {
    if (!nameConfirmed || !name.trim()) return;

    const trimmed = name.trim();

    // Load used players in other majors
    fetch(`/api/picks/used?name=${encodeURIComponent(trimmed)}&majorId=${majorId}`)
      .then((r) => r.json())
      .then((d) => setUsedPlayers(d.usedPlayers ?? []))
      .catch(() => {});

    // Load existing picks for THIS major (so they can edit before deadline)
    fetch(`/api/picks?majorId=${majorId}`)
      .then((r) => r.json())
      .then((d) => {
        const mine = (d.picks ?? []).find(
          (p: { participantName: string; players: string[] }) =>
            p.participantName.toLowerCase() === trimmed.toLowerCase()
        );
        if (mine?.players?.length) {
          setPlayers(
            mine.players.length === 5
              ? mine.players
              : [...mine.players, ...Array(5 - mine.players.length).fill("")]
          );
          setExistingMajorPicks(mine.players);
        }
      })
      .catch(() => {});
  }, [nameConfirmed, name, majorId]);

  const confirmName = (confirmedName: string) => {
    const trimmed = confirmedName.trim();
    if (!trimmed) return;
    setName(trimmed);
    setNameConfirmed(true);
    localStorage.setItem(STORAGE_KEY, trimmed);
  };

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

    if (!trimmedName) { setError("Please enter your name."); return; }
    if (trimmedPlayers.some((p) => !p)) { setError("Please select all 5 players."); return; }

    const unique = new Set(trimmedPlayers.map((p) => p.toLowerCase()));
    if (unique.size !== 5) { setError("Each player must be different."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, majorId, players: trimmedPlayers }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        localStorage.setItem(STORAGE_KEY, trimmedName);
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <p className="text-5xl mb-3">🏌️</p>
        <h3 className="text-xl font-bold text-green-900">
          {existingMajorPicks.length > 0 ? "Picks Updated!" : "Picks Submitted!"}
        </h3>
        <p className="text-gray-500 mt-2 text-sm">
          Good luck at {majorName}, {name}!
        </p>
        <div className="mt-4 bg-green-50 rounded-lg p-3 text-sm text-left">
          <p className="font-semibold text-green-800 mb-1">Your picks:</p>
          <ul className="text-green-700 space-y-0.5">
            {players.map((p, i) => <li key={i}>{i + 1}. {p}</li>)}
          </ul>
        </div>
        <div className="mt-4 flex gap-3 justify-center">
          <a href="/" className="text-sm text-green-700 underline">View leaderboard</a>
          <button
            onClick={() => {
              setSuccess(false);
              setName("");
              setNameConfirmed(false);
              setPlayers(["", "", "", "", ""]);
              setExistingMajorPicks([]);
              localStorage.removeItem(STORAGE_KEY);
            }}
            className="text-sm text-gray-500 underline"
          >
            Submit for someone else
          </button>
        </div>
      </div>
    );
  }

  // ── Name selection screen ───────────────────────────────────────
  if (!nameConfirmed) {
    const savedName = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

    return (
      <div className="bg-white rounded-xl border p-6 space-y-5">
        <h3 className="font-bold text-green-900 text-lg">Who are you?</h3>

        {/* Returning players */}
        {knownParticipants.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">
              Returning player — tap your name:
            </p>
            <div className="flex flex-wrap gap-2">
              {knownParticipants.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => confirmName(p.name)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors font-medium ${
                    savedName?.toLowerCase() === p.name.toLowerCase()
                      ? "bg-green-700 text-white border-green-700"
                      : "bg-white text-green-800 border-green-300 hover:bg-green-50"
                  }`}
                >
                  {p.name}
                  {savedName?.toLowerCase() === p.name.toLowerCase() && (
                    <span className="ml-1.5 text-green-200 text-xs">← you</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {knownParticipants.length > 0 && (
          <div className="flex items-center gap-3 text-gray-300">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* New player / name entry */}
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">
            {knownParticipants.length > 0 ? "New player — enter your name:" : "Enter your name:"}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmName(name); } }}
              placeholder="Your full name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={() => confirmName(name)}
              disabled={!name.trim()}
              className="bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Continue
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Use the same name every major — this is how your picks are tracked across all 4 tournaments.
          </p>
        </div>
      </div>
    );
  }

  // ── Picks form ──────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-green-900 text-lg">
          {existingMajorPicks.length > 0 ? "Update Your Picks" : "Submit Your Picks"} — {majorName}
        </h3>
        <button
          type="button"
          onClick={() => { setNameConfirmed(false); setPlayers(["", "", "", "", ""]); setExistingMajorPicks([]); }}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Not {name}?
        </button>
      </div>

      <div className="bg-green-50 rounded-lg px-3 py-2 text-sm text-green-800 font-medium">
        Entering picks as: <span className="font-bold">{name}</span>
      </div>

      {existingMajorPicks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          You already submitted picks for {majorName}. You can update them below until the deadline.
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
          Pick 5 Players
          <span className="text-gray-400 font-normal ml-2 text-xs">
            {fieldLoading ? "Loading field..." : `${fieldPlayers.length} players · type to search`}
          </span>
        </label>
        <div className="space-y-2">
          {players.map((player, i) => {
            const isUsed = usedPlayers.some(
              (u) => u.toLowerCase() === player.trim().toLowerCase()
            ) && player.trim().length > 0;
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
        {loading ? "Submitting..." : existingMajorPicks.length > 0 ? "Update Picks" : "Submit Picks"}
      </button>
    </form>
  );
}
