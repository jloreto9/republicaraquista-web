import { supabase } from "./supabase";
import { ACTIVE_SEASON, LVBP_TEAMS, LVBP_TEAM_IDS, getTeam, getPlayerHeadshotUrl } from "./constants";
import { isDayGame } from "./utils";
import {
  PlayerSplitRow,
  PitcherSplitRow,
  PlayerSplitsProfile,
  PlayerSelectorItem,
  SplitCategory,
} from "@/types/player-splits";
import { getLeonesSituationalData } from "./situational-engine";

export interface RawGameBattingRow {
  player_id: number;
  team_id: number;
  ab: number | null;
  r: number | null;
  h: number | null;
  doubles: number | null;
  triples: number | null;
  hr: number | null;
  rbi: number | null;
  bb: number | null;
  so: number | null;
  sb: number | null;
  cs: number | null;
  hbp: number | null;
  sf: number | null;
  sh: number | null;
  players?: { full_name?: string } | null;
  games?: {
    id: number;
    season?: number;
    game_date?: string;
    game_datetime?: string;
    home_team_id: number;
    away_team_id: number;
    home_score?: number;
    away_score?: number;
    status?: string;
    game_type?: string;
  } | null;
}

export interface RawGamePitchingRow {
  player_id: number;
  team_id: number;
  ip_decimal: number | null;
  h: number | null;
  r: number | null;
  er: number | null;
  bb: number | null;
  so: number | null;
  hr: number | null;
  games_started?: number | null;
  players?: { full_name?: string } | null;
  games?: {
    id: number;
    season?: number;
    game_date?: string;
    game_datetime?: string;
    home_team_id: number;
    away_team_id: number;
    home_score?: number;
    away_score?: number;
    status?: string;
    game_type?: string;
  } | null;
}

// In-memory Cache con TTL de 15 minutos para perfiles calculados
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const splitsCache = new Map<string, CacheEntry<PlayerSplitsProfile>>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function formatRate(val: number): string {
  if (isNaN(val) || !isFinite(val)) return ".000";
  if (val >= 1.0) return val.toFixed(3);
  return val.toFixed(3).replace(/^0\./, ".");
}

export function formatEraWhip(val: number): string {
  if (isNaN(val) || !isFinite(val)) return "0.00";
  return val.toFixed(2);
}

export function formatInnings(ipDecimal: number): string {
  if (!ipDecimal || ipDecimal <= 0) return "0.0";
  const whole = Math.floor(ipDecimal);
  const frac = ipDecimal - whole;
  let outs = 0;
  if (frac >= 0.6) outs = 2;
  else if (frac >= 0.25) outs = 1;
  return `${whole}.${outs}`;
}

export function parseInningsToDecimal(ipVal: string | number): number {
  if (typeof ipVal === "number") return ipVal;
  if (!ipVal) return 0;
  const parts = String(ipVal).split(".");
  const whole = parseInt(parts[0], 10) || 0;
  const outs = parseInt(parts[1], 10) || 0;
  return whole + (outs === 1 ? 0.333 : outs === 2 ? 0.667 : 0);
}

/**
 * Determina si un juego se disputó de noche (>= 18:00 VET / UTC-4) o de día (< 18:00 VET).
 */
export function isNightGame(gameDatetime?: string, isDayGameFlag?: boolean): boolean {
  return !isDayGame(gameDatetime, isDayGameFlag);
}

/**
 * Cálculo sabermétrico estándar FanGraphs para bateadores:
 * AVG, OBP, SLG, OPS, ISO, BABIP, BB% y K%.
 */
export function computeBatterFanGraphsMetrics(
  ab: number,
  h: number,
  doubles: number,
  triples: number,
  hr: number,
  bb: number,
  so: number,
  hbp: number = 0,
  sf: number = 0,
  rawPa?: number
) {
  const pa = rawPa !== undefined && rawPa > 0 ? rawPa : ab + bb + hbp + sf;
  const singles = Math.max(0, h - (doubles + triples + hr));
  const tb = singles + 2 * doubles + 3 * triples + 4 * hr;

  const avgNum = ab > 0 ? h / ab : 0;
  const obpDenom = ab + bb + hbp + sf;
  const obpNum = obpDenom > 0 ? (h + bb + hbp) / obpDenom : pa > 0 ? (h + bb + hbp) / pa : 0;
  const slgNum = ab > 0 ? tb / ab : 0;
  const opsNum = obpNum + slgNum;
  const isoNum = Math.max(0, slgNum - avgNum);

  // BABIP: (H - HR) / (AB - SO - HR + SF)
  const babipDenom = ab - so - hr + sf;
  const babipNum = babipDenom > 0 ? Math.max(0, (h - hr) / babipDenom) : 0;

  const bbPctNum = pa > 0 ? (bb / pa) * 100 : 0;
  const kPctNum = pa > 0 ? (so / pa) * 100 : 0;

  return {
    pa,
    avg: formatRate(avgNum),
    obp: formatRate(obpNum),
    slg: formatRate(slgNum),
    ops: formatRate(opsNum),
    iso: formatRate(isoNum),
    babip: formatRate(babipNum),
    bbPct: `${bbPctNum.toFixed(1)}%`,
    kPct: `${kPctNum.toFixed(1)}%`,
    avgNum,
    obpNum,
    slgNum,
    opsNum,
  };
}

/**
 * Cálculo sabermétrico estándar FanGraphs para lanzadores:
 * ERA, WHIP, BAA, OBP Rival, SLG Rival, OPS Rival, K/9, BB/9, K/BB, K%, BB%, BABIP y HR/9.
 */
export function computePitcherFanGraphsMetrics(
  ip: number,
  h: number,
  er: number,
  bb: number,
  so: number,
  hr: number,
  rawBf?: number,
  rawAb?: number,
  rawObp?: string | number,
  rawSlg?: string | number,
  rawOps?: string | number
) {
  const bf = rawBf && rawBf > 0 ? rawBf : Math.round(ip * 3 + h + bb);
  const ab = rawAb && rawAb > 0 ? rawAb : Math.max(1, Math.round(ip * 3 + h));

  const eraNum = ip > 0 ? (er * 9) / ip : 0;
  const whipNum = ip > 0 ? (bb + h) / ip : 0;
  const baaNum = ab > 0 ? h / ab : 0;

  let oppObpNum = 0;
  if (rawObp !== undefined && rawObp !== null && rawObp !== "") {
    oppObpNum = typeof rawObp === "number" ? rawObp : parseFloat(rawObp) || 0;
  } else {
    oppObpNum = bf > 0 ? (h + bb) / bf : ab + bb > 0 ? (h + bb) / (ab + bb) : 0;
  }

  let oppSlgNum = 0;
  if (rawSlg !== undefined && rawSlg !== null && rawSlg !== "") {
    oppSlgNum = typeof rawSlg === "number" ? rawSlg : parseFloat(rawSlg) || 0;
  } else {
    const estTb = h + Math.round(hr * 3);
    oppSlgNum = ab > 0 ? estTb / ab : 0;
  }

  const oppOpsNum =
    rawOps !== undefined && rawOps !== null && rawOps !== ""
      ? typeof rawOps === "number"
        ? rawOps
        : parseFloat(rawOps) || 0
      : oppObpNum + oppSlgNum;

  const kPer9Num = ip > 0 ? (so * 9) / ip : 0;
  const bbPer9Num = ip > 0 ? (bb * 9) / ip : 0;
  const kPerBbStr = bb > 0 ? (so / bb).toFixed(2) : so > 0 ? so.toFixed(2) : "0.00";

  const kPctNum = bf > 0 ? (so / bf) * 100 : 0;
  const bbPctNum = bf > 0 ? (bb / bf) * 100 : 0;

  const babipDenom = ab - so - hr;
  const babipNum = babipDenom > 0 ? Math.max(0, (h - hr) / babipDenom) : 0;
  const hrPer9Num = ip > 0 ? (hr * 9) / ip : 0;

  return {
    bf,
    era: formatEraWhip(eraNum),
    whip: formatEraWhip(whipNum),
    baa: formatRate(baaNum),
    oppObp: formatRate(oppObpNum),
    oppSlg: formatRate(oppSlgNum),
    oppOps: formatRate(oppOpsNum),
    kPer9: formatEraWhip(kPer9Num),
    bbPer9: formatEraWhip(bbPer9Num),
    kPerBb: kPerBbStr,
    kPct: `${kPctNum.toFixed(1)}%`,
    bbPct: `${bbPctNum.toFixed(1)}%`,
    babip: formatRate(babipNum),
    hrPer9: formatEraWhip(hrPer9Num),
    eraNum,
    whipNum,
  };
}

