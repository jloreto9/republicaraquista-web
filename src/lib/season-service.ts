import { supabase } from "./supabase";

export const FALLBACK_SEASON = 2025;
export const UPCOMING_SEASON = 2026;

interface CacheState {
  season: number;
  expiresAt: number;
}

let cachedActiveSeason: CacheState | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Resuelve la temporada activa más reciente con partidos disputados o en vivo en Supabase.
 * En cuanto se insertan juegos de la temporada entrante (2026), conmuta automáticamente.
 * Si aún no hay juegos de la nueva temporada, retorna la última temporada activa con datos (2025).
 */
export async function getActiveSeason(): Promise<number> {
  const now = Date.now();
  if (cachedActiveSeason && cachedActiveSeason.expiresAt > now) {
    return cachedActiveSeason.season;
  }

  if (!supabase) {
    return FALLBACK_SEASON;
  }

  try {
    const { data, error } = await supabase
      .from("games")
      .select("season")
      .in("status", ["Final", "Live", "In Progress", "Completed Early", "Game Over"])
      .order("season", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0 || !data[0].season) {
      cachedActiveSeason = { season: FALLBACK_SEASON, expiresAt: now + CACHE_TTL_MS };
      return FALLBACK_SEASON;
    }

    const detectedSeason = Number(data[0].season);
    // Asegurar que sea al menos la temporada base verificada
    const finalSeason = detectedSeason >= 2025 ? detectedSeason : FALLBACK_SEASON;

    cachedActiveSeason = { season: finalSeason, expiresAt: now + CACHE_TTL_MS };
    return finalSeason;
  } catch (err) {
    console.warn("Fallo resolución dinámica de temporada en Supabase, usando fallback:", err);
    return FALLBACK_SEASON;
  }
}

/**
 * Retorna la lista de temporadas disponibles con datos reales en Supabase.
 */
export async function getAvailableSeasons(): Promise<number[]> {
  if (!supabase) {
    return [FALLBACK_SEASON];
  }

  try {
    const { data, error } = await supabase
      .from("games")
      .select("season")
      .order("season", { ascending: false });

    if (error || !data) {
      return [FALLBACK_SEASON];
    }

    const seasonSet = new Set<number>();
    for (const row of data) {
      if (row.season) seasonSet.add(Number(row.season));
    }

    seasonSet.add(FALLBACK_SEASON);

    return Array.from(seasonSet).sort((a, b) => b - a);
  } catch (err) {
    console.warn("Error al consultar temporadas disponibles:", err);
    return [FALLBACK_SEASON];
  }
}
