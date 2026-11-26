import assert from "node:assert/strict";
import { BattingStats, PitchingStats } from "../../types/sports";
import {
  buildBatterMatchupCardData,
  buildPitcherMatchupCardData,
  compareBatters,
  comparePitchers,
} from "../matchup-engine";

function makeBatter(
  overrides: Partial<BattingStats> & { playerId: number; playerName: string }
): BattingStats {
  return {
    playerAvatar: "",
    teamId: 695,
    teamName: "Leones del Caracas",
    teamAbbr: "CAR",
    teamLogo: "/assets/logo.png",
    games: 40,
    atBats: 150,
    plateAppearances: 175,
    runs: 25,
    hits: 45,
    doubles: 9,
    triples: 1,
    homeRuns: 6,
    rbi: 28,
    walks: 20,
    strikeouts: 30,
    stolenBases: 4,
    caughtStealing: 1,
    avg: 0.3,
    obp: 0.383,
    slg: 0.493,
    ops: 0.876,
    iso: 0.193,
    babip: 0.333,
    ...overrides,
  };
}

function makePitcher(
  overrides: Partial<PitchingStats> & { playerId: number; playerName: string }
): PitchingStats {
  return {
    playerAvatar: "",
    teamId: 695,
    teamName: "Leones del Caracas",
    teamAbbr: "CAR",
    teamLogo: "/assets/logo.png",
    games: 12,
    gamesStarted: 12,
    inningsPitched: 60,
    inningsDisplay: "60.0",
    hits: 50,
    runs: 22,
    earnedRuns: 20,
    walks: 15,
    strikeouts: 55,
    homeRuns: 4,
    era: 3.0,
    whip: 1.08,
    kPer9: 8.25,
    bbPer9: 2.25,
    kToBb: 3.67,
    saves: 0,
    wins: 5,
    losses: 2,
    ...overrides,
  };
}

function assertNoInvalidNumericStrings(rows: { label: string; val1: string; val2: string }[]) {
  for (const r of rows) {
    assert.ok(!r.val1.includes("NaN") && !r.val1.includes("Infinity"), `${r.label} val1 inválido: ${r.val1}`);
    assert.ok(!r.val2.includes("NaN") && !r.val2.includes("Infinity"), `${r.label} val2 inválido: ${r.val2}`);
  }
}

