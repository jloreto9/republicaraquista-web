import calendarData from "@/data/calendar_2026_27.json";
import { ACTIVE_SEASON, getTeam } from "./constants";
import { extractTeamGameLineupFromFeed } from "./game-feed-service";
import { getVenezuelanDate, getVenezuelanToday } from "./utils";

const LEONES_TEAM_ID = 695;

const SHORT_SPANISH_MONTHS = [
  "ENE",
  "FEB",
  "MAR",
  "ABR",
  "MAY",
  "JUN",
  "JUL",
  "AGO",
  "SEP",
  "OCT",
  "NOV",
  "DIC",
] as const;

const DEFAULT_PLACEHOLDER_POSITIONS = [
  "LF",
  "CF",
  "RF",
  "BD",
  "3B",
  "SS",
  "2B",
  "1B",
  "C",
] as const;

const OPPONENT_SHORT_BY_ID: Record<number, string> = {
  692: "AGUILAS",
  693: "CARDENALES",
  694: "CARIBES",
  695: "LEONES",
  696: "MAGALLANES",
  697: "BRAVOS",
  698: "TIBURONES",
  699: "TIGRES",
};

const FINALIZED_STATUSES = new Set([
  "Final",
  "Completed",
  "Completed Early",
  "Game Over",
]);

const LIVE_STATUSES = new Set(["Live", "In Progress"]);

export interface LineupCardSlot {
  order: number;
  position: string;
  playerName: string;
  playerId?: number;
}

export interface LineupCardGameOption {
  gamePk: number;
  date: string;
  dateShort: string;
  timeDisplay: string;
  opponentId: number;
  opponentName: string;
  opponentShort: string;
  isHome: boolean;
  status: string;
  isToday: boolean;
  stadiumName: string;
  transmissionLine1: string;
  transmissionLine2: string;
}

export interface LineupCardPayload {
  gamePk: number;
  date: string;
  dateShort: string;
  timeCompact: string;
  opponentId: number;
  opponentName: string;
  opponentShort: string;
  isHome: boolean;
  status: string;
  hasOfficialLineup: boolean;
  slots: LineupCardSlot[];
  pitcherName: string;
  transmissionLine1: string;
  transmissionLine2: string;
  stadiumName: string;
  availableGames: LineupCardGameOption[];
}

interface CalendarEventEntry {
  date?: string;
  isHome?: boolean;
  opponentId?: number;
  opponentName?: string;
  stadiumName?: string;
  timeDisplay?: string;
  isTimePending?: boolean;
  transmission?: string;
  result?: {
    status?: string;
  };
  isDoubleHeader?: boolean;
  doubleHeaderGames?: Array<{
    gamePk?: number;
    gameNumber?: number;
    timeDisplay?: string;
    isHome?: boolean;
  }>;
}

interface MlbPersonLike {
  id?: number;
  fullName?: string;
  primaryPosition?: {
    code?: string;
    abbreviation?: string;
  };
  position?: {
    code?: string;
    abbreviation?: string;
  };
}

interface MlbScheduleTeamSlot {
  team?: {
    id?: number;
    name?: string;
  };
  probablePitcher?: {
    id?: number;
    fullName?: string;
  };
}

interface MlbScheduleGame {
  gamePk?: number;
  gameDate?: string;
  officialDate?: string;
  originalDate?: string;
  gameNumber?: number;
  status?: {
    abstractGameState?: string;
    codedGameState?: string;
    detailedState?: string;
    startTimeTBD?: boolean;
  };
  teams?: {
    home?: MlbScheduleTeamSlot;
    away?: MlbScheduleTeamSlot;
  };
  venue?: {
    name?: string;
  };
  lineups?: {
    homePlayers?: MlbPersonLike[];
    awayPlayers?: MlbPersonLike[];
  };
}

interface MlbScheduleResponse {
  dates?: Array<{
    date?: string;
    games?: MlbScheduleGame[];
  }>;
}

