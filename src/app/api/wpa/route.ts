import { NextRequest, NextResponse } from "next/server";
import {
  processGameWpa,
  getSeasonWpaLeaders,
  getLeonesGamesList,
} from "@/lib/wpa-engine";
import { getActiveSeason } from "@/lib/season-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonParam = searchParams.get("season");
    const activeSeason = await getActiveSeason();
    const season = seasonParam ? parseInt(seasonParam, 10) : activeSeason;

    const gamePkParam = searchParams.get("game_pk");
    const leadersParam = searchParams.get("leaders");
    const gamesList = getLeonesGamesList(season);

    if (leadersParam === "true") {
      const leaders = getSeasonWpaLeaders(season);
      return NextResponse.json({
        season,
        leaders,
        games: gamesList,
      });
    }

    const defaultGameId = gamesList[0]?.id || 870090;
    const gamePk = gamePkParam ? parseInt(gamePkParam, 10) : defaultGameId;
    const wpaData = await processGameWpa(gamePk);

    if (!wpaData) {
      return NextResponse.json(
        { error: `No se pudieron cargar las jugadas para el juego ${gamePk}` },
        { status: 404 }
      );
    }

    return NextResponse.json(wpaData);
  } catch (error) {
    console.error("API WPA error:", error);
    return NextResponse.json(
      { error: "Error interno al procesar Win Expectancy & WPA" },
      { status: 500 }
    );
  }
}
