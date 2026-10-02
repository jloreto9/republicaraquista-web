import calendarData from "@/data/calendar_2026_27.json";
import { CalendarGameEvent } from "@/types/calendar";

/**
 * Retorna todos los 56 eventos oficiales del calendario de Leones del Caracas
 */
export function getAllCalendarGames(): CalendarGameEvent[] {
  return ((calendarData as any).events || []) as CalendarGameEvent[];
}

/**
 * Obtiene el próximo juego programado en el calendario que aún no se haya jugado.
 * Compara contra la fecha de referencia (o la fecha de hoy).
 */
export function getNextScheduledGame(referenceDateStr?: string): CalendarGameEvent {
  const events = getAllCalendarGames();
  if (events.length === 0) {
    throw new Error("No hay eventos en el calendario");
  }

  const todayStr = referenceDateStr || new Date().toISOString().split("T")[0];

  // 1. Buscar el primer juego que sea en o después de la fecha de referencia y no esté completado
  const upcoming = events.find((e) => e.date >= todayStr && !e.result?.isCompleted);
  if (upcoming) return upcoming;

  // 2. Si no hay juegos futuros respecto a todayStr, buscar cualquier juego no completado
  const pending = events.find((e) => !e.result?.isCompleted);
  if (pending) return pending;

  // 3. Fallback: Retornar el primer juego de la temporada regular
  return events[0];
}

/**
 * Busca si Leones del Caracas tiene juego programado en una fecha específica
 */
export function getGameForDate(dateStr: string): CalendarGameEvent | null {
  const events = getAllCalendarGames();
  return events.find((e) => e.date === dateStr) || null;
}

/**
 * Obtiene una lista de las próximas N fechas con juegos de Leones
 */
export function getUpcomingCalendarGames(limit = 5, fromDateStr?: string): CalendarGameEvent[] {
  const events = getAllCalendarGames();
  const refDate = fromDateStr || new Date().toISOString().split("T")[0];
  return events.filter((e) => e.date >= refDate).slice(0, limit);
}

/**
 * Calcula los días faltantes entre una fecha de referencia y el próximo juego
 */
export function getDaysUntilGame(gameDateStr: string, referenceDateStr?: string): number {
  const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const gameDate = new Date(gameDateStr + "T00:00:00");
  
  // Normalizar horas a medianoche
  refDate.setHours(0, 0, 0, 0);
  gameDate.setHours(0, 0, 0, 0);

  const diffTime = gameDate.getTime() - refDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