interface MlbBoxscoreTeam {
  pitchers?: number[];
  players?: Record<
    string,
    {
      person?: {
        fullName?: string;
      };
    }
  >;
}

interface MlbLiveFeed {
  gamePk?: number;
  gameData?: {
    game?: {
      pk?: number;
      gameNumber?: number;
    };
    datetime?: {
      officialDate?: string;
      originalDate?: string;
      dateTime?: string;
    };
    status?: {
      abstractGameState?: string;
      codedGameState?: string;
      detailedState?: string;
    };
    teams?: {
      home?: { id?: number; name?: string };
      away?: { id?: number; name?: string };
    };
    venue?: {
      name?: string;
    };
    probablePitchers?: {
      home?: { id?: number; fullName?: string };
      away?: { id?: number; fullName?: string };
    };
    players?: Record<string, MlbPersonLike>;
  };
  liveData?: {
    boxscore?: {
      teams?: {
        home?: MlbBoxscoreTeam;
        away?: MlbBoxscoreTeam;
      };
    };
  };
}

interface InternalGameRecord {
  option: LineupCardGameOption;
  gameNumber: number;
  abstractState: string;
  codedState: string;
  scheduleGame?: MlbScheduleGame;
  isSyntheticFallback: boolean;
}

function stripVowelAccentsAndUppercase(raw?: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/([aeiouAEIOU])[\u0300-\u036f]+/g, "$1")
    .normalize("NFC")
    .toUpperCase();
}

/**
 * Normaliza abreviaturas de posición defensiva a nomenclatura en español (`DH` -> `BD`).
 */
export function normalizeLineupPosition(pos?: string): string {
  const clean = (pos ?? "").trim().toUpperCase();
  if (!clean || clean === "-") return "BD";
  if (clean === "DH" || clean === "BD") return "BD";
  if (clean === "UT" || clean === "UTIL") return "UTIL";
  return clean;
}

/**
 * Formatea el nombre corto del rival LVBP en mayúsculas para el encabezado `VS`.
 */
export function formatOpponentShortName(opponentIdOrName: number | string): string {
  if (typeof opponentIdOrName === "number") {
    return OPPONENT_SHORT_BY_ID[opponentIdOrName] || `EQUIPO ${opponentIdOrName}`;
  }

  const rawStr = String(opponentIdOrName ?? "").trim();
  if (/^\d+$/.test(rawStr)) {
    const parsedId = parseInt(rawStr, 10);
    if (OPPONENT_SHORT_BY_ID[parsedId]) {
      return OPPONENT_SHORT_BY_ID[parsedId];
    }
  }

  const normalized = stripVowelAccentsAndUppercase(rawStr);
  if (!normalized) return "RIVAL";

  if (normalized.includes("AGUILA") || normalized.includes("ZULIA") || normalized === "ZUL") {
    return "AGUILAS";
  }
  if (normalized.includes("CARDENAL") || normalized.includes("LARA") || normalized === "LAR") {
    return "CARDENALES";
  }
  if (normalized.includes("CARIBE") || normalized.includes("ANZOATEGUI") || normalized === "ORI") {
    return "CARIBES";
  }
  if (normalized.includes("MAGALLANES") || normalized.includes("NAVEGANTES") || normalized === "MAG") {
    return "MAGALLANES";
  }
  if (normalized.includes("BRAVO") || normalized.includes("MARGARITA") || normalized === "MAR") {
    return "BRAVOS";
  }
  if (normalized.includes("TIBURON") || normalized.includes("GUAIRA") || normalized === "LAG") {
    return "TIBURONES";
  }
  if (normalized.includes("TIGRE") || normalized.includes("ARAGUA") || normalized === "ARA") {
    return "TIGRES";
  }
  if (normalized.includes("LEON") || normalized.includes("CARACAS") || normalized === "CAR") {
    return "LEONES";
  }

  return normalized;
}

