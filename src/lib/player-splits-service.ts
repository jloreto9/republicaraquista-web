import {
  supabase,
  hasBatterAppearance,
  hasPitcherAppearance,
  isPlayedGameStatus,
  getBattingStats,
  getPitchingStats,
  getFieldingStats,
} from "./supabase";
import { ACTIVE_SEASON, LVBP_TEAM_IDS, getTeam, getPlayerHeadshotUrl } from "./constants";
import { isDayGame, getVenezuelanDate } from "./utils";
import {
  PlayerSplitRow,
  PitcherSplitRow,
  PlayerSplitsProfile,
  PlayerSelectorItem,
  SplitCategory,
  PlayerBatterGameLog,
  PlayerPitcherGameLog,
  PlayerGeneralProfile,
} from "@/types/player-splits";
import { BattingStats, PitchingStats, FieldingStats } from "@/types/sports";
import { getLeonesSituationalData } from "./situational-engine";
import { getDynamicSituationalData } from "./game-feed-service";

export interface RawGameBattingRow {
  game_id?: number | null;
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
  game_id?: number | null;
  player_id: number;
  team_id: number;
  ip_decimal: number | null;
  h: number | null;
  r: number | null;
  er: number | null;
  bb: number | null;
  hbp?: number | null;
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

// Cache en memoria con TTL de 10 minutos para perfiles reales verificados
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const splitsCache = new Map<string, CacheEntry<PlayerSplitsProfile>>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function clearPlayerSplitsCache(): void {
  splitsCache.clear();
}

export function formatRate(val: number): string {
  if (isNaN(val) || !isFinite(val)) return ".000";
  if (val >= 1.0) return val.toFixed(3);
  return val.toFixed(3).replace(/^0\./, ".");
}

export function formatEraWhip(val: number): string {
  if (isNaN(val) || !isFinite(val)) return "0.00";
  return val.toFixed(2);
}

export function decimalInningsToOuts(val: number): number {
  if (!val || val <= 0) return 0;
  const whole = Math.floor(val + 1e-6);
  const frac = val - whole;
  let outs = 0;
  if (frac >= 0.55) outs = 2;
  else if (frac >= 0.25) outs = 1;
  else if (Math.abs(frac - 0.2) < 0.04) outs = 2;
  else if (Math.abs(frac - 0.1) < 0.04) outs = 1;
  return whole * 3 + outs;
}

export function parseInningsStringToOuts(ipVal?: string | number | null): number {
  if (ipVal === undefined || ipVal === null || ipVal === "") return 0;
  if (typeof ipVal === "number") return decimalInningsToOuts(ipVal);
  const parts = String(ipVal).trim().split(".");
  const whole = parseInt(parts[0], 10) || 0;
  const fracStr = parts[1] || "0";
  if (fracStr.length === 1) {
    const outs = parseInt(fracStr, 10) || 0;
    return whole * 3 + Math.min(2, Math.max(0, outs));
  }
  return decimalInningsToOuts(parseFloat(String(ipVal)) || 0);
}

export function outsToInningsDisplay(outs: number): string {
  if (!outs || outs <= 0) return "0.0";
  return `${Math.floor(outs / 3)}.${outs % 3}`;
}

export function formatInnings(ipDecimal: number): string {
  return outsToInningsDisplay(decimalInningsToOuts(ipDecimal));
}

export function parseInningsToDecimal(ipVal: string | number): number {
  return parseInningsStringToOuts(ipVal) / 3;
}

/**
 * Determina si un juego se disputó de noche (>= 18:00 VET / UTC-4) o de día (< 18:00 VET).
 */
export function isNightGame(gameDatetime?: string, isDayGameFlag?: boolean): boolean {
  return !isDayGame(gameDatetime, isDayGameFlag);
}

/**
 * Cálculo de tasas ofensivas para bateadores:
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
 * Cálculo de tasas monticulares para lanzadores:
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
 * Agrega únicamente filas con participación real de bateo y deduplica por `game_id`.
 */
export function buildBatterSplitRow(
  splitName: string,
  category: SplitCategory,
  badge: string | undefined,
  rows: RawGameBattingRow[]
): PlayerSplitRow {
  const seenGames = new Set<number>();
  let games = 0;
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
  let sh = 0;
  let sb = 0;

  for (const row of rows) {
    if (!isPlayedGameStatus(row.games?.status)) continue;
    if (!hasBatterAppearance(row)) continue;

    const gid = row.games?.id ?? row.game_id ?? undefined;
    if (gid !== undefined && gid !== null) {
      if (seenGames.has(Number(gid))) continue;
      seenGames.add(Number(gid));
    }

    games += 1;
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
    sh += row.sh || 0;
    sb += row.sb || 0;
  }

  const rawPa = ab + bb + hbp + sf + sh;
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
 * Agrega únicamente filas con participación real de pitcheo y deduplica por `game_id`.
 */
export function buildPitcherSplitRow(
  splitName: string,
  category: SplitCategory,
  badge: string | undefined,
  rows: RawGamePitchingRow[]
): PitcherSplitRow {
  const seenGames = new Set<number>();
  let games = 0;
  let starts = 0;
  let totalOuts = 0;
  let h = 0;
  let r = 0;
  let er = 0;
  let bb = 0;
  let so = 0;
  let hr = 0;

  for (const row of rows) {
    if (!isPlayedGameStatus(row.games?.status)) continue;
    if (!hasPitcherAppearance(row)) continue;

    const gid = row.games?.id ?? row.game_id ?? undefined;
    if (gid !== undefined && gid !== null) {
      if (seenGames.has(Number(gid))) continue;
      seenGames.add(Number(gid));
    }

    games += 1;
    if (row.games_started) starts++;
    totalOuts += decimalInningsToOuts(row.ip_decimal || 0);
    h += row.h || 0;
    r += row.r || 0;
    er += row.er || 0;
    bb += row.bb || 0;
    so += row.so || 0;
    hr += row.hr || 0;
  }

  const ip = totalOuts / 3;
  const metrics = computePitcherFanGraphsMetrics(ip, h, er, bb, so, hr);

  return {
    splitName,
    category,
    badge,
    games,
    starts,
    ip,
    ipDisplay: outsToInningsDisplay(totalOuts),
    h,
    r,
    er,
    bb,
    so,
    hr,
    ...metrics,
    eraAvailable: true,
  };
}

/**
 * Consulta la API oficial de MLB Stats (`statSplits`) filtrando estrictamente
 * Liga Venezolana de Béisbol Profesional (`sportId=17&leagueId=135`) y la temporada exacta solicitada.
 * Jamás mezcla Grandes Ligas (`sportId=1`), otras ligas invernales ni temporadas anteriores.
 */
export async function fetchMlbStatSplits(
  playerId: number,
  group: "hitting" | "pitching",
  season: number
): Promise<any[]> {
  const SIT_CODES =
    "vl,vr,r0,ron,risp,risp2,r123,lo,fp,2s,fc,o0,o1,o2,i01,i02,i03,i04,i05,i06,i07,i08,i09,h,a,d,n,twn,tls,sp,rp,sah,sbh,sti,taw,tal,lc,ac,bc,ec,c00,c01,c02,c10,c11,c12,c20,c21,c22,c30,c31,c32,b1,b2,b3,b4,b5,b6,b7,b8,b9,pD,pH,r1,r2,r3,r12,r13,r23,r3l2,ron2,fip,fba,pi001,pi016,pi031,pi046,pi061,pi076,pi091,pi106,ix,ig07,ig08,ig09";

  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=statSplits&sitCodes=${SIT_CODES}&group=${group}&season=${season}&sportId=17&leagueId=135`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const splits = data.stats?.[0]?.splits;
    if (!Array.isArray(splits) || splits.length === 0) return [];

    return splits.filter((s: any) => {
      if (s.season && String(s.season) !== String(season)) return false;
      if (s.sport?.id && Number(s.sport.id) !== 17) return false;
      if (s.league?.id && Number(s.league.id) !== 135) return false;
      if (s.team?.id && !LVBP_TEAM_IDS.includes(Number(s.team.id))) return false;
      return true;
    });
  } catch {
    return [];
  }
}

/**
 * Combina una lista de entradas crudas de MLB `statSplits` sumando sus conteos exactos
 * (útil cuando un pelotero jugó con más de un club LVBP en el mismo torneo o al sumar Local + Visitante).
 */
function combineMlbRawSplits(entries: any[], group: "hitting" | "pitching"): any | null {
  if (!entries || entries.length === 0) return null;
  if (entries.length === 1) return entries[0];

  if (group === "hitting") {
    let gamesPlayed = 0;
    let hasGames = false;
    let plateAppearances = 0;
    let atBats = 0;
    let runs = 0;
    let hits = 0;
    let doubles = 0;
    let triples = 0;
    let homeRuns = 0;
    let rbi = 0;
    let baseOnBalls = 0;
    let strikeOuts = 0;
    let hitByPitch = 0;
    let sacFlies = 0;
    let stolenBases = 0;

    for (const item of entries) {
      const st = item?.stat || {};
      if (st.gamesPlayed !== undefined && st.gamesPlayed !== null) {
        gamesPlayed += Number(st.gamesPlayed) || 0;
        hasGames = true;
      }
      plateAppearances += Number(st.plateAppearances) || 0;
      atBats += Number(st.atBats) || 0;
      runs += Number(st.runs) || 0;
      hits += Number(st.hits) || 0;
      doubles += Number(st.doubles) || 0;
      triples += Number(st.triples) || 0;
      homeRuns += Number(st.homeRuns) || 0;
      rbi += Number(st.rbi) || 0;
      baseOnBalls += Number(st.baseOnBalls) || 0;
      strikeOuts += Number(st.strikeOuts) || 0;
      hitByPitch += Number(st.hitByPitch) || 0;
      sacFlies += Number(st.sacFlies) || 0;
      stolenBases += Number(st.stolenBases) || 0;
    }

    return {
      ...entries[entries.length - 1],
      stat: {
        gamesPlayed: hasGames ? gamesPlayed : undefined,
        plateAppearances,
        atBats,
        runs,
        hits,
        doubles,
        triples,
        homeRuns,
        rbi,
        baseOnBalls,
        strikeOuts,
        hitByPitch,
        sacFlies,
        stolenBases,
      },
    };
  }

  let gamesPlayed = 0;
  let gamesStarted = 0;
  let totalOuts = 0;
  let hits = 0;
  let runs = 0;
  let earnedRuns = 0;
  let hasEarnedRuns = false;
  let baseOnBalls = 0;
  let strikeOuts = 0;
  let homeRuns = 0;
  let battersFaced = 0;
  let atBats = 0;
  let hitByPitch = 0;
  let sacFlies = 0;
  let doubles = 0;
  let triples = 0;

  for (const item of entries) {
    const st = item?.stat || {};
    gamesPlayed += Number(st.gamesPlayed ?? st.gamesPitched ?? 0) || 0;
    gamesStarted += Number(st.gamesStarted) || 0;
    totalOuts += parseInningsStringToOuts(st.inningsPitched);
    hits += Number(st.hits) || 0;
    runs += Number(st.runs) || 0;
    if (st.earnedRuns !== undefined && st.earnedRuns !== null) {
      earnedRuns += Number(st.earnedRuns) || 0;
      hasEarnedRuns = true;
    } else if (st.era !== undefined && st.era !== null && st.era !== "") {
      const itemIp = parseInningsStringToOuts(st.inningsPitched) / 3;
      const itemEra = parseFloat(String(st.era));
      if (!isNaN(itemEra) && itemIp > 0) {
        earnedRuns += Math.round((itemEra * itemIp) / 9);
        hasEarnedRuns = true;
      }
    }
    baseOnBalls += Number(st.baseOnBalls) || 0;
    strikeOuts += Number(st.strikeOuts) || 0;
    homeRuns += Number(st.homeRuns) || 0;
    battersFaced += Number(st.battersFaced) || 0;
    atBats += Number(st.atBats) || 0;
    hitByPitch += Number(st.hitByPitch) || 0;
    sacFlies += Number(st.sacFlies) || 0;
    doubles += Number(st.doubles) || 0;
    triples += Number(st.triples) || 0;
  }

  const obpDen = atBats + baseOnBalls + hitByPitch + sacFlies;
  const oppObp = obpDen > 0 ? (hits + baseOnBalls + hitByPitch) / obpDen : undefined;
  const singles = Math.max(0, hits - (doubles + triples + homeRuns));
  const tb = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
  const oppSlg = atBats > 0 ? tb / atBats : undefined;
  const oppOps = oppObp !== undefined && oppSlg !== undefined ? oppObp + oppSlg : undefined;

  return {
    ...entries[entries.length - 1],
    stat: {
      gamesPlayed,
      gamesStarted,
      inningsPitched: outsToInningsDisplay(totalOuts),
      hits,
      runs,
      earnedRuns: hasEarnedRuns ? earnedRuns : undefined,
      baseOnBalls,
      strikeOuts,
      homeRuns,
      battersFaced: battersFaced > 0 ? battersFaced : undefined,
      atBats: atBats > 0 ? atBats : undefined,
      obp: oppObp,
      slg: oppSlg,
      ops: oppOps,
    },
  };
}

/**
 * Obtiene la entrada oficial LVBP para un código situacional, combinando clubes LVBP
 * si el pelotero cambió de equipo durante la misma temporada.
 */
function getBestSplitForCode(
  splits: any[],
  code: string,
  group: "hitting" | "pitching"
): any | null {
  const matching = splits.filter((s) => s.split?.code === code);
  if (matching.length === 0) return null;
  const combined = matching.find((s) => !s.team?.id);
  if (combined) return combined;
  return combineMlbRawSplits(matching, group);
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
export function parseMlbPitcherSplit(
  raw: any,
  category: SplitCategory,
  splitName: string,
  badge?: string
): PitcherSplitRow {
  const stat = raw.stat || {};
  const totalOuts = parseInningsStringToOuts(stat.inningsPitched);
  const ip = totalOuts / 3;
  const ipStr = outsToInningsDisplay(totalOuts);
  const h = stat.hits ?? 0;
  const r = stat.runs ?? 0;
  const hasEraField = stat.era !== undefined && stat.era !== null && stat.era !== "";
  const hasErField = stat.earnedRuns !== undefined && stat.earnedRuns !== null;
  const eraAvailable = hasEraField || hasErField;
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

  let finalEra = metrics.era;
  let finalEraNum = metrics.eraNum;
  if (!eraAvailable) {
    finalEra = "--";
    finalEraNum = -1;
  } else if (!hasErField && hasEraField) {
    const parsedEra = parseFloat(String(stat.era));
    if (!isNaN(parsedEra)) {
      finalEra = formatEraWhip(parsedEra);
      finalEraNum = parsedEra;
    }
  }

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
    era: finalEra,
    eraNum: finalEraNum,
    eraAvailable,
  };
}

interface SplitCodeSpec {
  code: string;
  splitName: string;
  badge: string;
  category: SplitCategory;
}

const LATE_CLOSE_SPECS: SplitCodeSpec[] = [
  { code: "lc", splitName: "Últimas Entradas y Cerrado", badge: "Late & Close", category: "situational" },
  { code: "ig07", splitName: "7ma Entrada o Después", badge: "7ma+", category: "inning" },
  { code: "ig08", splitName: "8va Entrada o Después", badge: "8va+", category: "inning" },
  { code: "ig09", splitName: "9na Entrada o Después", badge: "9na+", category: "inning" },
];

const SCORE_SPLIT_SPECS: SplitCodeSpec[] = [
  { code: "sah", splitName: "Equipo Arriba (Ganando)", badge: "Arriba", category: "score" },
  { code: "sbh", splitName: "Equipo Abajo (Perdiendo)", badge: "Abajo", category: "score" },
  { code: "sti", splitName: "Juego Empatado", badge: "Empate", category: "score" },
  { code: "taw", splitName: "Tras Victoria del Equipo", badge: "Post-Victoria", category: "score" },
  { code: "tal", splitName: "Tras Derrota del Equipo", badge: "Post-Derrota", category: "score" },
];

const DETAILED_COUNT_SPECS: SplitCodeSpec[] = [
  { code: "fp", splitName: "Primer Pitcheo (0-0)", badge: "0-0", category: "count" },
  { code: "ac", splitName: "Arriba en la Cuenta", badge: "Arriba", category: "count" },
  { code: "bc", splitName: "Abajo en la Cuenta", badge: "Abajo", category: "count" },
  { code: "ec", splitName: "Cuenta Empatada", badge: "Empate", category: "count" },
  { code: "2s", splitName: "Con 2 Strikes", badge: "2 Strikes", category: "count" },
  { code: "fc", splitName: "Cuenta Completa (3-2)", badge: "3-2", category: "count" },
];

const COUNT_MATRIX_SPECS: SplitCodeSpec[] = [
  "0-0", "0-1", "0-2",
  "1-0", "1-1", "1-2",
  "2-0", "2-1", "2-2",
  "3-0", "3-1", "3-2",
].map((label) => ({
  code: `c${label.replace("-", "")}`,
  splitName: `Cuenta ${label}`,
  badge: label,
  category: "count" as SplitCategory,
}));

const LINEUP_SPLIT_SPECS: SplitCodeSpec[] = [
  { code: "b1", splitName: "1ro al Bate", badge: "1ro", category: "lineup" },
  { code: "b2", splitName: "2do al Bate", badge: "2do", category: "lineup" },
  { code: "b3", splitName: "3ro al Bate", badge: "3ro", category: "lineup" },
  { code: "b4", splitName: "4to al Bate", badge: "4to", category: "lineup" },
  { code: "b5", splitName: "5to al Bate", badge: "5to", category: "lineup" },
  { code: "b6", splitName: "6to al Bate", badge: "6to", category: "lineup" },
  { code: "b7", splitName: "7mo al Bate", badge: "7mo", category: "lineup" },
  { code: "b8", splitName: "8vo al Bate", badge: "8vo", category: "lineup" },
  { code: "b9", splitName: "9no al Bate", badge: "9no", category: "lineup" },
  { code: "pH", splitName: "Como Bateador Emergente (PH)", badge: "PH", category: "lineup" },
  { code: "pD", splitName: "Como Bateador Designado (DH)", badge: "DH", category: "lineup" },
];

const EXACT_BASE_SPECS: SplitCodeSpec[] = [
  { code: "r0", splitName: "Bases Limpias", badge: "---", category: "situational" },
  { code: "r1", splitName: "Corredor en 1ra", badge: "1--", category: "situational" },
  { code: "r2", splitName: "Corredor en 2da", badge: "-2-", category: "situational" },
  { code: "r3", splitName: "Corredor en 3ra", badge: "--3", category: "situational" },
  { code: "r12", splitName: "Corredores en 1ra y 2da", badge: "12-", category: "situational" },
  { code: "r13", splitName: "Corredores en 1ra y 3ra", badge: "1-3", category: "situational" },
  { code: "r23", splitName: "Corredores en 2da y 3ra", badge: "-23", category: "situational" },
  { code: "r123", splitName: "Bases Llenas", badge: "123", category: "situational" },
  { code: "r3l2", splitName: "Corredor en 3ra (< 2 Outs)", badge: "3ra <2 Out", category: "situational" },
  { code: "ron2", splitName: "Corredores en Base (2 Outs)", badge: "Tráfico 2 Out", category: "situational" },
];

const PITCHER_FATIGUE_SPECS: SplitCodeSpec[] = [
  { code: "fip", splitName: "1er Inning Lanzado", badge: "1er Inning", category: "fatigue" },
  { code: "fba", splitName: "1er Bateador Enfrentado (RP)", badge: "1er Bat. RP", category: "fatigue" },
  { code: "pi001", splitName: "Pitcheos 1–15", badge: "1–15 Pit.", category: "fatigue" },
  { code: "pi016", splitName: "Pitcheos 16–30", badge: "16–30 Pit.", category: "fatigue" },
  { code: "pi031", splitName: "Pitcheos 31–45", badge: "31–45 Pit.", category: "fatigue" },
  { code: "pi046", splitName: "Pitcheos 46–60", badge: "46–60 Pit.", category: "fatigue" },
  { code: "pi061", splitName: "Pitcheos 61–75", badge: "61–75 Pit.", category: "fatigue" },
  { code: "pi076", splitName: "Pitcheos 76–90", badge: "76–90 Pit.", category: "fatigue" },
  { code: "pi091", splitName: "Pitcheos 91–105", badge: "91–105 Pit.", category: "fatigue" },
  { code: "pi106", splitName: "Pitcheos 106+", badge: "106+ Pit.", category: "fatigue" },
];

function buildSplitsFromSpecs<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mlbSplits: any[],
  group: "hitting" | "pitching",
  specs: SplitCodeSpec[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseFn: (raw: any, category: SplitCategory, splitName: string, badge?: string) => T
): T[] {
  const out: T[] = [];
  for (const spec of specs) {
    const raw = getBestSplitForCode(mlbSplits, spec.code, group);
    if (raw) {
      out.push(parseFn(raw, spec.category, spec.splitName, spec.badge));
    }
  }
  return out;
}

function getRowIsoDate(row: { games?: { game_date?: string; game_datetime?: string } | null }): string {
  return (
    getVenezuelanDate(row.games?.game_date, row.games?.game_datetime) ||
    String(row.games?.game_date || "").slice(0, 10)
  );
}

function filterAndSortAppearances<T extends RawGameBattingRow | RawGamePitchingRow>(
  rows: T[],
  appearanceCheck: (row: T) => boolean
): T[] {
  const seen = new Set<number>();
  const valid: T[] = [];
  for (const r of rows) {
    if (!isPlayedGameStatus(r.games?.status)) continue;
    if (!appearanceCheck(r)) continue;
    const gid = r.games?.id ?? r.game_id ?? null;
    if (gid !== null && gid !== undefined) {
      const numId = Number(gid);
      if (seen.has(numId)) continue;
      seen.add(numId);
    }
    valid.push(r);
  }
  valid.sort((a, b) => {
    const cmp = getRowIsoDate(a).localeCompare(getRowIsoDate(b));
    if (cmp !== 0) return cmp;
    return Number(a.games?.id ?? a.game_id ?? 0) - Number(b.games?.id ?? b.game_id ?? 0);
  });
  return valid;
}

/**
 * Calcula splits de tendencia reciente (Últimos 7, 15 y 30 juegos reales) para bateadores o lanzadores.
 */
export function buildRecentTrendSplits(
  rows: RawGameBattingRow[],
  type?: "batter"
): PlayerSplitRow[];
export function buildRecentTrendSplits(
  rows: RawGamePitchingRow[],
  type: "pitcher"
): PitcherSplitRow[];
export function buildRecentTrendSplits(
  rows: RawGameBattingRow[] | RawGamePitchingRow[],
  type?: "batter" | "pitcher"
): PlayerSplitRow[] | PitcherSplitRow[] {
  const effectiveType: "batter" | "pitcher" =
    type ?? (rows.length > 0 && "ip_decimal" in rows[0] ? "pitcher" : "batter");

  const windows = [
    { size: 7, minPrev: 0, splitName: "Últimos 7 Juegos", badge: "7 JJ" },
    { size: 15, minPrev: 7, splitName: "Últimos 15 Juegos", badge: "15 JJ" },
    { size: 30, minPrev: 15, splitName: "Últimos 30 Juegos", badge: "30 JJ" },
  ];

  if (effectiveType === "batter") {
    const valid = filterAndSortAppearances(rows as RawGameBattingRow[], hasBatterAppearance);
    if (valid.length === 0) return [];
    return windows
      .filter((w) => valid.length > w.minPrev)
      .map((w) =>
        buildBatterSplitRow(w.splitName, "trend", w.badge, valid.slice(-w.size))
      );
  }

  const valid = filterAndSortAppearances(rows as RawGamePitchingRow[], hasPitcherAppearance);
  if (valid.length === 0) return [];
  return windows
    .filter((w) => valid.length > w.minPrev)
    .map((w) =>
      buildPitcherSplitRow(w.splitName, "trend", w.badge, valid.slice(-w.size))
    );
}

/**
 * Clasifica apariciones de un lanzador según días de descanso respecto a su aparición previa.
 */
export function buildPitcherRestDaySplits(rows: RawGamePitchingRow[]): PitcherSplitRow[] {
  const valid = filterAndSortAppearances(rows, hasPitcherAppearance);
  if (valid.length < 2) return [];

  const buckets: Array<{
    key: string;
    splitName: string;
    badge: string;
    match: (restDays: number) => boolean;
    rows: RawGamePitchingRow[];
  }> = [
    { key: "0", splitName: "0 Días de Descanso (Consecutivo)", badge: "0 Días", match: (d) => d === 0, rows: [] },
    { key: "1", splitName: "1 Día de Descanso", badge: "1 Día", match: (d) => d === 1, rows: [] },
    { key: "2-3", splitName: "2–3 Días de Descanso", badge: "2–3 Días", match: (d) => d >= 2 && d <= 3, rows: [] },
    { key: "4", splitName: "4 Días de Descanso", badge: "4 Días", match: (d) => d === 4, rows: [] },
    { key: "5", splitName: "5 Días de Descanso", badge: "5 Días", match: (d) => d === 5, rows: [] },
    { key: "6+", splitName: "6+ Días de Descanso", badge: "6+ Días", match: (d) => d >= 6, rows: [] },
  ];

  for (let i = 1; i < valid.length; i++) {
    const prevDate = getRowIsoDate(valid[i - 1]);
    const currDate = getRowIsoDate(valid[i]);
    if (!prevDate || !currDate) continue;
    const prevMs = Date.parse(`${prevDate}T12:00:00Z`);
    const currMs = Date.parse(`${currDate}T12:00:00Z`);
    if (isNaN(prevMs) || isNaN(currMs)) continue;

    const calendarGap = Math.round((currMs - prevMs) / 86400000);
    const restDays = Math.max(0, calendarGap - 1);
    const target = buckets.find((b) => b.match(restDays));
    if (target) target.rows.push(valid[i]);
  }

  return buckets
    .filter((b) => b.rows.length > 0)
    .map((b) => buildPitcherSplitRow(b.splitName, "fatigue", b.badge, b.rows));
}

/**
 * Construye el registro juego a juego (Game Log) de un bateador ordenado del más reciente al más antiguo.
 */
export function buildBatterGameLogs(rows: RawGameBattingRow[]): PlayerBatterGameLog[] {
  const valid = filterAndSortAppearances(rows, hasBatterAppearance).reverse();
  const logs: PlayerBatterGameLog[] = [];

  for (const row of valid) {
    const g = row.games;
    if (!g) continue;
    const rowTeamId = row.team_id || 695;
    const isHome = g.home_team_id === rowTeamId;
    const opponentId = isHome ? g.away_team_id : g.home_team_id;
    const oppTeam = getTeam(opponentId);
    const teamScore = isHome ? (g.home_score ?? 0) : (g.away_score ?? 0);
    const oppScore = isHome ? (g.away_score ?? 0) : (g.home_score ?? 0);
    const ab = row.ab || 0;
    const h = row.h || 0;

    logs.push({
      gameId: Number(g.id ?? row.game_id ?? 0),
      date: getRowIsoDate(row),
      opponentId,
      opponentAbbr: oppTeam.abbreviation,
      opponentName: oppTeam.name,
      isHome,
      result: teamScore > oppScore ? "G" : "P",
      score: `${teamScore}-${oppScore}`,
      ab,
      r: row.r || 0,
      h,
      doubles: row.doubles || 0,
      triples: row.triples || 0,
      hr: row.hr || 0,
      rbi: row.rbi || 0,
      bb: row.bb || 0,
      so: row.so || 0,
      sb: row.sb || 0,
      avg: ab > 0 ? formatRate(h / ab) : ".000",
    });
  }

  return logs;
}

/**
 * Construye el registro juego a juego (Game Log) de un lanzador ordenado del más reciente al más antiguo.
 */
export function buildPitcherGameLogs(rows: RawGamePitchingRow[]): PlayerPitcherGameLog[] {
  const valid = filterAndSortAppearances(rows, hasPitcherAppearance).reverse();
  const logs: PlayerPitcherGameLog[] = [];

  for (const row of valid) {
    const g = row.games;
    if (!g) continue;
    const rowTeamId = row.team_id || 695;
    const isHome = g.home_team_id === rowTeamId;
    const opponentId = isHome ? g.away_team_id : g.home_team_id;
    const oppTeam = getTeam(opponentId);
    const teamScore = isHome ? (g.home_score ?? 0) : (g.away_score ?? 0);
    const oppScore = isHome ? (g.away_score ?? 0) : (g.home_score ?? 0);
    const outs = decimalInningsToOuts(row.ip_decimal || 0);
    const ip = outs / 3;
    const er = row.er || 0;

    logs.push({
      gameId: Number(g.id ?? row.game_id ?? 0),
      date: getRowIsoDate(row),
      opponentId,
      opponentAbbr: oppTeam.abbreviation,
      opponentName: oppTeam.name,
      isHome,
      result: teamScore > oppScore ? "G" : "P",
      score: `${teamScore}-${oppScore}`,
      isStart: Boolean(row.games_started && row.games_started > 0),
      ipDisplay: outsToInningsDisplay(outs),
      h: row.h || 0,
      r: row.r || 0,
      er,
      bb: row.bb || 0,
      so: row.so || 0,
      hr: row.hr || 0,
      eraGame: ip > 0 ? formatEraWhip((er * 9) / ip) : er > 0 ? "INF" : "0.00",
    });
  }

  return logs;
}

/**
 * Construye el perfil general multitemporada (2026 y 2025) con métricas avanzadas (wOBA, wRC+, FIP, Stats+),
 * estadísticas de fildeo y game logs verificados del jugador.
 */
export async function getPlayerGeneralProfile(
  playerId: number,
  type: "batter" | "pitcher",
  validRows: RawGameBattingRow[] | RawGamePitchingRow[],
  fallbackTeamId: number = 695,
  season: number = ACTIVE_SEASON
): Promise<PlayerGeneralProfile> {
  void fallbackTeamId;
  const targetSeasons = [2026, 2025];
  const postseasonPhases: Array<{ code: "D" | "L" | "F"; label: string }> = [
    { code: "D", label: "Comodín" },
    { code: "L", label: "Round Robin" },
    { code: "F", label: "Serie Final" },
  ];
  const phaseOrder: Record<"D" | "L" | "F", number> = { F: 0, L: 1, D: 2 };

  const [batResults, pitResults, postBatResults, postPitResults, fieldResult] =
    await Promise.all([
      Promise.allSettled(
        targetSeasons.map(async (s) => ({
          season: s,
          rows: await getBattingStats(s, "R", "all", 1000, 0),
        }))
      ),
      Promise.allSettled(
        targetSeasons.map(async (s) => ({
          season: s,
          rows: await getPitchingStats(s, "R", "all", 1000, 0),
        }))
      ),
      Promise.allSettled(
        targetSeasons.flatMap((s) =>
          postseasonPhases.map(async (ph) => ({
            season: s,
            phase: ph.code,
            phaseLabel: ph.label,
            rows: await getBattingStats(s, ph.code, "all", 1000, 0),
          }))
        )
      ),
      Promise.allSettled(
        targetSeasons.flatMap((s) =>
          postseasonPhases.map(async (ph) => ({
            season: s,
            phase: ph.code,
            phaseLabel: ph.label,
            rows: await getPitchingStats(s, ph.code, "all", 1000, 0),
          }))
        )
      ),
      getFieldingStats(season, "all", "all", 1000, 0).catch((): FieldingStats[] => []),
    ]);

  const seasonsBatting: Array<{ season: number; stats: BattingStats }> = [];
  for (const res of batResults) {
    if (res.status !== "fulfilled") continue;
    const found = res.value.rows.find((r) => r.playerId === playerId && r.games > 0);
    if (found) seasonsBatting.push({ season: res.value.season, stats: found });
  }

  const seasonsPitching: Array<{ season: number; stats: PitchingStats }> = [];
  for (const res of pitResults) {
    if (res.status !== "fulfilled") continue;
    const found = res.value.rows.find((r) => r.playerId === playerId && r.games > 0);
    if (found) seasonsPitching.push({ season: res.value.season, stats: found });
  }

  const postseasonBatting: NonNullable<PlayerGeneralProfile["postseasonBatting"]> = [];
  for (const res of postBatResults) {
    if (res.status !== "fulfilled") continue;
    const found = res.value.rows.find((r) => r.playerId === playerId && r.games > 0);
    if (found) {
      postseasonBatting.push({
        season: res.value.season,
        phase: res.value.phase,
        phaseLabel: res.value.phaseLabel,
        stats: found,
      });
    }
  }
  postseasonBatting.sort(
    (a, b) => b.season - a.season || phaseOrder[a.phase] - phaseOrder[b.phase]
  );

  const postseasonPitching: NonNullable<PlayerGeneralProfile["postseasonPitching"]> = [];
  for (const res of postPitResults) {
    if (res.status !== "fulfilled") continue;
    const found = res.value.rows.find((r) => r.playerId === playerId && r.games > 0);
    if (found) {
      postseasonPitching.push({
        season: res.value.season,
        phase: res.value.phase,
        phaseLabel: res.value.phaseLabel,
        stats: found,
      });
    }
  }
  postseasonPitching.sort(
    (a, b) => b.season - a.season || phaseOrder[a.phase] - phaseOrder[b.phase]
  );

  const fielding = Array.isArray(fieldResult)
    ? fieldResult.filter((f) => f.playerId === playerId)
    : [];

  return {
    seasonsBatting,
    seasonsPitching,
    postseasonBatting,
    postseasonPitching,
    fielding,
    batterGameLogs:
      type === "batter" ? buildBatterGameLogs(validRows as RawGameBattingRow[]) : [],
    pitcherGameLogs:
      type === "pitcher" ? buildPitcherGameLogs(validRows as RawGamePitchingRow[]) : [],
  };
}

/**
 * Resuelve metadatos básicos de un jugador consultando MLB People API si no está aún en Supabase
 */
async function fetchMlbPersonMeta(
  playerId: number,
  fallbackTeamId: number = 695
): Promise<{ fullName: string; teamId: number; teamName: string; teamAbbr: string } | null> {
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1/people/${playerId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    const p = d.people?.[0];
    if (!p) return null;
    const team = getTeam(fallbackTeamId);
    return {
      fullName: p.fullName || `Jugador #${playerId}`,
      teamId: team.id,
      teamName: team.name,
      teamAbbr: team.abbreviation,
    };
  } catch {
    return null;
  }
}

