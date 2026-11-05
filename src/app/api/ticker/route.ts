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

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=59",
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
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
