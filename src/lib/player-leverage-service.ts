import {
  supabase,
  fetchAllSupabasePages,
  hasBatterAppearance,
  hasPitcherAppearance,
  isExhibitionGameType,
  isPlayedGameStatus,
} from "./supabase";
import { ACTIVE_SEASON, LVBP_TEAM_IDS } from "./constants";
import {
  calculateWinExpectancy,
  calculateLeverageIndex,
  encodeBaseState,
} from "./wpa-engine";
import { fetchGameLiveFeed } from "./game-feed-service";
import {
  computeBatterFanGraphsMetrics,
  computePitcherFanGraphsMetrics,
  outsToInningsDisplay,
} from "./player-splits-service";
import {
  LeverageTier,
  PlayerLeverageRow,
  PitcherLeverageRow,
  PlayerLeverageResult,
} from "@/types/player-splits";

export const LEVERAGE_THRESHOLDS = {
  lowMax: 0.85,
  highMin: 1.50,
} as const;

export function classifyLeverageTier(li: number): LeverageTier {
  if (li < LEVERAGE_THRESHOLDS.lowMax) return "low";
  if (li <= LEVERAGE_THRESHOLDS.highMin) return "mid";
  return "high";
}

interface CacheEntry {
  data: PlayerLeverageResult;
  timestamp: number;
}

const leverageCache = new Map<string, CacheEntry>();
const ACTIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const CLOSED_CACHE_TTL_MS = 60 * 60 * 1000;
const FEED_FETCH_CONCURRENCY = 8;

export function clearPlayerLeverageCache(): void {
  leverageCache.clear();
}

const NON_PA_EVENTS = new Set([
  "stolen_base_2b",
  "stolen_base_3b",
  "stolen_base_home",
  "caught_stealing_2b",
  "caught_stealing_3b",
  "caught_stealing_home",
  "pickoff_1b",
  "pickoff_2b",
  "pickoff_3b",
  "pickoff_caught_stealing_2b",
  "pickoff_caught_stealing_3b",
  "pickoff_caught_stealing_home",
  "wild_pitch",
  "passed_ball",
  "balk",
  "defensive_indiff",
  "other_advance",
  "runner_out",
]);

function isNonPaEvent(eventType: string): boolean {
  if (!eventType) return false;
  if (NON_PA_EVENTS.has(eventType)) return true;
  return (
    eventType.startsWith("caught_stealing") ||
    eventType.startsWith("pickoff") ||
    eventType.startsWith("stolen_base")
  );
}

function formatSignedWpa(wpa: number): string {
  const rounded = Math.round(wpa * 1000) / 1000;
  const safe = Object.is(rounded, -0) ? 0 : rounded;
  return safe >= 0 ? `+${safe.toFixed(3)}` : safe.toFixed(3);
}

interface TierSpec {
  tier: LeverageTier;
  splitName: string;
  badge: string;
}

const TIER_SPECS: TierSpec[] = [
  { tier: "high", splitName: "Alta Presión (LI > 1.50)", badge: "Alta Presión" },
  { tier: "mid", splitName: "Presión Media (0.85 – 1.50)", badge: "Presión Media" },
  { tier: "low", splitName: "Baja Presión (LI < 0.85)", badge: "Baja Presión" },
];

interface BatterTierAcc {
  gamesSet: Set<number | string>;
  pa: number;
  ab: number;
  r: number;
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
  sb: number;
  liSum: number;
  liCount: number;
  wpaSum: number;
}

interface PitcherTierAcc {
  gamesSet: Set<number | string>;
  startsSet: Set<number | string>;
  outs: number;
  bf: number;
  ab: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  liSum: number;
  liCount: number;
  wpaSum: number;
}

function createEmptyBatterAcc(): BatterTierAcc {
  return {
    gamesSet: new Set(),
    pa: 0,
    ab: 0,
    r: 0,
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
    sb: 0,
    liSum: 0,
    liCount: 0,
    wpaSum: 0,
  };
}

function createEmptyPitcherAcc(): PitcherTierAcc {
  return {
    gamesSet: new Set(),
    startsSet: new Set(),
    outs: 0,
    bf: 0,
    ab: 0,
    h: 0,
    r: 0,
    er: 0,
    bb: 0,
    so: 0,
    hr: 0,
    liSum: 0,
    liCount: 0,
    wpaSum: 0,
  };
}

/**
 * Agrega jugadas de feeds en vivo de MLB Stats API clasificadas por nivel de Leverage Index (LI).
 */
