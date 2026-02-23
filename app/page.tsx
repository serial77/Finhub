"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BriefcaseBusiness,
  Coins,
  Landmark,
  PiggyBank,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";

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

type Holding = { coin: string; amount: number; euros: number };
type Movement = { date: string; concept: string; amount: number; type: string; category: string };
type TransactionParsed = {
  date?: string;
  concept: string;
  amount: number;
  type: "Income" | "Expense" | "ROI" | "Investment" | "Balance";
  category?: string;
  notes?: string;
};
type KrisParsed = {
  target: "kris";
  date?: string;
  action: string;
  weight?: number;
  value: number;
};

function isKrisParsed(p: TransactionParsed | KrisParsed): p is KrisParsed {
  return "target" in p && p.target === "kris";
}

const shortMonth = (v: string | number) => String(v || "").slice(0, 3);

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [cryptoTotal, setCryptoTotal] = useState(0);
  const [krisPending, setKrisPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [parsed, setParsed] = useState<TransactionParsed | KrisParsed | null>(null);

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
      setMovements([]);
      setCryptoTotal(0);
      setKrisPending(0);
    } else {
      setRows(json.months || []);
      setForecast(json.forecast?.points || []);
      setHoldings(json.crypto?.holdings || []);
      setMovements(json.recentMovements || []);
      setCryptoTotal(json.crypto?.total || 0);
      setKrisPending(json.krisPending || 0);
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
    const isKris = isKrisParsed(parsed);
    const res = await fetch(isKris ? "/api/kris/submit" : "/api/transaction", {
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
  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.income += r.income;
          acc.expenses += r.expenses;
          acc.roi += r.roi;
          acc.investment += r.investment;
          return acc;
        },
        { income: 0, expenses: 0, roi: 0, investment: 0 }
      ),
    [rows]
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#070f2c] via-[#081b4a] to-[#0a2b66] text-zinc-100 p-6 md:p-10 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #7dd3fc 0px, #7dd3fc 1px, transparent 1px, transparent 3px)" }}
      />
      <div className="pointer-events-none absolute -top-32 -left-24 w-80 h-80 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl" />

      <div className="max-w-7xl mx-auto space-y-6 rounded-3xl border border-cyan-300/20 bg-[#07163f]/88 backdrop-blur-md p-5 md:p-7 shadow-[0_20px_80px_rgba(0,0,0,0.45),inset_0_0_40px_rgba(34,211,238,0.06)] relative">
        <div className="flex items-center justify-between rounded-2xl border border-fuchsia-300/20 bg-[#0b255f]/72 px-4 py-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">Finance Motion Dashboard</h1>
            <p className="text-zinc-300 text-sm">Live from Google Sheets</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-300">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/20">stats</span>
            <span className="px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-300/20">crypto</span>
          </div>
        </div>

        {loading ? (
          <div className="text-zinc-300">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300 text-sm">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Kpi icon={<Wallet size={16} />} label="Daily Account" value={latest?.dailyAccount ?? 0} />
              <Kpi icon={<PiggyBank size={16} />} label="Savings" value={latest?.savings ?? 0} />
              <Kpi icon={<Landmark size={16} />} label="Debt" value={latest?.debt ?? 0} />
              <Kpi icon={<Coins size={16} />} label="Crypto" value={cryptoTotal} />
              <Kpi icon={<TrendingUp size={16} />} label="Net Worth" value={latest?.netWorth ?? 0} />
              <Kpi icon={<BriefcaseBusiness size={16} />} label="Kris Pending" value={krisPending} />
            </div>

            <Card title="Quick add transaction">
              <form onSubmit={submitQuickAdd} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg bg-[#0d2a63]/45 border border-white/15 px-3 py-2 text-sm"
                    placeholder='Try: "spent 24.9 on groceries", "earned 2200 from salary", "kris out 20 120 mandarin", "kris paid 90"'
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
                  <div className="rounded-lg border border-white/15 bg-[#0d2a63]/45 p-3 text-xs text-zinc-200">
                    {(() => {
                      if (isKrisParsed(parsed)) {
                        return <>Preview → <b>Kris</b> | <b>{parsed.action}</b> | Value: € <b>{parsed.value}</b> {parsed.weight ? <>| Weight: <b>{parsed.weight}</b></> : null} | Date: <b>{parsed.date}</b></>;
                      }
                      return <>Preview → <b>{parsed.type}</b> | <b>{parsed.concept}</b> | € <b>{parsed.amount}</b> | Date: <b>{parsed.date}</b></>;
                    })()}
                  </div>
                )}
              </form>
            </Card>

            <Card title="Monthly totals (Income / Expenses / ROI / Investment)">
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 2 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                    <XAxis dataKey="month" stroke="#8b8ba7" tick={{ fontSize: 8 }} tickMargin={1} height={16} tickFormatter={shortMonth} minTickGap={18} />
                    <YAxis stroke="#8b8ba7" tick={{ fontSize: 10 }} width={38} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.06)" }}
                      contentStyle={{ background: "#0b1e4f", border: "1px solid rgba(58,160,255,0.35)", borderRadius: 12 }}
                      labelStyle={{ color: "#d8d4fe" }}
                    />
                    <Bar dataKey="income" fill="#00d5ff" />
                    <Bar dataKey="expenses" fill="#ff4b4b" />
                    <Bar dataKey="roi" fill="#39ff88" />
                    <Bar dataKey="investment" fill="#ffe600" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card title="Savings evolution">
                <div className="w-full h-[220px] md:h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 6, right: 8, left: -6, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#8b8ba7" tick={{ fontSize: 8 }} tickMargin={1} height={16} tickFormatter={shortMonth} minTickGap={18} />
                      <YAxis stroke="#8b8ba7" tick={{ fontSize: 10 }} width={34} />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.16)", strokeWidth: 1 }}
                        contentStyle={{ background: "#0b1e4f", border: "1px solid rgba(58,160,255,0.35)", borderRadius: 12 }}
                        labelStyle={{ color: "#d8d4fe" }}
                      />
                      <Line type="monotone" dataKey="savings" stroke="#00d5ff" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Debt evolution">
                <div className="w-full h-[220px] md:h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 6, right: 8, left: -6, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#8b8ba7" tick={{ fontSize: 8 }} tickMargin={1} height={16} tickFormatter={shortMonth} minTickGap={18} />
                      <YAxis stroke="#8b8ba7" tick={{ fontSize: 10 }} width={34} />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.16)", strokeWidth: 1 }}
                        contentStyle={{ background: "#0b1e4f", border: "1px solid rgba(58,160,255,0.35)", borderRadius: 12 }}
                        labelStyle={{ color: "#d8d4fe" }}
                      />
                      <Line type="monotone" dataKey="debt" stroke="#ff4b4b" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Net worth evolution">
                <div className="w-full h-[220px] md:h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 6, right: 8, left: -6, bottom: 2 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                      <XAxis dataKey="month" stroke="#8b8ba7" tick={{ fontSize: 8 }} tickMargin={1} height={16} tickFormatter={shortMonth} minTickGap={18} />
                      <YAxis stroke="#8b8ba7" tick={{ fontSize: 10 }} width={34} />
                      <Tooltip
                        cursor={{ stroke: "rgba(255,255,255,0.16)", strokeWidth: 1 }}
                        contentStyle={{ background: "#0b1e4f", border: "1px solid rgba(58,160,255,0.35)", borderRadius: 12 }}
                        labelStyle={{ color: "#d8d4fe" }}
                      />
                      <Line type="monotone" dataKey="netWorth" stroke="#b06cff" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <Card title="Crypto portfolio">
              <div className="mb-3 text-sm text-zinc-300">
                Total: <span className="font-semibold text-amber-300">€ {cryptoTotal.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {holdings.map((h) => (
                  <div key={h.coin} className="rounded-lg border border-white/15 bg-[#0d2a63]/45 p-3 flex items-center justify-between">
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
                <div className="rounded-lg bg-[#0d2a63]/45 border border-white/15 px-3 py-2 text-zinc-200">Purple/red shaded zones = confidence bands</div>
                <div className="rounded-lg bg-[#0d2a63]/45 border border-white/15 px-3 py-2 text-zinc-200">Savings should trend up, debt should trend down</div>
                <div className="rounded-lg bg-[#0d2a63]/45 border border-white/15 px-3 py-2 text-zinc-200">Growth shown on right axis</div>
              </div>
              <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={forecast} margin={{ top: 8, right: 16, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" />
                    <XAxis dataKey="month" stroke="#8b8ba7" tick={{ fontSize: 8 }} tickMargin={6} height={22} tickFormatter={shortMonth} minTickGap={20} />
                    <YAxis yAxisId="left" stroke="#8b8ba7" tick={{ fontSize: 10 }} width={38} />
                    <YAxis yAxisId="right" orientation="right" stroke="#39ff88" tick={{ fontSize: 10 }} width={34} />
                    <ReferenceLine yAxisId="right" y={0} stroke="#3f3f46" strokeDasharray="4 4" />
                    <Tooltip
                      contentStyle={{ background: "#0b1e4f", border: "1px solid rgba(58,160,255,0.35)", borderRadius: 12 }}
                      labelStyle={{ color: "#d8d4fe" }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="projectedSavingsHigh" stroke="none" fill="#8b5cf640" />
                    <Area yAxisId="left" type="monotone" dataKey="projectedSavingsLow" stroke="none" fill="#8b5cf620" />
                    <Area yAxisId="left" type="monotone" dataKey="projectedDebtHigh" stroke="none" fill="#ff4b4b40" />
                    <Area yAxisId="left" type="monotone" dataKey="projectedDebtLow" stroke="none" fill="#ff4b4b20" />
                    <Line yAxisId="left" type="monotone" dataKey="projectedSavings" stroke="#b06cff" strokeWidth={3} dot={{ r: 2 }} />
                    <Line yAxisId="left" type="monotone" dataKey="projectedDebt" stroke="#ff4b4b" strokeWidth={3} dot={{ r: 2 }} />
                    <Line yAxisId="right" type="monotone" dataKey="projectedGrowth" stroke="#39ff88" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 1 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Last 5 daily movements">
              <div className="space-y-2">
                {movements.map((m, idx) => {
                  const meta = movementMeta(m.type);
                  return (
                    <div key={`${m.date}-${m.concept}-${idx}`} className="rounded-lg border border-white/15 bg-[#0d2a63]/45 px-3 py-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0 text-sm text-zinc-100">
                        <span className={meta.color}>{meta.icon}</span>
                        <span className="truncate">{m.concept}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-400 whitespace-nowrap">{m.date}</span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-300 whitespace-nowrap">{m.type}</span>
                      </div>
                      <div className={`text-sm font-semibold whitespace-nowrap ${meta.amountColor}`}>€ {m.amount.toLocaleString()}</div>
                    </div>
                  );
                })}
                {!movements.length && <div className="text-sm text-zinc-400">No movements found.</div>}
              </div>
            </Card>

            <Card title="YTD quick totals">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Badge label="Income" value={totals.income} color="text-green-300" />
                <Badge label="Expenses" value={Math.abs(totals.expenses)} color="text-red-300" />
                <Badge label="ROI" value={totals.roi} color="text-lime-300" />
                <Badge label="Investment" value={Math.abs(totals.investment)} color="text-amber-300" />
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

function movementMeta(type: string) {
  const t = String(type || "").toLowerCase();
  if (t === "expense") return { icon: <ArrowDownCircle size={16} />, color: "text-red-300", amountColor: "text-red-300" };
  if (t === "income") return { icon: <ArrowUpCircle size={16} />, color: "text-cyan-300", amountColor: "text-cyan-300" };
  if (t === "roi") return { icon: <Sparkles size={16} />, color: "text-lime-300", amountColor: "text-lime-300" };
  if (t === "investment") return { icon: <BriefcaseBusiness size={16} />, color: "text-amber-300", amountColor: "text-amber-300" };
  return { icon: <Coins size={16} />, color: "text-zinc-300", amountColor: "text-zinc-200" };
}

function Kpi({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#0b3a78]/45 to-[#0f5b8f]/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
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
      className="rounded-2xl border border-cyan-300/20 bg-[#0a1f54]/82 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35),inset_0_0_20px_rgba(0,213,255,0.05)] relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(34,211,238,0.35) 1px, transparent 1px), linear-gradient(0deg, rgba(34,211,238,0.25) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <h2 className="mb-3 text-sm text-cyan-200/90 relative">{title}</h2>
      <div className="relative">{children}</div>
    </motion.section>
  );
}

function Badge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-[#0d2a63]/45 p-3">
      <div className="text-zinc-300">{label}</div>
      <div className={`font-semibold ${color}`}>€ {value.toLocaleString()}</div>
    </div>
  );
}
