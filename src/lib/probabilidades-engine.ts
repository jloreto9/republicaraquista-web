import {
  SportsbookId,
  SportsbookMeta,
  SportsbookOdds,
  ProbablePitcher,
  ParkFactor,
  ModelProbabilities,
  ValueAssessment,
  BestOddsSummary,
  GameProjection,
  TipsterDailyCard,
  EvRating,
  OddsFormat,
  NextScheduledGameSummary,
} from "@/types/probabilidades";
import { LVBP_TEAMS, getTeam } from "@/lib/constants";
import {
  getGameForDate,
  getNextScheduledGame,
  getDaysUntilGame,
} from "@/lib/calendar-service";

// ── Metadatos de las 4 Casas de Apuestas Soportadas ──
export const SPORTSBOOKS_META: Record<SportsbookId, SportsbookMeta> = {
  juegaenlinea: {
    id: "juegaenlinea",
    name: "JuegaEnLínea",
    shortName: "JEL",
    badgeBg: "#00B074",
    textColor: "#FFFFFF",
    borderColor: "#00E096",
  },
  betcris: {
    id: "betcris",
    name: "Betcris",
    shortName: "BCR",
    badgeBg: "#0052CC",
    textColor: "#FFFFFF",
    borderColor: "#2684FF",
  },
  sellatuparley: {
    id: "sellatuparley",
    name: "SellaTuParley",
    shortName: "STP",
    badgeBg: "#E53935",
    textColor: "#FFFFFF",
    borderColor: "#FF6B6B",
  },
  apuestasroyal: {
    id: "apuestasroyal",
    name: "Apuestas Royal",
    shortName: "ROY",
    badgeBg: "#8E24AA",
    textColor: "#FFFFFF",
    borderColor: "#BA68C8",
  },
  custom: {
    id: "custom",
    name: "Personalizada",
    shortName: "MÍA",
    badgeBg: "#475569",
    textColor: "#FFFFFF",
    borderColor: "#94A3B8",
  },
};

// ── Factores de Parque de la LVBP ──
export const LVBP_PARK_FACTORS: Record<string, ParkFactor> = {
  "Estadio Monumental Simón Bolívar": {
    stadiumName: "Estadio Monumental Simón Bolívar",
    city: "Caracas (La Rinconada)",
    runFactor: 1.02,
    hrFactor: 0.98,
    elevationMeters: 950,
    description: "Sede principal de Leones del Caracas. Parque amplio de estándar MLB con altitud caraquista.",
  },
  "Estadio Universitario de Caracas": {
    stadiumName: "Estadio Universitario de Caracas",
    city: "Caracas",
    runFactor: 1.05,
    hrFactor: 1.10,
    elevationMeters: 900,
    description: "Parque bateador por altitud (900m) y dimensiones accesibles en los callejones.",
  },
  "Estadio José Bernardo Pérez": {
    stadiumName: "Estadio José Bernardo Pérez",
    city: "Valencia",
    runFactor: 0.98,
    hrFactor: 0.95,
    elevationMeters: 450,
    description: "Parque neutral tendiente a pitcheo nocturno.",
  },
  "Estadio Antonio Herrera Gutiérrez": {
    stadiumName: "Estadio Antonio Herrera Gutiérrez",
    city: "Barquisimeto",
    runFactor: 0.94,
    hrFactor: 0.88,
    elevationMeters: 560,
    description: "Fuerte parque de lanzadores por brisa nocturna en contra hacia el home.",
  },
  "Estadio José Pérez Colmenares": {
    stadiumName: "Estadio José Pérez Colmenares",
    city: "Maracay",
    runFactor: 1.02,
    hrFactor: 1.04,
    elevationMeters: 440,
    description: "Ligeramente favorable a bateadores zurdos.",
  },
  "Estadio Luis Aparicio 'El Grande'": {
    stadiumName: "Estadio Luis Aparicio 'El Grande'",
    city: "Maracaibo",
    runFactor: 0.92,
    hrFactor: 0.82,
    elevationMeters: 15,
    description: "Extensas dimensiones de jardines (400+ pies), parque élite para lanzadores.",
  },
  "Estadio Alfonso 'Chico' Carrasquel": {
    stadiumName: "Estadio Alfonso 'Chico' Carrasquel",
    city: "Puerto La Cruz",
    runFactor: 1.08,
    hrFactor: 1.18,
    elevationMeters: 10,
    description: "Parque marcadamente bateador por calor costero y viento favorable.",
  },
  "Estadio Jorge Luis García Carneiro": {
    stadiumName: "Estadio Jorge Luis García Carneiro (Forum La Guaira)",
    city: "La Guaira",
    runFactor: 0.97,
    hrFactor: 0.92,
    elevationMeters: 5,
    description: "Brisa marina densa que frena batazos profundos en la noche.",
  },
  "Estadio Nueva Esparta": {
    stadiumName: "Estadio Nueva Esparta (Guatamare)",
    city: "Porlamar",
    runFactor: 1.04,
    hrFactor: 1.02,
    elevationMeters: 30,
    description: "Condiciones de calor insular moderadamente favorables al bateo.",
  },
};

