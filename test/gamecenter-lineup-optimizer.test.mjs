import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const nodeRequire = createRequire(import.meta.url);

function resolveTsFile(candidatePath) {
  const attempts = [
    candidatePath,
    `${candidatePath}.ts`,
    `${candidatePath}.tsx`,
    `${candidatePath}.json`,
    path.join(candidatePath, "index.ts"),
    path.join(candidatePath, "index.tsx"),
  ];
  for (const p of attempts) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  return null;
}

const tsModuleCache = new Map();

function loadLocalModule(absPath) {
  if (tsModuleCache.has(absPath)) {
    return tsModuleCache.get(absPath).exports;
  }

  if (absPath.endsWith(".json")) {
    const parsed = JSON.parse(fs.readFileSync(absPath, "utf8"));
    tsModuleCache.set(absPath, { exports: parsed });
    return parsed;
  }

  const source = fs.readFileSync(absPath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: absPath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      resolveJsonModule: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const mod = { exports: {} };
  tsModuleCache.set(absPath, mod);

  const localRequire = (specifier) => {
    if (specifier.startsWith("@/")) {
      const target = resolveTsFile(path.join(repoRoot, "src", specifier.slice(2)));
      if (target) return loadLocalModule(target);
    }
    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const target = resolveTsFile(path.resolve(path.dirname(absPath), specifier));
      if (target) return loadLocalModule(target);
    }
    return nodeRequire(specifier);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(mod.exports, localRequire, mod, absPath, path.dirname(absPath));
  return mod.exports;
}

const { getVenezuelanToday, getVenezuelanDate } = loadLocalModule(
  path.join(repoRoot, "src/lib/utils.ts")
);
const {
  filterAndSortCaracasGames,
  extractLineupFromSchedule,
  formatBoxscoreBatters,
} = loadLocalModule(path.join(repoRoot, "src/lib/game-center-service.ts"));
const {
  buildTangoPlayerFromBattingStats,
  buildTangoPlayerFromMlbSeasonStats,
  resolvePlayerStats,
} = loadLocalModule(path.join(repoRoot, "src/lib/tango-lineup-engine.ts"));
const {
  extractTeamGameLineupFromFeed,
  getDynamicBullpenAndLineups,
} = loadLocalModule(path.join(repoRoot, "src/lib/game-feed-service.ts"));
const { getBullpenAndLineups } = loadLocalModule(
  path.join(repoRoot, "src/lib/bullpen.ts")
);

function makeRoster9(prefix = 9000) {
  const positions = ["CF", "SS", "1B", "DH", "RF", "3B", "LF", "C", "2B"];
  return positions.map((pos, idx) => ({
    id: prefix + idx + 1,
    name: `Jugador ${idx + 1}`,
    pos,
    bats: idx % 2 === 0 ? "R" : "L",
  }));
}

function makeFeed({
  gamePk,
  officialDate,
  detailedState = "Pre-Game",
  abstractGameState = "Preview",
  gameNumber = 1,
  homeId = 695,
  awayId = 696,
  withBattingOrder = true,
  withBatters = true,
  withSeasonBatting = true,
}) {
  const roster = makeRoster9(gamePk * 10);
  const homePlayers = {};
  const gamePlayers = {};
  const battingOrder = [];
  const batters = [];

  for (let i = 0; i < roster.length; i++) {
    const r = roster[i];
    const key = `ID${r.id}`;
    if (withBattingOrder) battingOrder.push(r.id);
    if (withBatters) batters.push(r.id);
    gamePlayers[key] = {
      id: r.id,
      fullName: r.name,
      primaryPosition: { abbreviation: r.pos, code: "8", type: "Outfielder" },
      batSide: { code: r.bats },
      primaryNumber: String(10 + i),
    };
    homePlayers[key] = {
      person: { id: r.id, fullName: r.name, batSide: { code: r.bats } },
      jerseyNumber: String(10 + i),
      position: { abbreviation: r.pos, code: "8", type: "Outfielder" },
      battingOrder: String((i + 1) * 100),
      stats: { batting: { atBats: 0, hits: 0, runs: 0, rbi: 0, baseOnBalls: 0, strikeOuts: 0 } },
      seasonStats: withSeasonBatting
        ? {
            batting: {
              gamesPlayed: 15,
              atBats: 50,
              plateAppearances: 58,
              hits: 16,
              doubles: 3,
              triples: 1,
              homeRuns: 2,
              baseOnBalls: 7,
              hitByPitch: 1,
              sacFlies: 0,
              avg: ".320",
              obp: ".414",
              slg: ".540",
              ops: ".954",
            },
          }
        : {},
    };
  }

  return {
    gamePk,
    gameData: {
      game: { pk: gamePk, gameNumber },
      datetime: { officialDate, originalDate: officialDate },
      status: {
        detailedState,
        abstractGameState,
        codedGameState: abstractGameState === "Live" ? "I" : "P",
      },
      teams: {
        home: { id: homeId, name: "Home Team" },
        away: { id: awayId, name: "Away Team" },
      },
      players: gamePlayers,
    },
    liveData: {
      linescore: { teams: { home: { runs: 0 }, away: { runs: 0 } } },
      boxscore: {
        teams: {
          home: {
            batters: withBatters ? batters : [],
            battingOrder: withBattingOrder ? battingOrder : [],
            players: homePlayers,
            teamStats: { batting: { runs: 0 } },
          },
          away: {
            batters: [],
            battingOrder: [],
            players: {},
            teamStats: { batting: { runs: 0 } },
          },
        },
      },
    },
  };
}

function selectDefaultOptimizerKey({
  initialGamePk,
  todayLineup,
  requestedLineup,
  topFrequentLineups = [],
  gameLineups = [],
}) {
  const hasToday = Boolean(todayLineup?.starters && todayLineup.starters.length >= 9);
  const hasRequested = Boolean(requestedLineup?.starters && requestedLineup.starters.length >= 9);
  if (initialGamePk) {
    if (hasRequested && requestedLineup.gamePk === initialGamePk) return "requested";
    if (hasToday && todayLineup.gamePk === initialGamePk) return "today";
    const matchIdx = gameLineups.findIndex(
      (g) => g.gamePk === initialGamePk && g.starters && g.starters.length >= 9
    );
    if (matchIdx >= 0) return `game_${matchIdx}`;
  }
  if (hasToday) return "today";
  if (topFrequentLineups.length > 0) return "top_0";
  if (gameLineups.length > 0) return "game_0";
  return "top_0";
}

async function runTests() {
  let passed = 0;
  const check = (label, fn) => {
    fn();
    passed++;
    console.log(`✅ ${label}`);
  };
  const checkAsync = async (label, fn) => {
    await fn();
    passed++;
    console.log(`✅ ${label}`);
  };

  console.log("🧪 Ejecutando pruebas de Game Center -> Optimizador Tom Tango...");

  // 1. Venezuela UTC-4 date filtering and doubleheader sorting
  check("1a. Fecha VET (UTC-4) después de las 20:00 VET (01:30 UTC del día siguiente)", () => {
    const vetAfter8pm = getVenezuelanDate(undefined, "2026-11-13T01:30:00Z");
    assert.equal(vetAfter8pm, "2026-11-12", "01:30 UTC debe seguir siendo 2026-11-12 en VET");
    const vetBefore8pm = getVenezuelanDate(undefined, "2026-11-12T23:30:00-04:00");
    assert.equal(vetBefore8pm, "2026-11-12");
  });

  check("1b. filterAndSortCaracasGames filtra futuro y ordena isLive -> fecha DESC -> gameNumber DESC", () => {
    const games = [
      { id: 1, gamePk: 1, date: "2026-11-11", opponent: "vs MAG", score: "5-3", status: "Final", isHome: true, isLive: false, gameNumber: 1, gameDatetime: "2026-11-11T23:00:00Z" },
      { id: 2, gamePk: 2, date: "2026-11-12", opponent: "vs TIB", score: "4-2", status: "Final", isHome: true, isLive: false, gameNumber: 1, gameDatetime: "2026-11-12T21:00:00Z" },
      { id: 3, gamePk: 3, date: "2026-11-12", opponent: "vs TIB", score: "vs", status: "Pre-Game", isHome: true, isLive: false, gameNumber: 2, gameDatetime: "2026-11-13T00:00:00Z" },
      { id: 4, gamePk: 4, date: "2026-11-13", opponent: "@ CAR", score: "vs", status: "Scheduled", isHome: false, isLive: false, gameNumber: 1, gameDatetime: "2026-11-13T23:00:00Z" },
      { id: 5, gamePk: 5, date: "2026-11-10", opponent: "@ TIG", score: "EN VIVO", status: "In Progress", isHome: false, isLive: true, gameNumber: 1, gameDatetime: "2026-11-10T23:00:00Z" },
    ];
    const sorted = filterAndSortCaracasGames(games, "2026-11-12");
    assert.deepEqual(
      sorted.map((g) => g.gamePk),
      [5, 3, 2, 1],
      "Debe priorizar Live (5), excluir futuro Scheduled (4) y ordenar doble juego 2026-11-12 con J2 antes de J1"
    );
  });

  // 2. Lineup extraction cascade (batters -> battingOrder -> schedule?hydrate=lineups)
  check("2a. formatBoxscoreBatters cascada primaria (batters) con bats/obp/slg y exclusión de pitcher sin rol ofensivo", () => {
    const feed = makeFeed({ gamePk: 7771, officialDate: "2026-11-12", withBatters: true, withBattingOrder: true });
    const boxTeam = feed.liveData.boxscore.teams.home;
    // Agregar un lanzador puro a batters para verificar filtrado
    boxTeam.batters.push(99999);
    boxTeam.players.ID99999 = {
      person: { id: 99999, fullName: "Lanzador Puro" },
      position: { abbreviation: "P", type: "Pitcher", code: "1" },
      allPositions: [{ abbreviation: "P" }],
      stats: { batting: { plateAppearances: 0, runs: 0, stolenBases: 0 } },
    };

    const batters = formatBoxscoreBatters(boxTeam, feed.gameData.players);
    assert.equal(batters.length, 9);
    assert.equal(batters[0].order, 1);
    assert.equal(batters[0].bats, "R");
    assert.equal(batters[1].bats, "L");
    assert.equal(batters[0].obp, ".414");
    assert.equal(batters[0].slg, ".540");
  });

  check("2b. formatBoxscoreBatters respaldo 1 desde battingOrder cuando batters está vacío", () => {
    const feed = makeFeed({ gamePk: 7772, officialDate: "2026-11-12", withBatters: false, withBattingOrder: true });
    const batters = formatBoxscoreBatters(feed.liveData.boxscore.teams.home, feed.gameData.players);
    assert.equal(batters.length, 9);
    assert.equal(batters[0].slot, 1);
    assert.equal(batters[8].slot, 9);
  });

  check("2c. formatBoxscoreBatters respaldo 2 desde schedule?hydrate=lineups y extractLineupFromSchedule", () => {
    const roster = makeRoster9(8800);
    const scheduleGame = {
      lineups: {
        homePlayers: roster.map((r) => ({
          id: r.id,
          fullName: r.name,
          primaryPosition: { abbreviation: r.pos, code: "8" },
          batSide: { code: r.bats },
          primaryNumber: "21",
        })),
        awayPlayers: [],
      },
    };
    const extracted = extractLineupFromSchedule(scheduleGame, true);
    assert.equal(extracted.length, 9);

    const batters = formatBoxscoreBatters({ batters: [], battingOrder: [], players: {} }, {}, extracted);
    assert.equal(batters.length, 9);
    assert.equal(batters[0].id, roster[0].id);
    assert.equal(batters[0].bats, "R");
    assert.equal(batters[1].bats, "L");
  });

  check("2d. extractTeamGameLineupFromFeed cascada (battingOrder -> batters -> fallbackSchedulePlayers)", () => {
    const feedViaBatters = makeFeed({
      gamePk: 7773,
      officialDate: "2026-11-12",
      withBatters: true,
      withBattingOrder: false,
    });
    const luBatters = extractTeamGameLineupFromFeed(feedViaBatters, 695, "2026-11-12");
    assert.ok(luBatters);
    assert.equal(luBatters.starters.length, 9);
    assert.equal(luBatters.status, "Preview");
    assert.equal(luBatters.isToday, true);

    const feedEmpty = makeFeed({
      gamePk: 7774,
      officialDate: "2026-11-12",
      withBatters: false,
      withBattingOrder: false,
    });
    assert.equal(extractTeamGameLineupFromFeed(feedEmpty, 695, "2026-11-12"), null);

    const schedPlayers = makeRoster9(9900).map((r) => ({
      id: r.id,
      fullName: r.name,
      primaryPosition: { abbreviation: r.pos, code: "8" },
    }));
    const luSched = extractTeamGameLineupFromFeed(feedEmpty, 695, "2026-11-12", schedPlayers);
    assert.ok(luSched);
    assert.equal(luSched.starters.length, 9);
    assert.equal(luSched.starters[0].playerId, 9901);
  });

  // 3. resolvePlayerStats precedence and real-stats conversion
  check("3a. buildTangoPlayerFromBattingStats calcula wOBA, wRC+, ISO y marca statsSource='supabase'", () => {
    const player = buildTangoPlayerFromBattingStats(
      {
        playerId: 700001,
        playerName: "Refuerzo Supabase",
        playerAvatar: "",
        teamId: 695,
        teamName: "Leones",
        teamAbbr: "LEO",
        teamLogo: "",
        games: 20,
        atBats: 70,
        plateAppearances: 82,
        runs: 12,
        hits: 23,
        doubles: 5,
        triples: 1,
        homeRuns: 3,
        rbi: 14,
        walks: 10,
        strikeouts: 12,
        stolenBases: 2,
        caughtStealing: 1,
        hbp: 1,
        sf: 1,
        avg: 0.329,
        obp: 0.415,
        slg: 0.557,
        ops: 0.972,
        iso: 0.228,
        babip: 0.351,
      },
      "L",
      "RF"
    );
    assert.equal(player.statsSource, "supabase");
    assert.equal(player.bats, "L");
    assert.equal(player.position, "RF");
    assert.equal(player.iso, 0.228);
    assert.ok(player.woba > 0.38);
    assert.ok(player.wrcPlus > 120);
  });

  check("3b. buildTangoPlayerFromMlbSeasonStats retorna null si AB+BB===0 y 'mlb' si hay muestra", () => {
    const empty = buildTangoPlayerFromMlbSeasonStats({
      playerId: 700002,
      playerName: "Sin Turnos",
      seasonBatting: { atBats: 0, baseOnBalls: 0 },
    });
    assert.equal(empty, null);

    const mlbPlayer = buildTangoPlayerFromMlbSeasonStats({
      playerId: 700003,
      playerName: "Importado Nuevo",
      position: "1B",
      batSide: "S",
      seasonBatting: {
        gamesPlayed: 8,
        atBats: 30,
        hits: 10,
        doubles: 2,
        triples: 0,
        homeRuns: 2,
        baseOnBalls: 4,
        hitByPitch: 0,
        sacFlies: 0,
        avg: ".333",
        obp: ".412",
        slg: ".600",
      },
    });
    assert.ok(mlbPlayer);
    assert.equal(mlbPlayer.statsSource, "mlb");
    assert.equal(mlbPlayer.bats, "S");
    assert.equal(mlbPlayer.iso, 0.267);
    assert.ok(mlbPlayer.woba > 0.4);
  });

  check("3c. resolvePlayerStats respeta precedencia realStatsLookup -> LEONES_REAL_STATS_MAP -> synthetic", () => {
    const realSupa = buildTangoPlayerFromMlbSeasonStats({
      playerId: 592808,
      playerName: "Oswaldo Arcia",
      position: "RF",
      batSide: "L",
      seasonBatting: {
        atBats: 40,
        hits: 14,
        doubles: 3,
        triples: 0,
        homeRuns: 3,
        baseOnBalls: 6,
        avg: ".350",
        obp: ".435",
        slg: ".650",
      },
    });
    assert.ok(realSupa);

    // 1. realStatsLookup gana sobre LEONES_REAL_STATS_MAP aunque el jugador exista en el mapa canónico
    const fromLookup = resolvePlayerStats("Oswaldo Arcia", "DH", 592808, 4, {
      592808: realSupa,
    });
    assert.equal(fromLookup.statsSource, "mlb");
    assert.equal(fromLookup.avg, 0.35);
    assert.equal(fromLookup.position, "DH");

    // 2. Sin lookup (o con lookup sintético), cae en LEONES_REAL_STATS_MAP como canonical_map
    const fromCanonical = resolvePlayerStats("Oswaldo Arcia", "UTIL", 592808, 4);
    assert.equal(fromCanonical.statsSource, "canonical_map");
    assert.equal(fromCanonical.bats, "L");

    // 3. Jugador desconocido sin lookup cae en synthetic
    const fromSynthetic = resolvePlayerStats("Pelotero Desconocido XYZ", "3B", 888999, 6);
    assert.equal(fromSynthetic.statsSource, "synthetic");
    assert.equal(fromSynthetic.position, "3B");
  });

  // 4. todayLineupStatus & requestedLineup / fallback behavior (published vs unpublished)
  const originalFetch = globalThis.fetch;
  try {
    await checkAsync("4a. getDynamicBullpenAndLineups expone todayLineup publicado hoy (Pre-Game), requestedLineup y playerStatsMap sin alterar totalGames", async () => {
      const todayVet = getVenezuelanToday().dateString;
      const todayPk = 812345;
      const requestedPk = 812399;
      const todayFeed = makeFeed({
        gamePk: todayPk,
        officialDate: todayVet,
        detailedState: "Pre-Game",
        abstractGameState: "Preview",
        gameNumber: 2,
        homeId: 695,
        awayId: 696,
      });
      const requestedFeed = makeFeed({
        gamePk: requestedPk,
        officialDate: "2026-11-10",
        detailedState: "Final",
        abstractGameState: "Final",
        gameNumber: 1,
        homeId: 696,
        awayId: 695,
      });

      globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes("/schedule?") && !u.includes("hydrate=lineups")) {
          return new Response(
            JSON.stringify({
              dates: [
                {
                  date: todayVet,
                  games: [
                    {
                      gamePk: todayPk,
                      officialDate: todayVet,
                      gameDate: `${todayVet}T23:00:00Z`,
                      gameNumber: 2,
                      doubleHeader: "Y",
                      status: { detailedState: "Pre-Game", abstractGameState: "Preview" },
                      teams: {
                        home: { team: { id: 695 } },
                        away: { team: { id: 696 } },
                      },
                    },
                  ],
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        if (u.includes(`/game/${todayPk}/feed/live`)) {
          return new Response(JSON.stringify(todayFeed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (u.includes(`/game/${requestedPk}/feed/live`)) {
          return new Response(JSON.stringify(requestedFeed), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ dates: [] }), { status: 200 });
      };

      const data = await getDynamicBullpenAndLineups(2026, {
        targetGamePk: requestedPk,
        teamId: 696,
      });

      assert.ok(data.lineups.todayLineup, "todayLineup debe existir cuando hoy está publicado");
      assert.equal(data.lineups.todayLineup.gamePk, todayPk);
      assert.equal(data.lineups.todayLineup.status, "Preview");
      assert.equal(data.lineups.todayLineup.gameNumber, 2);
      assert.equal(data.lineups.todayLineup.starters.length, 9);

      assert.equal(data.lineups.todayLineupStatus?.hasGameToday, true);
      assert.equal(data.lineups.todayLineupStatus?.isPublished, true);
      assert.match(data.lineups.todayLineupStatus?.message || "", /Pre-Juego/);

      assert.ok(data.lineups.requestedLineup, "requestedLineup debe resolverse para gamePk/teamId distinto");
      assert.equal(data.lineups.requestedLineup.gamePk, requestedPk);
      assert.equal(data.lineups.requestedLineup.teamId, 696);

      const firstTodayId = data.lineups.todayLineup.starters[0].playerId;
      assert.equal(data.lineups.playerStatsMap?.[firstTodayId]?.statsSource, "mlb");

      // Verificar que juego Pre-Game de hoy no contamina KPIs históricos ni gameLineups
      const baseline = getBullpenAndLineups(2026, 695);
      assert.equal(data.lineups.kpis.totalGames, baseline.lineups.kpis.totalGames);
      assert.equal(data.lineups.gameLineups.length, baseline.lineups.gameLineups.length);
    });

    await checkAsync("4b. getDynamicBullpenAndLineups cuando juego de hoy está Scheduled sin lineup publicado", async () => {
      const todayVet = getVenezuelanToday().dateString;
      const unpubPk = 812400;
      const unpubFeed = makeFeed({
        gamePk: unpubPk,
        officialDate: todayVet,
        detailedState: "Scheduled",
        abstractGameState: "Preview",
        withBatters: false,
        withBattingOrder: false,
      });

      globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes("/schedule?") && !u.includes("hydrate=lineups")) {
          return new Response(
            JSON.stringify({
              dates: [
                {
                  date: todayVet,
                  games: [
                    {
                      gamePk: unpubPk,
                      officialDate: todayVet,
                      gameDate: `${todayVet}T23:00:00Z`,
                      gameNumber: 1,
                      doubleHeader: "N",
                      status: { detailedState: "Scheduled", abstractGameState: "Preview" },
                      teams: {
                        home: { team: { id: 695 } },
                        away: { team: { id: 696 } },
                      },
                    },
                  ],
                },
              ],
            }),
            { status: 200 }
          );
        }
        if (u.includes(`/game/${unpubPk}/feed/live`)) {
          return new Response(JSON.stringify(unpubFeed), { status: 200 });
        }
        return new Response(JSON.stringify({ dates: [] }), { status: 200 });
      };

      const data = await getDynamicBullpenAndLineups(2026);
      assert.equal(data.lineups.todayLineup, null);
      assert.equal(data.lineups.todayLineupStatus?.hasGameToday, true);
      assert.equal(data.lineups.todayLineupStatus?.isPublished, false);
      assert.match(
        data.lineups.todayLineupStatus?.message || "",
        /Lineup de hoy aún no publicado.*mostrando alineación más frecuente/
      );
    });

    await checkAsync("4c. getDynamicBullpenAndLineups cuando no hay juego programado hoy", async () => {
      globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes("/schedule?")) {
          return new Response(
            JSON.stringify({
              dates: [
                {
                  date: "2026-11-01",
                  games: [
                    {
                      gamePk: 810001,
                      officialDate: "2026-11-01",
                      gameDate: "2026-11-01T23:00:00Z",
                      gameNumber: 1,
                      status: { detailedState: "Final", abstractGameState: "Final" },
                      teams: {
                        home: { team: { id: 695 }, score: 5 },
                        away: { team: { id: 696 }, score: 2 },
                      },
                    },
                  ],
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      };

      const data = await getDynamicBullpenAndLineups(2026);
      assert.equal(data.lineups.todayLineup, null);
      assert.equal(data.lineups.todayLineupStatus?.hasGameToday, false);
      assert.equal(data.lineups.todayLineupStatus?.isPublished, false);
      assert.equal(
        data.lineups.todayLineupStatus?.message,
        "Sin juego programado para hoy — mostrando alineación más frecuente"
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  check("4d. Prioridad de selección por defecto en Optimizador (initialGamePk -> today -> top_0 -> game_0)", () => {
    const starters = makeRoster9(500).map((r, i) => ({
      order: i + 1,
      playerId: r.id,
      playerName: r.name,
      position: r.pos,
    }));
    const todayLineup = { gamePk: 100, starters };
    const requestedLineup = { gamePk: 200, starters };
    const topFrequentLineups = [{ rank: 1, games: 5, record: "3-2", starters }];
    const gameLineups = [{ gamePk: 300, starters }];

    assert.equal(
      selectDefaultOptimizerKey({ initialGamePk: 200, todayLineup, requestedLineup, topFrequentLineups, gameLineups }),
      "requested"
    );
    assert.equal(
      selectDefaultOptimizerKey({ initialGamePk: 100, todayLineup, requestedLineup: null, topFrequentLineups, gameLineups }),
      "today"
    );
    assert.equal(
      selectDefaultOptimizerKey({ initialGamePk: 300, todayLineup, requestedLineup: null, topFrequentLineups, gameLineups }),
      "game_0"
    );
    assert.equal(
      selectDefaultOptimizerKey({ todayLineup, topFrequentLineups, gameLineups }),
      "today"
    );
    assert.equal(
      selectDefaultOptimizerKey({ todayLineup: null, topFrequentLineups, gameLineups }),
      "top_0"
    );
    assert.equal(
      selectDefaultOptimizerKey({ todayLineup: null, topFrequentLineups: [], gameLineups }),
      "game_0"
    );
  });

  console.log(`🎉 ${passed} pruebas completadas exitosamente.`);
}

await runTests();
