import { NextRequest, NextResponse } from "next/server";
import { getLeonesSituationalData } from "@/lib/situational-engine";
import { getActiveSeason } from "@/lib/season-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeSeason = await getActiveSeason();
    const season = searchParams.get("season")
      ? parseInt(searchParams.get("season")!, 10)
      : activeSeason;

    const data = getLeonesSituationalData();
    return NextResponse.json({
      season,
      teamId: 695,
      teamName: "Leones del Caracas",
      ...data,
    });
  } catch (error) {
    console.error("API Situacional error:", error);
    return NextResponse.json(
      { error: "Error interno al calcular splits situacionales y LOB" },
      { status: 500 }
    );
  }
}