export const DEFAULT_PARK_FACTOR: ParkFactor = {
  stadiumName: "Estadio LVBP",
  city: "Venezuela",
  runFactor: 1.0,
  hrFactor: 1.0,
  elevationMeters: 400,
  description: "Condiciones estándar promedio de la liga.",
};

export const DEFAULT_TEAM_HOME_STADIUM: Record<number, string> = {
  695: "Estadio Monumental Simón Bolívar",
  696: "Estadio José Bernardo Pérez",
  698: "Estadio Jorge Luis García Carneiro",
  693: "Estadio Antonio Herrera Gutiérrez",
  699: "Estadio José Pérez Colmenares",
  692: "Estadio Luis Aparicio 'El Grande'",
  694: "Estadio Alfonso 'Chico' Carrasquel",
  697: "Estadio Nueva Esparta",
};

/**
 * Normaliza y resuelve el factor de parque adecuado para cualquier nombre de estadio
 */
export function resolveParkFactor(stadiumName?: string): ParkFactor {
  if (!stadiumName) return DEFAULT_PARK_FACTOR;
  const norm = stadiumName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"“”]/g, "");

  if (norm.includes("monumental") || norm.includes("rinconada")) {
    return LVBP_PARK_FACTORS["Estadio Monumental Simón Bolívar"];
  }
  if (norm.includes("universitario")) {
    return LVBP_PARK_FACTORS["Estadio Universitario de Caracas"];
  }
  if (norm.includes("bernardo perez") || norm.includes("valencia")) {
    return LVBP_PARK_FACTORS["Estadio José Bernardo Pérez"];
  }
  if (norm.includes("herrera") || norm.includes("barquisimeto")) {
    return LVBP_PARK_FACTORS["Estadio Antonio Herrera Gutiérrez"];
  }
  if (norm.includes("perez colmenares") || norm.includes("maracay")) {
    return LVBP_PARK_FACTORS["Estadio José Pérez Colmenares"];
  }
  if (norm.includes("aparicio") || norm.includes("maracaibo") || norm.includes("zulia")) {
    return LVBP_PARK_FACTORS["Estadio Luis Aparicio 'El Grande'"];
  }
  if (norm.includes("carrasquel") || norm.includes("chico") || norm.includes("anzoategui") || norm.includes("puerto")) {
    return LVBP_PARK_FACTORS["Estadio Alfonso 'Chico' Carrasquel"];
  }
  if (norm.includes("garcia carneiro") || norm.includes("la guaira") || norm.includes("forum")) {
    return LVBP_PARK_FACTORS["Estadio Jorge Luis García Carneiro"];
  }
  if (norm.includes("esparta") || norm.includes("guatamare") || norm.includes("margarita")) {
    return LVBP_PARK_FACTORS["Estadio Nueva Esparta"];
  }

  return LVBP_PARK_FACTORS[stadiumName] || DEFAULT_PARK_FACTOR;
}

