import {
  ActiveRosterBatter,
  BestAvailableLineupResult,
  BestLineupConstraintMode,
  BuildBestAvailableLineupParams,
  TangoPlayer,
  TangoSlotContribution,
  TangoLineupMetrics,
  TangoOptimizationResult,
} from "@/types/tango-lineup";
import { BattingStats } from "@/types/sports";
import { computeWoba, computeWrcPlus } from "./matchup-engine";
import { getPlayerHeadshotUrl } from "./constants";

export const LVBP_REGULAR_SEASON_GAMES = 56;

// Ponderación de apariciones al plato (PA) por slot en el orden (Tom Tango - The Book)
export const SLOT_PA_WEIGHTS: Record<number, number> = {
  1: 4.67,
  2: 4.54,
  3: 4.41,
  4: 4.28,
  5: 4.15,
  6: 4.02,
  7: 3.89,
  8: 3.76,
  9: 3.63,
};

export interface TangoSlotConfig {
  role: string;
  roleDesc: string;
  obpWeight: number;
  slgWeight: number;
  wobaMult: number;
  explanation: string;
}

export const TANGO_SLOT_LEVERAGE: Record<number, TangoSlotConfig> = {
  1: {
    role: "Leadoff / Embasador Élite",
    roleDesc: "Máximo OBP, evita outs a toda costa",
    obpWeight: 1.45,
    slgWeight: 0.80,
    wobaMult: 1.05,
    explanation:
      "Toma más turnos que casi nadie (~262 PA). El factor primordial es embasarse (alto OBP) para que los bates de poder remolquen carreras.",
  },
  2: {
    role: "Mejor Bateador Integral",
    roleDesc: "Mayor wOBA del equipo",
    obpWeight: 1.30,
    slgWeight: 1.25,
    wobaMult: 1.15,
    explanation:
      "Axioma central de Tom Tango: el 2do bate batea con frecuencia con corredor en 1B o sin outs. Debe ser el mejor bateador integral (máximo wOBA).",
  },
  3: {
    role: "Contacto / Bate Puro",
    roleDesc: "5to mejor bateador en wOBA",
    obpWeight: 1.05,
    slgWeight: 1.10,
    wobaMult: 1.00,
    explanation:
      "Históricamente sobrevalorado. En el 1er inning suele batear con 2 outs y bases vacías (tras out de #1 o #2). Debe ser el 5to mejor bateador del equipo.",
  },
  4: {
    role: "Cleanup / Productor Principal",
    roleDesc: "Máximo poder aislado (ISO / SLG)",
    obpWeight: 1.00,
    slgWeight: 1.40,
    wobaMult: 1.12,
    explanation:
      "Batea en la mayor cantidad de situaciones con corredores en posición anotadora. Requiere la mayor fuerza extrabase (ISO/SLG) para empujar múltiples carreras.",
  },
  5: {
    role: "Segundo Cleanup / Poder",
    roleDesc: "Segundo mayor slugger",
    obpWeight: 0.95,
    slgWeight: 1.20,
    wobaMult: 1.02,
    explanation:
      "Protege al 4to bate y remolca si el cleanup recibe boleto o se embasa. Debe ser el segundo mayor slugger disponible.",
  },
  6: {
    role: "Producción Secundaria",
    roleDesc: "6to mejor bateador",
    obpWeight: 0.90,
    slgWeight: 0.95,
    wobaMult: 0.94,
    explanation:
      "Inicia la segunda mitad del orden con capacidad de extrabase o contacto para sostener rallies ofensivos.",
  },
  7: {
    role: "Fondo del Orden",
    roleDesc: "7mo mejor bateador",
    obpWeight: 0.85,
    slgWeight: 0.85,
    wobaMult: 0.88,
    explanation:
      "Toma menos turnos (~218 PA). Generalmente ocupado por especialistas defensivos o bateadores de contacto medio.",
  },
  8: {
    role: "Bateador de Menor Producción",
    roleDesc: "8vo en jerarquía ofensiva",
    obpWeight: 0.80,
    slgWeight: 0.80,
    wobaMult: 0.84,
    explanation:
      "El bateador con menor producción proyectada de los 9. Evita que un bate débil consuma turnos clave en la parte alta.",
  },
  9: {
    role: "Segundo Leadoff / Mesa 1-2-3",
    roleDesc: "Mejor OBP restante de la parte baja",
    obpWeight: 1.15,
    slgWeight: 0.75,
    wobaMult: 0.92,
    explanation:
      "Regla clave de Tom Tango: no poner al peor bateador de 9no. El #9 debe tener buen OBP para estar en base cuando el orden vuelve a los mejores bates (#1 y #2).",
  },
};

