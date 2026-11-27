import { NextRequest, NextResponse } from "next/server";
import { getPlayerLvbpCareer } from "@/lib/player-career-service";

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

    const career = await getPlayerLvbpCareer(playerId, type);

    return NextResponse.json(
      { success: true, career },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
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
