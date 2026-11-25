import { getTeam, LVBP_TEAMS } from "./constants";
import {
  CollectiveBattingTeam,
  CollectivePitchingTeam,
  CollectiveFieldingTeam,
  CollectiveStatsResult,
  CollectiveLeagueSummary,
  PitchingRoleFilter,
} from "@/types/collective";

interface MlbSplit {
  team?: { id?: number; name?: string };
  stat?: Record<string, unknown>;
}

interface MlbBoxscorePlayer {
  stats?: {
    pitching?: Record<string, unknown>;
  };
}

interface MlbTeamBox {
  team?: { id?: number; name?: string };
  pitchers?: Array<number | string>;
  players?: Record<string, MlbBoxscorePlayer>;
}

export interface MlbBoxscore {
  gamePk?: number;
  gameData?: { game?: { pk?: number } };
  teams?: {
    away?: MlbTeamBox;
    home?: MlbTeamBox;
  };
  away?: MlbTeamBox;
  home?: MlbTeamBox;
}

const FINAL_GAME_STATES = new Set([
  "Final",
  "Completed",
  "Completed Early",
  "Game Over",
]);

const finalizedBoxscoreCache = new Map<number, MlbBoxscore>();

function toNum(val: unknown, defaultVal = 0): number {
  if (val === null || val === undefined || val === "") return defaultVal;
  const parsed = Number(val);
  return isNaN(parsed) ? defaultVal : parsed;
}

function toPctStr(val: number): string {
  return val.toFixed(3).replace(/^0/, "");
}

function parseInningsToOuts(ipVal: unknown): number {
  if (ipVal === null || ipVal === undefined || ipVal === "") return 0;
  const str = String(ipVal).trim();
  const [wholePart, fracPart] = str.split(".");
  const whole = parseInt(wholePart || "0", 10);
  const partial = parseInt((fracPart || "0").charAt(0), 10);
  if (isNaN(whole)) return 0;
  const validPartial = isNaN(partial) ? 0 : Math.min(2, Math.max(0, partial));
  return whole * 3 + validPartial;
}

