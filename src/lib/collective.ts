import { getTeam } from "./constants";
import {
  CollectiveBattingTeam,
  CollectivePitchingTeam,
  CollectiveFieldingTeam,
  CollectiveStatsResult,
  CollectiveLeagueSummary,
} from "@/types/collective";

interface MlbSplit {
  team?: { id?: number; name?: string };
  stat?: Record<string, unknown>;
}

function toNum(val: unknown, defaultVal = 0): number {
  if (val === null || val === undefined || val === "") return defaultVal;
  const parsed = Number(val);
  return isNaN(parsed) ? defaultVal : parsed;
}

function toPctStr(val: number): string {
  return val.toFixed(3).replace(/^0/, "");
}

async function fetchStatsGroup(
  season: number,
  phase: string,
  group: "hitting" | "pitching" | "fielding",
  startDate?: string,
  endDate?: string
): Promise<MlbSplit[]> {
  const isDateRange = Boolean(startDate && endDate);
  const statsParam = isDateRange
    ? `stats=byDateRange&startDate=${startDate}&endDate=${endDate}`
    : `stats=season${phase && phase !== "all" ? `&gameType=${phase}` : ""}`;
  const url = `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportIds=17&leagueIds=135&group=${group}&${statsParam}`;

  const isPast = Boolean(
    endDate && new Date(endDate).getTime() < Date.now() - 86400000
  );
  const revalidate = isPast ? 86400 : 300;

  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
      },
    });

    if (!res.ok) {
      console.error(`Error fetching MLB stats collective (${group}):`, res.status);
      return [];
    }

    const data = await res.json();
    const statsList = data.stats || [];
    if (!statsList.length) return [];
    return statsList[0].splits || [];
  } catch (err) {
    console.error(`Fetch exception for collective ${group}:`, err);
    return [];
  }
}

