import { NextResponse } from "next/server";
import { appendKrisMovement } from "@/lib/sheets";

function todayMMDDYYYY() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function parseKrisNatural(prompt: string) {
  const s = prompt.trim();

  let m = s.match(/^kris\s+out\s+([0-9]+(?:\.[0-9]+)?)\s+([0-9]+(?:\.[0-9]+)?)\s*(.*)$/i);
  if (m) {
    return {
      date: todayMMDDYYYY(),
      action: `${m[3]?.trim() || "Product"} out`.trim(),
      weight: Number(m[1]),
      value: Number(m[2]),
    };
  }

  m = s.match(/^kris\s+(?:paid|money\s*in)\s+([0-9]+(?:\.[0-9]+)?)\s*(.*)$/i);
  if (m) {
    return {
      date: todayMMDDYYYY(),
      action: "Money in",
      value: Number(m[1]),
    };
  }

  throw new Error('Could not parse. Try: "kris out 20 120 mandarin" or "kris paid 90"');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let payload: { date: string; action: string; weight?: number; value: number };

    if (typeof body.prompt === "string" && body.prompt.trim()) {
      payload = parseKrisNatural(body.prompt);
    } else {
      const action = String(body.action || "").trim();
      const value = Number(body.value);
      const weight = body.weight === undefined || body.weight === "" ? undefined : Number(body.weight);

      if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });
      if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: "value must be > 0" }, { status: 400 });
      if (weight !== undefined && (!Number.isFinite(weight) || weight < 0)) {
        return NextResponse.json({ error: "weight must be >= 0" }, { status: 400 });
      }

      payload = {
        date: body.date || todayMMDDYYYY(),
        action,
        value,
        ...(weight !== undefined ? { weight } : {}),
      };
    }

    const result = await appendKrisMovement(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