// Base canónica de bateadores reales de Leones del Caracas auditados en Supabase
export const LEONES_REAL_STATS_MAP: Record<string, TangoPlayer> = {
  // Wilfredo Tovar
  "wilfredo tovar": {
    playerId: 541600,
    playerName: "Wilfredo Tovar",
    position: "2B",
    bats: "R",
    avg: 0.316,
    obp: 0.380,
    slg: 0.407,
    woba: 0.350,
    wrcPlus: 118,
    iso: 0.091,
    headshot: "https://midfield.mlbstatic.com/v1/people/541600/spots/120",
  },
  // Aldrem Corredor
  "aldrem corredor": {
    playerId: 625506,
    playerName: "Aldrem Corredor",
    position: "1B",
    bats: "L",
    avg: 0.291,
    obp: 0.418,
    slg: 0.486,
    woba: 0.398,
    wrcPlus: 145,
    iso: 0.195,
    headshot: "https://midfield.mlbstatic.com/v1/people/625506/spots/120",
  },
  // Yonathan Daza
  "yonathan daza": {
    playerId: 602074,
    playerName: "Yonathan Daza",
    position: "CF",
    bats: "R",
    avg: 0.295,
    obp: 0.325,
    slg: 0.452,
    woba: 0.338,
    wrcPlus: 108,
    iso: 0.157,
    headshot: "https://midfield.mlbstatic.com/v1/people/602074/spots/120",
  },
  // Brainer Bonaci
  "brainer bonaci": {
    playerId: 682900,
    playerName: "Brainer Bonaci",
    position: "SS",
    bats: "S",
    avg: 0.291,
    obp: 0.398,
    slg: 0.469,
    woba: 0.382,
    wrcPlus: 135,
    iso: 0.178,
    headshot: "https://midfield.mlbstatic.com/v1/people/682900/spots/120",
  },
  // Harold Castro
  "harold castro": {
    playerId: 605612,
    playerName: "Harold Castro",
    position: "CF",
    bats: "L",
    avg: 0.332,
    obp: 0.357,
    slg: 0.481,
    woba: 0.364,
    wrcPlus: 125,
    iso: 0.149,
    headshot: "https://midfield.mlbstatic.com/v1/people/605612/spots/120",
  },
  // José Rondón
  "jose rondon": {
    playerId: 602922,
    playerName: "José Rondón",
    position: "LF",
    bats: "R",
    avg: 0.314,
    obp: 0.399,
    slg: 0.431,
    woba: 0.369,
    wrcPlus: 128,
    iso: 0.117,
    headshot: "https://midfield.mlbstatic.com/v1/people/602922/spots/120",
  },
  // Lenyn Sosa
  "lenyn sosa": {
    playerId: 672820,
    playerName: "Lenyn Sosa",
    position: "3B",
    bats: "R",
    avg: 0.290,
    obp: 0.372,
    slg: 0.551,
    woba: 0.400,
    wrcPlus: 146,
    iso: 0.261,
    headshot: "https://midfield.mlbstatic.com/v1/people/672820/spots/120",
  },
  // Victor Bericoto
  "victor bericoto": {
    playerId: 682674,
    playerName: "Victor Bericoto",
    position: "RF",
    bats: "R",
    avg: 0.344,
    obp: 0.400,
    slg: 0.496,
    woba: 0.390,
    wrcPlus: 138,
    iso: 0.152,
    headshot: "https://midfield.mlbstatic.com/v1/people/682674/spots/120",
  },
  // Jhonny Pereda
  "jhonny pereda": {
    playerId: 640902,
    playerName: "Jhonny Pereda",
    position: "C",
    bats: "R",
    avg: 0.270,
    obp: 0.382,
    slg: 0.391,
    woba: 0.350,
    wrcPlus: 115,
    iso: 0.121,
    headshot: "https://midfield.mlbstatic.com/v1/people/640902/spots/120",
  },
  // Leandro Cedeño
  "leandro cedeno": {
    playerId: 660681,
    playerName: "Leandro Cedeño",
    position: "DH",
    bats: "R",
    avg: 0.321,
    obp: 0.387,
    slg: 0.615,
    woba: 0.426,
    wrcPlus: 160,
    iso: 0.294,
    headshot: "https://midfield.mlbstatic.com/v1/people/660681/spots/120",
  },
  // Oswaldo Arcia
  "oswaldo arcia": {
    playerId: 542455,
    playerName: "Oswaldo Arcia",
    position: "RF",
    bats: "L",
    avg: 0.198,
    obp: 0.351,
    slg: 0.349,
    woba: 0.319,
    wrcPlus: 98,
    iso: 0.151,
    headshot: "https://midfield.mlbstatic.com/v1/people/542455/spots/120",
  },
  // Liván Soto
  "livan soto": {
    playerId: 670869,
    playerName: "Liván Soto",
    position: "SS",
    bats: "L",
    avg: 0.320,
    obp: 0.436,
    slg: 0.413,
    woba: 0.381,
    wrcPlus: 134,
    iso: 0.093,
    headshot: "https://midfield.mlbstatic.com/v1/people/670869/spots/120",
  },
  // Salvador Perez
  "salvador perez": {
    playerId: 521692,
    playerName: "Salvador Perez",
    position: "C",
    bats: "R",
    avg: 0.278,
    obp: 0.381,
    slg: 0.463,
    woba: 0.376,
    wrcPlus: 132,
    iso: 0.185,
    headshot: "https://midfield.mlbstatic.com/v1/people/521692/spots/120",
  },
  // Orlando Arcia
  "orlando arcia": {
    playerId: 606115,
    playerName: "Orlando Arcia",
    position: "SS",
    bats: "R",
    avg: 0.245,
    obp: 0.288,
    slg: 0.429,
    woba: 0.314,
    wrcPlus: 94,
    iso: 0.184,
    headshot: "https://midfield.mlbstatic.com/v1/people/606115/spots/120",
  },
  // Freddy Fermin
  "freddy fermin": {
    playerId: 666023,
    playerName: "Freddy Fermin",
    position: "C",
    bats: "R",
    avg: 0.250,
    obp: 0.367,
    slg: 0.350,
    woba: 0.326,
    wrcPlus: 102,
    iso: 0.100,
    headshot: "https://midfield.mlbstatic.com/v1/people/666023/spots/120",
  },
  // Jeferson Morales
  "jeferson morales": {
    playerId: 672373,
    playerName: "Jeferson Morales",
    position: "C",
    bats: "R",
    avg: 0.306,
    obp: 0.409,
    slg: 0.444,
    woba: 0.378,
    wrcPlus: 132,
    iso: 0.138,
    headshot: "https://midfield.mlbstatic.com/v1/people/672373/spots/120",
  },
  // Gabriel Noriega
  "gabriel noriega": {
    playerId: 527045,
    playerName: "Gabriel Noriega",
    position: "3B",
    bats: "R",
    avg: 0.290,
    obp: 0.340,
    slg: 0.415,
    woba: 0.328,
    wrcPlus: 102,
    iso: 0.125,
    headshot: "https://midfield.mlbstatic.com/v1/people/527045/spots/120",
  },
  // Alfredo Duno
  "alfredo duno": {
    playerId: 806957,
    playerName: "Alfredo Duno",
    position: "C",
    bats: "R",
    avg: 0.240,
    obp: 0.335,
    slg: 0.420,
    woba: 0.330,
    wrcPlus: 104,
    iso: 0.180,
    headshot: "https://midfield.mlbstatic.com/v1/people/806957/spots/120",
  },
  // Kenedy Corona
  "kenedy corona": {
    playerId: 678682,
    playerName: "Kenedy Corona",
    position: "CF",
    bats: "R",
    avg: 0.275,
    obp: 0.345,
    slg: 0.430,
    woba: 0.340,
    wrcPlus: 109,
    iso: 0.155,
    headshot: "https://midfield.mlbstatic.com/v1/people/678682/spots/120",
  },
  // Erick Brito
  "erick brito": {
    playerId: 679001,
    playerName: "Erick Brito",
    position: "2B",
    bats: "R",
    avg: 0.260,
    obp: 0.320,
    slg: 0.350,
    woba: 0.300,
    wrcPlus: 88,
    iso: 0.090,
    headshot: "https://midfield.mlbstatic.com/v1/people/679001/spots/120",
  },
  // Gersel Pitre
  "gersel pitre": {
    playerId: 642875,
    playerName: "Gersel Pitre",
    position: "DH",
    bats: "R",
    avg: 0.250,
    obp: 0.315,
    slg: 0.335,
    woba: 0.290,
    wrcPlus: 82,
    iso: 0.085,
    headshot: "https://midfield.mlbstatic.com/v1/people/642875/spots/120",
  },
  // Gabriel Lino
  "gabriel lino": {
    playerId: 593449,
    playerName: "Gabriel Lino",
    position: "C",
    bats: "R",
    avg: 0.220,
    obp: 0.310,
    slg: 0.280,
    woba: 0.265,
    wrcPlus: 75,
    iso: 0.060,
    headshot: "https://midfield.mlbstatic.com/v1/people/593449/spots/120",
  },
  // Leonel Espinoza
  "leonel espinoza": {
    playerId: 696083,
    playerName: "Leonel Espinoza",
    position: "OF",
    bats: "R",
    avg: 0.316,
    obp: 0.350,
    slg: 0.368,
    woba: 0.321,
    wrcPlus: 100,
    iso: 0.052,
    headshot: "https://midfield.mlbstatic.com/v1/people/696083/spots/120",
  },
  // Wuilfredo Antunez
  "wuilfredo antunez": {
    playerId: 686404,
    playerName: "Wuilfredo Antunez",
    position: "OF",
    bats: "L",
    avg: 0.313,
    obp: 0.353,
    slg: 0.375,
    woba: 0.325,
    wrcPlus: 102,
    iso: 0.062,
    headshot: "https://midfield.mlbstatic.com/v1/people/686404/spots/120",
  },
};

