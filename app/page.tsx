"use client";

import { useEffect, useMemo, useState, type ReactNode, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Wallet, PiggyBank, TrendingUp, Landmark } from "lucide-react";

type Row = {
  month: string;
  dailyAccount: number;
  income: number;
  expenses: number;
  roi: number;
  investment: number;
  growth: number;
  savings: number;
  debt: number;
};

type ForecastPoint = {
  month: string;
  projectedGrowth: number;
  projectedGrowthLow: number;
  projectedGrowthHigh: number;
  projectedSavings: number;
  projectedSavingsLow: number;
  projectedSavingsHigh: number;
  projectedDebt: number;
  projectedDebtLow: number;
  projectedDebtHigh: number;
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: "",
    concept: "",
    amount: "",
    type: "Expense",
    category: "General",
    notes: "",
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load dashboard data");
      setRows([]);
      setForecast([]);
    } else {
      setRows(json.months || []);
      setForecast(json.forecast?.points || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const submitQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to add transaction");
    } else {
      setForm({ date: "", concept: "", amount: "", type: "Expense", category: "General", notes: "" });
      await loadDashboard();
    }
    setSaving(false);
  };

  const latest = rows[rows.length - 1];
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.income += r.income;
        acc.expenses += r.expenses;
        acc.roi += r.roi;
        acc.investment += r.investment;
        return acc;
      },
      { income: 0, expenses: 0, roi: 0, investment: 0 }
    );
  }, [rows]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Finance Motion Dashboard</h1>
        <p className="text-zinc-400">Live from Google Sheets</p>

        {loading ? (
          <div className="text-zinc-400">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300 text-sm">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Kpi icon={<Wallet size={16} />} label="Daily Account" value={latest?.dailyAccount ?? 0} />
              <Kpi icon={<PiggyBank size={16} />} label="Savings" value={latest?.savings ?? 0} />
              <Kpi icon={<Landmark size={16} />} label="Debt" value={latest?.debt ?? 0} />
              <Kpi icon={<TrendingUp size={16} />} label="YTD Growth" value={rows.reduce((a, r) => a + r.growth, 0)} />
            </div>

            <Card title="Quick add transaction">
              <form onSubmit={submitQuickAdd} className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <input className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Date (MM/DD/YYYY)" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <input className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Concept" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} required />
                <input className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Amount" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <select className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option>Expense</option>
                  <option>Income</option>
                  <option>ROI</option>
                  <option>Investment</option>
                  <option>Balance</option>
                </select>
                <input className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                <button disabled={saving} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-2 text-sm font-medium">{saving ? "Adding..." : "Add"}</button>
                <input className="md:col-span-6 rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm" placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </form>
            </Card>

            <Card title="Monthly totals (Income / Expenses / ROI / Investment)">
              <ChartWrap>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                    <XAxis dataKey="month" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip />
                    <Bar dataKey="income" fill="#22c55e" />
                    <Bar dataKey="expenses" fill="#ef4444" />
                    <Bar dataKey="roi" fill="#84cc16" />
                    <Bar dataKey="investment" fill="#eab308" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrap>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Savings evolution">
                <ChartWrap>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#a1a1aa" />
                      <YAxis stroke="#a1a1aa" />
                      <Tooltip />
                      <Line type="monotone" dataKey="savings" stroke="#a78bfa" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              </Card>

              <Card title="Debt evolution">
                <ChartWrap>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#a1a1aa" />
                      <YAxis stroke="#a1a1aa" />
                      <Tooltip />
                      <Line type="monotone" dataKey="debt" stroke="#f87171" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              </Card>
            </div>

            <Card title="YTD quick totals">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Badge label="Income" value={totals.income} color="text-green-400" />
                <Badge label="Expenses" value={Math.abs(totals.expenses)} color="text-red-400" />
                <Badge label="ROI" value={totals.roi} color="text-lime-400" />
                <Badge label="Investment" value={Math.abs(totals.investment)} color="text-yellow-300" />
              </div>
            </Card>

            <Card title="3-month forecast (with confidence bands)">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-300">Purple/red shaded zones = confidence bands</div>
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-300">Savings should trend up, debt should trend down</div>
                <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-300">Growth shown on right axis</div>
              </div>
              <ChartWrap>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={forecast} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                    <XAxis dataKey="month" stroke="#a1a1aa" />
                    <YAxis yAxisId="left" stroke="#a1a1aa" />
                    <YAxis yAxisId="right" orientation="right" stroke="#86efac" />
                    <ReferenceLine yAxisId="right" y={0} stroke="#3f3f46" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 12 }} labelStyle={{ color: '#d4d4d8' }} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="projectedSavingsHigh" stroke="none" fill="#8b5cf640" name="Savings band (high)" />
                    <Area yAxisId="left" type="monotone" dataKey="projectedSavingsLow" stroke="none" fill="#8b5cf620" name="Savings band (low)" />
                    <Area yAxisId="left" type="monotone" dataKey="projectedDebtHigh" stroke="none" fill="#fb718540" name="Debt band (high)" />
                    <Area yAxisId="left" type="monotone" dataKey="projectedDebtLow" stroke="none" fill="#fb718520" name="Debt band (low)" />
                    <Line yAxisId="left" type="monotone" dataKey="projectedSavings" name="Projected Savings" stroke="#a78bfa" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="left" type="monotone" dataKey="projectedDebt" name="Projected Debt" stroke="#fb7185" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="projectedGrowth" name="Projected Growth" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2 }} activeDot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartWrap>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <div className="flex items-center gap-2 text-zinc-400 text-sm">{icon} {label}</div>
      <div className="mt-2 text-2xl font-semibold">€ {value.toLocaleString()}</div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
    >
      <h2 className="mb-3 text-sm text-zinc-400">{title}</h2>
      {children}
    </motion.section>
  );
}

function ChartWrap({ children }: { children: ReactNode }) {
  return <div className="w-full h-[320px] md:h-[340px]">{children}</div>;
}

function Badge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-zinc-400">{label}</div>
      <div className={`font-semibold ${color}`}>€ {value.toLocaleString()}</div>
    </div>
  );
}
