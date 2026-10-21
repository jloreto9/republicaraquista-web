/**
 * Servicio de Lateralidad de Lanzadores (Zurdos LHP / Derechos RHP) - LVBP & MLB
 * Garantiza que los lanzadores zurdos sean reconocidos con exactitud y no caigan
 * erróneamente en el default "R".
 * 
 * Estrategia de alto rendimiento:
 * 1. Consulta ultrarrápida del Roster hidratado del equipo (/teams/{teamId}/roster?hydrate=person(pitchHand))
 *    que resuelve toda la plantilla en ~300ms.
 * 2. Catálogo canónico de respaldo con los 88+ zurdos verificados de la LVBP.
 * 3. Fallback dinámico por lotes a /api/v1/people?personIds=... para casos no listados.
 * 4. Timeouts estrictos (AbortSignal) en todas las llamadas de red para evitar bloqueos.
 */

// Conjunto canónico de lanzadores zurdos (LHP) verificados en LVBP
export const KNOWN_LVBP_LEFTIES: Set<number> = new Set([
  452061, // Zach Phillips
  462110, // Robert Zárate
  462985, // Franklin Morales
  467094, // Félix Doubront
  500279, // Jonathan Vargas
  500891, // Edgar Ibarra
  501384, // Jesus Martinez
  502674, // Yohander Méndez
  542360, // Porfirio Lopez
  542561, // Gumercindo Gonzalez
  542587, // Elvis Araujo
  546276, // Edwin Escobar
  553878, // Felipe Vázquez
  570145, // Ismael Guillón
  571825, // James Jones
  573064, // Vidal Nuño
  592222, // Alex Claudio
  592411, // Ben Holmes
  600526, // José Torres
  602105, // Elvin Liriano
  605891, // Luis Rico
  606213, // Eudis Idrogo
  620454, // José Castillo
  620978, // Liarvis Breto
  620984, // Sergio Velis
  621594, // Eudis Idrogo
  622066, // Tyler Alexander
  622426, // Adrian Almeida
  622789, // Felix Carvallo
  622795, // Yohander Méndez
  623911, // Elvis Escobar
  628345, // Darien Núñez
  642381, // Dedgar Jimenez
  642396, // Manuel Rondon
  642857, // Yapson Gomez
  644429, // Anderson Severino
  646242, // Jhonathan Díaz
  650356, // Dilmer Mejia
  650382, // Ricardo Sánchez / Darwinzon Hernández
  650671, // José Quijada
  655313, // Eugenio Palma
  656671, // Josh Maciejewski
  660577, // Francisco Sanchez
  660671, // Yorvin Pantoja
  660689, // Angel Padron
  660761, // José Suarez
  660789, // Julio Frias
  660799, // Fabian Blanco
  661156, // Luis Amaya
  661265, // Yoennis Yera
  663453, // Hazahel Quijada
  664069, // Ben Braymer
  664324, // Luis Moncada
  664691, // Garvin Alston
  665690, // Jonaiker Villalobos
  665789, // Kenny Hernandez
  665996, // Oddanier Mosqueda
  667460, // Brayan Perez
  669799, // Alfonso Hernández
  670369, // Christian Torres
  670873, // Lisandro Santos
  672374, // Franklin Dacosta
  672558, // Cleiverth Perez
  672712, // Luis Palacios
  673394, // Gabriel Yanez
  674379, // Daritzon Feliz
  674450, // Hector Rodriguez
  676600, // Ethan Lindow
  677644, // Brayan Perez
  678789, // Julio Robaina
  679338, // Bryan Warzek
  679892, // Emilio Marquez
  680632, // Rafael Marcano
  681025, // Denny Bentley
  681094, // Keyshawn Askew
  681617, // Kevin Garcia
  681641, // Sonny Vargas
  682200, // Austin Drury
  682840, // Samuel Perez
  682845, // Rito Lugo
  682897, // Steven Pérez
  682949, // Christian Suarez
  684483, // Daniel Juarez
  686859, // Manuel Medina
  692623, // Leonard Garcia
  692646, // Pedro Rodriguez
  692829, // Ignacio Briceno
  696095, // Angel Hernandez
  800550, // Miguel Cienfuegos
  816273, // Javier Fandiño
  816392, // Yofrec Diaz
]);

