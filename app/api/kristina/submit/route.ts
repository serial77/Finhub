import { NextResponse } from "next/server";
import { appendKristinaTransaction } from "@/lib/sheets";

function todayMMDDYYYY() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function inferCategory(text: string) {
  const t = text.toLowerCase();
  if (t.includes("groc") || t.includes("super") || t.includes("mercadona")) return "Food";
  if (t.includes("rent")) return "Rent";
  if (t.includes("uber") || t.includes("taxi") || t.includes("bus") || t.includes("metro")) return "Transport";
  if (t.includes("light") || t.includes("water") || t.includes("electric")) return "Utilities";
  return "General";
}

function parseNatural(prompt: string) {
  const s = prompt.trim();

  let m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s+(?:for|on)\s+(.+)$/i);
  if (m) return { amount: Number(m[1]), concept: m[2], type: "Expense" as const, date: todayMMDDYYYY() };

  m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s+(.+)$/i);
  if (m) return { amount: Number(m[1]), concept: m[2], type: "Expense" as const, date: todayMMDDYYYY() };

  m = s.match(/^(?:i\s+)?(?:take|took|spent)\s+([0-9]+(?:\.[0-9]+)?)\s+(?:(?:for|on)\s+)?(.+)$/i);
  if (m) return { amount: Number(m[1]), concept: m[2], type: "Expense" as const, date: todayMMDDYYYY() };

  m = s.match(/^add\s+expense\s+([0-9]+(?:\.[0-9]+)?)\s+(.+)$/i);
  if (m) return { amount: Number(m[1]), concept: m[2], type: "Expense" as const, date: todayMMDDYYYY() };

  throw new Error('Could not parse. Try: "I took 24.5 for groceries"');
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const parsed = parseNatural(prompt);
    const result = await appendKristinaTransaction({
      date: parsed.date,
      concept: parsed.concept,
      amount: parsed.amount,
      type: parsed.type,
      category: inferCategory(parsed.concept),
      notes: "kristina quick add",
    });

    return NextResponse.json({ ok: true, parsed, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
