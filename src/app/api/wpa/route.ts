import { NextRequest, NextResponse } from "next/server";
import { processGameWpa, getSeasonWpaLeaders, LEONES_ALL_GAMES } from "@/lib/wpa-engine";
import { getActiveSeason } from "@/lib/season-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gamePkParam = searchParams.get("game_pk");
    const leadersParam = searchParams.get("leaders");

    if (leadersParam === "true") {
      const activeSeason = await getActiveSeason();
      const leaders = getSeasonWpaLeaders();
      return NextResponse.json({
        season: activeSeason,
        leaders,
        games: LEONES_ALL_GAMES,
      });
    }

    const gamePk = gamePkParam ? parseInt(gamePkParam, 10) : LEONES_ALL_GAMES[0].id;
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
