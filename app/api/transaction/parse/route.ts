import { NextResponse } from "next/server";

type Parsed = {
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

function todayMMDDYYYY() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function parseNatural(input: string): Parsed | KrisParsed {
  const s = input.trim();

  let km = s.match(/^kris\s+out\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s*(.*)$/i);
  if (km) {
    return {
      target: "kris",
      date: todayMMDDYYYY(),
      action: `${km[3]?.trim() || "Product"} out`.trim(),
      weight: Number(km[1]),
      value: Number(km[2]),
    };
  }

  km = s.match(/^kris\s+(?:paid|money\s*in)\s+([0-9]+(?:\.[0-9]+)?)\s*(.*)$/i);
  if (km) {
    return {
      target: "kris",
      date: todayMMDDYYYY(),
      action: "Money in",
      value: Number(km[1]),
    };
  }

  let m = s.match(/^spent\s+([0-9]+(?:\.[0-9]+)?)\s+on\s+(.+)$/i);
  if (m) {
    return {
      date: todayMMDDYYYY(),
      concept: m[2],
      amount: Number(m[1]),
      type: "Expense",
      category: "General",
    };
  }

  m = s.match(/^earned\s+([0-9]+(?:\.[0-9]+)?)\s+from\s+(.+)$/i);
  if (m) {
    return {
      date: todayMMDDYYYY(),
      concept: m[2],
      amount: Number(m[1]),
      type: "Income",
      category: "General",
    };
  }

  m = s.match(/^roi\s+([0-9]+(?:\.[0-9]+)?)\s+(.+)$/i);
  if (m) {
    return {
      date: todayMMDDYYYY(),
      concept: m[2],
      amount: Number(m[1]),
      type: "ROI",
      category: "General",
    };
  }

  m = s.match(/^invest(?:ed)?\s+([0-9]+(?:\.[0-9]+)?)\s+(.+)$/i);
  if (m) {
    return {
      date: todayMMDDYYYY(),
      concept: m[2],
      amount: Number(m[1]),
      type: "Investment",
      category: "General",
    };
  }

  m = s.match(/^add\s+(expense|income|roi|investment|balance)\s+([0-9]+(?:\.[0-9]+)?)\s+(.+)$/i);
  if (m) {
    const t = m[1].toLowerCase();
    const map: Record<string, Parsed["type"]> = {
      expense: "Expense",
      income: "Income",
      roi: "ROI",
      investment: "Investment",
      balance: "Balance",
    };
    return {
      date: todayMMDDYYYY(),
      concept: m[3],
      amount: Number(m[2]),
      type: map[t],
      category: "General",
    };
  }

  throw new Error(
    'Could not parse. Try: "spent 24.9 on groceries", "earned 2200 from salary", "invest 300 crypto", "kris out 20 120 mandarin", "kris paid 90"'
  );
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const parsed = parseNatural(prompt);
    return NextResponse.json({ ok: true, parsed });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
