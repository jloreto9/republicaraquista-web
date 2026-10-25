import {
  TangoPlayer,
  TangoSlotContribution,
  TangoLineupMetrics,
  TangoOptimizationResult,
} from "@/types/tango-lineup";

export const LVBP_REGULAR_SEASON_GAMES = 56;

// Ponderación de apariciones al plato (PA) por slot en el orden (Tom Tango - The Book)
export const SLOT_PA_WEIGHTS: Record<number, number> = {
  1: 4.67,
  2: 4.54,
  3: 4.41,
  4: 4.28,
  5: 4.15,
  6: 4.02,
  7: 3.89,
  8: 3.76,
  9: 3.63,
};

export interface TangoSlotConfig {
  role: string;
  roleDesc: string;
  obpWeight: number;
  slgWeight: number;
  wobaMult: number;
  explanation: string;
}

export const TANGO_SLOT_LEVERAGE: Record<number, TangoSlotConfig> = {
  1: {
    role: "Leadoff / Embasador Élite",
    roleDesc: "Máximo OBP, evita outs a toda costa",
    obpWeight: 1.45,
    slgWeight: 0.80,
    wobaMult: 1.05,
    explanation:
      "Toma más turnos que casi nadie (~262 PA). El factor primordial es embasarse (alto OBP) para que los bates de poder remolquen carreras.",
  },
  2: {
    role: "Mejor Bateador Integral",
    roleDesc: "Mayor wOBA del equipo",
    obpWeight: 1.30,
    slgWeight: 1.25,
    wobaMult: 1.15,
    explanation:
      "Axioma central de Tom Tango: el 2do bate batea con frecuencia con corredor en 1B o sin outs. Debe ser el mejor bateador integral (máximo wOBA).",
  },
  3: {
    role: "Contacto / Bate Puro",
    roleDesc: "5to mejor bateador en wOBA",
    obpWeight: 1.05,
    slgWeight: 1.10,
    wobaMult: 1.00,
    explanation:
      "Históricamente sobrevalorado. En el 1er inning suele batear con 2 outs y bases vacías (tras out de #1 o #2). Debe ser el 5to mejor bateador del equipo.",
  },
  4: {
    role: "Cleanup / Productor Principal",
    roleDesc: "Máximo poder aislado (ISO / SLG)",
    obpWeight: 1.00,
    slgWeight: 1.40,
    wobaMult: 1.12,
    explanation:
      "Batea en la mayor cantidad de situaciones con corredores en posición anotadora. Requiere la mayor fuerza extrabase (ISO/SLG) para empujar múltiples carreras.",
  },
  5: {
    role: "Segundo Cleanup / Poder",
    roleDesc: "Segundo mayor slugger",
    obpWeight: 0.95,
    slgWeight: 1.20,
    wobaMult: 1.02,
    explanation:
      "Protege al 4to bate y remolca si el cleanup recibe boleto o se embasa. Debe ser el segundo mayor slugger disponible.",
  },
  6: {
    role: "Producción Secundaria",
    roleDesc: "6to mejor bateador",
    obpWeight: 0.90,
    slgWeight: 0.95,
    wobaMult: 0.94,
    explanation:
      "Inicia la segunda mitad del orden con capacidad de extrabase o contacto para sostener rallies ofensivos.",
  },
  7: {
    role: "Fondo del Orden",
    roleDesc: "7mo mejor bateador",
    obpWeight: 0.85,
    slgWeight: 0.85,
    wobaMult: 0.88,
    explanation:
      "Toma menos turnos (~218 PA). Generalmente ocupado por especialistas defensivos o bateadores de contacto medio.",
  },
  8: {
    role: "Bateador de Menor Producción",
    roleDesc: "8vo en jerarquía ofensiva",
    obpWeight: 0.80,
    slgWeight: 0.80,
    wobaMult: 0.84,
    explanation:
      "El bateador con menor producción proyectada de los 9. Evita que un bate débil consuma turnos clave en la parte alta.",
  },
  9: {
    role: "Segundo Leadoff / Mesa 1-2-3",
    roleDesc: "Mejor OBP restante de la parte baja",
    obpWeight: 1.15,
    slgWeight: 0.75,
    wobaMult: 0.92,
    explanation:
      "Regla clave de Tom Tango: no poner al peor bateador de 9no. El #9 debe tener buen OBP para estar en base cuando el orden vuelve a los mejores bates (#1 y #2).",
  },
};

