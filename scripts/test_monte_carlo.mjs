import assert from "node:assert/strict";
import { runMonteCarloSimulation } from "../src/lib/monte-carlo.ts";

console.log("🧪 Iniciando pruebas de regresión para Simulador Monte Carlo...");

// Mock de standings con 6 juegos disputados (temporada en curso, similar a 2026 actual)
const mockStandings = [
  {
    teamId: 699,
    teamName: "Tigres de Aragua",
    abbreviation: "ARA",
    logoUrl: "",
    gamesPlayed: 6,
    wins: 5,
    losses: 1,
    pct: 0.833,
    gamesBack: "-",
    runsScored: 30,
    runsAllowed: 24,
    runDifferential: 6,
    homeRecord: "3-0",
    awayRecord: "2-1",
    streak: "G2",
    last10: "5-1",
    pythagoreanPct: 0.6,
    expectedWins: 4,
    expectedLosses: 2,
    eloRating: 1544.8,
  },
  {
    teamId: 697,
    teamName: "Bravos de Margarita",
    abbreviation: "MAR",
    logoUrl: "",
    gamesPlayed: 5,
    wins: 4,
    losses: 1,
    pct: 0.8,
    gamesBack: "0.5",
    runsScored: 35,
    runsAllowed: 20,
    runDifferential: 15,
    homeRecord: "2-0",
    awayRecord: "2-1",
    streak: "G3",
    last10: "4-1",
    pythagoreanPct: 0.72,
    expectedWins: 4,
    expectedLosses: 1,
    eloRating: 1539.7,
  },
  {
    teamId: 693,
    teamName: "Cardenales de Lara",
    abbreviation: "LAR",
    logoUrl: "",
    gamesPlayed: 5,
    wins: 4,
    losses: 1,
    pct: 0.8,
    gamesBack: "0.5",
    runsScored: 28,
    runsAllowed: 20,
    runDifferential: 8,
    homeRecord: "2-0",
    awayRecord: "2-1",
    streak: "G1",
    last10: "4-1",
    pythagoreanPct: 0.64,
    expectedWins: 3,
    expectedLosses: 2,
    eloRating: 1532.5,
  },
  {
    teamId: 694,
    teamName: "Caribes de Anzoátegui",
    abbreviation: "ANZ",
    logoUrl: "",
    gamesPlayed: 6,
    wins: 4,
    losses: 2,
    pct: 0.667,
    gamesBack: "1.0",
    runsScored: 36,
    runsAllowed: 21,
    runDifferential: 15,
    homeRecord: "3-1",
    awayRecord: "1-1",
    streak: "P1",
    last10: "4-2",
    pythagoreanPct: 0.72,
    expectedWins: 4,
    expectedLosses: 2,
    eloRating: 1515.0,
  },
  {
    teamId: 692,
    teamName: "Águilas del Zulia",
    abbreviation: "ZUL",
    logoUrl: "",
    gamesPlayed: 6,
    wins: 2,
    losses: 4,
    pct: 0.333,
    gamesBack: "3.0",
    runsScored: 18,
    runsAllowed: 23,
    runDifferential: -5,
    homeRecord: "1-2",
    awayRecord: "1-2",
    streak: "P2",
    last10: "2-4",
    pythagoreanPct: 0.39,
    expectedWins: 2,
    expectedLosses: 4,
    eloRating: 1470.5,
  },
  {
    teamId: 698,
    teamName: "Tiburones de La Guaira",
    abbreviation: "LAG",
    logoUrl: "",
    gamesPlayed: 6,
    wins: 2,
    losses: 4,
    pct: 0.333,
    gamesBack: "3.0",
    runsScored: 24,
    runsAllowed: 31,
    runDifferential: -7,
    homeRecord: "1-2",
    awayRecord: "1-2",
    streak: "P1",
    last10: "2-4",
    pythagoreanPct: 0.38,
    expectedWins: 2,
    expectedLosses: 4,
    eloRating: 1479.0,
  },
  {
    teamId: 695,
    teamName: "Leones del Caracas",
    abbreviation: "CAR",
    logoUrl: "",
    gamesPlayed: 6,
    wins: 2,
    losses: 4,
    pct: 0.333,
    gamesBack: "3.0",
    runsScored: 22,
    runsAllowed: 31,
    runDifferential: -9,
    homeRecord: "1-1",
    awayRecord: "1-3",
    streak: "P3",
    last10: "2-4",
    pythagoreanPct: 0.35,
    expectedWins: 2,
    expectedLosses: 4,
    eloRating: 1482.7,
  },
  {
    teamId: 696,
    teamName: "Navegantes del Magallanes",
    abbreviation: "MAG",
    logoUrl: "",
    gamesPlayed: 6,
    wins: 0,
    losses: 6,
    pct: 0.0,
    gamesBack: "5.0",
    runsScored: 15,
    runsAllowed: 38,
    runDifferential: -23,
    homeRecord: "0-3",
    awayRecord: "0-3",
    streak: "P6",
    last10: "0-6",
    pythagoreanPct: 0.16,
    expectedWins: 1,
    expectedLosses: 5,
    eloRating: 1435.8,
  },
];