/**
 * Normaliza nombres de peloteros para búsqueda robusta sin tildes ni caracteres especiales
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function findCanonicalPlayer(playerId?: number, name?: string): TangoPlayer | undefined {
  if (name) {
    const norm = normalizeName(name);
    if (norm && LEONES_REAL_STATS_MAP[norm]) {
      return LEONES_REAL_STATS_MAP[norm];
    }
    if (norm) {
      const bySubstr = Object.values(LEONES_REAL_STATS_MAP).find((p) => {
        if (playerId && p.playerId === playerId) return true;
        const pNorm = normalizeName(p.playerName);
        return norm.includes(pNorm) || pNorm.includes(norm);
      });
      if (bySubstr) return bySubstr;
    }
  }
  if (playerId) {
    return Object.values(LEONES_REAL_STATS_MAP).find((p) => p.playerId === playerId);
  }
  return undefined;
}

function resolveValidPosition(position?: string, fallback = "UTIL"): string {
  if (position && position !== "UTIL" && position !== "-") {
    return position;
  }
  return fallback;
}

/**
 * Construye un `TangoPlayer` desde estadísticas agregadas de temporada en Supabase (`batting_stats`).
 */
export function buildTangoPlayerFromBattingStats(
  stats: BattingStats,
  batSide?: "R" | "L" | "S",
  position?: string
): TangoPlayer {
  const canonical = findCanonicalPlayer(stats.playerId, stats.playerName);
  const woba = computeWoba(stats);
  const wrcPlus = computeWrcPlus(woba);
  const avg = Number(stats.avg ?? 0);
  const obp = Number(stats.obp ?? 0);
  const slg = Number(stats.slg ?? 0);
  const iso = Number(Math.max(0, slg - avg).toFixed(3));

  return {
    playerId: stats.playerId,
    playerName: stats.playerName,
    position: resolveValidPosition(position, canonical?.position || "UTIL"),
    bats: batSide || canonical?.bats || "R",
    avg,
    obp,
    slg,
    woba,
    wrcPlus,
    iso,
    headshot: stats.playerAvatar || getPlayerHeadshotUrl(stats.playerId),
    statsSource: "supabase",
  };
}

/**
 * Construye un `TangoPlayer` desde `seasonStats.batting` de MLB Stats API (`feed/live`),
 * retornando `null` si el pelotero aún no registra apariciones válidas (AB + BB === 0).
 */
