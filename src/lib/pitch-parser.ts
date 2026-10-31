import {
  PitchDetail,
  PitcherGameLog,
  PitchingBranch,
  StatcastPitchRow,
  PBPDestinationRow,
  PBPKPIs,
  InningWorkloadItem,
  PlatoonSplits,
  PitchingSplitRow,
  ContactProfileSummary,
  PitchingContextMetrics,
} from "@/types/pitching";
import { getPitchColor, parseIpToOuts, computeGSv2 } from "@/lib/pitching-constants";
import {
  RE24,
  encodeBaseState,
  calculateWinExpectancy,
  calculateLeverageIndex,
} from "@/lib/wpa-engine";
import { classifyHardness, transformCoordinates } from "@/lib/spray-engine";

export function sumInnings(ipStrings: (string | number)[]): {
  ipString: string;
  totalInningsFloat: number;
  totalOuts: number;
} {
  let totalOuts = 0;
  for (const s of ipStrings) {
    totalOuts += parseIpToOuts(s);
  }
  const fullInnings = Math.floor(totalOuts / 3);
  const remOuts = totalOuts % 3;
  return {
    ipString: `${fullInnings}.${remOuts}`,
    totalInningsFloat: totalOuts / 3,
    totalOuts,
  };
}

interface SplitAccumulator {
  key: string;
  label: string;
  bf: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  hbp: number;
  sf: number;
  so: number;
  firstPitches: number;
  firstPitchStrikes: number;
  pitches: number;
  calledStrikes: number;
  whiffs: number;
  swings: number;
}

function makeSplitAcc(key: string, label: string): SplitAccumulator {
  return {
    key,
    label,
    bf: 0,
    ab: 0,
    h: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    bb: 0,
    hbp: 0,
    sf: 0,
    so: 0,
    firstPitches: 0,
    firstPitchStrikes: 0,
    pitches: 0,
    calledStrikes: 0,
    whiffs: 0,
    swings: 0,
  };
}

function mergeSplitAcc(target: SplitAccumulator, src: SplitAccumulator): void {
  target.bf += src.bf;
  target.ab += src.ab;
  target.h += src.h;
  target.doubles += src.doubles;
  target.triples += src.triples;
  target.hr += src.hr;
  target.bb += src.bb;
  target.hbp += src.hbp;
  target.sf += src.sf;
  target.so += src.so;
  target.firstPitches += src.firstPitches;
  target.firstPitchStrikes += src.firstPitchStrikes;
  target.pitches += src.pitches;
  target.calledStrikes += src.calledStrikes;
  target.whiffs += src.whiffs;
  target.swings += src.swings;
}

function finalizeSplitRow(acc: SplitAccumulator): PitchingSplitRow {
  const avgVal = acc.ab > 0 ? acc.h / acc.ab : 0;
  const obpDenom = acc.ab + acc.bb + acc.hbp + acc.sf;
  const obpVal = obpDenom > 0 ? (acc.h + acc.bb + acc.hbp) / obpDenom : 0;
  const singles = Math.max(0, acc.h - acc.doubles - acc.triples - acc.hr);
  const tb = singles + 2 * acc.doubles + 3 * acc.triples + 4 * acc.hr;
  const slgVal = acc.ab > 0 ? tb / acc.ab : 0;
  const opsVal = obpVal + slgVal;

  const fmtRate = (v: number, denom: number) =>
    denom > 0 ? v.toFixed(3).replace(/^0/, "") : "—";

  const kPct = acc.bf > 0 ? Number(((acc.so / acc.bf) * 100).toFixed(1)) : 0;
  const bbPct = acc.bf > 0 ? Number(((acc.bb / acc.bf) * 100).toFixed(1)) : 0;
  const fStrikePct =
    acc.firstPitches > 0
      ? Number(((acc.firstPitchStrikes / acc.firstPitches) * 100).toFixed(1))
      : 0;
  const cswPct =
    acc.pitches > 0
      ? Number((((acc.calledStrikes + acc.whiffs) / acc.pitches) * 100).toFixed(1))
      : 0;
  const whiffPct =
    acc.swings > 0 ? Number(((acc.whiffs / acc.swings) * 100).toFixed(1)) : 0;

  return {
    key: acc.key,
    label: acc.label,
    bf: acc.bf,
    ab: acc.ab,
    h: acc.h,
    doubles: acc.doubles,
    triples: acc.triples,
    hr: acc.hr,
    bb: acc.bb,
    hbp: acc.hbp,
    so: acc.so,
    avg: fmtRate(avgVal, acc.ab),
    obp: fmtRate(obpVal, obpDenom),
    slg: fmtRate(slgVal, acc.ab),
    ops: obpDenom > 0 || acc.ab > 0 ? opsVal.toFixed(3).replace(/^0/, "") : "—",
    kPct,
    bbPct,
    fStrikePct,
    cswPct,
    whiffPct,
    pitches: acc.pitches,
  };
}

interface RawContactCounters {
  bip: number;
  gb: number;
  ld: number;
  fb: number;
  pu: number;
  go: number;
  ao: number;
  hard: number;
  med: number;
  soft: number;
  evValues: number[];
  hardHitsStatcast: number;
  barrelsStatcast: number;
}

function makeContactCounters(): RawContactCounters {
  return {
    bip: 0,
    gb: 0,
    ld: 0,
    fb: 0,
    pu: 0,
    go: 0,
    ao: 0,
    hard: 0,
    med: 0,
    soft: 0,
    evValues: [],
    hardHitsStatcast: 0,
    barrelsStatcast: 0,
  };
}

function isStatcastBarrel(ev: number, la: number): boolean {
  if (!Number.isFinite(ev) || !Number.isFinite(la) || ev < 98) return false;
  const minAngle = Math.max(8, 26 - (ev - 98));
  const maxAngle = Math.min(50, 30 + (ev - 98) * 1.11);
  return la >= minAngle && la <= maxAngle;
}

function finalizeContactProfile(
  c: RawContactCounters,
  allowOpticalStatcast: boolean
): ContactProfileSummary {
  const bip = c.bip;
  const pct = (n: number) => (bip > 0 ? Number(((n / bip) * 100).toFixed(1)) : 0);
  const goAoRatio =
    c.ao > 0 ? (c.go / c.ao).toFixed(2) : c.go > 0 ? `${c.go}.00` : "—";

  const hasEv = allowOpticalStatcast && c.evValues.length > 0;
  const avgEv = hasEv
    ? Number((c.evValues.reduce((a, b) => a + b, 0) / c.evValues.length).toFixed(1))
    : null;
  const maxEv = hasEv ? Number(Math.max(...c.evValues).toFixed(1)) : null;
  const hardHitPct = hasEv
    ? Number(((c.hardHitsStatcast / c.evValues.length) * 100).toFixed(1))
    : null;
  const barrelPct = hasEv
    ? Number(((c.barrelsStatcast / c.evValues.length) * 100).toFixed(1))
    : null;

  return {
    bip,
    gb: c.gb,
    ld: c.ld,
    fb: c.fb,
    pu: c.pu,
    gbPct: pct(c.gb),
    ldPct: pct(c.ld),
    fbPct: pct(c.fb),
    puPct: pct(c.pu),
    goAoRatio,
    hard: c.hard,
    med: c.med,
    soft: c.soft,
    hardPct: pct(c.hard),
    medPct: pct(c.med),
    softPct: pct(c.soft),
    avgEv,
    maxEv,
    hardHitPct,
    barrelPct,
  };
}

