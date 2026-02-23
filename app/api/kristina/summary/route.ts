import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/sheets";

export async function GET() {
  try {
    const data = await fetchDashboardData();
    const latest = (data.months || [])[data.months.length - 1];
    return NextResponse.json({
      ok: true,
      month: latest?.month || null,
      dailyAccount: latest?.dailyAccount || 0,
      savings: latest?.savings || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