async function fetchStatsGroup(
  season: number,
  phase: string,
  group: "hitting" | "pitching" | "fielding",
  startDate?: string,
  endDate?: string,
  pitchingRole: PitchingRoleFilter = "all"
): Promise<MlbSplit[]> {
  const isDateRange = Boolean(startDate && endDate);
  const isRoleSplit =
    group === "pitching" && !isDateRange && (pitchingRole === "sp" || pitchingRole === "rp");

  const statsParam = isDateRange
    ? `stats=byDateRange&startDate=${startDate}&endDate=${endDate}`
    : isRoleSplit
    ? `stats=statSplits&sitCodes=${pitchingRole}${phase && phase !== "all" ? `&gameType=${phase}` : ""}`
    : `stats=season${phase && phase !== "all" ? `&gameType=${phase}` : ""}`;
  const url = `https://statsapi.mlb.com/api/v1/teams/stats?season=${season}&sportIds=17&leagueIds=135&group=${group}&${statsParam}`;

  const isPast = Boolean(
    endDate && new Date(endDate).getTime() < Date.now() - 86400000
  );
  const revalidate = isPast ? 86400 : 300;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
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

async function fetchBoxscoresWithConcurrency(
  gamePks: number[],
  concurrency = 12
): Promise<MlbBoxscore[]> {
  const results: MlbBoxscore[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < gamePks.length) {
      const idx = cursor++;
      const gamePk = gamePks[idx];
      const cached = finalizedBoxscoreCache.get(gamePk);
      if (cached) {
        results.push(cached);
        continue;
      }

      try {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`,
          {
            signal: AbortSignal.timeout(10000),
            next: { revalidate: 86400 },
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
            },
          }
        );
        if (!res.ok) continue;
        const box = (await res.json()) as MlbBoxscore;
        if (box && typeof box === "object") {
          if (finalizedBoxscoreCache.size < 2000) {
            finalizedBoxscoreCache.set(gamePk, box);
          }
          results.push(box);
        }
      } catch (err) {
        console.error(`Error fetching boxscore for gamePk ${gamePk}:`, err);
      }
    }
  }

  const workerCount = Math.min(concurrency, gamePks.length);
  if (workerCount === 0) return [];
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export function aggregateBoxscoresByPitchingRole(
  boxscores: MlbBoxscore[],
  role: "sp" | "rp"
): CollectivePitchingTeam[] {
  interface TeamAcc {
    teamId: number;
    fallbackName?: string;
    gamesSet: Set<string | number>;
    outs: number;
    h: number;
    r: number;
    er: number;
    bb: number;
    so: number;
    hr: number;
    wins: number;
    losses: number;
    sv: number;
    holds: number;
    blownSaves: number;
    gidp: number;
    ab: number;
  }

  const teamMap = new Map<number, TeamAcc>();

  for (let boxIdx = 0; boxIdx < boxscores.length; boxIdx++) {
    const box = boxscores[boxIdx];
    const teamsObj = box?.teams || box;
    if (!teamsObj) continue;

    const gameKey = box?.gamePk ?? box?.gameData?.game?.pk ?? boxIdx;

    for (const side of ["away", "home"] as const) {
      const teamBox = teamsObj[side];
      const tid = Number(teamBox?.team?.id || 0);
      if (!tid) continue;

      let acc = teamMap.get(tid);
      if (!acc) {
        acc = {
          teamId: tid,
          fallbackName: teamBox?.team?.name,
          gamesSet: new Set(),
          outs: 0,
          h: 0,
          r: 0,
          er: 0,
          bb: 0,
          so: 0,
          hr: 0,
          wins: 0,
          losses: 0,
          sv: 0,
          holds: 0,
          blownSaves: 0,
          gidp: 0,
          ab: 0,
        };
        teamMap.set(tid, acc);
      }

      const pitchers: Array<number | string> = Array.isArray(teamBox?.pitchers)
        ? teamBox.pitchers
        : [];
      const players: Record<string, MlbBoxscorePlayer> = teamBox?.players || {};

      for (let idx = 0; idx < pitchers.length; idx++) {
        const pid = pitchers[idx];
        const st = players[`ID${pid}`]?.stats?.pitching;
        if (!st) continue;

        const isStarter = Number(st.gamesStarted ?? 0) >= 1 || idx === 0;
        const matches = role === "sp" ? isStarter : !isStarter;
        if (!matches) continue;

        acc.gamesSet.add(gameKey);
        acc.outs += parseInningsToOuts(st.inningsPitched);
        acc.h += toNum(st.hits);
        acc.r += toNum(st.runs);
        acc.er += toNum(st.earnedRuns);
        acc.bb += toNum(st.baseOnBalls);
        acc.so += toNum(st.strikeOuts);
        acc.hr += toNum(st.homeRuns);
        acc.wins += toNum(st.wins);
        acc.losses += toNum(st.losses);
        acc.sv += toNum(st.saves);
        acc.holds += toNum(st.holds);
        acc.blownSaves += toNum(st.blownSaves);
        acc.gidp += toNum(st.groundIntoDoublePlay ?? st.gidp);
        acc.ab += toNum(st.atBats ?? st.ab);
      }
    }
  }

  const rows: Array<{ team: CollectivePitchingTeam; outs: number }> = [];

  for (const acc of teamMap.values()) {
    const teamObj = getTeam(acc.teamId);
    const knownTeam = LVBP_TEAMS[acc.teamId];
    const teamName = knownTeam?.name || acc.fallbackName || teamObj.name || "Equipo";

    const ipDecimal = acc.outs / 3;
    const ipCanonical = Math.floor(acc.outs / 3) + (acc.outs % 3) / 10;
    const ipStr = `${Math.floor(acc.outs / 3)}.${acc.outs % 3}`;

    const era = ipDecimal > 0 ? (acc.er * 9) / ipDecimal : 0;
    const whip = ipDecimal > 0 ? (acc.bb + acc.h) / ipDecimal : 0;
    const k9 = ipDecimal > 0 ? (acc.so * 9) / ipDecimal : 0;
    const bb9 = ipDecimal > 0 ? (acc.bb * 9) / ipDecimal : 0;
    const kbb = acc.bb > 0 ? acc.so / acc.bb : acc.so;
    const baa = acc.ab > 0 ? acc.h / acc.ab : 0;

    rows.push({
      team: {
        teamId: acc.teamId,
        teamName,
        teamAbbr: teamObj.abbreviation || "LVBP",
        logo: teamObj.logoUrl,
        games: acc.gamesSet.size,
        wins: acc.wins,
        losses: acc.losses,
        era,
        eraStr: era.toFixed(2),
        whip,
        whipStr: whip.toFixed(2),
        sv: acc.sv,
        holds: acc.holds,
        blownSaves: acc.blownSaves,
        ip: ipCanonical,
        ipStr,
        h: acc.h,
        r: acc.r,
        er: acc.er,
        bb: acc.bb,
        so: acc.so,
        hr: acc.hr,
        gidp: acc.gidp,
        k9,
        k9Str: k9.toFixed(2),
        bb9,
        bb9Str: bb9.toFixed(2),
        kbb,
        kbbStr: kbb.toFixed(2),
        baa,
        baaStr: toPctStr(baa),
        isLeones: acc.teamId === 695,
      },
      outs: acc.outs,
    });
  }

  rows.sort((a, b) => {
    const aHasOuts = a.outs > 0;
    const bHasOuts = b.outs > 0;
    if (aHasOuts !== bHasOuts) return aHasOuts ? -1 : 1;
    return a.team.era - b.team.era;
  });

  return rows.map((r) => r.team);
}

async function fetchPitchingByRoleFromBoxscores(
  phase: string,
  startDate: string,
  endDate: string,
  role: "sp" | "rp"
): Promise<CollectivePitchingTeam[]> {
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&startDate=${startDate}&endDate=${endDate}${
    phase && phase !== "all" ? `&gameType=${phase}` : ""
  }`;
  const isPast = new Date(endDate).getTime() < Date.now() - 86400000;
  const revalidate = isPast ? 86400 : 300;

  try {
    const res = await fetch(scheduleUrl, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
      },
    });
    if (!res.ok) {
      console.error("Error fetching MLB schedule for role split:", res.status);
      return [];
    }
    const data = await res.json();
    const gamePksSet = new Set<number>();
    for (const dateEntry of data.dates || []) {
      for (const g of dateEntry.games || []) {
        const detailedState = String(g?.status?.detailedState || "");
        const pk = Number(g?.gamePk || 0);
        if (pk > 0 && FINAL_GAME_STATES.has(detailedState)) {
          gamePksSet.add(pk);
        }
      }
    }

    const boxscores = await fetchBoxscoresWithConcurrency(Array.from(gamePksSet), 12);
    return aggregateBoxscoresByPitchingRole(boxscores, role);
  } catch (err) {
    console.error("Error fetching pitching role from boxscores:", err);
    return [];
  }
}

function parsePitchingSplits(pitchingSplits: MlbSplit[]): CollectivePitchingTeam[] {
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
      gidp: toNum(stat.groundIntoDoublePlay),
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

  pitching.sort((a, b) => {
    const aHasIp = a.ip > 0;
    const bHasIp = b.ip > 0;
    if (aHasIp !== bHasIp) return aHasIp ? -1 : 1;
    return a.era - b.era;
  });

  return pitching;
}

export async function getCollectiveStats(
  season = 2025,
  phase = "R",
  startDate?: string,
  endDate?: string,
  pitchingRole: PitchingRoleFilter = "all"
): Promise<CollectiveStatsResult> {
  const isDateRangeRoleSplit =
    Boolean(startDate && endDate) && (pitchingRole === "sp" || pitchingRole === "rp");

  const [hittingSplits, pitchingData, fieldingSplits] = await Promise.all([
    fetchStatsGroup(season, phase, "hitting", startDate, endDate),
    isDateRangeRoleSplit
      ? fetchPitchingByRoleFromBoxscores(
          phase,
          startDate!,
          endDate!,
          pitchingRole as "sp" | "rp"
        )
      : fetchStatsGroup(season, phase, "pitching", startDate, endDate, pitchingRole).then(
          parsePitchingSplits
        ),
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
      gidp: toNum(stat.groundIntoDoublePlay),
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

  // 2. Pitcheo Colectivo (ya resuelto desde boxscores o splits)
  const pitching: CollectivePitchingTeam[] = pitchingData;

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

  const pitchingWithIp = pitching.filter((t) => t.ip > 0);
  const pitchingRatePool = pitchingWithIp.length ? pitchingWithIp : pitching;
  const bestPitchEra = pitchingRatePool.length ? [...pitchingRatePool].sort((a, b) => a.era - b.era)[0] : null;
  const bestPitchWhip = pitchingRatePool.length ? [...pitchingRatePool].sort((a, b) => a.whip - b.whip)[0] : null;
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
    pitchingRole,
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
  const gidp = batting.reduce((acc, t) => acc + t.gidp, 0);

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
    gidp,
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
    gidp: (gidp / uniqueGames).toFixed(1),
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
    gidp: (gidp / teamGamesSafe).toFixed(1),
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
  const gidp = pitching.reduce((acc, t) => acc + t.gidp, 0);

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
    gidp,
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
    gidp: (gidp / uniqueGames).toFixed(1),
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
    gidp: (gidp / teamGamesSafe).toFixed(1),
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