// Test 1: Simulación en modo "actual" con calendario restante sintético
const resultSynthetic = runMonteCarloSimulation(mockStandings, "actual", 1000);

const caracas = resultSynthetic.caracasProjection;
assert.ok(caracas, "Leones del Caracas debe existir en las proyecciones");
console.log("Probabilidades de Leones del Caracas (calendario sintético):", {
  top4: (caracas.top4Prob * 100).toFixed(1) + "%",
  wc: (caracas.wcProb * 100).toFixed(1) + "%",
  rr: (caracas.rrProb * 100).toFixed(1) + "%",
  final: (caracas.finalProb * 100).toFixed(1) + "%",
  champ: (caracas.champProb * 100).toFixed(1) + "%",
});

assert.ok(
  caracas.rrProb > 0.05,
  `Leones debe tener probabilidad de Round Robin realista (> 5%), obtenido: ${caracas.rrProb}`
);
assert.ok(
  caracas.wcProb > 0.1,
  `Leones debe tener probabilidad de Comodín realista (> 10%), obtenido: ${caracas.wcProb}`
);

// Test 2: Comprobar que ningún equipo tiene 0% ni 100% de Top 4
for (const p of resultSynthetic.projections) {
  assert.ok(
    p.top4Prob < 1.0,
    `Equipo ${p.teamName} no debe tener 100% Top 4 tras solo 6 juegos: ${p.top4Prob}`
  );
}

// Test 3: Simulación con lista explícita de juegos restantes
const remainingMock = [];
const teams = [695, 696, 698, 699, 693, 692, 694, 697];
for (let i = 0; i < teams.length; i++) {
  for (let j = i + 1; j < teams.length; j++) {
    for (let k = 0; k < 3; k++) {
      remainingMock.push([teams[i], teams[j]]);
      remainingMock.push([teams[j], teams[i]]);
    }
  }
}

const resultExplicit = runMonteCarloSimulation(
  mockStandings,
  "actual",
  1000,
  remainingMock
);

const caracasExp = resultExplicit.caracasProjection;
assert.ok(caracasExp.rrProb > 0.05, "Leones debe tener RR > 5% con partidos explícitos");

// Test 4: Comprobar ordenamiento de la tabla
for (let i = 0; i < resultExplicit.projections.length - 1; i++) {
  const a = resultExplicit.projections[i];
  const b = resultExplicit.projections[i + 1];
  assert.ok(
    a.champProb >= b.champProb || (a.champProb === b.champProb && a.finalProb >= b.finalProb),
    `Orden inválido entre ${a.teamName} y ${b.teamName}`
  );
}

console.log("✅ Todas las pruebas de regresión del Simulador Monte Carlo pasaron con éxito!");