// ── Rotación de Abridores Proyectados por Equipo ──
export const DEFAULT_STARTING_ROTATIONS: Record<number, ProbablePitcher[]> = {
  695: [
    { id: 672580, name: "Albert Suárez", teamId: 695, teamAbbr: "CAR", throws: "R", era: 3.12, fip: 2.95, whip: 1.15, k9: 8.8, bb9: 2.1, inningsPitched: 52.0 },
    { id: 518553, name: "Jhoulys Chacín", teamId: 695, teamAbbr: "CAR", throws: "R", era: 3.65, fip: 3.50, whip: 1.25, k9: 7.2, bb9: 2.8, inningsPitched: 49.1 },
    { id: 605330, name: "Erick Leal", teamId: 695, teamAbbr: "CAR", throws: "R", era: 3.40, fip: 3.25, whip: 1.18, k9: 8.4, bb9: 2.5, inningsPitched: 55.0 },
    { id: 642544, name: "Ronald Herrera", teamId: 695, teamAbbr: "CAR", throws: "R", era: 4.15, fip: 4.05, whip: 1.32, k9: 6.9, bb9: 3.1, inningsPitched: 41.0 },
    { id: 672804, name: "Jesús Vargas", teamId: 695, teamAbbr: "CAR", throws: "R", era: 4.45, fip: 4.25, whip: 1.38, k9: 6.5, bb9: 3.2, inningsPitched: 38.1 },
  ],
  696: [
    { id: 502674, name: "Yohander Méndez", teamId: 696, teamAbbr: "MAG", throws: "L", era: 3.55, fip: 3.42, whip: 1.22, k9: 8.1, bb9: 2.9, inningsPitched: 48.0 },
    { id: 660821, name: "Nivaldo Rodríguez", teamId: 696, teamAbbr: "MAG", throws: "R", era: 3.82, fip: 3.70, whip: 1.26, k9: 7.8, bb9: 2.7, inningsPitched: 45.0 },
    { id: 448855, name: "Junior Guerra", teamId: 696, teamAbbr: "MAG", throws: "R", era: 4.35, fip: 4.15, whip: 1.35, k9: 7.0, bb9: 3.4, inningsPitched: 42.0 },
    { id: 650382, name: "Ricardo Sánchez", teamId: 696, teamAbbr: "MAG", throws: "L", era: 4.05, fip: 3.90, whip: 1.28, k9: 7.4, bb9: 3.0, inningsPitched: 39.2 },
  ],
  698: [
    { id: 620982, name: "Ricardo Pinto", teamId: 698, teamAbbr: "LAG", throws: "R", era: 3.18, fip: 3.05, whip: 1.16, k9: 8.5, bb9: 2.4, inningsPitched: 54.0 },
    { id: 670060, name: "Miguel Romero", teamId: 698, teamAbbr: "LAG", throws: "R", era: 3.95, fip: 3.80, whip: 1.29, k9: 7.6, bb9: 2.9, inningsPitched: 43.1 },
    { id: 622663, name: "David Reyes", teamId: 698, teamAbbr: "LAG", throws: "R", era: 3.88, fip: 3.75, whip: 1.27, k9: 7.1, bb9: 2.6, inningsPitched: 46.0 },
  ],
  693: [
    { id: 666721, name: "Máximo Castillo", teamId: 693, teamAbbr: "LAR", throws: "R", era: 3.05, fip: 2.92, whip: 1.12, k9: 8.9, bb9: 2.0, inningsPitched: 56.0 },
    { id: 468480, name: "Raúl Rivero", teamId: 693, teamAbbr: "LAR", throws: "R", era: 3.72, fip: 3.60, whip: 1.24, k9: 6.8, bb9: 2.5, inningsPitched: 47.0 },
    { id: 486790, name: "Néstor Molina", teamId: 693, teamAbbr: "LAR", throws: "R", era: 4.25, fip: 4.10, whip: 1.34, k9: 6.4, bb9: 2.8, inningsPitched: 40.0 },
  ],
  699: [
    { id: 453056, name: "Guillermo Moscoso", teamId: 699, teamAbbr: "ARA", throws: "R", era: 4.02, fip: 3.95, whip: 1.30, k9: 6.9, bb9: 2.8, inningsPitched: 44.0 },
    { id: 671040, name: "José E. Martínez", teamId: 699, teamAbbr: "ARA", throws: "R", era: 4.35, fip: 4.20, whip: 1.35, k9: 7.1, bb9: 3.2, inningsPitched: 37.0 },
  ],
  692: [
    { id: 683515, name: "Jorge Tavárez", teamId: 692, teamAbbr: "ZUL", throws: "R", era: 3.50, fip: 3.40, whip: 1.21, k9: 8.2, bb9: 2.7, inningsPitched: 50.0 },
    { id: 606213, name: "Eudis Idrogo", teamId: 692, teamAbbr: "ZUL", throws: "L", era: 4.30, fip: 4.22, whip: 1.36, k9: 6.6, bb9: 3.3, inningsPitched: 40.0 },
  ],
  694: [
    { id: 650828, name: "Luis Escobar", teamId: 694, teamAbbr: "ORI", throws: "R", era: 4.65, fip: 4.45, whip: 1.42, k9: 7.5, bb9: 3.6, inningsPitched: 42.0 },
    { id: 664030, name: "David Richardson", teamId: 694, teamAbbr: "ORI", throws: "R", era: 4.80, fip: 4.60, whip: 1.45, k9: 7.0, bb9: 3.8, inningsPitched: 38.0 },
  ],
  697: [
    { id: 605397, name: "Osmer Morales", teamId: 697, teamAbbr: "MAR", throws: "R", era: 2.85, fip: 2.75, whip: 1.10, k9: 9.2, bb9: 2.2, inningsPitched: 57.0 },
    { id: 467094, name: "Félix Doubront", teamId: 697, teamAbbr: "MAR", throws: "L", era: 3.45, fip: 3.35, whip: 1.20, k9: 8.0, bb9: 2.6, inningsPitched: 51.0 },
  ],
};

// ── Rendimiento Base de Equipos en LVBP (Anotadas/Permitidas/ELO) ──
interface TeamSeasonBasics {
  rPerGame: number;
  raPerGame: number;
  bullpenFip: number;
  elo: number;
}

const TEAM_BASICS: Record<number, TeamSeasonBasics> = {
  695: { rPerGame: 5.4, raPerGame: 4.5, bullpenFip: 3.85, elo: 1545 }, // Caracas
  696: { rPerGame: 5.1, raPerGame: 4.8, bullpenFip: 4.10, elo: 1515 }, // Magallanes
  698: { rPerGame: 5.5, raPerGame: 4.6, bullpenFip: 3.90, elo: 1535 }, // La Guaira
  693: { rPerGame: 5.2, raPerGame: 4.3, bullpenFip: 3.75, elo: 1540 }, // Lara
  699: { rPerGame: 4.8, raPerGame: 5.0, bullpenFip: 4.30, elo: 1485 }, // Aragua
  692: { rPerGame: 4.7, raPerGame: 4.9, bullpenFip: 4.25, elo: 1480 }, // Zulia
  694: { rPerGame: 4.9, raPerGame: 5.4, bullpenFip: 4.60, elo: 1460 }, // Caribes
  697: { rPerGame: 5.0, raPerGame: 4.7, bullpenFip: 4.05, elo: 1505 }, // Bravos
};

const LEAGUE_AVG_FIP = 4.15;
const LEAGUE_AVG_RUNS = 5.05;