/**
 * Convierte una fecha ISO (`YYYY-MM-DD`) en formato corto de tarjeta (`14NOV`, `5OCT`, `1DIC`).
 */
export function formatShortSpanishDate(isoDate: string): string {
  if (!isoDate) return "";
  const match = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";

  const monthIdx = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const monthAbbr = SHORT_SPANISH_MONTHS[monthIdx];

  if (!monthAbbr || !Number.isFinite(day) || day <= 0) {
    return "";
  }

  return `${day}${monthAbbr}`;
}

/**
 * Compacta la hora para el bloque inferior derecho de la tarjeta (`"8:00 PM"` -> `"8:00PM"`).
 */
export function formatCompactTime(timeDisplay?: string): string {
  if (!timeDisplay) return "";
  const trimmed = timeDisplay.trim();
  if (!trimmed) return "";
  if (trimmed.toLowerCase().includes("confirmar")) {
    return "POR CONFIRMAR";
  }
  return trimmed.replace(/\s+/g, "").toUpperCase();
}

/**
 * Formatea las dos líneas de transmisión excluyendo streaming/radio de la línea lineal.
 */
export function formatTransmissionLines(rawTransmission?: string): {
  line1: string;
  line2: string;
} {
  const excluded = new Set(["beisbolplay", "la mega", "por confirmar"]);
  const linearChannels = (rawTransmission ?? "")
    .split(",")
    .map((channel) => channel.trim())
    .filter((channel) => channel.length > 0 && !excluded.has(channel.toLowerCase()));

  const line1 =
    linearChannels.length > 0
      ? `TRANSMISIÓN ${linearChannels.map((channel) => channel.toUpperCase()).join(", ")},`
      : "TRANSMISIÓN OFICIAL";

  return {
    line1,
    line2: "BeisbolPlay, La Mega",
  };
}

/**
 * Formatea el nombre del estadio para el banner inferior sin acentos en vocales.
 */
export function formatStadiumBannerName(rawStadium?: string): string {
  return stripVowelAccentsAndUppercase(rawStadium);
}

/**
 * Formatea el nombre de peloteros/lanzadores en mayúsculas sin tildes en vocales, preservando `Ñ`.
 */
export function formatPlayerDisplayName(rawName?: string): string {
  return stripVowelAccentsAndUppercase(rawName);
}

function formatVetTimeFromIso(isoDatetime?: string): string {
  if (!isoDatetime) return "";
  try {
    const dt = new Date(isoDatetime);
    if (isNaN(dt.getTime())) return "";
    // VET es UTC-4 estricto todo el año
    const vetMs = dt.getTime() - 4 * 3600 * 1000;
    const vetDate = new Date(vetMs);
    const hours24 = vetDate.getUTCHours();
    const minutes = vetDate.getUTCMinutes();
    const meridiem = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    const minuteStr = String(minutes).padStart(2, "0");
    return `${hours12}:${minuteStr} ${meridiem}`;
  } catch {
    return "";
  }
}

function getCalendarEvents(): CalendarEventEntry[] {
  const raw = calendarData as {
    events?: CalendarEventEntry[];
    months?: Array<{ events?: CalendarEventEntry[] }>;
  };

  if (Array.isArray(raw?.events) && raw.events.length > 0) {
    return raw.events;
  }
  if (Array.isArray(raw?.months)) {
    return raw.months.flatMap((month) => (Array.isArray(month?.events) ? month.events : []));
  }
  return [];
}

function findCalendarEvent(
  events: CalendarEventEntry[],
  officialDate: string,
  opponentId: number,
  isHome: boolean
): CalendarEventEntry | undefined {
  if (!officialDate || events.length === 0) return undefined;

  return (
    events.find(
      (event) =>
        event?.date === officialDate &&
        Number(event?.opponentId) === opponentId &&
        Boolean(event?.isHome) === isHome
    ) ||
    events.find(
      (event) => event?.date === officialDate && Number(event?.opponentId) === opponentId
    ) ||
    events.find((event) => event?.date === officialDate)
  );
}