// 1. Tarjeta de bateadores: 18 filas, secciones, formatos, direcciones (K% menor gana) y Stats+ oficiales
{
  const b1 = makeBatter({
    playerId: 101,
    playerName: "Harold Castro",
    teamAbbr: "CAR",
    games: 50,
    atBats: 180,
    plateAppearances: 200,
    hits: 62,
    doubles: 12,
    homeRuns: 8,
    rbi: 35,
    runs: 30,
    stolenBases: 5,
    walks: 18,
    strikeouts: 22, // 11.0% K%
    avg: 0.344,
    obp: 0.405,
    slg: 0.556,
    ops: 0.961,
    iso: 0.212,
    woba: 0.415,
    wrcPlus: 155,
    opsPlus: 158,
  });

  const b2 = makeBatter({
    playerId: 102,
    playerName: "Renato Núñez",
    teamName: "Navegantes del Magallanes",
    teamAbbr: "MAG",
    games: 52,
    atBats: 190,
    plateAppearances: 220,
    hits: 57,
    doubles: 10,
    homeRuns: 15,
    rbi: 44,
    runs: 32,
    stolenBases: 1,
    walks: 28,
    strikeouts: 55, // 25.0% K%
    avg: 0.3,
    obp: 0.391,
    slg: 0.632,
    ops: 1.023,
    iso: 0.332,
    woba: 0.432,
    wrcPlus: 168,
    opsPlus: 172,
  });

  const card = buildBatterMatchupCardData(
    b1,
    b2,
    { seasonLabel: "2025-26", phaseLabel: "Temporada Regular" },
    { seasonLabel: "2026-27", phaseLabel: "Round Robin" }
  );

  assert.equal(card.compareType, "Bateadores");
  assert.equal(card.footerNote, "100 = Promedio LVBP");
  assert.equal(card.player1.seasonLabel, "2025-26");
  assert.equal(card.player2.phaseLabel, "Round Robin");
  assert.equal(card.sections.length, 2);
  assert.equal(card.sections[0].title, "Estadísticas Generales");
  assert.equal(card.sections[1].title, "Métricas Avanzadas e Índices (+)");

  assert.deepEqual(
    card.sections[0].rows.map((r) => r.label),
    ["JJ", "AP", "H", "2B", "HR", "CI", "CA", "BR", "AVG", "OBP", "SLG", "OPS"]
  );
  assert.deepEqual(
    card.sections[1].rows.map((r) => r.label),
    ["wRC+", "OPS+", "wOBA", "ISO", "BB%", "K%"]
  );

  const allRows = [...card.sections[0].rows, ...card.sections[1].rows];
  assert.equal(allRows.length, 18);
  assertNoInvalidNumericStrings(allRows);

  const byLabel = Object.fromEntries(allRows.map((r) => [r.label, r]));
  assert.equal(byLabel["AVG"].val1, ".344");
  assert.equal(byLabel["OPS"].val2, "1.023");
  assert.equal(byLabel["OPS"].winner, "p2");
  assert.equal(byLabel["wRC+"].val1, "155");
  assert.equal(byLabel["wRC+"].val2, "168");
  assert.equal(byLabel["wRC+"].winner, "p2");
  assert.equal(byLabel["OPS+"].val1, "158");
  assert.equal(byLabel["OPS+"].winner, "p2");
  assert.equal(byLabel["wOBA"].val1, ".415");
  assert.equal(byLabel["BB%"].val1, "9.0%");
  assert.equal(byLabel["BB%"].val2, "12.7%");
  assert.equal(byLabel["BB%"].winner, "p2");
  // En bateo, menor K% gana
  assert.equal(byLabel["K%"].val1, "11.0%");
  assert.equal(byLabel["K%"].val2, "25.0%");
  assert.equal(byLabel["K%"].winner, "p1");

  assert.equal(card.p1Wins + card.p2Wins + card.ties, 18);
}

// 2. Bateadores: OPS+ faltante o <= 0 muestra "--" y "tie", y 0 AP no produce NaN/Infinity
{
  const bZero = makeBatter({
    playerId: 103,
    playerName: "Jugador Cero",
    games: 1,
    atBats: 0,
    plateAppearances: undefined,
    pa: undefined,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    stolenBases: 0,
    walks: 0,
    strikeouts: 0,
    avg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
    iso: 0,
    opsPlus: 0,
  });
  const bNormal = makeBatter({
    playerId: 104,
    playerName: "Jugador Normal",
    opsPlus: 120,
  });

  const card = buildBatterMatchupCardData(
    bZero,
    bNormal,
    { seasonLabel: "2026-27", phaseLabel: "Temporada Regular" },
    { seasonLabel: "2026-27", phaseLabel: "Temporada Regular" }
  );

  const allRows = [...card.sections[0].rows, ...card.sections[1].rows];
  assertNoInvalidNumericStrings(allRows);
  const byLabel = Object.fromEntries(allRows.map((r) => [r.label, r]));
  assert.equal(byLabel["AP"].val1, "0");
  assert.equal(byLabel["BB%"].val1, "0.0%");
  assert.equal(byLabel["K%"].val1, "0.0%");
  assert.equal(byLabel["OPS+"].val1, "--");
  assert.equal(byLabel["OPS+"].val2, "120");
  assert.equal(byLabel["OPS+"].winner, "tie");
}

