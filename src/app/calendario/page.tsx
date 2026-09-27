import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { CalendarView } from "@/components/calendar/calendar-view";
import {
  parseIcsContent,
  attachSupabaseResults,
  buildCalendarResponse,
} from "@/lib/calendar-parser";
import { CALENDAR_FEED_URLS } from "@/lib/constants";
import fallbackData from "@/data/calendar_2026_27.json";
import { CalendarApiResponse } from "@/types/calendar";

export const revalidate = 3600; // ISR cada 1 hora en Vercel Edge

export const metadata: Metadata = {
  title: "Calendario Oficial LVBP | Leones del Caracas | REPUBLICARAQUISTAPP",
  description:
    "Calendario completo e interactivo de los 56 juegos de la temporada regular LVBP 2026-2027 para Leones del Caracas. Sincronización con Google Calendar, Apple Calendar y seguimiento de resultados.",
};

async function getCalendarData(): Promise<CalendarApiResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let rawIcs = "";
    try {
      const response = await fetch(CALENDAR_FEED_URLS.rawIcs, {
        signal: controller.signal,
        next: { revalidate: 3600 },
        headers: {
          "User-Agent": "RepubliCaraquistApp/1.0",
        },
      });

      if (response.ok) {
        rawIcs = await response.text();
      }
    } catch {
      // Ignorar error de red y usar fallback local pre-calculado
    } finally {
      clearTimeout(timeoutId);
    }

    let events = rawIcs ? parseIcsContent(rawIcs) : (fallbackData.events as any);
    if (!events || events.length === 0) {
      events = fallbackData.events as any;
    }

    const eventsWithResults = await attachSupabaseResults(events);
    return buildCalendarResponse(eventsWithResults);
  } catch (error) {
    console.error("Error al obtener calendario:", error);
    return fallbackData as CalendarApiResponse;
  }
}

export default async function CalendarioPage() {
  const calendarData = await getCalendarData();

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header
        title="Calendario Oficial"
        subtitle="Temporada Regular LVBP 2026-2027 • Leones del Caracas"
        season={2026}
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        <CalendarView initialData={calendarData} />
      </main>
    </div>
  );
}