export function buildTangoPlayerFromMlbSeasonStats(params: {
  playerId: number;
  playerName: string;
  position?: string;
  batSide?: "R" | "L" | "S";
  seasonBatting?: Record<string, unknown> | null;
}): TangoPlayer | null {
  const sb = params.seasonBatting;
  if (!sb) return null;

  const atBats = Number(sb.atBats ?? 0);
  const hits = Number(sb.hits ?? 0);
  const doubles = Number(sb.doubles ?? 0);
  const triples = Number(sb.triples ?? 0);
  const homeRuns = Number(sb.homeRuns ?? 0);
  const baseOnBalls = Number(sb.baseOnBalls ?? 0);
  const hbp = Number(sb.hitByPitch ?? 0);
  const sf = Number(sb.sacFlies ?? 0);

  if (atBats + baseOnBalls <= 0) {
    return null;
  }

  const parseSlash = (val: unknown, fallback: number): number => {
    const num = typeof val === "number" ? val : parseFloat(String(val ?? ""));
    return Number.isFinite(num) ? Number(num.toFixed(3)) : Number(fallback.toFixed(3));
  };

  const avgFallback = atBats > 0 ? hits / atBats : 0;
  const obpDen = atBats + baseOnBalls + hbp + sf;
  const obpFallback = obpDen > 0 ? (hits + baseOnBalls + hbp) / obpDen : 0;
  const slgFallback =
    atBats > 0 ? (hits + doubles + 2 * triples + 3 * homeRuns) / atBats : 0;

  const avg = parseSlash(sb.avg, avgFallback);
  const obp = parseSlash(sb.obp, obpFallback);
  const slg = parseSlash(sb.slg, slgFallback);
  const iso = Number(Math.max(0, slg - avg).toFixed(3));

  const tempBatting: BattingStats = {
    playerId: params.playerId,
    playerName: params.playerName,
    playerAvatar: getPlayerHeadshotUrl(params.playerId),
    teamId: 0,
    teamName: "",
    teamAbbr: "",
    teamLogo: "",
    games: Number(sb.gamesPlayed ?? 0),
    atBats,
    plateAppearances: Number(sb.plateAppearances ?? atBats + baseOnBalls + hbp + sf),
    runs: Number(sb.runs ?? 0),
    hits,
    doubles,
    triples,
    homeRuns,
    rbi: Number(sb.rbi ?? 0),
    walks: baseOnBalls,
    strikeouts: Number(sb.strikeOuts ?? 0),
    stolenBases: Number(sb.stolenBases ?? 0),
    caughtStealing: Number(sb.caughtStealing ?? 0),
    hbp,
    sf,
    avg,
    obp,
    slg,
    ops: Number((obp + slg).toFixed(3)),
    iso,
    babip: 0,
  };

  const woba = computeWoba(tempBatting);
  const wrcPlus = computeWrcPlus(woba);
  const canonical = findCanonicalPlayer(params.playerId, params.playerName);

  return {
    playerId: params.playerId,
    playerName: params.playerName,
    position: resolveValidPosition(params.position, canonical?.position || "UTIL"),
    bats: params.batSide || canonical?.bats || "R",
    avg,
    obp,
    slg,
    woba,
    wrcPlus,
    iso,
    headshot: getPlayerHeadshotUrl(params.playerId),
    statsSource: "mlb",
  };
}

/**
 * Busca un jugador en la base de datos real (Supabase/MLB -> mapa canónico) o calibra fallback sintético.
 */
export function resolvePlayerStats(
  name: string,
  position = "UTIL",
  playerId?: number,
  defaultOrder = 5,
  realStatsLookup?: Record<number, TangoPlayer>
): TangoPlayer {
  // 1. Priorizar estadísticas reales de temporada activa (Supabase / MLB feed/live)
  if (playerId && realStatsLookup?.[playerId] && realStatsLookup[playerId].statsSource !== "synthetic") {
    const real = realStatsLookup[playerId];
    const canonical = findCanonicalPlayer(playerId, name);
    return {
      ...real,
      playerName: real.playerName || name,
      position: resolveValidPosition(position, real.position),
      bats: real.bats || canonical?.bats || "R",
    };
  }

  // 2. Búsqueda en mapa canónico auditado (por nombre normalizado o playerId)
  const canonicalMatch = findCanonicalPlayer(playerId, name);
  if (canonicalMatch) {
    return {
      ...canonicalMatch,
      position: resolveValidPosition(position, canonicalMatch.position),
      playerId: playerId || canonicalMatch.playerId,
      statsSource: "canonical_map",
    };
  }

  // 3. Fallback sintético como último recurso
  const norm = normalizeName(name);
  const baseAvg = defaultOrder <= 3 ? 0.285 : defaultOrder <= 5 ? 0.275 : 0.250;
  const baseObp = defaultOrder === 1 ? 0.365 : defaultOrder === 2 ? 0.360 : 0.330;
  const baseSlg = defaultOrder === 4 || defaultOrder === 5 ? 0.490 : 0.400;
  const iso = Number((baseSlg - baseAvg).toFixed(3));
  const woba = Number((baseObp * 0.7 + baseSlg * 0.3).toFixed(3));

  const cleanId = playerId || 600000 + Math.abs(norm.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 90000);

  return {
    playerId: cleanId,
    playerName: name,
    position,
    bats: defaultOrder % 2 === 0 ? "R" : "L",
    avg: baseAvg,
    obp: baseObp,
    slg: baseSlg,
    woba,
    wrcPlus: Math.round((woba / 0.320) * 100),
    iso,
    headshot: `https://midfield.mlbstatic.com/v1/people/${cleanId}/spots/120`,
    statsSource: "synthetic",
  };
}

/**
 * Calcula las carreras proyectadas y métricas de un lineup de 9 bateadores
 */
