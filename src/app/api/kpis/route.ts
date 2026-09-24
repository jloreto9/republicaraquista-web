import { NextRequest, NextResponse } from "next/server";
import { getSeasonKPIs } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : 2025;

    const kpis = await getSeasonKPIs(season);

    return NextResponse.json(
      {
        success: true,
        season,
        data: kpis,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/kpis:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al obtener KPIs",
      },
      { status: 500 }
    );
  }
}
