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

const {
  DEFENSIVE_LINEUP_SLOTS,
  normalizeEligiblePositions,
  selectBestDefensiveNine,
  buildBestAvailableLineup,
} = loadLocalModule(path.join(repoRoot, "src/lib/tango-lineup-engine.ts"));

const { fetchTeamActiveRosterBatters } = loadLocalModule(
  path.join(repoRoot, "src/lib/game-center-service.ts")
);

const { buildActiveRosterPool, getDynamicBullpenAndLineups } = loadLocalModule(
  path.join(repoRoot, "src/lib/game-feed-service.ts")
);

const { getVenezuelanToday } = loadLocalModule(
  path.join(repoRoot, "src/lib/utils.ts")
);

function makeBatter({
  playerId,
  playerName,
  position,
  eligiblePositions,
  woba,
  obp = 0.36,
  slg = 0.45,
  avg = 0.285,
  bats = "R",
  plateAppearances = 45,
  atBats = 40,
  gamesPlayed = 12,
  statsSource = "supabase",
}) {
  return {
    playerId,
    playerName,
    position,
    eligiblePositions: eligiblePositions ?? [position],
    bats,
    avg,
    obp,
    slg,
    iso: Number((slg - avg).toFixed(3)),
    woba,
    wrcPlus: Math.round(100 + (woba - 0.32) * 400),
    statsSource,
    plateAppearances,
    atBats,
    gamesPlayed,
  };
}