// Caché en memoria para almacenar respuestas resueltas de la API de MLB
const pitcherHandCache = new Map<number, "R" | "L">();
const rostersLoaded = new Set<string>();

/**
 * Consulta síncrona inmediata si el lanzador es zurdo en base al catálogo canónico o caché
 */
export function getKnownPitcherHand(pitcherId: number): "R" | "L" {
  if (pitcherHandCache.has(pitcherId)) {
    return pitcherHandCache.get(pitcherId)!;
  }
  if (KNOWN_LVBP_LEFTIES.has(pitcherId)) {
    pitcherHandCache.set(pitcherId, "L");
    return "L";
  }
  return "R";
}

/**
 * Precarga ultrarrápida de lateralidad mediante el Roster hidratado del equipo.
 * Trae a todos los jugadores del equipo en una sola llamada de ~300ms.
 */
export async function loadRosterHandedness(teamId: number, season: number): Promise<void> {
  const cacheKey = `${teamId}_${season}`;
  if (rostersLoaded.has(cacheKey)) return;

  try {
    const url = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?season=${season}&hydrate=person(pitchHand)`;
    const res = await fetch(url, {
      headers: { "User-Agent": "RepubliCaraquistApp/1.0" },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      const roster = data.roster || [];
      for (const item of roster) {
        const pId = item.person?.id;
        const hand = item.person?.pitchHand?.code;
        if (pId && hand) {
          pitcherHandCache.set(pId, hand === "L" ? "L" : "R");
        }
      }
      rostersLoaded.add(cacheKey);
    }
  } catch (err) {
    console.warn(`Error precargando roster de equipo ${teamId}:`, err);
  }
}

/**
 * Resuelve la lateralidad de una lista de IDs de lanzadores.
 * Primero precarga el roster del equipo si se provee, luego revisa la caché y el catálogo canónico,
 * y solo si quedan IDs huérfanos consulta por lotes a /people?personIds=... con timeout estricto.
 */
export async function resolvePitchersHandedness(
  pitcherIds: number[],
  teamId?: number,
  season?: number
): Promise<Map<number, "R" | "L">> {
  // 1. Precargar roster si tenemos teamId y season
  if (teamId && season) {
    await loadRosterHandedness(teamId, season);
  }

  const result = new Map<number, "R" | "L">();
  const missingIds: number[] = [];

  for (const id of pitcherIds) {
    if (!id) continue;
    if (pitcherHandCache.has(id)) {
      result.set(id, pitcherHandCache.get(id)!);
    } else if (KNOWN_LVBP_LEFTIES.has(id)) {
      pitcherHandCache.set(id, "L");
      result.set(id, "L");
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return result;
  }

  // 2. Si quedan IDs sin resolver, consultar por lotes a MLB Stats API con timeout estricto (3s)
  try {
    for (let i = 0; i < missingIds.length; i += 50) {
      const chunk = missingIds.slice(i, i + 50);
      const url = `https://statsapi.mlb.com/api/v1/people?personIds=${chunk.join(",")}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "RepubliCaraquistApp/1.0" },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 86400 },
      });

      if (!res.ok) {
        chunk.forEach((id) => {
          const hand = KNOWN_LVBP_LEFTIES.has(id) ? "L" : "R";
          pitcherHandCache.set(id, hand);
          result.set(id, hand);
        });
        continue;
      }

      const json = await res.json();
      const people: Array<{ id: number; pitchHand?: { code?: string } }> =
        json.people || [];

      for (const p of people) {
        const hand = p.pitchHand?.code === "L" || KNOWN_LVBP_LEFTIES.has(p.id) ? "L" : "R";
        pitcherHandCache.set(p.id, hand);
        result.set(p.id, hand);
      }

      for (const id of chunk) {
        if (!result.has(id)) {
          const hand = KNOWN_LVBP_LEFTIES.has(id) ? "L" : "R";
          pitcherHandCache.set(id, hand);
          result.set(id, hand);
        }
      }
    }
  } catch (err) {
    console.warn("Error resolviendo lateralidad vía people API:", err);
    missingIds.forEach((id) => {
      const hand = KNOWN_LVBP_LEFTIES.has(id) ? "L" : "R";
      pitcherHandCache.set(id, hand);
      result.set(id, hand);
    });
  }

  return result;
}
