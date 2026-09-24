import { NextRequest, NextResponse } from "next/server";
import { getRecentGames } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : 2025;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : 10;

    const games = await getRecentGames(season, limit);

    return NextResponse.json(
      {
        success: true,
        season,
        count: games.length,
        data: games,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/games:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al obtener juegos",
      },
      { status: 500 }
    );
  }
}