export interface ParsedPitcherBoxscoreExtract {
  isHome: boolean;
  isStarter: boolean;
  decision: "W" | "L" | "SV" | "HLD" | "";
  ip: string;
  outs: number;
  bf: number;
  ab: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  ibb: number;
  so: number;
  hr: number;
  hbp: number;
  wp: number;
  pitches: number;
  strikes: number;
  go: number;
  ao: number;
  ir: number;
  irs: number;
  gsv2: number;
  isQS: boolean;
}

export interface ParsedPitcherGameTelemetry {
  isFinal: boolean;
  hasStatcast: boolean;
  pitches: PitchDetail[];
  totalPitches: number;
  strikesCount: number;
  cswPctNum: number;
  whiffPctNum: number;
  fStrikePctNum: number;
  cswPctStr: string;
  whiffPctStr: string;
  pbpKpis: PBPKPIs;
  pbpTable: PBPDestinationRow[];
  statcastTable: StatcastPitchRow[];
  inningsWorkload: InningWorkloadItem[];
  splitsPlatoon: PlatoonSplits;
  situationalSplits: PitchingSplitRow[];
  ttoSplits: PitchingSplitRow[];
  contactProfile: ContactProfileSummary;
  contextMetrics: PitchingContextMetrics;
  boxExtract: ParsedPitcherBoxscoreExtract | null;
  // Raw accumulators for exact multi-game season aggregation
  _raw: {
    splits: Record<string, SplitAccumulator>;
    tto: Record<string, SplitAccumulator>;
    contact: RawContactCounters;
    liSum: number;
    liCount: number;
    twoStrikePitches: number;
    twoStrikeK: number;
  };
}

function classifyPAEvent(
  eventTypeRaw: string,
  accList: SplitAccumulator[]
): void {
  const et = (eventTypeRaw || "").toLowerCase();
  if (!et || et === "no_pitch" || et.includes("caught_stealing") || et.includes("pickoff") || et.includes("wild_pitch") || et.includes("passed_ball") || et.includes(" balk") || et === "balk" || et.includes("stolen_base") || et.includes("other_advance")) {
    return;
  }

  const isWalk = et === "walk" || et === "intent_walk";
  const isHbp = et === "hit_by_pitch";
  const isSacFly = et.includes("sac_fly");
  const isSacBunt = et.includes("sac_bunt");
  const isCatcherInterf = et.includes("catcher_interf");
  const isHit = et === "single" || et === "double" || et === "triple" || et === "home_run";
  const isSo = et.includes("strikeout");
  const isAb = !isWalk && !isHbp && !isSacFly && !isSacBunt && !isCatcherInterf;

  for (const acc of accList) {
    acc.bf += 1;
    if (isAb) acc.ab += 1;
    if (isHit) acc.h += 1;
    if (et === "double") acc.doubles += 1;
    if (et === "triple") acc.triples += 1;
    if (et === "home_run") acc.hr += 1;
    if (isWalk) acc.bb += 1;
    if (isHbp) acc.hbp += 1;
    if (isSacFly) acc.sf += 1;
    if (isSo) acc.so += 1;
  }
}

