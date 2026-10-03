import { NextResponse } from "next/server";
import {
  attachSupabaseResults,
  buildCalendarResponse,
  enrichWithVerifiedSchedule,
} from "@/lib/calendar-parser";
import fallbackData from "@/data/calendar_2026_27.json";
import { CalendarApiResponse, CalendarGameEvent } from "@/types/calendar";

export const revalidate = 300; // Revalidar cada 5 minutos en Vercel Edge

export async function GET() {
  try {
    const baseEvents = fallbackData.events as CalendarGameEvent[];
    const verifiedEvents = enrichWithVerifiedSchedule(baseEvents);
    const eventsWithResults = await attachSupabaseResults(verifiedEvents);
    const responsePayload: CalendarApiResponse = buildCalendarResponse(eventsWithResults);

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error en /api/calendar:", error);
    return NextResponse.json(fallbackData, { status: 200 });
  }
}

