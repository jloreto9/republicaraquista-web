import { NextRequest, NextResponse } from "next/server";
import { getStandings } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : 2025;
    const phase = searchParams.get("phase") || "regular";

    const standings = await getStandings(season, phase);

    return NextResponse.json(
      {
        success: true,
        season,
        phase,
        count: standings.length,
        data: standings,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/standings:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al obtener standings",
      },
      { status: 500 }
    );
  }
}