export function calculateLineupMetrics(players: TangoPlayer[]): TangoLineupMetrics {
  const nine = players.slice(0, 9);
  let totalRunsGame = 0;
  let weightedWobaSum = 0;
  let totalPaWeights = 0;

  const contributions: TangoSlotContribution[] = nine.map((player, idx) => {
    const slot = idx + 1;
    const paWeight = SLOT_PA_WEIGHTS[slot] || 4.0;
    const cfg = TANGO_SLOT_LEVERAGE[slot];

    // Formulación BaseRuns ponderada para LVBP
    const slotRcPerPa =
      (player.obp * cfg.obpWeight * 0.48 +
        player.slg * cfg.slgWeight * 0.32 +
        player.iso * 0.15) *
      cfg.wobaMult;

    const runsGame = slotRcPerPa * (paWeight / 4.0);
    const runsSeason = runsGame * LVBP_REGULAR_SEASON_GAMES;

    totalRunsGame += runsGame;
    weightedWobaSum += player.woba * paWeight;
    totalPaWeights += paWeight;

    return {
      slot,
      player,
      role: cfg.role,
      roleDesc: cfg.roleDesc,
      paGame: paWeight,
      paSeason: Math.round(paWeight * LVBP_REGULAR_SEASON_GAMES),
      runsContributedGame: Number(runsGame.toFixed(2)),
      runsContributedSeason: Number(runsSeason.toFixed(1)),
      explanation: cfg.explanation,
    };
  });

  // Bonificación por alternancia de manos (platoon switches)
  let platoonSwitches = 0;
  for (let i = 0; i < nine.length - 1; i++) {
    const b1 = nine[i].bats;
    const b2 = nine[i + 1].bats;
    if (b1 !== b2 || b1 === "S" || b2 === "S") {
      platoonSwitches++;
    }
  }
  const platoonBonus = (platoonSwitches / 8.0) * 0.18; // hasta +0.18 R/G por buen balance
  const finalRunsGame = Number((totalRunsGame + platoonBonus).toFixed(2));
  const finalRunsSeason = Number((finalRunsGame * LVBP_REGULAR_SEASON_GAMES).toFixed(1));
  const teamWoba = Number((weightedWobaSum / (totalPaWeights || 1)).toFixed(3));
  const platoonScore = Math.round((platoonSwitches / 8.0) * 100);

  return {
    runsPerGame: finalRunsGame,
    runsPerSeason: finalRunsSeason,
    teamWoba,
    platoonBalanceScore: platoonScore,
    contributions,
  };
}

/**
 * Optimiza un conjunto de 9 bateadores siguiendo el algoritmo de Tom Tango (The Book)
 */
export function optimizeTangoLineup(currentNine: TangoPlayer[]): TangoOptimizationResult {
  if (currentNine.length < 9) {
    throw new Error("Se requieren al menos 9 bateadores para optimizar el lineup.");
  }

  const pool = [...currentNine.slice(0, 9)];
  const optimalSlots: Record<number, TangoPlayer> = {};

  // 1. Slot #2: El mejor bateador integral del equipo (Mayor wOBA)
  pool.sort((a, b) => b.woba - a.woba);
  optimalSlots[2] = pool.splice(0, 1)[0];

  // 2. Slot #1: El mejor OBP entre los 8 restantes
  pool.sort((a, b) => b.obp - a.obp);
  optimalSlots[1] = pool.splice(0, 1)[0];

  // 3. Slot #4: El bateador de mayor poder aislado (ISO / SLG) entre los 7 restantes
  pool.sort((a, b) => b.iso - a.iso || b.slg - a.slg);
  optimalSlots[4] = pool.splice(0, 1)[0];

  // 4. Slot #5: Segundo bateador de mayor poder restante (Mayor SLG)
  pool.sort((a, b) => b.slg - a.slg);
  optimalSlots[5] = pool.splice(0, 1)[0];

  // 5. Slot #3: El mejor bateador restante en wOBA/contacto (5to en la jerarquía)
  pool.sort((a, b) => b.woba - a.woba);
  optimalSlots[3] = pool.splice(0, 1)[0];

  // 6. Slot #9: Segundo Leadoff (Mejor OBP de los 4 restantes)
  pool.sort((a, b) => b.obp - a.obp);
  optimalSlots[9] = pool.splice(0, 1)[0];

  // 7. Slots #6, #7, #8: Orden descendente por wOBA entre los 3 restantes
  pool.sort((a, b) => b.woba - a.woba);
  optimalSlots[6] = pool.splice(0, 1)[0];
  optimalSlots[7] = pool.splice(0, 1)[0];
  optimalSlots[8] = pool.splice(0, 1)[0];

  // Construir el arreglo ordenado de 1 a 9
  const optimizedNine: TangoPlayer[] = [];
  for (let s = 1; s <= 9; s++) {
    optimizedNine.push(optimalSlots[s]);
  }

  const currentMetrics = calculateLineupMetrics(currentNine);
  const optimizedMetrics = calculateLineupMetrics(optimizedNine);

  const deltaRunsPerGame = Number(
    (optimizedMetrics.runsPerGame - currentMetrics.runsPerGame).toFixed(2)
  );
  const deltaRunsPerSeason = Number(
    (optimizedMetrics.runsPerSeason - currentMetrics.runsPerSeason).toFixed(1)
  );

  return {
    currentLineup: currentMetrics.contributions,
    optimizedLineup: optimizedMetrics.contributions,
    currentMetrics,
    optimizedMetrics,
    deltaRunsPerGame,
    deltaRunsPerSeason,
  };
}

export const DEFENSIVE_LINEUP_SLOTS = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
] as const;

const EXCLUDED_POSITIONS = new Set(["P", "1", "PH", "PR", "", "-"]);

function expandPositionToken(token: string): { positions: string[]; recognized: boolean } {
  const clean = token.trim().toUpperCase();
  if (!clean || EXCLUDED_POSITIONS.has(clean)) {
    return { positions: [], recognized: false };
  }

  switch (clean) {
    case "2":
    case "C":
      return { positions: ["C"], recognized: true };
    case "3":
    case "1B":
      return { positions: ["1B"], recognized: true };
    case "4":
    case "2B":
      return { positions: ["2B"], recognized: true };
    case "5":
    case "3B":
      return { positions: ["3B"], recognized: true };
    case "6":
    case "SS":
      return { positions: ["SS"], recognized: true };
    case "7":
    case "LF":
      return { positions: ["LF"], recognized: true };
    case "8":
    case "CF":
      return { positions: ["CF"], recognized: true };
    case "9":
    case "RF":
      return { positions: ["RF"], recognized: true };
    case "10":
    case "D":
    case "DH":
      return { positions: ["DH"], recognized: true };
    case "OF":
      return { positions: ["LF", "CF", "RF"], recognized: true };
    case "IF":
    case "INF":
      return { positions: ["1B", "2B", "3B", "SS"], recognized: true };
    case "CI":
      return { positions: ["1B", "3B"], recognized: true };
    case "MI":
      return { positions: ["2B", "SS"], recognized: true };
    case "UTIL":
    case "UT":
    case "TWP":
      return { positions: ["DH"], recognized: true };
    default:
      return { positions: [], recognized: false };
  }
}