function resolveTimeDisplay(
  calEvent: CalendarEventEntry | undefined,
  gameDateIso: string | undefined,
  gameNumber: number,
  startTimeTBD?: boolean
): string {
  if (calEvent?.isDoubleHeader && Array.isArray(calEvent.doubleHeaderGames)) {
    const dhMatch = calEvent.doubleHeaderGames.find(
      (dh) => Number(dh?.gameNumber) === gameNumber
    );
    if (dhMatch?.timeDisplay && !dhMatch.timeDisplay.toLowerCase().includes("confirmar")) {
      return dhMatch.timeDisplay;
    }
  }

  if (calEvent?.timeDisplay && !calEvent.isTimePending) {
    return calEvent.timeDisplay;
  }

  if (!startTimeTBD && gameDateIso) {
    const vetTime = formatVetTimeFromIso(gameDateIso);
    if (vetTime) return vetTime;
  }

  return "7:00 PM";
}

function getScheduleStatusRank(game: MlbScheduleGame): number {
  const detailed = String(game?.status?.detailedState || "");
  const abstract = String(game?.status?.abstractGameState || "");
  const coded = String(game?.status?.codedGameState || "");

  if (FINALIZED_STATUSES.has(detailed) || abstract === "Final") return 4;
  if (LIVE_STATUSES.has(detailed) || abstract === "Live" || coded === "I") return 3;
  if (detailed === "Pre-Game" || detailed === "Warmup") return 2;
  if (
    detailed.includes("Postponed") ||
    detailed.includes("Cancelled") ||
    detailed.includes("Suspended")
  ) {
    return 0;
  }
  return 1;
}

function isLiveRecord(rec: InternalGameRecord): boolean {
  return (
    LIVE_STATUSES.has(rec.option.status) ||
    rec.abstractState === "Live" ||
    rec.codedState === "I"
  );
}

function isFinalRecord(rec: InternalGameRecord): boolean {
  return FINALIZED_STATUSES.has(rec.option.status) || rec.abstractState === "Final";
}

function isPostponedRecord(rec: InternalGameRecord): boolean {
  const s = rec.option.status;
  return s.includes("Postponed") || s.includes("Cancelled") || s.includes("Suspended");
}

function getPriorityTier(rec: InternalGameRecord, todayVet: string): number {
  if (isLiveRecord(rec)) return 0;
  if (rec.option.isToday && !isPostponedRecord(rec) && !isFinalRecord(rec)) return 1;
  if (rec.option.isToday && !isPostponedRecord(rec) && isFinalRecord(rec)) return 2;
  if (!rec.option.isToday && rec.option.date > todayVet && !isFinalRecord(rec) && !isPostponedRecord(rec)) {
    return 3;
  }
  if (!isPostponedRecord(rec)) return 4;
  return 5;
}

function sortGameRecords(records: InternalGameRecord[], todayVet: string): InternalGameRecord[] {
  return [...records].sort((a, b) => {
    const tierA = getPriorityTier(a, todayVet);
    const tierB = getPriorityTier(b, todayVet);
    if (tierA !== tierB) return tierA - tierB;

    if (tierA === 3) {
      // Próximo juego programado más cercano primero (fecha ascendente)
      const dateCmp = a.option.date.localeCompare(b.option.date);
      if (dateCmp !== 0) return dateCmp;
      return a.gameNumber - b.gameNumber;
    }

    if (tierA === 4 || tierA === 5) {
      // Juegos recientes / completados en orden descendente
      const dateCmp = b.option.date.localeCompare(a.option.date);
      if (dateCmp !== 0) return dateCmp;
      return b.gameNumber - a.gameNumber;
    }

    return a.gameNumber - b.gameNumber || a.option.gamePk - b.option.gamePk;
  });
}

