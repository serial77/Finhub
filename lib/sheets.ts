import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || "../secrets/google-service-account.json";
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const BASE_TAB = process.env.FINANCE_TAB || "FEB26";

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatSheetDate(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    // Google Sheets date serial (days since 1899-12-30)
    const epoch = Date.UTC(1899, 11, 30);
    const ms = Math.round(value * 86400000);
    const d = new Date(epoch + ms);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  }

  const n = Number(value);
  if (Number.isFinite(n) && String(value).trim() !== "") {
    const epoch = Date.UTC(1899, 11, 30);
    const ms = Math.round(n * 86400000);
    const d = new Date(epoch + ms);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  }

  return String(value);
}

function findValueByLabel(grid: unknown[][], labelRegex: RegExp): number | null {
  for (const row of grid) {
    for (let i = 0; i < row.length; i++) {
      const cell = String(row[i] ?? "").trim();
      if (!cell) continue;
      if (labelRegex.test(cell)) {
        const right = toNumber(row[i + 1]);
        if (Number.isFinite(right) && right !== 0) return right;
      }
    }
  }
  return null;
}

function getAuth(scopes: string[]) {
  return SERVICE_ACCOUNT_JSON
    ? new google.auth.GoogleAuth({ credentials: JSON.parse(SERVICE_ACCOUNT_JSON), scopes })
    : new google.auth.GoogleAuth({ keyFile: KEY_FILE, scopes });
}

function monthSort(tabs: string[]) {
  const map: Record<string, number> = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
    JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
  };

  return [...tabs].sort((a, b) => {
    const ya = Number(`20${a.slice(3)}`);
    const yb = Number(`20${b.slice(3)}`);
    if (ya !== yb) return ya - yb;
    return map[a.slice(0, 3)] - map[b.slice(0, 3)];
  });
}