/**
 * Genera el perfil verificado de splits de un jugador (bateador o lanzador)
 * exclusivamente con datos reales de la temporada solicitada en la LVBP.
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
    const group = type === "batter" ? "hitting" : "pitching";
    const mlbSplitsPromise = fetchMlbStatSplits(playerId, group, season);

    if (type === "batter") {
      let rawRows: any[] = [];
      if (supabase) {
        const { data, error } = await supabase
          .from("batting_stats")
          .select(`
            game_id, player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh,
            players ( full_name ),
            games!inner ( id, season, game_date, game_datetime, home_team_id, away_team_id, home_score, away_score, status, game_type )
          `)
          .eq("player_id", playerId)
          .eq("games.season", season);

        if (!error && data) rawRows = data;
      }

      const seenGameIds = new Set<number>();
      const validRows: RawGameBattingRow[] = [];
      for (const r of rawRows) {
        const g = Array.isArray(r.games) ? r.games[0] : r.games;
        if (!g || !isPlayedGameStatus(g.status)) continue;
        if (!hasBatterAppearance(r)) continue;
        if (g.id != null) {
          if (seenGameIds.has(Number(g.id))) continue;
          seenGameIds.add(Number(g.id));
        }
        const p = Array.isArray(r.players) ? r.players[0] : r.players;
        validRows.push({ ...r, games: g, players: p });
      }

      validRows.sort((a, b) =>
        (a.games?.game_date || "").localeCompare(b.games?.game_date || "")
      );

      const mlbSplits = await mlbSplitsPromise;

      if (validRows.length === 0 && mlbSplits.length === 0) {
        return null;
      }

      const mlbTeamIdRaw = Number(mlbSplits.find((s) => s.team?.id)?.team?.id || 0);
      const fallbackTeamId = LVBP_TEAM_IDS.includes(mlbTeamIdRaw) ? mlbTeamIdRaw : 695;

      let playerName = `Bateador #${playerId}`;
      let teamId = fallbackTeamId;
      if (validRows.length > 0) {
        const latestRow = validRows[validRows.length - 1];
        playerName = latestRow.players?.full_name || validRows[0].players?.full_name || playerName;
        teamId = latestRow.team_id || teamId;
      } else {
        const meta = await fetchMlbPersonMeta(playerId, fallbackTeamId);
        if (meta) {
          playerName = meta.fullName;
          teamId = meta.teamId;
        }
      }
      const team = getTeam(teamId);

      // Particiones de Contexto, Rival y Calendario desde juegos reales en Supabase
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
        const rowTeamId = row.team_id || teamId;
        const isHome = g.home_team_id === rowTeamId;
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

        if (!rivalMap[opponentId] && opponentId !== teamId) rivalMap[opponentId] = [];
        if (rivalMap[opponentId]) rivalMap[opponentId].push(row);

        const effDate = getVenezuelanDate(g.game_date, g.game_datetime);
        if (effDate) {
          const d = new Date(`${effDate}T12:00:00Z`);
          const m = d.getUTCMonth() + 1;
          if (monthMap[m]) monthMap[m].push(row);
          const wd = (d.getUTCDay() + 6) % 7;
          if (dayOfWeekMap[wd]) dayOfWeekMap[wd].push(row);
        }
      }

      // Total oficial de temporada: preferir suma exacta Local+Visitante de MLB LVBP si está al día
      const mlbHomeAway = [
        getBestSplitForCode(mlbSplits, "h", "hitting"),
        getBestSplitForCode(mlbSplits, "a", "hitting"),
      ].filter(Boolean);
      const mlbCombinedRaw = combineMlbRawSplits(mlbHomeAway, "hitting");
      const mlbTotalRow = mlbCombinedRaw
        ? parseMlbBatterSplit(mlbCombinedRaw, "context", "Total Temporada", "General")
        : null;
      const supaTotalRow =
        validRows.length > 0
          ? buildBatterSplitRow("Total Temporada", "context", "General", validRows)
          : null;

      let totalRow: PlayerSplitRow;
      if (mlbTotalRow && (mlbTotalRow.games || 0) >= (supaTotalRow?.games || 0)) {
        totalRow = mlbTotalRow;
      } else if (supaTotalRow) {
        totalRow = supaTotalRow;
      } else if (mlbSplits.length > 0) {
        totalRow = parseMlbBatterSplit(mlbSplits[0], "context", "Total Temporada", "General");
      } else {
        return null;
      }

      // Desglose oficial de Platoon, Situacional, Conteos, Outs, Entradas y Contexto (0% sintético)
      const platoonSplits: PlayerSplitRow[] = [];
      const situationalSplits: PlayerSplitRow[] = [];
      const countSplits: PlayerSplitRow[] = [];
      const outsSplits: PlayerSplitRow[] = [];
      const inningSplits: PlayerSplitRow[] = [];
      let contextSplits: PlayerSplitRow[] = [];
      let lateCloseSplits: PlayerSplitRow[] = [];
      let scoreSplits: PlayerSplitRow[] = [];
      let detailedCountSplits: PlayerSplitRow[] = [];
      let countMatrixSplits: PlayerSplitRow[] = [];
      let lineupSplits: PlayerSplitRow[] = [];
      let exactBaseSplits: PlayerSplitRow[] = [];

      if (mlbSplits.length > 0) {
        const vr = getBestSplitForCode(mlbSplits, "vr", "hitting");
        const vl = getBestSplitForCode(mlbSplits, "vl", "hitting");
        if (vr) platoonSplits.push(parseMlbBatterSplit(vr, "platoon", "vs Lanzadores Derechos (RHP)", "vs RHP"));
        if (vl) platoonSplits.push(parseMlbBatterSplit(vl, "platoon", "vs Lanzadores Zurdos (LHP)", "vs LHP"));

        const r0 = getBestSplitForCode(mlbSplits, "r0", "hitting");
        const ron = getBestSplitForCode(mlbSplits, "ron", "hitting");
        const risp = getBestSplitForCode(mlbSplits, "risp", "hitting");
        const risp2 = getBestSplitForCode(mlbSplits, "risp2", "hitting");
        const r123 = getBestSplitForCode(mlbSplits, "r123", "hitting");
        const lo = getBestSplitForCode(mlbSplits, "lo", "hitting");
        if (r0) situationalSplits.push(parseMlbBatterSplit(r0, "situational", "Bases Limpias", "Bases Vacías"));
        if (ron) situationalSplits.push(parseMlbBatterSplit(ron, "situational", "Corredores en Base", "Tráfico"));
        if (risp) situationalSplits.push(parseMlbBatterSplit(risp, "situational", "Posición Anotadora (RISP)", "RISP"));
        if (risp2) situationalSplits.push(parseMlbBatterSplit(risp2, "situational", "RISP con 2 Outs (Clutch)", "Alta Presión"));
        if (r123) situationalSplits.push(parseMlbBatterSplit(r123, "situational", "Bases Llenas", "Llenas"));
        if (lo) situationalSplits.push(parseMlbBatterSplit(lo, "situational", "Abriendo Entrada (Leadoff)", "Leadoff"));

        const fp = getBestSplitForCode(mlbSplits, "fp", "hitting");
        const twoS = getBestSplitForCode(mlbSplits, "2s", "hitting");
        const fc = getBestSplitForCode(mlbSplits, "fc", "hitting");
        if (fp) countSplits.push(parseMlbBatterSplit(fp, "count", "Primer Pitcheo (0-0)", "0-0"));
        if (twoS) countSplits.push(parseMlbBatterSplit(twoS, "count", "Con 2 Strikes", "2 Strikes"));
        if (fc) countSplits.push(parseMlbBatterSplit(fc, "count", "Cuenta Completa (3-2)", "3-2"));

        const o0 = getBestSplitForCode(mlbSplits, "o0", "hitting");
        const o1 = getBestSplitForCode(mlbSplits, "o1", "hitting");
        const o2 = getBestSplitForCode(mlbSplits, "o2", "hitting");
        if (o0) outsSplits.push(parseMlbBatterSplit(o0, "outs", "Con 0 Outs", "0 Outs"));
        if (o1) outsSplits.push(parseMlbBatterSplit(o1, "outs", "Con 1 Out", "1 Out"));
        if (o2) outsSplits.push(parseMlbBatterSplit(o2, "outs", "Con 2 Outs", "2 Outs"));

        const innCodes = ["i01", "i02", "i03", "i04", "i05", "i06", "i07", "i08", "i09"];
        const innLabels = ["1ra Entrada", "2da Entrada", "3ra Entrada", "4ta Entrada", "5ta Entrada", "6ta Entrada", "7ma Entrada", "8va Entrada", "9na Entrada+"];
        innCodes.forEach((code, idx) => {
          const raw = getBestSplitForCode(mlbSplits, code, "hitting");
          if (raw) inningSplits.push(parseMlbBatterSplit(raw, "inning", innLabels[idx], `${idx + 1}ra`));
        });
        const ix = getBestSplitForCode(mlbSplits, "ix", "hitting");
        if (ix) inningSplits.push(parseMlbBatterSplit(ix, "inning", "Entradas Extra", "Extra"));

        const h = getBestSplitForCode(mlbSplits, "h", "hitting");
        const a = getBestSplitForCode(mlbSplits, "a", "hitting");
        const d = getBestSplitForCode(mlbSplits, "d", "hitting");
        const n = getBestSplitForCode(mlbSplits, "n", "hitting");
        const twn = getBestSplitForCode(mlbSplits, "twn", "hitting");
        const tls = getBestSplitForCode(mlbSplits, "tls", "hitting");
        if (h) contextSplits.push(parseMlbBatterSplit(h, "context", "En Casa (Local)", "Local"));
        if (a) contextSplits.push(parseMlbBatterSplit(a, "context", "En la Carretera (Visitante)", "Visitante"));
        if (n) contextSplits.push(parseMlbBatterSplit(n, "context", "De Noche (≥ 6:00 PM)", "Nocturno"));
        if (d) contextSplits.push(parseMlbBatterSplit(d, "context", "De Día (< 6:00 PM)", "Diurno"));
        if (twn) contextSplits.push(parseMlbBatterSplit(twn, "context", "En Victorias", "Victorias"));
        if (tls) contextSplits.push(parseMlbBatterSplit(tls, "context", "En Derrotas", "Derrotas"));

        lateCloseSplits = buildSplitsFromSpecs(mlbSplits, "hitting", LATE_CLOSE_SPECS, parseMlbBatterSplit);
        scoreSplits = buildSplitsFromSpecs(mlbSplits, "hitting", SCORE_SPLIT_SPECS, parseMlbBatterSplit);
        detailedCountSplits = buildSplitsFromSpecs(mlbSplits, "hitting", DETAILED_COUNT_SPECS, parseMlbBatterSplit);
        countMatrixSplits = buildSplitsFromSpecs(mlbSplits, "hitting", COUNT_MATRIX_SPECS, parseMlbBatterSplit);
        lineupSplits = buildSplitsFromSpecs(mlbSplits, "hitting", LINEUP_SPLIT_SPECS, parseMlbBatterSplit);
        exactBaseSplits = buildSplitsFromSpecs(mlbSplits, "hitting", EXACT_BASE_SPECS, parseMlbBatterSplit);
      }

      if (contextSplits.length === 0 && validRows.length > 0) {
        contextSplits = [
          buildBatterSplitRow("En Casa (Local)", "context", "Local", homeRows),
          buildBatterSplitRow("En la Carretera (Visitante)", "context", "Visitante", awayRows),
          buildBatterSplitRow("De Noche (≥ 6:00 PM)", "context", "Nocturno", nightRows),
          buildBatterSplitRow("De Día (< 6:00 PM)", "context", "Diurno", dayRows),
          buildBatterSplitRow("En Victorias", "context", "Triunfos", winRows),
          buildBatterSplitRow("En Derrotas", "context", "Reveses", lossRows),
        ].filter((r) => (r.games || 0) > 0);
      }

      const trendSplits = buildRecentTrendSplits(validRows, "batter");

      // Rivales reales de la LVBP
      const opponentSplits: PlayerSplitRow[] = Object.keys(rivalMap)
        .map((idStr) => {
          const oppId = parseInt(idStr, 10);
          const oppTeam = getTeam(oppId);
          return buildBatterSplitRow(`vs ${oppTeam.name}`, "opponent", oppTeam.abbreviation, rivalMap[oppId]);
        })
        .filter((r) => (r.games || 0) > 0);

      // Calendario real
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

      const lobPromise: Promise<PlayerSplitsProfile["lobStats"]> =
        teamId === 695
          ? (async () => {
              try {
                const situData =
                  season >= ACTIVE_SEASON
                    ? await getDynamicSituationalData(season)
                    : getLeonesSituationalData(season);
                const lobEntry = situData.lobBatterRanking.find((b) => b.batterId === playerId);
                if (lobEntry) {
                  return {
                    lobEnding: lobEntry.lobEnding,
                    rispLobEnding: lobEntry.rispLobEnding,
                    rispLobMid: lobEntry.rispLobMid,
                    totalRispLob: lobEntry.totalRispLob,
                  };
                }
              } catch {
                // Omitir LOB si el feed en vivo no responde dentro del umbral
              }
              return undefined;
            })()
          : Promise.resolve(undefined);

      const [lobStats, general] = await Promise.all([
        lobPromise,
        getPlayerGeneralProfile(playerId, "batter", validRows, teamId, season).catch(
          () => undefined
        ),
      ]);

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
        totalGames: totalRow.games ?? validRows.length,
        overview: {
          kpiPrimary: totalRow.ops,
          labelPrimary: "OPS",
          kpiSecondary: totalRow.avg,
          labelSecondary: "AVG",
          slashLine: `${totalRow.avg} / ${totalRow.obp} / ${totalRow.slg} • ISO ${totalRow.iso} • BABIP ${totalRow.babip} • ${totalRow.hr} HR • ${totalRow.rbi} CI`,
        },
        general,
        contextSplits,
        opponentSplits,
        calendarSplits,
        situationalSplits,
        platoonSplits,
        countSplits,
        inningSplits,
        outsSplits,
        lateCloseSplits,
        trendSplits,
        scoreSplits,
        detailedCountSplits,
        countMatrixSplits,
        lineupSplits,
        exactBaseSplits,
        lobStats,
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
            game_id, player_id, team_id, ip_decimal, h, r, er, bb, hbp, so, hr,
            players ( full_name ),
            games!inner ( id, season, game_date, game_datetime, home_team_id, away_team_id, home_score, away_score, status, game_type )
          `)
          .eq("player_id", playerId)
          .eq("games.season", season);

        if (!error && data) rawRows = data;
      }

      const seenGameIds = new Set<number>();
      const validRows: RawGamePitchingRow[] = [];
      for (const r of rawRows) {
        const g = Array.isArray(r.games) ? r.games[0] : r.games;
        if (!g || !isPlayedGameStatus(g.status)) continue;
        if (!hasPitcherAppearance(r)) continue;
        if (g.id != null) {
          if (seenGameIds.has(Number(g.id))) continue;
          seenGameIds.add(Number(g.id));
        }
        const p = Array.isArray(r.players) ? r.players[0] : r.players;
        validRows.push({ ...r, games: g, players: p });
      }

      validRows.sort((a, b) =>
        (a.games?.game_date || "").localeCompare(b.games?.game_date || "")
      );

      const mlbSplits = await mlbSplitsPromise;

      if (validRows.length === 0 && mlbSplits.length === 0) {
        return null;
      }

      const mlbTeamIdRaw = Number(mlbSplits.find((s) => s.team?.id)?.team?.id || 0);
      const fallbackTeamId = LVBP_TEAM_IDS.includes(mlbTeamIdRaw) ? mlbTeamIdRaw : 695;

      let playerName = `Lanzador #${playerId}`;
      let teamId = fallbackTeamId;
      if (validRows.length > 0) {
        const latestRow = validRows[validRows.length - 1];
        playerName = latestRow.players?.full_name || validRows[0].players?.full_name || playerName;
        teamId = latestRow.team_id || teamId;
      } else {
        const meta = await fetchMlbPersonMeta(playerId, fallbackTeamId);
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
        const rowTeamId = row.team_id || teamId;
        const isHome = g.home_team_id === rowTeamId;
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

        if (!rivalMap[opponentId] && opponentId !== teamId) rivalMap[opponentId] = [];
        if (rivalMap[opponentId]) rivalMap[opponentId].push(row);

        const effDate = getVenezuelanDate(g.game_date, g.game_datetime);
        if (effDate) {
          const d = new Date(`${effDate}T12:00:00Z`);
          const m = d.getUTCMonth() + 1;
          if (monthMap[m]) monthMap[m].push(row);
          const wd = (d.getUTCDay() + 6) % 7;
          if (dayOfWeekMap[wd]) dayOfWeekMap[wd].push(row);
        }
      }

      // Total oficial de temporada: preferir suma exacta Local+Visitante de MLB LVBP (incluye JI reales)
      const mlbHomeAway = [
        getBestSplitForCode(mlbSplits, "h", "pitching"),
        getBestSplitForCode(mlbSplits, "a", "pitching"),
      ].filter(Boolean);
      const mlbRolePair = [
        getBestSplitForCode(mlbSplits, "sp", "pitching"),
        getBestSplitForCode(mlbSplits, "rp", "pitching"),
      ].filter(Boolean);
      const mlbCombinedRaw = combineMlbRawSplits(
        mlbHomeAway.length > 0 ? mlbHomeAway : mlbRolePair,
        "pitching"
      );
      const mlbTotalRow = mlbCombinedRaw
        ? parseMlbPitcherSplit(mlbCombinedRaw, "context", "Total Temporada", "General")
        : null;
      const supaTotalRow =
        validRows.length > 0
          ? buildPitcherSplitRow("Total Temporada", "context", "General", validRows)
          : null;

      let totalRow: PitcherSplitRow;
      if (mlbTotalRow && (mlbTotalRow.games || 0) >= (supaTotalRow?.games || 0)) {
        totalRow = mlbTotalRow;
      } else if (supaTotalRow) {
        totalRow = {
          ...supaTotalRow,
          starts: Math.max(supaTotalRow.starts, mlbTotalRow?.starts || 0),
        };
      } else if (mlbSplits.length > 0) {
        totalRow = parseMlbPitcherSplit(mlbSplits[0], "context", "Total Temporada", "General");
      } else {
        return null;
      }

      // Desglose oficial de Platoon, Situacional, Conteos, Outs, Entradas, Rol y Contexto (0% sintético)
      const pitcherPlatoonSplits: PitcherSplitRow[] = [];
      const pitcherSituationalSplits: PitcherSplitRow[] = [];
      const pitcherCountSplits: PitcherSplitRow[] = [];
      const pitcherOutsSplits: PitcherSplitRow[] = [];
      const pitcherInningSplits: PitcherSplitRow[] = [];
      const pitcherRoleSplits: PitcherSplitRow[] = [];
      let pitcherContextSplits: PitcherSplitRow[] = [];
      let pitcherLateCloseSplits: PitcherSplitRow[] = [];
      let pitcherScoreSplits: PitcherSplitRow[] = [];
      let pitcherDetailedCountSplits: PitcherSplitRow[] = [];
      let pitcherCountMatrixSplits: PitcherSplitRow[] = [];
      let pitcherExactBaseSplits: PitcherSplitRow[] = [];
      let pitcherFatigueSplits: PitcherSplitRow[] = [];

      if (mlbSplits.length > 0) {
        const vr = getBestSplitForCode(mlbSplits, "vr", "pitching");
        const vl = getBestSplitForCode(mlbSplits, "vl", "pitching");
        if (vr) pitcherPlatoonSplits.push(parseMlbPitcherSplit(vr, "platoon", "vs Bateadores Derechos (RHB)", "vs RHB"));
        if (vl) pitcherPlatoonSplits.push(parseMlbPitcherSplit(vl, "platoon", "vs Bateadores Zurdos (LHB)", "vs LHB"));

        const r0 = getBestSplitForCode(mlbSplits, "r0", "pitching");
        const ron = getBestSplitForCode(mlbSplits, "ron", "pitching");
        const risp = getBestSplitForCode(mlbSplits, "risp", "pitching");
        const risp2 = getBestSplitForCode(mlbSplits, "risp2", "pitching");
        const r123 = getBestSplitForCode(mlbSplits, "r123", "pitching");
        const lo = getBestSplitForCode(mlbSplits, "lo", "pitching");
        if (r0) pitcherSituationalSplits.push(parseMlbPitcherSplit(r0, "situational", "Bases Limpias", "Bases Vacías"));
        if (ron) pitcherSituationalSplits.push(parseMlbPitcherSplit(ron, "situational", "Corredores en Base", "Tráfico"));
        if (risp) pitcherSituationalSplits.push(parseMlbPitcherSplit(risp, "situational", "Posición Anotadora (RISP)", "RISP"));
        if (risp2) pitcherSituationalSplits.push(parseMlbPitcherSplit(risp2, "situational", "RISP con 2 Outs (Clutch)", "Alta Presión"));
        if (r123) pitcherSituationalSplits.push(parseMlbPitcherSplit(r123, "situational", "Bases Llenas", "Llenas"));
        if (lo) pitcherSituationalSplits.push(parseMlbPitcherSplit(lo, "situational", "Abriendo Entrada (Leadoff)", "Leadoff"));

        const fp = getBestSplitForCode(mlbSplits, "fp", "pitching");
        const twoS = getBestSplitForCode(mlbSplits, "2s", "pitching");
        const fc = getBestSplitForCode(mlbSplits, "fc", "pitching");
        if (fp) pitcherCountSplits.push(parseMlbPitcherSplit(fp, "count", "Primer Pitcheo (0-0)", "0-0"));
        if (twoS) pitcherCountSplits.push(parseMlbPitcherSplit(twoS, "count", "Con 2 Strikes", "2 Strikes"));
        if (fc) pitcherCountSplits.push(parseMlbPitcherSplit(fc, "count", "Cuenta Completa (3-2)", "3-2"));

        const o0 = getBestSplitForCode(mlbSplits, "o0", "pitching");
        const o1 = getBestSplitForCode(mlbSplits, "o1", "pitching");
        const o2 = getBestSplitForCode(mlbSplits, "o2", "pitching");
        if (o0) pitcherOutsSplits.push(parseMlbPitcherSplit(o0, "outs", "Con 0 Outs", "0 Outs"));
        if (o1) pitcherOutsSplits.push(parseMlbPitcherSplit(o1, "outs", "Con 1 Out", "1 Out"));
        if (o2) pitcherOutsSplits.push(parseMlbPitcherSplit(o2, "outs", "Con 2 Outs", "2 Outs"));

        const innCodes = ["i01", "i02", "i03", "i04", "i05", "i06", "i07", "i08", "i09"];
        const innLabels = ["1ra Entrada", "2da Entrada", "3ra Entrada", "4ta Entrada", "5ta Entrada", "6ta Entrada", "7ma Entrada", "8va Entrada", "9na Entrada+"];
        innCodes.forEach((code, idx) => {
          const raw = getBestSplitForCode(mlbSplits, code, "pitching");
          if (raw) pitcherInningSplits.push(parseMlbPitcherSplit(raw, "inning", innLabels[idx], `${idx + 1}ra`));
        });
        const ix = getBestSplitForCode(mlbSplits, "ix", "pitching");
        if (ix) pitcherInningSplits.push(parseMlbPitcherSplit(ix, "inning", "Entradas Extra", "Extra"));

        const sp = getBestSplitForCode(mlbSplits, "sp", "pitching");
        const rp = getBestSplitForCode(mlbSplits, "rp", "pitching");
        if (sp) pitcherRoleSplits.push(parseMlbPitcherSplit(sp, "role", "Como Abridor (SP)", "Abridor"));
        if (rp) pitcherRoleSplits.push(parseMlbPitcherSplit(rp, "role", "Como Relevista (RP)", "Relevista"));

        const h = getBestSplitForCode(mlbSplits, "h", "pitching");
        const a = getBestSplitForCode(mlbSplits, "a", "pitching");
        const d = getBestSplitForCode(mlbSplits, "d", "pitching");
        const n = getBestSplitForCode(mlbSplits, "n", "pitching");
        const twn = getBestSplitForCode(mlbSplits, "twn", "pitching");
        const tls = getBestSplitForCode(mlbSplits, "tls", "pitching");
        if (h) pitcherContextSplits.push(parseMlbPitcherSplit(h, "context", "En Casa (Local)", "Local"));
        if (a) pitcherContextSplits.push(parseMlbPitcherSplit(a, "context", "En la Carretera (Visitante)", "Visitante"));
        if (n) pitcherContextSplits.push(parseMlbPitcherSplit(n, "context", "De Noche (≥ 6:00 PM)", "Nocturno"));
        if (d) pitcherContextSplits.push(parseMlbPitcherSplit(d, "context", "De Día (< 6:00 PM)", "Diurno"));
        if (twn) pitcherContextSplits.push(parseMlbPitcherSplit(twn, "context", "En Victorias del Equipo", "Victorias"));
        if (tls) pitcherContextSplits.push(parseMlbPitcherSplit(tls, "context", "En Derrotas del Equipo", "Derrotas"));

        pitcherLateCloseSplits = buildSplitsFromSpecs(mlbSplits, "pitching", LATE_CLOSE_SPECS, parseMlbPitcherSplit);
        pitcherScoreSplits = buildSplitsFromSpecs(mlbSplits, "pitching", SCORE_SPLIT_SPECS, parseMlbPitcherSplit);
        pitcherDetailedCountSplits = buildSplitsFromSpecs(mlbSplits, "pitching", DETAILED_COUNT_SPECS, parseMlbPitcherSplit);
        pitcherCountMatrixSplits = buildSplitsFromSpecs(mlbSplits, "pitching", COUNT_MATRIX_SPECS, parseMlbPitcherSplit);
        pitcherExactBaseSplits = buildSplitsFromSpecs(mlbSplits, "pitching", EXACT_BASE_SPECS, parseMlbPitcherSplit);
        pitcherFatigueSplits = buildSplitsFromSpecs(mlbSplits, "pitching", PITCHER_FATIGUE_SPECS, parseMlbPitcherSplit);
      }

      if (pitcherContextSplits.length === 0 && validRows.length > 0) {
        pitcherContextSplits = [
          buildPitcherSplitRow("En Casa (Local)", "context", "Local", homeRows),
          buildPitcherSplitRow("En la Carretera (Visitante)", "context", "Visitante", awayRows),
          buildPitcherSplitRow("De Noche (≥ 6:00 PM)", "context", "Nocturno", nightRows),
          buildPitcherSplitRow("De Día (< 6:00 PM)", "context", "Diurno", dayRows),
          buildPitcherSplitRow("En Victorias del Equipo", "context", "Triunfos", winRows),
          buildPitcherSplitRow("En Derrotas del Equipo", "context", "Reveses", lossRows),
        ].filter((r) => r.games > 0);
      }

      const pitcherTrendSplits = buildRecentTrendSplits(validRows, "pitcher");
      const pitcherRestSplits = buildPitcherRestDaySplits(validRows);

      // Rivales reales de la LVBP
      const pitcherOpponentSplits: PitcherSplitRow[] = Object.keys(rivalMap)
        .map((idStr) => {
          const oppId = parseInt(idStr, 10);
          const oppTeam = getTeam(oppId);
          return buildPitcherSplitRow(`vs ${oppTeam.name}`, "opponent", oppTeam.abbreviation, rivalMap[oppId]);
        })
        .filter((r) => r.games > 0);

      // Calendario real
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

      const general = await getPlayerGeneralProfile(
        playerId,
        "pitcher",
        validRows,
        teamId,
        season
      ).catch(() => undefined);

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
        general,
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
        pitcherLateCloseSplits,
        pitcherTrendSplits,
        pitcherScoreSplits,
        pitcherDetailedCountSplits,
        pitcherCountMatrixSplits,
        pitcherExactBaseSplits,
        pitcherRestSplits,
        pitcherFatigueSplits,
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
 * Obtiene la lista de jugadores elegibles que realmente han visto acción en `season` (LVBP),
 * sin listas hardcodeadas ni jugadores inactivos.
 */
