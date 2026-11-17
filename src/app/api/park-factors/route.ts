import { NextRequest, NextResponse } from "next/server";
import {
  getParkFactorsData,
  isValidParkFactorScope,
} from "@/lib/park-factors-service";
import { ParkFactorScope } from "@/types/park-factors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawScope = searchParams.get("scope");

    if (rawScope && !isValidParkFactorScope(rawScope)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Parámetro scope inválido. Valores permitidos: multi, 2026, 2025, 2024.",
        },
        { status: 400 }
      );
    }

    const scope: ParkFactorScope = (rawScope as ParkFactorScope) || "multi";
    const data = await getParkFactorsData(scope);

    const isClosedScope = scope === "2024" || scope === "2025";
    const cacheControl = isClosedScope
      ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300"
      : "public, max-age=300, s-maxage=300, stale-while-revalidate=60";

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": cacheControl,
        },
      }
    );
  } catch (error) {
    console.error("Error en /api/park-factors:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al calcular los factores de parque",
      },
      { status: 500 }
    );
  }
}
