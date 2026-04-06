"use client";
import { useState } from "react";

interface Participant {
  id: number;
  name: string;
  pin: string | null;
  paid: boolean;
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
      load(password);
    }
  };

  const togglePaid = async (p: Participant) => {
    const res = await fetch("/api/admin/participants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ participantId: p.id, paid: !p.paid }),
    });
    if (res.ok) load(password);
  };

  const deleteParticipant = async (p: Participant) => {
    if (!confirm(`Delete ${p.name} and all their picks? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/participants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ participantId: p.id }),
    });
    if (res.ok) {
      setResetMsg(`${p.name} has been deleted.`);
      load(password);
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
        <div className="flex items-center gap-4">
          <a
            href="/?preview=1"
            target="_blank"
            className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-full font-semibold hover:bg-green-600"
          >
            Preview Scoring ↗
          </a>
          <button onClick={() => setAuthed(false)} className="text-xs text-gray-400 underline">
            Lock
          </button>
        </div>
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
              <th className="text-center px-3 py-3">PIN</th>
              <th className="text-center px-3 py-3">Paid</th>
              <th className="text-center px-3 py-3">Picks</th>
              <th className="text-center px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={p.id} className={`border-t ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="text-center px-3 py-3 font-mono">
                  {p.pin
                    ? <span className="text-green-800 font-semibold">{p.pin}</span>
                    : <span className="text-gray-400 text-xs">not set</span>}
                </td>
                <td className="text-center px-3 py-3">
                  <button
                    onClick={() => togglePaid(p)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                      p.paid
                        ? "bg-green-600 border-green-600 text-white"
                        : "border-gray-300 hover:border-green-400"
                    }`}
                    title={p.paid ? "Mark unpaid" : "Mark paid"}
                  >
                    {p.paid && <span className="text-xs font-bold">✓</span>}
                  </button>
                </td>
                <td className="text-center px-3 py-3 text-gray-500">{p.pick_count}</td>
                <td className="text-center px-3 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => { setResetTarget(p); setResetMsg(""); }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Reset PIN
                    </button>
                    <button
                      onClick={() => deleteParticipant(p)}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Delete
                    </button>
                  </div>
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