function buildOptionFromMlbGame(
  game: MlbScheduleGame,
  fallbackDateStr: string | undefined,
  calendarEvents: CalendarEventEntry[],
  todayVet: string
): InternalGameRecord | null {
  const gamePk = Number(game?.gamePk || 0);
  const homeId = Number(game?.teams?.home?.team?.id || 0);
  const awayId = Number(game?.teams?.away?.team?.id || 0);
  if (!gamePk || (homeId !== LEONES_TEAM_ID && awayId !== LEONES_TEAM_ID)) {
    return null;
  }

  const isHome = homeId === LEONES_TEAM_ID;
  const opponentId = isHome ? awayId : homeId;
  const date = String(
    game?.officialDate ||
      game?.originalDate ||
      getVenezuelanDate(fallbackDateStr, game?.gameDate) ||
      fallbackDateStr ||
      ""
  ).slice(0, 10);

  const gameNumber = Number(game?.gameNumber ?? 1);
  const calEvent = findCalendarEvent(calendarEvents, date, opponentId, isHome);
  const oppTeam = getTeam(opponentId);
  const mlbOppName = isHome ? game?.teams?.away?.team?.name : game?.teams?.home?.team?.name;
  const opponentName = calEvent?.opponentName || oppTeam.name || mlbOppName || "Rival";
  const opponentShort = formatOpponentShortName(opponentId || opponentName);

  const timeDisplay = resolveTimeDisplay(
    calEvent,
    game?.gameDate,
    gameNumber,
    game?.status?.startTimeTBD
  );
  const { line1: transmissionLine1, line2: transmissionLine2 } = formatTransmissionLines(
    calEvent?.transmission
  );

  const rawStadium =
    calEvent?.stadiumName ||
    game?.venue?.name ||
    (isHome ? "Estadio Monumental Simón Bolívar" : "Estadio por confirmar");

  const status = String(
    game?.status?.detailedState || game?.status?.abstractGameState || "Scheduled"
  );

  return {
    option: {
      gamePk,
      date,
      dateShort: formatShortSpanishDate(date),
      timeDisplay,
      opponentId,
      opponentName,
      opponentShort,
      isHome,
      status,
      isToday: date === todayVet,
      stadiumName: formatStadiumBannerName(rawStadium),
      transmissionLine1,
      transmissionLine2,
    },
    gameNumber,
    abstractState: String(game?.status?.abstractGameState || ""),
    codedState: String(game?.status?.codedGameState || ""),
    scheduleGame: game,
    isSyntheticFallback: false,
  };
}

function buildFallbackRecordsFromCalendar(
  calendarEvents: CalendarEventEntry[],
  todayVet: string
): InternalGameRecord[] {
  const records: InternalGameRecord[] = [];
  calendarEvents.forEach((event, idx) => {
    const date = String(event?.date || "").slice(0, 10);
    if (!date) return;

    const opponentId = Number(event?.opponentId || 0);
    const isHome = Boolean(event?.isHome);
    const oppTeam = getTeam(opponentId);
    const opponentName = event?.opponentName || oppTeam.name || "Rival";
    const timeDisplay =
      event?.timeDisplay && !event.isTimePending ? event.timeDisplay : "7:00 PM";
    const { line1: transmissionLine1, line2: transmissionLine2 } = formatTransmissionLines(
      event?.transmission
    );
    const rawStadium =
      event?.stadiumName ||
      (isHome ? "Estadio Monumental Simón Bolívar" : "Estadio por confirmar");
    const status = event?.result?.status || (date < todayVet ? "Final" : "Scheduled");

    records.push({
      option: {
        gamePk: 90000000 + idx,
        date,
        dateShort: formatShortSpanishDate(date),
        timeDisplay,
        opponentId,
        opponentName,
        opponentShort: formatOpponentShortName(opponentId || opponentName),
        isHome,
        status,
        isToday: date === todayVet,
        stadiumName: formatStadiumBannerName(rawStadium),
        transmissionLine1,
        transmissionLine2,
      },
      gameNumber: 1,
      abstractState: status === "Final" ? "Final" : "Preview",
      codedState: "",
      isSyntheticFallback: true,
    });
  });

  return records;
}