export async function getCollectiveStats(
  season = 2025,
  phase = "R",
  startDate?: string,
  endDate?: string
): Promise<CollectiveStatsResult> {
  const [hittingSplits, pitchingSplits, fieldingSplits] = await Promise.all([
    fetchStatsGroup(season, phase, "hitting", startDate, endDate),
    fetchStatsGroup(season, phase, "pitching", startDate, endDate),
    fetchStatsGroup(season, phase, "fielding", startDate, endDate),
  ]);

  // 1. Parse Bateo Colectivo
  const batting: CollectiveBattingTeam[] = hittingSplits.map((s) => {
    const tid = Number(s.team?.id || 0);
    const teamObj = getTeam(tid);
    const stat = s.stat || {};

    const avg = toNum(stat.avg);
    const obp = toNum(stat.obp);
    const slg = toNum(stat.slg);
    const ops = toNum(stat.ops);
    const babip = toNum(stat.babip);

    return {
      teamId: tid,
      teamName: teamObj.name || s.team?.name || "Equipo",
      teamAbbr: teamObj.abbreviation || "LVBP",
      logo: teamObj.logoUrl,
      games: toNum(stat.gamesPlayed),
      pa: toNum(stat.plateAppearances),
      ab: toNum(stat.atBats),
      r: toNum(stat.runs),
      h: toNum(stat.hits),
      doubles: toNum(stat.doubles),
      triples: toNum(stat.triples),
      hr: toNum(stat.homeRuns),
      rbi: toNum(stat.rbi),
      bb: toNum(stat.baseOnBalls),
      so: toNum(stat.strikeOuts),
      sb: toNum(stat.stolenBases),
      avg,
      avgStr: toPctStr(avg),
      obp,
      obpStr: toPctStr(obp),
      slg,
      slgStr: toPctStr(slg),
      ops,
      opsStr: toPctStr(ops),
      lob: toNum(stat.leftOnBase),
      babip,
      babipStr: toPctStr(babip),
      isLeones: tid === 695,
    };
  });

  // Ordenar Bateo por OPS descendente
  batting.sort((a, b) => b.ops - a.ops || b.r - a.r);

  // 2. Parse Pitcheo Colectivo
  const pitching: CollectivePitchingTeam[] = pitchingSplits.map((s) => {
    const tid = Number(s.team?.id || 0);
    const teamObj = getTeam(tid);
    const stat = s.stat || {};

    const era = toNum(stat.era);
    const whip = toNum(stat.whip);
    const ip = toNum(stat.inningsPitched);
    const k9 = toNum(stat.strikeoutsPer9Inn);
    const bb9 = toNum(stat.walksPer9Inn);
    const kbb = toNum(stat.strikeoutWalkRatio);
    const baa = toNum(stat.avg);

    return {
      teamId: tid,
      teamName: teamObj.name || s.team?.name || "Equipo",
      teamAbbr: teamObj.abbreviation || "LVBP",
      logo: teamObj.logoUrl,
      games: toNum(stat.gamesPlayed),
      wins: toNum(stat.wins),
      losses: toNum(stat.losses),
      era,
      eraStr: era.toFixed(2),
      whip,
      whipStr: whip.toFixed(2),
      sv: toNum(stat.saves),
      holds: toNum(stat.holds),
      blownSaves: toNum(stat.blownSaves),
      ip,
      ipStr: ip.toFixed(1),
      h: toNum(stat.hits),
      r: toNum(stat.runs),
      er: toNum(stat.earnedRuns),
      bb: toNum(stat.baseOnBalls),
      so: toNum(stat.strikeOuts),
      hr: toNum(stat.homeRuns),
      k9,
      k9Str: k9.toFixed(2),
      bb9,
      bb9Str: bb9.toFixed(2),
      kbb,
      kbbStr: kbb.toFixed(2),
      baa,
      baaStr: toPctStr(baa),
      isLeones: tid === 695,
    };
  });

  // Ordenar Pitcheo por ERA ascendente
  pitching.sort((a, b) => a.era - b.era);

  // 3. Parse Fildeo Colectivo
  const fielding: CollectiveFieldingTeam[] = fieldingSplits.map((s) => {
    const tid = Number(s.team?.id || 0);
    const teamObj = getTeam(tid);
    const stat = s.stat || {};

    const fpct = toNum(stat.fielding);
    const csPct = toNum(stat.caughtStealingPercentage);
    const rf9 = toNum(stat.rangeFactorPer9Inn);

    return {
      teamId: tid,
      teamName: teamObj.name || s.team?.name || "Equipo",
      teamAbbr: teamObj.abbreviation || "LVBP",
      logo: teamObj.logoUrl,
      games: toNum(stat.gamesPlayed),
      innings: String(stat.innings || "0.0"),
      po: toNum(stat.putOuts),
      a: toNum(stat.assists),
      e: toNum(stat.errors),
      tc: toNum(stat.chances),
      fpct,
      fpctStr: toPctStr(fpct),
      dp: toNum(stat.doublePlays),
      tp: toNum(stat.triplePlays),
      pb: toNum(stat.passedBall),
      cs: toNum(stat.caughtStealing),
      sb: toNum(stat.stolenBases),
      csPct,
      csPctStr: toPctStr(csPct),
      rf9,
      rf9Str: rf9.toFixed(2),
      isLeones: tid === 695,
    };
  });

  // Ordenar Fildeo por FPCT descendente
  fielding.sort((a, b) => b.fpct - a.fpct || a.e - b.e);

  // 4. Calcular KPIs de Líderes
  const bestBatAvg = batting.length ? [...batting].sort((a, b) => b.avg - a.avg)[0] : null;
  const bestBatOps = batting.length ? [...batting].sort((a, b) => b.ops - a.ops)[0] : null;
  const bestBatHr = batting.length ? [...batting].sort((a, b) => b.hr - a.hr)[0] : null;
  const bestBatR = batting.length ? [...batting].sort((a, b) => b.r - a.r)[0] : null;

  const bestPitchEra = pitching.length ? [...pitching].sort((a, b) => a.era - b.era)[0] : null;
  const bestPitchWhip = pitching.length ? [...pitching].sort((a, b) => a.whip - b.whip)[0] : null;
  const bestPitchSo = pitching.length ? [...pitching].sort((a, b) => b.so - a.so)[0] : null;
  const bestPitchSv = pitching.length ? [...pitching].sort((a, b) => b.sv - a.sv)[0] : null;

  const bestFldFpct = fielding.length ? [...fielding].sort((a, b) => b.fpct - a.fpct)[0] : null;
  const bestFldE = fielding.length ? [...fielding].sort((a, b) => a.e - b.e)[0] : null;
  const bestFldDp = fielding.length ? [...fielding].sort((a, b) => b.dp - a.dp)[0] : null;
  const bestFldCs = fielding.length ? [...fielding].sort((a, b) => b.csPct - a.csPct)[0] : null;

  // 5. Calcular Acumulados y Promedios de la Liga
  const battingSummary = calculateBattingSummary(batting);
  const pitchingSummary = calculatePitchingSummary(pitching);
  const fieldingSummary = calculateFieldingSummary(fielding);

  return {
    batting,
    pitching,
    fielding,
    battingSummary,
    pitchingSummary,
    fieldingSummary,
    battingKpis: {
      avgVal: bestBatAvg ? bestBatAvg.avgStr : ".000",
      avgTeam: bestBatAvg ? bestBatAvg.teamName : "-",
      opsVal: bestBatOps ? bestBatOps.opsStr : ".000",
      opsTeam: bestBatOps ? bestBatOps.teamName : "-",
      hrVal: bestBatHr ? `${bestBatHr.hr}` : "0",
      hrTeam: bestBatHr ? bestBatHr.teamName : "-",
      rVal: bestBatR ? `${bestBatR.r}` : "0",
      rTeam: bestBatR ? bestBatR.teamName : "-",
    },
    pitchingKpis: {
      eraVal: bestPitchEra ? bestPitchEra.eraStr : "0.00",
      eraTeam: bestPitchEra ? bestPitchEra.teamName : "-",
      whipVal: bestPitchWhip ? bestPitchWhip.whipStr : "0.00",
      whipTeam: bestPitchWhip ? bestPitchWhip.teamName : "-",
      soVal: bestPitchSo ? `${bestPitchSo.so}` : "0",
      soTeam: bestPitchSo ? bestPitchSo.teamName : "-",
      svVal: bestPitchSv ? `${bestPitchSv.sv}` : "0",
      svTeam: bestPitchSv ? bestPitchSv.teamName : "-",
    },
    fieldingKpis: {
      fpctVal: bestFldFpct ? bestFldFpct.fpctStr : ".000",
      fpctTeam: bestFldFpct ? bestFldFpct.teamName : "-",
      eVal: bestFldE ? `${bestFldE.e}` : "0",
      eTeam: bestFldE ? bestFldE.teamName : "-",
      dpVal: bestFldDp ? `${bestFldDp.dp}` : "0",
      dpTeam: bestFldDp ? bestFldDp.teamName : "-",
      csPctVal: bestFldCs ? bestFldCs.csPctStr : ".000",
      csPctTeam: bestFldCs ? bestFldCs.teamName : "-",
    },
  };
}