export async function getAllAvailablePlayersForSplits(
  season: number = ACTIVE_SEASON
): Promise<PlayerSelectorItem[]> {
  if (!supabase) return [];

  const scoredItems: Array<{ item: PlayerSelectorItem; sortVolume: number }> = [];

  try {
    const [batRes, pitRes] = await Promise.all([
      supabase
        .from("batting_stats")
        .select(
          "game_id, player_id, team_id, ab, r, h, doubles, triples, hr, rbi, bb, so, sb, cs, hbp, sf, sh, players(full_name), games!inner(id, season, status, game_date)"
        )
        .eq("games.season", season)
        .limit(10000),
      supabase
        .from("pitching_stats")
        .select(
          "game_id, player_id, team_id, ip_decimal, h, r, er, bb, hbp, so, hr, players(full_name), games!inner(id, season, status, game_date)"
        )
        .eq("games.season", season)
        .limit(10000),
    ]);

    if (batRes.data && batRes.data.length > 0) {
      const seenBatGame = new Set<string>();
      const batGroup: Record<
        number,
        {
          name: string;
          teamId: number;
          latestDate: string;
          games: number;
          ab: number;
          h: number;
          doubles: number;
          triples: number;
          hr: number;
          rbi: number;
          bb: number;
          so: number;
          hbp: number;
          sf: number;
          sh: number;
        }
      > = {};

      for (const row of batRes.data as any[]) {
        const gObj = Array.isArray(row.games) ? row.games[0] : row.games;
        if (!isPlayedGameStatus(gObj?.status)) continue;
        if (!hasBatterAppearance(row)) continue;

        const pid = Number(row.player_id);
        const gid = gObj?.id ?? row.game_id;
        if (gid != null) {
          const pgKey = `${pid}-${gid}`;
          if (seenBatGame.has(pgKey)) continue;
          seenBatGame.add(pgKey);
        }

        const pObj = Array.isArray(row.players) ? row.players[0] : row.players;
        const name = pObj?.full_name || `Jugador #${pid}`;
        const gDate = gObj?.game_date || "";

        if (!batGroup[pid]) {
          batGroup[pid] = {
            name,
            teamId: Number(row.team_id),
            latestDate: gDate,
            games: 0,
            ab: 0,
            h: 0,
            doubles: 0,
            triples: 0,
            hr: 0,
            rbi: 0,
            bb: 0,
            so: 0,
            hbp: 0,
            sf: 0,
            sh: 0,
          };
        } else if (gDate >= batGroup[pid].latestDate) {
          batGroup[pid].teamId = Number(row.team_id);
          batGroup[pid].latestDate = gDate;
        }

        const b = batGroup[pid];
        b.games += 1;
        b.ab += Number(row.ab || 0);
        b.h += Number(row.h || 0);
        b.doubles += Number(row.doubles || 0);
        b.triples += Number(row.triples || 0);
        b.hr += Number(row.hr || 0);
        b.rbi += Number(row.rbi || 0);
        b.bb += Number(row.bb || 0);
        b.so += Number(row.so || 0);
        b.hbp += Number(row.hbp || 0);
        b.sf += Number(row.sf || 0);
        b.sh += Number(row.sh || 0);
      }

      for (const [pidStr, b] of Object.entries(batGroup)) {
        const pid = parseInt(pidStr, 10);
        const pa = b.ab + b.bb + b.hbp + b.sf + b.sh;
        if (pa < 1) continue;

        const team = getTeam(b.teamId);
        const metrics = computeBatterFanGraphsMetrics(
          b.ab,
          b.h,
          b.doubles,
          b.triples,
          b.hr,
          b.bb,
          b.so,
          b.hbp,
          b.sf,
          pa
        );
        scoredItems.push({
          sortVolume: pa,
          item: {
            id: pid,
            name: b.name,
            avatarUrl: getPlayerHeadshotUrl(pid),
            teamId: b.teamId,
            teamAbbr: team.abbreviation,
            teamLogo: team.logoUrl,
            type: "batter",
            subtitle: `${team.abbreviation} • ${b.games} JJ • ${metrics.avg} AVG • ${b.hr} HR • ${metrics.ops} OPS`,
          },
        });
      }
    }

    if (pitRes.data && pitRes.data.length > 0) {
      const seenPitGame = new Set<string>();
      const pitGroup: Record<
        number,
        {
          name: string;
          teamId: number;
          latestDate: string;
          games: number;
          outs: number;
          so: number;
          er: number;
        }
      > = {};

      for (const row of pitRes.data as any[]) {
        const gObj = Array.isArray(row.games) ? row.games[0] : row.games;
        if (!isPlayedGameStatus(gObj?.status)) continue;
        if (!hasPitcherAppearance(row)) continue;

        const pid = Number(row.player_id);
        const gid = gObj?.id ?? row.game_id;
        if (gid != null) {
          const pgKey = `${pid}-${gid}`;
          if (seenPitGame.has(pgKey)) continue;
          seenPitGame.add(pgKey);
        }

        const pObj = Array.isArray(row.players) ? row.players[0] : row.players;
        const name = pObj?.full_name || `Lanzador #${pid}`;
        const gDate = gObj?.game_date || "";

        if (!pitGroup[pid]) {
          pitGroup[pid] = {
            name,
            teamId: Number(row.team_id),
            latestDate: gDate,
            games: 0,
            outs: 0,
            so: 0,
            er: 0,
          };
        } else if (gDate >= pitGroup[pid].latestDate) {
          pitGroup[pid].teamId = Number(row.team_id);
          pitGroup[pid].latestDate = gDate;
        }

        const p = pitGroup[pid];
        p.games += 1;
        p.outs += decimalInningsToOuts(Number(row.ip_decimal || 0));
        p.so += Number(row.so || 0);
        p.er += Number(row.er || 0);
      }

      for (const [pidStr, p] of Object.entries(pitGroup)) {
        const pid = parseInt(pidStr, 10);
        if (p.games < 1) continue;

        const team = getTeam(p.teamId);
        const ip = p.outs / 3;
        const era = ip > 0 ? formatEraWhip((p.er * 9) / ip) : p.er > 0 ? "INF" : "0.00";
        scoredItems.push({
          sortVolume: p.outs + p.games * 0.1,
          item: {
            id: pid,
            name: p.name,
            avatarUrl: getPlayerHeadshotUrl(pid),
            teamId: p.teamId,
            teamAbbr: team.abbreviation,
            teamLogo: team.logoUrl,
            type: "pitcher",
            subtitle: `${team.abbreviation} • ${p.games} JJ • ${outsToInningsDisplay(p.outs)} IP • ${p.so} K • ${era} ERA`,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error al consultar Supabase en getAllAvailablePlayersForSplits:", err);
  }

  // Ordenar: primero Leones del Caracas (695) por volumen real descendente, luego resto de LVBP alfabéticamente
  return scoredItems
    .sort((a, b) => {
      const aCar = a.item.teamId === 695;
      const bCar = b.item.teamId === 695;
      if (aCar && !bCar) return -1;
      if (!aCar && bCar) return 1;
      if (aCar && bCar && b.sortVolume !== a.sortVolume) {
        return b.sortVolume - a.sortVolume;
      }
      return a.item.name.localeCompare(b.item.name);
    })
    .map((entry) => entry.item);
}