function buildEmptyEditableSlots(): LineupCardSlot[] {
  return DEFAULT_PLACEHOLDER_POSITIONS.map((position, idx) => ({
    order: idx + 1,
    position,
    playerName: "",
  }));
}

function extractSlotsFromFallbackPlayers(players?: MlbPersonLike[]): LineupCardSlot[] {
  if (!Array.isArray(players) || players.length < 9) return [];

  const filtered =
    players.length > 9
      ? players.filter(
          (player) =>
            player?.primaryPosition?.abbreviation !== "P" &&
            player?.primaryPosition?.code !== "1" &&
            player?.position?.abbreviation !== "P" &&
            player?.position?.code !== "1"
        )
      : players;

  if (filtered.length < 9) return [];

  return filtered.slice(0, 9).map((player, idx) => {
    const rawPos =
      player?.primaryPosition?.abbreviation || player?.position?.abbreviation || "DH";
    const playerId = Number(player?.id || 0);
    return {
      order: idx + 1,
      position: normalizeLineupPosition(rawPos),
      playerName: formatPlayerDisplayName(player?.fullName || "BATEADOR"),
      playerId: playerId > 0 ? playerId : undefined,
    };
  });
}

function resolveLeonesStartingPitcher(
  feed: MlbLiveFeed | null,
  scheduleGame: MlbScheduleGame | undefined,
  isHome: boolean
): string {
  const side = isHome ? "home" : "away";

  // Prioridad 1: feed.gameData.probablePitchers[home|away].fullName
  let rawPitcher = feed?.gameData?.probablePitchers?.[side]?.fullName;

  // Prioridad 2: scheduleGame.teams[home|away].probablePitcher.fullName
  if (!rawPitcher) {
    rawPitcher = scheduleGame?.teams?.[side]?.probablePitcher?.fullName;
  }

  // Prioridad 3: Primer lanzador en boxscore.teams[home|away].pitchers[0]
  if (!rawPitcher) {
    const teamBox = feed?.liveData?.boxscore?.teams?.[side];
    const firstPitcherId = Array.isArray(teamBox?.pitchers) ? teamBox.pitchers[0] : undefined;
    if (firstPitcherId) {
      const playerKey = `ID${firstPitcherId}`;
      rawPitcher =
        teamBox?.players?.[playerKey]?.person?.fullName ||
        feed?.gameData?.players?.[playerKey]?.fullName;
    }
  }

  // Prioridad 4: "POR ANUNCIAR"
  return formatPlayerDisplayName(rawPitcher || "POR ANUNCIAR");
}

async function fetchLiveFeedSafe(gamePk: number): Promise<MlbLiveFeed | null> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 15 },
    });
    if (!res.ok) return null;
    return (await res.json()) as MlbLiveFeed;
  } catch (err) {
    console.warn(`Fallo al obtener feed/live para gamePk ${gamePk}:`, err);
    return null;
  }
}

/**
 * Obtiene los datos oficiales del juego, alineación titular 1–9 y abridor de Leones
 * combinando MLB Stats API (`schedule` + `feed/live`) y el calendario oficial local.
 */
