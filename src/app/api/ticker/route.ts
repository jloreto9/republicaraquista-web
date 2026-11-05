import { NextRequest, NextResponse } from "next/server";
import { getLeagueTickerGames } from "@/lib/ticker-service";
import { getActiveSeason } from "@/lib/constants";

export const dynamic = "force-dynamic";

const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|scraper|crawl|headless|lighthouse|preview|postman|curl|wget|python|axios|go-http|semrush|ahrefs|bytespider|yandex|bingbot|googlebot|mj12|petal|dotbot/i;

// Rate limiting simple en memoria por IP (ventana de 15 segundos)
const requestRateMap = new Map<string, number>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const lastRequest = requestRateMap.get(ip);
  if (lastRequest && now - lastRequest < 15000) {
    return true;
  }
  requestRateMap.set(ip, now);
  if (requestRateMap.size > 1000) {
    for (const [key, timestamp] of requestRateMap.entries()) {
      if (now - timestamp > 60000) {
        requestRateMap.delete(key);
      }
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // 1. Bloqueo inmediato de bots, scrapers y clientes automatizados
  if (!userAgent || BOT_USER_AGENT_PATTERN.test(userAgent)) {
    return new NextResponse("Acceso restringido", {
      status: 403,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const version = searchParams.get("v");

  // 2. Kill-switch para clientes con bundle anterior en bucle infinito o peticiones sin versionar:
  // Si la petición no incluye v=2, proviene del cliente antiguo en bucle o crawler.
  // Devolvemos 429 con caché masiva (3600s) para que el cliente antiguo aborte el loop
  // (al recibir res.ok === false) y Vercel Edge absorba las peticiones sin ejecutar funciones.
  if (version !== "2") {
    return NextResponse.json(
      { success: false, error: "Client version deprecated. Please reload page." },
      {
        status: 429,
        headers: {
          "Retry-After": "3600",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  }

  // 3. Rate limiting por IP: máximo 1 petición cada 15s por cliente
  if (ip !== "unknown" && isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": "30",
          "Cache-Control": "public, max-age=30, s-maxage=30",
        },
      }
    );
  }

  try {
    const seasonParam = searchParams.get("season");
    const activeSeason = seasonParam ? Number(seasonParam) : await getActiveSeason();

    const data = await getLeagueTickerGames(activeSeason);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60, stale-while-revalidate=120",
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
