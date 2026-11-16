import { NextRequest, NextResponse } from "next/server";
import {
  getBattingStats,
  getStatsCacheControlHeader,
  getTeamGamesMap,
  parseStatsDateRange,
} from "@/lib/supabase";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateRange = parseStatsDateRange(searchParams);
    if (!dateRange.ok) {
      return NextResponse.json(
        {
          success: false,
          error: dateRange.error,
        },
        { status: 400 }
      );
    }

    const { startDate, endDate } = dateRange;
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : await getActiveSeason();
    const phase = searchParams.get("phase") || "R";
    const teamId = searchParams.get("team_id") || "all";
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 500;
    const minAb = searchParams.get("min_ab")
      ? parseInt(searchParams.get("min_ab")!, 10)
      : 0;

    const [stats, { teamGamesMap, teamWinPctMap, maxGames }] = await Promise.all([
      getBattingStats(season, phase, teamId, limit, minAb, startDate, endDate),
      getTeamGamesMap(season, phase, startDate, endDate),
    ]);

    return NextResponse.json(
      {
        success: true,
        season,
        phase,
        team_id: teamId,
        startDate,
        endDate,
        count: stats.length,
        maxGames,
        teamGamesMap,
        teamWinPctMap,
        data: stats,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": getStatsCacheControlHeader(endDate),
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