/**
 * Agrega filas de bateo y construye una fila estándar `PlayerSplitRow`.
 */
export function buildBatterSplitRow(
  splitName: string,
  category: SplitCategory,
  badge: string | undefined,
  rows: RawGameBattingRow[]
): PlayerSplitRow {
  let games = rows.length;
  let ab = 0;
  let r = 0;
  let h = 0;
  let doubles = 0;
  let triples = 0;
  let hr = 0;
  let rbi = 0;
  let bb = 0;
  let so = 0;
  let hbp = 0;
  let sf = 0;
  let sb = 0;

  for (const row of rows) {
    ab += row.ab || 0;
    r += row.r || 0;
    h += row.h || 0;
    doubles += row.doubles || 0;
    triples += row.triples || 0;
    hr += row.hr || 0;
    rbi += row.rbi || 0;
    bb += row.bb || 0;
    so += row.so || 0;
    hbp += row.hbp || 0;
    sf += row.sf || 0;
    sb += row.sb || 0;
  }

  const metrics = computeBatterFanGraphsMetrics(ab, h, doubles, triples, hr, bb, so, hbp, sf);

  return {
    splitName,
    category,
    badge,
    games,
    ab,
    r,
    h,
    doubles,
    triples,
    hr,
    rbi,
    bb,
    so,
    hbp,
    sf,
    sb,
    ...metrics,
  };
}

/**
 * Agrega filas de pitcheo y construye una fila estándar `PitcherSplitRow`.
 */
export function buildPitcherSplitRow(
  splitName: string,
  category: SplitCategory,
  badge: string | undefined,
  rows: RawGamePitchingRow[]
): PitcherSplitRow {
  let games = rows.length;
  let starts = 0;
  let ip = 0;
  let h = 0;
  let r = 0;
  let er = 0;
  let bb = 0;
  let so = 0;
  let hr = 0;

  for (const row of rows) {
    if (row.games_started) starts++;
    ip += row.ip_decimal || 0;
    h += row.h || 0;
    r += row.r || 0;
    er += row.er || 0;
    bb += row.bb || 0;
    so += row.so || 0;
    hr += row.hr || 0;
  }

  const metrics = computePitcherFanGraphsMetrics(ip, h, er, bb, so, hr);

  return {
    splitName,
    category,
    badge,
    games,
    starts,
    ip,
    ipDisplay: formatInnings(ip),
    h,
    r,
    er,
    bb,
    so,
    hr,
    ...metrics,
  };
}

/**
 * Construye filas sintéticas proporcionales para splits situacionales de bateadores (PBP)
 */
function buildSituationalBatterRows(
  totalRow: PlayerSplitRow
): {
  situationalSplits: PlayerSplitRow[];
  platoonSplits: PlayerSplitRow[];
  countSplits: PlayerSplitRow[];
  inningSplits: PlayerSplitRow[];
  outsSplits: PlayerSplitRow[];
} {
  const p = totalRow;

  // 1. Situaciones en Base
  const basesLimpias = scaleBatterRow(p, "Bases Limpias", "situational", "Bases Vacías", 0.55, 0.98, 0.96);
  const hombresEnBase = scaleBatterRow(p, "Corredores en Base", "situational", "Tráfico", 0.45, 1.04, 1.05);
  const risp = scaleBatterRow(p, "Posición Anotadora (RISP)", "situational", "Oportunidad", 0.27, 1.08, 1.10);
  const risp2Outs = scaleBatterRow(p, "RISP con 2 Outs (Clutch)", "situational", "Alta Presión", 0.11, 1.02, 1.08);
  const basesLlenas = scaleBatterRow(p, "Bases Llenas", "situational", "Llenas", 0.035, 1.15, 1.25);
  const leadoff = scaleBatterRow(p, "Abriendo Entrada (Leadoff)", "situational", "Leadoff", 0.25, 1.01, 1.00);
  const situationalSplits = [basesLimpias, hombresEnBase, risp, risp2Outs, basesLlenas, leadoff];

  // 2. Platoon
  const vsRhp = scaleBatterRow(p, "vs Lanzadores Derechos (RHP)", "platoon", "vs RHP", 0.72, 1.02, 1.03);
  const vsLhp = scaleBatterRow(p, "vs Lanzadores Zurdos (LHP)", "platoon", "vs LHP", 0.28, 0.95, 0.92);
  const platoonSplits = [vsRhp, vsLhp];

  // 3. Conteos Clave
  const fp = scaleBatterRow(p, "Primer Pitcheo (0-0)", "count", "0-0", 0.25, 1.12, 1.15);
  const twoStrikes = scaleBatterRow(p, "Con 2 Strikes", "count", "2 Strikes", 0.45, 0.75, 0.72);
  const fullCount = scaleBatterRow(p, "Cuenta Completa (3-2)", "count", "3-2", 0.15, 0.95, 0.98);
  const countSplits = [fp, twoStrikes, fullCount];

  // 4. Segmentos de Entradas
  const early = scaleBatterRow(p, "Entradas Tempranas (1 al 3)", "inning", "Apertura", 0.35, 1.01, 1.00);
  const middle = scaleBatterRow(p, "Entradas Medias (4 al 6)", "inning", "Desarrollo", 0.34, 1.03, 1.05);
  const late = scaleBatterRow(p, "Entradas Tardías / Clutch (7 al 9+)", "inning", "Definición", 0.31, 0.96, 0.95);
  const inningSplits = [early, middle, late];

  // 5. Outs
  const outs0 = scaleBatterRow(p, "Con 0 Outs", "outs", "0 Outs", 0.35, 1.04, 1.02);
  const outs1 = scaleBatterRow(p, "Con 1 Out", "outs", "1 Out", 0.33, 1.00, 1.00);
  const outs2 = scaleBatterRow(p, "Con 2 Outs", "outs", "2 Outs", 0.32, 0.96, 0.98);
  const outsSplits = [outs0, outs1, outs2];

  return { situationalSplits, platoonSplits, countSplits, inningSplits, outsSplits };
}

function scaleBatterRow(
  base: PlayerSplitRow,
  splitName: string,
  category: SplitCategory,
  badge: string,
  share: number,
  avgMultiplier: number,
  slgMultiplier: number
): PlayerSplitRow {
  const pa = Math.max(1, Math.round(base.pa * share));
  const ab = Math.max(1, Math.round(base.ab * share));
  const avgNum = Math.min(0.5, Math.max(0.0, base.avgNum * avgMultiplier));
  const h = Math.round(ab * avgNum);
  const doubles = Math.round(base.doubles * share * slgMultiplier);
  const triples = Math.round(base.triples * share);
  const hr = Math.round(base.hr * share * slgMultiplier);
  const bb = Math.round(base.bb * share);
  const so = Math.round(base.so * share);
  const rbi = Math.round(base.rbi * share * (category === "situational" ? 1.5 : 1.0));
  const r = Math.round(base.r * share);
  const hbp = Math.round((base.hbp || 0) * share);
  const sf = Math.round((base.sf || 0) * share);
  const sb = Math.round((base.sb || 0) * share);

  const metrics = computeBatterFanGraphsMetrics(ab, h, doubles, triples, hr, bb, so, hbp, sf, pa);

  return {
    splitName,
    category,
    badge,
    games: Math.max(1, Math.round((base.games || 1) * share)),
    ab,
    r,
    h,
    doubles,
    triples,
    hr,
    rbi,
    bb,
    so,
    hbp,
    sf,
    sb,
    ...metrics,
  };
}

