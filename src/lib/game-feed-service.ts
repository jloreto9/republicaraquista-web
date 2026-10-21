import { supabase } from "./supabase";
import { getTeam } from "./constants";
import { calculateSlashLine, calculatePitchingSplit, formatRate } from "./situational-engine";
import {
  transformCoordinates,
  classifyDirection,
  classifyHardness,
  computeSprayStats,
  EVENT_TRANSLATIONS,
} from "./spray-engine";
import { GameOption, SeasonWpaLeader, GameWpaData } from "@/types/wpa";
import {
  SituationalData,
  SituationalSplit,
  PitchingSituationalSplit,
  LobSummary,
  BatterLobRecord,
  BvpRecord,
} from "@/types/situational";
import { BattedBall, PitchEvent, StrikeZoneMetrics, SprayPlayerOption } from "@/types/spray";
import { getBullpenAndLineups } from "./bullpen";
import { BullpenAndLineupsData } from "@/types/bullpen";
import { getKnownPitcherHand } from "./pitcher-hand-service";

const LEONES_TEAM_ID = 695;

// En-memoria cache de feeds para no re-descargar juegos completados
// (En serverless dura mientras el contenedor viva; para juegos Final es inmutable)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const feedCache = new Map<number, any>();

interface SupabaseGameRow {
  id: number;
  game_pk?: number;
  game_date?: string;
  season?: number;
  game_type?: string;
  status?: string;
  home_team_id: number;
  away_team_id: number;
  home_score?: number;
  away_score?: number;
}

const MONTH_NAMES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

function formatSpanishDate(isoDate?: string): string {
  if (!isoDate || isoDate.length < 10) return "Fecha N/D";
  const parts = isoDate.slice(0, 10).split("-");
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = MONTH_NAMES[monthIdx] || "";
  const year = parts[0];
  return `${day} ${month} ${year}`;
}

/**
 * Consulta en Supabase todos los juegos jugados o en curso de Leones en la temporada dada.
 */
export async function getLeonesPlayedGames(season = 2026): Promise<GameOption[]> {
  if (!supabase) return [];

  try {
    const { data: rawGames, error } = await supabase
      .from("games")
      .select("id, game_date, season, game_type, status, home_team_id, away_team_id, home_score, away_score")
      .eq("season", season)
      .or("home_team_id.eq.695,away_team_id.eq.695")
      .in("status", ["Final", "Completed", "Completed Early", "Game Over", "Live", "In Progress"])
      .order("game_date", { ascending: false });

    if (error || !rawGames) {
      console.error("Error al consultar juegos jugados de Leones:", error);
      return [];
    }

    const games = (rawGames as unknown as SupabaseGameRow[]).map((g, idx, arr) => {
      const isHome = Number(g.home_team_id) === LEONES_TEAM_ID;
      const oppId = isHome ? Number(g.away_team_id) : Number(g.home_team_id);
      const oppTeam = getTeam(oppId);
      const caracasScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
      const oppScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
      const won = caracasScore > oppScore;

      return {
        id: Number(g.id),
        date: formatSpanishDate(g.game_date),
        opponent: isHome ? `vs ${oppTeam.name}` : `@ ${oppTeam.name}`,
        score: `${caracasScore}-${oppScore}`,
        result: (won ? "W" : "L") as "W" | "L",
        gameNumber: arr.length - idx,
      };
    });

    return games;
  } catch (err) {
    console.error("Fallo obteniendo juegos jugados de Leones:", err);
    return [];
  }
}

