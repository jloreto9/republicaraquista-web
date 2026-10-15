import { NextRequest, NextResponse } from "next/server";
import {
  getPlayerBattedBalls,
  computeSprayStats,
  getPlayerStrikeZoneData,
  getLeonesSprayPlayers,
} from "@/lib/spray-engine";
import { getDynamicSprayData } from "@/lib/game-feed-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeSeason = await getActiveSeason();
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : activeSeason;
    const playerId = parseInt(searchParams.get("player_id") ?? "0", 10);

    if (season >= activeSeason) {
      const dynamicResult = await getDynamicSprayData(season, playerId);
      const player =
        dynamicResult.players.find((p) => p.id === playerId) || dynamicResult.players[0];

      return NextResponse.json({
        season,
        player,
        players: dynamicResult.players,
        battedBalls: dynamicResult.battedBalls,
        sprayStats: dynamicResult.sprayStats,
        pitches: dynamicResult.pitches,
        strikeZoneMetrics: dynamicResult.strikeZoneMetrics,
      });
    }

    const balls = getPlayerBattedBalls(playerId, season);
    const stats = computeSprayStats(balls);
    const { pitches, metrics } = getPlayerStrikeZoneData(playerId, season);
    const players = getLeonesSprayPlayers(season);

    const player = players.find((p) => p.id === playerId) || players[0];

    return NextResponse.json({
      season,
      player,
      players,
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