export async function getLineupCardData(
  targetGamePk?: number,
  season = ACTIVE_SEASON
): Promise<LineupCardPayload> {
  const todayVet = getVenezuelanToday().dateString;
  const calendarEvents = season === ACTIVE_SEASON ? getCalendarEvents() : [];

  const dedupedScheduleGames = new Map<
    number,
    { game: MlbScheduleGame; fallbackDate?: string }
  >();

  try {
    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}&hydrate=lineups,probablePitcher`;
    const res = await fetch(scheduleUrl, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 15 },
    });

    if (res.ok) {
      const json = (await res.json()) as MlbScheduleResponse;
      for (const dateObj of json?.dates || []) {
        for (const game of dateObj?.games || []) {
          const gamePk = Number(game?.gamePk || 0);
          const homeId = Number(game?.teams?.home?.team?.id || 0);
          const awayId = Number(game?.teams?.away?.team?.id || 0);
          if (!gamePk || (homeId !== LEONES_TEAM_ID && awayId !== LEONES_TEAM_ID)) {
            continue;
          }

          const existing = dedupedScheduleGames.get(gamePk);
          if (!existing || getScheduleStatusRank(game) >= getScheduleStatusRank(existing.game)) {
            dedupedScheduleGames.set(gamePk, {
              game,
              fallbackDate: dateObj?.date,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Fallo consultando schedule de MLB Stats API para lineup-card:", err);
  }

  let records: InternalGameRecord[] = [];
  for (const entry of dedupedScheduleGames.values()) {
    const rec = buildOptionFromMlbGame(
      entry.game,
      entry.fallbackDate,
      calendarEvents,
      todayVet
    );
    if (rec) {
      records.push(rec);
    }
  }

  if (records.length === 0 && calendarEvents.length > 0) {
    records = buildFallbackRecordsFromCalendar(calendarEvents, todayVet);
  }

  const sortedRecords = sortGameRecords(records, todayVet);
  const availableGames = sortedRecords.map((rec) => rec.option);

  let selectedRecord: InternalGameRecord | undefined =
    targetGamePk !== undefined
      ? sortedRecords.find((rec) => rec.option.gamePk === targetGamePk)
      : sortedRecords[0];

  let prefetchedFeed: MlbLiveFeed | null = null;

  if (!selectedRecord && targetGamePk && targetGamePk > 0) {
    prefetchedFeed = await fetchLiveFeedSafe(targetGamePk);
    const homeId = Number(prefetchedFeed?.gameData?.teams?.home?.id || 0);
    const awayId = Number(prefetchedFeed?.gameData?.teams?.away?.id || 0);
    if (prefetchedFeed?.gameData && (homeId === LEONES_TEAM_ID || awayId === LEONES_TEAM_ID)) {
      const isHome = homeId === LEONES_TEAM_ID;
      const opponentId = isHome ? awayId : homeId;
      const date = String(
        prefetchedFeed.gameData.datetime?.officialDate ||
          prefetchedFeed.gameData.datetime?.originalDate ||
          getVenezuelanDate(undefined, prefetchedFeed.gameData.datetime?.dateTime) ||
          todayVet
      ).slice(0, 10);
      const calEvent = findCalendarEvent(calendarEvents, date, opponentId, isHome);
      const oppTeam = getTeam(opponentId);
      const mlbOppName = isHome
        ? prefetchedFeed.gameData.teams?.away?.name
        : prefetchedFeed.gameData.teams?.home?.name;
      const opponentName = calEvent?.opponentName || oppTeam.name || mlbOppName || "Rival";
      const timeDisplay = resolveTimeDisplay(
        calEvent,
        prefetchedFeed.gameData.datetime?.dateTime,
        Number(prefetchedFeed.gameData.game?.gameNumber ?? 1)
      );
      const { line1: transmissionLine1, line2: transmissionLine2 } = formatTransmissionLines(
        calEvent?.transmission
      );
      const rawStadium =
        calEvent?.stadiumName ||
        prefetchedFeed.gameData.venue?.name ||
        (isHome ? "Estadio Monumental Simón Bolívar" : "Estadio por confirmar");
      const status = String(
        prefetchedFeed.gameData.status?.detailedState ||
          prefetchedFeed.gameData.status?.abstractGameState ||
          "Scheduled"
      );

      selectedRecord = {
        option: {
          gamePk: targetGamePk,
          date,
          dateShort: formatShortSpanishDate(date),
          timeDisplay,
          opponentId,
          opponentName,
          opponentShort: formatOpponentShortName(opponentId || opponentName),
          isHome,
          status,
          isToday: date === todayVet,
          stadiumName: formatStadiumBannerName(rawStadium),
          transmissionLine1,
          transmissionLine2,
        },
        gameNumber: Number(prefetchedFeed.gameData.game?.gameNumber ?? 1),
        abstractState: String(prefetchedFeed.gameData.status?.abstractGameState || ""),
        codedState: String(prefetchedFeed.gameData.status?.codedGameState || ""),
        isSyntheticFallback: false,
      };
    } else {
      selectedRecord = sortedRecords[0];
    }
  }

  if (!selectedRecord) {
    const { line1: transmissionLine1, line2: transmissionLine2 } = formatTransmissionLines();
    return {
      gamePk: 0,
      date: todayVet,
      dateShort: formatShortSpanishDate(todayVet),
      timeCompact: "7:00PM",
      opponentId: 0,
      opponentName: "Por definir",
      opponentShort: "RIVAL",
      isHome: true,
      status: "Scheduled",
      hasOfficialLineup: false,
      slots: buildEmptyEditableSlots(),
      pitcherName: "POR ANUNCIAR",
      transmissionLine1,
      transmissionLine2,
      stadiumName: formatStadiumBannerName("Estadio Monumental Simón Bolívar"),
      availableGames,
    };
  }

  const opt = selectedRecord.option;
  const scheduleGame = selectedRecord.scheduleGame;
  const feed =
    prefetchedFeed ||
    (!selectedRecord.isSyntheticFallback && opt.gamePk > 0
      ? await fetchLiveFeedSafe(opt.gamePk)
      : null);

  const fallbackSchedulePlayers = opt.isHome
    ? scheduleGame?.lineups?.homePlayers
    : scheduleGame?.lineups?.awayPlayers;

  const extractedLineup = feed
    ? extractTeamGameLineupFromFeed(feed, LEONES_TEAM_ID, todayVet, fallbackSchedulePlayers)
    : null;

  let slots: LineupCardSlot[];
  let hasOfficialLineup = false;

  if (extractedLineup && Array.isArray(extractedLineup.starters) && extractedLineup.starters.length >= 9) {
    slots = extractedLineup.starters.slice(0, 9).map((starter, idx) => ({
      order: idx + 1,
      position: normalizeLineupPosition(starter.position),
      playerName: formatPlayerDisplayName(starter.playerName),
      playerId: starter.playerId > 0 ? starter.playerId : undefined,
    }));
    hasOfficialLineup = true;
  } else {
    const fallbackSlots = extractSlotsFromFallbackPlayers(fallbackSchedulePlayers);
    if (fallbackSlots.length >= 9) {
      slots = fallbackSlots;
      hasOfficialLineup = true;
    } else {
      slots = buildEmptyEditableSlots();
      hasOfficialLineup = false;
    }
  }

  const pitcherName = resolveLeonesStartingPitcher(feed, scheduleGame, opt.isHome);
  const liveStatus = String(feed?.gameData?.status?.detailedState || opt.status);

  return {
    gamePk: opt.gamePk,
    date: opt.date,
    dateShort: opt.dateShort,
    timeCompact: formatCompactTime(opt.timeDisplay),
    opponentId: opt.opponentId,
    opponentName: opt.opponentName,
    opponentShort: opt.opponentShort,
    isHome: opt.isHome,
    status: liveStatus,
    hasOfficialLineup,
    slots,
    pitcherName,
    transmissionLine1: opt.transmissionLine1,
    transmissionLine2: opt.transmissionLine2,
    stadiumName: opt.stadiumName,
    availableGames,
  };
}
