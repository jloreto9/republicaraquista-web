import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_SEASON } from "@/lib/constants";
import { NOTICUEVA_ADMIN_PASSWORD } from "@/lib/noticueva-service";
import {
  generateXInsightsWithGemini,
  isValidXInsightFocus,
  XInsightsError,
} from "@/lib/x-insights-service";
import { XInsightFocus, XInsightsRequestPayload } from "@/types/x-insights";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const FORCE_REFRESH_COOLDOWN_MS = 4_000;
const forceRefreshCooldowns = new Map<string, number>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

function pruneExpiredCooldowns(now: number): void {
  if (forceRefreshCooldowns.size <= 500) return;
  for (const [ip, ts] of forceRefreshCooldowns.entries()) {
    if (now - ts >= FORCE_REFRESH_COOLDOWN_MS) {
      forceRefreshCooldowns.delete(ip);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: (XInsightsRequestPayload & { password?: string }) | null = null;
    try {
      body = (await request.json()) as XInsightsRequestPayload & { password?: string };
    } catch {
      return NextResponse.json(
        { success: false, error: "Cuerpo JSON inválido." },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const authHeader = request.headers.get("x-admin-key") || "";
    const password = (
      authHeader ||
      (typeof body?.password === "string" ? body.password : "") ||
      ""
    ).trim();

    if (!NOTICUEVA_ADMIN_PASSWORD || !password || password !== NOTICUEVA_ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "No autorizado. Clave de redactor requerida." },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const rawFocus = body?.focus ?? "auto";
    if (!isValidXInsightFocus(rawFocus)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enfoque inválido. Valores permitidos: auto, postgame, tendencia, debate, hilo.",
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }
    const focus: XInsightFocus = rawFocus;

    if (!process.env.GEMINI_API_KEY?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Servicio de Insights con IA no configurado en el servidor (falta GEMINI_API_KEY).",
        },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const forceRefresh = Boolean(body?.forceRefresh);
    if (forceRefresh) {
      const now = Date.now();
      pruneExpiredCooldowns(now);
      const clientIp = getClientIp(request);
      const lastRefresh = forceRefreshCooldowns.get(clientIp);
      if (lastRefresh !== undefined && now - lastRefresh < FORCE_REFRESH_COOLDOWN_MS) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((FORCE_REFRESH_COOLDOWN_MS - (now - lastRefresh)) / 1000)
        );
        return NextResponse.json(
          {
            success: false,
            error: `Espera ${retryAfterSec} segundos antes de volver a regenerar los insights.`,
          },
          {
            status: 429,
            headers: {
              ...NO_STORE_HEADERS,
              "Retry-After": String(retryAfterSec),
            },
          }
        );
      }
      forceRefreshCooldowns.set(clientIp, now);
    }

    const rawSeason = body?.season;
    const season =
      typeof rawSeason === "number" && Number.isInteger(rawSeason) && rawSeason >= 2000
        ? rawSeason
        : ACTIVE_SEASON;

    const manualContext = typeof body?.manualContext === "string" ? body.manualContext : undefined;

    const data = await generateXInsightsWithGemini({
      focus,
      manualContext,
      forceRefresh,
      season,
    });

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof XInsightsError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: NO_STORE_HEADERS }
      );
    }
    console.error("POST /api/noticueva/x-insights error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error al generar insights para X",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
