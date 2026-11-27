import { PlayerLvbpCareerResult } from "@/types/player-splits";
import { getPlayerLvbpCareer } from "./player-career-service";
import { supabase, supabaseAdmin } from "./supabase";

export const HISTORICAL_CAREER_CUTOFF_SEASON = 2025;

export type CareerCacheStatus = "HIT" | "MISS" | "BYPASS";

export function extractHistoricalCareerPayload(
  career: PlayerLvbpCareerResult,
  cutoffSeason: number = HISTORICAL_CAREER_CUTOFF_SEASON
): PlayerLvbpCareerResult {
  return {
    ...career,
    regularBatting: career.regularBatting.filter((entry) => entry.season < cutoffSeason),
    regularPitching: career.regularPitching.filter((entry) => entry.season < cutoffSeason),
    postseasonBatting: career.postseasonBatting.filter((entry) => entry.season < cutoffSeason),
    postseasonPitching: career.postseasonPitching.filter((entry) => entry.season < cutoffSeason),
  };
}

export function countDistinctCareerSeasons(career: PlayerLvbpCareerResult): number {
  const regular = career.type === "pitcher" ? career.regularPitching : career.regularBatting;
  const distinct = new Set(regular.filter((e) => !e.isTeamSplit).map((e) => e.season));
  return distinct.size;
}

export async function getCachedOrFetchPlayerLvbpCareer(
  playerId: number,
  type: "batter" | "pitcher"
): Promise<{ career: PlayerLvbpCareerResult; cacheStatus: CareerCacheStatus }> {
  if (!Number.isInteger(playerId) || playerId <= 0) {
    return {
      career: {
        playerId,
        type,
        regularBatting: [],
        regularPitching: [],
        postseasonBatting: [],
        postseasonPitching: [],
        fetchedAt: new Date().toISOString(),
      },
      cacheStatus: "BYPASS",
    };
  }

  const db = supabaseAdmin ?? supabase;

  if (db) {
    try {
      const { data, error } = await db
        .from("lvbp_career_cache")
        .select("payload")
        .eq("player_id", playerId)
        .eq("player_type", type)
        .maybeSingle();

      if (!error && data?.payload) {
        return {
          career: data.payload as PlayerLvbpCareerResult,
          cacheStatus: "HIT",
        };
      }
    } catch {
      // Degradar limpiamente a MLB Stats API si falla la lectura de caché
    }
  }

  const fullCareer = await getPlayerLvbpCareer(playerId, type);
  const historicalCareer = extractHistoricalCareerPayload(fullCareer);

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from("lvbp_career_cache").upsert(
        {
          player_id: playerId,
          player_type: type,
          payload: historicalCareer,
          seasons_count: countDistinctCareerSeasons(historicalCareer),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id,player_type" }
      );
    } catch {
      // No interrumpir la respuesta si falla la escritura en caché
    }
  }

  return {
    career: historicalCareer,
    cacheStatus: db ? "MISS" : "BYPASS",
  };
}