// ── Funciones Matemáticas de Distribución y Líneas ──

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function poisson(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Convierte probabilidad pura en Cuota Decimal Justa
 */
export function probToDecimal(prob: number): number {
  if (prob <= 0) return 99.0;
  if (prob >= 1) return 1.01;
  return Number((1 / prob).toFixed(2));
}

/**
 * Convierte probabilidad pura en Cuota Americana Justa
 */
export function probToAmerican(prob: number): number {
  if (prob >= 0.5) {
    const us = -(prob / (1 - prob)) * 100;
    return Math.round(us);
  } else {
    const us = ((1 - prob) / prob) * 100;
    return Math.round(us);
  }
}

/**
 * Convierte Cuota Decimal a Americana
 */
export function decimalToAmerican(decimal: number): number {
  if (decimal >= 2.0) {
    return Math.round((decimal - 1) * 100);
  } else if (decimal > 1.0) {
    return Math.round(-100 / (decimal - 1));
  }
  return 100;
}

/**
 * Convierte Cuota Americana a Decimal
 * Ej: +120 -> 2.20, -120 -> 1.83
 */
export function americanToDecimal(american: number): number {
  if (american >= 100) {
    return Number((1 + american / 100).toFixed(2));
  } else if (american <= -100) {
    return Number((1 + 100 / Math.abs(american)).toFixed(2));
  }
  return 1.91;
}

/**
 * Formatea una cuota decimal en el formato seleccionado (Americano por defecto)
 * Ej: formatOdds(2.20, "american") -> "+120"
 * Ej: formatOdds(1.83, "american") -> "-120"
 */
export function formatOdds(decimal?: number | null, format: OddsFormat = "american"): string {
  if (decimal == null || isNaN(decimal) || decimal <= 1.0) {
    return "—";
  }
  if (format === "decimal") {
    return decimal.toFixed(2);
  }
  const am = decimalToAmerican(decimal);
  return am > 0 ? `+${am}` : `${am}`;
}

/**
 * Calcula el Expected Value (+EV%)
 */
export function calculateEv(winProb: number, marketOdds: number): number {
  if (marketOdds <= 1.0 || winProb <= 0) return 0;
  const ev = (winProb * (marketOdds - 1) - (1 - winProb)) * 100;
  return Number(ev.toFixed(1));
}

/**
 * Criterio de Kelly Fraccional (Quarter-Kelly)
 * f* = [(p*b - q) / b] * 0.25
 */
export function calculateKellyStake(winProb: number, marketOdds: number): number {
  if (marketOdds <= 1.0 || winProb <= 0) return 0;
  const b = marketOdds - 1;
  const q = 1 - winProb;
  const fullKelly = (winProb * b - q) / b;
  if (fullKelly <= 0) return 0;
  const quarterKelly = fullKelly * 0.25 * 100; // Porcentaje de bankroll
  return Number(Math.min(quarterKelly, 5.0).toFixed(1)); // Tope de seguridad: 5.0%
}

/**
 * Evalúa el Sistema Semáforo Sabermétrico
 */
export function evaluateRating(evPercent: number): EvRating {
  if (evPercent >= 12.0) return "mispriced";
  if (evPercent >= 5.0) return "value";
  return "neutral";
}

/**
 * Genera la Explicación Cuantitativa de la Ineficiencia de Mercado
 */
export function generateMispricingExplanation(
  selectionName: string,
  teamAbbr: string,
  sportsbookName: string,
  marketOdds: number,
  fairOdds: number,
  starter: ProbablePitcher,
  oppStarter: ProbablePitcher,
  park: ParkFactor,
  evPercent: number
): string {
  const probImplied = ((1 / marketOdds) * 100).toFixed(1);
  const probModel = ((1 / fairOdds) * 100).toFixed(1);

  if (starter.fip < oppStarter.fip - 0.7) {
    return `${sportsbookName} paga a ${teamAbbr} a cuota ${marketOdds.toFixed(2)} (probabilidad implícita de solo ${probImplied}%), ignorando la clara ventaja monticular: su abridor ${starter.name} (FIP ${starter.fip.toFixed(2)}) domina ampliamente al abridor rival (FIP ${oppStarter.fip.toFixed(2)}). El modelo proyecta ${probModel}% de victoria (Cuota Justa ${fairOdds.toFixed(2)}), generando un desbalance de +${evPercent}% EV.`;
  }

  if (park.runFactor < 0.95) {
    return `${sportsbookName} desestima el parque de lanzadores de ${park.city} (Factor de Carreras ${park.runFactor.toFixed(2)}). La línea está sobrevalorando la racha de bateo reciente frente a condiciones que deprimen el contacto, ofreciendo un retorno inflado para ${teamAbbr} con +${evPercent}% EV.`;
  }

  return `Línea colgada en ${sportsbookName}. El mercado pondera en exceso la localía o historial directo, castigando a ${teamAbbr} con cuota ${marketOdds.toFixed(2)} (${probImplied}% implícito) cuando los fundamentos sabermétricos le otorgan ${probModel}% (Cuota Justa ${fairOdds.toFixed(2)}). Valor positivo inmediato de +${evPercent}% EV.`;
}

/**
 * Motor Multi-Factor de Proyección Sabermétrica
 */
export function projectMatchup(
  homeTeamId: number,
  awayTeamId: number,
  homeStarter: ProbablePitcher,
  awayStarter: ProbablePitcher,
  park: ParkFactor
): ModelProbabilities {
  const homeBasics = TEAM_BASICS[homeTeamId] || { rPerGame: 5.0, raPerGame: 5.0, bullpenFip: 4.15, elo: 1500 };
  const awayBasics = TEAM_BASICS[awayTeamId] || { rPerGame: 5.0, raPerGame: 5.0, bullpenFip: 4.15, elo: 1500 };

  // 1. Delta del Abridor (ponderado a 4.5 entradas)
  const homeSpDelta = ((homeStarter.fip - LEAGUE_AVG_FIP) / LEAGUE_AVG_FIP) * 0.5;
  const awaySpDelta = ((awayStarter.fip - LEAGUE_AVG_FIP) / LEAGUE_AVG_FIP) * 0.5;

  // 2. Delta del Bullpen (ponderado a 4.5 entradas)
  const homeBpDelta = ((homeBasics.bullpenFip - LEAGUE_AVG_FIP) / LEAGUE_AVG_FIP) * 0.5;
  const awayBpDelta = ((awayBasics.bullpenFip - LEAGUE_AVG_FIP) / LEAGUE_AVG_FIP) * 0.5;

  // 3. Ventaja de Localía (+35 ELO -> ~3.2% ventaja de carreras)
  const homeFieldAdvantage = 1.032;
  const awayFieldDisadvantage = 0.968;

  // 4. Carreras Esperadas Proyectadas (xR)
  const homeExpected =
    homeBasics.rPerGame *
    (1 + awaySpDelta + awayBpDelta) *
    park.runFactor *
    homeFieldAdvantage;

  const awayExpected =
    awayBasics.rPerGame *
    (1 + homeSpDelta + homeBpDelta) *
    park.runFactor *
    awayFieldDisadvantage;

  const hExp = Number(Math.max(2.2, homeExpected).toFixed(2));
  const aExp = Number(Math.max(2.0, awayExpected).toFixed(2));
  const totalExp = Number((hExp + aExp).toFixed(1));

  // 5. Simulación Bivariada Poisson/Skellam para Moneyline, Runline y Totals
  const maxScore = 18;
  let homeWinCount = 0;
  let awayWinCount = 0;
  let tieCount = 0;
  let homeCoverRl = 0; // Gana por 2 o más
  let awayCoverRl = 0; // Gana o pierde por máximo 1
  let overCount = 0;
  let underCount = 0;

  // Línea de total sugerida (entera o media carrera, ej: 9.0 o 9.5)
  const recommendedTotal = totalExp >= Math.floor(totalExp) + 0.5 ? Math.floor(totalExp) + 0.5 : Math.floor(totalExp);

  for (let h = 0; h <= maxScore; h++) {
    const pH = poisson(h, hExp);
    for (let a = 0; a <= maxScore; a++) {
      const pJoint = pH * poisson(a, aExp);

      if (h > a) {
        homeWinCount += pJoint;
        if (h - a >= 2) homeCoverRl += pJoint;
        else awayCoverRl += pJoint;
      } else if (a > h) {
        awayWinCount += pJoint;
        awayCoverRl += pJoint;
      } else {
        tieCount += pJoint;
      }

      if (h + a > recommendedTotal) overCount += pJoint;
      else if (h + a < recommendedTotal) underCount += pJoint;
      else {
        // En empates exactos con líneas enteras
        overCount += pJoint * 0.5;
        underCount += pJoint * 0.5;
      }
    }
  }

  // Desempate de 9na entrada en béisbol (53% local / 47% visita por localía en extrainning)
  const finalHomeProb = homeWinCount + tieCount * 0.53;
  const finalAwayProb = awayWinCount + tieCount * 0.47;
  const sumProb = finalHomeProb + finalAwayProb;
  const normHome = Number((finalHomeProb / sumProb).toFixed(3));
  const normAway = Number((finalAwayProb / sumProb).toFixed(3));

  const runlineHomeProb = Number(Math.min(0.85, Math.max(0.15, homeCoverRl)).toFixed(3));
  const runlineAwayProb = Number((1.0 - runlineHomeProb).toFixed(3));

  const sumTotals = overCount + underCount;
  const normOver = Number((overCount / sumTotals).toFixed(3));
  const normUnder = Number((underCount / sumTotals).toFixed(3));

  return {
    homeWinProb: normHome,
    awayWinProb: normAway,
    homeExpectedRuns: hExp,
    awayExpectedRuns: aExp,
    totalExpectedRuns: totalExp,
    fairHomeDecimal: probToDecimal(normHome),
    fairAwayDecimal: probToDecimal(normAway),
    fairHomeAmerican: probToAmerican(normHome),
    fairAwayAmerican: probToAmerican(normAway),
    runlineHomeProb,
    runlineAwayProb,
    fairRunlineHomeDecimal: probToDecimal(runlineHomeProb),
    fairRunlineAwayDecimal: probToDecimal(runlineAwayProb),
    overProb: normOver,
    underProb: normUnder,
    recommendedTotal,
  };
}

/**
 * Genera la estructura inicial de cuotas para las casas de apuestas.
 * Regla de negocio estricta: si ninguna casa ha publicado líneas reales,
 * NO se inventan cuotas. Todas las casas inician en isOpen = false y homeMl = null.
 */
export function generateInitialOdds(model: ModelProbabilities): Record<SportsbookId, SportsbookOdds> {
  const books: SportsbookId[] = ["juegaenlinea", "betcris", "sellatuparley", "apuestasroyal", "custom"];

  const oddsObj: Partial<Record<SportsbookId, SportsbookOdds>> = {};
  for (const bId of books) {
    const meta = SPORTSBOOKS_META[bId];
    oddsObj[bId] = {
      sportsbookId: bId,
      sportsbookName: meta.name,
      homeMl: null,
      awayMl: null,
      overTotal: model.recommendedTotal,
      overOdds: null,
      underOdds: null,
      runlineSpread: -1.5,
      runlineHomeOdds: null,
      runlineAwayOdds: null,
      isOpen: false,
    };
  }

  return oddsObj as Record<SportsbookId, SportsbookOdds>;
}

export const generateRealisticOdds = generateInitialOdds;

/**
 * Encuentra las mejores cuotas del mercado (Best Odds) únicamente entre líneas abiertas y reales
 */
export function extractBestOdds(oddsByBook: Record<SportsbookId, SportsbookOdds>): BestOddsSummary {
  const books: SportsbookId[] = ["juegaenlinea", "betcris", "sellatuparley", "apuestasroyal", "custom"];

  let bestHome: { odds: number; sportsbookId: SportsbookId; sportsbookName: string } | undefined = undefined;
  let bestAway: { odds: number; sportsbookId: SportsbookId; sportsbookName: string } | undefined = undefined;
  let bestOver: { odds: number; line: number; sportsbookId: SportsbookId; sportsbookName: string } | undefined = undefined;
  let bestUnder: { odds: number; line: number; sportsbookId: SportsbookId; sportsbookName: string } | undefined = undefined;

  for (const bId of books) {
    const ob = oddsByBook[bId];
    if (!ob || !ob.isOpen) continue;

    if (ob.homeMl && ob.homeMl > 1.0) {
      if (!bestHome || ob.homeMl > bestHome.odds) {
        bestHome = { odds: ob.homeMl, sportsbookId: bId, sportsbookName: ob.sportsbookName };
      }
    }
    if (ob.awayMl && ob.awayMl > 1.0) {
      if (!bestAway || ob.awayMl > bestAway.odds) {
        bestAway = { odds: ob.awayMl, sportsbookId: bId, sportsbookName: ob.sportsbookName };
      }
    }
    if (ob.overOdds && ob.overOdds > 1.0 && ob.overTotal) {
      if (!bestOver || ob.overOdds > bestOver.odds) {
        bestOver = { odds: ob.overOdds, line: ob.overTotal, sportsbookId: bId, sportsbookName: ob.sportsbookName };
      }
    }
    if (ob.underOdds && ob.underOdds > 1.0 && ob.overTotal) {
      if (!bestUnder || ob.underOdds > bestUnder.odds) {
        bestUnder = { odds: ob.underOdds, line: ob.overTotal, sportsbookId: bId, sportsbookName: ob.sportsbookName };
      }
    }
  }

  return {
    hasMarketOdds: Boolean(bestHome || bestAway),
    bestHomeMl: bestHome,
    bestAwayMl: bestAway,
    bestOver,
    bestUnder,
  };
}

/**
 * Evalúa todas las selecciones y genera las alertas de Cuotas Mal Puestas (+EV)
 */
export function evaluateAssessments(
  model: ModelProbabilities,
  oddsByBook: Record<SportsbookId, SportsbookOdds>,
  homeTeamAbbr: string,
  awayTeamAbbr: string,
  homePitcher: ProbablePitcher,
  awayPitcher: ProbablePitcher,
  park: ParkFactor
): ValueAssessment[] {
  const assessments: ValueAssessment[] = [];
  const books: SportsbookId[] = ["juegaenlinea", "betcris", "sellatuparley", "apuestasroyal", "custom"];

  for (const bId of books) {
    const ob = oddsByBook[bId];
    if (!ob || !ob.isOpen) continue;

    // 1. Home Moneyline (solo si la línea está abierta con cuota real)
    if (ob.homeMl && ob.homeMl > 1.0) {
      const evHome = calculateEv(model.homeWinProb, ob.homeMl);
      const ratingHome = evaluateRating(evHome);
      const stakeHome = calculateKellyStake(model.homeWinProb, ob.homeMl);
      const expHome =
        ratingHome === "mispriced"
          ? generateMispricingExplanation(
              `Victoria ${homeTeamAbbr}`,
              homeTeamAbbr,
              ob.sportsbookName,
              ob.homeMl,
              model.fairHomeDecimal,
              homePitcher,
              awayPitcher,
              park,
              evHome
            )
          : undefined;

      assessments.push({
        selection: "home_ml",
        label: `${homeTeamAbbr} (Victoria ML)`,
        teamAbbr: homeTeamAbbr,
        sportsbookId: bId,
        sportsbookName: ob.sportsbookName,
        marketOdds: ob.homeMl,
        fairOdds: model.fairHomeDecimal,
        winProb: model.homeWinProb,
        evPercent: evHome,
        rating: ratingHome,
        kellyStakePercent: stakeHome,
        explanation: expHome,
      });
    }

    // 2. Away Moneyline
    if (ob.awayMl && ob.awayMl > 1.0) {
      const evAway = calculateEv(model.awayWinProb, ob.awayMl);
      const ratingAway = evaluateRating(evAway);
      const stakeAway = calculateKellyStake(model.awayWinProb, ob.awayMl);
      const expAway =
        ratingAway === "mispriced"
          ? generateMispricingExplanation(
              `Victoria ${awayTeamAbbr}`,
              awayTeamAbbr,
              ob.sportsbookName,
              ob.awayMl,
              model.fairAwayDecimal,
              awayPitcher,
              homePitcher,
              park,
              evAway
            )
          : undefined;

      assessments.push({
        selection: "away_ml",
        label: `${awayTeamAbbr} (Victoria ML)`,
        teamAbbr: awayTeamAbbr,
        sportsbookId: bId,
        sportsbookName: ob.sportsbookName,
        marketOdds: ob.awayMl,
        fairOdds: model.fairAwayDecimal,
        winProb: model.awayWinProb,
        evPercent: evAway,
        rating: ratingAway,
        kellyStakePercent: stakeAway,
        explanation: expAway,
      });
    }

    // 3. Over Totals
    if (ob.overOdds && ob.overOdds > 1.0) {
      const evOver = calculateEv(model.overProb, ob.overOdds);
      const ratingOver = evaluateRating(evOver);
      assessments.push({
        selection: "over",
        label: `Over ${model.recommendedTotal} Carreras`,
        sportsbookId: bId,
        sportsbookName: ob.sportsbookName,
        marketOdds: ob.overOdds,
        fairOdds: probToDecimal(model.overProb),
        winProb: model.overProb,
        evPercent: evOver,
        rating: ratingOver,
        kellyStakePercent: calculateKellyStake(model.overProb, ob.overOdds),
      });
    }

    // 4. Under Totals
    if (ob.underOdds && ob.underOdds > 1.0) {
      const evUnder = calculateEv(model.underProb, ob.underOdds);
      const ratingUnder = evaluateRating(evUnder);
      assessments.push({
        selection: "under",
        label: `Under ${model.recommendedTotal} Carreras`,
        sportsbookId: bId,
        sportsbookName: ob.sportsbookName,
        marketOdds: ob.underOdds,
        fairOdds: probToDecimal(model.underProb),
        winProb: model.underProb,
        evPercent: evUnder,
        rating: ratingUnder,
        kellyStakePercent: calculateKellyStake(model.underProb, ob.underOdds),
      });
    }
  }

  // Ordenar por mayor EV%
  return assessments.sort((a, b) => b.evPercent - a.evPercent);
}

/**
 * Jornada de Partidos Conectada al Calendario Oficial de la LVBP.
 * Si Leones del Caracas tiene juego programado en dateStr, se toma ese encuentro exacto.
 * Si es día de descanso, se ofrece simulación y aviso de próximo juego oficial.
 */
export function getSampleDailyCard(dateStr = "2026-10-13"): TipsterDailyCard {
  const calEvent = getGameForDate(dateStr);
  const nextGame = getNextScheduledGame(dateStr);
  const daysUntil = nextGame ? getDaysUntilGame(nextGame.date, dateStr) : 0;

  const nextScheduledGameSummary: NextScheduledGameSummary | undefined = nextGame
    ? {
        date: nextGame.date,
        opponentId: nextGame.opponentId,
        opponentName: nextGame.opponentName,
        opponentAbbr: nextGame.opponentAbbr,
        opponentLogo: nextGame.opponentLogo,
        isHome: nextGame.isHome,
        stadiumName: nextGame.stadiumName,
        timeDisplay: nextGame.timeDisplay,
        transmission: nextGame.transmission,
        daysUntil,
      }
    : undefined;

  let gamesDef: Array<{
    id: string;
    homeId: number;
    awayId: number;
    time: string;
    stadium: string;
    isOfficial: boolean;
    homeSpIdx?: number;
    awaySpIdx?: number;
  }> = [];

  if (calEvent) {
    // 1. Encuentro Oficial de Leones del Caracas desde el Calendario
    const caracasIsHome = calEvent.isHome;
    const homeTeamId = caracasIsHome ? 695 : calEvent.opponentId;
    const awayTeamId = caracasIsHome ? calEvent.opponentId : 695;

    gamesDef.push({
      id: `cal-caracas-${dateStr}`,
      homeId: homeTeamId,
      awayId: awayTeamId,
      time: calEvent.timeDisplay && !calEvent.isTimePending ? calEvent.timeDisplay : "07:00 PM",
      stadium: calEvent.stadiumName,
      isOfficial: true,
      homeSpIdx: 0,
      awaySpIdx: 0,
    });

    // 2. Emparejar los 6 equipos restantes de la liga para completar los 4 juegos de la jornada
    const ALL_LVBP_IDS = [695, 696, 698, 693, 699, 692, 694, 697];
    const remainingTeams = ALL_LVBP_IDS.filter(
      (id) => id !== homeTeamId && id !== awayTeamId
    );

    const complementaryPairs = [
      { home: remainingTeams[0], away: remainingTeams[1] },
      { home: remainingTeams[2], away: remainingTeams[3] },
      { home: remainingTeams[4], away: remainingTeams[5] },
    ];

    complementaryPairs.forEach((pair, idx) => {
      const stadium = DEFAULT_TEAM_HOME_STADIUM[pair.home] || "Estadio José Bernardo Pérez";
      gamesDef.push({
        id: `game-compl-${idx + 2}`,
        homeId: pair.home,
        awayId: pair.away,
        time: "07:00 PM",
        stadium,
        isOfficial: false,
        homeSpIdx: 0,
        awaySpIdx: 0,
      });
    });
  } else {
    // Cartelera por defecto cuando no hay juego en el calendario (Día de descanso)
    gamesDef = [
      {
        id: "game-1",
        homeId: 695, // Caracas
        awayId: 696, // Magallanes
        time: "07:00 PM",
        stadium: "Estadio Monumental Simón Bolívar",
        isOfficial: false,
        homeSpIdx: 0,
        awaySpIdx: 0,
      },
      {
        id: "game-2",
        homeId: 698, // La Guaira
        awayId: 693, // Lara
        time: "07:00 PM",
        stadium: "Estadio Jorge Luis García Carneiro",
        isOfficial: false,
        homeSpIdx: 0,
        awaySpIdx: 0,
      },
      {
        id: "game-3",
        homeId: 699, // Aragua
        awayId: 692, // Zulia
        time: "07:00 PM",
        stadium: "Estadio José Pérez Colmenares",
        isOfficial: false,
        homeSpIdx: 0,
        awaySpIdx: 0,
      },
      {
        id: "game-4",
        homeId: 694, // Caribes
        awayId: 697, // Bravos
        time: "07:00 PM",
        stadium: "Estadio Alfonso 'Chico' Carrasquel",
        isOfficial: false,
        homeSpIdx: 0,
        awaySpIdx: 0,
      },
    ];
  }

  const projections: GameProjection[] = gamesDef.map((g) => {
    const homeTeam = getTeam(g.homeId);
    const awayTeam = getTeam(g.awayId);
    const park = resolveParkFactor(g.stadium);

    const homePitchers = DEFAULT_STARTING_ROTATIONS[g.homeId] || [];
    const awayPitchers = DEFAULT_STARTING_ROTATIONS[g.awayId] || [];
    const homePitcher = homePitchers[g.homeSpIdx || 0] || {
      id: 9991,
      name: "Abridor Local",
      teamId: g.homeId,
      teamAbbr: homeTeam.abbreviation,
      throws: "R",
      era: 4.10,
      fip: 4.05,
      whip: 1.30,
      k9: 7.2,
      bb9: 3.0,
      inningsPitched: 40.0,
    };
    const awayPitcher = awayPitchers[g.awaySpIdx || 0] || {
      id: 9992,
      name: "Abridor Visitante",
      teamId: g.awayId,
      teamAbbr: awayTeam.abbreviation,
      throws: "R",
      era: 4.25,
      fip: 4.20,
      whip: 1.35,
      k9: 7.0,
      bb9: 3.1,
      inningsPitched: 40.0,
    };

    const model = projectMatchup(g.homeId, g.awayId, homePitcher, awayPitcher, park);
    const oddsByBook = generateInitialOdds(model);
    const bestOdds = extractBestOdds(oddsByBook);
    const assessments = evaluateAssessments(
      model,
      oddsByBook,
      homeTeam.abbreviation,
      awayTeam.abbreviation,
      homePitcher,
      awayPitcher,
      park
    );

    const topPick = assessments.find((a) => a.rating === "mispriced") || assessments[0] || undefined;

    return {
      gameId: g.id,
      gameDate: dateStr,
      gameTime: g.time,
      isToday: true,
      status: "scheduled",
      isOfficialCalendarGame: g.isOfficial,
      homeTeamId: g.homeId,
      homeTeamName: homeTeam.name,
      homeTeamAbbr: homeTeam.abbreviation,
      homeTeamLogo: homeTeam.logoUrl,
      awayTeamId: g.awayId,
      awayTeamName: awayTeam.name,
      awayTeamAbbr: awayTeam.abbreviation,
      awayTeamLogo: awayTeam.logoUrl,
      stadium: park.stadiumName,
      city: park.city,
      parkFactor: park,
      homePitcher,
      awayPitcher,
      oddsByBook,
      bestOdds,
      model,
      assessments,
      topPick,
    };
  });

  const allAssessments = projections.flatMap((p) => p.assessments);
  const mispricedAlerts = allAssessments.filter((a) => a.rating === "mispriced");
  const topPicks = allAssessments.filter((a) => a.evPercent >= 5.0).slice(0, 4);
  const hasLiveMarketOdds = projections.some((p) => p.bestOdds.hasMarketOdds);

  return {
    date: dateStr,
    season: 2026,
    totalGames: projections.length,
    projections,
    topPicks,
    mispricedAlerts,
    hasLiveMarketOdds,
    isCalendarScheduled: !!calEvent,
    calendarEventSummary: calEvent?.summary,
    isRestDay: !calEvent,
    nextScheduledGame: nextScheduledGameSummary,
  };
}