/**
 * Normaliza posiciones elegibles de un bateador expandiendo `OF` (`LF/CF/RF`),
 * `IF` (`1B/2B/3B/SS`) e incluyendo `DH` para todo jugador de posición, excluyendo `P`, `PH` y `PR`.
 */
export function normalizeEligiblePositions(rawPositions: string[]): Set<string> {
  const result = new Set<string>();
  let hasBatterToken = false;

  for (const raw of rawPositions) {
    if (!raw) continue;
    const parts = String(raw).split(/[/,|]/);
    for (const part of parts) {
      const { positions, recognized } = expandPositionToken(part);
      if (recognized) {
        hasBatterToken = true;
        for (const pos of positions) {
          result.add(pos);
        }
      }
    }
  }

  if (hasBatterToken) {
    result.add("DH");
  }

  return result;
}

function buildSecondaryPositions(strictSet: Set<string>): Set<string> {
  const secondary = new Set<string>(strictSet);
  secondary.add("DH");

  if (strictSet.has("LF") || strictSet.has("CF") || strictSet.has("RF")) {
    secondary.add("LF");
    secondary.add("CF");
    secondary.add("RF");
  }
  if (strictSet.has("2B") || strictSet.has("SS")) {
    secondary.add("2B");
    secondary.add("SS");
    secondary.add("3B");
  }
  if (strictSet.has("3B")) {
    secondary.add("1B");
    secondary.add("2B");
  }
  if (strictSet.has("C") || strictSet.has("LF") || strictSet.has("RF")) {
    secondary.add("1B");
  }

  return secondary;
}

interface CandidateProfile {
  batter: ActiveRosterBatter;
  strictSet: Set<string>;
  secondarySet: Set<string>;
  primarySet: Set<string>;
  ops: number;
}

function runDefensiveSearch(
  candidates: CandidateProfile[],
  mode: "strict" | "secondary" | "emergency"
): { assignment: number[]; relaxedSlots: string[] } | null {
  const n = candidates.length;
  const slots = DEFENSIVE_LINEUP_SLOTS;

  const isEligibleForSlot = (idx: number, slot: string): boolean => {
    if (mode === "strict") return candidates[idx].strictSet.has(slot);
    if (mode === "secondary") return candidates[idx].secondarySet.has(slot);
    return true;
  };

  // Ordenar slots por menor cantidad de candidatos elegibles (MRV) para podar rápido
  const slotEntries = slots.map((slot, slotIdx) => {
    const eligibleIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (isEligibleForSlot(i, slot)) {
        eligibleIndices.push(i);
      }
    }
    eligibleIndices.sort((a, b) => {
      const aStrict = candidates[a].strictSet.has(slot) ? 1 : 0;
      const bStrict = candidates[b].strictSet.has(slot) ? 1 : 0;
      if (mode !== "strict" && aStrict !== bStrict) return bStrict - aStrict;
      if (mode === "emergency") {
        const aSec = candidates[a].secondarySet.has(slot) ? 1 : 0;
        const bSec = candidates[b].secondarySet.has(slot) ? 1 : 0;
        if (aSec !== bSec) return bSec - aSec;
      }
      const wobaDiff = candidates[b].batter.woba - candidates[a].batter.woba;
      if (Math.abs(wobaDiff) > 1e-9) return wobaDiff;
      const aPrimary = candidates[a].primarySet.has(slot) ? 1 : 0;
      const bPrimary = candidates[b].primarySet.has(slot) ? 1 : 0;
      if (aPrimary !== bPrimary) return bPrimary - aPrimary;
      return candidates[b].ops - candidates[a].ops;
    });

    return { slot, slotIdx, eligibleIndices };
  });

  if (slotEntries.some((entry) => entry.eligibleIndices.length === 0)) {
    return null;
  }

  slotEntries.sort((a, b) => a.eligibleIndices.length - b.eligibleIndices.length);

  const used = new Uint8Array(n);
  const currentAssignment = new Array<number>(9).fill(-1);
  let bestAssignment: number[] | null = null;
  let bestEmergencyCount = Infinity;
  let bestWoba = -Infinity;
  let bestNonStrictCount = Infinity;
  let bestOps = -Infinity;
  let bestPrimaryMatches = -Infinity;
  let nodesVisited = 0;
  const MAX_NODES = 100000;

  const computeUpperBounds = (remainingCount: number): { maxWoba: number; maxOps: number } => {
    let maxWoba = 0;
    let maxOps = 0;
    let taken = 0;
    for (let i = 0; i < n && taken < remainingCount; i++) {
      if (!used[i]) {
        maxWoba += candidates[i].batter.woba;
        maxOps += candidates[i].ops;
        taken++;
      }
    }
    return { maxWoba, maxOps };
  };

  const countMinUncoveredSecondary = (depth: number): number => {
    if (mode !== "emergency") return 0;
    let uncovered = 0;
    for (let d = depth; d < 9; d++) {
      const slot = slotEntries[d].slot;
      let hasUnusedSecondary = false;
      for (let i = 0; i < n; i++) {
        if (!used[i] && candidates[i].secondarySet.has(slot)) {
          hasUnusedSecondary = true;
          break;
        }
      }
      if (!hasUnusedSecondary) uncovered++;
    }
    return uncovered;
  };

  const dfs = (
    depth: number,
    wobaSum: number,
    opsSum: number,
    nonStrictCount: number,
    emergencyCount: number,
    primaryMatches: number
  ) => {
    if (nodesVisited >= MAX_NODES) return;
    nodesVisited++;

    if (depth === 9) {
      let better = false;
      if (mode === "emergency" && emergencyCount !== bestEmergencyCount) {
        better = emergencyCount < bestEmergencyCount;
      } else if (Math.abs(wobaSum - bestWoba) > 1e-9) {
        better = wobaSum > bestWoba;
      } else if (nonStrictCount !== bestNonStrictCount) {
        better = nonStrictCount < bestNonStrictCount;
      } else if (Math.abs(opsSum - bestOps) > 1e-9) {
        better = opsSum > bestOps;
      } else {
        better = primaryMatches > bestPrimaryMatches;
      }

      if (better) {
        bestEmergencyCount = emergencyCount;
        bestWoba = wobaSum;
        bestNonStrictCount = nonStrictCount;
        bestOps = opsSum;
        bestPrimaryMatches = primaryMatches;
        bestAssignment = [...currentAssignment];
      }
      return;
    }

    if (mode === "emergency" && bestAssignment !== null) {
      const lowerEmergency = emergencyCount + countMinUncoveredSecondary(depth);
      if (lowerEmergency > bestEmergencyCount) {
        return;
      }
    }

    if (bestAssignment !== null && (mode !== "emergency" || emergencyCount === bestEmergencyCount)) {
      const { maxWoba } = computeUpperBounds(9 - depth);
      if (wobaSum + maxWoba < bestWoba - 1e-9) {
        return;
      }
    }

    const { slot, slotIdx, eligibleIndices } = slotEntries[depth];
    for (const candIdx of eligibleIndices) {
      if (used[candIdx]) continue;
      if (nodesVisited >= MAX_NODES) break;

      const cand = candidates[candIdx];
      const isStrict = cand.strictSet.has(slot);
      const isSecondary = cand.secondarySet.has(slot);
      const isPrimary = cand.primarySet.has(slot);

      used[candIdx] = 1;
      currentAssignment[slotIdx] = candIdx;

      dfs(
        depth + 1,
        wobaSum + cand.batter.woba,
        opsSum + cand.ops,
        nonStrictCount + (isStrict ? 0 : 1),
        emergencyCount + (isSecondary ? 0 : 1),
        primaryMatches + (isPrimary ? 1 : 0)
      );

      used[candIdx] = 0;
      currentAssignment[slotIdx] = -1;
    }
  };

  dfs(0, 0, 0, 0, 0, 0);

  if (!bestAssignment) return null;

  const finalAssignment: number[] = bestAssignment;
  const relaxedSlots: string[] = [];
  for (let sIdx = 0; sIdx < 9; sIdx++) {
    const slot = slots[sIdx];
    const candIdx = finalAssignment[sIdx];
    if (!candidates[candIdx].strictSet.has(slot)) {
      relaxedSlots.push(slot);
    }
  }

  return { assignment: finalAssignment, relaxedSlots };
}

