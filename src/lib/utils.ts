import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Determina si un juego se disputó de día (< 18:00 VET / UTC-4) o de noche (>= 18:00 VET).
 *
 * @param gameDatetimeOrTime Cadena ISO (ej: '2026-10-16T18:00:00+00:00') o cadena de hora (ej: '2:00 PM', '14:00').
 * @param isDayGameFlag Flag booleano opcional si ya viene explícito desde la fuente.
 * @returns true si el juego comenzó antes de las 18:00 (6:00 PM) hora local de Venezuela (VET).
 */
export function isDayGame(gameDatetimeOrTime?: string | null, isDayGameFlag?: boolean | null): boolean {
  if (isDayGameFlag !== undefined && isDayGameFlag !== null) {
    return Boolean(isDayGameFlag);
  }
  if (!gameDatetimeOrTime) return false;

  const str = String(gameDatetimeOrTime).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return false; // Sin componente horario, default nocturno en LVBP
  }

  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (ampmMatch && !str.includes("T")) {
    let hours = parseInt(ampmMatch[1], 10);
    const meridiem = ampmMatch[3]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    const minutes = parseInt(ampmMatch[2], 10) || 0;
    return hours * 60 + minutes < 18 * 60;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // VET es UTC-4 estricto sin horario de verano
      const utcHours = d.getUTCHours();
      const utcMinutes = d.getUTCMinutes();
      const vetTotalMinutes = ((utcHours - 4 + 24) % 24) * 60 + utcMinutes;
      return vetTotalMinutes < 18 * 60;
    }
  } catch {}

  return false;
}

/**
 * Normaliza y obtiene la fecha calendario oficial en Venezuela (VET / UTC-4).
 * Corrige el desfase de medianoche UTC (e.g., '2026-10-25T00:00:00Z' -> '2026-10-24' en Venezuela).
 */
export function getVenezuelanDate(dateStr?: string | null, datetimeStr?: string | null): string {
  if (datetimeStr) {
    try {
      const dt = new Date(datetimeStr);
      if (!isNaN(dt.getTime())) {
        // Venezuela es UTC-4 estricto sin horario estacional
        const vet = new Date(dt.getTime() - 4 * 3600 * 1000);
        return vet.toISOString().slice(0, 10);
      }
    } catch {
      // fallback
    }
  }
  return dateStr ? String(dateStr).slice(0, 10) : "";
}
