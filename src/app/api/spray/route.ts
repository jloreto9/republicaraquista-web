import { NextRequest, NextResponse } from "next/server";
import {
  getPlayerBattedBalls,
  computeSprayStats,
  getPlayerStrikeZoneData,
  LEONES_SPRAY_PLAYERS,
} from "@/lib/spray-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = parseInt(searchParams.get("player_id") || "660821", 10);

    const balls = getPlayerBattedBalls(playerId);
    const stats = computeSprayStats(balls);
    const { pitches, metrics } = getPlayerStrikeZoneData(playerId);

    const player = LEONES_SPRAY_PLAYERS.find((p) => p.id === playerId) || LEONES_SPRAY_PLAYERS[0];

    return NextResponse.json({
      player,
      players: LEONES_SPRAY_PLAYERS,
      battedBalls: balls,
      sprayStats: stats,
      pitches,
      strikeZoneMetrics: metrics,
    });
  } catch (error) {
    console.error("API Spray error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar Spray Charts y Zona de Strike" },
      { status: 500 }
    );
  }
}
