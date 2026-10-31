import { NextRequest, NextResponse } from "next/server";
import { PitchGameDataResponse, PitchingBranch } from "@/types/pitching";
import {
  fetchSeasonGameLogsWithRealTelemetry,
  aggregatePitcherTelemetries,
  sumInnings,
} from "@/lib/pitch-parser";
import {
  DEFAULT_LEAGUE_PITCHING_CONSTANTS,
  computeFIP,
  computeERAMinus,
  computeLOBPct,
  computeBABIP,
} from "@/lib/pitching-constants";
import { getActiveSeason, getAvailableSeasons } from "@/lib/season-service";
import { getPitchingStats } from "@/lib/supabase";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

async function resolveDynamicLeagueConstants(
  branch: PitchingBranch,
  season: number,
  phase: string
): Promise<{ lgEra: number; cFip: number }> {
  if (branch === "lvbp") {
    try {
      const rows = await getPitchingStats(season, phase === "all" ? "all" : phase, "all", 600, 0);
      const lgIp = rows.reduce((s, r) => s + (r.inningsPitched || 0), 0);
      if (lgIp >= 50) {
        const lgEr = rows.reduce((s, r) => s + (r.earnedRuns || 0), 0);
        const lgHr = rows.reduce((s, r) => s + (r.homeRuns || 0), 0);
        const lgBb = rows.reduce((s, r) => s + (r.walks || 0), 0);
        const lgSo = rows.reduce((s, r) => s + (r.strikeouts || 0), 0);
        const lgEra = (lgEr * 9) / lgIp;
        const cFip = lgEra - (13 * lgHr + 3 * lgBb - 2 * lgSo) / lgIp;
        if (Number.isFinite(lgEra) && lgEra > 1.5 && Number.isFinite(cFip)) {
          return { lgEra, cFip };
        }
      }
    } catch {
      // Fallback seguro abajo
    }
    return DEFAULT_LEAGUE_PITCHING_CONSTANTS.lvbp;
  }

  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/stats?stats=season&group=pitching&season=${season}&sportId=1`,
      {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 3600 },
      }
    );
    if (res.ok) {
      const json = await res.json();
      const splits = json.stats?.[0]?.splits || [];
      let outs = 0;
      let er = 0;
      let hr = 0;
      let bb = 0;
      let hbp = 0;
      let so = 0;
      for (const s of splits) {
        const st = s.stat || {};
        outs += Number(st.outs || 0);
        er += Number(st.earnedRuns || 0);
        hr += Number(st.homeRuns || 0);
        bb += Number(st.baseOnBalls || 0);
        hbp += Number(st.hitBatsmen || 0);
        so += Number(st.strikeOuts || 0);
      }
      const ip = outs / 3;
      if (ip >= 200) {
        const lgEra = (er * 9) / ip;
        const cFip = lgEra - (13 * hr + 3 * (bb + hbp) - 2 * so) / ip;
        if (Number.isFinite(lgEra) && Number.isFinite(cFip)) {
          return { lgEra, cFip };
        }
      }
    }
  } catch {
    // Fallback seguro abajo
  }
  return DEFAULT_LEAGUE_PITCHING_CONSTANTS.mlb;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pitcherIdParam = searchParams.get("pitcher_id");
  const activeSeason = await getActiveSeason();
  const seasonParam = searchParams.get("season");
  const branchRaw = (searchParams.get("branch") || "lvbp").toLowerCase();
  const branch: PitchingBranch = branchRaw === "mlb" ? "mlb" : "lvbp";
  const phase = searchParams.get("phase") || "all";

  const pitcherId = Number(pitcherIdParam);
  if (!pitcherId) {
    return NextResponse.json(
      { error: "pitcher_id es requerido" },
      { status: 400 }
    );
  }

  const season = seasonParam ? Number(seasonParam) || activeSeason : activeSeason;

  let effectiveSeason = season;
  let fallbackUsed = false;
  let { logs, telemetries } = await fetchSeasonGameLogsWithRealTelemetry(
    pitcherId,
    season,
    branch,
    phase
  );

  if (logs.length === 0 && phase === "all") {
    const available = await getAvailableSeasons();
    const fallbackCandidates =
      branch === "mlb"
        ? [2025, 2024, 2023].filter((s) => s !== season)
        : available.filter((s) => s !== season);

    for (const fallbackS of fallbackCandidates) {
      const candidate = await fetchSeasonGameLogsWithRealTelemetry(
        pitcherId,
        fallbackS,
        branch,
        phase
      );
      if (candidate.logs.length > 0) {
        logs = candidate.logs;
        telemetries = candidate.telemetries;
        effectiveSeason = fallbackS;
        fallbackUsed = true;
        break;
      }
    }
  }

  if (logs.length === 0) {
    const emptyResponse: PitchGameDataResponse = {
      gamePk: 0,
      pitcherId,
      timeMode: "season",
      gamesCount: 0,
      gamesSampled: 0,
      isStarter: false,
      role: "Temporada",
      decision: "0-0",
      totalPitches: 0,
      hasStatcast: false,
      mlbPhotoUrl: getMlbFallbackHeadshotUrl(pitcherId),
      boxscore: {
        ip: "0.0",
        outs: 0,
        bf: 0,
        h: 0,
        r: 0,
        er: 0,
        bb: 0,
        so: 0,
        hr: 0,
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

  const leagueConsts = await resolveDynamicLeagueConstants(
    branch,
    effectiveSeason,
    phase
  );

  // Acumular Boxscore completo de la temporada sobre el 100% de los juegos registrados
  const { ipString, totalInningsFloat, totalOuts } = sumInnings(logs.map((l) => l.ip));
  const totalH = logs.reduce((acc, l) => acc + l.h, 0);
  const totalR = logs.reduce((acc, l) => acc + l.r, 0);
  const totalEr = logs.reduce((acc, l) => acc + l.er, 0);
  const totalBb = logs.reduce((acc, l) => acc + l.bb, 0);
  const totalSo = logs.reduce((acc, l) => acc + l.so, 0);
  const totalHr = logs.reduce((acc, l) => acc + l.hr, 0);
  const totalHbp = logs.reduce((acc, l) => acc + (l.hbp || 0), 0);
  const totalPitchesFromLogs = logs.reduce((acc, l) => acc + l.pitches, 0);
  const totalStrikesFromLogs = logs.reduce((acc, l) => acc + l.strikes, 0);
  const totalIrFromLogs = logs.reduce((acc, l) => acc + (l.ir || 0), 0);
  const totalIrsFromLogs = logs.reduce((acc, l) => acc + (l.irs || 0), 0);
  const gsCount = logs.filter((l) => l.isStarter).length;
  const qsCountFromLogs = logs.filter((l) => l.isQS).length;
  const starterGsv2List = logs
    .filter((l) => l.isStarter && typeof l.gsv2 === "number")
    .map((l) => l.gsv2 as number);
  const avgGsv2FromLogs =
    starterGsv2List.length > 0
      ? Number(
          (
            starterGsv2List.reduce((a, b) => a + b, 0) / starterGsv2List.length
          ).toFixed(1)
        )
      : null;

  const aggregated = aggregatePitcherTelemetries(
    telemetries.map((t) => ({ telemetry: t.telemetry, isHome: t.log.isHome })),
    branch
  );

  const splitLhb = aggregated.situationalSplits.find((s) => s.key === "vsLhb");
  const splitRhb = aggregated.situationalSplits.find((s) => s.key === "vsRhb");
  const pbpBf = (splitLhb?.bf || 0) + (splitRhb?.bf || 0);
  const pbpAb = (splitLhb?.ab || 0) + (splitRhb?.ab || 0);
  const totalBfFromLogs = logs.reduce((acc, l) => acc + (l.bf || 0), 0);
  const totalBf =
    totalBfFromLogs > 0
      ? totalBfFromLogs
      : pbpBf > 0
      ? pbpBf
      : totalOuts + totalH + totalBb + totalHbp;
  const totalAb = pbpAb > 0 ? pbpAb : Math.max(totalH, totalBf - totalBb - totalHbp);

  const eraNum =
    totalInningsFloat > 0 ? (totalEr * 9) / totalInningsFloat : null;
  const whipNum =
    totalInningsFloat > 0 ? (totalBb + totalH) / totalInningsFloat : null;
  const fipNum = computeFIP(
    { hr: totalHr, bb: totalBb, hbp: totalHbp, so: totalSo, outs: totalOuts },
    leagueConsts.cFip
  );
  const eraMinus = computeERAMinus(eraNum, leagueConsts.lgEra);
  const lobPctNum = computeLOBPct({
    h: totalH,
    bb: totalBb,
    hbp: totalHbp,
    r: totalR,
    hr: totalHr,
  });
  const babipNum = computeBABIP({
    h: totalH,
    hr: totalHr,
    ab: totalAb,
    so: totalSo,
  });

  const kPctNum = totalBf > 0 ? (totalSo / totalBf) * 100 : 0;
  const bbPctNum = totalBf > 0 ? (totalBb / totalBf) * 100 : 0;
  const kMinusBbNum = kPctNum - bbPctNum;

  const baaNum = totalAb > 0 ? totalH / totalAb : null;
  const totalDoubles = (splitLhb?.doubles || 0) + (splitRhb?.doubles || 0);
  const totalTriples = (splitLhb?.triples || 0) + (splitRhb?.triples || 0);
  const singlesEst = Math.max(0, totalH - totalDoubles - totalTriples - totalHr);
  const tbEst = singlesEst + 2 * totalDoubles + 3 * totalTriples + 4 * totalHr;
  const obpAgainst =
    totalBf > 0 ? (totalH + totalBb + totalHbp) / totalBf : 0;
  const slgAgainst = totalAb > 0 ? tbEst / totalAb : 0;
  const opsAgainstStr =
    totalBf > 0 ? (obpAgainst + slgAgainst).toFixed(3).replace(/^0/, "") : "—";

  const wins = logs.filter((l) => l.decision === "W").length;
  const losses = logs.filter((l) => l.decision === "L").length;
  const saves = logs.filter((l) => l.decision === "SV").length;
  const holds = logs.filter((l) => l.decision === "HLD").length;
  const extraDec =
    saves > 0 && holds > 0
      ? ` (${saves} SV, ${holds} HLD)`
      : saves > 0
      ? ` (${saves} SV)`
      : holds > 0
      ? ` (${holds} HLD)`
      : "";
  const decisionSummary = `${wins}-${losses}${extraDec}`;

  const pitchesTotal = totalPitchesFromLogs || aggregated.totalPitches;
  const strikesTotal = totalStrikesFromLogs || aggregated.strikesCount;
  const strikePctStr =
    pitchesTotal > 0 ? `${((strikesTotal / pitchesTotal) * 100).toFixed(1)}%` : "0.0%";

  const finalIr = Math.max(totalIrFromLogs, aggregated.contextMetrics.ir);
  const finalIrs = Math.max(totalIrsFromLogs, aggregated.contextMetrics.irs);
  const isPrimaryStarter = gsCount > 0 && gsCount >= Math.ceil(logs.length * 0.4);

  const response: PitchGameDataResponse = {
    gamePk: 0,
    pitcherId,
    timeMode: "season",
    gamesCount: logs.length,
    gamesSampled: telemetries.length,
    effectiveSeason,
    fallbackUsed,
    fallbackMessage: fallbackUsed
      ? `No se encontraron salidas registradas en la temporada ${season} para esta rama. Mostrando la última temporada disponible (${effectiveSeason}).`
      : undefined,
    isStarter: isPrimaryStarter,
    role: "Temporada",
    decision: decisionSummary,
    totalPitches: pitchesTotal,
    hasStatcast: aggregated.hasStatcast,
    mlbPhotoUrl: getMlbFallbackHeadshotUrl(pitcherId),
    boxscore: {
      ip: ipString,
      outs: totalOuts,
      bf: totalBf,
      ab: totalAb,
      h: totalH,
      r: totalR,
      er: totalEr,
      bb: totalBb,
      so: totalSo,
      hr: totalHr,
      hbp: totalHbp,
      pitches: pitchesTotal,
      strikes: strikesTotal,
      strikePct: strikePctStr,
      cswPct: aggregated.cswPctStr,
      whiffPct: aggregated.whiffPctStr,
      fStrikePct: aggregated.pbpKpis.fpsPct,
      swStrPct: aggregated.pbpKpis.swStrPct,
      putAwayPct: aggregated.pbpKpis.putAwayPct,
      era: eraNum !== null ? eraNum.toFixed(2) : "—",
      whip: whipNum !== null ? whipNum.toFixed(2) : "—",
      fip: fipNum !== null ? fipNum.toFixed(2) : "—",
      eraMinus,
      kPct: `${kPctNum.toFixed(1)}%`,
      bbPct: `${bbPctNum.toFixed(1)}%`,
      kMinusBbPct: `${kMinusBbNum.toFixed(1)}%`,
      babip: babipNum !== null ? babipNum.toFixed(3).replace(/^0/, "") : "—",
      lobPct: lobPctNum !== null ? `${lobPctNum.toFixed(1)}%` : "—",
      baa: baaNum !== null ? baaNum.toFixed(3).replace(/^0/, "") : "—",
      opsAgainst: opsAgainstStr,
      wins,
      losses,
      saves,
      holds,
      gamesPlayed: logs.length,
      gamesStarted: gsCount,
      ir: finalIr,
      irs: finalIrs,
      gsv2: avgGsv2FromLogs,
      isQS: qsCountFromLogs > 0,
    },
    contextMetrics: {
      ...aggregated.contextMetrics,
      qsCount: qsCountFromLogs,
      gsCount,
      avgGsv2: avgGsv2FromLogs,
      ir: finalIr,
      irs: finalIrs,
      irsPct: finalIr > 0 ? Number(((finalIrs / finalIr) * 100).toFixed(1)) : null,
    },
    contactProfile: aggregated.contactProfile,
    situationalSplits: aggregated.situationalSplits,
    ttoSplits: aggregated.ttoSplits,
    statcastTable: aggregated.statcastTable,
    pbpTable: aggregated.pbpTable,
    pbpKpis: aggregated.pbpKpis,
    inningsWorkload: aggregated.inningsWorkload,
    splitsPlatoon: aggregated.splitsPlatoon,
    pitches: aggregated.pitches,
  };

  return NextResponse.json(response);
}