/**
 * Descarga y cachea el feed en vivo oficial de la MLB Stats API para un juego.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchGameLiveFeed(gamePk: number): Promise<any | null> {
  if (feedCache.has(gamePk)) {
    return feedCache.get(gamePk);
  }

  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn(`MLB Stats API error (${res.status}) para juego ${gamePk}`);
      return null;
    }

    const json = await res.json();
    const status = json?.gameData?.status?.detailedState || "";
    // Solo cachear permanentemente si el juego ha finalizado
    if (["Final", "Completed", "Game Over", "Completed Early"].includes(status)) {
      feedCache.set(gamePk, json);
    }
    return json;
  } catch (err) {
    console.warn(`Error al descargar feed de MLB para juego ${gamePk}:`, err);
    return null;
  }
}

/**
 * Descarga en paralelo los feeds de todos los juegos disputados por Leones en la temporada.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getSeasonLiveFeeds(season = 2026): Promise<any[]> {
  const games = await getLeonesPlayedGames(season);
  if (!games.length) return [];

  const feeds = await Promise.all(
    games.map(async (g) => {
      const feed = await fetchGameLiveFeed(g.id);
      return feed;
    })
  );

  return feeds.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DYNAMIC BULLPEN & LINEUPS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDynamicBullpenAndLineups(season = 2026): Promise<BullpenAndLineupsData> {
  const feeds = await getSeasonLiveFeeds(season);
  if (!feeds.length) {
    return getBullpenAndLineups(season, LEONES_TEAM_ID);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bpRecords: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const luRecords: any[] = [];

  for (const feed of feeds) {
    const gamePk = feed?.gamePk || feed?.gameData?.game?.pk;
    const gameDate = feed?.gameData?.datetime?.originalDate || "";
    const isHome = feed?.gameData?.teams?.home?.id === LEONES_TEAM_ID;
    const oppTeamObj = isHome ? feed?.gameData?.teams?.away : feed?.gameData?.teams?.home;
    const oppTeamName = oppTeamObj?.name || "Rival";
    const oppTeamId = oppTeamObj?.id || 0;

    const box = feed?.liveData?.boxscore;
    const teamBox = isHome ? box?.teams?.home : box?.teams?.away;
    const oppBox = isHome ? box?.teams?.away : box?.teams?.home;

    const leonesScore = teamBox?.teamStats?.batting?.runs ?? 0;
    const oppScore = oppBox?.teamStats?.batting?.runs ?? 0;
    const leonesWon = leonesScore > oppScore;

    // 1. Extraer Bullpen (Relevistas con IR / IRS)
    const pitchersList = teamBox?.pitchers || [];
    const playersDict = teamBox?.players || {};

    pitchersList.forEach((pId: number) => {
      const pData = playersDict[`ID${pId}`];
      const stats = pData?.stats?.pitching;
      if (!stats) return;

      const isStarter = stats.gamesStarted > 0;
      const ir = stats.inheritedRunners ?? 0;
      const irs = stats.inheritedRunnersScored ?? 0;

      // Registrar relevistas que hayan heredado corredores o lanzado como relevo
      if (!isStarter && (ir > 0 || stats.gamesPitched > 0)) {
        bpRecords.push({
          team_id: LEONES_TEAM_ID,
          game_pk: gamePk,
          game_id: gamePk,
          game_date: gameDate,
          opposing_team: oppTeamName,
          pitcher_id: pId,
          pitcher_name: pData?.person?.fullName || "Relevista",
          inning: 0,
          inherited_runners: ir,
          inherited_scored: irs,
        });
      }
    });

    // 2. Extraer Lineup Titular (Orden 1-9)
    const battingOrder = teamBox?.battingOrder || [];
    if (battingOrder.length >= 9) {
      const starters = battingOrder.slice(0, 9).map((pId: number, idx: number) => {
        const pData = playersDict[`ID${pId}`];
        return {
          order: idx + 1,
          player_id: pId,
          player_name: pData?.person?.fullName || "Bateador",
          position: pData?.position?.abbreviation || "DH",
        };
      });

      luRecords.push({
        team_id: LEONES_TEAM_ID,
        game_pk: gamePk,
        game_id: gamePk,
        season,
        game_date: gameDate,
        opponent_id: oppTeamId,
        home_team: isHome ? "Leones del Caracas" : oppTeamName,
        away_team: isHome ? oppTeamName : "Leones del Caracas",
        opposing_team: oppTeamName,
        is_home: isHome,
        leones_score: leonesScore,
        opposing_score: oppScore,
        leones_won: leonesWon,
        score_str: `${leonesScore}-${oppScore}`,
        full_score_str: isHome
          ? `CAR ${leonesScore} - ${oppScore} ${oppTeamObj?.abbreviation || "RIV"}`
          : `${oppTeamObj?.abbreviation || "RIV"} ${oppScore} - ${leonesScore} CAR`,
        starters,
      });
    }
  }

  return getBullpenAndLineups(season, LEONES_TEAM_ID, {
    bullpen_records: bpRecords,
    lineup_records: luRecords,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DYNAMIC SITUATIONAL SPLITS & LOB TRACKER
// ─────────────────────────────────────────────────────────────────────────────

interface SplitBucket {
  pa: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  so: number;
  rbi: number;
  hbp: number;
  sf: number;
}

function emptyBucket(): SplitBucket {
  return { pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, so: 0, rbi: 0, hbp: 0, sf: 0 };
}

function recordPlayInBucket(bucket: SplitBucket, event: string, rbi: number) {
  bucket.pa += 1;
  const isBB = event.includes("Walk");
  const isHBP = event.includes("Hit By Pitch");
  const isSF = event.includes("Sac Fly");
  const isSH = event.includes("Sac Bunt");
  const isHit = ["Single", "Double", "Triple", "Home Run"].includes(event);

  if (!isBB && !isHBP && !isSF && !isSH) {
    bucket.ab += 1;
  }
  if (isHit) bucket.h += 1;
  if (event === "Double") bucket.doubles += 1;
  if (event === "Triple") bucket.triples += 1;
  if (event === "Home Run") bucket.hr += 1;
  if (isBB) bucket.bb += 1;
  if (event.includes("Strikeout")) bucket.so += 1;
  if (isHBP) bucket.hbp += 1;
  if (isSF) bucket.sf += 1;
  bucket.rbi += rbi;
}

interface PitchingBucket {
  pa: number;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  so: number;
  er: number;
  outs: number;
}

function emptyPitchingBucket(): PitchingBucket {
  return { pa: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, so: 0, er: 0, outs: 0 };
}

function recordPitchingPlayInBucket(bucket: PitchingBucket, event: string, outsMade: number, rbi: number) {
  bucket.pa += 1;
  const isBB = event.includes("Walk");
  const isHBP = event.includes("Hit By Pitch");
  const isSF = event.includes("Sac Fly");
  const isSH = event.includes("Sac Bunt");
  const isHit = ["Single", "Double", "Triple", "Home Run"].includes(event);

  if (!isBB && !isHBP && !isSF && !isSH) {
    bucket.ab += 1;
  }
  if (isHit) bucket.h += 1;
  if (event === "Double") bucket.doubles += 1;
  if (event === "Triple") bucket.triples += 1;
  if (event === "Home Run") {
    bucket.hr += 1;
    bucket.er += Math.max(1, rbi);
  } else if (rbi > 0) {
    bucket.er += rbi;
  }
  if (isBB) bucket.bb += 1;
  if (event.includes("Strikeout")) bucket.so += 1;
  bucket.outs += outsMade;
}

export async function getDynamicSituationalData(season = 2026): Promise<SituationalData> {
  const feeds = await getSeasonLiveFeeds(season);
  if (!feeds.length) {
    const { getLeonesSituationalData } = await import("./situational-engine");
    return getLeonesSituationalData(season);
  }

  const buckets: Record<string, SplitBucket> = {
    total: emptyBucket(),
    bases_limpias: emptyBucket(),
    hombres_base: emptyBucket(),
    risp: emptyBucket(),
    risp_2outs: emptyBucket(),
    bases_llenas: emptyBucket(),
    rhp: emptyBucket(),
    lhp: emptyBucket(),
    early: emptyBucket(),
    mid: emptyBucket(),
    late: emptyBucket(),
  };

  const pitchBuckets: Record<string, PitchingBucket> = {
    total: emptyPitchingBucket(),
    bases_limpias: emptyPitchingBucket(),
    hombres_base: emptyPitchingBucket(),
    risp: emptyPitchingBucket(),
    risp_2outs: emptyPitchingBucket(),
    bases_llenas: emptyPitchingBucket(),
    vs_rhb: emptyPitchingBucket(),
    vs_lhb: emptyPitchingBucket(),
    early: emptyPitchingBucket(),
    mid: emptyPitchingBucket(),
    late: emptyPitchingBucket(),
  };

  let totalLobEnding = 0;
  let totalRispLobEnding = 0;
  let totalRispLobMid = 0;

  const batterLobMap: Record<
    number,
    {
      name: string;
      pa: number;
      paRisp: number;
      hRisp: number;
      abRisp: number;
      rbi: number;
      lobEnding: number;
      rispLobEnding: number;
      rispLobMid: number;
    }
  > = {};

  const bvpMap: Record<
    number,
    {
      name: string;
      oppTeam: string;
      bucket: SplitBucket;
    }
  > = {};

  for (const feed of feeds) {
    const isHome = feed?.gameData?.teams?.home?.id === LEONES_TEAM_ID;
    const oppTeamName = isHome
      ? feed?.gameData?.teams?.away?.name || "Rival"
      : feed?.gameData?.teams?.home?.name || "Rival";
    const plays = feed?.liveData?.plays?.allPlays || [];

    for (const play of plays) {
      const isBottom = play.about?.halfInning === "bottom";
      const leonesBatting = isHome ? isBottom : !isBottom;

      if (leonesBatting) {
        const inn = play.about?.inning || 1;
        const outsBefore = play.count?.outs ?? 0;
        const matchup = play.matchup || {};
        const batterId = matchup.batter?.id || 0;
        const batterName = matchup.batter?.fullName || "Bateador";
        const pitcherId = matchup.pitcher?.id || 0;
        const pitcherName = matchup.pitcher?.fullName || "Lanzador";
        const isLeftHanded = matchup.pitcherHand?.code === "L" || (!matchup.pitcherHand?.code && getKnownPitcherHand(pitcherId) === "L");
        const throwsRhp = !isLeftHanded;

        const on1b = Boolean(matchup.postOnFirst);
        const on2b = Boolean(matchup.postOnSecond);
        const on3b = Boolean(matchup.postOnThird);
        const isRisp = on2b || on3b;
        const isLoaded = on1b && on2b && on3b;
        const isBasesEmpty = !on1b && !on2b && !on3b;

        const event = play.result?.event || "Out";
        const rbi = play.result?.rbi || 0;
        const isHit = ["Single", "Double", "Triple", "Home Run"].includes(event);
        const isAb = !event.includes("Walk") && !event.includes("Hit By Pitch") && !event.includes("Sac");

        // Categorizar en buckets ofensivos
        recordPlayInBucket(buckets.total, event, rbi);
        if (isBasesEmpty) recordPlayInBucket(buckets.bases_limpias, event, rbi);
        else recordPlayInBucket(buckets.hombres_base, event, rbi);

        if (isRisp) {
          recordPlayInBucket(buckets.risp, event, rbi);
          if (outsBefore === 2) recordPlayInBucket(buckets.risp_2outs, event, rbi);
        }
        if (isLoaded) recordPlayInBucket(buckets.bases_llenas, event, rbi);

        if (throwsRhp) recordPlayInBucket(buckets.rhp, event, rbi);
        else recordPlayInBucket(buckets.lhp, event, rbi);

        if (inn <= 3) recordPlayInBucket(buckets.early, event, rbi);
        else if (inn <= 6) recordPlayInBucket(buckets.mid, event, rbi);
        else recordPlayInBucket(buckets.late, event, rbi);

        // BVP (Batter vs Pitcher rival)
        if (pitcherId) {
          if (!bvpMap[pitcherId]) {
            bvpMap[pitcherId] = { name: pitcherName, oppTeam: oppTeamName, bucket: emptyBucket() };
          }
          recordPlayInBucket(bvpMap[pitcherId].bucket, event, rbi);
        }

        // LOB Tracker por bateador
        if (batterId) {
          if (!batterLobMap[batterId]) {
            batterLobMap[batterId] = {
              name: batterName,
              pa: 0,
              paRisp: 0,
              hRisp: 0,
              abRisp: 0,
              rbi: 0,
              lobEnding: 0,
              rispLobEnding: 0,
              rispLobMid: 0,
            };
          }
          const bRec = batterLobMap[batterId];
          bRec.pa += 1;
          bRec.rbi += rbi;
          if (isRisp) {
            bRec.paRisp += 1;
            if (isAb) bRec.abRisp += 1;
            if (isHit) bRec.hRisp += 1;
          }

          // Dejados en Base: si el turno terminó en out
          const outsMade = (play.count?.outs ?? 0) - outsBefore;
          if (outsMade > 0) {
            const isThirdOut = play.count?.outs === 3;
            let runnersOn = 0;
            let rispRunners = 0;
            if (on1b) runnersOn++;
            if (on2b) { runnersOn++; rispRunners++; }
            if (on3b) { runnersOn++; rispRunners++; }

            if (isThirdOut) {
              bRec.lobEnding += runnersOn;
              bRec.rispLobEnding += rispRunners;
              totalLobEnding += runnersOn;
              totalRispLobEnding += rispRunners;
            } else if (rispRunners > 0) {
              bRec.rispLobMid += rispRunners;
              totalRispLobMid += rispRunners;
            }
          }
        }
      } else {
        // Pitcheo de Leones del Caracas
        const inn = play.about?.inning || 1;
        const outsBefore = play.count?.outs ?? 0;
        const matchup = play.matchup || {};
        const rivalBatterHand = matchup.batSide?.code || "R";
        const isVsLhb = rivalBatterHand === "L";

        const on1b = Boolean(matchup.postOnFirst);
        const on2b = Boolean(matchup.postOnSecond);
        const on3b = Boolean(matchup.postOnThird);
        const isRisp = on2b || on3b;
        const isLoaded = on1b && on2b && on3b;
        const isBasesEmpty = !on1b && !on2b && !on3b;

        const event = play.result?.event || "Out";
        const rbi = play.result?.rbi || 0;
        const outsMade = Math.max(0, (play.count?.outs ?? 0) - outsBefore);

        recordPitchingPlayInBucket(pitchBuckets.total, event, outsMade, rbi);
        if (isBasesEmpty) recordPitchingPlayInBucket(pitchBuckets.bases_limpias, event, outsMade, rbi);
        else recordPitchingPlayInBucket(pitchBuckets.hombres_base, event, outsMade, rbi);

        if (isRisp) {
          recordPitchingPlayInBucket(pitchBuckets.risp, event, outsMade, rbi);
          if (outsBefore === 2) recordPitchingPlayInBucket(pitchBuckets.risp_2outs, event, outsMade, rbi);
        }
        if (isLoaded) recordPitchingPlayInBucket(pitchBuckets.bases_llenas, event, outsMade, rbi);

        if (isVsLhb) recordPitchingPlayInBucket(pitchBuckets.vs_lhb, event, outsMade, rbi);
        else recordPitchingPlayInBucket(pitchBuckets.vs_rhb, event, outsMade, rbi);

        if (inn <= 3) recordPitchingPlayInBucket(pitchBuckets.early, event, outsMade, rbi);
        else if (inn <= 6) recordPitchingPlayInBucket(pitchBuckets.mid, event, outsMade, rbi);
        else recordPitchingPlayInBucket(pitchBuckets.late, event, outsMade, rbi);
      }
    }
  }

  // Armar splits array
  const createSplit = (name: string, badge: string, b: SplitBucket): SituationalSplit => {
    return {
      situacion: name,
      badge,
      ...calculateSlashLine(b.pa, b.ab, b.h, b.doubles, b.triples, b.hr, b.bb, b.so, b.rbi, b.hbp, b.sf),
    };
  };

  const splits: SituationalSplit[] = [
    createSplit("Total General", "Baseline", buckets.total),
    createSplit("Bases Limpias", "Bases Vacías", buckets.bases_limpias),
    createSplit("Hombres en Base", "Tráfico", buckets.hombres_base),
    createSplit("Posición Anotadora (RISP)", "Oportunidad", buckets.risp),
    createSplit("RISP con 2 Outs (Clutch)", "Alta Presión", buckets.risp_2outs),
    createSplit("Bases Llenas", "Grand Slam Threat", buckets.bases_llenas),
    createSplit("vs Lanzadores Derechos (RHP)", "Platoon RHP", buckets.rhp),
    createSplit("vs Lanzadores Zurdos (LHP)", "Platoon LHP", buckets.lhp),
    createSplit("Entradas Tempranas (1-3)", "Apertura", buckets.early),
    createSplit("Entradas Medias (4-6)", "Desarrollo", buckets.mid),
    createSplit("Entradas Tardías / Clutch (7-9+)", "Definición", buckets.late),
  ];

  const createPitchSplit = (name: string, badge: string, b: PitchingBucket): PitchingSituationalSplit => {
    return calculatePitchingSplit(
      name,
      badge,
      b.pa,
      b.ab,
      b.h,
      b.doubles,
      b.triples,
      b.hr,
      b.bb,
      b.so,
      b.er,
      b.outs
    );
  };

  const pitchingSplits: PitchingSituationalSplit[] = [
    createPitchSplit("Total General", "Baseline", pitchBuckets.total),
    createPitchSplit("Bases Limpias", "Bases Vacías", pitchBuckets.bases_limpias),
    createPitchSplit("Hombres en Base", "Tráfico", pitchBuckets.hombres_base),
    createPitchSplit("Posición Anotadora (RISP)", "Oportunidad", pitchBuckets.risp),
    createPitchSplit("RISP con 2 Outs (Clutch)", "Alta Presión", pitchBuckets.risp_2outs),
    createPitchSplit("Bases Llenas", "Grand Slam Threat", pitchBuckets.bases_llenas),
    createPitchSplit("vs Bateadores Derechos (RHB)", "Platoon RHB", pitchBuckets.vs_rhb),
    createPitchSplit("vs Bateadores Zurdos (LHB)", "Platoon LHB", pitchBuckets.vs_lhb),
    createPitchSplit("Entradas Tempranas (1-3)", "Apertura", pitchBuckets.early),
    createPitchSplit("Entradas Medias (4-6)", "Desarrollo", pitchBuckets.mid),
    createPitchSplit("Entradas Tardías / Clutch (7-9+)", "Definición", pitchBuckets.late),
  ];

  const lobSummary: LobSummary = {
    totalPa: buckets.total.pa,
    totalLobEnding,
    totalRispLobEnding,
    totalRispLobMid,
    totalRispLob: totalRispLobEnding + totalRispLobMid,
  };

  const lobBatterRanking: BatterLobRecord[] = Object.entries(batterLobMap)
    .map(([pIdStr, d]) => {
      const avgRispNum = d.abRisp > 0 ? d.hRisp / d.abRisp : 0;
      return {
        batterId: Number(pIdStr),
        batterName: d.name,
        pa: d.pa,
        paRisp: d.paRisp,
        rbi: d.rbi,
        avgRisp: formatRate(avgRispNum),
        lobEnding: d.lobEnding,
        rispLobEnding: d.rispLobEnding,
        rispLobMid: d.rispLobMid,
        totalRispLob: d.rispLobEnding + d.rispLobMid,
      };
    })
    .sort((a, b) => b.totalRispLob - a.totalRispLob || b.lobEnding - a.lobEnding);

  const bvpRecords: BvpRecord[] = Object.entries(bvpMap)
    .map(([pIdStr, d]) => {
      return {
        pitcherId: Number(pIdStr),
        pitcherName: d.name,
        opposingTeam: d.oppTeam,
        ...calculateSlashLine(
          d.bucket.pa,
          d.bucket.ab,
          d.bucket.h,
          d.bucket.doubles,
          d.bucket.triples,
          d.bucket.hr,
          d.bucket.bb,
          d.bucket.so,
          d.bucket.rbi,
          d.bucket.hbp,
          d.bucket.sf
        ),
      };
    })
    .sort((a, b) => b.pa - a.pa);

  return {
    splits,
    pitchingSplits,
    lobSummary,
    lobBatterRanking,
    bvpRecords,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DYNAMIC SPRAY CHARTS & STRIKE ZONE
// ─────────────────────────────────────────────────────────────────────────────

export async function getDynamicSprayData(
  season = 2026,
  selectedPlayerId = 0
): Promise<{
  battedBalls: BattedBall[];
  sprayStats: ReturnType<typeof computeSprayStats>;
  pitches: PitchEvent[];
  strikeZoneMetrics: StrikeZoneMetrics;
  players: SprayPlayerOption[];
}> {
  const feeds = await getSeasonLiveFeeds(season);
  if (!feeds.length) {
    const { getPlayerBattedBalls, computeSprayStats, getPlayerStrikeZoneData, getLeonesSprayPlayers } =
      await import("./spray-engine");
    const balls = getPlayerBattedBalls(selectedPlayerId, season);
    const stats = computeSprayStats(balls);
    const { pitches, metrics } = getPlayerStrikeZoneData(selectedPlayerId, season);
    const players = getLeonesSprayPlayers(season);
    return { battedBalls: balls, sprayStats: stats, pitches, strikeZoneMetrics: metrics, players };
  }

  const allBattedBalls: BattedBall[] = [];
  const pitchesByBatter: Record<string, PitchEvent[]> = {};
  const playerStatsMap: Record<number, { name: string; ballsCount: number; hitsCount: number }> = {};

  for (const feed of feeds) {
    const gamePk = feed?.gamePk || feed?.gameData?.game?.pk;
    const gameDate = feed?.gameData?.datetime?.originalDate || "";
    const isHome = feed?.gameData?.teams?.home?.id === LEONES_TEAM_ID;
    const plays = feed?.liveData?.plays?.allPlays || [];

    for (const play of plays) {
      const isBottom = play.about?.halfInning === "bottom";
      const leonesBatting = isHome ? isBottom : !isBottom;
      if (!leonesBatting) continue;

      const matchup = play.matchup || {};
      const batterId = matchup.batter?.id || 0;
      const batterName = matchup.batter?.fullName || "Bateador";
      const pitcherId = matchup.pitcher?.id || 0;
      const pitcherName = matchup.pitcher?.fullName || "Lanzador";
      const batSide = matchup.batSide?.code || "R";
      const event = play.result?.event || "Out";
      const rbi = play.result?.rbi || 0;
      const desc = play.result?.description || "";
      const isHit = ["Single", "Double", "Triple", "Home Run"].includes(event);
      const eventGroup = ["Single", "Double", "Triple", "Home Run", "Field Error"].includes(event)
        ? event
        : "Out";

      if (batterId) {
        if (!playerStatsMap[batterId]) {
          playerStatsMap[batterId] = { name: batterName, ballsCount: 0, hitsCount: 0 };
        }
      }

      for (const ev of play.playEvents || []) {
        // Extraer Batazo
        if (ev.hitData?.coordinates?.coordX != null && ev.hitData?.coordinates?.coordY != null) {
          const cx = ev.hitData.coordinates.coordX;
          const cy = ev.hitData.coordinates.coordY;
          if (cx !== 0 || cy !== 0) {
            const coords = transformCoordinates(cx, cy);
            const traj = ev.hitData.trajectory || "unknown";
            const rawHard = ev.hitData.hardness || "medium";
            const hardness = classifyHardness(event, traj, coords.distFt, rawHard);
            const dir = classifyDirection(coords.angleDeg, batSide);

            if (batterId) {
              playerStatsMap[batterId].ballsCount++;
              if (isHit) playerStatsMap[batterId].hitsCount++;
            }

            allBattedBalls.push({
              gamePk,
              gameDate,
              batterId,
              batterName,
              pitcherId,
              pitcherName,
              event,
              eventGroup,
              eventEs: EVENT_TRANSLATIONS[event] || event,
              isHit,
              description: desc,
              rbi,
              coordX: cx,
              coordY: cy,
              xFt: coords.xFt,
              yFt: coords.yFt,
              distanceFt: coords.distFt,
              sprayAngle: coords.angleDeg,
              direction: dir,
              trajectory: traj,
              trajectoryEs: traj,
              hardness,
              hardnessEs: hardness,
            });
          }
        }

        // Extraer Pitcheo
        if (ev.pitchData?.coordinates?.x != null && ev.pitchData?.coordinates?.y != null) {
          const xRaw = ev.pitchData.coordinates.x;
          const yRaw = ev.pitchData.coordinates.y;
          const szTop = ev.pitchData.strikeZoneTop || 3.4;
          const szBot = ev.pitchData.strikeZoneBottom || 1.5;
          const xFt = Math.round((xRaw - 110.0) * (1.417 / 35.0) * 100) / 100;
          const zFt = Math.round((szBot + (szTop - szBot) * ((176.0 - yRaw) / 40.0)) * 100) / 100;

          let zone = 0;
          const inHoriz = xFt >= -0.71 && xFt <= 0.71;
          const inVert = zFt >= szBot && zFt <= szTop;
          if (inHoriz && inVert) {
            const col = xFt < -0.24 ? 0 : xFt < 0.24 ? 1 : 2;
            const rowHeight = (szTop - szBot) / 3;
            const row = zFt > szTop - rowHeight ? 0 : zFt > szTop - 2 * rowHeight ? 1 : 2;
            zone = row * 3 + col + 1;
          }

          const call = ev.details?.call?.code || "";
          const descCall = ev.details?.description || "";
          const isSwing = ["S", "X", "F", "D", "E"].includes(call) || descCall.includes("Swinging");
          const isWhiff = call === "S" || descCall.includes("Swinging Strike");
          const isContact = ["X", "F", "D", "E"].includes(call) || descCall.includes("Foul") || descCall.includes("In play");
          const isCalledStrike = call === "C" || descCall.includes("Called Strike");

          let callGroup: "Whiff" | "Called Strike" | "Foul" | "In Play" | "Ball" | "Other" = "Other";
          if (isWhiff) callGroup = "Whiff";
          else if (isCalledStrike) callGroup = "Called Strike";
          else if (descCall.includes("Foul")) callGroup = "Foul";
          else if (descCall.includes("In play")) callGroup = "In Play";
          else if (call === "B" || descCall.includes("Ball")) callGroup = "Ball";

          const pEvent: PitchEvent = {
            pitchNumber: ev.index || 0,
            pitcherId,
            pitcherName,
            pitchType: ev.details?.type?.code || "FA",
            speedMph: ev.pitchData?.startSpeed || 0,
            xFt,
            zFt,
            zone,
            inZone: inHoriz && inVert,
            isSwing,
            isWhiff,
            isContact,
            isCalledStrike,
            callDesc: descCall,
            callGroup,
          };

          const bKey = String(batterId);
          if (!pitchesByBatter[bKey]) pitchesByBatter[bKey] = [];
          pitchesByBatter[bKey].push(pEvent);
        }
      }
    }
  }

  // Filtrar batazos para el jugador seleccionado
  let filteredBalls = allBattedBalls;
  if (selectedPlayerId && selectedPlayerId !== 0) {
    const subset = allBattedBalls.filter((b) => b.batterId === selectedPlayerId);
    if (subset.length > 0) filteredBalls = subset;
  }
  const sprayStats = computeSprayStats(filteredBalls);

  // Filtrar pitcheos para el jugador seleccionado
  let playerPitches: PitchEvent[] = [];
  if (!selectedPlayerId || selectedPlayerId === 0) {
    playerPitches = Object.values(pitchesByBatter).flat().slice(0, 300);
  } else {
    playerPitches = pitchesByBatter[String(selectedPlayerId)] || [];
  }

  // Calcular métricas de disciplina en home
  const total = playerPitches.length;
  let inZoneCount = 0;
  let oSwing = 0;
  let oTotal = 0;
  let zSwing = 0;
  let zTotal = 0;
  let zContact = 0;
  let oContact = 0;
  let whiffs = 0;
  let calledStrikes = 0;
  let swings = 0;
  const zoneCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

  for (const p of playerPitches) {
    if (p.zone >= 1 && p.zone <= 9) zoneCounts[p.zone] = (zoneCounts[p.zone] || 0) + 1;
    if (p.inZone) {
      inZoneCount++;
      zTotal++;
      if (p.isSwing) {
        swings++;
        zSwing++;
        if (p.isContact) zContact++;
      } else if (p.isCalledStrike) {
        calledStrikes++;
      }
    } else {
      oTotal++;
      if (p.isSwing) {
        swings++;
        oSwing++;
        if (p.isContact) oContact++;
      }
    }
    if (p.isWhiff) whiffs++;
  }

  const strikeZoneMetrics: StrikeZoneMetrics = {
    totalPitches: total,
    zonePct: `${((inZoneCount / Math.max(1, total)) * 100).toFixed(1)}%`,
    oSwingPct: `${((oSwing / Math.max(1, oTotal)) * 100).toFixed(1)}%`,
    zSwingPct: `${((zSwing / Math.max(1, zTotal)) * 100).toFixed(1)}%`,
    zContactPct: `${((zContact / Math.max(1, zSwing)) * 100).toFixed(1)}%`,
    oContactPct: `${((oContact / Math.max(1, oSwing)) * 100).toFixed(1)}%`,
    whiffPct: `${((whiffs / Math.max(1, swings)) * 100).toFixed(1)}%`,
    cswPct: `${(((calledStrikes + whiffs) / Math.max(1, total)) * 100).toFixed(1)}%`,
    swStrPct: `${((whiffs / Math.max(1, total)) * 100).toFixed(1)}%`,
    zoneCounts,
  };

  // Construir opciones de jugadores para el dropdown
  const players: SprayPlayerOption[] = [
    {
      id: 0,
      name: "Toda la Ofensiva de Leones",
      battedBallsCount: allBattedBalls.length,
      hitsCount: allBattedBalls.filter((b) => b.isHit).length,
    },
    ...Object.entries(playerStatsMap)
      .map(([pIdStr, d]) => ({
        id: Number(pIdStr),
        name: d.name,
        battedBallsCount: d.ballsCount,
        hitsCount: d.hitsCount,
      }))
      .filter((p) => p.battedBallsCount > 0)
      .sort((a, b) => b.battedBallsCount - a.battedBallsCount),
  ];

  return {
    battedBalls: filteredBalls,
    sprayStats,
    pitches: playerPitches.slice(0, 250),
    strikeZoneMetrics,
    players,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DYNAMIC WPA LEADERS & LAST GAME MVP
// ─────────────────────────────────────────────────────────────────────────────

export async function getDynamicSeasonWpaLeaders(season = 2026): Promise<SeasonWpaLeader[]> {
  const games = await getLeonesPlayedGames(season);
  if (!games.length) {
    const { getSeasonWpaLeaders } = await import("./wpa-engine");
    return getSeasonWpaLeaders(season);
  }

  const { processGameWpa } = await import("./wpa-engine");

  const playerAgg: Record<
    number,
    {
      name: string;
      type: "batter" | "pitcher";
      gamesSet: Set<number>;
      paOrBf: number;
      wpaTotal: number;
      wpaLiTotal: number;
      liWeightedSum: number;
      clutchTotal: number;
    }
  > = {};

  for (const g of games) {
    const gameWpa: GameWpaData | null = await processGameWpa(g.id);
    if (!gameWpa?.plays) continue;

    for (const p of gameWpa.plays) {
      const isBatter = p.leonesBatting;
      const pId = isBatter ? p.batterId : p.pitcherId;
      const pName = isBatter ? p.batter : p.pitcher;
      if (!pId) continue;

      if (!playerAgg[pId]) {
        playerAgg[pId] = {
          name: pName,
          type: isBatter ? "batter" : "pitcher",
          gamesSet: new Set(),
          paOrBf: 0,
          wpaTotal: 0,
          wpaLiTotal: 0,
          liWeightedSum: 0,
          clutchTotal: 0,
        };
      }

      const rec = playerAgg[pId];
      rec.gamesSet.add(g.id);
      rec.paOrBf += 1;
      rec.wpaTotal += p.wpa;
      rec.wpaLiTotal += p.wpaLi;
      rec.liWeightedSum += p.li;
      rec.clutchTotal += p.wpa - p.wpaLi;
    }
  }

  const leaders: SeasonWpaLeader[] = Object.entries(playerAgg)
    .map(([pIdStr, d]) => {
      const liAvg = d.paOrBf > 0 ? Number((d.liWeightedSum / d.paOrBf).toFixed(2)) : 1.0;
      return {
        playerId: Number(pIdStr),
        player: d.name,
        games: d.gamesSet.size,
        paOrBf: d.paOrBf,
        wpa: Number(d.wpaTotal.toFixed(2)),
        wpaLi: Number(d.wpaLiTotal.toFixed(2)),
        liAvg,
        clutch: Number(d.clutchTotal.toFixed(2)),
        type: d.type,
      };
    })
    .sort((a, b) => b.wpa - a.wpa);

  return leaders;
}
