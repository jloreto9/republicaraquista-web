import calendarData from "@/data/calendar_2026_27.json";
import fullCalendarData from "@/data/lvbp_full_calendar_2026_27.json";
import { CalendarGameEvent, FullCalendarGame } from "@/types/calendar";

export const SEASON_START_DATE = "2026-10-12";
export const SEASON_END_DATE = "2026-12-27";

/**
 * Retorna todos los 56 eventos oficiales del calendario de Leones del Caracas
 */
export function getAllCalendarGames(): CalendarGameEvent[] {
  return ((calendarData as any).events || []) as CalendarGameEvent[];
}

/**
 * Retorna todos los 226 juegos oficiales de toda la liga LVBP
 */
export function getAllFullCalendarGames(): FullCalendarGame[] {
  return ((fullCalendarData as any).games || []) as FullCalendarGame[];
}

/**
 * Retorna los juegos oficiales de la LVBP para una fecha específica (1 a 4 juegos)
 */
export function getFullCalendarGamesForDate(dateStr: string): FullCalendarGame[] {
  const dates = (fullCalendarData as any).dates || {};
  return (dates[dateStr] || []) as FullCalendarGame[];
}

/**
 * Comprueba si una fecha es anterior al inicio oficial de la temporada (12 de Octubre de 2026)
 */
export function isDateBeforeSeason(dateStr: string): boolean {
  return dateStr < SEASON_START_DATE;
}

/**
 * Comprueba si una fecha es posterior al cierre oficial de la ronda eliminatoria
 */
export function isDateAfterSeason(dateStr: string): boolean {
  return dateStr > SEASON_END_DATE;
}

/**
 * Obtiene la próxima fecha del calendario oficial con juegos programados en toda la liga
 */
export function getNextScheduledLeagueDate(referenceDateStr?: string): string {
  const refDate = referenceDateStr || new Date().toISOString().split("T")[0];
  if (refDate < SEASON_START_DATE) {
    return SEASON_START_DATE;
  }
  const dates = Object.keys((fullCalendarData as any).dates || {}).sort();
  const nextDate = dates.find((d) => d >= refDate && (fullCalendarData as any).dates[d]?.length > 0);
  return nextDate || SEASON_START_DATE;
}

/**
 * Obtiene el próximo juego programado en el calendario que aún no se haya jugado (Caracas).
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

