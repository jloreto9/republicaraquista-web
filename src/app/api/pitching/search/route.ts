import { NextRequest, NextResponse } from "next/server";
import { CARACAS_FEATURED_PITCHERS } from "@/lib/pitching-constants";
import { PitcherProfile } from "@/types/pitching";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

const CARACAS_PITCHER_IDS = new Set([
  544150, // Albert Suárez
  468504, // Jhoulys Chacín
  518586, // Jhoulys Chacín legacy
  612797, // Erick Leal
  660508, // Norwith Gudiño
  600965, // Ricardo Rodríguez
  642570, // José Mujica
  542467, // Yoimer Camacho
  622703, // Ronald Herrera
  660896, // Miguel Socolovich
  672851, // Alfred Gutiérrez
  600526, // José Torres
  521655, // Wilmer Font
  660788, // Jesus Vargas
  622415, // Anthony Vizcaya
  672578, // Carlos Hernández
  506693, // Henderson Álvarez
  640470, // Adbert Alzolay
  692350, // Mikell Manzano
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q || q.length < 2) {
    return NextResponse.json({
      query: q,
      count: CARACAS_FEATURED_PITCHERS.length,
      results: CARACAS_FEATURED_PITCHERS,
    });
  }

  // 1. Coincidencia directa con destacados locales
  const localMatches = CARACAS_FEATURED_PITCHERS.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || String(p.id) === q
  );

  // 2. Si es ID numérico exacto
  if (/^\d+$/.test(q)) {
    try {
      const res = await fetch(`https://statsapi.mlb.com/api/v1/people/${q}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.people?.[0];
        if (p) {
          const pId = p.id;
          const isCaracas = CARACAS_PITCHER_IDS.has(pId);
          const singleProfile: PitcherProfile = {
            id: pId,
            name: p.fullName || `Lanzador #${pId}`,
            position: p.primaryPosition?.abbreviation || "P",
            team: isCaracas ? "Leones del Caracas" : p.currentTeam?.name || "Agente Libre",
            throws: p.pitchHand?.code || "R",
            hasLvbpHistory: isCaracas,
            hasCaracasHistory: isCaracas,
            lvbpTeamId: isCaracas ? 695 : undefined,
            lvbpTeamName: isCaracas ? "Leones del Caracas" : undefined,
            lvbpTeamAbbr: isCaracas ? "CAR" : undefined,
            photoUrl: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/${pId}/headshot/67/current`,
          };
          return NextResponse.json({ query: q, count: 1, results: [singleProfile] });
        }
      }
    } catch {
      // Fallback a localMatches
    }
  }

  // 3. Consulta a MLB Stats API People Search
  const results: PitcherProfile[] = [...localMatches];
  const seenIds = new Set(localMatches.map((m) => m.id));

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
        const pId = p.id;
        if (seenIds.has(pId)) continue;
        seenIds.add(pId);

        const pos = p.primaryPosition?.abbreviation || "P";
        const isPitcher = pos === "P" || pos === "TWP" || pos === "RHP" || pos === "LHP";
        const isCaracas = CARACAS_PITCHER_IDS.has(pId);

        results.push({
          id: pId,
          name: p.fullName || "Lanzador",
          position: pos,
          team: isCaracas ? "Leones del Caracas" : p.currentTeam?.name || "Agente Libre",
          throws: p.pitchHand?.code || "R",
          hasLvbpHistory: isCaracas,
          hasCaracasHistory: isCaracas,
          lvbpTeamId: isCaracas ? 695 : undefined,
          lvbpTeamName: isCaracas ? "Leones del Caracas" : undefined,
          lvbpTeamAbbr: isCaracas ? "CAR" : undefined,
          photoUrl: `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current/w_213,q_auto:best/v1/people/${pId}/headshot/67/current`,
        });
      }
    }
  } catch {
    // Si falla la red, continuar con lo obtenido
  }

  // Ordenar: primero Leones, luego lanzadores
  results.sort((a, b) => {
    if (a.hasCaracasHistory && !b.hasCaracasHistory) return -1;
    if (!a.hasCaracasHistory && b.hasCaracasHistory) return 1;
    if (a.position === "P" && b.position !== "P") return -1;
    if (a.position !== "P" && b.position === "P") return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    query: q,
    count: results.length,
    results: results.slice(0, 15),
  });
}