function calculateBattingSummary(
  batting: CollectiveBattingTeam[]
): CollectiveLeagueSummary<CollectiveBattingTeam> {
  const totalTeamGames = batting.reduce((acc, t) => acc + t.games, 0);
  const uniqueGames = Math.max(1, Math.round(totalTeamGames / 2));
  const teamGamesSafe = Math.max(1, totalTeamGames);

  const pa = batting.reduce((acc, t) => acc + t.pa, 0);
  const ab = batting.reduce((acc, t) => acc + t.ab, 0);
  const r = batting.reduce((acc, t) => acc + t.r, 0);
  const h = batting.reduce((acc, t) => acc + t.h, 0);
  const doubles = batting.reduce((acc, t) => acc + t.doubles, 0);
  const triples = batting.reduce((acc, t) => acc + t.triples, 0);
  const hr = batting.reduce((acc, t) => acc + t.hr, 0);
  const rbi = batting.reduce((acc, t) => acc + t.rbi, 0);
  const bb = batting.reduce((acc, t) => acc + t.bb, 0);
  const so = batting.reduce((acc, t) => acc + t.so, 0);
  const sb = batting.reduce((acc, t) => acc + t.sb, 0);
  const lob = batting.reduce((acc, t) => acc + t.lob, 0);

  const avg = ab > 0 ? h / ab : 0;
  const obp = pa > 0 ? (h + bb) / pa : 0;
  const singles = Math.max(0, h - doubles - triples - hr);
  const tb = singles + doubles * 2 + triples * 3 + hr * 4;
  const slg = ab > 0 ? tb / ab : 0;
  const ops = obp + slg;
  const babipDenom = ab - so - hr;
  const babip = babipDenom > 0 ? (h - hr) / babipDenom : 0;

  const total: CollectiveBattingTeam = {
    teamId: 0,
    teamName: "TOTAL LIGA",
    teamAbbr: "LVBP",
    logo: "/assets/logo.png",
    games: uniqueGames,
    pa,
    ab,
    r,
    h,
    doubles,
    triples,
    hr,
    rbi,
    bb,
    so,
    sb,
    avg,
    avgStr: toPctStr(avg),
    obp,
    obpStr: toPctStr(obp),
    slg,
    slgStr: toPctStr(slg),
    ops,
    opsStr: toPctStr(ops),
    lob,
    babip,
    babipStr: toPctStr(babip),
    isLeones: false,
  };

  const perGame: Record<string, string> = {
    games: "1.0",
    pa: (pa / uniqueGames).toFixed(1),
    ab: (ab / uniqueGames).toFixed(1),
    r: (r / uniqueGames).toFixed(1),
    h: (h / uniqueGames).toFixed(1),
    doubles: (doubles / uniqueGames).toFixed(1),
    triples: (triples / uniqueGames).toFixed(2),
    hr: (hr / uniqueGames).toFixed(1),
    rbi: (rbi / uniqueGames).toFixed(1),
    bb: (bb / uniqueGames).toFixed(1),
    so: (so / uniqueGames).toFixed(1),
    sb: (sb / uniqueGames).toFixed(1),
    avgStr: toPctStr(avg),
    obpStr: toPctStr(obp),
    slgStr: toPctStr(slg),
    opsStr: toPctStr(ops),
    lob: (lob / uniqueGames).toFixed(1),
    babipStr: toPctStr(babip),
  };

  const perTeamGame: Record<string, string> = {
    games: "1.0",
    pa: (pa / teamGamesSafe).toFixed(1),
    ab: (ab / teamGamesSafe).toFixed(1),
    r: (r / teamGamesSafe).toFixed(1),
    h: (h / teamGamesSafe).toFixed(1),
    doubles: (doubles / teamGamesSafe).toFixed(1),
    triples: (triples / teamGamesSafe).toFixed(2),
    hr: (hr / teamGamesSafe).toFixed(1),
    rbi: (rbi / teamGamesSafe).toFixed(1),
    bb: (bb / teamGamesSafe).toFixed(1),
    so: (so / teamGamesSafe).toFixed(1),
    sb: (sb / teamGamesSafe).toFixed(1),
    avgStr: toPctStr(avg),
    obpStr: toPctStr(obp),
    slgStr: toPctStr(slg),
    opsStr: toPctStr(ops),
    lob: (lob / teamGamesSafe).toFixed(1),
    babipStr: toPctStr(babip),
  };

  return { total, perGame, perTeamGame, uniqueGames };
}

