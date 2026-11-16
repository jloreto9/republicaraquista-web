import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_SEASON } from "@/lib/constants";
import { getLineupCardData } from "@/lib/lineup-card-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawGamePk = searchParams.get("gamePk");
    const rawSeason = searchParams.get("season");

    const parsedGamePk = rawGamePk ? Number(rawGamePk) : NaN;
    const gamePk =
      Number.isInteger(parsedGamePk) && parsedGamePk > 0 ? parsedGamePk : undefined;

    const parsedSeason = rawSeason ? parseInt(rawSeason, 10) : NaN;
    const season =
      Number.isInteger(parsedSeason) && parsedSeason >= 2000 ? parsedSeason : ACTIVE_SEASON;

    const data = await getLineupCardData(gamePk, season);

    return NextResponse.json(
      { success: true, data },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/noticueva/lineup-card error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener los datos de la tarjeta de lineup",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}
