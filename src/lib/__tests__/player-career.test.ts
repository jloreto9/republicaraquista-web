import assert from "node:assert/strict";
import { BattingStats } from "@/types/sports";
import { PlayerCareerPostseasonEntry } from "@/types/player-splits";
import {
  clearPlayerCareerCache,
  getPlayerLvbpCareer,
  mergePostseasonCareerSeasons,
  mergeRegularCareerSeasons,
  normalizeMlbCareerBatting,
  normalizeMlbCareerPitching,
  outsToInningsDisplay,
  parseInningsStringToOuts,
} from "../player-career-service";
import {
  countDistinctCareerSeasons,
  extractHistoricalCareerPayload,
} from "../player-career-cache";

function makeMockBattingStats(overrides: Partial<BattingStats> = {}): BattingStats {
  return {
    playerId: 541600,
    playerName: "Wilfredo Tovar",
    playerAvatar: "",
    teamId: 695,
    teamName: "Leones del Caracas",
    teamAbbr: "CAR",
    teamLogo: "",
    games: 40,
    atBats: 150,
    plateAppearances: 170,
    pa: 170,
    runs: 22,
    hits: 45,
    doubles: 8,
    triples: 1,
    homeRuns: 2,
    rbi: 18,
    walks: 15,
    strikeouts: 20,
    stolenBases: 4,
    caughtStealing: 1,
    avg: 0.3,
    obp: 0.365,
    slg: 0.407,
    ops: 0.772,
    iso: 0.107,
    babip: 0.333,
    ...overrides,
  };
}

