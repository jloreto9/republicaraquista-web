import { NextRequest, NextResponse } from "next/server";
import { getBullpenAndLineups } from "@/lib/bullpen";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const season = parseInt(searchParams.get("season") || "2025", 10);
  const teamId = parseInt(searchParams.get("teamId") || "695", 10);

  try {
    const data = getBullpenAndLineups(season, teamId);
    return NextResponse.json({
      success: true,
      season,
      teamId,
      data,
    });
  } catch (error) {
    console.error("API error in /api/bullpen:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error processing bullpen data",
      },
      { status: 500 }
    );
  }
}
