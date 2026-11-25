import { NextRequest, NextResponse } from "next/server";
import {
  getPlayerSplitsProfile,
  getAllAvailablePlayersForSplits,
} from "@/lib/player-splits-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    const activeSeason = await getActiveSeason();
    const seasonParam = searchParams.get("season");
    const season = seasonParam ? parseInt(seasonParam, 10) : activeSeason;
    const cacheControl =
      season < activeSeason
        ? "public, s-maxage=3600, stale-while-revalidate=7200"
        : "public, s-maxage=300, stale-while-revalidate=600";

    if (mode === "list") {
      const players = await getAllAvailablePlayersForSplits(season);
      return NextResponse.json(
        { success: true, count: players.length, players },
        {
          headers: {
            "Cache-Control": cacheControl,
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
            "Cache-Control": cacheControl,
          },
        }
      );
    }

    if (!/^\d+$/.test(playerIdStr.trim())) {
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
          "Cache-Control": cacheControl,
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
