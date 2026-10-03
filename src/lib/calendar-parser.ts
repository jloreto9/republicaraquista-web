import { LVBP_TEAMS, MONTH_NAMES_ES, getTeam } from "./constants";
import {
  CalendarGameEvent,
  CalendarApiResponse,
  MonthCalendarData,
} from "@/types/calendar";
import { supabase } from "./supabase";
import fallbackCalendar from "@/data/calendar_2026_27.json";

// Mapeo indexado de juegos oficiales verificados de El Emergente (56 juegos con horarios reales)
const VERIFIED_BY_DATE = new Map<string, (typeof fallbackCalendar.events)[0]>();
for (const ev of fallbackCalendar.events) {
  if (ev.date) {
    VERIFIED_BY_DATE.set(ev.date, ev);
  }
}

interface SupabaseGameMatch {
  game_date?: string;
  home_team_id: number;
  away_team_id: number;
  home_score?: number | null;
  away_score?: number | null;
  status?: string;
}

const OPPONENT_NAME_TO_ID: Record<string, number> = {
  "aguilas del zulia": 692,
  "águilas del zulia": 692,
  "cardenales de lara": 693,
  "caribes de anzoategui": 694,
  "caribes de anzoátegui": 694,
  "navegantes del magallanes": 696,
  "bravos de margarita": 697,
  "tiburones de la guaira": 698,
  "tigres de aragua": 699,
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveOpponentId(name: string): number {
  const norm = normalizeText(name);
  for (const [key, id] of Object.entries(OPPONENT_NAME_TO_ID)) {
    if (norm.includes(normalizeText(key))) {
      return id;
    }
  }
  // Fallbacks por siglas o palabras clave
  if (norm.includes("magallanes")) return 696;
  if (norm.includes("tiburones") || norm.includes("guaira")) return 698;
  if (norm.includes("aragua") || norm.includes("tigres")) return 699;
  if (norm.includes("lara") || norm.includes("cardenales")) return 693;
  if (norm.includes("zulia") || norm.includes("aguilas")) return 692;
  if (norm.includes("caribes") || norm.includes("anzoategui")) return 694;
  if (norm.includes("bravos") || norm.includes("margarita")) return 697;
  return 0;
}

function extractCityAndStadium(rawLocation: string): { stadium: string; city: string } {
  const cleaned = rawLocation.replace(/\\,/g, ",").replace(/\\n/g, " ").trim();
  const parts = cleaned.split(",").map((p) => p.trim());
  if (parts.length === 0 || !parts[0]) {
    return { stadium: "Estadio por confirmar", city: "Venezuela" };
  }
  const stadium = parts[0];
  const city = parts[parts.length - 1] || "Venezuela";
  return { stadium, city };
}

/**
 * Parsea el texto crudo del archivo .ics en una lista de eventos estructurados
 */
export function parseIcsContent(icsContent: string): CalendarGameEvent[] {
  const rawEvents = icsContent.split("BEGIN:VEVENT").slice(1);
  const events: CalendarGameEvent[] = [];

  for (const block of rawEvents) {
    const lines = block.split(/\r?\n/);
    let uid = "";
    let dtStart = "";
    let summary = "";
    let location = "";
    let description = "";

    for (const line of lines) {
      if (line.startsWith("UID:")) {
        uid = line.replace("UID:", "").trim();
      } else if (line.startsWith("DTSTART")) {
        // e.g. DTSTART;VALUE=DATE:20261013 o DTSTART:20261013T190000Z
        const val = line.split(":").slice(1).join(":");
        dtStart = val.trim();
      } else if (line.startsWith("SUMMARY:")) {
        summary = line.replace("SUMMARY:", "").trim();
      } else if (line.startsWith("LOCATION:")) {
        location = line.replace("LOCATION:", "").trim();
      } else if (line.startsWith("DESCRIPTION:")) {
        description = line.replace("DESCRIPTION:", "").trim();
      }
    }

    if (!dtStart) continue;

    // Extraer fecha: YYYYMMDD
    const dateMatch = dtStart.match(/(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) continue;

    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const dayNumber = parseInt(dateMatch[3], 10);
    const dateIso = `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

    // Día de la semana (0=Dom, 1=Lun, ..., 6=Sáb)
    const dateObj = new Date(Date.UTC(year, month - 1, dayNumber, 12, 0, 0));
    const dayOfWeek = dateObj.getUTCDay();

    // Determinar si es Local o Visitante
    // "vs." -> Local (Casa - Blanco)
    // "@"   -> Visitante (Visita - Dorado)
    const isHome = summary.includes(" vs. ") || description.includes("LOCAL");

    // Extraer rival
    let oppRaw = "";
    if (summary.includes(" vs. ")) {
      oppRaw = summary.split(" vs. ")[1]?.trim() || "";
    } else if (summary.includes(" @ ")) {
      oppRaw = summary.split(" @ ")[1]?.trim() || "";
    }
    const opponentId = resolveOpponentId(oppRaw || summary);
    const opponentTeam = getTeam(opponentId);

    // Extraer hora y transmision
    let timeDisplay = "Hora por confirmar";
    let isTimePending = true;

    // Chequeo en DTSTART con hora: e.g. 20261013T190000
    const timeMatch = dtStart.match(/T(\d{2})(\d{2})/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2];
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      timeDisplay = `${h}:${m} ${ampm}`;
      isTimePending = false;
    } else if (summary && !summary.includes("[HORA PENDIENTE]")) {
      // Si el summary tiene una hora explícita
      const explicitHourMatch = summary.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
      if (explicitHourMatch) {
        timeDisplay = explicitHourMatch[1].toUpperCase();
        isTimePending = false;
      }
    }

    // Si la hora aún está pendiente o no se pudo extraer de DTSTART, consultar la hora oficial verificada de El Emergente
    const verified = VERIFIED_BY_DATE.get(dateIso);
    if (verified && (isTimePending || timeDisplay === "Hora por confirmar")) {
      timeDisplay = verified.timeDisplay;
      isTimePending = false;
    }

    // Transmisión
    let transmission = "Por confirmar";
    const descLower = description.replace(/\\n/g, "\n");
    const transMatch = descLower.match(/transmisi[oó]n:\s*([^\n\\]+)/i);
    if (transMatch && transMatch[1]) {
      const parsedTrans = transMatch[1].trim();
      if (parsedTrans && parsedTrans.toLowerCase() !== "por confirmar") {
        transmission = parsedTrans;
      }
    }

    const { stadium, city } = extractCityAndStadium(location);
    const finalStadium = stadium && stadium !== "Estadio por confirmar" ? stadium : (verified?.stadiumName || stadium);
    const finalCity = city && city !== "Venezuela" ? city : (verified?.city || city);
    const cleanSummary = summary.replace(/\[HORA PENDIENTE\]\s*/i, "").trim();

    events.push({
      uid: uid || `caracas-${dateIso}-${opponentId}`,
      date: dateIso,
      dayOfWeek,
      dayNumber,
      month,
      year,
      summary: cleanSummary || verified?.summary || summary,
      isHome,
      opponentId,
      opponentName: opponentTeam.name,
      opponentAbbr: opponentTeam.abbreviation,
      opponentLogo: opponentTeam.logoUrl,
      stadiumName: finalStadium,
      city: finalCity,
      timeDisplay,
      isTimePending,
      transmission,
      rawDescription: description,
    });
  }

  // Ordenar cronológicamente por fecha ISO
  events.sort((a, b) => a.date.localeCompare(b.date));
  return enrichWithVerifiedSchedule(events);
}

/**
 * Garantiza que todos los eventos del calendario contengan el horario oficial de El Emergente
 * y la condición de localía (28 Casa / 28 Visita) estrictamente auditada.
 */
export function enrichWithVerifiedSchedule(events: CalendarGameEvent[]): CalendarGameEvent[] {
  return events.map((ev) => {
    const verified = VERIFIED_BY_DATE.get(ev.date);
    if (!verified) return ev;

    return {
      ...ev,
      isHome: verified.isHome,
      summary: verified.summary,
      timeDisplay: verified.timeDisplay,
      isTimePending: false,
      stadiumName: verified.stadiumName,
      city: verified.city,
      opponentId: verified.opponentId,
      opponentName: verified.opponentName,
      opponentAbbr: verified.opponentAbbr,
      opponentLogo: verified.opponentLogo,
    };
  });
}

/**
 * Cruza los eventos del calendario con los resultados reales de Supabase si existen
 */
export async function attachSupabaseResults(
  events: CalendarGameEvent[]
): Promise<CalendarGameEvent[]> {
  if (!supabase || events.length === 0) return events;

  try {
    const minDate = events[0].date;
    const maxDate = events[events.length - 1].date;

    const { data: rawGames, error } = await supabase
      .from("games")
      .select("game_date, home_team_id, away_team_id, home_score, away_score, status")
      .gte("game_date", minDate)
      .lte("game_date", maxDate)
      .or("home_team_id.eq.695,away_team_id.eq.695");

    if (error || !rawGames || rawGames.length === 0) {
      return events;
    }

    const games = rawGames as SupabaseGameMatch[];

    return events.map((event) => {
      // Buscar match por fecha exacta y rival
      const matchedGame = games.find((g) => {
        if (!g.game_date) return false;
        const gDate = g.game_date.slice(0, 10);
        if (gDate !== event.date) return false;
        const opponentMatch =
          Number(g.home_team_id) === event.opponentId ||
          Number(g.away_team_id) === event.opponentId;
        return opponentMatch;
      });

      if (!matchedGame) return event;

      const isHome = Number(matchedGame.home_team_id) === 695;
      const homeScore = Number(matchedGame.home_score ?? 0);
      const awayScore = Number(matchedGame.away_score ?? 0);
      const caracasScore = isHome ? homeScore : awayScore;
      const opponentScore = isHome ? awayScore : homeScore;
      const isCompleted = [
        "final",
        "completed",
        "completed early",
        "game over",
      ].includes((matchedGame.status || "").toLowerCase());

      return {
        ...event,
        result: {
          isCompleted,
          status: matchedGame.status || "Final",
          homeScore,
          awayScore,
          caracasScore,
          opponentScore,
          won: caracasScore > opponentScore,
        },
      };
    });
  } catch (err) {
    console.error("Error al sincronizar resultados con Supabase:", err);
    return events;
  }
}

/**
 * Agrupa los eventos del calendario en meses estructurados
 */
export function groupEventsByMonth(events: CalendarGameEvent[]): MonthCalendarData[] {
  const monthMap: Record<number, CalendarGameEvent[]> = {};

  // Asegurar los 3 meses de temporada regular (Octubre, Noviembre, Diciembre)
  [10, 11, 12].forEach((m) => {
    monthMap[m] = [];
  });

  events.forEach((ev) => {
    if (!monthMap[ev.month]) {
      monthMap[ev.month] = [];
    }
    monthMap[ev.month].push(ev);
  });

  return Object.keys(monthMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((m) => {
      const monthEvents = monthMap[m];
      const homeCount = monthEvents.filter((e) => e.isHome).length;
      const awayCount = monthEvents.filter((e) => !e.isHome).length;
      return {
        year: monthEvents[0]?.year || 2026,
        month: m,
        monthName: MONTH_NAMES_ES[m - 1] || `Mes ${m}`,
        totalGames: monthEvents.length,
        homeGames: homeCount,
        awayGames: awayCount,
        events: monthEvents,
      };
    });
}

/**
 * Construye la respuesta completa consolidada para el API y vistas
 */
export function buildCalendarResponse(events: CalendarGameEvent[]): CalendarApiResponse {
  const homeCount = events.filter((e) => e.isHome).length;
  const awayCount = events.filter((e) => !e.isHome).length;
  const months = groupEventsByMonth(events);

  return {
    season: "2026-2027",
    totalGames: events.length,
    homeGames: homeCount,
    awayGames: awayCount,
    months,
    events,
    lastUpdated: new Date().toISOString(),
  };
}
