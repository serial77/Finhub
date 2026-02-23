import { NextResponse } from "next/server";
import { fetchKristinaData } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await fetchKristinaData();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
