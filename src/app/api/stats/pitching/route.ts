import { NextRequest, NextResponse } from "next/server";
import { getPitchingStats } from "@/lib/supabase";

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
    const minIp = searchParams.get("min_ip")
      ? parseFloat(searchParams.get("min_ip")!)
      : 3.0;

    const stats = await getPitchingStats(season, phase, teamId, limit, minIp);

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
    console.error("Error en /api/stats/pitching:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al obtener estadísticas de pitcheo",
      },
      { status: 500 }
    );
  }
}