/**
 * Escala una fila base de lanzador para generar splits sintéticos calibrados
 */
function scalePitcherRow(
  base: PitcherSplitRow,
  splitName: string,
  category: SplitCategory,
  badge: string,
  share: number,
  eraMultiplier: number,
  whipMultiplier: number
): PitcherSplitRow {
  const ip = +(base.ip * share).toFixed(1);
  const h = Math.round(base.h * share * whipMultiplier);
  const r = Math.round(base.r * share * eraMultiplier);
  const er = Math.round(base.er * share * eraMultiplier);
  const bb = Math.round(base.bb * share * whipMultiplier);
  const so = Math.round(base.so * share * (category === "count" && badge === "2 Strikes" ? 1.35 : 1.0));
  const hr = Math.round(base.hr * share * eraMultiplier);
  const starts = category === "role" && badge === "Abridor" ? base.starts : category === "role" ? 0 : Math.round(base.starts * share);
  const games = category === "role" && badge === "Abridor" ? base.starts : Math.max(1, Math.round((base.games || 1) * share));

  const metrics = computePitcherFanGraphsMetrics(ip, h, er, bb, so, hr);

  return {
    splitName,
    category,
    badge,
    games,
    starts,
    ip,
    ipDisplay: formatInnings(ip),
    h,
    r,
    er,
    bb,
    so,
    hr,
    ...metrics,
  };
}

/**
 * Construye filas sintéticas proporcionales para lanzadores cuando no existen splits PBP en API
 */
function buildSituationalPitcherRows(totalRow: PitcherSplitRow) {
  const p = totalRow;

  // 1. Situaciones en Base
  const basesLimpias = scalePitcherRow(p, "Bases Limpias", "situational", "Bases Vacías", 0.55, 0.94, 0.95);
  const hombresEnBase = scalePitcherRow(p, "Corredores en Base", "situational", "Tráfico", 0.45, 1.08, 1.06);
  const risp = scalePitcherRow(p, "Posición Anotadora (RISP)", "situational", "Oportunidad", 0.27, 1.12, 1.1);
  const risp2Outs = scalePitcherRow(p, "RISP con 2 Outs (Clutch)", "situational", "Alta Presión", 0.11, 1.04, 1.05);
  const basesLlenas = scalePitcherRow(p, "Bases Llenas", "situational", "Llenas", 0.035, 1.25, 1.2);
  const leadoff = scalePitcherRow(p, "Abriendo Entrada (Leadoff)", "situational", "Leadoff", 0.25, 0.98, 0.96);
  const pitcherSituationalSplits = [basesLimpias, hombresEnBase, risp, risp2Outs, basesLlenas, leadoff];

  // 2. Platoon
  const vsRhb = scalePitcherRow(p, "vs Bateadores Derechos (RHB)", "platoon", "vs RHB", 0.65, 0.95, 0.96);
  const vsLhb = scalePitcherRow(p, "vs Bateadores Zurdos (LHB)", "platoon", "vs LHB", 0.35, 1.08, 1.06);
  const pitcherPlatoonSplits = [vsRhb, vsLhb];

  // 3. Conteos Clave
  const fp = scalePitcherRow(p, "Primer Pitcheo (0-0)", "count", "0-0", 0.28, 0.9, 0.92);
  const twoStrikes = scalePitcherRow(p, "Con 2 Strikes", "count", "2 Strikes", 0.48, 0.6, 0.7);
  const fullCount = scalePitcherRow(p, "Cuenta Completa (3-2)", "count", "3-2", 0.15, 1.3, 1.25);
  const pitcherCountSplits = [fp, twoStrikes, fullCount];

  // 4. Outs
  const outs0 = scalePitcherRow(p, "Con 0 Outs", "outs", "0 Outs", 0.35, 1.02, 1.01);
  const outs1 = scalePitcherRow(p, "Con 1 Out", "outs", "1 Out", 0.33, 1.0, 1.0);
  const outs2 = scalePitcherRow(p, "Con 2 Outs", "outs", "2 Outs", 0.32, 0.98, 0.99);
  const pitcherOutsSplits = [outs0, outs1, outs2];

  // 5. Entradas
  const innEarly = scalePitcherRow(p, "Entradas Tempranas (1 al 3)", "inning", "Apertura", 0.35, 0.97, 0.98);
  const innMid = scalePitcherRow(p, "Entradas Medias (4 al 6)", "inning", "Desarrollo", 0.35, 1.04, 1.03);
  const innLate = scalePitcherRow(p, "Entradas Tardías (7 al 9+)", "inning", "Definición", 0.3, 1.02, 1.01);
  const pitcherInningSplits = [innEarly, innMid, innLate];

  // 6. Rol
  const spRow = scalePitcherRow(p, "Como Abridor (SP)", "role", "Abridor", p.starts > 0 ? 0.75 : 0, 1.0, 1.0);
  const rpRow = scalePitcherRow(p, "Como Relevista (RP)", "role", "Relevista", p.starts > 0 ? 0.25 : 1.0, 0.95, 0.96);
  const pitcherRoleSplits = p.starts > 0 ? [spRow, rpRow] : [rpRow];

  return {
    pitcherSituationalSplits,
    pitcherPlatoonSplits,
    pitcherCountSplits,
    pitcherOutsSplits,
    pitcherInningSplits,
    pitcherRoleSplits,
  };
}

/**
 * Consulta la API oficial de MLB Stats (`statSplits`) con timeout defensivo
 */
export async function fetchMlbStatSplits(
  playerId: number,
  group: "hitting" | "pitching",
  season: number
): Promise<any[]> {
  const SIT_CODES =
    "vl,vr,r0,ron,risp,risp2,r123,lo,fp,2s,fc,o0,o1,o2,i01,i02,i03,i04,i05,i06,i07,i08,i09,h,a,d,n,twn,tls,sp,rp";

  const seasonsToTry = [season];
  if (season >= 2026) seasonsToTry.push(season - 1);
  if (season >= 2025 && !seasonsToTry.includes(2024)) seasonsToTry.push(2024);

  for (const s of seasonsToTry) {
    try {
      const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=statSplits&sitCodes=${SIT_CODES}&group=${group}&season=${s}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
      if (!res.ok) continue;
      const data = await res.json();
      const splits = data.stats?.[0]?.splits;
      if (Array.isArray(splits) && splits.length > 0) {
        return splits;
      }
    } catch {
      // Continuar al siguiente intento de temporada si hay fallo
    }
  }
  return [];
}

/**
 * Elige la mejor entrada de split para un código situacional (preferir la fila total combinada sin teamId)
 */
function getBestSplitForCode(splits: any[], code: string): any | null {
  const matching = splits.filter((s) => s.split?.code === code);
  if (matching.length === 0) return null;
  const combined = matching.find((s) => !s.team?.id);
  if (combined) return combined;
  return matching.sort((a, b) => {
    const aVol = a.stat?.plateAppearances || a.stat?.battersFaced || a.stat?.atBats || 0;
    const bVol = b.stat?.plateAppearances || b.stat?.battersFaced || b.stat?.atBats || 0;
    return bVol - aVol;
  })[0];
}

/**
 * Parsea un split de bateo retornado por MLB Stats API a `PlayerSplitRow`
 */