// Base canónica de bateadores reales de Leones del Caracas auditados en Supabase
export const LEONES_REAL_STATS_MAP: Record<string, TangoPlayer> = {
  // Wilfredo Tovar
  "wilfredo tovar": {
    playerId: 541600,
    playerName: "Wilfredo Tovar",
    position: "2B",
    bats: "R",
    avg: 0.316,
    obp: 0.380,
    slg: 0.407,
    woba: 0.350,
    wrcPlus: 118,
    iso: 0.091,
    headshot: "https://midfield.mlbstatic.com/v1/people/541600/spots/120",
  },
  // Aldrem Corredor
  "aldrem corredor": {
    playerId: 625506,
    playerName: "Aldrem Corredor",
    position: "1B",
    bats: "L",
    avg: 0.291,
    obp: 0.418,
    slg: 0.486,
    woba: 0.398,
    wrcPlus: 145,
    iso: 0.195,
    headshot: "https://midfield.mlbstatic.com/v1/people/625506/spots/120",
  },
  // Yonathan Daza
  "yonathan daza": {
    playerId: 602074,
    playerName: "Yonathan Daza",
    position: "CF",
    bats: "R",
    avg: 0.295,
    obp: 0.325,
    slg: 0.452,
    woba: 0.338,
    wrcPlus: 108,
    iso: 0.157,
    headshot: "https://midfield.mlbstatic.com/v1/people/602074/spots/120",
  },
  // Brainer Bonaci
  "brainer bonaci": {
    playerId: 682900,
    playerName: "Brainer Bonaci",
    position: "SS",
    bats: "S",
    avg: 0.291,
    obp: 0.398,
    slg: 0.469,
    woba: 0.382,
    wrcPlus: 135,
    iso: 0.178,
    headshot: "https://midfield.mlbstatic.com/v1/people/682900/spots/120",
  },
  // Harold Castro
  "harold castro": {
    playerId: 605612,
    playerName: "Harold Castro",
    position: "CF",
    bats: "L",
    avg: 0.332,
    obp: 0.357,
    slg: 0.481,
    woba: 0.364,
    wrcPlus: 125,
    iso: 0.149,
    headshot: "https://midfield.mlbstatic.com/v1/people/605612/spots/120",
  },
  // José Rondón
  "jose rondon": {
    playerId: 602922,
    playerName: "José Rondón",
    position: "LF",
    bats: "R",
    avg: 0.314,
    obp: 0.399,
    slg: 0.431,
    woba: 0.369,
    wrcPlus: 128,
    iso: 0.117,
    headshot: "https://midfield.mlbstatic.com/v1/people/602922/spots/120",
  },
  // Lenyn Sosa
  "lenyn sosa": {
    playerId: 672820,
    playerName: "Lenyn Sosa",
    position: "3B",
    bats: "R",
    avg: 0.290,
    obp: 0.372,
    slg: 0.551,
    woba: 0.400,
    wrcPlus: 146,
    iso: 0.261,
    headshot: "https://midfield.mlbstatic.com/v1/people/672820/spots/120",
  },
  // Victor Bericoto
  "victor bericoto": {
    playerId: 682674,
    playerName: "Victor Bericoto",
    position: "RF",
    bats: "R",
    avg: 0.344,
    obp: 0.400,
    slg: 0.496,
    woba: 0.390,
    wrcPlus: 138,
    iso: 0.152,
    headshot: "https://midfield.mlbstatic.com/v1/people/682674/spots/120",
  },
  // Jhonny Pereda
  "jhonny pereda": {
    playerId: 640902,
    playerName: "Jhonny Pereda",
    position: "C",
    bats: "R",
    avg: 0.270,
    obp: 0.382,
    slg: 0.391,
    woba: 0.350,
    wrcPlus: 115,
    iso: 0.121,
    headshot: "https://midfield.mlbstatic.com/v1/people/640902/spots/120",
  },
  // Leandro Cedeño
  "leandro cedeno": {
    playerId: 660681,
    playerName: "Leandro Cedeño",
    position: "DH",
    bats: "R",
    avg: 0.321,
    obp: 0.387,
    slg: 0.615,
    woba: 0.426,
    wrcPlus: 160,
    iso: 0.294,
    headshot: "https://midfield.mlbstatic.com/v1/people/660681/spots/120",
  },
  // Oswaldo Arcia
  "oswaldo arcia": {
    playerId: 542455,
    playerName: "Oswaldo Arcia",
    position: "RF",
    bats: "L",
    avg: 0.198,
    obp: 0.351,
    slg: 0.349,
    woba: 0.319,
    wrcPlus: 98,
    iso: 0.151,
    headshot: "https://midfield.mlbstatic.com/v1/people/542455/spots/120",
  },
  // Liván Soto
  "livan soto": {
    playerId: 670869,
    playerName: "Liván Soto",
    position: "SS",
    bats: "L",
    avg: 0.320,
    obp: 0.436,
    slg: 0.413,
    woba: 0.381,
    wrcPlus: 134,
    iso: 0.093,
    headshot: "https://midfield.mlbstatic.com/v1/people/670869/spots/120",
  },
  // Salvador Perez
  "salvador perez": {
    playerId: 521692,
    playerName: "Salvador Perez",
    position: "C",
    bats: "R",
    avg: 0.278,
    obp: 0.381,
    slg: 0.463,
    woba: 0.376,
    wrcPlus: 132,
    iso: 0.185,
    headshot: "https://midfield.mlbstatic.com/v1/people/521692/spots/120",
  },
  // Orlando Arcia
  "orlando arcia": {
    playerId: 606115,
    playerName: "Orlando Arcia",
    position: "SS",
    bats: "R",
    avg: 0.245,
    obp: 0.288,
    slg: 0.429,
    woba: 0.314,
    wrcPlus: 94,
    iso: 0.184,
    headshot: "https://midfield.mlbstatic.com/v1/people/606115/spots/120",
  },
  // Freddy Fermin
  "freddy fermin": {
    playerId: 666023,
    playerName: "Freddy Fermin",
    position: "C",
    bats: "R",
    avg: 0.250,
    obp: 0.367,
    slg: 0.350,
    woba: 0.326,
    wrcPlus: 102,
    iso: 0.100,
    headshot: "https://midfield.mlbstatic.com/v1/people/666023/spots/120",
  },
  // Jeferson Morales
  "jeferson morales": {
    playerId: 672373,
    playerName: "Jeferson Morales",
    position: "C",
    bats: "R",
    avg: 0.306,
    obp: 0.409,
    slg: 0.444,
    woba: 0.378,
    wrcPlus: 132,
    iso: 0.138,
    headshot: "https://midfield.mlbstatic.com/v1/people/672373/spots/120",
  },
  // Gabriel Noriega
  "gabriel noriega": {
    playerId: 527045,
    playerName: "Gabriel Noriega",
    position: "3B",
    bats: "R",
    avg: 0.290,
    obp: 0.340,
    slg: 0.415,
    woba: 0.328,
    wrcPlus: 102,
    iso: 0.125,
    headshot: "https://midfield.mlbstatic.com/v1/people/527045/spots/120",
  },
  // Alfredo Duno
  "alfredo duno": {
    playerId: 806957,
    playerName: "Alfredo Duno",
    position: "C",
    bats: "R",
    avg: 0.240,
    obp: 0.335,
    slg: 0.420,
    woba: 0.330,
    wrcPlus: 104,
    iso: 0.180,
    headshot: "https://midfield.mlbstatic.com/v1/people/806957/spots/120",
  },
  // Kenedy Corona
  "kenedy corona": {
    playerId: 678682,
    playerName: "Kenedy Corona",
    position: "CF",
    bats: "R",
    avg: 0.275,
    obp: 0.345,
    slg: 0.430,
    woba: 0.340,
    wrcPlus: 109,
    iso: 0.155,
    headshot: "https://midfield.mlbstatic.com/v1/people/678682/spots/120",
  },
  // Erick Brito
  "erick brito": {
    playerId: 679001,
    playerName: "Erick Brito",
    position: "2B",
    bats: "R",
    avg: 0.260,
    obp: 0.320,
    slg: 0.350,
    woba: 0.300,
    wrcPlus: 88,
    iso: 0.090,
    headshot: "https://midfield.mlbstatic.com/v1/people/679001/spots/120",
  },
  // Gersel Pitre
  "gersel pitre": {
    playerId: 642875,
    playerName: "Gersel Pitre",
    position: "DH",
    bats: "R",
    avg: 0.250,
    obp: 0.315,
    slg: 0.335,
    woba: 0.290,
    wrcPlus: 82,
    iso: 0.085,
    headshot: "https://midfield.mlbstatic.com/v1/people/642875/spots/120",
  },
  // Gabriel Lino
  "gabriel lino": {
    playerId: 593449,
    playerName: "Gabriel Lino",
    position: "C",
    bats: "R",
    avg: 0.220,
    obp: 0.310,
    slg: 0.280,
    woba: 0.265,
    wrcPlus: 75,
    iso: 0.060,
    headshot: "https://midfield.mlbstatic.com/v1/people/593449/spots/120",
  },
  // Leonel Espinoza
  "leonel espinoza": {
    playerId: 696083,
    playerName: "Leonel Espinoza",
    position: "OF",
    bats: "R",
    avg: 0.316,
    obp: 0.350,
    slg: 0.368,
    woba: 0.321,
    wrcPlus: 100,
    iso: 0.052,
    headshot: "https://midfield.mlbstatic.com/v1/people/696083/spots/120",
  },
  // Wuilfredo Antunez
  "wuilfredo antunez": {
    playerId: 686404,
    playerName: "Wuilfredo Antunez",
    position: "OF",
    bats: "L",
    avg: 0.313,
    obp: 0.353,
    slg: 0.375,
    woba: 0.325,
    wrcPlus: 102,
    iso: 0.062,
    headshot: "https://midfield.mlbstatic.com/v1/people/686404/spots/120",
  },
};

