import { NextRequest, NextResponse } from "next/server";
import { CARACAS_FEATURED_PITCHERS } from "@/lib/pitching-constants";
import { getKnownPitcherHand } from "@/lib/pitcher-hand-service";
import { PitcherProfile } from "@/types/pitching";
import { supabase } from "@/lib/supabase";
import {
  LVBP_TEAMS,
  getPlayerHeadshotUrl,
  getMlbFallbackHeadshotUrl,
} from "@/lib/constants";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

interface LvbpDirectoryEntry {
  profile: PitcherProfile;
  appearances: number;
  latestSeason: number;
}

let lvbpPitcherCache: { expiresAt: number; entries: Map<number, LvbpDirectoryEntry> } | null =
  null;

function normalizeText(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Carga y cachea el directorio completo de lanzadores de los 8 equipos LVBP desde Supabase,
 * priorizando estrictamente el equipo de Ronda Regular sobre refuerzos de Round Robin / Final (GEMINI.md §1.1.7).
 */
async function getLvbpPitcherDirectory(): Promise<Map<number, LvbpDirectoryEntry>> {
  const now = Date.now();
  if (lvbpPitcherCache && lvbpPitcherCache.expiresAt > now) {
    return lvbpPitcherCache.entries;
  }

  const map = new Map<number, LvbpDirectoryEntry>();

  // Sembrar destacados de Leones como piso garantizado
  for (const fp of CARACAS_FEATURED_PITCHERS) {
    map.set(fp.id, { profile: fp, appearances: 10, latestSeason: 2025 });
  }

  if (supabase) {
    try {
      const { data: rawRows, error } = await supabase
        .from("pitching_stats")
        .select(
          "player_id, team_id, players!inner(full_name), games!inner(season, game_type)"
        )
        .in("games.season", [2026, 2025, 2024]);

      if (!error && Array.isArray(rawRows) && rawRows.length > 0) {
        const grouped = new Map<
          number,
          {
            name: string;
            latestSeason: number;
            appearances: number;
            regTeamCounts: Record<number, number>;
            allTeamCounts: Record<number, number>;
            everCaracas: boolean;
          }
        >();

        for (const r of rawRows as any[]) {
          const pId = Number(r.player_id);
          if (!pId) continue;
          const pName = String(r.players?.full_name || "").trim();
          const teamId = Number(r.team_id);
          const gameSeason = Number(r.games?.season || 2025);
          const gameType = String(r.games?.game_type || "R").toUpperCase();
          const isRegular = gameType === "R" || gameType === "REGULAR";

          let rec = grouped.get(pId);
          if (!rec) {
            rec = {
              name: pName || `Lanzador #${pId}`,
              latestSeason: gameSeason,
              appearances: 0,
              regTeamCounts: {},
              allTeamCounts: {},
              everCaracas: false,
            };
            grouped.set(pId, rec);
          }

          if (pName && rec.name.startsWith("Lanzador #")) rec.name = pName;
          if (gameSeason >= rec.latestSeason) {
            rec.latestSeason = gameSeason;
          }
          rec.appearances += 1;
          rec.allTeamCounts[teamId] = (rec.allTeamCounts[teamId] || 0) + 1;
          if (isRegular) {
            rec.regTeamCounts[teamId] = (rec.regTeamCounts[teamId] || 0) + 1;
          }
          if (teamId === 695) {
            rec.everCaracas = true;
          }
        }

        for (const [pId, rec] of grouped.entries()) {
          // Prioridad de Ronda Regular sobre refuerzos de enero (GEMINI.md §1.1.7)
          const regEntries = Object.entries(rec.regTeamCounts);
          const sourceCounts =
            regEntries.length > 0 ? regEntries : Object.entries(rec.allTeamCounts);

          let primaryTeamId = 695;
          let maxGames = -1;
          for (const [tidStr, cnt] of sourceCounts) {
            if (cnt > maxGames) {
              maxGames = cnt;
              primaryTeamId = Number(tidStr);
            }
          }

          const teamObj = LVBP_TEAMS[primaryTeamId];
          const existingFeatured = map.get(pId)?.profile;
          const hand = existingFeatured?.throws || getKnownPitcherHand(pId);

          const profile: PitcherProfile = {
            id: pId,
            name: existingFeatured?.name || rec.name,
            position: hand === "L" ? "LHP" : "RHP",
            team: teamObj?.name || existingFeatured?.team || "LVBP",
            throws: hand,
            hasLvbpHistory: true,
            hasCaracasHistory: primaryTeamId === 695 || rec.everCaracas,
            lvbpTeamId: primaryTeamId,
            lvbpTeamName: teamObj?.name,
            lvbpTeamAbbr: teamObj?.abbreviation,
            photoUrl: getPlayerHeadshotUrl(pId),
            mlbPhotoUrl: getMlbFallbackHeadshotUrl(pId),
            age: existingFeatured?.age,
            height: existingFeatured?.height,
            weight: existingFeatured?.weight,
          };

          map.set(pId, {
            profile,
            appearances: rec.appearances,
            latestSeason: rec.latestSeason,
          });
        }
      }
    } catch (err) {
      console.error("Error cargando directorio LVBP en /api/pitching/search:", err);
    }
  }

  lvbpPitcherCache = {
    expiresAt: now + 15 * 60 * 1000,
    entries: map,
  };
  return map;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const directory = await getLvbpPitcherDirectory();

  // Sin query: mostrar destacados de Leones + brazos líderes LVBP
  if (!q || q.length < 2) {
    const featuredIds = new Set(CARACAS_FEATURED_PITCHERS.map((p) => p.id));
    const topLvbpOthers = Array.from(directory.values())
      .filter((e) => !featuredIds.has(e.profile.id))
      .sort((a, b) => b.appearances - a.appearances)
      .slice(0, 14)
      .map((e) => e.profile);

    const initialList = [
      ...CARACAS_FEATURED_PITCHERS.map((p) => directory.get(p.id)?.profile || p),
      ...topLvbpOthers,
    ];

    return NextResponse.json({
      query: q,
      count: initialList.length,
      results: initialList,
    });
  }

  const qNorm = normalizeText(q);

  // 1. Búsqueda instantánea sobre los 8 equipos LVBP (por nombre, ID, club o abreviatura)
  const lvbpMatches = Array.from(directory.values())
    .filter(({ profile }) => {
      if (String(profile.id) === q) return true;
      if (normalizeText(profile.name).includes(qNorm)) return true;
      if (profile.lvbpTeamName && normalizeText(profile.lvbpTeamName).includes(qNorm))
        return true;
      if (profile.lvbpTeamAbbr && normalizeText(profile.lvbpTeamAbbr) === qNorm)
        return true;
      return false;
    })
    .sort((a, b) => {
      const aCar = a.profile.lvbpTeamId === 695 ? 1 : 0;
      const bCar = b.profile.lvbpTeamId === 695 ? 1 : 0;
      if (aCar !== bCar) return bCar - aCar;
      return b.appearances - a.appearances;
    })
    .map((e) => e.profile);

  // 2. Si es ID numérico exacto, enriquecer bio física desde MLB Stats API
  if (/^\d+$/.test(q)) {
    const numId = Number(q);
    const knownLvbp = directory.get(numId)?.profile;
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/people/${numId}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.people?.[0];
        if (p) {
          const throws: "R" | "L" =
            p.pitchHand?.code === "L" ? "L" : knownLvbp?.throws || getKnownPitcherHand(numId);
          const singleProfile: PitcherProfile = {
            id: numId,
            name: p.fullName || knownLvbp?.name || `Lanzador #${numId}`,
            position:
              knownLvbp?.position ||
              (throws === "L" ? "LHP" : "RHP"),
            team: knownLvbp?.lvbpTeamName || p.currentTeam?.name || "Agente Libre",
            throws,
            hasLvbpHistory: Boolean(knownLvbp),
            hasCaracasHistory: Boolean(knownLvbp?.hasCaracasHistory),
            lvbpTeamId: knownLvbp?.lvbpTeamId,
            lvbpTeamName: knownLvbp?.lvbpTeamName,
            lvbpTeamAbbr: knownLvbp?.lvbpTeamAbbr,
            photoUrl: knownLvbp ? getPlayerHeadshotUrl(numId) : getMlbFallbackHeadshotUrl(numId),
            mlbPhotoUrl: getMlbFallbackHeadshotUrl(numId),
            age: p.currentAge ?? knownLvbp?.age,
            height: p.height ?? knownLvbp?.height,
            weight: p.weight ?? knownLvbp?.weight,
          };
          return NextResponse.json({ query: q, count: 1, results: [singleProfile] });
        }
      }
    } catch {
      if (knownLvbp) {
        return NextResponse.json({ query: q, count: 1, results: [knownLvbp] });
      }
    }
  }

  // 3. Combinar coincidencias LVBP + búsqueda global MLB Stats API People Search
  const results: PitcherProfile[] = [...lvbpMatches];
  const seenIds = new Set(results.map((m) => m.id));

  try {
    const url = `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(
      q
    )}&sportIds=1,11,12,13,14,16,17,23`;
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      const people = data.people || [];

      for (const p of people) {
        const pId = Number(p.id);
        if (!pId) continue;

        // Si ya existe en LVBP, enriquecer edad/estatura/peso/mano real
        if (seenIds.has(pId)) {
          const idx = results.findIndex((r) => r.id === pId);
          if (idx >= 0) {
            const throwsCode = p.pitchHand?.code === "L" ? "L" : p.pitchHand?.code === "R" ? "R" : results[idx].throws;
            results[idx] = {
              ...results[idx],
              throws: throwsCode,
              position: throwsCode === "L" ? "LHP" : "RHP",
              age: p.currentAge ?? results[idx].age,
              height: p.height ?? results[idx].height,
              weight: p.weight ?? results[idx].weight,
            };
          }
          continue;
        }

        const pos = String(p.primaryPosition?.abbreviation || "P");
        const isPitcher =
          pos === "P" || pos === "TWP" || pos === "RHP" || pos === "LHP";
        if (!isPitcher && results.length >= 12) continue;

        seenIds.add(pId);
        const knownLvbp = directory.get(pId)?.profile;
        const throws: "R" | "L" =
          p.pitchHand?.code === "L"
            ? "L"
            : p.pitchHand?.code === "R"
            ? "R"
            : getKnownPitcherHand(pId);

        results.push({
          id: pId,
          name: p.fullName || "Lanzador",
          position: isPitcher ? (throws === "L" ? "LHP" : "RHP") : pos,
          team: knownLvbp?.lvbpTeamName || p.currentTeam?.name || "MLB / MiLB",
          throws,
          hasLvbpHistory: Boolean(knownLvbp),
          hasCaracasHistory: Boolean(knownLvbp?.hasCaracasHistory),
          lvbpTeamId: knownLvbp?.lvbpTeamId,
          lvbpTeamName: knownLvbp?.lvbpTeamName,
          lvbpTeamAbbr: knownLvbp?.lvbpTeamAbbr,
          photoUrl: knownLvbp ? getPlayerHeadshotUrl(pId) : getMlbFallbackHeadshotUrl(pId),
          mlbPhotoUrl: getMlbFallbackHeadshotUrl(pId),
          age: p.currentAge,
          height: p.height,
          weight: p.weight,
        });
      }
    }
  } catch {
    // Continuar con coincidencias LVBP disponibles
  }

  results.sort((a, b) => {
    if (a.hasLvbpHistory && !b.hasLvbpHistory) return -1;
    if (!a.hasLvbpHistory && b.hasLvbpHistory) return 1;
    if (a.hasCaracasHistory && !b.hasCaracasHistory) return -1;
    if (!a.hasCaracasHistory && b.hasCaracasHistory) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    query: q,
    count: results.length,
    results: results.slice(0, 25),
  });
}
