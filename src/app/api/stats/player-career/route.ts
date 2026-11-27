import { NextRequest, NextResponse } from "next/server";
import { getCachedOrFetchPlayerLvbpCareer } from "@/lib/player-career-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerIdStr = searchParams.get("player_id");

    if (!playerIdStr || !/^\d+$/.test(playerIdStr.trim())) {
      return NextResponse.json(
        { success: false, error: "Parámetro player_id debe ser un entero positivo" },
        { status: 400 }
      );
    }

    const playerId = parseInt(playerIdStr.trim(), 10);
    if (!Number.isInteger(playerId) || playerId <= 0) {
      return NextResponse.json(
        { success: false, error: "Parámetro player_id debe ser un entero positivo" },
        { status: 400 }
      );
    }

    const typeParam = searchParams.get("type");
    const type = typeParam === "pitcher" ? "pitcher" : "batter";

    const { career, cacheStatus } = await getCachedOrFetchPlayerLvbpCareer(playerId, type);

    return NextResponse.json(
      { success: true, career },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          "X-Career-Cache": cacheStatus,
        },
      }
    );
  } catch (error) {
    console.error("Error en API /api/stats/player-career:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al obtener el historial de por vida LVBP" },
      { status: 500 }
    );
  }
}
