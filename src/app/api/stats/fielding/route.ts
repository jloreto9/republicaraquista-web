import { NextRequest, NextResponse } from "next/server";
import { getFieldingStats, getTeamGamesMap } from "@/lib/supabase";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : await getActiveSeason();
    const phase = searchParams.get("phase") || "R";
    const teamId = searchParams.get("team_id") || "all";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 1000;
    const minTc = searchParams.get("min_tc")
      ? parseInt(searchParams.get("min_tc")!, 10)
      : 0;

    const [stats, { teamGamesMap, teamWinPctMap, maxGames }] = await Promise.all([
      getFieldingStats(season, phase, teamId, limit, minTc),
      getTeamGamesMap(season, phase),
    ]);

    return NextResponse.json(
      {
        success: true,
        season,
        phase,
        team_id: teamId,
        count: stats.length,
        maxGames,
        teamGamesMap,
        teamWinPctMap,
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
    console.error("Error en /api/stats/fielding:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener estadísticas de fildeo",
      },
      { status: 500 }
    );
  }
}
