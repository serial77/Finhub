import { NextResponse } from "next/server";
import { undoKristinaMovement } from "@/lib/sheets";

export async function POST(req: Request) {
  try {
    const { rowNumber } = await req.json();
    if (!Number.isFinite(Number(rowNumber))) {
      return NextResponse.json({ error: "rowNumber is required" }, { status: 400 });
    }

    const result = await undoKristinaMovement(Number(rowNumber));
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
