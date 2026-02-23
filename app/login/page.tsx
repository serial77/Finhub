"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Login failed");
      setLoading(false);
      return;
    }

    window.location.href = "/";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#070f2c] via-[#081b4a] to-[#0a2b66] text-zinc-100 p-6 flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-cyan-300/20 bg-[#07163f]/88 p-5 space-y-3">
        <h1 className="text-xl font-semibold">Finance Dashboard Login</h1>
        <input
          className="w-full rounded-lg bg-[#0d2a63]/45 border border-white/15 px-3 py-2 text-sm"
          placeholder="Username"
          autoComplete="username"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          required
        />
        <input
          className="w-full rounded-lg bg-[#0d2a63]/45 border border-white/15 px-3 py-2 text-sm"
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
        />
        <button disabled={loading} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-2 text-sm font-medium">
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>
    </main>
  );
}