function makeStandardPool() {
  return [
    makeBatter({
      playerId: 101,
      playerName: "Freddy Fermin",
      position: "C",
      eligiblePositions: ["C"],
      woba: 0.365,
      obp: 0.375,
      slg: 0.445,
      bats: "R",
    }),
    makeBatter({
      playerId: 102,
      playerName: "Lenyn Sosa",
      position: "3B",
      eligiblePositions: ["3B", "1B", "2B"],
      woba: 0.41,
      obp: 0.395,
      slg: 0.54,
      bats: "R",
    }),
    makeBatter({
      playerId: 103,
      playerName: "Wilfredo Tovar",
      position: "2B",
      eligiblePositions: ["2B", "3B", "SS"],
      woba: 0.355,
      obp: 0.38,
      slg: 0.41,
      bats: "R",
    }),
    makeBatter({
      playerId: 104,
      playerName: "Leandro Cedeño",
      position: "DH",
      eligiblePositions: ["DH", "1B"],
      woba: 0.425,
      obp: 0.39,
      slg: 0.59,
      bats: "R",
    }),
    makeBatter({
      playerId: 105,
      playerName: "Liván Soto",
      position: "SS",
      eligiblePositions: ["SS", "2B"],
      woba: 0.35,
      obp: 0.37,
      slg: 0.415,
      bats: "L",
    }),
    makeBatter({
      playerId: 106,
      playerName: "Harold Castro",
      position: "CF",
      eligiblePositions: ["CF", "LF", "2B"],
      woba: 0.385,
      obp: 0.38,
      slg: 0.5,
      bats: "L",
    }),
    makeBatter({
      playerId: 107,
      playerName: "Oswaldo Arcia",
      position: "RF",
      eligiblePositions: ["RF", "LF", "DH"],
      woba: 0.395,
      obp: 0.385,
      slg: 0.535,
      bats: "L",
    }),
    makeBatter({
      playerId: 108,
      playerName: "Yonathan Daza",
      position: "LF",
      eligiblePositions: ["LF", "CF"],
      woba: 0.345,
      obp: 0.36,
      slg: 0.42,
      bats: "R",
    }),
    makeBatter({
      playerId: 109,
      playerName: "José Rondón",
      position: "1B",
      eligiblePositions: ["1B", "OF", "DH"],
      woba: 0.372,
      obp: 0.365,
      slg: 0.495,
      bats: "R",
    }),
    // Banca adicional
    makeBatter({
      playerId: 110,
      playerName: "Jhonny Pereda",
      position: "C",
      eligiblePositions: ["C", "1B"],
      woba: 0.325,
      obp: 0.34,
      slg: 0.39,
      bats: "R",
    }),
    makeBatter({
      playerId: 111,
      playerName: "Gabriel Noriega",
      position: "3B",
      eligiblePositions: ["3B", "SS", "2B"],
      woba: 0.315,
      obp: 0.33,
      slg: 0.385,
      bats: "R",
    }),
  ];
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

  console.log("🧪 Ejecutando pruebas de Spec 024 (Mejor Lineup Posible - Roster Activo)...");

  // 1. normalizeEligiblePositions
  check("1a. normalizeEligiblePositions mapea exactas, expande OF/IF/CI/MI, incluye DH y excluye P/PH/PR", () => {
    const set1 = normalizeEligiblePositions(["3B/1B/2B", "P", "PH", "PR"]);
    assert.equal(set1.has("3B"), true);
    assert.equal(set1.has("1B"), true);
    assert.equal(set1.has("2B"), true);
    assert.equal(set1.has("DH"), true);
    assert.equal(set1.has("P"), false);
    assert.equal(set1.has("PH"), false);
    assert.equal(set1.has("PR"), false);

    const setOf = normalizeEligiblePositions(["OF"]);
    assert.deepEqual([...setOf].sort(), ["CF", "DH", "LF", "RF"]);

    const setIf = normalizeEligiblePositions(["IF"]);
    assert.deepEqual([...setIf].sort(), ["1B", "2B", "3B", "DH", "SS"]);

    const setOnlyExcluded = normalizeEligiblePositions(["P", "PH", "PR", "", "-"]);
    assert.equal(setOnlyExcluded.size, 0);
  });

  // 2. selectBestDefensiveNine
  check("2a. selectBestDefensiveNine cubre las 9 posiciones válidas maximizando wOBA sin repetir jugadores", () => {
    const pool = makeStandardPool();
    const res = selectBestDefensiveNine(pool);
    assert.equal(res.selected.length, 9);
    assert.equal(res.relaxedNote, undefined);

    const uniqueIds = new Set(res.selected.map((p) => p.playerId));
    assert.equal(uniqueIds.size, 9, "No debe repetir ningún jugador");

    const assignedSlots = Object.values(res.assignedPositions).sort();
    assert.deepEqual(
      assignedSlots,
      [...DEFENSIVE_LINEUP_SLOTS].sort(),
      "Debe cubrir exactamente C, 1B, 2B, 3B, SS, LF, CF, RF, DH"
    );

    // Verificar multi-posición: Sosa (3B), Tovar (2B), Cedeño (DH o 1B)
    assert.equal(res.assignedPositions[101], "C");
    assert.equal(res.assignedPositions[105], "SS");
    assert.ok(["1B", "3B", "2B"].includes(res.assignedPositions[102]));
    assert.ok(["DH", "1B"].includes(res.assignedPositions[104]));
    assert.equal(uniqueIds.has(110), false, "Segundo receptor más débil queda fuera");
    assert.equal(uniqueIds.has(111), false, "Infielder suplente queda fuera");
  });

  check("2b. selectBestDefensiveNine aplica relajación secundaria documentada en español cuando falta un 3B natural", () => {
    const poolWithout3B = [
      makeBatter({ playerId: 201, playerName: "Receptor", position: "C", eligiblePositions: ["C"], woba: 0.36 }),
      makeBatter({ playerId: 202, playerName: "Inicialista", position: "1B", eligiblePositions: ["1B"], woba: 0.38 }),
      makeBatter({ playerId: 203, playerName: "Camarero A", position: "2B", eligiblePositions: ["2B"], woba: 0.37 }),
      makeBatter({ playerId: 204, playerName: "Camarero B", position: "2B", eligiblePositions: ["2B", "SS"], woba: 0.355 }),
      makeBatter({ playerId: 205, playerName: "Campocorto", position: "SS", eligiblePositions: ["SS"], woba: 0.35 }),
      makeBatter({ playerId: 206, playerName: "Jardinero Izq", position: "LF", eligiblePositions: ["LF"], woba: 0.365 }),
      makeBatter({ playerId: 207, playerName: "Jardinero Cen", position: "CF", eligiblePositions: ["CF"], woba: 0.375 }),
      makeBatter({ playerId: 208, playerName: "Jardinero Der", position: "RF", eligiblePositions: ["RF"], woba: 0.39 }),
      makeBatter({ playerId: 209, playerName: "Designado", position: "DH", eligiblePositions: ["DH"], woba: 0.41 }),
    ];

    const res = selectBestDefensiveNine(poolWithout3B);
    assert.equal(res.selected.length, 9);
    assert.deepEqual(Object.values(res.assignedPositions).sort(), [...DEFENSIVE_LINEUP_SLOTS].sort());
    assert.ok(res.relaxedNote && /3B/.test(res.relaxedNote), "Debe explicar flexibilidad en 3B");
    assert.match(res.relaxedNote, /Flexibilidad posicional secundaria/i);
  });

  check("2c. selectBestDefensiveNine aplica cobertura de emergencia si no hay receptor natural", () => {
    const poolWithoutCatcher = [
      makeBatter({ playerId: 301, playerName: "Bateador 1", position: "1B", eligiblePositions: ["1B"], woba: 0.38 }),
      makeBatter({ playerId: 302, playerName: "Bateador 2", position: "2B", eligiblePositions: ["2B"], woba: 0.37 }),
      makeBatter({ playerId: 303, playerName: "Bateador 3", position: "3B", eligiblePositions: ["3B"], woba: 0.36 }),
      makeBatter({ playerId: 304, playerName: "Bateador 4", position: "SS", eligiblePositions: ["SS"], woba: 0.35 }),
      makeBatter({ playerId: 305, playerName: "Bateador 5", position: "LF", eligiblePositions: ["LF"], woba: 0.365 }),
      makeBatter({ playerId: 306, playerName: "Bateador 6", position: "CF", eligiblePositions: ["CF"], woba: 0.375 }),
      makeBatter({ playerId: 307, playerName: "Bateador 7", position: "RF", eligiblePositions: ["RF"], woba: 0.39 }),
      makeBatter({ playerId: 308, playerName: "Bateador 8", position: "DH", eligiblePositions: ["DH"], woba: 0.41 }),
      makeBatter({ playerId: 309, playerName: "Bateador 9", position: "1B", eligiblePositions: ["1B", "DH"], woba: 0.34 }),
    ];

    const res = selectBestDefensiveNine(poolWithoutCatcher);
    assert.equal(res.selected.length, 9);
    assert.deepEqual(Object.values(res.assignedPositions).sort(), [...DEFENSIVE_LINEUP_SLOTS].sort());
    assert.ok(res.relaxedNote && /C/.test(res.relaxedNote));
    assert.match(res.relaxedNote, /Cobertura de emergencia/i);
  });

  // 3. buildBestAvailableLineup: defensive_valid vs pure_bats
  check("3a. buildBestAvailableLineup distingue modo defensive_valid vs pure_bats con 4 receptores élite", () => {
    const pool = [
      ...makeStandardPool(),
      makeBatter({ playerId: 151, playerName: "Receptor Élite A", position: "C", eligiblePositions: ["C"], woba: 0.47 }),
      makeBatter({ playerId: 152, playerName: "Receptor Élite B", position: "C", eligiblePositions: ["C"], woba: 0.46 }),
      makeBatter({ playerId: 153, playerName: "Receptor Élite C", position: "C", eligiblePositions: ["C"], woba: 0.45 }),
    ];

    const defRes = buildBestAvailableLineup({ pool, mode: "defensive_valid", minPlateAppearances: 10 });
    assert.equal(defRes.modeUsed, "defensive_valid");
    assert.equal(defRes.optimization.optimizedLineup.length, 9);
    assert.deepEqual(
      Object.values(defRes.assignedPositions).sort(),
      [...DEFENSIVE_LINEUP_SLOTS].sort()
    );
    // Solo un receptor puro puede ocupar C (y como máximo otro podría ir a DH si supera a Cedeño .425, pero jamás 3 receptores puros simultáneos en campo)
    const catcherCount = defRes.optimization.optimizedLineup.filter(
      (s) => defRes.assignedPositions[s.player.playerId] === "C"
    ).length;
    assert.equal(catcherCount, 1);
    assert.equal(
      defRes.optimization.optimizedLineup.some((s) => s.player.playerId === 153),
      false,
      "El 3er receptor puro de solo C no puede desplazar posiciones defensivas"
    );

    const pureRes = buildBestAvailableLineup({ pool, mode: "pure_bats", minPlateAppearances: 10 });
    assert.equal(pureRes.modeUsed, "pure_bats");
    const pureIds = new Set(pureRes.optimization.optimizedLineup.map((s) => s.player.playerId));
    assert.equal(pureIds.has(151), true);
    assert.equal(pureIds.has(152), true);
    assert.equal(pureIds.has(153), true);
    assert.ok(
      pureRes.optimization.optimizedMetrics.teamWoba > defRes.optimization.optimizedMetrics.teamWoba,
      "Top 9 Bates Puros debe tener mayor wOBA colectivo que 9 Posiciones Válidas"
    );
  });

  // 4. minPlateAppearances filtering & progressive cascade (minPA -> 5 -> 0)
  check("4a. buildBestAvailableLineup excluye outliers de 2-3 PA y aplica cascada progresiva (20 -> 5 -> 0)", () => {
    const basePool = makeStandardPool();
    // Agregar outlier con 2 PA y wOBA .680
    const outlier = makeBatter({
      playerId: 901,
      playerName: "Outlier Emergente",
      position: "CF",
      eligiblePositions: ["CF"],
      woba: 0.68,
      obp: 0.667,
      slg: 1.0,
      plateAppearances: 2,
      atBats: 2,
    });

    const resDefault = buildBestAvailableLineup({
      pool: [...basePool, outlier],
      mode: "defensive_valid",
      minPlateAppearances: 10,
    });
    assert.equal(resDefault.effectiveMinPa, 10);
    assert.equal(
      resDefault.optimization.optimizedLineup.some((s) => s.player.playerId === 901),
      false,
      "Outlier con 2 PA debe ser excluido cuando hay >= 9 jugadores con >= 10 PA"
    );

    // Caso cascada 20 -> 5: 6 jugadores >= 20 PA, 3 jugadores con 6 PA, 1 outlier con 2 PA
    const cascadePool = basePool.slice(0, 9).map((p, idx) => ({
      ...p,
      plateAppearances: idx < 6 ? 30 : 6,
      atBats: idx < 6 ? 26 : 5,
    }));
    cascadePool.push(outlier);

    const resCascade5 = buildBestAvailableLineup({
      pool: cascadePool,
      mode: "defensive_valid",
      minPlateAppearances: 20,
    });
    assert.equal(resCascade5.effectiveMinPa, 5, "Debe bajar de 20 PA a 5 PA");
    assert.ok(resCascade5.relaxedConstraintNote?.includes("20 a 5 PA"));
    assert.equal(
      resCascade5.optimization.optimizedLineup.some((s) => s.player.playerId === 901),
      false,
      "Outlier de 2 PA sigue excluido tras relajar a 5 PA"
    );

    // Caso cascada 10 -> 0: solo 7 jugadores >= 5 PA y 2 jugadores con 3 PA
    const cascadeToZeroPool = basePool.slice(0, 9).map((p, idx) => ({
      ...p,
      plateAppearances: idx < 7 ? 15 : 3,
      atBats: idx < 7 ? 13 : 3,
    }));
    const resCascade0 = buildBestAvailableLineup({
      pool: cascadeToZeroPool,
      mode: "defensive_valid",
      minPlateAppearances: 10,
    });
    assert.equal(resCascade0.effectiveMinPa, 0, "Debe bajar hasta 0 PA para completar 9");
    assert.equal(resCascade0.optimization.optimizedLineup.length, 9);
    assert.ok(resCascade0.relaxedConstraintNote?.includes("10 a 0 PA"));
  });

  // 5. excludedPlayerIds & replacement recalculation
  check("5a. excludedPlayerIds retira al jugador del 9, recalcula reemplazo válido y lo envía a benchPlayers", () => {
    const pool = makeStandardPool();
    const initialRes = buildBestAvailableLineup({ pool, mode: "defensive_valid", minPlateAppearances: 10 });
    assert.equal(
      initialRes.optimization.optimizedLineup.some((s) => s.player.playerId === 101),
      true
    );

    // Excluir a Freddy Fermín (C #101) -> debe entrar Jhonny Pereda (C #110) para cubrir C
    const excludedRes = buildBestAvailableLineup({
      pool,
      mode: "defensive_valid",
      minPlateAppearances: 10,
      excludedPlayerIds: [101],
    });
    assert.equal(
      excludedRes.optimization.optimizedLineup.some((s) => s.player.playerId === 101),
      false
    );
    assert.equal(
      excludedRes.optimization.optimizedLineup.some((s) => s.player.playerId === 110),
      true,
      "Debe promover al receptor suplente para cubrir la receptoría"
    );
    assert.equal(excludedRes.assignedPositions[110], "C");
    assert.equal(
      excludedRes.benchPlayers.some((p) => p.playerId === 101),
      true,
      "El jugador excluido debe aparecer en benchPlayers"
    );
  });

  // 6. deltaRunsPerGame / deltaRunsPerSeason against referenceLineup
  check("6a. deltaRunsPerGame y deltaRunsPerSeason comparan Mejor Lineup Posible contra referenceLineup", () => {
    const pool = makeStandardPool();
    const weakReference = pool.slice(0, 9).map((p) => ({
      ...p,
      woba: 0.275,
      obp: 0.29,
      slg: 0.34,
      avg: 0.22,
      iso: 0.12,
      wrcPlus: 75,
    }));

    const res = buildBestAvailableLineup({
      pool,
      mode: "defensive_valid",
      minPlateAppearances: 10,
      referenceLineup: weakReference,
    });

    assert.equal(res.optimization.currentLineup.length, 9);
    assert.equal(res.optimization.optimizedLineup.length, 9);
    const expectedDeltaGame = Number(
      (res.optimization.optimizedMetrics.runsPerGame - res.optimization.currentMetrics.runsPerGame).toFixed(2)
    );
    const expectedDeltaSeason = Number(
      (res.optimization.optimizedMetrics.runsPerSeason - res.optimization.currentMetrics.runsPerSeason).toFixed(1)
    );
    assert.equal(res.optimization.deltaRunsPerGame, expectedDeltaGame);
    assert.equal(res.optimization.deltaRunsPerSeason, expectedDeltaSeason);
    assert.ok(res.optimization.deltaRunsPerGame > 0, "Debe reflejar ganancia frente a referencia más débil");
    assert.ok(res.optimization.deltaRunsPerSeason > 0);
  });

  // 7. buildActiveRosterPool crossing activeRoster + supabaseStats + feeds (playedPositions)
  check("7a. buildActiveRosterPool cruza roster activo + Supabase + MLB feed playedPositions y respeta orden por wOBA", () => {
    const activeRoster = [
      { playerId: 102, fullName: "Lenyn Sosa", primaryPosition: "3B", batSide: "R", rosterStatus: "Active" },
      { playerId: 501, fullName: "Importado Feed", primaryPosition: "OF", batSide: "L", rosterStatus: "Active" },
    ];
    const supabaseStats = [
      {
        playerId: 102,
        playerName: "Lenyn Sosa",
        playerAvatar: "",
        teamId: 695,
        teamName: "Leones",
        teamAbbr: "LEO",
        teamLogo: "",
        games: 18,
        atBats: 68,
        plateAppearances: 76,
        runs: 12,
        hits: 24,
        doubles: 5,
        triples: 0,
        homeRuns: 4,
        rbi: 15,
        walks: 7,
        strikeouts: 10,
        stolenBases: 1,
        caughtStealing: 0,
        hbp: 1,
        sf: 0,
        avg: 0.353,
        obp: 0.421,
        slg: 0.603,
        ops: 1.024,
        iso: 0.25,
        babip: 0.37,
      },
    ];
    const fakeFeeds = [
      {
        gameData: {
          players: {
            ID102: { id: 102, fullName: "Lenyn Sosa", primaryPosition: { abbreviation: "3B" }, batSide: { code: "R" } },
            ID501: { id: 501, fullName: "Importado Feed", primaryPosition: { abbreviation: "CF" }, batSide: { code: "L" } },
          },
        },
        liveData: {
          boxscore: {
            teams: {
              home: {
                players: {
                  ID102: {
                    person: { id: 102, fullName: "Lenyn Sosa" },
                    position: { abbreviation: "3B" },
                    allPositions: [{ abbreviation: "3B" }, { abbreviation: "1B" }, { abbreviation: "PH" }],
                    seasonStats: { batting: { gamesPlayed: 18, atBats: 68, plateAppearances: 76 } },
                  },
                  ID501: {
                    person: { id: 501, fullName: "Importado Feed" },
                    position: { abbreviation: "CF" },
                    allPositions: [{ abbreviation: "CF" }, { abbreviation: "LF" }, { abbreviation: "P" }],
                    seasonStats: {
                      batting: {
                        gamesPlayed: 10,
                        atBats: 35,
                        plateAppearances: 40,
                        hits: 11,
                        doubles: 2,
                        triples: 1,
                        homeRuns: 1,
                        baseOnBalls: 4,
                        hitByPitch: 1,
                        sacFlies: 0,
                        avg: ".314",
                        obp: ".400",
                        slg: ".514",
                      },
                    },
                  },
                },
              },
              away: { players: {} },
            },
          },
        },
      },
    ];

    const pool = buildActiveRosterPool({
      activeRoster,
      supabaseStats,
      feeds: fakeFeeds,
      teamId: 695,
    });

    assert.equal(pool.length, 2);
    const sosa = pool.find((p) => p.playerId === 102);
    const importado = pool.find((p) => p.playerId === 501);
    assert.ok(sosa);
    assert.ok(importado);
    assert.equal(sosa.statsSource, "supabase");
    assert.equal(sosa.plateAppearances, 76);
    assert.deepEqual(sosa.eligiblePositions, ["3B", "1B"]);
    assert.equal(importado.statsSource, "mlb");
    assert.equal(importado.plateAppearances, 40);
    assert.deepEqual(importado.eligiblePositions, ["OF", "CF", "LF"]);
    assert.ok(pool[0].woba >= pool[1].woba, "Debe venir ordenado por wOBA descendente");
  });

  check("7b. buildActiveRosterPool hace fallback a supabaseStats cuando activeRoster viene vacío", () => {
    const supabaseStats = [
      {
        playerId: 777,
        playerName: "Bateador Local",
        playerAvatar: "",
        teamId: 695,
        teamName: "Leones",
        teamAbbr: "LEO",
        teamLogo: "",
        games: 12,
        atBats: 40,
        plateAppearances: 44,
        runs: 6,
        hits: 12,
        doubles: 2,
        triples: 0,
        homeRuns: 1,
        rbi: 7,
        walks: 4,
        strikeouts: 8,
        stolenBases: 0,
        caughtStealing: 0,
        hbp: 0,
        sf: 0,
        avg: 0.3,
        obp: 0.364,
        slg: 0.425,
        ops: 0.789,
        iso: 0.125,
        babip: 0.34,
      },
      {
        playerId: 778,
        playerName: "Jugador Otro Equipo",
        playerAvatar: "",
        teamId: 696,
        teamName: "Navegantes",
        teamAbbr: "MAG",
        teamLogo: "",
        games: 12,
        atBats: 40,
        plateAppearances: 44,
        runs: 6,
        hits: 15,
        doubles: 3,
        triples: 0,
        homeRuns: 2,
        rbi: 9,
        walks: 4,
        strikeouts: 6,
        stolenBases: 0,
        caughtStealing: 0,
        hbp: 0,
        sf: 0,
        avg: 0.375,
        obp: 0.432,
        slg: 0.6,
        ops: 1.032,
        iso: 0.225,
        babip: 0.4,
      },
    ];

    const pool = buildActiveRosterPool({
      activeRoster: [],
      supabaseStats,
      feeds: [],
      teamId: 695,
    });
    assert.equal(pool.length, 1);
    assert.equal(pool[0].playerId, 777);
    assert.equal(pool[0].rosterStatus, "Activo (Fallback)");
  });

  // 8. fetchTeamActiveRosterBatters + getDynamicBullpenAndLineups integration (mocked fetch)
  const originalFetch = globalThis.fetch;
  try {
    await checkAsync("8a. fetchTeamActiveRosterBatters filtra lanzadores y maneja fallos de red", async () => {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            roster: [
              {
                person: { id: 1, fullName: "Lanzador A", batSide: { code: "R" } },
                position: { abbreviation: "P", code: "1", type: "Pitcher" },
                status: { description: "Active" },
              },
              {
                person: { id: 2, fullName: "Bateador B", batSide: { code: "S" } },
                position: { abbreviation: "SS", code: "6", type: "Infielder" },
                status: { description: "Active" },
              },
            ],
          }),
          { status: 200 }
        );

      const okRoster = await fetchTeamActiveRosterBatters(695, 2026);
      assert.equal(okRoster.length, 1);
      assert.equal(okRoster[0].playerId, 2);
      assert.equal(okRoster[0].primaryPosition, "SS");
      assert.equal(okRoster[0].batSide, "S");

      globalThis.fetch = async () => {
        throw new Error("Network timeout");
      };
      const errRoster = await fetchTeamActiveRosterBatters(695, 2026);
      assert.deepEqual(errRoster, []);
    });

    await checkAsync("8b. getDynamicBullpenAndLineups expone activeRosterPool en lineups", async () => {
      const todayVet = getVenezuelanToday().dateString;
      globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes("rosterType=active")) {
          return new Response(
            JSON.stringify({
              roster: makeStandardPool().map((p) => ({
                person: { id: p.playerId, fullName: p.playerName, batSide: { code: p.bats } },
                position: { abbreviation: p.position, code: "6", type: "Infielder" },
                status: { description: "Active" },
              })),
            }),
            { status: 200 }
          );
        }
        if (u.includes("/schedule?")) {
          return new Response(
            JSON.stringify({
              dates: [
                {
                  date: todayVet,
                  games: [],
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({}), { status: 404 });
      };

      const data = await getDynamicBullpenAndLineups(2026, { teamId: 695 });
      assert.ok(Array.isArray(data.lineups.activeRosterPool));
      assert.equal(data.lineups.activeRosterPool.length, 11);
      assert.ok(data.lineups.activeRosterPool[0].eligiblePositions.length >= 1);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(`🎉 ${passed} pruebas completadas exitosamente.`);
}

await runTests();