/**
 * Normaliza nombres de peloteros para búsqueda robusta sin tildes ni caracteres especiales
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Busca un jugador en la base de datos real o calibra sus estadísticas sabermétricas reales
 */
export function resolvePlayerStats(
  name: string,
  position = "UTIL",
  playerId?: number,
  defaultOrder = 5
): TangoPlayer {
  const norm = normalizeName(name);

  // 1. Búsqueda por nombre normalizado
  if (LEONES_REAL_STATS_MAP[norm]) {
    const match = LEONES_REAL_STATS_MAP[norm];
    return {
      ...match,
      position: position !== "UTIL" ? position : match.position,
      playerId: playerId || match.playerId,
    };
  }

  // 2. Búsqueda por coincidencia de subcadena o ID
  const entryByVal = Object.values(LEONES_REAL_STATS_MAP).find((p) => {
    if (playerId && p.playerId === playerId) return true;
    const pNorm = normalizeName(p.playerName);
    return norm.includes(pNorm) || pNorm.includes(norm);
  });

  if (entryByVal) {
    return {
      ...entryByVal,
      position: position !== "UTIL" ? position : entryByVal.position,
      playerId: playerId || entryByVal.playerId,
    };
  }

  // 3. Fallback defensivo para peloteros de refuerzo o rivales
  const baseAvg = defaultOrder <= 3 ? 0.285 : defaultOrder <= 5 ? 0.275 : 0.250;
  const baseObp = defaultOrder === 1 ? 0.365 : defaultOrder === 2 ? 0.360 : 0.330;
  const baseSlg = defaultOrder === 4 || defaultOrder === 5 ? 0.490 : 0.400;
  const iso = Number((baseSlg - baseAvg).toFixed(3));
  const woba = Number((baseObp * 0.7 + baseSlg * 0.3).toFixed(3));

  const cleanId = playerId || 600000 + Math.abs(norm.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 90000);

  return {
    playerId: cleanId,
    playerName: name,
    position,
    bats: defaultOrder % 2 === 0 ? "R" : "L",
    avg: baseAvg,
    obp: baseObp,
    slg: baseSlg,
    woba,
    wrcPlus: Math.round((woba / 0.320) * 100),
    iso,
    headshot: `https://midfield.mlbstatic.com/v1/people/${cleanId}/spots/120`,
  };
}

