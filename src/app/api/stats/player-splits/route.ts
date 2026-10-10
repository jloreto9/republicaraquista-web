import { NextRequest, NextResponse } from "next/server";
import {
  getPlayerSplitsProfile,
  getAllAvailablePlayersForSplits,
} from "@/lib/player-splits-service";
import { ACTIVE_SEASON } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    const season = parseInt(searchParams.get("season") || String(ACTIVE_SEASON), 10);

    if (mode === "list") {
      const players = await getAllAvailablePlayersForSplits(season);
      return NextResponse.json(
        { success: true, count: players.length, players },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    const playerIdStr = searchParams.get("player_id");
    if (!playerIdStr) {
      // Si no se especifica jugador, retornar la lista de jugadores disponibles
      const players = await getAllAvailablePlayersForSplits(season);
      return NextResponse.json(
        { success: true, count: players.length, players },
        {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    const playerId = parseInt(playerIdStr, 10);
    const typeParam = searchParams.get("type");
    const type = typeParam === "pitcher" ? "pitcher" : "batter";

    const profile = await getPlayerSplitsProfile(playerId, type, season);

    if (!profile) {
      return NextResponse.json(
        { success: false, message: `No se encontraron registros para el jugador ${playerId}` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, profile },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error en API /api/stats/player-splits:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar splits individuales" },
      { status: 500 }
    );
  }
}
