"use client";
import { useState } from "react";

interface Participant {
  id: number;
  name: string;
  has_pin: boolean;
  pick_count: number;
}

export default function AdminPanel() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<Participant | null>(null);
  const [newPin, setNewPin] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const load = async (pw: string) => {
    const res = await fetch("/api/admin/participants", {
      headers: { "x-admin-password": pw },
    });
    if (!res.ok) { setError("Wrong password."); return; }
    const data = await res.json();
    setParticipants(data.participants ?? []);
    setAuthed(true);
    setError("");
  };

  const resetPin = async () => {
    if (!resetTarget || !/^\d{4,6}$/.test(newPin)) return;
    const res = await fetch("/api/admin/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ participantId: resetTarget.id, newPin }),
    });
    if (res.ok) {
      setResetMsg(`PIN reset for ${resetTarget.name} to: ${newPin}`);
      setResetTarget(null);
      setNewPin("");
    }
  };

  if (!authed) {
    return (
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h1 className="text-xl font-bold text-green-900">Pool Admin</h1>
        <p className="text-sm text-gray-500">Enter your admin password to manage participants.</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(password)}
            placeholder="Admin password"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => load(password)}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-600"
          >
            Enter
          </button>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-green-900">Pool Admin</h1>
        <button onClick={() => setAuthed(false)} className="text-xs text-gray-400 underline">
          Lock
        </button>
      </div>

      {resetMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 font-semibold">
          {resetMsg}
        </div>
      )}

      {/* Reset PIN modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h2 className="font-bold text-green-900">Reset PIN for {resetTarget.name}</h2>
            <p className="text-xs text-gray-500">
              Set a new temporary PIN and share it with them privately.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="New PIN (4–6 digits)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={resetPin}
                disabled={!/^\d{4,6}$/.test(newPin)}
                className="flex-1 bg-green-700 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg text-sm"
              >
                Reset PIN
              </button>
              <button
                onClick={() => { setResetTarget(null); setNewPin(""); }}
                className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-green-900 text-white">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-center px-3 py-3">PIN set</th>
              <th className="text-center px-3 py-3">Picks</th>
              <th className="text-center px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={p.id} className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="text-center px-3 py-3">
                  {p.has_pin
                    ? <span className="text-green-600 text-xs font-semibold">✓ Yes</span>
                    : <span className="text-red-400 text-xs">No PIN</span>}
                </td>
                <td className="text-center px-3 py-3 text-gray-500">{p.pick_count}</td>
                <td className="text-center px-3 py-3">
                  <button
                    onClick={() => { setResetTarget(p); setResetMsg(""); }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Reset PIN
                  </button>
                </td>
              </tr>
            ))}
            {participants.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-6 text-gray-400">No participants yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
