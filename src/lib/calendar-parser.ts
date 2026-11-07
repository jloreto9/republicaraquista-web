import { LVBP_TEAMS, MONTH_NAMES_ES, getTeam } from "./constants";
import { getVenezuelanDate } from "./utils";
import {
  CalendarGameEvent,
  CalendarApiResponse,
  MonthCalendarData,
  DoubleHeaderGameEntry,
  CalendarGameResult,
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
  id?: number;
  game_pk?: number;
  game_date?: string;
  game_datetime?: string;
  home_team_id: number;
  away_team_id: number;
  home_score?: number | null;
  away_score?: number | null;
  status?: string;
}

interface ParsedMlbGame {
  gamePk: number;
  gameNumber: number;
  isDoubleHeader: boolean;
  scheduledDate: string;
  officialDate: string;
  rescheduledFromDate?: string;
  rescheduleGameDate?: string;
  status: string;
  reason?: string;
  isCompleted: boolean;
  isPostponed: boolean;
  isSuspended: boolean;
  isHome: boolean;
  opponentId: number;
  homeScore: number;
  awayScore: number;
  caracasScore: number;
  opponentScore: number;
  won: boolean;
  timeDisplay?: string;
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
      transmission: verified.transmission || ev.transmission,
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
 * Retorna la etiqueta compacta priorizada para celdas mensuales pequeñas
 */
export function getPrimaryBroadcastBadge(trans?: string): string {
  if (!trans || trans === "Por confirmar") return "";
  const channels = trans.split(",").map((s) => s.trim());
  const linear = channels.filter((c) => !c.toLowerCase().includes("beisbolplay"));
  if (linear.length === 0) return "BeisbolPlay";
  if (linear.length === 1) return linear[0];

  return linear
    .map((c) => {
      if (c === "1Baseball") return "1Base";
      if (c === "Meridiano TV") return "Mer";
      if (c === "ByM Sport") return "ByM";
      if (c === "Venevisión") return "Ven";
      if (c === "LVBP YouTube") return "YouTube";
      return c;
    })
    .join(" / ");
}

/**
 * Cruza los eventos del calendario con los resultados oficiales de MLB Stats API y Supabase.
 * Implementa una arquitectura dual de alta resiliencia:
 * 1. Soporte completo de Dobles Carteleras (Doubleheaders):
 *    Almacena múltiples juegos por fecha sin sobrescribir Game 1 con Game 2.
 * 2. Manejo exhaustivo de Juegos Suspendidos y Pospuestos:
 *    Detecta suspensiones en la fecha original, extrae el motivo ("Lluvia") y vincula
 *    el resultado final cuando el juego reprogramado (makeup) ya fue completado.
 * 3. Fallback con Supabase normalizando horario UTC-4 (VET) y admitiendo dobles juegos.
 */
export async function attachSupabaseResults(
  events: CalendarGameEvent[]
): Promise<CalendarGameEvent[]> {
  if (events.length === 0) return events;

  // 1. Obtener resultados oficiales en vivo de MLB Stats API
  const mlbGamesByScheduledDate = new Map<string, ParsedMlbGame[]>();
  const mlbGamesByOfficialDate = new Map<string, ParsedMlbGame[]>();
  const mlbRescheduledFromMap = new Map<string, ParsedMlbGame>();

  try {
    const mlbRes = await fetch(
      "https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=2026",
      {
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 60 },
      }
    );

    if (mlbRes.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mlbJson = await mlbRes.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const dateObj of mlbJson.dates || []) {
        const scheduledDate = dateObj.date;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const g of dateObj.games || []) {
          const homeId = Number(g.teams?.home?.team?.id);
          const awayId = Number(g.teams?.away?.team?.id);
          if (homeId === 695 || awayId === 695) {
            const isHome = homeId === 695;
            const oppId = isHome ? awayId : homeId;
            const officialDate = g.officialDate || scheduledDate;
            const status = g.status?.detailedState || g.status?.abstractGameState || "Final";
            const statusLower = status.toLowerCase();
            const isCompleted = [
              "final",
              "completed",
              "completed early",
              "game over",
            ].includes(statusLower);
            const isPostponed = [
              "postponed",
              "postponed: rain",
            ].includes(statusLower);
            const isSuspended = [
              "suspended",
              "suspended: rain",
            ].includes(statusLower);

            const homeScore = Number(g.teams?.home?.score ?? 0);
            const awayScore = Number(g.teams?.away?.score ?? 0);
            const caracasScore = isHome ? homeScore : awayScore;
            const opponentScore = isHome ? awayScore : homeScore;

            const parsedGame: ParsedMlbGame = {
              gamePk: Number(g.gamePk),
              gameNumber: Number(g.gameNumber || 1),
              isDoubleHeader: g.doubleHeader === "Y",
              scheduledDate,
              officialDate,
              rescheduledFromDate: g.rescheduledFromDate,
              rescheduleGameDate: g.rescheduleGameDate,
              status,
              reason: g.status?.reason,
              isCompleted,
              isPostponed,
              isSuspended,
              isHome,
              opponentId: oppId,
              homeScore,
              awayScore,
              caracasScore,
              opponentScore,
              won: caracasScore > opponentScore,
            };

            // Indexar por fecha programada
            if (!mlbGamesByScheduledDate.has(scheduledDate)) {
              mlbGamesByScheduledDate.set(scheduledDate, []);
            }
            mlbGamesByScheduledDate.get(scheduledDate)!.push(parsedGame);

            // Indexar por fecha oficial
            if (!mlbGamesByOfficialDate.has(officialDate)) {
              mlbGamesByOfficialDate.set(officialDate, []);
            }
            mlbGamesByOfficialDate.get(officialDate)!.push(parsedGame);

            // Indexar por fecha original de reprogramación (ej. juego makeup del 05/11)
            if (g.rescheduledFromDate) {
              mlbRescheduledFromMap.set(g.rescheduledFromDate, parsedGame);
            }
          }
        }
      }
    }
  } catch (mlbErr) {
    console.warn("Fallo sincronización calendario con MLB Stats API:", mlbErr);
  }

  // 2. Consultar Supabase como almacenamiento canónico persistente
  let supabaseGames: SupabaseGameMatch[] = [];
  if (supabase) {
    try {
      const minDate = events[0].date;
      const maxDate = events[events.length - 1].date;

      const { data: rawGames, error } = await supabase
        .from("games")
        .select("id, game_pk, game_date, game_datetime, home_team_id, away_team_id, home_score, away_score, status")
        .gte("game_date", minDate)
        .lte("game_date", maxDate)
        .or("home_team_id.eq.695,away_team_id.eq.695");

      if (!error && rawGames && rawGames.length > 0) {
        supabaseGames = rawGames as SupabaseGameMatch[];
      }
    } catch (sbErr) {
      console.warn("Error al consultar juegos de Supabase:", sbErr);
    }
  }

  // 3. Cruzar eventos con prioridad: MLB Stats API -> Supabase
  return events.map((event) => {
    // A) Chequear juegos programados para esta fecha en MLB Stats API
    const mlbScheduledGames = mlbGamesByScheduledDate.get(event.date) || [];
    const mlbMakeupFromThisDate = mlbRescheduledFromMap.get(event.date);

    // CASO 1: Juego Pospuesto / Suspendido
    const postponedMlb = mlbScheduledGames.find((g) => g.isPostponed || g.isSuspended);
    if (postponedMlb || mlbMakeupFromThisDate) {
      const makeupCompleted = mlbMakeupFromThisDate && mlbMakeupFromThisDate.isCompleted;
      const makeupScoreStr = makeupCompleted
        ? `${mlbMakeupFromThisDate.won ? "G" : "P"} ${mlbMakeupFromThisDate.caracasScore}-${mlbMakeupFromThisDate.opponentScore}`
        : "";

      return {
        ...event,
        result: {
          isCompleted: Boolean(makeupCompleted),
          status: "Pospuesto",
          isPostponed: true,
          isSuspended: Boolean(postponedMlb?.isSuspended),
          postponedReason: postponedMlb?.reason || "Lluvia",
          rescheduledToDate: mlbMakeupFromThisDate?.scheduledDate || postponedMlb?.rescheduleGameDate,
          rescheduledFromDate: event.date,
          homeScore: mlbMakeupFromThisDate ? mlbMakeupFromThisDate.homeScore : 0,
          awayScore: mlbMakeupFromThisDate ? mlbMakeupFromThisDate.awayScore : 0,
          caracasScore: mlbMakeupFromThisDate ? mlbMakeupFromThisDate.caracasScore : 0,
          opponentScore: mlbMakeupFromThisDate ? mlbMakeupFromThisDate.opponentScore : 0,
          won: mlbMakeupFromThisDate ? mlbMakeupFromThisDate.won : false,
          note: makeupCompleted
            ? `Pospuesto por lluvia. Disputado en doble juego (${makeupScoreStr})`
            : `Pospuesto por lluvia. Reprogramado para el ${postponedMlb?.rescheduleGameDate || "siguiente fecha"}`,
        },
      };
    }

    // CASO 2: Juegos Completados en MLB Stats API (Doble Juego o Juego Individual)
    const completedMlbGames = mlbScheduledGames.filter((g) => g.isCompleted);
    if (completedMlbGames.length > 0) {
      if (completedMlbGames.length >= 2 || (completedMlbGames.length === 1 && completedMlbGames[0].isDoubleHeader)) {
        const sortedGames = [...completedMlbGames].sort((a, b) => a.gameNumber - b.gameNumber);
        const doubleHeaderGames: DoubleHeaderGameEntry[] = sortedGames.map((g) => ({
          gamePk: g.gamePk,
          gameNumber: g.gameNumber,
          isHome: g.isHome,
          timeDisplay: g.timeDisplay,
          result: {
            isCompleted: true,
            status: g.status,
            homeScore: g.homeScore,
            awayScore: g.awayScore,
            caracasScore: g.caracasScore,
            opponentScore: g.opponentScore,
            won: g.won,
            isDoubleHeader: true,
            gameNumber: g.gameNumber,
            rescheduledFromDate: g.rescheduledFromDate,
            note: g.rescheduledFromDate ? `Reprogramado del ${g.rescheduledFromDate}` : undefined,
          },
        }));

        const primaryGame = sortedGames[0];
        return {
          ...event,
          isDoubleHeader: true,
          doubleHeaderGames,
          result: {
            isCompleted: true,
            status: "Final (Doble Juego)",
            homeScore: primaryGame.homeScore,
            awayScore: primaryGame.awayScore,
            caracasScore: primaryGame.caracasScore,
            opponentScore: primaryGame.opponentScore,
            won: primaryGame.won,
            isDoubleHeader: true,
          },
        };
      }

      // Juego individual completado
      const singleMlb = completedMlbGames[0];
      return {
        ...event,
        result: {
          isCompleted: true,
          status: singleMlb.status,
          homeScore: singleMlb.homeScore,
          awayScore: singleMlb.awayScore,
          caracasScore: singleMlb.caracasScore,
          opponentScore: singleMlb.opponentScore,
          won: singleMlb.won,
        },
      };
    }

    // CASO 3: Fallback con Supabase
    const matchingSbGames = supabaseGames.filter((g) => {
      const gVetDate = getVenezuelanDate(g.game_date, g.game_datetime);
      const dateMatch =
        gVetDate === event.date ||
        (g.game_date && g.game_date.slice(0, 10) === event.date);
      if (!dateMatch) return false;
      const isCaracas = Number(g.home_team_id) === 695 || Number(g.away_team_id) === 695;
      return isCaracas;
    });

    if (matchingSbGames.length === 0) return event;

    const completedSbGames = matchingSbGames.filter((g) =>
      ["final", "completed", "completed early", "game over"].includes((g.status || "").toLowerCase())
    );

    if (completedSbGames.length >= 2) {
      // Doble juego en Supabase
      const doubleHeaderGames: DoubleHeaderGameEntry[] = completedSbGames.map((g, idx) => {
        const isHomeSb = Number(g.home_team_id) === 695;
        const hScore = Number(g.home_score ?? 0);
        const aScore = Number(g.away_score ?? 0);
        const cScore = isHomeSb ? hScore : aScore;
        const oppScore = isHomeSb ? aScore : hScore;
        return {
          gamePk: g.game_pk || g.id || idx + 1,
          gameNumber: idx + 1,
          isHome: isHomeSb,
          result: {
            isCompleted: true,
            status: g.status || "Final",
            homeScore: hScore,
            awayScore: aScore,
            caracasScore: cScore,
            opponentScore: oppScore,
            won: cScore > oppScore,
            isDoubleHeader: true,
            gameNumber: idx + 1,
          },
        };
      });

      const firstG = completedSbGames[0];
      const isHomeFirst = Number(firstG.home_team_id) === 695;
      const hScore = Number(firstG.home_score ?? 0);
      const aScore = Number(firstG.away_score ?? 0);
      const cScore = isHomeFirst ? hScore : aScore;
      const oppScore = isHomeFirst ? aScore : hScore;

      return {
        ...event,
        isDoubleHeader: true,
        doubleHeaderGames,
        result: {
          isCompleted: true,
          status: "Final (Doble Juego)",
          homeScore: hScore,
          awayScore: aScore,
          caracasScore: cScore,
          opponentScore: oppScore,
          won: cScore > oppScore,
          isDoubleHeader: true,
        },
      };
    }

    if (completedSbGames.length === 1) {
      const g = completedSbGames[0];
      const isHomeSb = Number(g.home_team_id) === 695;
      const hScore = Number(g.home_score ?? 0);
      const aScore = Number(g.away_score ?? 0);
      const cScore = isHomeSb ? hScore : aScore;
      const oppScore = isHomeSb ? aScore : hScore;

      return {
        ...event,
        result: {
          isCompleted: true,
          status: g.status || "Final",
          homeScore: hScore,
          awayScore: aScore,
          caracasScore: cScore,
          opponentScore: oppScore,
          won: cScore > oppScore,
        },
      };
    }

    // Si está pospuesto en Supabase
    const postponedSb = matchingSbGames.find((g) =>
      ["postponed", "cancelled", "canceled", "suspended"].includes((g.status || "").toLowerCase())
    );
    if (postponedSb) {
      return {
        ...event,
        result: {
          isCompleted: false,
          status: "Pospuesto",
          isPostponed: true,
          postponedReason: "Lluvia",
          homeScore: 0,
          awayScore: 0,
          caracasScore: 0,
          opponentScore: 0,
          won: false,
          note: "Juego pospuesto",
        },
      };
    }

    return event;
  });
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
