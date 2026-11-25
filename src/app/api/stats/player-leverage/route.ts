import { NextRequest, NextResponse } from "next/server";
import { getPlayerLeverageSplits } from "@/lib/player-leverage-service";
import { getActiveSeason } from "@/lib/constants";

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

    const activeSeason = await getActiveSeason();
    const seasonParam = searchParams.get("season");
    let season = activeSeason;
    if (seasonParam !== null) {
      if (!/^\d+$/.test(seasonParam.trim())) {
        return NextResponse.json(
          { success: false, error: "Parámetro season inválido" },
          { status: 400 }
        );
      }
      season = parseInt(seasonParam.trim(), 10);
      if (!Number.isInteger(season) || season <= 0) {
        return NextResponse.json(
          { success: false, error: "Parámetro season inválido" },
          { status: 400 }
        );
      }
    }

    const leverage = await getPlayerLeverageSplits(playerId, type, season);
    const cacheControl =
      season < activeSeason
        ? "public, s-maxage=3600, stale-while-revalidate=7200"
        : "public, s-maxage=300, stale-while-revalidate=600";

    return NextResponse.json(
      { success: true, leverage },
      {
        headers: {
          "Cache-Control": cacheControl,
        },
      }
    );
  } catch (error) {
    console.error("Error en API /api/stats/player-leverage:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar leverage individual" },
      { status: 500 }
    );
  }
}