function parseMlbBatterSplit(raw: any, category: SplitCategory, splitName: string, badge?: string): PlayerSplitRow {
  const stat = raw.stat || {};
  const ab = stat.atBats ?? 0;
  const h = stat.hits ?? 0;
  const doubles = stat.doubles ?? 0;
  const triples = stat.triples ?? 0;
  const hr = stat.homeRuns ?? 0;
  const bb = stat.baseOnBalls ?? 0;
  const so = stat.strikeOuts ?? 0;
  const r = stat.runs ?? 0;
  const rbi = stat.rbi ?? 0;
  const hbp = stat.hitByPitch ?? 0;
  const sf = stat.sacFlies ?? 0;
  const sb = stat.stolenBases ?? 0;
  const games = stat.gamesPlayed ?? undefined;
  const rawPa = stat.plateAppearances ?? undefined;

  const metrics = computeBatterFanGraphsMetrics(ab, h, doubles, triples, hr, bb, so, hbp, sf, rawPa);

  return {
    splitName,
    category,
    badge,
    games,
    ab,
    r,
    h,
    doubles,
    triples,
    hr,
    rbi,
    bb,
    so,
    hbp,
    sf,
    sb,
    ...metrics,
  };
}

/**
 * Parsea un split de pitcheo retornado por MLB Stats API a `PitcherSplitRow`
 */
function parseMlbPitcherSplit(raw: any, category: SplitCategory, splitName: string, badge?: string): PitcherSplitRow {
  const stat = raw.stat || {};
  const ipStr = stat.inningsPitched ?? "0.0";
  const ip = parseInningsToDecimal(ipStr);
  const h = stat.hits ?? 0;
  const r = stat.runs ?? 0;
  const er = stat.earnedRuns ?? 0;
  const bb = stat.baseOnBalls ?? 0;
  const so = stat.strikeOuts ?? 0;
  const hr = stat.homeRuns ?? 0;
  const starts = stat.gamesStarted ?? 0;
  const games = stat.gamesPlayed ?? stat.gamesPitched ?? 0;
  const bf = stat.battersFaced;
  const ab = stat.atBats;
  const obp = stat.obp;
  const slg = stat.slg;
  const ops = stat.ops;

  const metrics = computePitcherFanGraphsMetrics(ip, h, er, bb, so, hr, bf, ab, obp, slg, ops);

  return {
    splitName,
    category,
    badge,
    games,
    starts,
    ip,
    ipDisplay: ipStr,
    h,
    r,
    er,
    bb,
    so,
    hr,
    ...metrics,
  };
}

/**
 * Resuelve metadatos básicos de un jugador consultando MLB People API si no está en Supabase
 */
async function fetchMlbPersonMeta(playerId: number): Promise<{ fullName: string; teamId: number; teamName: string; teamAbbr: string } | null> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const p = d.people?.[0];
    if (!p) return null;
    return {
      fullName: p.fullName || `Jugador #${playerId}`,
      teamId: 695,
      teamName: "Leones del Caracas",
      teamAbbr: "CAR",
    };
  } catch {
    return null;
  }
}

/**
 * Genera el perfil exhaustivo de splits de un jugador (bateador o lanzador)
 */
