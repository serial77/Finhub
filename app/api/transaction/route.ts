import { NextResponse } from "next/server";
import { appendTransaction } from "@/lib/sheets";

function todayMMDDYYYY() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const concept = String(body.concept || "").trim();
    const type = String(body.type || "").trim() as "Income" | "Expense" | "ROI" | "Investment" | "Balance";
    const amount = Number(body.amount);

    if (!concept) return NextResponse.json({ error: "concept is required" }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "amount must be > 0" }, { status: 400 });
    if (!["Income", "Expense", "ROI", "Investment", "Balance"].includes(type)) {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }

    const result = await appendTransaction({
      date: body.date || todayMMDDYYYY(),
      concept,
      amount,
      type,
      category: body.category || "General",
      notes: body.notes || "",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