function calculatePitchingSummary(
  pitching: CollectivePitchingTeam[]
): CollectiveLeagueSummary<CollectivePitchingTeam> {
  const totalTeamGames = pitching.reduce((acc, t) => acc + t.games, 0);
  const uniqueGames = Math.max(1, Math.round(totalTeamGames / 2));
  const teamGamesSafe = Math.max(1, totalTeamGames);

  const wins = pitching.reduce((acc, t) => acc + t.wins, 0);
  const losses = pitching.reduce((acc, t) => acc + t.losses, 0);
  const sv = pitching.reduce((acc, t) => acc + t.sv, 0);
  const holds = pitching.reduce((acc, t) => acc + t.holds, 0);
  const blownSaves = pitching.reduce((acc, t) => acc + t.blownSaves, 0);

  const totalOuts = pitching.reduce((acc, t) => {
    const fullInn = Math.floor(t.ip);
    const partial = Math.round((t.ip - fullInn) * 10);
    return acc + fullInn * 3 + partial;
  }, 0);
  const totalIpDecimal = totalOuts / 3;
  const ipCanonical = Math.floor(totalIpDecimal) + (totalOuts % 3) / 10;

  const h = pitching.reduce((acc, t) => acc + t.h, 0);
  const r = pitching.reduce((acc, t) => acc + t.r, 0);
  const er = pitching.reduce((acc, t) => acc + t.er, 0);
  const bb = pitching.reduce((acc, t) => acc + t.bb, 0);
  const so = pitching.reduce((acc, t) => acc + t.so, 0);
  const hr = pitching.reduce((acc, t) => acc + t.hr, 0);

  const era = totalIpDecimal > 0 ? (er * 9) / totalIpDecimal : 0;
  const whip = totalIpDecimal > 0 ? (bb + h) / totalIpDecimal : 0;
  const k9 = totalIpDecimal > 0 ? (so * 9) / totalIpDecimal : 0;
  const bb9 = totalIpDecimal > 0 ? (bb * 9) / totalIpDecimal : 0;
  const kbb = bb > 0 ? so / bb : so;
  const baaAvg = pitching.length > 0 ? pitching.reduce((acc, t) => acc + t.baa, 0) / pitching.length : 0;

  const total: CollectivePitchingTeam = {
    teamId: 0,
    teamName: "TOTAL LIGA",
    teamAbbr: "LVBP",
    logo: "/assets/logo.png",
    games: uniqueGames,
    wins,
    losses,
    era,
    eraStr: era.toFixed(2),
    whip,
    whipStr: whip.toFixed(2),
    sv,
    holds,
    blownSaves,
    ip: ipCanonical,
    ipStr: ipCanonical.toFixed(1),
    h,
    r,
    er,
    bb,
    so,
    hr,
    k9,
    k9Str: k9.toFixed(2),
    bb9,
    bb9Str: bb9.toFixed(2),
    kbb,
    kbbStr: kbb.toFixed(2),
    baa: baaAvg,
    baaStr: toPctStr(baaAvg),
    isLeones: false,
  };

  const perGame: Record<string, string> = {
    games: "1.0",
    wins: "1.0",
    losses: "1.0",
    eraStr: era.toFixed(2),
    whipStr: whip.toFixed(2),
    sv: (sv / uniqueGames).toFixed(2),
    holds: (holds / uniqueGames).toFixed(2),
    blownSaves: (blownSaves / uniqueGames).toFixed(2),
    ipStr: (totalIpDecimal / uniqueGames).toFixed(1),
    h: (h / uniqueGames).toFixed(1),
    r: (r / uniqueGames).toFixed(1),
    er: (er / uniqueGames).toFixed(1),
    bb: (bb / uniqueGames).toFixed(1),
    so: (so / uniqueGames).toFixed(1),
    hr: (hr / uniqueGames).toFixed(1),
    k9Str: k9.toFixed(2),
    bb9Str: bb9.toFixed(2),
    kbbStr: kbb.toFixed(2),
    baaStr: toPctStr(baaAvg),
  };

  const perTeamGame: Record<string, string> = {
    games: "1.0",
    wins: (wins / teamGamesSafe).toFixed(2),
    losses: (losses / teamGamesSafe).toFixed(2),
    eraStr: era.toFixed(2),
    whipStr: whip.toFixed(2),
    sv: (sv / teamGamesSafe).toFixed(2),
    holds: (holds / teamGamesSafe).toFixed(2),
    blownSaves: (blownSaves / teamGamesSafe).toFixed(2),
    ipStr: (totalIpDecimal / teamGamesSafe).toFixed(1),
    h: (h / teamGamesSafe).toFixed(1),
    r: (r / teamGamesSafe).toFixed(1),
    er: (er / teamGamesSafe).toFixed(1),
    bb: (bb / teamGamesSafe).toFixed(1),
    so: (so / teamGamesSafe).toFixed(1),
    hr: (hr / teamGamesSafe).toFixed(1),
    k9Str: k9.toFixed(2),
    bb9Str: bb9.toFixed(2),
    kbbStr: kbb.toFixed(2),
    baaStr: toPctStr(baaAvg),
  };

  return { total, perGame, perTeamGame, uniqueGames };
}

