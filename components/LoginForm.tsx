"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!/^\d{4,6}$/.test(pin)) { setError("PIN must be 4–6 digits."); return; }
    if (mode === "register" && pin !== pinConfirm) {
      setError("PINs do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin, isRegister: mode === "register" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong.");
      } else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-4xl">⛳</span>
        <h1 className="text-2xl font-bold text-green-900 mt-2">Golf Pool 2026</h1>
        <p className="text-gray-500 text-sm mt-1">
          {mode === "login" ? "Log in to manage your picks" : "Create your account"}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === "login" ? "bg-white text-green-900 shadow" : "text-gray-500"
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            mode === "register" ? "bg-white text-green-900 shadow" : "text-gray-500"
          }`}
        >
          Join Pool
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-4">
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
          {mode === "register" && (
            <p className="text-xs text-gray-400 mt-1">
              Use the name you want shown on the leaderboard.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            PIN <span className="font-normal text-gray-400">(4–6 digits)</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          {mode === "register" && (
            <p className="text-xs text-gray-400 mt-1">
              Choose a PIN you&apos;ll remember — there&apos;s no PIN reset (ask the pool admin if you forget it).
            </p>
          )}
        </div>

        {mode === "register" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Confirm PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading
            ? "..."
            : mode === "login"
            ? "Log In"
            : "Create Account & Join Pool"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400">
        {mode === "login" ? (
          <>New here? <button onClick={() => setMode("register")} className="text-green-600 underline">Join the pool</button></>
        ) : (
          <>Already have an account? <button onClick={() => setMode("login")} className="text-green-600 underline">Log in</button></>
        )}
      </p>
    </div>
  );
}