export async function fetchDashboardData() {
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabs = (meta.data.sheets || [])
    .map((s) => s.properties?.title || "")
    .filter((t) => /^[A-Z]{3}\d{2}$/.test(t));

  const months = monthSort(tabs);

  const summary: Array<{
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
  }> = [];

  async function safeGet(range: string, valueRenderOption?: "UNFORMATTED_VALUE"): Promise<{ data: { values: unknown[][] } }> {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range,
        ...(valueRenderOption ? { valueRenderOption } : {}),
      });
      return { data: { values: (res.data.values || []) as unknown[][] } };
    } catch {
      return { data: { values: [] } };
    }
  }

  for (const tab of months) {
    const [
      daily,
      savingsCol,
      debtCol,
      ownedCol,
      cryptoTable,
      header,
      legacyDebt,
      v2Totals,
      topSummary,
      netWorthCell,
    ] = await Promise.all([
      safeGet(`'${tab}'!A11:F1000`),
      safeGet(`'${tab}'!J11:J1000`),
      safeGet(`'${tab}'!M11:M1000`),
      safeGet(`'${tab}'!P11:P1000`),
      safeGet(`'${tab}'!R11:T1000`),
      safeGet(`'${tab}'!B2:B4`, "UNFORMATTED_VALUE"),
      safeGet(`'${tab}'!H2:H3`, "UNFORMATTED_VALUE"),
      safeGet(`'${tab}'!B3:B4`, "UNFORMATTED_VALUE"),
      safeGet(`'${tab}'!A1:T8`, "UNFORMATTED_VALUE"),
      safeGet(`'${tab}'!B7:B7`, "UNFORMATTED_VALUE"),
    ]);

    let income = 0;
    let expenses = 0;
    let roi = 0;
    let investment = 0;

    for (const row of daily.data.values || []) {
      const amount = toNumber(row[2]);
      const type = String(row[3] || "").trim().toLowerCase();
      if (type === "income") income += amount;
      else if (type === "expense") expenses += amount;
      else if (type === "roi") roi += amount;
      else if (type === "investment") investment += amount;
    }

    const savingsFromRows = (savingsCol.data.values || []).reduce((acc, r) => acc + toNumber(r[0]), 0);
    const debtFromRows = (debtCol.data.values || []).reduce((acc, r) => acc + toNumber(r[0]), 0);
    const ownedFromRows = (ownedCol.data.values || []).reduce((acc, r) => acc + toNumber(r[0]), 0);
    const cryptoFromRows = (cryptoTable.data.values || [])
      .filter((r) => {
        const coin = String(r[0] || "").trim();
        if (!coin) return false;
        return !/total\s*crypto/i.test(coin);
      })
      .reduce((acc, r) => acc + toNumber(r[2]), 0);

    const b2b4 = (header.data.values || []).flat().map(toNumber);
    const h2h3 = (legacyDebt.data.values || []).flat().map(toNumber);
    const b3b4v2 = (v2Totals.data.values || []).flat().map(toNumber);
    const topGrid = (topSummary.data.values || []) as unknown[][];

    const labelDaily = findValueByLabel(topGrid, /^daily\s*account$/i);
    const labelSavings = findValueByLabel(topGrid, /^savings\s*account$/i);
    const labelDebt = findValueByLabel(topGrid, /^debt$/i);
    const labelOwned = findValueByLabel(topGrid, /^owned$/i);
    const labelMonthIn = findValueByLabel(topGrid, /^month\s*in$/i);
    const labelMonthOut = findValueByLabel(topGrid, /^month\s*out$/i);
    const labelCryptoTotal = findValueByLabel(topGrid, /^total\s*crypto$/i);
    const sheetNetWorth = toNumber((netWorthCell.data.values?.[0] || [0])[0]);

    const dailyAccount = (labelDaily ?? b3b4v2[0] ?? b2b4[0] ?? 0) as number;
    const savings = [savingsFromRows, labelSavings, b3b4v2[1], b2b4[1]].find((n) => Number.isFinite(Number(n)) && Math.abs(Number(n)) > 0) ?? 0;
    const debt = [debtFromRows, labelDebt, h2h3[0]].find((n) => Number.isFinite(Number(n)) && Math.abs(Number(n)) > 0) ?? 0;
    const owned = [ownedFromRows, labelOwned].find((n) => Number.isFinite(Number(n)) && Math.abs(Number(n)) > 0) ?? 0;
    const crypto = [cryptoFromRows, labelCryptoTotal].find((n) => Number.isFinite(Number(n)) && Math.abs(Number(n)) > 0) ?? 0;

    const incomeForDashboard = labelMonthIn ?? (income + roi);
    const expensesForDashboard = labelMonthOut ?? (expenses + investment);
    const growth = incomeForDashboard + expensesForDashboard;

    const netWorth = sheetNetWorth || (dailyAccount + Number(savings) + Number(owned) - Number(debt) + Number(crypto));

    summary.push({
      month: tab,
      dailyAccount,
      income: Number(incomeForDashboard),
      expenses: Number(expensesForDashboard),
      roi,
      investment,
      growth,
      savings: Number(savings),
      debt: Number(debt),
      owned: Number(owned),
      crypto: Number(crypto),
      netWorth,
    });
  }

  // Latest crypto holdings detail
  const latestTab = summary[summary.length - 1]?.month || BASE_TAB;
  const holdingsRes: { data: { values: unknown[][] } } = await (async () => {
    try {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${latestTab}'!R11:T1000` });
      return { data: { values: (res.data.values || []) as unknown[][] } };
    } catch {
      return { data: { values: [] } };
    }
  })();
  const holdings = (holdingsRes.data.values || [])
    .map((r) => ({ coin: String(r[0] || "").trim(), amount: toNumber(r[1]), euros: toNumber(r[2]) }))
    .filter((r) => r.coin && (r.amount !== 0 || r.euros !== 0));

  const recentDailyRes = await safeGet(`'${latestTab}'!A11:F1000`);
  const recentMovements = (recentDailyRes.data.values || [])
    .map((r) => ({
      date: String(r[0] || ""),
      concept: String(r[1] || ""),
      amount: toNumber(r[2]),
      type: String(r[3] || ""),
      category: String(r[4] || ""),
    }))
    .filter((r) => r.concept && r.type)
    .slice(-5)
    .reverse();

  const recent = summary.slice(-3);
  const avg = (key: keyof (typeof summary)[number]) => recent.length ? recent.reduce((a, r) => a + Number(r[key] || 0), 0) / recent.length : 0;

  const avgGrowth = avg("growth");
  const avgSavingsDelta = recent.length > 1 ? (recent[recent.length - 1].savings - recent[0].savings) / (recent.length - 1) : 0;
  const avgDebtDelta = recent.length > 1 ? (recent[recent.length - 1].debt - recent[0].debt) / (recent.length - 1) : 0;

  const deltas = <T extends keyof (typeof summary)[number]>(key: T) => {
    const out: number[] = [];
    for (let i = 1; i < summary.length; i++) out.push(Number(summary[i][key]) - Number(summary[i - 1][key]));
    return out;
  };
  const std = (arr: number[]) => {
    if (!arr.length) return 0;
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
  };

  const growthStd = std(deltas("growth"));
  const savingsStd = std(deltas("savings"));
  const debtStd = std(deltas("debt"));

  const map: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const rev = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const last = summary[summary.length - 1];
  const forecasts: Array<{
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
  }> = [];

  if (last) {
    let mm = map[last.month.slice(0, 3)] || 1;
    let yy = Number(`20${last.month.slice(3)}`);
    let s = last.savings;
    let d = last.debt;

    for (let i = 1; i <= 3; i++) {
      mm += 1;
      if (mm > 12) { mm = 1; yy += 1; }
      s += avgSavingsDelta;
      d += avgDebtDelta;
      forecasts.push({
        month: `${rev[mm - 1]}${String(yy).slice(-2)}`,
        projectedGrowth: avgGrowth,
        projectedGrowthLow: avgGrowth - growthStd,
        projectedGrowthHigh: avgGrowth + growthStd,
        projectedSavings: s,
        projectedSavingsLow: s - savingsStd,
        projectedSavingsHigh: s + savingsStd,
        projectedDebt: d,
        projectedDebtLow: d - debtStd,
        projectedDebtHigh: d + debtStd,
      });
    }
  }

  return {
    months: summary,
    crypto: {
      total: summary[summary.length - 1]?.crypto || 0,
      holdings,
    },
    recentMovements,
    forecast: {
      horizonMonths: 3,
      avgGrowth,
      avgSavingsDelta,
      avgDebtDelta,
      points: forecasts,
    },
  };
}

