import { NextRequest, NextResponse } from "next/server";
import { getLeonesSituationalData } from "@/lib/situational-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const season = parseInt(searchParams.get("season") || "2025", 10);

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
