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
import { Wallet, PiggyBank, TrendingUp, Landmark, Coins } from "lucide-react";

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
  owned: number;
  crypto: number;
  netWorth: number;
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

type Holding = {
  coin: string;
  amount: number;
  euros: number;
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [cryptoTotal, setCryptoTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [parsed, setParsed] = useState<{
    date?: string;
    concept: string;
    amount: number;
    type: "Income" | "Expense" | "ROI" | "Investment" | "Balance";
    category?: string;
    notes?: string;
  } | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to load dashboard data");
      setRows([]);
      setForecast([]);
      setHoldings([]);
      setCryptoTotal(0);
    } else {
      setRows(json.months || []);
      setForecast(json.forecast?.points || []);
      setHoldings(json.crypto?.holdings || []);
      setCryptoTotal(json.crypto?.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const parsePrompt = async () => {
    setError(null);
    const res = await fetch("/api/transaction/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = await res.json();
    if (!res.ok) {
      setParsed(null);
      setError(json.error || "Could not parse transaction text");
      return;
    }
    setParsed(json.parsed);
  };

  const submitQuickAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed) {
      await parsePrompt();
      return;
    }

    setSaving(true);
    setError(null);
    const res = await fetch("/api/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Failed to add transaction");
    } else {
      setPrompt("");
      setParsed(null);
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
    <main className="min-h-screen bg-gradient-to-br from-cyan-500 via-sky-600 to-fuchsia-700 text-zinc-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 rounded-3xl border border-cyan-300/20 bg-[#1a1040]/85 backdrop-blur-md p-5 md:p-7 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between rounded-2xl border border-fuchsia-300/20 bg-[#221257]/70 px-4 py-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Finance Motion Dashboard</h1>
            <p className="text-zinc-300 text-sm">Live from Google Sheets</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-300">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/20">stats</span>
            <span className="px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/20">crypto</span>
          </div>
        </div>

        {loading ? (
          <div className="text-zinc-400">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300 text-sm">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Kpi icon={<Wallet size={16} />} label="Daily Account" value={latest?.dailyAccount ?? 0} />
              <Kpi icon={<PiggyBank size={16} />} label="Savings" value={latest?.savings ?? 0} />
              <Kpi icon={<Landmark size={16} />} label="Debt" value={latest?.debt ?? 0} />
              <Kpi icon={<Coins size={16} />} label="Crypto" value={cryptoTotal} />
              <Kpi icon={<TrendingUp size={16} />} label="Net Worth" value={latest?.netWorth ?? 0} />
            </div>

            <Card title="Quick add transaction">
              <form onSubmit={submitQuickAdd} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm"
                    placeholder='Try: "spent 24.9 on groceries" or "earned 2200 from salary"'
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      setParsed(null);
                    }}
                    required
                  />
                  <button type="button" onClick={parsePrompt} className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm">
                    Parse
                  </button>
                  <button disabled={saving} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-4 py-2 text-sm font-medium">
                    {saving ? "Adding..." : parsed ? "Confirm & Add" : "Add"}
                  </button>
                </div>
                {parsed && (
                  <div className="rounded-lg border border-white/15 bg-white/5 p-3 text-xs text-zinc-200">
                    <div>
                      Preview → <b>{parsed.type}</b> | <b>{parsed.concept}</b> | € <b>{parsed.amount}</b> | Date: <b>{parsed.date}</b> | Category: <b>{parsed.category || "General"}</b>
                    </div>
                  </div>
                )}
              </form>
            </Card>

            <Card title="Monthly totals (Income / Expenses / ROI / Investment)">
              <ChartWrap>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                    <XAxis dataKey="month" stroke="#a1a1aa" />
                    <YAxis stroke="#a1a1aa" />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.06)" }}
                      contentStyle={{ background: "#1c1248", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }}
                      labelStyle={{ color: "#d8d4fe" }}
                    />
                    <Bar dataKey="income" fill="#22d3ee" />
                    <Bar dataKey="expenses" fill="#ff4d8d" />
                    <Bar dataKey="roi" fill="#a3e635" />
                    <Bar dataKey="investment" fill="#fbbf24" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrap>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card title="Savings evolution">
                <ChartWrap>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#a1a1aa" />
                      <YAxis stroke="#a1a1aa" />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                        contentStyle={{ background: "#1c1248", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }}
                        labelStyle={{ color: "#d8d4fe" }}
                      />
                      <Line type="monotone" dataKey="savings" stroke="#22d3ee" strokeWidth={3} dot={false} />
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
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                        contentStyle={{ background: "#1c1248", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }}
                        labelStyle={{ color: "#d8d4fe" }}
                      />
                      <Line type="monotone" dataKey="debt" stroke="#ff4d8d" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              </Card>

              <Card title="Net worth evolution">
                <ChartWrap>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#a1a1aa" />
                      <YAxis stroke="#a1a1aa" />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1 }}
                        contentStyle={{ background: "#1c1248", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12 }}
                        labelStyle={{ color: "#d8d4fe" }}
                      />
                      <Line type="monotone" dataKey="netWorth" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartWrap>
              </Card>
            </div>

            <Card title="Crypto portfolio">
              <div className="mb-3 text-sm text-zinc-300">Total: <span className="font-semibold text-amber-300">€ {cryptoTotal.toLocaleString()}</span></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {holdings.map((h) => (
                  <div key={h.coin} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{h.coin}</div>
                      <div className="text-zinc-400 text-xs">{h.amount.toLocaleString()}</div>
                    </div>
                    <div className="text-amber-300 font-semibold">€ {h.euros.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="3-month forecast (with confidence bands)">
              <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-zinc-200">Purple/red shaded zones = confidence bands</div>
                <div className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-zinc-200">Savings should trend up, debt should trend down</div>
                <div className="rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-zinc-200">Growth shown on right axis</div>
              </div>
              <ChartWrap>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={forecast} margin={{ top: 8, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                    <XAxis dataKey="month" stroke="#a1a1aa" />
                    <YAxis yAxisId="left" stroke="#a1a1aa" />
                    <YAxis yAxisId="right" orientation="right" stroke="#86efac" />
                    <ReferenceLine yAxisId="right" y={0} stroke="#3f3f46" strokeDasharray="4 4" />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12 }} labelStyle={{ color: "#d4d4d8" }} />
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

            <Card title="YTD quick totals">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Badge label="Income" value={totals.income} color="text-green-400" />
                <Badge label="Expenses" value={Math.abs(totals.expenses)} color="text-red-400" />
                <Badge label="ROI" value={totals.roi} color="text-lime-400" />
                <Badge label="Investment" value={Math.abs(totals.investment)} color="text-yellow-300" />
              </div>
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
      className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/15 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    >
      <div className="flex items-center gap-2 text-zinc-300 text-sm">{icon} {label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">€ {value.toLocaleString()}</div>
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-fuchsia-300/20 bg-[#24145f]/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
    >
      <h2 className="mb-3 text-sm text-cyan-200/90">{title}</h2>
      {children}
    </motion.section>
  );
}

function ChartWrap({ children }: { children: ReactNode }) {
  return <div className="w-full h-[320px] md:h-[340px]">{children}</div>;
}

function Badge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-3">
      <div className="text-zinc-300">{label}</div>
      <div className={`font-semibold ${color}`}>€ {value.toLocaleString()}</div>
    </div>
  );
}