/**
 * Selecciona los 9 bateadores que maximizan la suma ofensiva (`wOBA`) cubriendo las
 * 9 posiciones reglamentarias (`C, 1B, 2B, 3B, SS, LF, CF, RF, DH`) sin repetir jugador.
 */
export function selectBestDefensiveNine(pool: ActiveRosterBatter[]): {
  selected: ActiveRosterBatter[];
  assignedPositions: Record<number, string>;
  relaxedNote?: string;
} {
  if (pool.length < 9) {
    return {
      selected: [],
      assignedPositions: {},
      relaxedNote: `Solo hay ${pool.length} bateadores disponibles (se requieren 9 para cubrir las posiciones).`,
    };
  }

  const sortedPool = [...pool].sort(
    (a, b) =>
      b.woba - a.woba ||
      b.obp + b.slg - (a.obp + a.slg) ||
      b.wrcPlus - a.wrcPlus ||
      b.plateAppearances - a.plateAppearances ||
      a.playerId - b.playerId
  );

  const candidates: CandidateProfile[] = sortedPool.map((batter) => {
    const rawList =
      batter.eligiblePositions && batter.eligiblePositions.length > 0
        ? batter.eligiblePositions
        : [batter.position];
    const strictSet = normalizeEligiblePositions(rawList);
    strictSet.add("DH");
    const primarySet = new Set(expandPositionToken(batter.position).positions);
    return {
      batter,
      strictSet,
      secondarySet: buildSecondaryPositions(strictSet),
      primarySet,
      ops: batter.obp + batter.slg,
    };
  });

  const stage1 = runDefensiveSearch(candidates, "strict");
  if (stage1) {
    const selected: ActiveRosterBatter[] = [];
    const assignedPositions: Record<number, string> = {};
    for (let sIdx = 0; sIdx < 9; sIdx++) {
      const slot = DEFENSIVE_LINEUP_SLOTS[sIdx];
      const batter = candidates[stage1.assignment[sIdx]].batter;
      selected.push(batter);
      assignedPositions[batter.playerId] = slot;
    }
    return { selected, assignedPositions };
  }

  const stage2a = runDefensiveSearch(candidates, "secondary");
  if (stage2a) {
    const selected: ActiveRosterBatter[] = [];
    const assignedPositions: Record<number, string> = {};
    for (let sIdx = 0; sIdx < 9; sIdx++) {
      const slot = DEFENSIVE_LINEUP_SLOTS[sIdx];
      const batter = candidates[stage2a.assignment[sIdx]].batter;
      selected.push(batter);
      assignedPositions[batter.playerId] = slot;
    }
    return {
      selected,
      assignedPositions,
      relaxedNote:
        stage2a.relaxedSlots.length > 0
          ? `Flexibilidad posicional secundaria aplicada en ${stage2a.relaxedSlots.join(", ")} por falta de cobertura natural suficiente.`
          : undefined,
    };
  }

  const stage2b = runDefensiveSearch(candidates, "emergency");
  if (stage2b) {
    const selected: ActiveRosterBatter[] = [];
    const assignedPositions: Record<number, string> = {};
    for (let sIdx = 0; sIdx < 9; sIdx++) {
      const slot = DEFENSIVE_LINEUP_SLOTS[sIdx];
      const batter = candidates[stage2b.assignment[sIdx]].batter;
      selected.push(batter);
      assignedPositions[batter.playerId] = slot;
    }
    return {
      selected,
      assignedPositions,
      relaxedNote:
        stage2b.relaxedSlots.length > 0
          ? `Cobertura de emergencia aplicada en ${stage2b.relaxedSlots.join(", ")} por ausencia de especialistas disponibles en el roster.`
          : undefined,
    };
  }

  return {
    selected: [],
    assignedPositions: {},
    relaxedNote: "No fue posible conformar una alineación válida de 9 bateadores.",
  };
}

