import assert from "node:assert/strict";
import {
  LEVERAGE_THRESHOLDS,
  classifyLeverageTier,
  aggregatePlaysByLeverage,
} from "../player-leverage-service";
import {
  parseMlbPitcherSplit,
  buildRecentTrendSplits,
  buildPitcherRestDaySplits,
  buildBatterGameLogs,
  buildPitcherGameLogs,
  RawGameBattingRow,
  RawGamePitchingRow,
} from "../player-splits-service";

function runTests() {
  console.log("=== Ejecutando suite de pruebas: Leverage Index & Splits Extendidos ===");

  // 1. classifyLeverageTier
  assert.equal(LEVERAGE_THRESHOLDS.lowMax, 0.85);
  assert.equal(LEVERAGE_THRESHOLDS.highMin, 1.50);
  assert.equal(classifyLeverageTier(0.1), "low");
  assert.equal(classifyLeverageTier(0.84), "low");
  assert.equal(classifyLeverageTier(0.85), "mid");
  assert.equal(classifyLeverageTier(1.2), "mid");
  assert.equal(classifyLeverageTier(1.5), "mid");
  assert.equal(classifyLeverageTier(1.51), "high");
  assert.equal(classifyLeverageTier(3.75), "high");

  // 2. aggregatePlaysByLeverage - Bateador
  const batterId = 625506;
  const teammateId = 602922;
  const pitcherIdA = 682624;
  const pitcherIdB = 612797;

  const mockFeeds = [
    {
      gamePk: 900001,
      gameData: {
        status: { abstractGameState: "Final", statusCode: "F" },
      },
      liveData: {
        plays: {
          allPlays: [
            // Play 0: Top 1st, 0 outs, bases empty, 0-0 -> mid/low LI, batter walks
            {
              about: { inning: 1, halfInning: "top", isComplete: true },
              result: { event: "Walk", eventType: "walk", rbi: 0 },
              matchup: {
                batter: { id: batterId },
                pitcher: { id: pitcherIdA },
                postOnFirst: true,
              },
              count: { outs: 0 },
              runners: [],
            },
            // Play 1: Top 1st, 0 outs, runner on 1st -> teammate hits HR, batterId scores!
            {
              about: { inning: 1, halfInning: "top", isComplete: true },
              result: { event: "Home Run", eventType: "home_run", rbi: 2 },
              matchup: {
                batter: { id: teammateId },
                pitcher: { id: pitcherIdA },
              },
              count: { outs: 0 },
              runners: [
                {
                  movement: { end: "score" },
                  details: {
                    runner: { id: batterId },
                    responsiblePitcher: { id: pitcherIdA },
                    earned: true,
                  },
                },
                {
                  movement: { end: "score" },
                  details: {
                    runner: { id: teammateId },
                    responsiblePitcher: { id: pitcherIdA },
                    earned: true,
                  },
                },
              ],
            },
            // Play 2: Top 2nd, 0 outs, bases empty, away leads 2-0 -> batter strikes out (low/mid)
            {
              about: { inning: 2, halfInning: "top", isComplete: true },
              result: { event: "Strikeout", eventType: "strikeout", rbi: 0 },
              matchup: {
                batter: { id: batterId },
                pitcher: { id: pitcherIdA },
              },
              count: { outs: 1 },
              runners: [],
            },
            // Play 3: Bottom 9th, 0 outs, away leads 2-0 (home scores 2 earlier? Let's make home score 2 first on teammate play so it's tied 2-2)
            {
              about: { inning: 8, halfInning: "bottom", isComplete: true },
              result: { event: "Home Run", eventType: "home_run", rbi: 2 },
              matchup: {
                batter: { id: 999001 },
                pitcher: { id: pitcherIdB },
              },
              count: { outs: 2 },
              runners: [
                {
                  movement: { end: "score" },
                  details: {
                    runner: { id: 999002 },
                    responsiblePitcher: { id: pitcherIdA },
                    earned: true,
                  },
                },
                {
                  movement: { end: "score" },
                  details: {
                    runner: { id: 999001 },
                    responsiblePitcher: { id: pitcherIdB },
                    earned: false,
                  },
                },
              ],
            },
            // Play 4: Top 9th, 2 outs, tied 2-2 -> high LI! batter hits double
            {
              about: { inning: 9, halfInning: "top", isComplete: true },
              result: { event: "Double", eventType: "double", rbi: 0 },
              matchup: {
                batter: { id: batterId },
                pitcher: { id: pitcherIdB },
                postOnSecond: true,
              },
              count: { outs: 2 },
              runners: [],
            },
            // Incomplete play must be ignored
            {
              about: { inning: 9, halfInning: "top", isComplete: false },
              result: { event: "Single", eventType: "single", rbi: 1 },
              matchup: {
                batter: { id: batterId },
                pitcher: { id: pitcherIdB },
              },
              count: { outs: 2 },
              runners: [],
            },
          ],
        },
      },
    },
  ];

  const batterLev = aggregatePlaysByLeverage(mockFeeds, batterId, "batter", 2026);
  assert.equal(batterLev.playerId, batterId);
  assert.equal(batterLev.type, "batter");
  assert.equal(batterLev.gamesAnalyzed, 1);
  assert.ok(batterLev.batterRows && batterLev.batterRows.length === 3);
  assert.equal(batterLev.batterRows[0].tier, "high");
  assert.equal(batterLev.batterRows[1].tier, "mid");
  assert.equal(batterLev.batterRows[2].tier, "low");

  const totalBatterPa = batterLev.batterRows.reduce((s, r) => s + r.pa, 0);
  const totalBatterAb = batterLev.batterRows.reduce((s, r) => s + r.ab, 0);
  const totalBatterH = batterLev.batterRows.reduce((s, r) => s + r.h, 0);
  const totalBatterDoubles = batterLev.batterRows.reduce((s, r) => s + r.doubles, 0);
  const totalBatterBb = batterLev.batterRows.reduce((s, r) => s + r.bb, 0);
  const totalBatterSo = batterLev.batterRows.reduce((s, r) => s + r.so, 0);
  const totalBatterR = batterLev.batterRows.reduce((s, r) => s + r.r, 0);

  assert.equal(totalBatterPa, 3, "Walk + Strikeout + Double = 3 PA (incomplete play ignored)");
  assert.equal(totalBatterAb, 2, "Strikeout + Double = 2 AB");
  assert.equal(totalBatterH, 1);
  assert.equal(totalBatterDoubles, 1);
  assert.equal(totalBatterBb, 1);
  assert.equal(totalBatterSo, 1);
  assert.equal(totalBatterR, 1, "Debe contar la carrera anotada cuando runner.details.runner.id === batterId");
  assert.ok(batterLev.avgLi > 0);

  // 3. aggregatePlaysByLeverage - Lanzador con responsiblePitcher y earned
  const pitLevA = aggregatePlaysByLeverage(mockFeeds, pitcherIdA, "pitcher", 2026);
  assert.ok(pitLevA.pitcherRows && pitLevA.pitcherRows.length === 3);
  const totalPitAOuts = pitLevA.pitcherRows.reduce((s, r) => s + Math.round(r.ip * 3), 0);
  const totalPitAR = pitLevA.pitcherRows.reduce((s, r) => s + r.r, 0);
  const totalPitAEr = pitLevA.pitcherRows.reduce((s, r) => s + r.er, 0);
  const totalPitAHr = pitLevA.pitcherRows.reduce((s, r) => s + r.hr, 0);
  const totalPitASo = pitLevA.pitcherRows.reduce((s, r) => s + r.so, 0);
  assert.equal(totalPitAOuts, 1, "Pitcher A sacó 1 out (Play 2 strikeout)");
  assert.equal(totalPitASo, 1);
  assert.equal(totalPitAHr, 1, "Pitcher A permitió 1 HR en Play 1 (Play 3 fue contra Pitcher B)");
  assert.equal(totalPitAR, 3, "Pitcher A carga 2 R en Play 1 + 1 R heredada de Play 3");
  assert.equal(totalPitAEr, 3, "Todas las 3 carreras cargadas a Pitcher A tienen earned=true");

  const pitLevB = aggregatePlaysByLeverage(mockFeeds, pitcherIdB, "pitcher", 2026);
  assert.ok(pitLevB.pitcherRows && pitLevB.pitcherRows.length === 3);
  const totalPitBR = pitLevB.pitcherRows.reduce((s, r) => s + r.r, 0);
  const totalPitBEr = pitLevB.pitcherRows.reduce((s, r) => s + r.er, 0);
  const totalPitBHr = pitLevB.pitcherRows.reduce((s, r) => s + r.hr, 0);
  assert.equal(totalPitBHr, 1);
  assert.equal(totalPitBR, 1, "Pitcher B solo carga su propio corredor (999001), no el heredado de Pitcher A");
  assert.equal(totalPitBEr, 0, "La carrera de Pitcher B tiene earned=false -> 0 ER");

  // Fallback a matchup.pitcher.id cuando no viene responsiblePitcher
  const fallbackPitcherFeed = [
    {
      gamePk: 900002,
      gameData: { status: { abstractGameState: "Final" } },
      liveData: {
        plays: {
          allPlays: [
            {
              about: { inning: 9, halfInning: "bottom", isComplete: true },
              result: { event: "Home Run", eventType: "home_run", rbi: 1 },
              matchup: {
                batter: { id: batterId },
                pitcher: { id: pitcherIdB },
              },
              count: { outs: 0 },
              runners: [
                {
                  movement: { end: "score" },
                  details: { runner: { id: batterId }, earned: true },
                },
              ],
            },
          ],
        },
      },
    },
  ];
  const pitLevBFallback = aggregatePlaysByLeverage(fallbackPitcherFeed, pitcherIdB, "pitcher", 2026);
  assert.equal(pitLevBFallback.pitcherRows?.reduce((s, r) => s + r.r, 0), 1);
  assert.equal(pitLevBFallback.pitcherRows?.reduce((s, r) => s + r.er, 0), 1);

  // 4. buildRecentTrendSplits & buildBatterGameLogs
  const batRows: RawGameBattingRow[] = Array.from({ length: 10 }, (_, idx) => ({
    game_id: 1000 + idx,
    player_id: batterId,
    team_id: 695,
    ab: 4,
    r: idx >= 3 ? 1 : 0,
    h: idx >= 3 ? 2 : 0, // Primeros 3 juegos 0-12, últimos 7 juegos 14-28 (.500)
    doubles: 0,
    triples: 0,
    hr: idx === 9 ? 1 : 0,
    rbi: idx >= 3 ? 1 : 0,
    bb: 0,
    so: 1,
    sb: 0,
    cs: 0,
    hbp: 0,
    sf: 0,
    sh: 0,
    games: {
      id: 1000 + idx,
      game_date: `2026-10-${String(10 + idx).padStart(2, "0")}`,
      home_team_id: 695,
      away_team_id: 696,
      home_score: 5,
      away_score: 3,
      status: "Final",
    },
  }));
  // Agregar juego en banca y juego pospuesto para validar filtrado
  batRows.push(
    {
      game_id: 1099,
      player_id: batterId,
      team_id: 695,
      ab: 0,
      r: 0,
      h: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      sb: 0,
      cs: 0,
      hbp: 0,
      sf: 0,
      sh: 0,
      games: {
        id: 1099,
        game_date: "2026-10-25",
        home_team_id: 695,
        away_team_id: 696,
        status: "Final",
      },
    },
    {
      game_id: 1100,
      player_id: batterId,
      team_id: 695,
      ab: 4,
      r: 1,
      h: 4,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      so: 0,
      sb: 0,
      cs: 0,
      hbp: 0,
      sf: 0,
      sh: 0,
      games: {
        id: 1100,
        game_date: "2026-10-26",
        home_team_id: 695,
        away_team_id: 696,
        status: "Postponed",
      },
    }
  );

  const batTrends = buildRecentTrendSplits(batRows, "batter");
  assert.equal(batTrends.length, 2, "10 juegos reales debe generar Últimos 7 y Últimos 15");
  assert.equal(batTrends[0].category, "trend");
  assert.equal(batTrends[0].games, 7);
  assert.equal(batTrends[0].avg, ".500");
  assert.equal(batTrends[1].games, 10);
  assert.equal(batTrends[1].avg, ".350");

  const batLogs = buildBatterGameLogs(batRows);
  assert.equal(batLogs.length, 10);
  assert.equal(batLogs[0].gameId, 1009, "Game logs deben venir ordenados del más reciente al más antiguo");
  assert.equal(batLogs[0].result, "G");
  assert.equal(batLogs[0].hr, 1);

  // 5. buildPitcherRestDaySplits & buildPitcherGameLogs
  const pitDates = [
    "2026-10-15", // base
    "2026-10-16", // 0 días de descanso
    "2026-10-18", // 1 día de descanso
    "2026-10-21", // 2 días de descanso (bucket 2-3)
    "2026-10-26", // 4 días de descanso
    "2026-11-01", // 5 días de descanso
    "2026-11-09", // 7 días de descanso (bucket 6+)
  ];
  const pitRows: RawGamePitchingRow[] = pitDates.map((d, idx) => ({
    game_id: 2000 + idx,
    player_id: pitcherIdA,
    team_id: 695,
    ip_decimal: 1.0,
    h: 1,
    r: 0,
    er: 0,
    bb: 0,
    hbp: 0,
    so: 2,
    hr: 0,
    games_started: idx >= 4 ? 1 : 0,
    games: {
      id: 2000 + idx,
      game_date: d,
      home_team_id: 695,
      away_team_id: 696,
      home_score: 4,
      away_score: 2,
      status: "Final",
    },
  }));

  const restSplits = buildPitcherRestDaySplits(pitRows);
  assert.equal(restSplits.length, 6, "Debe cubrir los 6 rangos de descanso configurados");
  assert.ok(restSplits.every((r) => r.category === "fatigue" && r.games === 1 && r.eraAvailable === true));

  const pitLogs = buildPitcherGameLogs(pitRows);
  assert.equal(pitLogs.length, 7);
  assert.equal(pitLogs[0].date, "2026-11-09");
  assert.equal(pitLogs[0].isStart, true);

  // 6. parseMlbPitcherSplit con ERA/ER ausentes -> era: "--", eraAvailable: false
  const noEraSplit = parseMlbPitcherSplit(
    {
      split: { code: "c00" },
      stat: {
        gamesPlayed: 5,
        inningsPitched: "3.1",
        hits: 2,
        runs: 1,
        baseOnBalls: 1,
        strikeOuts: 4,
        homeRuns: 0,
      },
    },
    "count",
    "Cuenta 0-0",
    "0-0"
  );
  assert.equal(noEraSplit.era, "--");
  assert.equal(noEraSplit.eraNum, -1);
  assert.equal(noEraSplit.eraAvailable, false);
  assert.equal(noEraSplit.whip, "0.90");

  const withEraSplit = parseMlbPitcherSplit(
    {
      split: { code: "h" },
      stat: {
        gamesPlayed: 4,
        inningsPitched: "5.0",
        hits: 3,
        runs: 2,
        earnedRuns: 2,
        era: "3.60",
        baseOnBalls: 1,
        strikeOuts: 5,
        homeRuns: 1,
      },
    },
    "context",
    "En Casa (Local)",
    "Local"
  );
  assert.equal(withEraSplit.era, "3.60");
  assert.equal(withEraSplit.eraNum, 3.6);
  assert.equal(withEraSplit.eraAvailable, true);

  console.log("=== TODAS LAS PRUEBAS DE LEVERAGE Y SPLITS EXTENDIDOS PASARON ===");
}

runTests();