export function buildDerivedPitchTables(
  parsedPitches: PitchDetail[],
  branch: PitchingBranch,
  twoStrikePitches: number,
  twoStrikeK: number,
  firstPitchesCount: number,
  firstPitchStrikesCount: number
) {
  const totalPitches = parsedPitches.length;
  const rawHasStatcast = parsedPitches.some(
    (p) => p.speed !== null && (p.ivb !== null || p.spin !== null || p.plateX !== null)
  );
  // Strict sensor separation (GEMINI.md §1.1.1): LVBP NEVER exposes optical Statcast
  const hasStatcast = branch === "mlb" && rawHasStatcast;

  const ballsCount = parsedPitches.filter((p) => p.isBall).length;
  const strikesCount = totalPitches - ballsCount;
  const calledCount = parsedPitches.filter((p) => p.isCalled).length;
  const whiffsCount = parsedPitches.filter((p) => p.isWhiff).length;
  const foulsCount = parsedPitches.filter((p) => p.isFoul).length;
  const inPlayCount = parsedPitches.filter((p) => p.isInPlay).length;
  const swingsCount = whiffsCount + foulsCount + inPlayCount;

  const strikePct = totalPitches > 0 ? (strikesCount / totalPitches) * 100 : 0;
  const cswPct = totalPitches > 0 ? ((calledCount + whiffsCount) / totalPitches) * 100 : 0;
  const whiffPct = swingsCount > 0 ? (whiffsCount / swingsCount) * 100 : 0;
  const swStrPct = totalPitches > 0 ? (whiffsCount / totalPitches) * 100 : 0;
  const fpsPct =
    firstPitchesCount > 0 ? (firstPitchStrikesCount / firstPitchesCount) * 100 : 0;
  const putAwayPct =
    twoStrikePitches > 0 ? (twoStrikeK / twoStrikePitches) * 100 : 0;

  // Optical zone discipline (MLB only)
  const coordPitches = hasStatcast
    ? parsedPitches.filter((p) => p.plateX !== null && p.plateZ !== null)
    : [];
  const outOfZonePitches = coordPitches.filter((p) => !p.isZone);
  const outOfZoneSwings = outOfZonePitches.filter(
    (p) => p.isWhiff || p.isFoul || p.isInPlay
  );
  const inZonePitches = coordPitches.filter((p) => p.isZone);
  const inZoneSwings = inZonePitches.filter(
    (p) => p.isWhiff || p.isFoul || p.isInPlay
  );
  const inZoneContacts = inZoneSwings.filter((p) => !p.isWhiff);

  const chasePctVal =
    outOfZonePitches.length > 0
      ? (outOfZoneSwings.length / outOfZonePitches.length) * 100
      : null;
  const zContactPctVal =
    inZoneSwings.length > 0
      ? (inZoneContacts.length / inZoneSwings.length) * 100
      : null;

  const pbpTable: PBPDestinationRow[] = [
    {
      destination: "Bolas",
      count: ballsCount,
      pct: `${totalPitches > 0 ? ((ballsCount / totalPitches) * 100).toFixed(1) : "0.0"}%`,
      color: "#3B82F6",
    },
    {
      destination: "Strikes Cantados",
      count: calledCount,
      pct: `${totalPitches > 0 ? ((calledCount / totalPitches) * 100).toFixed(1) : "0.0"}%`,
      color: "#10B981",
    },
    {
      destination: "Strikes Abanicados (Whiff)",
      count: whiffsCount,
      pct: `${totalPitches > 0 ? ((whiffsCount / totalPitches) * 100).toFixed(1) : "0.0"}%`,
      color: "#FDB827",
    },
    {
      destination: "Fouls",
      count: foulsCount,
      pct: `${totalPitches > 0 ? ((foulsCount / totalPitches) * 100).toFixed(1) : "0.0"}%`,
      color: "#F59E0B",
    },
    {
      destination: "En Juego (Out / Hit)",
      count: inPlayCount,
      pct: `${totalPitches > 0 ? ((inPlayCount / totalPitches) * 100).toFixed(1) : "0.0"}%`,
      color: "#8B5CF6",
    },
  ];

  const pbpKpis: PBPKPIs = {
    totalPitches,
    strikes: strikesCount,
    balls: ballsCount,
    strikePct: `${strikePct.toFixed(1)}%`,
    cswPct: `${cswPct.toFixed(1)}%`,
    whiffPct: `${whiffPct.toFixed(1)}%`,
    fpsPct: `${fpsPct.toFixed(1)}%`,
    swStrPct: `${swStrPct.toFixed(1)}%`,
    putAwayPct: `${putAwayPct.toFixed(1)}%`,
    twoStrikePitches,
    twoStrikeK,
    chasePct: chasePctVal !== null ? `${chasePctVal.toFixed(1)}%` : undefined,
    zContactPct: zContactPctVal !== null ? `${zContactPctVal.toFixed(1)}%` : undefined,
    swings: swingsCount,
    calledStrikes: calledCount,
    fouls: foulsCount,
    inPlay: inPlayCount,
  };

  // Carga y LI real por entrada
  const byInning = new Map<number, PitchDetail[]>();
  for (const p of parsedPitches) {
    const list = byInning.get(p.inning) || [];
    list.push(p);
    byInning.set(p.inning, list);
  }

  const inningsWorkload: InningWorkloadItem[] = Array.from(byInning.keys())
    .sort((a, b) => a - b)
    .map((inn) => {
      const pList = byInning.get(inn)!;
      const tot = pList.length;
      const strk = pList.filter((p) => p.isStrike).length;
      const whf = pList.filter((p) => p.isWhiff).length;
      const lis = pList.map((p) => p.leverageIndex);
      const avgLi = lis.length > 0 ? lis.reduce((a, b) => a + b, 0) / lis.length : 1.0;

      return {
        inning: inn,
        pitches: tot,
        strikes: strk,
        balls: tot - strk,
        whiffs: whf,
        avgLi: Math.round(avgLi * 100) / 100,
      };
    });

  // Platoon pitch rates
  const calcPlatoon = (list: PitchDetail[]) => {
    const tot = list.length;
    if (tot === 0) {
      return { pitches: 0, cswPct: "0.0%", whiffPct: "0.0%", strikePct: "0.0%" };
    }
    const s = list.filter((p) => p.isStrike).length;
    const c = list.filter((p) => p.isCalled).length;
    const w = list.filter((p) => p.isWhiff).length;
    const sw = list.filter((p) => p.isWhiff || p.isFoul || p.isInPlay).length;
    return {
      pitches: tot,
      cswPct: `${(((c + w) / tot) * 100).toFixed(1)}%`,
      whiffPct: `${sw > 0 ? ((w / sw) * 100).toFixed(1) : "0.0"}%`,
      strikePct: `${((s / tot) * 100).toFixed(1)}%`,
    };
  };

  const splitsPlatoon: PlatoonSplits = {
    vsLhb: calcPlatoon(parsedPitches.filter((p) => p.stand === "L")),
    vsRhb: calcPlatoon(parsedPitches.filter((p) => p.stand === "R")),
  };

  // Arsenal / Statcast Table (solo cuando hay tipos de pitcheo reales en MLB)
  const statcastMap = new Map<string, PitchDetail[]>();
  for (const p of parsedPitches) {
    const list = statcastMap.get(p.pitchName) || [];
    list.push(p);
    statcastMap.set(p.pitchName, list);
  }

  const statcastTable: StatcastPitchRow[] = hasStatcast
    ? Array.from(statcastMap.entries())
        .map(([pName, pList]) => {
          const cnt = pList.length;
          const usageVal = totalPitches > 0 ? (cnt / totalPitches) * 100 : 0;
          const speeds = pList.map((p) => p.speed).filter((v): v is number => v !== null);
          const spins = pList.map((p) => p.spin).filter((v): v is number => v !== null);
          const ivbs = pList.map((p) => p.ivb).filter((v): v is number => v !== null);
          const hbs = pList.map((p) => p.hb).filter((v): v is number => v !== null);
          const exts = pList
            .map((p) => p.ext ?? null)
            .filter((v): v is number => v !== null);

          const veloAvg =
            speeds.length > 0
              ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10
              : "—";
          const veloMax = speeds.length > 0 ? Math.max(...speeds) : "—";
          const spinAvg =
            spins.length > 0
              ? Math.round(spins.reduce((a, b) => a + b, 0) / spins.length)
              : "—";
          const ivbAvg =
            ivbs.length > 0
              ? Math.round((ivbs.reduce((a, b) => a + b, 0) / ivbs.length) * 10) / 10
              : "—";
          const hbAvg =
            hbs.length > 0
              ? Math.round((hbs.reduce((a, b) => a + b, 0) / hbs.length) * 10) / 10
              : "—";
          const extAvg =
            exts.length > 0
              ? Math.round((exts.reduce((a, b) => a + b, 0) / exts.length) * 10) / 10
              : "—";

          const sw = pList.filter((p) => p.isWhiff || p.isFoul || p.isInPlay).length;
          const w = pList.filter((p) => p.isWhiff).length;
          const c = pList.filter((p) => p.isCalled).length;
          const withCoords = pList.filter((p) => p.plateX !== null && p.plateZ !== null);
          const z = withCoords.filter((p) => p.isZone);
          const ooz = withCoords.filter((p) => !p.isZone);
          const oozSw = ooz.filter((p) => p.isWhiff || p.isFoul || p.isInPlay);
          const zSw = z.filter((p) => p.isWhiff || p.isFoul || p.isInPlay);
          const zContact = zSw.filter((p) => !p.isWhiff);

          const whiffP = sw > 0 ? (w / sw) * 100 : 0;
          const cswP = cnt > 0 ? ((c + w) / cnt) * 100 : 0;
          const zoneP = withCoords.length > 0 ? (z.length / withCoords.length) * 100 : 0;
          const chaseP = ooz.length > 0 ? (oozSw.length / ooz.length) * 100 : 0;
          const zConP = zSw.length > 0 ? (zContact.length / zSw.length) * 100 : 0;

          return {
            pitchName: pName,
            pitchType: pList[0]?.pitchType || "UN",
            count: cnt,
            usagePct: `${usageVal.toFixed(1)}%`,
            usageVal,
            veloAvg,
            veloMax,
            spinAvg,
            ivb: ivbAvg,
            hb: hbAvg,
            extAvg,
            whiffPct: `${whiffP.toFixed(1)}%`,
            cswPct: `${cswP.toFixed(1)}%`,
            zonePct: `${zoneP.toFixed(1)}%`,
            chasePct: `${chaseP.toFixed(1)}%`,
            zContactPct: `${zConP.toFixed(1)}%`,
            color: getPitchColor(pName, pList[0]?.pitchType),
          };
        })
        .sort((a, b) => b.usageVal - a.usageVal)
    : [];

  return {
    totalPitches,
    hasStatcast,
    strikesCount,
    cswPctNum: Number(cswPct.toFixed(1)),
    whiffPctNum: Number(whiffPct.toFixed(1)),
    fStrikePctNum: Number(fpsPct.toFixed(1)),
    cswPctStr: `${cswPct.toFixed(1)}%`,
    whiffPctStr: `${whiffPct.toFixed(1)}%`,
    pbpKpis,
    pbpTable,
    statcastTable,
    inningsWorkload,
    splitsPlatoon,
  };
}