async function runTests() {
  console.log("=== Ejecutando suite de pruebas: Historial de por vida LVBP (player-career) ===");

  // 1. Filtro estricto LVBP (leagueId=135)
  const mixedLeagueBattingSplits = [
    {
      season: "2024",
      league: { id: 135, name: "Venezuelan Winter League" },
      team: { id: 695, name: "Leones del Caracas" },
      player: { id: 541600, fullName: "Wilfredo Tovar" },
      stat: { gamesPlayed: 45, atBats: 160, hits: 50, baseOnBalls: 14, strikeOuts: 18 },
    },
    {
      season: "2024",
      league: { id: 162, name: "Caribbean Series" },
      team: { id: 695, name: "Leones del Caracas" },
      stat: { gamesPlayed: 6, atBats: 22, hits: 7 },
    },
    {
      season: "2023",
      league: { id: 131, name: "LIDOM" },
      team: { id: 670, name: "Tigres del Licey" },
      stat: { gamesPlayed: 20, atBats: 70, hits: 20 },
    },
    {
      season: "2022",
      league: { id: 119, name: "Arizona Fall League" },
      team: { id: 400, name: "Mesa Solar Sox" },
      stat: { gamesPlayed: 15, atBats: 50, hits: 14 },
    },
    {
      season: "2019",
      league: { id: 103, name: "American League" },
      team: { id: 142, name: "Minnesota Twins" },
      stat: { gamesPlayed: 31, atBats: 83, hits: 16 },
    },
  ];

  const filteredBat = normalizeMlbCareerBatting(mixedLeagueBattingSplits, 541600);
  assert.equal(filteredBat.length, 1, "Solo los splits con leagueId=135 (LVBP) deben sobrevivir");
  assert.equal(filteredBat[0].season, 2024);
  assert.equal(filteredBat[0].stats.teamAbbr, "CAR");

  const mixedLeaguePitchingSplits = [
    {
      season: "2024",
      league: { id: 135, name: "LVBP" },
      team: { id: 696, name: "Navegantes del Magallanes" },
      stat: { gamesPlayed: 11, gamesStarted: 11, inningsPitched: "54.0", earnedRuns: 18, hits: 48, baseOnBalls: 12, strikeOuts: 40 },
    },
    {
      season: "2024",
      league: { id: 162, name: "Serie del Caribe" },
      team: { id: 696, name: "Venezuela" },
      stat: { gamesPlayed: 2, gamesStarted: 2, inningsPitched: "10.0", earnedRuns: 3 },
    },
    {
      season: "2023",
      league: { id: 131, name: "LIDOM" },
      team: { id: 671, name: "Estrellas Orientales" },
      stat: { gamesPlayed: 5, gamesStarted: 5, inningsPitched: "22.0", earnedRuns: 8 },
    },
    {
      season: "2021",
      league: { id: 103, name: "MLB" },
      team: { id: 117, name: "Astros" },
      stat: { gamesPlayed: 3, inningsPitched: "4.0", earnedRuns: 2 },
    },
  ];
  const filteredPit = normalizeMlbCareerPitching(mixedLeaguePitchingSplits, 612797);
  assert.equal(filteredPit.length, 1, "Solo el split de pitcheo con leagueId=135 debe sobrevivir");
  assert.equal(filteredPit[0].season, 2024);
  assert.equal(filteredPit[0].stats.teamAbbr, "MAG");

  // 2. Temporada multi-equipo (2EQ + sub-filas, cero doble conteo)
  const tovar2013TeamSplits = [
    {
      season: "2013",
      league: { id: 135 },
      team: { id: 696, name: "Navegantes del Magallanes" },
      player: { id: 541600, fullName: "Wilfredo Tovar" },
      stat: { gamesPlayed: 15, atBats: 53, hits: 13, doubles: 2, triples: 0, homeRuns: 0, baseOnBalls: 4, strikeOuts: 6 },
    },
    {
      season: "2013",
      league: { id: 135 },
      team: { id: 697, name: "Bravos de Margarita" },
      player: { id: 541600, fullName: "Wilfredo Tovar" },
      stat: { gamesPlayed: 6, atBats: 21, hits: 7, doubles: 1, triples: 0, homeRuns: 0, baseOnBalls: 2, strikeOuts: 3 },
    },
  ];
  const tovar2013CombinedSplit = {
    season: "2013",
    league: { id: 135 },
    player: { id: 541600, fullName: "Wilfredo Tovar" },
    stat: { gamesPlayed: 21, atBats: 74, hits: 20, doubles: 3, triples: 0, homeRuns: 0, baseOnBalls: 6, strikeOuts: 9 },
  };

  // 2a. Con fila combinada provista por MLB API
  const withCombined = normalizeMlbCareerBatting(
    [tovar2013CombinedSplit, ...tovar2013TeamSplits],
    541600
  );
  assert.equal(withCombined.length, 3, "Debe emitir fila combinada 2EQ + 2 sub-filas de equipo");
  assert.equal(withCombined[0].isCombined, true);
  assert.equal(withCombined[0].isTeamSplit, false);
  assert.equal(withCombined[0].stats.teamAbbr, "2EQ");
  assert.equal(withCombined[0].stats.games, 21);

  assert.equal(withCombined[1].isTeamSplit, true);
  assert.equal(withCombined[1].stats.teamAbbr, "MAG");
  assert.equal(withCombined[1].stats.games, 15);

  assert.equal(withCombined[2].isTeamSplit, true);
  assert.equal(withCombined[2].stats.teamAbbr, "MAR");
  assert.equal(withCombined[2].stats.games, 6);

  const countableWithCombined = withCombined.filter((e) => !e.isTeamSplit);
  assert.equal(countableWithCombined.length, 1);
  assert.equal(countableWithCombined.reduce((acc, e) => acc + e.stats.games, 0), 21);
  assert.equal(countableWithCombined.reduce((acc, e) => acc + e.stats.atBats, 0), 74);
  assert.equal(countableWithCombined.reduce((acc, e) => acc + e.stats.hits, 0), 20);

  // 2b. Sin fila combinada de MLB API (fallback suma idéntico)
  const withoutCombined = normalizeMlbCareerBatting(tovar2013TeamSplits, 541600);
  assert.equal(withoutCombined.length, 3);
  assert.equal(withoutCombined[0].isCombined, true);
  assert.equal(withoutCombined[0].isTeamSplit, false);
  assert.equal(withoutCombined[0].stats.teamAbbr, "2EQ");
  assert.equal(withoutCombined[0].stats.games, 21);
  assert.equal(withoutCombined[0].stats.atBats, 74);
  assert.equal(withoutCombined[0].stats.hits, 20);
  assert.equal(withoutCombined[1].isTeamSplit, true);
  assert.equal(withoutCombined[1].stats.teamAbbr, "MAG");
  assert.equal(withoutCombined[2].isTeamSplit, true);
  assert.equal(withoutCombined[2].stats.teamAbbr, "MAR");

  const countableFallback = withoutCombined.filter((e) => !e.isTeamSplit);
  assert.equal(countableFallback.reduce((acc, e) => acc + e.stats.games, 0), 21);
  assert.equal(countableFallback.reduce((acc, e) => acc + e.stats.atBats, 0), 74);
  assert.equal(countableFallback.reduce((acc, e) => acc + e.stats.hits, 0), 20);

  // 3. Merge Supabase + MLB API (Regular y Postemporada)
  const supabaseRegular = [
    { season: 2026, stats: makeMockBattingStats({ woba: 0.365, wrcPlus: 128 }) },
    { season: 2025, stats: makeMockBattingStats({ woba: 0.352, wrcPlus: 119 }) },
  ];
  const mlbRegular = [
    { season: 2026, stats: makeMockBattingStats({ woba: undefined, wrcPlus: undefined }), source: "mlb_api" as const },
    { season: 2025, stats: makeMockBattingStats({ woba: undefined, wrcPlus: undefined }), source: "mlb_api" as const },
    { season: 2024, stats: makeMockBattingStats({ games: 48 }), source: "mlb_api" as const },
    { season: 2013, stats: makeMockBattingStats({ games: 21, teamAbbr: "2EQ" }), source: "mlb_api" as const, isCombined: true, isTeamSplit: false },
    { season: 2013, stats: makeMockBattingStats({ games: 15, teamAbbr: "MAG" }), source: "mlb_api" as const, isCombined: false, isTeamSplit: true },
    { season: 2013, stats: makeMockBattingStats({ games: 6, teamAbbr: "MAR" }), source: "mlb_api" as const, isCombined: false, isTeamSplit: true },
  ];

  const mergedRegular = mergeRegularCareerSeasons(supabaseRegular, mlbRegular);
  assert.deepEqual(
    mergedRegular.map((e) => e.season),
    [2026, 2025, 2024, 2013, 2013, 2013],
    "Debe ordenarse descendente por temporada y preservar orden 2EQ -> sub-equipos sin duplicar 2026/2025"
  );
  assert.equal(mergedRegular[0].source, "supabase");
  assert.equal(mergedRegular[0].stats.wrcPlus, 128);
  assert.equal(mergedRegular[0].stats.woba, 0.365);
  assert.equal(mergedRegular[1].source, "supabase");
  assert.equal(mergedRegular[1].stats.wrcPlus, 119);
  assert.equal(mergedRegular[2].source, "mlb_api");
  assert.equal(mergedRegular[3].source, "mlb_api");
  assert.equal(mergedRegular[3].isCombined, true);

  const supabasePostseason = [
    { season: 2025, phase: "F" as const, phaseLabel: "Final", stats: makeMockBattingStats({ games: 5 }) },
    { season: 2025, phase: "L" as const, phaseLabel: "Round Robin", stats: makeMockBattingStats({ games: 16 }) },
  ];
  const mlbPostseason: PlayerCareerPostseasonEntry<BattingStats>[] = [
    { season: 2025, phase: "P", phaseLabel: "Postemp.", stats: makeMockBattingStats({ games: 21 }), source: "mlb_api" },
    { season: 2023, phase: "P", phaseLabel: "Postemp.", stats: makeMockBattingStats({ games: 12 }), source: "mlb_api" },
    { season: 2018, phase: "P", phaseLabel: "Postemp.", stats: makeMockBattingStats({ games: 9 }), source: "mlb_api" },
  ];

  const mergedPostseason = mergePostseasonCareerSeasons(supabasePostseason, mlbPostseason);
  assert.deepEqual(
    mergedPostseason.map((e) => `${e.season}-${e.phase}`),
    ["2025-F", "2025-L", "2023-P", "2018-P"],
    "Debe preservar L/F de Supabase para 2025 sin duplicar con MLB, y agregar P (<2025) de MLB API"
  );
  assert.equal(mergedPostseason[0].source, "supabase");
  assert.equal(mergedPostseason[1].source, "supabase");
  assert.equal(mergedPostseason[2].source, "mlb_api");
  assert.equal(mergedPostseason[2].phaseLabel, "Postemp.");

  // 4. Aritmética exacta de outs en pitcheo: "27.1" + "26.2" = 162 outs = "54.0" IP
  const outs1 = parseInningsStringToOuts("27.1");
  const outs2 = parseInningsStringToOuts("26.2");
  assert.equal(outs1 + outs2, 162);
  assert.equal(outsToInningsDisplay(outs1 + outs2), "54.0");

  const combinedPitching = normalizeMlbCareerPitching(
    [
      {
        season: "2022",
        league: { id: 135 },
        team: { id: 696, name: "Navegantes del Magallanes" },
        stat: { gamesPlayed: 6, gamesStarted: 6, inningsPitched: "27.1", earnedRuns: 9, hits: 24, baseOnBalls: 7, strikeOuts: 22 },
      },
      {
        season: "2022",
        league: { id: 135 },
        team: { id: 695, name: "Leones del Caracas" },
        stat: { gamesPlayed: 6, gamesStarted: 6, inningsPitched: "26.2", earnedRuns: 9, hits: 24, baseOnBalls: 7, strikeOuts: 23 },
      },
    ],
    612797
  );
  assert.equal(combinedPitching[0].isCombined, true);
  assert.equal(combinedPitching[0].stats.inningsDisplay, "54.0");
  assert.equal(combinedPitching[0].stats.inningsPitched, 54);
  assert.equal(combinedPitching[0].stats.era, 3.0);

  // 4b. Filtrado inmutable (< 2025) y conteo de temporadas para caché en Supabase
  const filteredArchive = extractHistoricalCareerPayload({
    playerId: 541600,
    type: "batter",
    regularBatting: [
      { season: 2026, stats: makeMockBattingStats(), source: "mlb_api" },
      { season: 2025, stats: makeMockBattingStats(), source: "mlb_api" },
      { season: 2024, stats: makeMockBattingStats(), source: "mlb_api" },
      { season: 2013, stats: makeMockBattingStats({ teamAbbr: "2EQ", teamId: 0 }), source: "mlb_api", isCombined: true },
      { season: 2013, stats: makeMockBattingStats({ teamAbbr: "MAG", teamId: 696 }), source: "mlb_api", isTeamSplit: true },
      { season: 2013, stats: makeMockBattingStats({ teamAbbr: "MAR", teamId: 697 }), source: "mlb_api", isTeamSplit: true },
    ],
    regularPitching: [],
    postseasonBatting: [
      { season: 2025, phase: "P", phaseLabel: "Postemporada", stats: makeMockBattingStats(), source: "mlb_api" },
      { season: 2023, phase: "P", phaseLabel: "Postemporada", stats: makeMockBattingStats(), source: "mlb_api" },
    ],
    postseasonPitching: [],
    fetchedAt: "2026-11-26T00:00:00.000Z",
  });
  assert.deepEqual(
    filteredArchive.regularBatting.map((e) => e.season),
    [2024, 2013, 2013, 2013],
    "El archivo histórico de caché debe excluir temporadas >= 2025"
  );
  assert.deepEqual(
    filteredArchive.postseasonBatting.map((e) => e.season),
    [2023],
    "La postemporada en caché debe excluir temporadas >= 2025"
  );
  assert.equal(
    countDistinctCareerSeasons(filteredArchive),
    2,
    "countDistinctCareerSeasons debe contar 2 temporadas distintas (2024 y 2013) sin contar sub-filas"
  );

  // 5. Smoke test en vivo contra MLB Stats API (sportId=17&leagueId=135)
  clearPlayerCareerCache();
  const [tovarCareer, lealCareer, guerraCareer] = await Promise.all([
    getPlayerLvbpCareer(541600, "batter"),
    getPlayerLvbpCareer(612797, "pitcher"),
    getPlayerLvbpCareer(448855, "pitcher"),
  ]);

  const tovarSeasons = new Set(
    tovarCareer.regularBatting.filter((e) => !e.isTeamSplit).map((e) => e.season)
  );
  assert.ok(
    tovarSeasons.size >= 12,
    `Wilfredo Tovar (541600) debe tener >= 12 temporadas LVBP distintas (recibidas: ${tovarSeasons.size})`
  );

  const tovar2013Rows = tovarCareer.regularBatting.filter((e) => e.season === 2013);
  assert.ok(
    tovar2013Rows.some((e) => e.isCombined && e.stats.teamAbbr === "2EQ"),
    "Tovar 2013 debe incluir fila combinada 2EQ"
  );
  assert.ok(
    tovar2013Rows.some((e) => e.isTeamSplit && e.stats.teamAbbr === "MAG"),
    "Tovar 2013 debe incluir sub-fila MAG"
  );
  assert.ok(
    tovar2013Rows.some((e) => e.isTeamSplit && e.stats.teamAbbr === "MAR"),
    "Tovar 2013 debe incluir sub-fila MAR"
  );
  assert.ok(
    tovarCareer.postseasonBatting.length > 0,
    "Wilfredo Tovar debe tener entradas de postemporada LVBP"
  );

  const lealSeasons = new Set(
    lealCareer.regularPitching.filter((e) => !e.isTeamSplit).map((e) => e.season)
  );
  assert.ok(
    lealSeasons.size >= 6,
    `Erick Leal (612797) debe tener >= 6 temporadas LVBP de pitcheo (recibidas: ${lealSeasons.size})`
  );
  for (const entry of lealCareer.regularPitching) {
    assert.match(
      entry.stats.inningsDisplay,
      /^\d+\.[0-2]$/,
      `inningsDisplay inválido para Erick Leal ${entry.season}: ${entry.stats.inningsDisplay}`
    );
    assert.ok(
      Number.isFinite(entry.stats.era) && entry.stats.era >= 0,
      `ERA inválida para Erick Leal ${entry.season}: ${entry.stats.era}`
    );
  }

  const guerraSeasons = new Set(
    guerraCareer.regularPitching.filter((e) => !e.isTeamSplit).map((e) => e.season)
  );
  assert.ok(
    guerraSeasons.size >= 14,
    `Junior Guerra (448855) debe tener >= 14 temporadas LVBP de pitcheo (recibidas: ${guerraSeasons.size})`
  );
  assert.ok(
    guerraCareer.postseasonPitching.length >= 8,
    `Junior Guerra (448855) debe tener >= 8 entradas de postemporada LVBP (recibidas: ${guerraCareer.postseasonPitching.length})`
  );

  console.log(
    `[OK] Live MLB Stats API: Tovar=${tovarSeasons.size} temp. (${tovarCareer.postseasonBatting.length} postemp.) | Leal=${lealSeasons.size} temp. | Guerra=${guerraSeasons.size} temp. (${guerraCareer.postseasonPitching.length} postemp.)`
  );
  console.log("=== TODAS LAS PRUEBAS DE PLAYER CAREER PASARON EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("Fallo en player-career.test.ts:", err);
  process.exit(1);
});