function createEmptyMetrics(): TangoLineupMetrics {
  return {
    runsPerGame: 0,
    runsPerSeason: 0,
    teamWoba: 0,
    platoonBalanceScore: 0,
    contributions: [],
  };
}

/**
 * Construye el mejor lineup posible a partir de un pool de roster activo,
 * aplicando exclusiones manuales, muestra mínima progresiva de PA, restricciones defensivas
 * (o top-9 bates puros) y comparación contra un lineup de referencia.
 */
export function buildBestAvailableLineup(
  params: BuildBestAvailableLineupParams
): BestAvailableLineupResult {
  const modeUsed: BestLineupConstraintMode = params.mode ?? "defensive_valid";
  const requestedMinPa = Math.max(0, params.minPlateAppearances ?? 10);
  const excludedSet = new Set(params.excludedPlayerIds ?? []);

  const availablePool = params.pool.filter((p) => !excludedSet.has(p.playerId));

  // Cascada progresiva de PA: [requestedMinPa, 5, 0] deduplicada y descendente
  const thresholds = Array.from(
    new Set([requestedMinPa, 5, 0].filter((v) => v <= requestedMinPa))
  ).sort((a, b) => b - a);

  let effectiveMinPa = thresholds[thresholds.length - 1] ?? 0;
  let qualifiedPool = availablePool;

  for (const threshold of thresholds) {
    const filtered = availablePool.filter((p) => p.plateAppearances >= threshold);
    if (filtered.length >= 9 || threshold === 0) {
      effectiveMinPa = threshold;
      qualifiedPool = filtered;
      break;
    }
  }

  const notes: string[] = [];
  if (effectiveMinPa < requestedMinPa) {
    notes.push(
      `Umbral mínimo ajustado de ${requestedMinPa} a ${effectiveMinPa} PA para reunir al menos 9 bateadores disponibles.`
    );
  }

  if (qualifiedPool.length < 9) {
    const refMetrics =
      params.referenceLineup && params.referenceLineup.length >= 9
        ? calculateLineupMetrics(params.referenceLineup.slice(0, 9))
        : createEmptyMetrics();
    const emptyOpt = createEmptyMetrics();
    notes.push(
      `Solo hay ${qualifiedPool.length} bateadores disponibles tras filtros (se requieren 9 para armar el lineup).`
    );
    const benchPlayers = [...params.pool].sort(
      (a, b) => b.woba - a.woba || b.plateAppearances - a.plateAppearances
    );

    return {
      optimization: {
        currentLineup: refMetrics.contributions,
        optimizedLineup: [],
        currentMetrics: refMetrics,
        optimizedMetrics: emptyOpt,
        deltaRunsPerGame: 0,
        deltaRunsPerSeason: 0,
      },
      assignedPositions: {},
      benchPlayers,
      modeUsed,
      effectiveMinPa,
      relaxedConstraintNote: notes.join(" "),
    };
  }

  let selectedNine: ActiveRosterBatter[];
  let assignedPositions: Record<number, string> = {};

  if (modeUsed === "pure_bats") {
    selectedNine = [...qualifiedPool]
      .sort(
        (a, b) =>
          b.woba - a.woba ||
          b.wrcPlus - a.wrcPlus ||
          b.obp - a.obp ||
          b.plateAppearances - a.plateAppearances
      )
      .slice(0, 9);
    for (const batter of selectedNine) {
      assignedPositions[batter.playerId] = batter.position || "DH";
    }
  } else {
    const defensiveResult = selectBestDefensiveNine(qualifiedPool);
    selectedNine = defensiveResult.selected;
    assignedPositions = defensiveResult.assignedPositions;
    if (defensiveResult.relaxedNote) {
      notes.push(defensiveResult.relaxedNote);
    }
  }

  const selectedWithAssignedPos: ActiveRosterBatter[] = selectedNine.map((player) => ({
    ...player,
    position: assignedPositions[player.playerId] || player.position,
  }));

  const baseOpt = optimizeTangoLineup(selectedWithAssignedPos);
  let optimization: TangoOptimizationResult = baseOpt;

  if (params.referenceLineup && params.referenceLineup.length >= 9) {
    const refNine = params.referenceLineup.slice(0, 9);
    const currentMetrics = calculateLineupMetrics(refNine);
    const optimizedMetrics = baseOpt.optimizedMetrics;
    optimization = {
      currentLineup: currentMetrics.contributions,
      optimizedLineup: baseOpt.optimizedLineup,
      currentMetrics,
      optimizedMetrics,
      deltaRunsPerGame: Number(
        (optimizedMetrics.runsPerGame - currentMetrics.runsPerGame).toFixed(2)
      ),
      deltaRunsPerSeason: Number(
        (optimizedMetrics.runsPerSeason - currentMetrics.runsPerSeason).toFixed(1)
      ),
    };
  }

  const selectedIds = new Set(selectedNine.map((p) => p.playerId));
  const benchPlayers = params.pool
    .filter((p) => !selectedIds.has(p.playerId))
    .sort((a, b) => b.woba - a.woba || b.plateAppearances - a.plateAppearances);

  return {
    optimization,
    assignedPositions,
    benchPlayers,
    modeUsed,
    effectiveMinPa,
    relaxedConstraintNote: notes.length > 0 ? notes.join(" ") : undefined,
  };
}