function currentMonthTabName(d = new Date()) {
  const mons = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${mons[d.getMonth()]}${String(d.getFullYear()).slice(-2)}`;
}

async function resolveWriteTab(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabs = new Set((meta.data.sheets || []).map((s) => s.properties?.title || ""));
  const now = currentMonthTabName();
  if (tabs.has(now)) return now;
  if (tabs.has(BASE_TAB)) return BASE_TAB;
  const monthTabs = monthSort([...tabs].filter((t) => /^[A-Z]{3}\d{2}$/.test(t)));
  return monthTabs[monthTabs.length - 1] || BASE_TAB;
}

type TxInput = {
  date: string;
  concept: string;
  amount: number;
  type: "Income" | "Expense" | "ROI" | "Investment" | "Balance";
  category?: string;
  notes?: string;
};

export async function appendTransaction(input: TxInput) {
  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = await resolveWriteTab(sheets);

  const amount = input.type === "Expense" || input.type === "Investment"
    ? -Math.abs(input.amount)
    : Math.abs(input.amount);

  const row = [
    input.date,
    input.concept,
    amount,
    input.type,
    input.category || "General",
    input.notes || "",
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${tab}'!A:F`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return { tab, updatedRange: res.data.updates?.updatedRange, row };
}

let kristinaCache: { at: number; data: any } | null = null;

export async function fetchKristinaData(force = false) {
  const now = Date.now();
  if (!force && kristinaCache && now - kristinaCache.at < 30000) return kristinaCache.data;

  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets.readonly"]);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = await resolveWriteTab(sheets);

  const [summary, daily] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!B3:B4`, valueRenderOption: "UNFORMATTED_VALUE" }),
    sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!A11:F1000`, valueRenderOption: "UNFORMATTED_VALUE" }),
  ]);

  const dailyAccount = toNumber((summary.data.values?.[0] || [0])[0]);
  const savings = toNumber((summary.data.values?.[1] || [0])[0]);

  const recentActions = (daily.data.values || [])
    .map((r, idx) => ({
      rowNumber: 11 + idx,
      date: formatSheetDate(r[0]),
      concept: String(r[1] || ""),
      amount: toNumber(r[2]),
      type: String(r[3] || ""),
      category: String(r[4] || ""),
    }))
    .filter((r) => /^kristina\s*-/i.test(r.concept))
    .slice(-5)
    .reverse();

  const data = { tab, dailyAccount, savings, recentActions };
  kristinaCache = { at: now, data };
  return data;
}

export async function appendKristinaTransaction(input: TxInput) {
  const out = await appendTransaction({ ...input, concept: /^kristina\s*-/i.test(input.concept) ? input.concept : `Kristina - ${input.concept}` });
  kristinaCache = null;
  return out;
}

export async function undoKristinaMovement(rowNumber: number) {
  if (!Number.isFinite(rowNumber) || rowNumber < 11) throw new Error("Invalid row number");

  const auth = getAuth(["https://www.googleapis.com/auth/spreadsheets"]);
  const sheets = google.sheets({ version: "v4", auth });
  const tab = await resolveWriteTab(sheets);

  const rowRange = `'${tab}'!A${rowNumber}:F${rowNumber}`;
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: rowRange, valueRenderOption: "UNFORMATTED_VALUE" });
  const row = (existing.data.values || [[]])[0];
  const concept = String(row[1] || "");
  if (!/^kristina\s*-/i.test(concept)) {
    throw new Error("This row is not a Kristina entry");
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: rowRange });
  kristinaCache = null;
  return { ok: true, tab, rowNumber };
}
