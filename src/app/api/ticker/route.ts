import { NextRequest, NextResponse } from "next/server";
import { getLeagueTickerGames } from "@/lib/ticker-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seasonParam = searchParams.get("season");
    const activeSeason = seasonParam ? Number(seasonParam) : await getActiveSeason();

    const data = await getLeagueTickerGames(activeSeason);
    const hasLive = data.games.some((g) => g.isLive);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": hasLive
          ? "public, s-maxage=20, stale-while-revalidate=40"
          : "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error en /api/ticker:", error);
    return NextResponse.json(
      {
        success: false,
        dateLabel: "Jornada LVBP",
        games: [],
        lastUpdated: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
