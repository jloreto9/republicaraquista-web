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

// Base canónica de bateadores de Leones del Caracas con estadísticas sabermétricas calibradas
export const LEONES_BATTING_POOL: TangoPlayer[] = [
  {
    playerId: 672580,
    playerName: "Lenyn Sosa",
    position: "2B",
    bats: "R",
    avg: 0.315,
    obp: 0.385,
    slg: 0.540,
    woba: 0.398,
    wrcPlus: 142,
    iso: 0.225,
    headshot: "https://midfield.mlbstatic.com/v1/people/672580/spots/120",
  },
  {
    playerId: 605612,
    playerName: "Harold Castro",
    position: "CF",
    bats: "L",
    avg: 0.320,
    obp: 0.365,
    slg: 0.490,
    woba: 0.370,
    wrcPlus: 128,
    iso: 0.170,
    headshot: "https://midfield.mlbstatic.com/v1/people/605612/spots/120",
  },
  {
    playerId: 600303,
    playerName: "José Rondón",
    position: "LF",
    bats: "R",
    avg: 0.285,
    obp: 0.375,
    slg: 0.535,
    woba: 0.390,
    wrcPlus: 138,
    iso: 0.250,
    headshot: "https://midfield.mlbstatic.com/v1/people/600303/spots/120",
  },
  {
    playerId: 660688,
    playerName: "Aldrem Corredor",
    position: "1B",
    bats: "L",
    avg: 0.305,
    obp: 0.405,
    slg: 0.510,
    woba: 0.395,
    wrcPlus: 140,
    iso: 0.205,
    headshot: "https://midfield.mlbstatic.com/v1/people/660688/spots/120",
  },
  {
    playerId: 541645,
    playerName: "Oswaldo Arcia",
    position: "RF",
    bats: "L",
    avg: 0.270,
    obp: 0.390,
    slg: 0.525,
    woba: 0.388,
    wrcPlus: 135,
    iso: 0.255,
    headshot: "https://midfield.mlbstatic.com/v1/people/541645/spots/120",
  },
  {
    playerId: 570489,
    playerName: "Wilfredo Tovar",
    position: "SS",
    bats: "R",
    avg: 0.295,
    obp: 0.360,
    slg: 0.395,
    woba: 0.332,
    wrcPlus: 104,
    iso: 0.100,
    headshot: "https://midfield.mlbstatic.com/v1/people/570489/spots/120",
  },
  {
    playerId: 571997,
    playerName: "Gabriel Noriega",
    position: "3B",
    bats: "R",
    avg: 0.290,
    obp: 0.340,
    slg: 0.420,
    woba: 0.330,
    wrcPlus: 102,
    iso: 0.130,
    headshot: "https://midfield.mlbstatic.com/v1/people/571997/spots/120",
  },
  {
    playerId: 641627,
    playerName: "Jhonny Pereda",
    position: "C",
    bats: "R",
    avg: 0.280,
    obp: 0.360,
    slg: 0.400,
    woba: 0.334,
    wrcPlus: 105,
    iso: 0.120,
    headshot: "https://midfield.mlbstatic.com/v1/people/641627/spots/120",
  },
  {
    playerId: 677649,
    playerName: "Liván Soto",
    position: "DH",
    bats: "L",
    avg: 0.285,
    obp: 0.370,
    slg: 0.380,
    woba: 0.336,
    wrcPlus: 106,
    iso: 0.095,
    headshot: "https://midfield.mlbstatic.com/v1/people/677649/spots/120",
  },
  {
    playerId: 650907,
    playerName: "René Pinto",
    position: "C",
    bats: "R",
    avg: 0.265,
    obp: 0.330,
    slg: 0.460,
    woba: 0.342,
    wrcPlus: 110,
    iso: 0.195,
    headshot: "https://midfield.mlbstatic.com/v1/people/650907/spots/120",
  },
];

/**
 * Busca un jugador en la base de datos o genera estimaciones sabermétricas por posición
 */
export function resolvePlayerStats(name: string, position = "UTIL", defaultOrder = 5): TangoPlayer {
  const normalized = name.toLowerCase().trim();
  const match = LEONES_BATTING_POOL.find((p) => p.playerName.toLowerCase().trim() === normalized);

  if (match) {
    return { ...match, position: position !== "UTIL" ? position : match.position };
  }

  // Generación defensiva de estadísticas según orden tradicional si no está en la base
  const baseAvg = defaultOrder <= 3 ? 0.290 : defaultOrder <= 5 ? 0.280 : 0.255;
  const baseObp = defaultOrder === 1 ? 0.375 : defaultOrder === 2 ? 0.365 : 0.335;
  const baseSlg = defaultOrder === 4 || defaultOrder === 5 ? 0.510 : 0.410;
  const iso = Number((baseSlg - baseAvg).toFixed(3));
  const woba = Number((baseObp * 0.7 + baseSlg * 0.3).toFixed(3));

  return {
    playerId: Math.floor(Math.random() * 900000) + 100000,
    playerName: name,
    position,
    bats: defaultOrder % 2 === 0 ? "R" : "L",
    avg: baseAvg,
    obp: baseObp,
    slg: baseSlg,
    woba,
    wrcPlus: Math.round((woba / 0.320) * 100),
    iso,
    headshot: "https://midfield.mlbstatic.com/v1/people/672580/spots/120",
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
