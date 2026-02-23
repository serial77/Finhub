"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, PiggyBank, Wallet } from "lucide-react";

export default function KristinaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [daily, setDaily] = useState(0);
  const [savings, setSavings] = useState(0);
  const [month, setMonth] = useState("");
  const [actions, setActions] = useState<Array<{ rowNumber: number; date: string; concept: string; amount: number; type: string }>>([]);
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);
  const [undoingRow, setUndoingRow] = useState<number | null>(null);
  const [confirmUndoRow, setConfirmUndoRow] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/kristina/summary", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load summary");
    } else {
      setDaily(json.dailyAccount || 0);
      setSavings(json.savings || 0);
      setMonth(json.tab || json.month || "");
      setActions(json.recentActions || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/kristina/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not submit");
      setSending(false);
      return;
    }

    setSuccess(true);
    setPrompt("");
    await load();
    setSending(false);
    setTimeout(() => setSuccess(false), 2200);
  };

  const undoAction = async (rowNumber: number) => {
    setConfirmUndoRow(rowNumber);
  };

  const confirmUndo = async () => {
    if (!confirmUndoRow) return;

    setUndoingRow(confirmUndoRow);
    setError(null);
    const res = await fetch("/api/kristina/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rowNumber: confirmUndoRow }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not undo action");
      setUndoingRow(null);
      setConfirmUndoRow(null);
      return;
    }
    await load();
    setUndoingRow(null);
    setConfirmUndoRow(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-fuchsia-950 via-violet-950 to-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-300/20 text-pink-100 text-sm">
            <Heart size={14} /> Hi Kristina ✨
          </div>
          <h1 className="mt-3 text-3xl font-bold">Your Cute Finance Corner</h1>
          <p className="text-zinc-300 mt-1">Quickly tell me what you took, and I’ll log it 💖</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-zinc-300">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Stat icon={<Wallet size={16} />} label={`Daily Account (${month})`} value={daily} color="from-cyan-500/20 to-blue-500/20" />
            <Stat icon={<PiggyBank size={16} />} label="Savings Account" value={savings} color="from-violet-500/20 to-fuchsia-500/20" />
          </div>
        )}

        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-pink-300/20 bg-zinc-900/60 backdrop-blur p-4 space-y-3">
          <label className="text-sm text-zinc-200 flex items-center gap-2"><Sparkles size={14} /> How much did you take?</label>
          <input
            className="w-full rounded-xl bg-zinc-950/80 border border-zinc-700 px-4 py-3 text-sm"
            placeholder='Example: "I took 24.5 for groceries"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
          <button disabled={sending} className="w-full rounded-xl py-3 font-semibold bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 disabled:opacity-60">
            {sending ? "Saving..." : "Submit ✨"}
          </button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </motion.form>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-pink-300/20 bg-zinc-900/60 backdrop-blur p-4 space-y-2">
          <div className="text-sm text-zinc-200">Last actions</div>
          {actions.length ? (
            actions.map((a) => (
              <div key={a.rowNumber} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 text-sm text-zinc-100 truncate">
                  <span className="font-medium">{a.concept}</span>
                  <span className="text-zinc-400"> • {a.date} • {a.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-rose-200">€ {a.amount}</div>
                  <button
                    onClick={() => undoAction(a.rowNumber)}
                    disabled={undoingRow === a.rowNumber}
                    className="text-xs rounded-lg px-2 py-1 border border-rose-300/30 bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-60"
                  >
                    {undoingRow === a.rowNumber ? "Undo..." : "Undo"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-400">No actions yet.</div>
          )}
        </motion.div>

        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="rounded-2xl border border-emerald-300/30 bg-emerald-500/20 p-6 text-center"
            >
              <div className="text-3xl">🎉💖🌸</div>
              <p className="mt-2 font-semibold">Yaaay, done! Thank you Kristina ✨</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmUndoRow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl border border-pink-300/25 bg-gradient-to-b from-fuchsia-950/90 to-violet-950/90 p-5"
            >
              <div className="text-lg font-semibold">Undo this action?</div>
              <p className="mt-2 text-sm text-zinc-300">This will remove that row from the sheet. You can’t auto-redo it.</p>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmUndoRow(null)}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUndo}
                  className="rounded-lg border border-rose-300/30 bg-rose-500/20 px-3 py-2 text-sm hover:bg-rose-500/30"
                >
                  Yes, undo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border border-zinc-700 bg-gradient-to-r ${color} p-4`}>
      <div className="text-sm text-zinc-200 flex items-center gap-2">{icon} {label}</div>
      <div className="mt-1 text-3xl font-bold">€ {value.toLocaleString()}</div>
    </motion.div>
  );
}
