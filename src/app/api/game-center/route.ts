import { NextRequest, NextResponse } from "next/server";
import { getGameCenterData } from "@/lib/game-center-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gamePkParam = searchParams.get("gamePk");
    const gamePk = gamePkParam ? parseInt(gamePkParam, 10) : undefined;
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : await getActiveSeason();

    const data = await getGameCenterData(gamePk, season);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "No se encontraron datos para el partido solicitado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": data.status === "Live" 
            ? "public, s-maxage=5, stale-while-revalidate=2"
            : "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/game-center:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al procesar el Game Center",
      },
      { status: 500 }
    );
  }
}
