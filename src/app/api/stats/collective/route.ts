import { NextRequest, NextResponse } from "next/server";
import { getCollectiveStats } from "@/lib/collective";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const season = parseInt(searchParams.get("season") || "2025", 10);
  const phase = searchParams.get("phase") || "R";

  try {
    const stats = await getCollectiveStats(season, phase);
    return NextResponse.json({
      success: true,
      season,
      phase,
      data: stats,
    });
  } catch (error) {
    console.error("API error in /api/stats/collective:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error fetching collective stats",
      },
      { status: 500 }
    );
  }
}
