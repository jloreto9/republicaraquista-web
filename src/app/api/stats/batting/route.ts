import { NextRequest, NextResponse } from "next/server";
import { getBattingStats } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : 2025;
    const phase = searchParams.get("phase") || "R";
    const teamId = searchParams.get("team_id") || "all";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 50;
    const minAb = searchParams.get("min_ab")
      ? parseInt(searchParams.get("min_ab")!, 10)
      : 10;

    const stats = await getBattingStats(season, phase, teamId, limit, minAb);

    return NextResponse.json(
      {
        success: true,
        season,
        phase,
        team_id: teamId,
        count: stats.length,
        data: stats,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/stats/batting:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al obtener estadísticas de bateo",
      },
      { status: 500 }
    );
  }
}