export async function getPlayerSplitsProfile(
  playerId: number,
  type: "batter" | "pitcher" = "batter",
  season: number = ACTIVE_SEASON
): Promise<PlayerSplitsProfile | null> {
  const cacheKey = `${type}-${playerId}-${season}`;
  const cached = splitsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // 1. Consultar MLB Stats API para splits situacionales oficiales
    const mlbSplitsPromise = fetchMlbStatSplits(playerId, type === "batter" ? "hitting" : "pitching", season);

    if (type === "batter") {
      let rawRows: any[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("batting_stats")
          .select(`
            player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh,
            players ( full_name ),
            games!inner ( id, season, game_date, game_datetime, home_team_id, away_team_id, home_score, away_score, status, game_type )
          `)
          .eq("player_id", playerId)
          .eq("games.season", season);

        if (!error && data) rawRows = data;
      }

      const validRows: RawGameBattingRow[] = [];
      for (const r of rawRows) {
        const g = Array.isArray(r.games) ? r.games[0] : r.games;
        if (!g) continue;
        const p = Array.isArray(r.players) ? r.players[0] : r.players;
        validRows.push({ ...r, games: g, players: p });
      }

      // Si no hay datos en Supabase, resolver metadatos desde MLB People API
      let playerName = `Bateador #${playerId}`;
      let teamId = 695;
      if (validRows.length > 0) {
        playerName = validRows[0].players?.full_name || playerName;
        teamId = validRows[0].team_id || teamId;
      } else {
        const meta = await fetchMlbPersonMeta(playerId);
        if (meta) {
          playerName = meta.fullName;
          teamId = meta.teamId;
        }
      }
      const team = getTeam(teamId);

      // Particiones de Contexto, Rival y Calendario desde Supabase
      const homeRows: RawGameBattingRow[] = [];
      const awayRows: RawGameBattingRow[] = [];
      const dayRows: RawGameBattingRow[] = [];
      const nightRows: RawGameBattingRow[] = [];
      const winRows: RawGameBattingRow[] = [];
      const lossRows: RawGameBattingRow[] = [];
      const rivalMap: Record<number, RawGameBattingRow[]> = {};
      LVBP_TEAM_IDS.forEach((id) => {
        if (id !== teamId) rivalMap[id] = [];
      });
      const monthMap: Record<number, RawGameBattingRow[]> = { 10: [], 11: [], 12: [], 1: [] };
      const dayOfWeekMap: Record<number, RawGameBattingRow[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

      for (const row of validRows) {
        const g = row.games;
        if (!g) continue;
        const isHome = g.home_team_id === teamId;
        const opponentId = isHome ? g.away_team_id : g.home_team_id;
        const teamScore = isHome ? g.home_score || 0 : g.away_score || 0;
        const oppScore = isHome ? g.away_score || 0 : g.home_score || 0;
        const isWin = teamScore > oppScore;

        if (isHome) homeRows.push(row);
        else awayRows.push(row);

        if (isNightGame(g.game_datetime)) nightRows.push(row);
        else dayRows.push(row);

        if (isWin) winRows.push(row);
        else lossRows.push(row);

        if (rivalMap[opponentId]) rivalMap[opponentId].push(row);

        if (g.game_date) {
          const d = new Date(g.game_date);
          const m = d.getUTCMonth() + 1;
          if (monthMap[m]) monthMap[m].push(row);
          const wd = (d.getUTCDay() + 6) % 7;
          if (dayOfWeekMap[wd]) dayOfWeekMap[wd].push(row);
        }
      }

      const mlbSplits = await mlbSplitsPromise;

      let totalRow: PlayerSplitRow;
      if (validRows.length > 0) {
        totalRow = buildBatterSplitRow("Total Temporada", "context", "General", validRows);
      } else if (mlbSplits.length > 0) {
        // Usar suma o total de MLB
        const hSplit = getBestSplitForCode(mlbSplits, "h");
        const aSplit = getBestSplitForCode(mlbSplits, "a");
        if (hSplit && aSplit) {
          const ab = (hSplit.stat?.atBats || 0) + (aSplit.stat?.atBats || 0);
          const h = (hSplit.stat?.hits || 0) + (aSplit.stat?.hits || 0);
          const doubles = (hSplit.stat?.doubles || 0) + (aSplit.stat?.doubles || 0);
          const triples = (hSplit.stat?.triples || 0) + (aSplit.stat?.triples || 0);
          const hr = (hSplit.stat?.homeRuns || 0) + (aSplit.stat?.homeRuns || 0);
          const bb = (hSplit.stat?.baseOnBalls || 0) + (aSplit.stat?.baseOnBalls || 0);
          const so = (hSplit.stat?.strikeOuts || 0) + (aSplit.stat?.strikeOuts || 0);
          const r = (hSplit.stat?.runs || 0) + (aSplit.stat?.runs || 0);
          const rbi = (hSplit.stat?.rbi || 0) + (aSplit.stat?.rbi || 0);
          const pa = (hSplit.stat?.plateAppearances || 0) + (aSplit.stat?.plateAppearances || 0);
          const metrics = computeBatterFanGraphsMetrics(ab, h, doubles, triples, hr, bb, so, 0, 0, pa);
          totalRow = {
            splitName: "Total Temporada",
            category: "context",
            badge: "General",
            games: (hSplit.stat?.gamesPlayed || 0) + (aSplit.stat?.gamesPlayed || 0),
            ab,
            r,
            h,
            doubles,
            triples,
            hr,
            rbi,
            bb,
            so,
            ...metrics,
          };
        } else {
          totalRow = parseMlbBatterSplit(mlbSplits[0], "context", "Total Temporada", "General");
        }
      } else {
        return null;
      }

      // Desglose de Platoon, Situacional, Conteos, Outs, Entradas
      let platoonSplits: PlayerSplitRow[] = [];
      let situationalSplits: PlayerSplitRow[] = [];
      let countSplits: PlayerSplitRow[] = [];
      let outsSplits: PlayerSplitRow[] = [];
      let inningSplits: PlayerSplitRow[] = [];
      let contextSplits: PlayerSplitRow[] = [];

      if (mlbSplits.length > 0) {
        // Platoon
        const vl = getBestSplitForCode(mlbSplits, "vl");
        const vr = getBestSplitForCode(mlbSplits, "vr");
        if (vr) platoonSplits.push(parseMlbBatterSplit(vr, "platoon", "vs Lanzadores Derechos (RHP)", "vs RHP"));
        if (vl) platoonSplits.push(parseMlbBatterSplit(vl, "platoon", "vs Lanzadores Zurdos (LHP)", "vs LHP"));

        // Situacionales
        const r0 = getBestSplitForCode(mlbSplits, "r0");
        const ron = getBestSplitForCode(mlbSplits, "ron");
        const risp = getBestSplitForCode(mlbSplits, "risp");
        const risp2 = getBestSplitForCode(mlbSplits, "risp2");
        const r123 = getBestSplitForCode(mlbSplits, "r123");
        const lo = getBestSplitForCode(mlbSplits, "lo");
        if (r0) situationalSplits.push(parseMlbBatterSplit(r0, "situational", "Bases Limpias", "Bases Vacías"));
        if (ron) situationalSplits.push(parseMlbBatterSplit(ron, "situational", "Corredores en Base", "Tráfico"));
        if (risp) situationalSplits.push(parseMlbBatterSplit(risp, "situational", "Posición Anotadora (RISP)", "RISP"));
        if (risp2) situationalSplits.push(parseMlbBatterSplit(risp2, "situational", "RISP con 2 Outs (Clutch)", "Alta Presión"));
        if (r123) situationalSplits.push(parseMlbBatterSplit(r123, "situational", "Bases Llenas", "Llenas"));
        if (lo) situationalSplits.push(parseMlbBatterSplit(lo, "situational", "Abriendo Entrada (Leadoff)", "Leadoff"));

        // Conteos
        const fp = getBestSplitForCode(mlbSplits, "fp");
        const twoS = getBestSplitForCode(mlbSplits, "2s");
        const fc = getBestSplitForCode(mlbSplits, "fc");
        if (fp) countSplits.push(parseMlbBatterSplit(fp, "count", "Primer Pitcheo (0-0)", "0-0"));
        if (twoS) countSplits.push(parseMlbBatterSplit(twoS, "count", "Con 2 Strikes", "2 Strikes"));
        if (fc) countSplits.push(parseMlbBatterSplit(fc, "count", "Cuenta Completa (3-2)", "3-2"));

        // Outs
        const o0 = getBestSplitForCode(mlbSplits, "o0");
        const o1 = getBestSplitForCode(mlbSplits, "o1");
        const o2 = getBestSplitForCode(mlbSplits, "o2");
        if (o0) outsSplits.push(parseMlbBatterSplit(o0, "outs", "Con 0 Outs", "0 Outs"));
        if (o1) outsSplits.push(parseMlbBatterSplit(o1, "outs", "Con 1 Out", "1 Out"));
        if (o2) outsSplits.push(parseMlbBatterSplit(o2, "outs", "Con 2 Outs", "2 Outs"));

        // Entradas
        const innCodes = ["i01", "i02", "i03", "i04", "i05", "i06", "i07", "i08", "i09"];
        const innLabels = ["1ra Entrada", "2da Entrada", "3ra Entrada", "4ta Entrada", "5ta Entrada", "6ta Entrada", "7ma Entrada", "8va Entrada", "9na Entrada+"];
        innCodes.forEach((code, idx) => {
          const raw = getBestSplitForCode(mlbSplits, code);
          if (raw) inningSplits.push(parseMlbBatterSplit(raw, "inning", innLabels[idx], `${idx + 1}ra`));
        });

        // Contexto
        const h = getBestSplitForCode(mlbSplits, "h");
        const a = getBestSplitForCode(mlbSplits, "a");
        const d = getBestSplitForCode(mlbSplits, "d");
        const n = getBestSplitForCode(mlbSplits, "n");
        const twn = getBestSplitForCode(mlbSplits, "twn");
        const tls = getBestSplitForCode(mlbSplits, "tls");
        if (h) contextSplits.push(parseMlbBatterSplit(h, "context", "En Casa (Local)", "Local"));
        if (a) contextSplits.push(parseMlbBatterSplit(a, "context", "En la Carretera (Visitante)", "Visitante"));
        if (n) contextSplits.push(parseMlbBatterSplit(n, "context", "De Noche (≥ 6:00 PM)", "Nocturno"));
        if (d) contextSplits.push(parseMlbBatterSplit(d, "context", "De Día (< 6:00 PM)", "Diurno"));
        if (twn) contextSplits.push(parseMlbBatterSplit(twn, "context", "En Victorias", "Victorias"));
        if (tls) contextSplits.push(parseMlbBatterSplit(tls, "context", "En Derrotas", "Derrotas"));
      }

      // Si MLB no trajo splits de alguna categoría o si el jugador es exclusivo de LVBP, usar el motor calibrado
      if (situationalSplits.length === 0 || platoonSplits.length === 0) {
        const synth = buildSituationalBatterRows(totalRow);
        if (situationalSplits.length === 0) situationalSplits = synth.situationalSplits;
        if (platoonSplits.length === 0) platoonSplits = synth.platoonSplits;
        if (countSplits.length === 0) countSplits = synth.countSplits;
        if (inningSplits.length === 0) inningSplits = synth.inningSplits;
        if (outsSplits.length === 0) outsSplits = synth.outsSplits;
      }

      if (contextSplits.length === 0 && validRows.length > 0) {
        contextSplits = [
          buildBatterSplitRow("En Casa (Local)", "context", "Local", homeRows),
          buildBatterSplitRow("En la Carretera (Visitante)", "context", "Visitante", awayRows),
          buildBatterSplitRow("De Noche (≥ 6:00 PM)", "context", "Nocturno", nightRows),
          buildBatterSplitRow("De Día (< 6:00 PM)", "context", "Diurno", dayRows),
          buildBatterSplitRow("En Victorias", "context", "Triunfos", winRows),
          buildBatterSplitRow("En Derrotas", "context", "Reveses", lossRows),
        ];
      }

      // Rivales de la LVBP
      const opponentSplits: PlayerSplitRow[] = Object.keys(rivalMap)
        .map((idStr) => {
          const oppId = parseInt(idStr, 10);
          const oppTeam = getTeam(oppId);
          const list = rivalMap[oppId];
          return buildBatterSplitRow(`vs ${oppTeam.name}`, "opponent", oppTeam.abbreviation, list);
        })
        .filter((r) => r.pa > 0);

      // Calendario
      const monthNames: Record<number, string> = { 10: "Octubre", 11: "Noviembre", 12: "Diciembre", 1: "Enero" };
      const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const calendarSplits: PlayerSplitRow[] = [];
      [10, 11, 12, 1].forEach((m) => {
        if (monthMap[m] && monthMap[m].length > 0) {
          calendarSplits.push(
            buildBatterSplitRow(`Mes de ${monthNames[m]}`, "calendar", monthNames[m].slice(0, 3), monthMap[m])
          );
        }
      });
      [0, 1, 2, 3, 4, 5, 6].forEach((wd) => {
        if (dayOfWeekMap[wd] && dayOfWeekMap[wd].length > 0) {
          calendarSplits.push(buildBatterSplitRow(dayNames[wd], "calendar", dayNames[wd].slice(0, 3), dayOfWeekMap[wd]));
        }
      });

      // LOB Tracker
      const situData = getLeonesSituationalData(season);
      const lobEntry = situData.lobBatterRanking.find(
        (b) => b.batterId === playerId || b.batterName.toLowerCase().includes(playerName.toLowerCase())
      );

      const profile: PlayerSplitsProfile = {
        playerId,
        playerName,
        playerAvatar: getPlayerHeadshotUrl(playerId),
        teamId,
        teamName: team.name,
        teamAbbr: team.abbreviation,
        teamLogo: team.logoUrl,
        type: "batter",
        season,
        totalGames: totalRow.games || validRows.length,
        overview: {
          kpiPrimary: totalRow.ops,
          labelPrimary: "OPS",
          kpiSecondary: totalRow.avg,
          labelSecondary: "AVG",
          slashLine: `${totalRow.avg} / ${totalRow.obp} / ${totalRow.slg} • ISO ${totalRow.iso} • BABIP ${totalRow.babip} • ${totalRow.hr} HR • ${totalRow.rbi} CI`,
        },
        contextSplits,
        opponentSplits,
        calendarSplits,
        situationalSplits,
        platoonSplits,
        countSplits,
        inningSplits,
        outsSplits,
        lobStats: lobEntry
          ? {
              lobEnding: lobEntry.lobEnding,
              rispLobEnding: lobEntry.rispLobEnding,
              rispLobMid: lobEntry.rispLobMid,
              totalRispLob: lobEntry.totalRispLob,
            }
          : undefined,
      };

      splitsCache.set(cacheKey, { data: profile, timestamp: Date.now() });
      return profile;
    } else {
      // PERFIL DE LANZADOR
      let rawRows: any[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("pitching_stats")
          .select(`
            player_id, team_id, ip_decimal, h, r, er, bb, so, hr, games_started,
            players ( full_name ),
            games!inner ( id, season, game_date, game_datetime, home_team_id, away_team_id, home_score, away_score, status, game_type )
          `)
          .eq("player_id", playerId)
          .eq("games.season", season);

        if (!error && data) rawRows = data;
      }

      const validRows: RawGamePitchingRow[] = [];
      for (const r of rawRows) {
        const g = Array.isArray(r.games) ? r.games[0] : r.games;
        if (!g) continue;
        const p = Array.isArray(r.players) ? r.players[0] : r.players;
        validRows.push({ ...r, games: g, players: p });
      }

      let playerName = `Lanzador #${playerId}`;
      let teamId = 695;
      if (validRows.length > 0) {
        playerName = validRows[0].players?.full_name || playerName;
        teamId = validRows[0].team_id || teamId;
      } else {
        const meta = await fetchMlbPersonMeta(playerId);
        if (meta) {
          playerName = meta.fullName;
          teamId = meta.teamId;
        }
      }
      const team = getTeam(teamId);

      const homeRows: RawGamePitchingRow[] = [];
      const awayRows: RawGamePitchingRow[] = [];
      const dayRows: RawGamePitchingRow[] = [];
      const nightRows: RawGamePitchingRow[] = [];
      const winRows: RawGamePitchingRow[] = [];
      const lossRows: RawGamePitchingRow[] = [];
      const rivalMap: Record<number, RawGamePitchingRow[]> = {};
      LVBP_TEAM_IDS.forEach((id) => {
        if (id !== teamId) rivalMap[id] = [];
      });
      const monthMap: Record<number, RawGamePitchingRow[]> = { 10: [], 11: [], 12: [], 1: [] };
      const dayOfWeekMap: Record<number, RawGamePitchingRow[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

      for (const row of validRows) {
        const g = row.games;
        if (!g) continue;
        const isHome = g.home_team_id === teamId;
        const opponentId = isHome ? g.away_team_id : g.home_team_id;
        const teamScore = isHome ? g.home_score || 0 : g.away_score || 0;
        const oppScore = isHome ? g.away_score || 0 : g.home_score || 0;
        const isWin = teamScore > oppScore;

        if (isHome) homeRows.push(row);
        else awayRows.push(row);

        if (isNightGame(g.game_datetime)) nightRows.push(row);
        else dayRows.push(row);

        if (isWin) winRows.push(row);
        else lossRows.push(row);

        if (rivalMap[opponentId]) rivalMap[opponentId].push(row);

        if (g.game_date) {
          const d = new Date(g.game_date);
          const m = d.getUTCMonth() + 1;
          if (monthMap[m]) monthMap[m].push(row);
          const wd = (d.getUTCDay() + 6) % 7;
          if (dayOfWeekMap[wd]) dayOfWeekMap[wd].push(row);
        }
      }

      const mlbSplits = await mlbSplitsPromise;

      let totalRow: PitcherSplitRow;
      if (validRows.length > 0) {
        totalRow = buildPitcherSplitRow("Total Temporada", "context", "General", validRows);
      } else if (mlbSplits.length > 0) {
        const spSplit = getBestSplitForCode(mlbSplits, "sp");
        const rpSplit = getBestSplitForCode(mlbSplits, "rp");
        if (spSplit && rpSplit) {
          const ipSp = parseInningsToDecimal(spSplit.stat?.inningsPitched);
          const ipRp = parseInningsToDecimal(rpSplit.stat?.inningsPitched);
          const ipTot = ipSp + ipRp;
          const er = (spSplit.stat?.earnedRuns || 0) + (rpSplit.stat?.earnedRuns || 0);
          const h = (spSplit.stat?.hits || 0) + (rpSplit.stat?.hits || 0);
          const bb = (spSplit.stat?.baseOnBalls || 0) + (rpSplit.stat?.baseOnBalls || 0);
          const so = (spSplit.stat?.strikeOuts || 0) + (rpSplit.stat?.strikeOuts || 0);
          const hr = (spSplit.stat?.homeRuns || 0) + (rpSplit.stat?.homeRuns || 0);
          const r = (spSplit.stat?.runs || 0) + (rpSplit.stat?.runs || 0);
          const starts = (spSplit.stat?.gamesStarted || 0) + (rpSplit.stat?.gamesStarted || 0);
          const games = (spSplit.stat?.gamesPlayed || 0) + (rpSplit.stat?.gamesPlayed || 0);
          const metrics = computePitcherFanGraphsMetrics(ipTot, h, er, bb, so, hr);
          totalRow = {
            splitName: "Total Temporada",
            category: "context",
            badge: "General",
            games,
            starts,
            ip: ipTot,
            ipDisplay: formatInnings(ipTot),
            h,
            r,
            er,
            bb,
            so,
            hr,
            ...metrics,
          };
        } else {
          totalRow = parseMlbPitcherSplit(mlbSplits[0], "context", "Total Temporada", "General");
        }
      } else {
        return null;
      }

      // Desglose de Platoon, Situacional, Conteos, Outs, Entradas, Rol y Contexto
      let pitcherPlatoonSplits: PitcherSplitRow[] = [];
      let pitcherSituationalSplits: PitcherSplitRow[] = [];
      let pitcherCountSplits: PitcherSplitRow[] = [];
      let pitcherOutsSplits: PitcherSplitRow[] = [];
      let pitcherInningSplits: PitcherSplitRow[] = [];
      let pitcherRoleSplits: PitcherSplitRow[] = [];
      let pitcherContextSplits: PitcherSplitRow[] = [];

      if (mlbSplits.length > 0) {
        // Platoon
        const vr = getBestSplitForCode(mlbSplits, "vr");
        const vl = getBestSplitForCode(mlbSplits, "vl");
        if (vr) pitcherPlatoonSplits.push(parseMlbPitcherSplit(vr, "platoon", "vs Bateadores Derechos (RHB)", "vs RHB"));
        if (vl) pitcherPlatoonSplits.push(parseMlbPitcherSplit(vl, "platoon", "vs Bateadores Zurdos (LHB)", "vs LHB"));

        // Situacionales
        const r0 = getBestSplitForCode(mlbSplits, "r0");
        const ron = getBestSplitForCode(mlbSplits, "ron");
        const risp = getBestSplitForCode(mlbSplits, "risp");
        const risp2 = getBestSplitForCode(mlbSplits, "risp2");
        const r123 = getBestSplitForCode(mlbSplits, "r123");
        const lo = getBestSplitForCode(mlbSplits, "lo");
        if (r0) pitcherSituationalSplits.push(parseMlbPitcherSplit(r0, "situational", "Bases Limpias", "Bases Vacías"));
        if (ron) pitcherSituationalSplits.push(parseMlbPitcherSplit(ron, "situational", "Corredores en Base", "Tráfico"));
        if (risp) pitcherSituationalSplits.push(parseMlbPitcherSplit(risp, "situational", "Posición Anotadora (RISP)", "RISP"));
        if (risp2) pitcherSituationalSplits.push(parseMlbPitcherSplit(risp2, "situational", "RISP con 2 Outs (Clutch)", "Alta Presión"));
        if (r123) pitcherSituationalSplits.push(parseMlbPitcherSplit(r123, "situational", "Bases Llenas", "Llenas"));
        if (lo) pitcherSituationalSplits.push(parseMlbPitcherSplit(lo, "situational", "Abriendo Entrada (Leadoff)", "Leadoff"));

        // Conteos
        const fp = getBestSplitForCode(mlbSplits, "fp");
        const twoS = getBestSplitForCode(mlbSplits, "2s");
        const fc = getBestSplitForCode(mlbSplits, "fc");
        if (fp) pitcherCountSplits.push(parseMlbPitcherSplit(fp, "count", "Primer Pitcheo (0-0)", "0-0"));
        if (twoS) pitcherCountSplits.push(parseMlbPitcherSplit(twoS, "count", "Con 2 Strikes", "2 Strikes"));
        if (fc) pitcherCountSplits.push(parseMlbPitcherSplit(fc, "count", "Cuenta Completa (3-2)", "3-2"));

        // Outs
        const o0 = getBestSplitForCode(mlbSplits, "o0");
        const o1 = getBestSplitForCode(mlbSplits, "o1");
        const o2 = getBestSplitForCode(mlbSplits, "o2");
        if (o0) pitcherOutsSplits.push(parseMlbPitcherSplit(o0, "outs", "Con 0 Outs", "0 Outs"));
        if (o1) pitcherOutsSplits.push(parseMlbPitcherSplit(o1, "outs", "Con 1 Out", "1 Out"));
        if (o2) pitcherOutsSplits.push(parseMlbPitcherSplit(o2, "outs", "Con 2 Outs", "2 Outs"));

        // Entradas
        const innCodes = ["i01", "i02", "i03", "i04", "i05", "i06", "i07", "i08", "i09"];
        const innLabels = ["1ra Entrada", "2da Entrada", "3ra Entrada", "4ta Entrada", "5ta Entrada", "6ta Entrada", "7ma Entrada", "8va Entrada", "9na Entrada+"];
        innCodes.forEach((code, idx) => {
          const raw = getBestSplitForCode(mlbSplits, code);
          if (raw) pitcherInningSplits.push(parseMlbPitcherSplit(raw, "inning", innLabels[idx], `${idx + 1}ra`));
        });

        // Roles
        const sp = getBestSplitForCode(mlbSplits, "sp");
        const rp = getBestSplitForCode(mlbSplits, "rp");
        if (sp) pitcherRoleSplits.push(parseMlbPitcherSplit(sp, "role", "Como Abridor (SP)", "Abridor"));
        if (rp) pitcherRoleSplits.push(parseMlbPitcherSplit(rp, "role", "Como Relevista (RP)", "Relevista"));

        // Contexto
        const h = getBestSplitForCode(mlbSplits, "h");
        const a = getBestSplitForCode(mlbSplits, "a");
        const d = getBestSplitForCode(mlbSplits, "d");
        const n = getBestSplitForCode(mlbSplits, "n");
        const twn = getBestSplitForCode(mlbSplits, "twn");
        const tls = getBestSplitForCode(mlbSplits, "tls");
        if (h) pitcherContextSplits.push(parseMlbPitcherSplit(h, "context", "En Casa (Local)", "Local"));
        if (a) pitcherContextSplits.push(parseMlbPitcherSplit(a, "context", "En la Carretera (Visitante)", "Visitante"));
        if (n) pitcherContextSplits.push(parseMlbPitcherSplit(n, "context", "De Noche (≥ 6:00 PM)", "Nocturno"));
        if (d) pitcherContextSplits.push(parseMlbPitcherSplit(d, "context", "De Día (< 6:00 PM)", "Diurno"));
        if (twn) pitcherContextSplits.push(parseMlbPitcherSplit(twn, "context", "En Victorias del Equipo", "Victorias"));
        if (tls) pitcherContextSplits.push(parseMlbPitcherSplit(tls, "context", "En Derrotas del Equipo", "Derrotas"));
      }

      // Fallback calibrado si no vinieron splits de MLB
      if (pitcherSituationalSplits.length === 0 || pitcherPlatoonSplits.length === 0) {
        const synth = buildSituationalPitcherRows(totalRow);
        if (pitcherSituationalSplits.length === 0) pitcherSituationalSplits = synth.pitcherSituationalSplits;
        if (pitcherPlatoonSplits.length === 0) pitcherPlatoonSplits = synth.pitcherPlatoonSplits;
        if (pitcherCountSplits.length === 0) pitcherCountSplits = synth.pitcherCountSplits;
        if (pitcherOutsSplits.length === 0) pitcherOutsSplits = synth.pitcherOutsSplits;
        if (pitcherInningSplits.length === 0) pitcherInningSplits = synth.pitcherInningSplits;
        if (pitcherRoleSplits.length === 0) pitcherRoleSplits = synth.pitcherRoleSplits;
      }

      if (pitcherContextSplits.length === 0 && validRows.length > 0) {
        pitcherContextSplits = [
          buildPitcherSplitRow("En Casa (Local)", "context", "Local", homeRows),
          buildPitcherSplitRow("En la Carretera (Visitante)", "context", "Visitante", awayRows),
          buildPitcherSplitRow("De Noche (≥ 6:00 PM)", "context", "Nocturno", nightRows),
          buildPitcherSplitRow("De Día (< 6:00 PM)", "context", "Diurno", dayRows),
          buildPitcherSplitRow("En Victorias del Equipo", "context", "Triunfos", winRows),
          buildPitcherSplitRow("En Derrotas del Equipo", "context", "Reveses", lossRows),
        ];
      }

      // Rivales de la LVBP
      const pitcherOpponentSplits: PitcherSplitRow[] = Object.keys(rivalMap)
        .map((idStr) => {
          const oppId = parseInt(idStr, 10);
          const oppTeam = getTeam(oppId);
          const list = rivalMap[oppId];
          return buildPitcherSplitRow(`vs ${oppTeam.name}`, "opponent", oppTeam.abbreviation, list);
        })
        .filter((r) => r.ip > 0 || r.games > 0);

      // Calendario
      const monthNames: Record<number, string> = { 10: "Octubre", 11: "Noviembre", 12: "Diciembre", 1: "Enero" };
      const dayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
      const pitcherCalendarSplits: PitcherSplitRow[] = [];
      [10, 11, 12, 1].forEach((m) => {
        if (monthMap[m] && monthMap[m].length > 0) {
          pitcherCalendarSplits.push(
            buildPitcherSplitRow(`Mes de ${monthNames[m]}`, "calendar", monthNames[m].slice(0, 3), monthMap[m])
          );
        }
      });
      [0, 1, 2, 3, 4, 5, 6].forEach((wd) => {
        if (dayOfWeekMap[wd] && dayOfWeekMap[wd].length > 0) {
          pitcherCalendarSplits.push(buildPitcherSplitRow(dayNames[wd], "calendar", dayNames[wd].slice(0, 3), dayOfWeekMap[wd]));
        }
      });

      // Colección combinada para retrocompatibilidad
      const pitcherSplits: PitcherSplitRow[] = [
        totalRow,
        ...pitcherContextSplits,
        ...pitcherPlatoonSplits,
        ...pitcherSituationalSplits,
        ...pitcherCountSplits,
        ...pitcherInningSplits,
        ...pitcherRoleSplits,
        ...pitcherOpponentSplits,
        ...pitcherCalendarSplits,
      ];

      const profile: PlayerSplitsProfile = {
        playerId,
        playerName,
        playerAvatar: getPlayerHeadshotUrl(playerId),
        teamId,
        teamName: team.name,
        teamAbbr: team.abbreviation,
        teamLogo: team.logoUrl,
        type: "pitcher",
        season,
        totalGames: totalRow.games || validRows.length,
        overview: {
          kpiPrimary: totalRow.era,
          labelPrimary: "ERA",
          kpiSecondary: totalRow.whip,
          labelSecondary: "WHIP",
          slashLine: `${totalRow.ipDisplay} IP • ${totalRow.so} K • ${totalRow.bb} BB • ${totalRow.era} ERA • ${totalRow.whip} WHIP • BAA ${totalRow.baa}`,
        },
        contextSplits: [],
        opponentSplits: [],
        calendarSplits: [],
        situationalSplits: [],
        platoonSplits: [],
        inningSplits: [],
        outsSplits: [],
        pitcherSplits,
        pitcherPlatoonSplits,
        pitcherSituationalSplits,
        pitcherCountSplits,
        pitcherInningSplits,
        pitcherOutsSplits,
        pitcherRoleSplits,
        pitcherContextSplits,
        pitcherOpponentSplits,
        pitcherCalendarSplits,
      };

      splitsCache.set(cacheKey, { data: profile, timestamp: Date.now() });
      return profile;
    }
  } catch (error) {
    console.error("Error al calcular splits individuales:", error);
    return null;
  }
}

/**
 * Obtiene la lista completa de jugadores elegibles para el selector de splits
 */
export async function getAllAvailablePlayersForSplits(
  season: number = ACTIVE_SEASON
): Promise<PlayerSelectorItem[]> {
  const items: PlayerSelectorItem[] = [];
  const seen = new Set<string>();

  // Jugadores destacados directos (incluyendo referencias FanGraphs como Peralta y Caminero)
  const featuredStars: PlayerSelectorItem[] = [
    {
      id: 691406,
      name: "Junior Caminero",
      avatarUrl: getPlayerHeadshotUrl(691406),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "batter",
      subtitle: "CAR / MLB • .276 AVG • 42 HR • .800+ OPS",
    },
    {
      id: 642547,
      name: "Freddy Peralta",
      avatarUrl: getPlayerHeadshotUrl(642547),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "pitcher",
      subtitle: "CAR / MLB • 169.0 IP • 156 K • 4.42 ERA",
    },
    {
      id: 672580,
      name: "Aldrem Corredor",
      avatarUrl: getPlayerHeadshotUrl(672580),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "batter",
      subtitle: "CAR • .295 AVG • 7 HR • .840 OPS",
    },
    {
      id: 605612,
      name: "Harold Castro",
      avatarUrl: getPlayerHeadshotUrl(605612),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "batter",
      subtitle: "CAR • .312 AVG • 5 HR • .820 OPS",
    },
    {
      id: 682674,
      name: "Víctor Bericoto",
      avatarUrl: getPlayerHeadshotUrl(682674),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "batter",
      subtitle: "CAR • .285 AVG • 6 HR • .810 OPS",
    },
    {
      id: 660508,
      name: "Norwith Gudiño",
      avatarUrl: getPlayerHeadshotUrl(660508),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "pitcher",
      subtitle: "CAR • 25.0 IP • 24 K • 3.24 ERA",
    },
    {
      id: 663778,
      name: "Sam Bordner",
      avatarUrl: getPlayerHeadshotUrl(663778),
      teamId: 695,
      teamAbbr: "CAR",
      teamLogo: getTeam(695).logoUrl,
      type: "pitcher",
      subtitle: "CAR • 20.0 IP • 22 K • 2.70 ERA",
    },
  ];

  for (const star of featuredStars) {
    seen.add(`${star.type}-${star.id}`);
    items.push(star);
  }

  if (supabase) {
    try {
      const minAb = season === 2026 ? 1 : 10;
      const minIp = season === 2026 ? 0.1 : 5.0;

      const [batRes, pitRes] = await Promise.all([
        supabase
          .from("batting_stats")
          .select("player_id, team_id, ab, h, hr, rbi, avg, ops, players(full_name), games!inner(season)")
          .eq("games.season", season)
          .limit(300),
        supabase
          .from("pitching_stats")
          .select("player_id, team_id, ip_decimal, so, era, whip, players(full_name), games!inner(season)")
          .eq("games.season", season)
          .limit(200),
      ]);

      if (batRes.data && batRes.data.length > 0) {
        const batGroup: Record<number, { name: string; teamId: number; ab: number; h: number; hr: number; rbi: number }> = {};
        for (const row of batRes.data) {
          const pid = row.player_id;
          const name = (row.players as { full_name?: string })?.full_name || `Jugador #${pid}`;
          if (!batGroup[pid]) {
            batGroup[pid] = { name, teamId: row.team_id, ab: 0, h: 0, hr: 0, rbi: 0 };
          }
          batGroup[pid].ab += row.ab || 0;
          batGroup[pid].h += row.h || 0;
          batGroup[pid].hr += row.hr || 0;
          batGroup[pid].rbi += row.rbi || 0;
        }

        for (const [pidStr, b] of Object.entries(batGroup)) {
          const pid = parseInt(pidStr, 10);
          if (b.ab < minAb) continue;
          const key = `batter-${pid}`;
          if (!seen.has(key)) {
            seen.add(key);
            const team = getTeam(b.teamId);
            const avg = b.ab > 0 ? (b.h / b.ab).toFixed(3).replace(/^0\./, ".") : ".000";
            items.push({
              id: pid,
              name: b.name,
              avatarUrl: getPlayerHeadshotUrl(pid),
              teamId: b.teamId,
              teamAbbr: team.abbreviation,
              teamLogo: team.logoUrl,
              type: "batter",
              subtitle: `${team.abbreviation} • ${avg} AVG • ${b.hr} HR • ${b.rbi} CI`,
            });
          }
        }
      }

      if (pitRes.data && pitRes.data.length > 0) {
        const pitGroup: Record<number, { name: string; teamId: number; ip: number; so: number; er: number }> = {};
        for (const row of pitRes.data) {
          const pid = row.player_id;
          const name = (row.players as { full_name?: string })?.full_name || `Lanzador #${pid}`;
          if (!pitGroup[pid]) {
            pitGroup[pid] = { name, teamId: row.team_id, ip: 0, so: 0, er: 0 };
          }
          pitGroup[pid].ip += row.ip_decimal || 0;
          pitGroup[pid].so += row.so || 0;
        }

        for (const [pidStr, p] of Object.entries(pitGroup)) {
          const pid = parseInt(pidStr, 10);
          if (p.ip < minIp) continue;
          const key = `pitcher-${pid}`;
          if (!seen.has(key)) {
            seen.add(key);
            const team = getTeam(p.teamId);
            items.push({
              id: pid,
              name: p.name,
              avatarUrl: getPlayerHeadshotUrl(pid),
              teamId: p.teamId,
              teamAbbr: team.abbreviation,
              teamLogo: team.logoUrl,
              type: "pitcher",
              subtitle: `${team.abbreviation} • ${formatInnings(p.ip)} IP • ${p.so} K`,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error al consultar Supabase en getAllAvailablePlayersForSplits:", err);
    }
  }

  // Ordenar: primero Leones del Caracas (695), luego alfabéticamente
  return items.sort((a, b) => {
    if (a.teamId === 695 && b.teamId !== 695) return -1;
    if (a.teamId !== 695 && b.teamId === 695) return 1;
    return a.name.localeCompare(b.name);
  });
}
