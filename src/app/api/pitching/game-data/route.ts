import { NextRequest, NextResponse } from "next/server";
import {
  PitchDetail,
  StatcastPitchRow,
  PBPDestinationRow,
  PBPKPIs,
  InningWorkloadItem,
  PlatoonSplits,
  PitchGameDataResponse,
} from "@/types/pitching";
import { getPitchColor } from "@/lib/pitching-constants";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

function calculateSimpleLI(inning: number, outs: number, scoreDiff: number): number {
  let baseLi = 1.0;
  if (inning >= 7) {
    if (Math.abs(scoreDiff) <= 1) baseLi = 2.0;
    else if (Math.abs(scoreDiff) === 2) baseLi = 1.4;
    else if (Math.abs(scoreDiff) >= 4) baseLi = 0.5;
  } else if (inning >= 4) {
    if (Math.abs(scoreDiff) <= 1) baseLi = 1.2;
    else if (Math.abs(scoreDiff) >= 4) baseLi = 0.6;
  } else {
    if (Math.abs(scoreDiff) >= 4) baseLi = 0.7;
  }
  if (outs === 2 && Math.abs(scoreDiff) <= 2) {
    baseLi *= 1.25;
  }
  return Math.round(baseLi * 100) / 100;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gamePkParam = searchParams.get("game_pk");
  const pitcherIdParam = searchParams.get("pitcher_id");

  const gamePk = Number(gamePkParam);
  const pitcherId = Number(pitcherIdParam);

  if (!gamePk || !pitcherId) {
    return NextResponse.json(
      { error: "game_pk y pitcher_id son requeridos" },
      { status: 400 }
    );
  }

  const liveUrl = `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`;

  try {
    const res = await fetch(liveUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `No se pudo obtener el feed del juego ${gamePk}` },
        { status: 502 }
      );
    }

    const liveData = await res.json();
    const allPlays = liveData.liveData?.plays?.allPlays || [];

    const parsedPitches: PitchDetail[] = [];
    let pNum = 1;

    for (const play of allPlays) {
      const matchup = play.matchup || {};
      if (matchup.pitcher?.id !== pitcherId) {
        continue;
      }

      const stand = matchup.batSide?.code || "R";
      const about = play.about || {};
      const inning = about.inning || 1;
      const homeScore = play.result?.homeScore || 0;
      const awayScore = play.result?.awayScore || 0;
      const scoreDiff = homeScore - awayScore;

      const events = play.playEvents || [];
      for (const ev of events) {
        if (!ev.isPitch) continue;

        const pdata = ev.pitchData || {};
        const det = ev.details || {};
        const coords = pdata.coordinates || {};

        const speed = pdata.startSpeed !== undefined ? Number(pdata.startSpeed) : null;
        const spin = pdata.spinRate !== undefined ? Number(pdata.spinRate) : null;

        const pfxZ = coords.pfxZ !== undefined ? Number(coords.pfxZ) : null;
        const pfxX = coords.pfxX !== undefined ? Number(coords.pfxX) : null;

        const ivb = pfxZ !== null ? Math.round(pfxZ * 12 * 10) / 10 : null;
        const hb = pfxX !== null ? Math.round(pfxX * 12 * 10) / 10 : null;

        const px = coords.plateX ?? coords.x ?? null;
        const pz = coords.plateZ ?? coords.y ?? null;
        const szTop = Number(pdata.strikeZoneTop || 3.5);
        const szBot = Number(pdata.strikeZoneBottom || 1.5);

        const pTypeDesc = det.type?.description || det.type?.code || "Pitcheo";
        const pTypeCode = det.type?.code || "UN";
        const desc = (det.description || "").toLowerCase();

        const isWhiff =
          desc.includes("swinging strike") ||
          desc.includes("missed") ||
          desc.includes("whiff");
        const isCalled = desc.includes("called strike");
        const isFoul = desc.includes("foul");
        const isInPlay = Boolean(det.isInPlay) || desc.includes("in play");
        const isBall = Boolean(det.isBall) || desc.includes("ball");
        const isStrike =
          Boolean(det.isStrike) || isWhiff || isCalled || isFoul || isInPlay;

        const outs = ev.count?.outs ?? 0;
        const balls = ev.count?.balls ?? 0;
        const strikes = ev.count?.strikes ?? 0;

        const isZone =
          px !== null &&
          Math.abs(Number(px)) <= 0.85 &&
          Number(pz) >= szBot &&
          Number(pz) <= szTop;

        const li = calculateSimpleLI(inning, outs, scoreDiff);

        parsedPitches.push({
          pitchNumber: pNum++,
          pitchName: pTypeDesc,
          pitchType: pTypeCode,
          speed: speed !== null ? Math.round(speed * 10) / 10 : null,
          spin: spin !== null ? Math.round(spin) : null,
          ivb,
          hb,
          plateX: px !== null ? Math.round(Number(px) * 100) / 100 : null,
          plateZ: pz !== null ? Math.round(Number(pz) * 100) / 100 : null,
          szTop,
          szBot,
          inning,
          stand: stand === "L" ? "L" : "R",
          result: det.description || "Pitcheo",
          isWhiff,
          isCalled,
          isFoul,
          isInPlay,
          isBall,
          isStrike,
          isZone,
          outs,
          strikes,
          balls,
          leverageIndex: li,
        });
      }
    }

    const totalPitches = parsedPitches.length;
    const hasStatcast = parsedPitches.some(
      (p) => p.speed !== null && p.ivb !== null
    );

    // Boxscore del lanzador en el juego
    const boxscoreTeams = liveData.liveData?.boxscore?.teams || {};
    let pitcherBox: any = null;
    let isStarter = false;

    for (const side of ["home", "away"] as const) {
      const pList = boxscoreTeams[side]?.pitchers || [];
      if (pList[0] === pitcherId) isStarter = true;
      const pObj = boxscoreTeams[side]?.players?.[`ID${pitcherId}`];
      if (pObj) {
        pitcherBox = pObj.stats?.pitching;
        if (Number(pObj.stats?.pitching?.gamesStarted || 0) > 0) isStarter = true;
      }
    }

    // Decisión del juego
    const decisions = liveData.liveData?.decisions || {};
    let decision = "";
    if (decisions.winner?.id === pitcherId) decision = "W";
    else if (decisions.loser?.id === pitcherId) decision = "L";
    else if (decisions.save?.id === pitcherId) decision = "SV";
    else {
      const holds = decisions.holds || [];
      if (holds.some((h: any) => h.id === pitcherId)) decision = "HLD";
    }

    // Cálculos PBP
    const ballsCount = parsedPitches.filter((p) => p.isBall).length;
    const strikesCount = totalPitches - ballsCount;
    const calledCount = parsedPitches.filter((p) => p.isCalled).length;
    const whiffsCount = parsedPitches.filter((p) => p.isWhiff).length;
    const foulsCount = parsedPitches.filter((p) => p.isFoul).length;
    const inPlayCount = parsedPitches.filter((p) => p.isInPlay).length;
    const swingsCount = whiffsCount + foulsCount + inPlayCount;

    const strikePct = totalPitches > 0 ? (strikesCount / totalPitches) * 100 : 0;
    const cswPct =
      totalPitches > 0 ? ((calledCount + whiffsCount) / totalPitches) * 100 : 0;
    const whiffPct = swingsCount > 0 ? (whiffsCount / swingsCount) * 100 : 0;

    // First pitch strikes
    const firstPitches = parsedPitches.filter((p) => p.balls === 0 && p.strikes === 0);
    const fpStrikes = firstPitches.filter((p) => p.isStrike).length;
    const fpsPct = firstPitches.length > 0 ? (fpStrikes / firstPitches.length) * 100 : 0;

    const pbpTable: PBPDestinationRow[] = [
      {
        destination: "Bolas",
        count: ballsCount,
        pct: `${totalPitches > 0 ? ((ballsCount / totalPitches) * 100).toFixed(1) : 0}%`,
        color: "#3B82F6",
      },
      {
        destination: "Strikes Cantados",
        count: calledCount,
        pct: `${totalPitches > 0 ? ((calledCount / totalPitches) * 100).toFixed(1) : 0}%`,
        color: "#10B981",
      },
      {
        destination: "Strikes Abanicados (Whiff)",
        count: whiffsCount,
        pct: `${totalPitches > 0 ? ((whiffsCount / totalPitches) * 100).toFixed(1) : 0}%`,
        color: "#FDB827",
      },
      {
        destination: "Fouls",
        count: foulsCount,
        pct: `${totalPitches > 0 ? ((foulsCount / totalPitches) * 100).toFixed(1) : 0}%`,
        color: "#F59E0B",
      },
      {
        destination: "En Juego (Out / Hit)",
        count: inPlayCount,
        pct: `${totalPitches > 0 ? ((inPlayCount / totalPitches) * 100).toFixed(1) : 0}%`,
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
      swings: swingsCount,
      calledStrikes: calledCount,
      fouls: foulsCount,
      inPlay: inPlayCount,
    };

    // Carga por entrada (Inning Workload)
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

    // Splits Platoon
    const lhbPitches = parsedPitches.filter((p) => p.stand === "L");
    const rhbPitches = parsedPitches.filter((p) => p.stand === "R");

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
      vsLhb: calcPlatoon(lhbPitches),
      vsRhb: calcPlatoon(rhbPitches),
    };

    // Statcast Table (Repertorio agrupado)
    const statcastMap = new Map<string, PitchDetail[]>();
    for (const p of parsedPitches) {
      const list = statcastMap.get(p.pitchName) || [];
      list.push(p);
      statcastMap.set(p.pitchName, list);
    }

    const statcastTable: StatcastPitchRow[] = Array.from(statcastMap.entries()).map(
      ([pName, pList]) => {
        const cnt = pList.length;
        const usageVal = totalPitches > 0 ? (cnt / totalPitches) * 100 : 0;
        const speeds = pList.map((p) => p.speed).filter((v): v is number => v !== null);
        const spins = pList.map((p) => p.spin).filter((v): v is number => v !== null);
        const ivbs = pList.map((p) => p.ivb).filter((v): v is number => v !== null);
        const hbs = pList.map((p) => p.hb).filter((v): v is number => v !== null);

        const veloAvg =
          speeds.length > 0
            ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10
            : "—";
        const veloMax = speeds.length > 0 ? Math.max(...speeds) : "—";
        const spinAvg =
          spins.length > 0 ? Math.round(spins.reduce((a, b) => a + b, 0) / spins.length) : "—";
        const ivbAvg =
          ivbs.length > 0
            ? Math.round((ivbs.reduce((a, b) => a + b, 0) / ivbs.length) * 10) / 10
            : "—";
        const hbAvg =
          hbs.length > 0
            ? Math.round((hbs.reduce((a, b) => a + b, 0) / hbs.length) * 10) / 10
            : "—";

        const sw = pList.filter((p) => p.isWhiff || p.isFoul || p.isInPlay).length;
        const w = pList.filter((p) => p.isWhiff).length;
        const c = pList.filter((p) => p.isCalled).length;
        const z = pList.filter((p) => p.isZone).length;

        const whiffP = sw > 0 ? (w / sw) * 100 : 0;
        const cswP = cnt > 0 ? ((c + w) / cnt) * 100 : 0;
        const zoneP = cnt > 0 ? (z / cnt) * 100 : 0;

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
          whiffPct: `${whiffP.toFixed(1)}%`,
          cswPct: `${cswP.toFixed(1)}%`,
          zonePct: `${zoneP.toFixed(1)}%`,
          color: getPitchColor(pName, pList[0]?.pitchType),
        };
      }
    );

    statcastTable.sort((a, b) => b.usageVal - a.usageVal);

    const response: PitchGameDataResponse = {
      gamePk,
      pitcherId,
      isStarter,
      role: isStarter ? "Abridor" : "Relevista",
      decision,
      totalPitches,
      hasStatcast,
      boxscore: {
        ip: pitcherBox?.inningsPitched || (totalPitches > 0 ? `${inningsWorkload.length}.0` : "0.0"),
        h: Number(pitcherBox?.hits || 0),
        r: Number(pitcherBox?.runs || 0),
        er: Number(pitcherBox?.earnedRuns || 0),
        bb: Number(pitcherBox?.baseOnBalls || 0),
        so: Number(pitcherBox?.strikeOuts || 0),
        pitches: Number(pitcherBox?.numberOfPitches || totalPitches),
        strikes: Number(pitcherBox?.strikes || strikesCount),
        cswPct: `${cswPct.toFixed(1)}%`,
        whiffPct: `${whiffPct.toFixed(1)}%`,
      },
      statcastTable,
      pbpTable,
      pbpKpis,
      inningsWorkload,
      splitsPlatoon,
      pitches: parsedPitches,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error(`Error in /api/pitching/game-data for gamePk=${gamePk}:`, err);
    return NextResponse.json(
      { error: "Error procesando los datos de pitcheo del partido" },
      { status: 500 }
    );
  }
}
