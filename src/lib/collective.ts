import { getTeam } from "./constants";
import {
  CollectiveBattingTeam,
  CollectivePitchingTeam,
  CollectiveFieldingTeam,
  CollectiveStatsResult,
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
  group: "hitting" | "pitching" | "fielding"
): Promise<MlbSplit[]> {
  const gameTypeParam = phase && phase !== "all" ? `&gameType=${phase}` : "";
  const url = `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportIds=17&leagueIds=135&group=${group}&stats=season${gameTypeParam}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 300 }, // 5 min cache
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
  phase = "R"
): Promise<CollectiveStatsResult> {
  const [hittingSplits, pitchingSplits, fieldingSplits] = await Promise.all([
    fetchStatsGroup(season, phase, "hitting"),
    fetchStatsGroup(season, phase, "pitching"),
    fetchStatsGroup(season, phase, "fielding"),
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

  return {
    batting,
    pitching,
    fielding,
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