export function aggregatePlaysByLeverage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feeds: any[],
  playerId: number,
  type: "batter" | "pitcher",
  season: number
): PlayerLeverageResult {
  const batterBuckets: Record<LeverageTier, BatterTierAcc> = {
    high: createEmptyBatterAcc(),
    mid: createEmptyBatterAcc(),
    low: createEmptyBatterAcc(),
  };
  const pitcherBuckets: Record<LeverageTier, PitcherTierAcc> = {
    high: createEmptyPitcherAcc(),
    mid: createEmptyPitcherAcc(),
    low: createEmptyPitcherAcc(),
  };

  const playerGameIds = new Set<number | string>();
  let totalLiSum = 0;
  let totalLiCount = 0;
  let totalWpaSum = 0;

  for (let feedIdx = 0; feedIdx < feeds.length; feedIdx++) {
    const feed = feeds[feedIdx];
    if (!feed) continue;

    const statusObj = feed?.gameData?.status || {};
    const abstractState = String(statusObj.abstractGameState || "");
    const statusCode = String(statusObj.statusCode || "");
    const detailedState = String(statusObj.detailedState || "");
    const isGameOver =
      abstractState === "Final" ||
      statusCode === "F" ||
      statusCode === "O" ||
      statusCode === "FR" ||
      ["Final", "Completed", "Completed Early", "Game Over"].includes(detailedState);

    const rawPlays = feed?.liveData?.plays?.allPlays || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPlays = rawPlays.filter((p: any) => p.about?.isComplete !== false && p.result?.event);
    if (!allPlays.length) continue;

    const gameKey: number | string =
      feed?.gamePk ?? feed?.gameData?.game?.pk ?? `feed-${feedIdx}`;

    const homeBoxPlayer =
      feed?.liveData?.boxscore?.teams?.home?.players?.[`ID${playerId}`];
    const awayBoxPlayer =
      feed?.liveData?.boxscore?.teams?.away?.players?.[`ID${playerId}`];
    const boxPitcherStart =
      Number(
        homeBoxPlayer?.stats?.pitching?.gamesStarted ??
          awayBoxPlayer?.stats?.pitching?.gamesStarted ??
          0
      ) > 0;

    let prevHomeWe = calculateWinExpectancy(1, false, 0, 0, 0, 0);
    let homeScore = 0;
    let awayScore = 0;

    for (let idx = 0; idx < allPlays.length; idx++) {
      const play = allPlays[idx];
      const about = play.about || {};
      const result = play.result || {};
      const matchup = play.matchup || {};
      const count = play.count || {};

      const inning = Number(about.inning || 1);
      const halfInning = String(about.halfInning || "top");
      const isBottom = halfInning === "bottom";

      let outsBefore = 0;
      let baseStateBefore = 0;
      if (idx > 0) {
        const prevPlay = allPlays[idx - 1];
        const prevOuts = Number(prevPlay.count?.outs || 0);
        const sameHalf =
          Number(prevPlay.about?.inning || 1) === inning &&
          String(prevPlay.about?.halfInning || "top") === halfInning;
        if (prevOuts < 3 && sameHalf) {
          outsBefore = prevOuts;
          baseStateBefore = encodeBaseState(
            Boolean(prevPlay.matchup?.postOnFirst),
            Boolean(prevPlay.matchup?.postOnSecond),
            Boolean(prevPlay.matchup?.postOnThird)
          );
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runners: any[] = Array.isArray(play.runners) ? play.runners : [];
      const runsInPlay = runners.filter((r) => r.movement?.end === "score").length;

      const homeScoreBefore = homeScore;
      const awayScoreBefore = awayScore;

      if (isBottom) {
        homeScore += runsInPlay;
      } else {
        awayScore += runsInPlay;
      }

      const homeScoreAfter = homeScore;
      const awayScoreAfter = awayScore;
      const outsAtEnd = Number(count.outs || 0);

      const weHomeBefore =
        idx === 0
          ? calculateWinExpectancy(
              inning,
              isBottom,
              Math.min(2, outsBefore),
              baseStateBefore,
              homeScoreBefore,
              awayScoreBefore
            )
          : prevHomeWe;

      let weHomeAfter: number;
      if (isGameOver && idx === allPlays.length - 1) {
        weHomeAfter = homeScoreAfter > awayScoreAfter ? 1.0 : 0.0;
      } else {
        let nextInn = inning;
        let nextIsBottom = isBottom;
        let nextOuts = outsAtEnd;
        let nextBaseState = 0;

        if (outsAtEnd >= 3) {
          if (isBottom) {
            nextInn = inning + 1;
            nextIsBottom = false;
          } else {
            nextIsBottom = true;
          }
          nextOuts = 0;
          nextBaseState = 0;
        } else {
          nextBaseState = encodeBaseState(
            Boolean(matchup.postOnFirst),
            Boolean(matchup.postOnSecond),
            Boolean(matchup.postOnThird)
          );
        }

        weHomeAfter = calculateWinExpectancy(
          nextInn,
          nextIsBottom,
          Math.min(2, nextOuts),
          nextBaseState,
          homeScoreAfter,
          awayScoreAfter
        );
      }

      const li = calculateLeverageIndex(
        inning,
        isBottom,
        Math.min(2, outsBefore),
        baseStateBefore,
        homeScoreBefore,
        awayScoreBefore
      );
      const wpaHome = weHomeAfter - weHomeBefore;
      prevHomeWe = weHomeAfter;

      const tier = classifyLeverageTier(li);
      const eventType = String(result.eventType || "").toLowerCase();

      if (type === "batter") {
        const isBatter = Number(matchup.batter?.id) === playerId;
        const batterScored = runners.some(
          (r) =>
            Number(r.details?.runner?.id) === playerId && r.movement?.end === "score"
        );

        if (isBatter || batterScored) {
          playerGameIds.add(gameKey);
          batterBuckets[tier].gamesSet.add(gameKey);
        }

        if (batterScored) {
          batterBuckets[tier].r += 1;
        }

        if (isBatter) {
          const acc = batterBuckets[tier];
          if (!isNonPaEvent(eventType)) {
            acc.pa += 1;
            switch (eventType) {
              case "single":
                acc.ab += 1;
                acc.h += 1;
                break;
              case "double":
                acc.ab += 1;
                acc.h += 1;
                acc.doubles += 1;
                break;
              case "triple":
                acc.ab += 1;
                acc.h += 1;
                acc.triples += 1;
                break;
              case "home_run":
                acc.ab += 1;
                acc.h += 1;
                acc.hr += 1;
                break;
              case "walk":
              case "intent_walk":
                acc.bb += 1;
                break;
              case "hit_by_pitch":
                acc.hbp += 1;
                break;
              case "sac_fly":
              case "sac_fly_double_play":
                acc.sf += 1;
                break;
              case "sac_bunt":
              case "sac_bunt_double_play":
                acc.sh += 1;
                break;
              case "catcher_interf":
                break;
              case "strikeout":
              case "strikeout_double_play":
                acc.ab += 1;
                acc.so += 1;
                break;
              default:
                acc.ab += 1;
                break;
            }
          }

          acc.rbi += Number(result.rbi || 0);

          const batterWpa = isBottom ? wpaHome : -wpaHome;
          acc.liSum += li;
          acc.liCount += 1;
          acc.wpaSum += batterWpa;
          totalLiSum += li;
          totalLiCount += 1;
          totalWpaSum += batterWpa;
        }
      } else {
        const isCurrentPitcher = Number(matchup.pitcher?.id) === playerId;

        let chargedRuns = 0;
        let chargedEarnedRuns = 0;
        for (const r of runners) {
          if (r.movement?.end !== "score") continue;
          const respId =
            r.details?.responsiblePitcher?.id !== undefined &&
            r.details?.responsiblePitcher?.id !== null
              ? Number(r.details.responsiblePitcher.id)
              : Number(matchup.pitcher?.id);
          if (respId === playerId) {
            chargedRuns += 1;
            if (r.details?.earned === true) {
              chargedEarnedRuns += 1;
            }
          }
        }

        if (isCurrentPitcher || chargedRuns > 0) {
          playerGameIds.add(gameKey);
          pitcherBuckets[tier].gamesSet.add(gameKey);
          if (boxPitcherStart) {
            pitcherBuckets[tier].startsSet.add(gameKey);
          }
        }

        if (chargedRuns > 0) {
          pitcherBuckets[tier].r += chargedRuns;
          pitcherBuckets[tier].er += chargedEarnedRuns;
        }

        if (isCurrentPitcher) {
          const acc = pitcherBuckets[tier];
          const outsOnPlay = Math.max(0, outsAtEnd - outsBefore);
          acc.outs += outsOnPlay;

          if (!isNonPaEvent(eventType)) {
            acc.bf += 1;
            switch (eventType) {
              case "single":
              case "double":
              case "triple":
                acc.ab += 1;
                acc.h += 1;
                break;
              case "home_run":
                acc.ab += 1;
                acc.h += 1;
                acc.hr += 1;
                break;
              case "walk":
              case "intent_walk":
                acc.bb += 1;
                break;
              case "hit_by_pitch":
                break;
              case "sac_fly":
              case "sac_fly_double_play":
              case "sac_bunt":
              case "sac_bunt_double_play":
              case "catcher_interf":
                break;
              case "strikeout":
              case "strikeout_double_play":
                acc.ab += 1;
                acc.so += 1;
                break;
              default:
                acc.ab += 1;
                break;
            }
          }

          const pitcherWpa = isBottom ? -wpaHome : wpaHome;
          acc.liSum += li;
          acc.liCount += 1;
          acc.wpaSum += pitcherWpa;
          totalLiSum += li;
          totalLiCount += 1;
          totalWpaSum += pitcherWpa;
        }
      }
    }
  }

  const avgLi =
    totalLiCount > 0 ? Math.round((totalLiSum / totalLiCount) * 100) / 100 : 0;
  const totalWpa = Math.round(totalWpaSum * 1000) / 1000;

  if (type === "batter") {
    const batterRows: PlayerLeverageRow[] = TIER_SPECS.map((spec) => {
      const acc = batterBuckets[spec.tier];
      const metrics = computeBatterFanGraphsMetrics(
        acc.ab,
        acc.h,
        acc.doubles,
        acc.triples,
        acc.hr,
        acc.bb,
        acc.so,
        acc.hbp,
        acc.sf,
        acc.pa
      );
      const rowAvgLi =
        acc.liCount > 0 ? Math.round((acc.liSum / acc.liCount) * 100) / 100 : 0;
      const rowWpa = Math.round(acc.wpaSum * 1000) / 1000;

      return {
        splitName: spec.splitName,
        category: "leverage",
        badge: spec.badge,
        games: acc.gamesSet.size,
        ...metrics,
        ab: acc.ab,
        r: acc.r,
        h: acc.h,
        doubles: acc.doubles,
        triples: acc.triples,
        hr: acc.hr,
        rbi: acc.rbi,
        bb: acc.bb,
        so: acc.so,
        hbp: acc.hbp,
        sf: acc.sf,
        sb: acc.sb,
        tier: spec.tier,
        avgLi: rowAvgLi,
        avgLiStr: rowAvgLi.toFixed(2),
        wpa: rowWpa,
        wpaStr: formatSignedWpa(rowWpa),
      };
    });

    return {
      playerId,
      type,
      season,
      gamesAnalyzed: playerGameIds.size,
      avgLi,
      avgLiStr: avgLi.toFixed(2),
      totalWpa,
      totalWpaStr: formatSignedWpa(totalWpa),
      thresholds: { ...LEVERAGE_THRESHOLDS },
      batterRows,
    };
  }

  const pitcherRows: PitcherLeverageRow[] = TIER_SPECS.map((spec) => {
    const acc = pitcherBuckets[spec.tier];
    const ip = acc.outs / 3;
    const metrics = computePitcherFanGraphsMetrics(
      ip,
      acc.h,
      acc.er,
      acc.bb,
      acc.so,
      acc.hr,
      acc.bf,
      acc.ab
    );
    const rowAvgLi =
      acc.liCount > 0 ? Math.round((acc.liSum / acc.liCount) * 100) / 100 : 0;
    const rowWpa = Math.round(acc.wpaSum * 1000) / 1000;

    return {
      splitName: spec.splitName,
      category: "leverage",
      badge: spec.badge,
      games: acc.gamesSet.size,
      starts: acc.startsSet.size,
      ip,
      ipDisplay: outsToInningsDisplay(acc.outs),
      h: acc.h,
      r: acc.r,
      er: acc.er,
      bb: acc.bb,
      so: acc.so,
      hr: acc.hr,
      ...metrics,
      eraAvailable: true,
      tier: spec.tier,
      avgLi: rowAvgLi,
      avgLiStr: rowAvgLi.toFixed(2),
      wpa: rowWpa,
      wpaStr: formatSignedWpa(rowWpa),
    };
  });

  return {
    playerId,
    type,
    season,
    gamesAnalyzed: playerGameIds.size,
    avgLi,
    avgLiStr: avgLi.toFixed(2),
    totalWpa,
    totalWpaStr: formatSignedWpa(totalWpa),
    thresholds: { ...LEVERAGE_THRESHOLDS },
    pitcherRows,
  };
}

async function fetchPlayerGameIdsFromMlbGameLog(
  playerId: number,
  type: "batter" | "pitcher",
  season: number
): Promise<number[]> {
  const group = type === "batter" ? "hitting" : "pitching";
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=gameLog&group=${group}&season=${season}&sportId=17&leagueId=135`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return [];
    const data = await res.json();
    const splits = data?.stats?.[0]?.splits;
    if (!Array.isArray(splits)) return [];

    const gameIds = new Set<number>();
    for (const s of splits) {
      if (s.season && String(s.season) !== String(season)) continue;
      if (s.sport?.id && Number(s.sport.id) !== 17) continue;
      if (s.league?.id && Number(s.league.id) !== 135) continue;
      if (s.team?.id && !LVBP_TEAM_IDS.includes(Number(s.team.id))) continue;
      const pk = Number(s.game?.gamePk || 0);
      if (pk > 0) gameIds.add(pk);
    }
    return Array.from(gameIds);
  } catch {
    return [];
  }
}

async function fetchFeedsWithConcurrency(
  gameIds: number[],
  concurrency: number = FEED_FETCH_CONCURRENCY
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  if (gameIds.length === 0) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Array<any | null> = new Array(gameIds.length).fill(null);
  let cursor = 0;

  async function worker() {
    while (cursor < gameIds.length) {
      const idx = cursor++;
      results[idx] = await fetchGameLiveFeed(gameIds[idx]);
    }
  }

  const workerCount = Math.min(concurrency, gameIds.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.filter(Boolean);
}

/**
 * Obtiene y agrega los splits por Leverage Index (LI) y WPA de un jugador en la LVBP.
 */
export async function getPlayerLeverageSplits(
  playerId: number,
  type: "batter" | "pitcher",
  season: number = ACTIVE_SEASON
): Promise<PlayerLeverageResult> {
  const cacheKey = `${type}-${playerId}-${season}`;
  const ttl = season < ACTIVE_SEASON ? CLOSED_CACHE_TTL_MS : ACTIVE_CACHE_TTL_MS;
  const cached = leverageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const gameIdSet = new Set<number>();

  if (supabase) {
    try {
      if (type === "batter") {
        const { data, error } = await fetchAllSupabasePages(
          () =>
            supabase!
              .from("batting_stats")
              .select(
                "game_id, ab, r, bb, sb, cs, hbp, sf, sh, games!inner(id, season, status, game_type)",
                { count: "exact" }
              )
              .eq("player_id", playerId)
              .eq("games.season", season)
        );

        if (!error && Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const row of data as any[]) {
            const g = Array.isArray(row.games) ? row.games[0] : row.games;
            if (!g || isExhibitionGameType(g.game_type) || !isPlayedGameStatus(g.status)) continue;
            if (!hasBatterAppearance(row)) continue;
            const gid = Number(g.id ?? row.game_id ?? 0);
            if (gid > 0) gameIdSet.add(gid);
          }
        }
      } else {
        const { data, error } = await fetchAllSupabasePages(
          () =>
            supabase!
              .from("pitching_stats")
              .select(
                "game_id, ip_decimal, h, r, er, bb, hbp, so, hr, games!inner(id, season, status, game_type)",
                { count: "exact" }
              )
              .eq("player_id", playerId)
              .eq("games.season", season)
        );

        if (!error && Array.isArray(data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const row of data as any[]) {
            const g = Array.isArray(row.games) ? row.games[0] : row.games;
            if (!g || isExhibitionGameType(g.game_type) || !isPlayedGameStatus(g.status)) continue;
            if (!hasPitcherAppearance(row)) continue;
            const gid = Number(g.id ?? row.game_id ?? 0);
            if (gid > 0) gameIdSet.add(gid);
          }
        }
      }
    } catch (err) {
      console.warn("Error consultando game_ids en Supabase para leverage:", err);
    }
  }

  let gameIds = Array.from(gameIdSet);
  if (gameIds.length === 0) {
    gameIds = await fetchPlayerGameIdsFromMlbGameLog(playerId, type, season);
  }

  const feeds = await fetchFeedsWithConcurrency(gameIds, FEED_FETCH_CONCURRENCY);
  const result = aggregatePlaysByLeverage(feeds, playerId, type, season);

  leverageCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