/**
 * Máquina de estados cronológica pre-jugada para un lanzador sobre `game/{gamePk}/feed/live`.
 */
export function parsePitcherFromLiveFeed(
  liveData: Record<string, any>,
  pitcherId: number,
  branch: PitchingBranch = "lvbp"
): ParsedPitcherGameTelemetry {
  const allPlays: any[] = liveData?.liveData?.plays?.allPlays || [];
  const abstractState = String(liveData?.gameData?.status?.abstractGameState || "");
  const isFinal = abstractState.toLowerCase() === "final";

  const parsedPitches: PitchDetail[] = [];
  let pNum = 1;

  const splits: Record<string, SplitAccumulator> = {
    vsLhb: makeSplitAcc("vsLhb", "vs Zurdos (LHB)"),
    vsRhb: makeSplitAcc("vsRhb", "vs Derechos (RHB)"),
    risp: makeSplitAcc("risp", "Con RISP (2B/3B)"),
    basesEmpty: makeSplitAcc("basesEmpty", "Bases Limpias"),
  };

  const tto: Record<string, SplitAccumulator> = {
    tto1: makeSplitAcc("tto1", "1ra Vuelta al Orden"),
    tto2: makeSplitAcc("tto2", "2da Vuelta al Orden"),
    tto3: makeSplitAcc("tto3", "3ra+ Vuelta al Orden"),
  };

  const contact = makeContactCounters();
  const batterPaCountsAgainstPitcher = new Map<number, number>();

  let currentHalfKey = "";
  let outsBefore = 0;
  let on1b = false;
  let on2b = false;
  let on3b = false;
  let homeScoreBefore = 0;
  let awayScoreBefore = 0;
  let halfPlayIdx = 0;

  let totalWpa = 0;
  let totalRe24 = 0;
  let liSum = 0;
  let liCount = 0;
  let gmLI: number | null = null;
  let twoStrikePitches = 0;
  let twoStrikeK = 0;
  let firstPitchesCount = 0;
  let firstPitchStrikesCount = 0;

  for (const play of allPlays) {
    const about = play.about || {};
    const inning = Number(about.inning || 1);
    const isTopInning = Boolean(about.isTopInning);
    const isBottom = !isTopInning;
    const halfKey = `${inning}-${isTopInning ? "T" : "B"}`;

    if (halfKey !== currentHalfKey) {
      currentHalfKey = halfKey;
      outsBefore = 0;
      on1b = false;
      on2b = false;
      on3b = false;
      halfPlayIdx = 0;
    }

    // Corredor automático en entradas extra (inicio de media entrada)
    if (halfPlayIdx === 0 && outsBefore === 0 && Array.isArray(play.runners)) {
      for (const r of play.runners) {
        const orig = r?.movement?.originBase;
        if (orig === "2B") on2b = true;
        if (orig === "1B") on1b = true;
        if (orig === "3B") on3b = true;
      }
    }
    halfPlayIdx += 1;

    const baseBefore = encodeBaseState(on1b, on2b, on3b);
    const isRispBefore = on2b || on3b;
    const isEmptyBefore = baseBefore === 0;

    // Estado posterior a la jugada para avanzar la máquina de estados del partido
    const outsAfterRaw =
      typeof play.count?.outs === "number" ? Number(play.count.outs) : outsBefore;
    const outsAfter = Math.min(3, Math.max(0, outsAfterRaw));
    const homeScoreAfter =
      typeof play.result?.homeScore === "number"
        ? Number(play.result.homeScore)
        : homeScoreBefore;
    const awayScoreAfter =
      typeof play.result?.awayScore === "number"
        ? Number(play.result.awayScore)
        : awayScoreBefore;

    const matchup = play.matchup || {};
    let nextOn1b = false;
    let nextOn2b = false;
    let nextOn3b = false;

    if (outsAfter < 3) {
      if (
        "postOnFirst" in matchup ||
        "postOnSecond" in matchup ||
        "postOnThird" in matchup
      ) {
        nextOn1b = Boolean(matchup.postOnFirst);
        nextOn2b = Boolean(matchup.postOnSecond);
        nextOn3b = Boolean(matchup.postOnThird);
      } else if (Array.isArray(play.runners)) {
        for (const r of play.runners) {
          if (r?.movement?.isOut) continue;
          const endBase = r?.movement?.end;
          if (endBase === "1B") nextOn1b = true;
          else if (endBase === "2B") nextOn2b = true;
          else if (endBase === "3B") nextOn3b = true;
        }
      }
    }

    // Procesar solo turnos enfrentados por nuestro lanzador objetivo
    if (matchup.pitcher?.id === pitcherId) {
      const stand: "L" | "R" = matchup.batSide?.code === "L" ? "L" : "R";
      const batterId = Number(matchup.batter?.id || 0);
      const eventType = String(play.result?.eventType || "");
      const eventName = String(play.result?.event || "");

      const li = calculateLeverageIndex(
        inning,
        isBottom,
        outsBefore,
        baseBefore,
        homeScoreBefore,
        awayScoreBefore
      );
      if (gmLI === null) {
        gmLI = li;
      }

      // Contabilizar turno (PA) completo
      const isCompletePA = about.isComplete !== false && Boolean(eventType);
      let activeAccs: SplitAccumulator[] = [
        stand === "L" ? splits.vsLhb : splits.vsRhb,
      ];
      if (isRispBefore) activeAccs.push(splits.risp);
      if (isEmptyBefore) activeAccs.push(splits.basesEmpty);

      if (isCompletePA) {
        const nextCount = (batterPaCountsAgainstPitcher.get(batterId) || 0) + 1;
        if (batterId > 0) batterPaCountsAgainstPitcher.set(batterId, nextCount);
        const ttoBucket =
          nextCount <= 1 ? tto.tto1 : nextCount === 2 ? tto.tto2 : tto.tto3;
        activeAccs = [...activeAccs, ttoBucket];

        classifyPAEvent(eventType, activeAccs);

        // Delta RE24 y WPA desde la óptica del lanzador
        const baseAfter = outsAfter >= 3 ? 0 : encodeBaseState(nextOn1b, nextOn2b, nextOn3b);
        const reBefore = RE24[`${Math.min(2, outsBefore)},${baseBefore}`] ?? 0;
        const reAfter =
          outsAfter >= 3 ? 0 : RE24[`${Math.min(2, outsAfter)},${baseAfter}`] ?? 0;
        const battingRunsScored = isTopInning
          ? Math.max(0, awayScoreAfter - awayScoreBefore)
          : Math.max(0, homeScoreAfter - homeScoreBefore);

        const pitcherRe24Delta = reBefore - (reAfter + battingRunsScored);
        totalRe24 += pitcherRe24Delta;

        const weHomeBefore = calculateWinExpectancy(
          inning,
          isBottom,
          outsBefore,
          baseBefore,
          homeScoreBefore,
          awayScoreBefore
        );

        let weHomeAfter: number;
        if (inning >= 9 && isBottom && homeScoreAfter > awayScoreAfter) {
          weHomeAfter = 1.0;
        } else if (outsAfter >= 3) {
          if (!isBottom) {
            weHomeAfter = calculateWinExpectancy(
              inning,
              true,
              0,
              0,
              homeScoreAfter,
              awayScoreAfter
            );
          } else if (inning >= 9 && homeScoreAfter !== awayScoreAfter) {
            weHomeAfter = homeScoreAfter > awayScoreAfter ? 1.0 : 0.0;
          } else {
            weHomeAfter = calculateWinExpectancy(
              inning + 1,
              false,
              0,
              0,
              homeScoreAfter,
              awayScoreAfter
            );
          }
        } else {
          weHomeAfter = calculateWinExpectancy(
            inning,
            isBottom,
            outsAfter,
            baseAfter,
            homeScoreAfter,
            awayScoreAfter
          );
        }

        const isPitcherHome = isTopInning;
        const pitcherWpaDelta = isPitcherHome
          ? weHomeAfter - weHomeBefore
          : -(weHomeAfter - weHomeBefore);
        totalWpa += pitcherWpaDelta;

        liSum += li;
        liCount += 1;
      }

      // Recorrer pitcheos individuales con conteo pre-pitcheo determinístico
      const events: any[] = play.playEvents || [];
      const pitchEvents = events.filter((e) => e.isPitch);
      let paBalls = 0;
      let paStrikes = 0;

      pitchEvents.forEach((ev, idx) => {
        const isLastPitchOfPA = idx === pitchEvents.length - 1;
        const ballsBeforePitch = paBalls;
        const strikesBeforePitch = paStrikes;

        const pdata = ev.pitchData || {};
        const det = ev.details || {};
        const coords = pdata.coordinates || {};

        const speed =
          pdata.startSpeed !== undefined && pdata.startSpeed !== null
            ? Number(pdata.startSpeed)
            : null;
        const spin =
          pdata.spinRate !== undefined && pdata.spinRate !== null
            ? Number(pdata.spinRate)
            : null;
        const ext =
          pdata.extension !== undefined && pdata.extension !== null
            ? Math.round(Number(pdata.extension) * 10) / 10
            : null;

        const pfxZ =
          coords.pfxZ !== undefined && coords.pfxZ !== null ? Number(coords.pfxZ) : null;
        const pfxX =
          coords.pfxX !== undefined && coords.pfxX !== null ? Number(coords.pfxX) : null;

        const ivb = pfxZ !== null ? Math.round(pfxZ * 12 * 10) / 10 : null;
        const hb = pfxX !== null ? Math.round(pfxX * 12 * 10) / 10 : null;

        // En MLB Stats API Hawk-Eye usa pX y pZ en pies
        const rawPx = coords.pX ?? coords.plateX ?? null;
        const rawPz = coords.pZ ?? coords.plateZ ?? null;
        const px = rawPx !== null ? Number(rawPx) : null;
        const pz = rawPz !== null ? Number(rawPz) : null;

        const szTop = Number(pdata.strikeZoneTop || 3.45);
        const szBot = Number(pdata.strikeZoneBottom || 1.55);

        const pTypeDesc = det.type?.description || det.type?.code || "Pitcheo";
        const pTypeCode = det.type?.code || "UN";
        const desc = String(det.description || "").toLowerCase();

        const isWhiff =
          desc.includes("swinging strike") ||
          desc.includes("missed") ||
          desc.includes("whiff") ||
          desc.includes("foul tip");
        const isCalled = desc.includes("called strike");
        const isFoul = desc.includes("foul") && !desc.includes("foul tip");
        const isInPlay = Boolean(det.isInPlay) || desc.includes("in play");
        const isBall =
          (Boolean(det.isBall) || desc.includes("ball") || desc.includes("hit by pitch")) &&
          !isWhiff &&
          !isCalled &&
          !isFoul &&
          !isInPlay;
        const isStrike =
          Boolean(det.isStrike) || isWhiff || isCalled || isFoul || isInPlay;

        const isSwing = isWhiff || isFoul || isInPlay;
        const isZone =
          px !== null &&
          pz !== null &&
          Math.abs(px) <= 0.85 &&
          pz >= szBot &&
          pz <= szTop;

        const isChase = px !== null && pz !== null && !isZone && isSwing;
        const isZoneContact = px !== null && pz !== null && isZone && isSwing && !isWhiff;

        // First-pitch strike (0-0 pre-pitch)
        if (ballsBeforePitch === 0 && strikesBeforePitch === 0) {
          firstPitchesCount += 1;
          if (isStrike) firstPitchStrikesCount += 1;
          for (const acc of activeAccs) {
            acc.firstPitches += 1;
            if (isStrike) acc.firstPitchStrikes += 1;
          }
        }

        // PutAway% (2-strike pitch conversion into K)
        if (strikesBeforePitch === 2) {
          twoStrikePitches += 1;
          if (
            isLastPitchOfPA &&
            eventType.toLowerCase().includes("strikeout")
          ) {
            twoStrikeK += 1;
          }
        }

        for (const acc of activeAccs) {
          acc.pitches += 1;
          if (isCalled) acc.calledStrikes += 1;
          if (isWhiff) acc.whiffs += 1;
          if (isSwing) acc.swings += 1;
        }

        // Avanzar conteo de bolas y strikes para el siguiente pitcheo del PA
        if (isBall) {
          paBalls = Math.min(3, paBalls + 1);
        } else if (isFoul) {
          if (paStrikes < 2) paStrikes += 1;
        } else if (isCalled || isWhiff) {
          paStrikes = Math.min(2, paStrikes + 1);
        }

        // Perfil de Contacto BIS + Statcast opcional en pitcheo puesto en juego
        if (isInPlay || ev.hitData) {
          const hd = ev.hitData || {};
          const traj = String(hd.trajectory || "").toLowerCase();
          const rawHard = String(hd.hardness || "medium").toLowerCase();
          const hCoords = hd.coordinates || {};
          const { distFt } = transformCoordinates(
            hCoords.coordX ?? null,
            hCoords.coordY ?? null
          );

          if (traj || isInPlay) {
            contact.bip += 1;
            if (traj === "ground_ball" || traj.includes("bunt")) {
              contact.gb += 1;
              if (!["Single", "Double", "Triple", "Home Run"].includes(eventName)) {
                contact.go += 1;
              }
            } else if (traj === "line_drive") {
              contact.ld += 1;
              if (!["Single", "Double", "Triple", "Home Run"].includes(eventName)) {
                contact.ao += 1;
              }
            } else if (traj === "popup") {
              contact.pu += 1;
              if (!["Single", "Double", "Triple", "Home Run"].includes(eventName)) {
                contact.ao += 1;
              }
            } else {
              contact.fb += 1;
              if (!["Single", "Double", "Triple", "Home Run"].includes(eventName)) {
                contact.ao += 1;
              }
            }

            const bisHardness = classifyHardness(eventName, traj, distFt, rawHard);
            if (bisHardness === "hard") contact.hard += 1;
            else if (bisHardness === "soft") contact.soft += 1;
            else contact.med += 1;

            if (
              branch === "mlb" &&
              hd.launchSpeed !== undefined &&
              hd.launchSpeed !== null
            ) {
              const evMph = Number(hd.launchSpeed);
              const laDeg =
                hd.launchAngle !== undefined && hd.launchAngle !== null
                  ? Number(hd.launchAngle)
                  : NaN;
              if (Number.isFinite(evMph) && evMph > 0) {
                contact.evValues.push(evMph);
                if (evMph >= 95) contact.hardHitsStatcast += 1;
                if (isStatcastBarrel(evMph, laDeg)) contact.barrelsStatcast += 1;
              }
            }
          }
        }

        parsedPitches.push({
          pitchNumber: pNum++,
          pitchName: pTypeDesc,
          pitchType: pTypeCode,
          speed: speed !== null ? Math.round(speed * 10) / 10 : null,
          spin: spin !== null ? Math.round(spin) : null,
          ivb,
          hb,
          ext,
          plateX: px !== null ? Math.round(px * 100) / 100 : null,
          plateZ: pz !== null ? Math.round(pz * 100) / 100 : null,
          szTop,
          szBot,
          inning,
          stand,
          result: det.description || "Pitcheo",
          isWhiff,
          isCalled,
          isFoul,
          isInPlay,
          isBall,
          isStrike,
          isZone,
          isChase,
          isZoneContact,
          outs: outsBefore,
          strikes: strikesBeforePitch,
          balls: ballsBeforePitch,
          leverageIndex: li,
        });
      });
    }

    // Actualizar estado global de la media entrada tras la jugada
    outsBefore = outsAfter >= 3 ? 0 : outsAfter;
    on1b = nextOn1b;
    on2b = nextOn2b;
    on3b = nextOn3b;
    homeScoreBefore = homeScoreAfter;
    awayScoreBefore = awayScoreAfter;
  }

  // Extraer línea del Boxscore oficial si está presente
  const boxscoreTeams = liveData?.liveData?.boxscore?.teams || {};
  let boxExtract: ParsedPitcherBoxscoreExtract | null = null;
  for (const side of ["home", "away"] as const) {
    const pList: number[] = boxscoreTeams[side]?.pitchers || [];
    const pObj = boxscoreTeams[side]?.players?.[`ID${pitcherId}`];
    if (pObj?.stats?.pitching) {
      const st = pObj.stats.pitching;
      const isStarter = pList[0] === pitcherId || Number(st.gamesStarted || 0) > 0;
      const ipStr = String(st.inningsPitched || "0.0");
      const outs = Number(st.outs ?? parseIpToOuts(ipStr));
      const h = Number(st.hits || 0);
      const r = Number(st.runs || 0);
      const er = Number(st.earnedRuns || 0);
      const bb = Number(st.baseOnBalls || 0);
      const ibb = Number(st.intentionalWalks || 0);
      const so = Number(st.strikeOuts || 0);
      const hr = Number(st.homeRuns || 0);
      const hbp = Number(st.hitBatsmen || 0);
      const wp = Number(st.wildPitches || 0);
      const bf = Number(st.battersFaced || splits.vsLhb.bf + splits.vsRhb.bf);
      const ab = Number(st.atBats || splits.vsLhb.ab + splits.vsRhb.ab);
      const pitches = Number(st.numberOfPitches || parsedPitches.length);
      const strikes = Number(
        st.strikes || parsedPitches.filter((p) => p.isStrike).length
      );
      const go = Number(st.groundOuts ?? contact.go);
      const ao = Number(st.airOuts ?? contact.ao);
      const ir = Number(st.inheritedRunners || 0);
      const irs = Number(st.inheritedRunnersScored || 0);

      if (st.groundOuts !== undefined) contact.go = go;
      if (st.airOuts !== undefined) contact.ao = ao;

      const decisions = liveData?.liveData?.decisions || {};
      let decision: "W" | "L" | "SV" | "HLD" | "" = "";
      if (decisions.winner?.id === pitcherId) decision = "W";
      else if (decisions.loser?.id === pitcherId) decision = "L";
      else if (decisions.save?.id === pitcherId) decision = "SV";
      else if (
        Array.isArray(decisions.holds) &&
        decisions.holds.some((hItem: any) => hItem.id === pitcherId)
      ) {
        decision = "HLD";
      }

      const gsv2 = computeGSv2({ outs, so, bb, h, er, hr });
      const isQS = isStarter && outs >= 18 && er <= 3;

      boxExtract = {
        isHome: side === "home",
        isStarter,
        decision,
        ip: ipStr,
        outs,
        bf,
        ab,
        h,
        r,
        er,
        bb,
        ibb,
        so,
        hr,
        hbp,
        wp,
        pitches,
        strikes,
        go,
        ao,
        ir,
        irs,
        gsv2,
        isQS,
      };
      break;
    }
  }

  const derived = buildDerivedPitchTables(
    parsedPitches,
    branch,
    twoStrikePitches,
    twoStrikeK,
    firstPitchesCount,
    firstPitchStrikesCount
  );

  const aLI =
    liCount > 0 ? Math.round((liSum / liCount) * 100) / 100 : gmLI ?? 1.0;
  const ir = boxExtract?.ir ?? 0;
  const irs = boxExtract?.irs ?? 0;

  const contextMetrics: PitchingContextMetrics = {
    wpa: Math.round(totalWpa * 1000) / 1000,
    re24: Math.round(totalRe24 * 100) / 100,
    aLI,
    gmLI: gmLI !== null ? Math.round(gmLI * 100) / 100 : 1.0,
    gsv2: boxExtract ? boxExtract.gsv2 : null,
    isQS: boxExtract ? boxExtract.isQS : false,
    ir,
    irs,
    irsPct: ir > 0 ? Number(((irs / ir) * 100).toFixed(1)) : null,
  };

  const situationalSplits: PitchingSplitRow[] = [
    finalizeSplitRow(splits.vsLhb),
    finalizeSplitRow(splits.vsRhb),
    finalizeSplitRow(splits.risp),
    finalizeSplitRow(splits.basesEmpty),
  ];

  const ttoSplits: PitchingSplitRow[] = [
    finalizeSplitRow(tto.tto1),
    finalizeSplitRow(tto.tto2),
    finalizeSplitRow(tto.tto3),
  ];

  return {
    isFinal,
    hasStatcast: derived.hasStatcast,
    pitches: parsedPitches,
    totalPitches: derived.totalPitches,
    strikesCount: derived.strikesCount,
    cswPctNum: derived.cswPctNum,
    whiffPctNum: derived.whiffPctNum,
    fStrikePctNum: derived.fStrikePctNum,
    cswPctStr: derived.cswPctStr,
    whiffPctStr: derived.whiffPctStr,
    pbpKpis: derived.pbpKpis,
    pbpTable: derived.pbpTable,
    statcastTable: derived.statcastTable,
    inningsWorkload: derived.inningsWorkload,
    splitsPlatoon: derived.splitsPlatoon,
    situationalSplits,
    ttoSplits,
    contactProfile: finalizeContactProfile(contact, derived.hasStatcast),
    contextMetrics,
    boxExtract,
    _raw: {
      splits,
      tto,
      contact,
      liSum,
      liCount,
      twoStrikePitches,
      twoStrikeK,
    },
  };
}