// 3. Tarjeta de lanzadores: 17 filas, secciones, direcciones, G-P y Stats+ oficiales
{
  const p1 = makePitcher({
    playerId: 201,
    playerName: "Jesús Vargas",
    games: 13,
    gamesStarted: 13,
    inningsPitched: 52.667,
    inningsDisplay: "52.2",
    wins: 5,
    losses: 1, // pct = 0.833
    saves: 0,
    era: 2.39,
    whip: 1.04,
    strikeouts: 48,
    walks: 12,
    homeRuns: 3,
    hits: 43,
    hbp: 2,
    kPer9: 8.2,
    fip: 2.85,
    eraPlus: 162,
    fipPlus: 138,
    whipPlus: 131,
  });

  const p2 = makePitcher({
    playerId: 202,
    playerName: "Junior Guerra",
    teamName: "Navegantes del Magallanes",
    teamAbbr: "MAG",
    games: 13,
    gamesStarted: 13,
    inningsPitched: 65,
    inningsDisplay: "65.0",
    wins: 6,
    losses: 2, // pct = 0.750
    saves: 0,
    era: 2.77,
    whip: 1.12,
    strikeouts: 70,
    walks: 20,
    homeRuns: 6,
    hits: 53,
    hbp: 3,
    kPer9: 9.69,
    fip: 3.1,
    eraPlus: 140,
    fipPlus: 125,
    whipPlus: 122,
  });

  const card = buildPitcherMatchupCardData(
    p1,
    p2,
    { seasonLabel: "2025-26", phaseLabel: "Temporada Regular" },
    { seasonLabel: "2025-26", phaseLabel: "Temporada Regular" }
  );

  assert.equal(card.compareType, "Lanzadores");
  assert.equal(card.footerNote, "100 = Promedio LVBP");
  assert.equal(card.sections.length, 2);
  assert.equal(card.sections[0].title, "Estadísticas Generales");
  assert.equal(card.sections[1].title, "Dominio y Avanzadas");

  assert.deepEqual(
    card.sections[0].rows.map((r) => r.label),
    ["JJ", "JI", "IP", "G-P", "SV", "ERA", "WHIP", "SO", "BB", "HR"]
  );
  assert.deepEqual(
    card.sections[1].rows.map((r) => r.label),
    ["ERA+", "FIP", "FIP+", "WHIP+", "K/9", "K%", "BB%"]
  );

  const allRows = [...card.sections[0].rows, ...card.sections[1].rows];
  assert.equal(allRows.length, 17);
  assertNoInvalidNumericStrings(allRows);

  const byLabel = Object.fromEntries(allRows.map((r) => [r.label, r]));
  assert.equal(byLabel["JJ"].winner, "tie");
  assert.equal(byLabel["IP"].val1, "52.2");
  assert.equal(byLabel["IP"].winner, "p2");
  assert.equal(byLabel["G-P"].val1, "5-1");
  assert.equal(byLabel["G-P"].val2, "6-2");
  assert.equal(byLabel["G-P"].winner, "p1");
  assert.equal(byLabel["ERA"].winner, "p1");
  assert.equal(byLabel["WHIP"].winner, "p1");
  assert.equal(byLabel["SO"].winner, "p2");
  assert.equal(byLabel["BB"].winner, "p1");
  assert.equal(byLabel["HR"].winner, "p1");
  assert.equal(byLabel["ERA+"].winner, "p1");
  assert.equal(byLabel["FIP"].val1, "2.85");
  assert.equal(byLabel["FIP"].winner, "p1");
  assert.equal(byLabel["FIP+"].winner, "p1");
  assert.equal(byLabel["WHIP+"].winner, "p1");
  assert.equal(byLabel["K/9"].winner, "p2");
  // En pitcheo, mayor K% gana y menor BB% gana
  assert.equal(byLabel["K%"].winner, "p2");
  assert.equal(byLabel["BB%"].winner, "p1");

  assert.equal(card.p1Wins + card.p2Wins + card.ties, 17);
}