/**
 * Calcula las carreras proyectadas y métricas de un lineup de 9 bateadores
 */
export function calculateLineupMetrics(players: TangoPlayer[]): TangoLineupMetrics {
  const nine = players.slice(0, 9);
  let totalRunsGame = 0;
  let weightedWobaSum = 0;
  let totalPaWeights = 0;

  const contributions: TangoSlotContribution[] = nine.map((player, idx) => {
    const slot = idx + 1;
    const paWeight = SLOT_PA_WEIGHTS[slot] || 4.0;
    const cfg = TANGO_SLOT_LEVERAGE[slot];

    // Formulación BaseRuns ponderada para LVBP
    const slotRcPerPa =
      (player.obp * cfg.obpWeight * 0.48 +
        player.slg * cfg.slgWeight * 0.32 +
        player.iso * 0.15) *
      cfg.wobaMult;

    const runsGame = slotRcPerPa * (paWeight / 4.0);
    const runsSeason = runsGame * LVBP_REGULAR_SEASON_GAMES;

    totalRunsGame += runsGame;
    weightedWobaSum += player.woba * paWeight;
    totalPaWeights += paWeight;

    return {
      slot,
      player,
      role: cfg.role,
      roleDesc: cfg.roleDesc,
      paGame: paWeight,
      paSeason: Math.round(paWeight * LVBP_REGULAR_SEASON_GAMES),
      runsContributedGame: Number(runsGame.toFixed(2)),
      runsContributedSeason: Number(runsSeason.toFixed(1)),
      explanation: cfg.explanation,
    };
  });

  // Bonificación por alternancia de manos (platoon switches)
  let platoonSwitches = 0;
  for (let i = 0; i < nine.length - 1; i++) {
    const b1 = nine[i].bats;
    const b2 = nine[i + 1].bats;
    if (b1 !== b2 || b1 === "S" || b2 === "S") {
      platoonSwitches++;
    }
  }
  const platoonBonus = (platoonSwitches / 8.0) * 0.18; // hasta +0.18 R/G por buen balance
  const finalRunsGame = Number((totalRunsGame + platoonBonus).toFixed(2));
  const finalRunsSeason = Number((finalRunsGame * LVBP_REGULAR_SEASON_GAMES).toFixed(1));
  const teamWoba = Number((weightedWobaSum / (totalPaWeights || 1)).toFixed(3));
  const platoonScore = Math.round((platoonSwitches / 8.0) * 100);

  return {
    runsPerGame: finalRunsGame,
    runsPerSeason: finalRunsSeason,
    teamWoba,
    platoonBalanceScore: platoonScore,
    contributions,
  };
}