/**
 * Consolida múltiples salidas parseadas en un resumen acumulado de temporada (sin heurísticas).
 */
export function aggregatePitcherTelemetries(
  items: Array<{ telemetry: ParsedPitcherGameTelemetry; isHome?: boolean }>,
  branch: PitchingBranch
) {
  const allPitches: PitchDetail[] = [];
  let pNum = 1;

  const vsLhb = makeSplitAcc("vsLhb", "vs Zurdos (LHB)");
  const vsRhb = makeSplitAcc("vsRhb", "vs Derechos (RHB)");
  const risp = makeSplitAcc("risp", "Con RISP (2B/3B)");
  const homeAcc = makeSplitAcc("home", "En Casa (Local)");
  const awayAcc = makeSplitAcc("away", "De Visita (Ruta)");

  const tto1 = makeSplitAcc("tto1", "1ra Vuelta al Orden");
  const tto2 = makeSplitAcc("tto2", "2da Vuelta al Orden");
  const tto3 = makeSplitAcc("tto3", "3ra+ Vuelta al Orden");

  const contact = makeContactCounters();

  let wpaSum = 0;
  let re24Sum = 0;
  let liSum = 0;
  let liCount = 0;
  let gmLiSum = 0;
  let gmLiCount = 0;
  let twoStrikePitches = 0;
  let twoStrikeK = 0;
  let firstPitches = 0;
  let firstPitchStrikes = 0;

  let qsCount = 0;
  let gsCount = 0;
  const starterGsv2s: number[] = [];
  let irSum = 0;
  let irsSum = 0;
  let shutdowns = 0;
  let meltdowns = 0;

  for (const { telemetry, isHome } of items) {
    for (const p of telemetry.pitches) {
      allPitches.push({ ...p, pitchNumber: pNum++ });
    }

    const r = telemetry._raw;
    mergeSplitAcc(vsLhb, r.splits.vsLhb);
    mergeSplitAcc(vsRhb, r.splits.vsRhb);
    mergeSplitAcc(risp, r.splits.risp);

    const resolvedIsHome = isHome ?? telemetry.boxExtract?.isHome ?? true;
    const gameTotalAcc = resolvedIsHome ? homeAcc : awayAcc;
    mergeSplitAcc(gameTotalAcc, r.splits.vsLhb);
    mergeSplitAcc(gameTotalAcc, r.splits.vsRhb);

    mergeSplitAcc(tto1, r.tto.tto1);
    mergeSplitAcc(tto2, r.tto.tto2);
    mergeSplitAcc(tto3, r.tto.tto3);

    contact.bip += r.contact.bip;
    contact.gb += r.contact.gb;
    contact.ld += r.contact.ld;
    contact.fb += r.contact.fb;
    contact.pu += r.contact.pu;
    contact.go += r.contact.go;
    contact.ao += r.contact.ao;
    contact.hard += r.contact.hard;
    contact.med += r.contact.med;
    contact.soft += r.contact.soft;
    contact.evValues.push(...r.contact.evValues);
    contact.hardHitsStatcast += r.contact.hardHitsStatcast;
    contact.barrelsStatcast += r.contact.barrelsStatcast;

    wpaSum += telemetry.contextMetrics.wpa;
    re24Sum += telemetry.contextMetrics.re24;
    liSum += r.liSum;
    liCount += r.liCount;
    gmLiSum += telemetry.contextMetrics.gmLI;
    gmLiCount += 1;

    twoStrikePitches += r.twoStrikePitches;
    twoStrikeK += r.twoStrikeK;
    firstPitches += r.splits.vsLhb.firstPitches + r.splits.vsRhb.firstPitches;
    firstPitchStrikes +=
      r.splits.vsLhb.firstPitchStrikes + r.splits.vsRhb.firstPitchStrikes;

    const bx = telemetry.boxExtract;
    if (bx) {
      if (bx.isStarter) {
        gsCount += 1;
        if (bx.isQS) qsCount += 1;
        starterGsv2s.push(bx.gsv2);
      } else {
        irSum += bx.ir;
        irsSum += bx.irs;
        if (telemetry.contextMetrics.wpa >= 0.06) shutdowns += 1;
        if (telemetry.contextMetrics.wpa <= -0.06) meltdowns += 1;
      }
    }
  }

  const derived = buildDerivedPitchTables(
    allPitches,
    branch,
    twoStrikePitches,
    twoStrikeK,
    firstPitches,
    firstPitchStrikes
  );

  const avgGsv2 =
    starterGsv2s.length > 0
      ? Number(
          (
            starterGsv2s.reduce((a, b) => a + b, 0) / starterGsv2s.length
          ).toFixed(1)
        )
      : null;

  const contextMetrics: PitchingContextMetrics = {
    wpa: Math.round(wpaSum * 1000) / 1000,
    re24: Math.round(re24Sum * 100) / 100,
    aLI: liCount > 0 ? Math.round((liSum / liCount) * 100) / 100 : 1.0,
    gmLI: gmLiCount > 0 ? Math.round((gmLiSum / gmLiCount) * 100) / 100 : 1.0,
    gsv2: avgGsv2,
    isQS: qsCount > 0,
    qsCount,
    gsCount,
    avgGsv2,
    ir: irSum,
    irs: irsSum,
    irsPct: irSum > 0 ? Number(((irsSum / irSum) * 100).toFixed(1)) : null,
    shutdowns,
    meltdowns,
  };

  return {
    ...derived,
    pitches: allPitches,
    situationalSplits: [
      finalizeSplitRow(vsLhb),
      finalizeSplitRow(vsRhb),
      finalizeSplitRow(homeAcc),
      finalizeSplitRow(awayAcc),
      finalizeSplitRow(risp),
    ],
    ttoSplits: [
      finalizeSplitRow(tto1),
      finalizeSplitRow(tto2),
      finalizeSplitRow(tto3),
    ],
    contactProfile: finalizeContactProfile(contact, derived.hasStatcast),
    contextMetrics,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Caché LRU en memoria para partidos finalizados + concurrencia acotada
// ─────────────────────────────────────────────────────────────────────────────
const GAME_TELEMETRY_CACHE = new Map<string, ParsedPitcherGameTelemetry>();
const MAX_TELEMETRY_CACHE_SIZE = 600;

export async function fetchAndParseGameTelemetryCached(
  gamePk: number,
  pitcherId: number,
  branch: PitchingBranch
): Promise<ParsedPitcherGameTelemetry | null> {
  if (!gamePk || !pitcherId) return null;
  const cacheKey = `${gamePk}:${pitcherId}:${branch}`;
  const cached = GAME_TELEMETRY_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const feed = await res.json();
    const parsed = parsePitcherFromLiveFeed(feed, pitcherId, branch);

    if (parsed.isFinal) {
      if (GAME_TELEMETRY_CACHE.size >= MAX_TELEMETRY_CACHE_SIZE) {
        const oldestKey = GAME_TELEMETRY_CACHE.keys().next().value;
        if (oldestKey) GAME_TELEMETRY_CACHE.delete(oldestKey);
      }
      GAME_TELEMETRY_CACHE.set(cacheKey, parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runner() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await worker(items[idx], idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    () => runner()
  );
  await Promise.allSettled(workers);
  return results;
}

const MLB_API_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function parseLogDecision(stat: any): "W" | "L" | "SV" | "HLD" | "" {
  if (!stat) return "";
  if (Number(stat.wins || 0) > 0) return "W";
  if (Number(stat.losses || 0) > 0) return "L";
  if (Number(stat.saves || 0) > 0) return "SV";
  if (Number(stat.holds || 0) > 0) return "HLD";
  return "";
}

/**
 * Fuente única de verdad para obtener el GameLog oficial de una temporada y enriquecerlo con PBP 100% real cacheado.
 */
export async function fetchSeasonGameLogsWithRealTelemetry(
  pitcherId: number,
  season: number,
  branch: PitchingBranch,
  phase: string
): Promise<{
  logs: PitcherGameLog[];
  telemetries: Array<{ log: PitcherGameLog; telemetry: ParsedPitcherGameTelemetry }>;
}> {
  const isLvbp = branch === "lvbp";
  const url = isLvbp
    ? `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}&sportId=17&gameType=R,F,D,L,W`
    : `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}&sportIds=1,11,12`;

  const rawLogs: PitcherGameLog[] = [];

  try {
    const res = await fetch(url, {
      headers: MLB_API_HEADERS,
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 1800 },
    });

    if (res.ok) {
      const data = await res.json();
      const splits = data.stats?.[0]?.splits || [];

      for (const s of splits) {
        const game = s.game || {};
        const stat = s.stat || {};
        const gamePk = Number(game.gamePk) || 0;
        const dateStr = String(s.date || "");
        const opp = s.opponent?.name || "Rival";
        const gameType = String(s.gameType || "R");
        const isHome = Boolean(s.isHome);

        if (phase && phase !== "all" && gameType !== phase) {
          continue;
        }

        const isStart = Number(stat.gamesStarted || 0) > 0;
        const ip = String(stat.inningsPitched || "0.0");
        const outs = Number(stat.outs ?? parseIpToOuts(ip));
        const bf = Number(stat.battersFaced || 0);
        const h = Number(stat.hits || 0);
        const r = Number(stat.runs || 0);
        const er = Number(stat.earnedRuns || 0);
        const bb = Number(stat.baseOnBalls || 0);
        const so = Number(stat.strikeOuts || 0);
        const hr = Number(stat.homeRuns || 0);
        const hbp = Number(stat.hitBatsmen || 0);
        const pitches = Number(stat.numberOfPitches || 0);
        const strikes = Number(stat.strikes || 0);
        const ir = Number(stat.inheritedRunners || 0);
        const irs = Number(stat.inheritedRunnersScored || 0);
        const era = String(stat.era || "0.00");
        const decision = parseLogDecision(stat);
        const sportId = s.sport?.id;
        const league: "LVBP" | "MLB" | "MiLB" = isLvbp
          ? "LVBP"
          : sportId === 1
          ? "MLB"
          : "MiLB";

        if (
          outs === 0 &&
          bf === 0 &&
          h === 0 &&
          r === 0 &&
          er === 0 &&
          bb === 0 &&
          so === 0 &&
          pitches === 0
        ) {
          continue;
        }

        const gsv2 = computeGSv2({ outs, so, bb, h, er, hr });
        const isQS = isStart && outs >= 18 && er <= 3;

        rawLogs.push({
          gamePk,
          date: dateStr,
          opponent: opp,
          isHome,
          isStarter: isStart,
          role: isStart ? "Abridor" : "Relevista",
          gameType,
          phase: gameType,
          ip,
          outs,
          bf,
          h,
          r,
          er,
          bb,
          so,
          hr,
          hbp,
          pitches,
          strikes,
          era,
          decision,
          league,
          gsv2,
          isQS,
          ir,
          irs,
        });
      }
    }
  } catch (err) {
    console.error(`Error fetching pitcher game logs for season ${season}:`, err);
  }

  rawLogs.sort((a, b) => b.date.localeCompare(a.date));

  // Enriquecer con PBP real pitcheo a pitcheo (toda la temporada LVBP o hasta 24 salidas MLB + todo lo cacheado)
  const maxLiveFetches = isLvbp ? 35 : 24;
  let liveBudgetUsed = 0;

  const parsedList = await mapWithConcurrency(rawLogs, 6, async (log) => {
    const cacheKey = `${log.gamePk}:${pitcherId}:${branch}`;
    const isCached = GAME_TELEMETRY_CACHE.has(cacheKey);
    if (!isCached && liveBudgetUsed >= maxLiveFetches) {
      return null;
    }
    if (!isCached) liveBudgetUsed += 1;
    return fetchAndParseGameTelemetryCached(log.gamePk, pitcherId, branch);
  });

  const telemetries: Array<{
    log: PitcherGameLog;
    telemetry: ParsedPitcherGameTelemetry;
  }> = [];

  const enrichedLogs = rawLogs.map((log, idx) => {
    const tel = parsedList[idx];
    if (!tel) {
      return {
        ...log,
        cswPct: "—",
        whiffPct: "—",
        fStrikePct: "—",
        wpa: null,
        re24: null,
        aLI: null,
      };
    }

    telemetries.push({ log, telemetry: tel });
    return {
      ...log,
      pitches: log.pitches || tel.totalPitches,
      strikes: log.strikes || tel.strikesCount,
      cswPct: tel.totalPitches > 0 ? tel.cswPctStr : "0.0%",
      whiffPct: tel.totalPitches > 0 ? tel.whiffPctStr : "0.0%",
      fStrikePct: tel.totalPitches > 0 ? tel.pbpKpis.fpsPct : "0.0%",
      wpa: tel.contextMetrics.wpa,
      re24: tel.contextMetrics.re24,
      aLI: tel.contextMetrics.aLI,
      ir: tel.boxExtract?.ir ?? log.ir ?? 0,
      irs: tel.boxExtract?.irs ?? log.irs ?? 0,
    };
  });

  return { logs: enrichedLogs, telemetries };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrappers de compatibilidad hacia atrás
// ─────────────────────────────────────────────────────────────────────────────
export function parseLiveFeedPitches(
  liveData: Record<string, any>,
  pitcherId: number,
  branch: PitchingBranch = "mlb"
): PitchDetail[] {
  return parsePitcherFromLiveFeed(liveData, pitcherId, branch).pitches;
}

export function computePitchMetrics(
  parsedPitches: PitchDetail[],
  branch: PitchingBranch = "mlb"
) {
  const firstPitches = parsedPitches.filter((p) => p.balls === 0 && p.strikes === 0);
  const fpStrikes = firstPitches.filter((p) => p.isStrike).length;
  const twoStrikePitches = parsedPitches.filter((p) => p.strikes === 2).length;
  const twoStrikeK = parsedPitches.filter(
    (p) => p.strikes === 2 && (p.isWhiff || p.isCalled) && p.result.toLowerCase().includes("strike")
  ).length;
  return buildDerivedPitchTables(
    parsedPitches,
    branch,
    twoStrikePitches,
    twoStrikeK,
    firstPitches.length,
    fpStrikes
  );
}
