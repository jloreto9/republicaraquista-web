import { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { CalendarView } from "@/components/calendar/calendar-view";
import {
  attachSupabaseResults,
  buildCalendarResponse,
  enrichWithVerifiedSchedule,
} from "@/lib/calendar-parser";
import fallbackData from "@/data/calendar_2026_27.json";
import { CalendarApiResponse, CalendarGameEvent } from "@/types/calendar";

export const revalidate = 300; // ISR cada 5 minutos en Vercel Edge para actualización de resultados

export const metadata: Metadata = {
  title: "Calendario Oficial LVBP | Leones del Caracas | REPUBLICARAQUISTAPP",
  description:
    "Calendario completo e interactivo de los 56 juegos de la temporada regular LVBP 2026-2027 para Leones del Caracas. Sincronización con Google Calendar, Apple Calendar y seguimiento de resultados.",
};

async function getCalendarData(): Promise<CalendarApiResponse> {
  try {
    // Usar directamente los 56 juegos oficiales auditados (28 Casa / 28 Visita)
    const baseEvents = fallbackData.events as CalendarGameEvent[];
    const verifiedEvents = enrichWithVerifiedSchedule(baseEvents);
    const eventsWithResults = await attachSupabaseResults(verifiedEvents);
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