/**
 * Optimiza un conjunto de 9 bateadores siguiendo el algoritmo de Tom Tango (The Book)
 */
export function optimizeTangoLineup(currentNine: TangoPlayer[]): TangoOptimizationResult {
  if (currentNine.length < 9) {
    throw new Error("Se requieren al menos 9 bateadores para optimizar el lineup.");
  }

  const pool = [...currentNine.slice(0, 9)];
  const optimalSlots: Record<number, TangoPlayer> = {};

  // 1. Slot #2: El mejor bateador integral del equipo (Mayor wOBA)
  pool.sort((a, b) => b.woba - a.woba);
  optimalSlots[2] = pool.splice(0, 1)[0];

  // 2. Slot #1: El mejor OBP entre los 8 restantes
  pool.sort((a, b) => b.obp - a.obp);
  optimalSlots[1] = pool.splice(0, 1)[0];

  // 3. Slot #4: El bateador de mayor poder aislado (ISO / SLG) entre los 7 restantes
  pool.sort((a, b) => b.iso - a.iso || b.slg - a.slg);
  optimalSlots[4] = pool.splice(0, 1)[0];

  // 4. Slot #5: Segundo bateador de mayor poder restante (Mayor SLG)
  pool.sort((a, b) => b.slg - a.slg);
  optimalSlots[5] = pool.splice(0, 1)[0];

  // 5. Slot #3: El mejor bateador restante en wOBA/contacto (5to en la jerarquía)
  pool.sort((a, b) => b.woba - a.woba);
  optimalSlots[3] = pool.splice(0, 1)[0];

  // 6. Slot #9: Segundo Leadoff (Mejor OBP de los 4 restantes)
  pool.sort((a, b) => b.obp - a.obp);
  optimalSlots[9] = pool.splice(0, 1)[0];

  // 7. Slots #6, #7, #8: Orden descendente por wOBA entre los 3 restantes
  pool.sort((a, b) => b.woba - a.woba);
  optimalSlots[6] = pool.splice(0, 1)[0];
  optimalSlots[7] = pool.splice(0, 1)[0];
  optimalSlots[8] = pool.splice(0, 1)[0];

  // Construir el arreglo ordenado de 1 a 9
  const optimizedNine: TangoPlayer[] = [];
  for (let s = 1; s <= 9; s++) {
    optimizedNine.push(optimalSlots[s]);
  }

  const currentMetrics = calculateLineupMetrics(currentNine);
  const optimizedMetrics = calculateLineupMetrics(optimizedNine);

  const deltaRunsPerGame = Number(
    (optimizedMetrics.runsPerGame - currentMetrics.runsPerGame).toFixed(2)
  );
  const deltaRunsPerSeason = Number(
    (optimizedMetrics.runsPerSeason - currentMetrics.runsPerSeason).toFixed(1)
  );

  return {
    currentLineup: currentMetrics.contributions,
    optimizedLineup: optimizedMetrics.contributions,
    currentMetrics,
    optimizedMetrics,
    deltaRunsPerGame,
    deltaRunsPerSeason,
  };
}
