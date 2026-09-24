import { NextRequest, NextResponse } from "next/server";
import {
  PitchGameDataResponse,
  PitchDetail,
  PitcherGameLog,
} from "@/types/pitching";
import {
  parseLiveFeedPitches,
  computePitchMetrics,
  sumInnings,
} from "@/lib/pitch-parser";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function parseDecision(stat: any): "W" | "L" | "SV" | "HLD" | "" {
  if (!stat) return "";
  if (Number(stat.wins || 0) > 0) return "W";
  if (Number(stat.losses || 0) > 0) return "L";
  if (Number(stat.saves || 0) > 0) return "SV";
  if (Number(stat.holds || 0) > 0) return "HLD";
  return "";
}

async function fetchLogsForSeason(
  pitcherId: number,
  season: number,
  isLvbp: boolean,
  phase: string
): Promise<PitcherGameLog[]> {
  const logsUrl = isLvbp
    ? `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}&sportId=17&gameType=R,F,D,L,W`
    : `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats?stats=gameLog&group=pitching&season=${season}&sportIds=1,11,12`;

  const logs: PitcherGameLog[] = [];

  try {
    const res = await fetch(logsUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(9000),
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const splits = data.stats?.[0]?.splits || [];

      for (const s of splits) {
        const game = s.game || {};
        const stat = s.stat || {};
        const gamePk = Number(game.gamePk) || 0;
        const dateStr = s.date || "";
        const opp = s.opponent?.name || "Rival";
        const gameType = s.gameType || "R";

        if (phase && phase !== "all" && gameType !== phase) {
          continue;
        }

        const isStart = Number(stat.gamesStarted || 0) > 0;
        const ip = String(stat.inningsPitched || "0.0");
        const h = Number(stat.hits || 0);
        const r = Number(stat.runs || 0);
        const er = Number(stat.earnedRuns || 0);
        const bb = Number(stat.baseOnBalls || 0);
        const so = Number(stat.strikeOuts || 0);
        const hr = Number(stat.homeRuns || 0);
        const pitches = Number(stat.numberOfPitches || 0);
        const strikes = Number(stat.strikes || 0);
        const era = String(stat.era || "0.00");
        const decision = parseDecision(stat);
        const sportId = s.sport?.id;
        const league: "LVBP" | "MLB" | "MiLB" = isLvbp
          ? "LVBP"
          : sportId === 1
          ? "MLB"
          : "MiLB";

        if (
          ip === "0.0" &&
          h === 0 &&
          r === 0 &&
          er === 0 &&
          bb === 0 &&
          so === 0 &&
          pitches === 0
        ) {
          continue;
        }

        logs.push({
          gamePk,
          date: dateStr,
          opponent: opp,
          isStarter: isStart,
          role: isStart ? "Abridor" : "Relevista",
          gameType,
          phase: gameType,
          ip,
          h,
          r,
          er,
          bb,
          so,
          hr,
          pitches,
          strikes,
          era,
          decision,
          league,
        });
      }
    }
  } catch (err) {
    console.error(`Error fetching logs for season data ${season}:`, err);
  }

  logs.sort((a, b) => b.date.localeCompare(a.date));
  return logs;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pitcherIdParam = searchParams.get("pitcher_id");
  const seasonParam = searchParams.get("season") || "2025";
  const branch = (searchParams.get("branch") || "lvbp").toLowerCase();
  const phase = searchParams.get("phase") || "all";

  const pitcherId = Number(pitcherIdParam);
  if (!pitcherId) {
    return NextResponse.json(
      { error: "pitcher_id es requerido" },
      { status: 400 }
    );
  }

  const season = Number(seasonParam) || 2025;
  const isLvbp = branch === "lvbp";

  // 1. Obtener todas las salidas de la temporada solicitada
  let effectiveSeason = season;
  let fallbackUsed = false;
  let logs = await fetchLogsForSeason(pitcherId, season, isLvbp, phase);

  // Fallback inteligente si la temporada actual no tiene salidas (modo 'all')
  if (logs.length === 0 && phase === "all") {
    const fallbackCandidates = [2025, 2024, 2023, 2022].filter((s) => s !== season);
    for (const fallbackS of fallbackCandidates) {
      const candidateLogs = await fetchLogsForSeason(pitcherId, fallbackS, isLvbp, phase);
      if (candidateLogs.length > 0) {
        logs = candidateLogs;
        effectiveSeason = fallbackS;
        fallbackUsed = true;
        break;
      }
    }
  }

  // Si después del fallback no hay salidas, retornar 200 graceful con gamesCount: 0 (nunca 404)
  if (logs.length === 0) {
    const emptyResponse: PitchGameDataResponse = {
      gamePk: 0,
      pitcherId,
      timeMode: "season",
      gamesCount: 0,
      isStarter: false,
      role: "Temporada",
      decision: "0-0",
      totalPitches: 0,
      hasStatcast: false,
      boxscore: {
        ip: "0.0",
        h: 0,
        r: 0,
        er: 0,
        bb: 0,
        so: 0,
        pitches: 0,
        strikes: 0,
        cswPct: "0.0%",
        whiffPct: "0.0%",
        era: "0.00",
        whip: "0.00",
      },
      statcastTable: [],
      pbpTable: [],
      pbpKpis: {
        totalPitches: 0,
        strikes: 0,
        balls: 0,
        strikePct: "0.0%",
        cswPct: "0.0%",
        whiffPct: "0.0%",
        fpsPct: "0.0%",
        swings: 0,
        calledStrikes: 0,
        fouls: 0,
        inPlay: 0,
      },
      inningsWorkload: [],
      splitsPlatoon: {
        vsLhb: { pitches: 0, cswPct: "0.0%", whiffPct: "0.0%", strikePct: "0.0%" },
        vsRhb: { pitches: 0, cswPct: "0.0%", whiffPct: "0.0%", strikePct: "0.0%" },
      },
      pitches: [],
    };
    return NextResponse.json(emptyResponse);
  }

  // 2. Acumular Boxscore de la temporada
  const { ipString, totalInningsFloat } = sumInnings(logs.map((l) => l.ip));
  const totalH = logs.reduce((acc, l) => acc + l.h, 0);
  const totalR = logs.reduce((acc, l) => acc + l.r, 0);
  const totalEr = logs.reduce((acc, l) => acc + l.er, 0);
  const totalBb = logs.reduce((acc, l) => acc + l.bb, 0);
  const totalSo = logs.reduce((acc, l) => acc + l.so, 0);
  const totalPitchesFromLogs = logs.reduce((acc, l) => acc + l.pitches, 0);
  const totalStrikesFromLogs = logs.reduce((acc, l) => acc + l.strikes, 0);

  const era =
    totalInningsFloat > 0
      ? ((totalEr * 9) / totalInningsFloat).toFixed(2)
      : "0.00";
  const whip =
    totalInningsFloat > 0
      ? ((totalBb + totalH) / totalInningsFloat).toFixed(2)
      : "0.00";

  // Decisiones de la temporada (ej: "4-1" o "2 SV")
  const wins = logs.filter((l) => l.decision === "W").length;
  const losses = logs.filter((l) => l.decision === "L").length;
  const saves = logs.filter((l) => l.decision === "SV").length;
  const decisionSummary = saves > 0 ? `${wins}-${losses} (${saves} SV)` : `${wins}-${losses}`;

  // 3. Consultar feeds individuales en paralelo (hasta 8 juegos para no exceder timeout)
  const sampledLogs = logs.slice(0, 8);
  const allParsedPitches: PitchDetail[] = [];

  const feedPromises = sampledLogs.map(async (l) => {
    try {
      const feedRes = await fetch(
        `https://statsapi.mlb.com/api/v1.1/game/${l.gamePk}/feed/live`,
        {
          headers: HEADERS,
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 3600 },
        }
      );
      if (feedRes.ok) {
        const liveData = await feedRes.json();
        return parseLiveFeedPitches(liveData, pitcherId);
      }
      return [];
    } catch {
      return [];
    }
  });

  const feedResults = await Promise.allSettled(feedPromises);
  let globalPitchNumber = 1;
  for (const r of feedResults) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      for (const p of r.value) {
        allParsedPitches.push({
          ...p,
          pitchNumber: globalPitchNumber++,
        });
      }
    }
  }

  // 4. Calcular métricas agregadas
  const metrics = computePitchMetrics(allParsedPitches);

  const response: PitchGameDataResponse = {
    gamePk: 0,
    pitcherId,
    timeMode: "season",
    gamesCount: logs.length,
    isStarter: logs.some((l) => l.isStarter),
    role: "Temporada",
    decision: decisionSummary,
    totalPitches: totalPitchesFromLogs || metrics.totalPitches,
    hasStatcast: metrics.hasStatcast,
    boxscore: {
      ip: ipString,
      h: totalH,
      r: totalR,
      er: totalEr,
      bb: totalBb,
      so: totalSo,
      pitches: totalPitchesFromLogs || metrics.totalPitches,
      strikes: totalStrikesFromLogs || metrics.strikesCount,
      cswPct: metrics.cswPctStr,
      whiffPct: metrics.whiffPctStr,
      era,
      whip,
    },
    statcastTable: metrics.statcastTable,
    pbpTable: metrics.pbpTable,
    pbpKpis: metrics.pbpKpis,
    inningsWorkload: metrics.inningsWorkload,
    splitsPlatoon: metrics.splitsPlatoon,
    pitches: allParsedPitches,
    effectiveSeason,
    fallbackUsed,
    fallbackMessage: fallbackUsed
      ? `No se encontraron salidas registradas en la temporada ${season} para esta rama. Mostrando la última temporada disponible (${effectiveSeason}).`
      : undefined,
  } as any;

  return NextResponse.json(response);
}