function calculateFieldingSummary(
  fielding: CollectiveFieldingTeam[]
): CollectiveLeagueSummary<CollectiveFieldingTeam> {
  const totalTeamGames = fielding.reduce((acc, t) => acc + t.games, 0);
  const uniqueGames = Math.max(1, Math.round(totalTeamGames / 2));
  const teamGamesSafe = Math.max(1, totalTeamGames);

  const totalInnOuts = fielding.reduce((acc, t) => {
    const val = parseFloat(t.innings) || 0;
    const fullInn = Math.floor(val);
    const partial = Math.round((val - fullInn) * 10);
    return acc + fullInn * 3 + partial;
  }, 0);
  const totalInnDecimal = totalInnOuts / 3;
  const innCanonical = Math.floor(totalInnDecimal) + (totalInnOuts % 3) / 10;

  const po = fielding.reduce((acc, t) => acc + t.po, 0);
  const a = fielding.reduce((acc, t) => acc + t.a, 0);
  const e = fielding.reduce((acc, t) => acc + t.e, 0);
  const tc = fielding.reduce((acc, t) => acc + t.tc, 0);
  const dp = fielding.reduce((acc, t) => acc + t.dp, 0);
  const tp = fielding.reduce((acc, t) => acc + t.tp, 0);
  const pb = fielding.reduce((acc, t) => acc + t.pb, 0);
  const cs = fielding.reduce((acc, t) => acc + t.cs, 0);
  const sb = fielding.reduce((acc, t) => acc + t.sb, 0);

  const fpct = tc > 0 ? (po + a) / tc : 1;
  const csPct = (cs + sb) > 0 ? cs / (cs + sb) : 0;
  const rf9 = totalInnDecimal > 0 ? (9 * (po + a)) / totalInnDecimal : 0;

  const total: CollectiveFieldingTeam = {
    teamId: 0,
    teamName: "TOTAL LIGA",
    teamAbbr: "LVBP",
    logo: "/assets/logo.png",
    games: uniqueGames,
    innings: innCanonical.toFixed(1),
    po,
    a,
    e,
    tc,
    fpct,
    fpctStr: toPctStr(fpct),
    dp,
    tp,
    pb,
    cs,
    sb,
    csPct,
    csPctStr: toPctStr(csPct),
    rf9,
    rf9Str: rf9.toFixed(2),
    isLeones: false,
  };

  const perGame: Record<string, string> = {
    games: "1.0",
    innings: (totalInnDecimal / uniqueGames).toFixed(1),
    po: (po / uniqueGames).toFixed(1),
    a: (a / uniqueGames).toFixed(1),
    e: (e / uniqueGames).toFixed(1),
    tc: (tc / uniqueGames).toFixed(1),
    fpctStr: toPctStr(fpct),
    dp: (dp / uniqueGames).toFixed(1),
    tp: (tp / uniqueGames).toFixed(2),
    pb: (pb / uniqueGames).toFixed(2),
    cs: (cs / uniqueGames).toFixed(2),
    sb: (sb / uniqueGames).toFixed(1),
    csPctStr: toPctStr(csPct),
    rf9Str: rf9.toFixed(2),
  };

  const perTeamGame: Record<string, string> = {
    games: "1.0",
    innings: (totalInnDecimal / teamGamesSafe).toFixed(1),
    po: (po / teamGamesSafe).toFixed(1),
    a: (a / teamGamesSafe).toFixed(1),
    e: (e / teamGamesSafe).toFixed(1),
    tc: (tc / teamGamesSafe).toFixed(1),
    fpctStr: toPctStr(fpct),
    dp: (dp / teamGamesSafe).toFixed(1),
    tp: (tp / teamGamesSafe).toFixed(2),
    pb: (pb / teamGamesSafe).toFixed(2),
    cs: (cs / teamGamesSafe).toFixed(2),
    sb: (sb / teamGamesSafe).toFixed(1),
    csPctStr: toPctStr(csPct),
    rf9Str: rf9.toFixed(2),
  };

  return { total, perGame, perTeamGame, uniqueGames };
}
