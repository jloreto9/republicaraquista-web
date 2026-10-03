import { NextResponse } from "next/server";
import { CALENDAR_FEED_URLS } from "@/lib/constants";
import {
  parseIcsContent,
  attachSupabaseResults,
  buildCalendarResponse,
  enrichWithVerifiedSchedule,
} from "@/lib/calendar-parser";
import fallbackData from "@/data/calendar_2026_27.json";
import { CalendarApiResponse } from "@/types/calendar";

export const revalidate = 3600; // Revalidar cada 1 hora en Vercel Edge

export async function GET() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    let rawIcs = "";
    try {
      const response = await fetch(CALENDAR_FEED_URLS.rawIcs, {
        signal: controller.signal,
        next: { revalidate: 3600 },
        headers: {
          "User-Agent": "RepubliCaraquistApp/1.0 (Next.js)",
        },
      });

      if (response.ok) {
        rawIcs = await response.text();
      }
    } catch (fetchErr) {
      console.warn("No se pudo obtener el feed .ics remoto; usando fallback local:", fetchErr);
    } finally {
      clearTimeout(timeoutId);
    }

    let events = rawIcs ? parseIcsContent(rawIcs) : (fallbackData.events as any);

    if (!events || events.length === 0) {
      events = fallbackData.events as any;
    }

    // Garantizar que todos los eventos contengan los horarios oficiales de El Emergente
    events = enrichWithVerifiedSchedule(events);

    // Cruce de resultados con Supabase
    const eventsWithResults = await attachSupabaseResults(events);
    const responsePayload: CalendarApiResponse = buildCalendarResponse(eventsWithResults);

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error en /api/calendar:", error);
    return NextResponse.json(fallbackData, { status: 200 });
  }
}
