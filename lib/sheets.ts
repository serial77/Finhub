import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const KEY_FILE = process.env.GOOGLE_APPLICATION_CREDENTIALS || "../secrets/google-service-account.json";
const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
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

function monthSort(tabs: string[]) {
  const map: Record<string, number> = {
    JAN: 1,
    FEB: 2,
    MAR: 3,
    APR: 4,
    MAY: 5,
    JUN: 6,
    JUL: 7,
    AUG: 8,
    SEP: 9,
    OCT: 10,
    NOV: 11,
    DEC: 12,
  };

  return [...tabs].sort((a, b) => {
    const ya = Number(`20${a.slice(3)}`);
    const yb = Number(`20${b.slice(3)}`);
    if (ya !== yb) return ya - yb;
    return map[a.slice(0, 3)] - map[b.slice(0, 3)];
  });
}

export async function fetchDashboardData() {
  const auth = SERVICE_ACCOUNT_JSON
    ? new google.auth.GoogleAuth({
        credentials: JSON.parse(SERVICE_ACCOUNT_JSON),
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      })
    : new google.auth.GoogleAuth({
        keyFile: KEY_FILE,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

  const sheets = google.sheets({ version: "v4", auth });

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const tabs = (meta.data.sheets || [])
    .map((s) => s.properties?.title || "")
    .filter((t) => /^[A-Z]{3}\d{2}$/.test(t));

  const months = monthSort(tabs);

  const summary = [] as Array<{
    month: string;
    dailyAccount: number;
    income: number;
    expenses: number;
    roi: number;
    investment: number;
    growth: number;
    savings: number;
    debt: number;
  }>;

  for (const tab of months) {
    const [daily, savings, debt, header, legacyTotals, v2Totals, topSummary] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!A11:F1000` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!J11:J1000` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!M11:M1000` }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!B2:B4`, valueRenderOption: 'UNFORMATTED_VALUE' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!H2:H3`, valueRenderOption: 'UNFORMATTED_VALUE' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!B3:B4`, valueRenderOption: 'UNFORMATTED_VALUE' }),
      sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `'${tab}'!A1:N6`, valueRenderOption: 'UNFORMATTED_VALUE' }),
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

    const savingsFromRows = (savings.data.values || []).reduce((acc, r) => acc + toNumber(r[0]), 0);
    const debtFromRows = (debt.data.values || []).reduce((acc, r) => acc + toNumber(r[0]), 0);

    const b2b4 = (header.data.values || []).flat().map(toNumber); // legacy: B2 daily, B3 savings
    const h2h3 = (legacyTotals.data.values || []).flat().map(toNumber); // legacy debt area
    const b3b4v2 = (v2Totals.data.values || []).flat().map(toNumber); // v2: B3 daily, B4 savings
    const topGrid = (topSummary.data.values || []) as unknown[][];

    const labelDaily = findValueByLabel(topGrid, /^daily\s*account$/i);
    const labelSavings = findValueByLabel(topGrid, /^savings\s*account$/i);
    const labelDebt = findValueByLabel(topGrid, /^debt$/i);
    const labelMonthIn = findValueByLabel(topGrid, /^month\s*in$/i);
    const labelMonthOut = findValueByLabel(topGrid, /^month\s*out$/i);

    const dailyAccount = (labelDaily ?? b3b4v2[0] ?? b2b4[0] ?? 0) as number;

    const savingsCandidates = [savingsFromRows, labelSavings, b3b4v2[1], b2b4[1]].filter((n) => Number.isFinite(n));
    const savingsTotal = savingsCandidates.find((n) => Math.abs(Number(n)) > 0) ?? 0;

    const debtCandidates = [debtFromRows, labelDebt, h2h3[0]].filter((n) => Number.isFinite(n));
    const debtTotal = debtCandidates.find((n) => Math.abs(Number(n)) > 0) ?? 0;

    const incomeForDashboard = labelMonthIn ?? (income + roi);
    const expensesForDashboard = labelMonthOut ?? (expenses + investment);
    const growth = incomeForDashboard + expensesForDashboard;

    summary.push({
      month: tab,
      dailyAccount,
      income: incomeForDashboard,
      expenses: expensesForDashboard,
      roi,
      investment,
      growth,
      savings: savingsTotal,
      debt: debtTotal,
    });
  }

  const recent = summary.slice(-3);
  const avg = (key: keyof (typeof summary)[number]) => {
    if (!recent.length) return 0;
    return recent.reduce((a, r) => a + Number(r[key] || 0), 0) / recent.length;
  };

  const avgGrowth = avg("growth");
  const avgSavingsDelta = recent.length > 1 ? (recent[recent.length - 1].savings - recent[0].savings) / (recent.length - 1) : 0;
  const avgDebtDelta = recent.length > 1 ? (recent[recent.length - 1].debt - recent[0].debt) / (recent.length - 1) : 0;

  const map: Record<string, number> = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };
  const rev = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const last = summary[summary.length - 1];
  const forecasts: Array<{ month: string; projectedGrowth: number; projectedSavings: number; projectedDebt: number }> = [];
  if (last) {
    let mm = map[last.month.slice(0, 3)] || 1;
    let yy = Number(`20${last.month.slice(3)}`);
    let s = last.savings;
    let d = last.debt;
    for (let i = 1; i <= 3; i++) {
      mm += 1;
      if (mm > 12) {
        mm = 1;
        yy += 1;
      }
      s += avgSavingsDelta;
      d += avgDebtDelta;
      forecasts.push({
        month: `${rev[mm - 1]}${String(yy).slice(-2)}`,
        projectedGrowth: avgGrowth,
        projectedSavings: s,
        projectedDebt: d,
      });
    }
  }

  return {
    months: summary,
    forecast: {
      horizonMonths: 3,
      avgGrowth,
      avgSavingsDelta,
      avgDebtDelta,
      points: forecasts,
    },
  };
}