// 4. Lanzadores: desempate de G-P, 0 IP sin NaN/Infinity y Stats+ faltantes
{
  const pA = makePitcher({
    playerId: 203,
    playerName: "Relevista A",
    wins: 4,
    losses: 2, // .667
    inningsPitched: 0,
    inningsDisplay: "0.0",
    hits: 0,
    walks: 0,
    strikeouts: 0,
    homeRuns: 0,
    era: 0,
    whip: 0,
    kPer9: 0,
    eraPlus: undefined,
    fipPlus: 0,
    whipPlus: 110,
  });

  const pB = makePitcher({
    playerId: 204,
    playerName: "Relevista B",
    wins: 2,
    losses: 1, // .667 pero menos victorias
    eraPlus: 120,
    fipPlus: 115,
    whipPlus: 105,
  });

  const card1 = buildPitcherMatchupCardData(
    pA,
    pB,
    { seasonLabel: "2026-27", phaseLabel: "Temporada Regular" },
    { seasonLabel: "2026-27", phaseLabel: "Temporada Regular" }
  );
  const allRows = [...card1.sections[0].rows, ...card1.sections[1].rows];
  assertNoInvalidNumericStrings(allRows);
  const byLabel = Object.fromEntries(allRows.map((r) => [r.label, r]));
  assert.equal(byLabel["G-P"].winner, "p1"); // 4-2 supera a 2-1
  assert.equal(byLabel["K%"].val1, "0.0%");
  assert.equal(byLabel["BB%"].val1, "0.0%");
  assert.equal(byLabel["ERA+"].val1, "--");
  assert.equal(byLabel["ERA+"].winner, "tie");
  assert.equal(byLabel["FIP+"].val1, "--");
  assert.equal(byLabel["FIP+"].winner, "tie");
  assert.equal(byLabel["WHIP+"].winner, "p1");

  // 0-0 vs 0-2 (mismo .000 pct y 0 victorias -> menos derrotas gana)
  const pC = makePitcher({ playerId: 205, playerName: "C", wins: 0, losses: 0 });
  const pD = makePitcher({ playerId: 206, playerName: "D", wins: 0, losses: 2 });
  const card2 = buildPitcherMatchupCardData(
    pC,
    pD,
    { seasonLabel: "2026-27", phaseLabel: "Temporada Regular" },
    { seasonLabel: "2026-27", phaseLabel: "Temporada Regular" }
  );
  const gpRow = card2.sections[0].rows.find((r) => r.label === "G-P");
  assert.equal(gpRow?.winner, "p1");
}

// 5. compareBatters y comparePitchers priorizan woba/wrcPlus/fip oficiales (incluso mismo jugador entre temporadas)
{
  const batterS1 = makeBatter({
    playerId: 500,
    playerName: "Oswaldo Arcia",
    woba: 0.45,
    wrcPlus: 185,
  });
  const batterS2 = makeBatter({
    playerId: 500,
    playerName: "Oswaldo Arcia",
    woba: 0.31,
    wrcPlus: 92,
  });
  const cmpBat = compareBatters(batterS1, batterS2, [batterS1], [batterS2]);
  const wobaAxis = cmpBat.radarAxes.find((a) => a.key === "woba");
  const wrcAxis = cmpBat.radarAxes.find((a) => a.key === "wrc_plus");
  assert.equal(wobaAxis?.val1, ".450");
  assert.equal(wobaAxis?.val2, ".310");
  assert.equal(wrcAxis?.val1, "185");
  assert.equal(wrcAxis?.val2, "92");

  const pitcherS1 = makePitcher({
    playerId: 600,
    playerName: "Jhoulys Chacín",
    fip: 2.15,
  });
  const pitcherS2 = makePitcher({
    playerId: 600,
    playerName: "Jhoulys Chacín",
    fip: 4.45,
  });
  const cmpPit = comparePitchers(pitcherS1, pitcherS2, [pitcherS1], [pitcherS2]);
  const fipAxis = cmpPit.radarAxes.find((a) => a.key === "fip");
  assert.equal(fipAxis?.val1, "2.15");
  assert.equal(fipAxis?.val2, "4.45");
}

console.log("matchup-card.test.ts: ALL PASSED");
