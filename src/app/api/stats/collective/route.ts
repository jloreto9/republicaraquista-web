import { NextRequest, NextResponse } from "next/server";
import { getCollectiveStats } from "@/lib/collective";
import { getActiveSeason } from "@/lib/season-service";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const activeSeason = await getActiveSeason();
  const season = searchParams.get("season")
    ? parseInt(searchParams.get("season")!, 10)
    : activeSeason;
  const phase = searchParams.get("phase") || "R";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  try {
    const stats = await getCollectiveStats(season, phase, startDate, endDate);
    return NextResponse.json({
      success: true,
      season,
      phase,
      startDate,
      endDate,
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
