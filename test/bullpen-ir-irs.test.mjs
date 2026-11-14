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
let mockSupabaseClient = null;

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
    let target = null;
    if (specifier.startsWith("@/")) {
      target = resolveTsFile(path.join(repoRoot, "src", specifier.slice(2)));
    } else if (specifier.startsWith("./") || specifier.startsWith("../")) {
      target = resolveTsFile(path.resolve(path.dirname(absPath), specifier));
    }

    if (target) {
      const loaded = loadLocalModule(target);
      if (target.endsWith(path.join("src", "lib", "supabase.ts"))) {
        return {
          ...loaded,
          get supabase() {
            return mockSupabaseClient ?? loaded.supabase;
          },
        };
      }
      return loaded;
    }

    return nodeRequire(specifier);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(mod.exports, localRequire, mod, absPath, path.dirname(absPath));
  return mod.exports;
}

const { getBullpenAndLineups } = loadLocalModule(path.join(repoRoot, "src/lib/bullpen.ts"));
const { extractRelieverEntryInnings, getDynamicBullpenAndLineups } = loadLocalModule(
  path.join(repoRoot, "src/lib/game-feed-service.ts")
);

function createMockSupabase(gamesBySeason) {
  return {
    from(table) {
      assert.equal(table, "games");
      const state = { season: null, teamId: null, limitVal: null };
      const execute = () => {
        const rows = (gamesBySeason[state.season] || []).filter(
          (g) => Number(g.home_team_id) === state.teamId || Number(g.away_team_id) === state.teamId
        );
        return Promise.resolve({
          data: state.limitVal ? rows.slice(0, state.limitVal) : rows,
          error: null,
        });
      };
      const builder = {
        select() {
          return builder;
        },
        eq(col, val) {
          if (col === "season") state.season = val;
          return builder;
        },
        or(expr) {
          const match = String(expr).match(/home_team_id\.eq\.(\d+),away_team_id\.eq\.(\d+)/);
          if (match) state.teamId = Number(match[1]);
          return builder;
        },
        in() {
          return builder;
        },
        order() {
          return builder;
        },
        limit(n) {
          state.limitVal = n;
          return builder;
        },
        then(onFulfilled, onRejected) {
          return execute().then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  };
}

function makePitchingFeed({
  gamePk,
  gameDate,
  homeId,
  awayId,
  homeScore = 4,
  awayScore = 2,
  homePitchers = [],
  awayPitchers = [],
  plays = [],
}) {
  const playersHome = {};
  for (const p of homePitchers) {
    playersHome[`ID${p.id}`] = {
      person: { id: p.id, fullName: p.name },
      position: { abbreviation: "P" },
      stats: {
        pitching: {
          ...(p.gamesStarted !== undefined ? { gamesStarted: p.gamesStarted } : {}),
          gamesPitched: 1,
          inheritedRunners: p.ir ?? 0,
          inheritedRunnersScored: p.irs ?? 0,
        },
      },
    };
  }

  const playersAway = {};
  for (const p of awayPitchers) {
    playersAway[`ID${p.id}`] = {
      person: { id: p.id, fullName: p.name },
      position: { abbreviation: "P" },
      stats: {
        pitching: {
          ...(p.gamesStarted !== undefined ? { gamesStarted: p.gamesStarted } : {}),
          gamesPitched: 1,
          inheritedRunners: p.ir ?? 0,
          inheritedRunnersScored: p.irs ?? 0,
        },
      },
    };
  }

  return {
    gamePk,
    gameData: {
      game: { pk: gamePk },
      status: { detailedState: "Final", abstractGameState: "Final" },
      datetime: { officialDate: gameDate },
      teams: {
        home: { id: homeId, name: homeId === 695 ? "Leones del Caracas" : "Navegantes del Magallanes", abbreviation: homeId === 695 ? "CAR" : "MAG" },
        away: { id: awayId, name: awayId === 695 ? "Leones del Caracas" : "Navegantes del Magallanes", abbreviation: awayId === 695 ? "CAR" : "MAG" },
      },
    },
    liveData: {
      linescore: {
        teams: { home: { runs: homeScore }, away: { runs: awayScore } },
      },
      boxscore: {
        teams: {
          home: {
            teamStats: { batting: { runs: homeScore } },
            pitchers: homePitchers.map((p) => p.id),
            players: playersHome,
            battingOrder: [],
          },
          away: {
            teamStats: { batting: { runs: awayScore } },
            pitchers: awayPitchers.map((p) => p.id),
            players: playersAway,
            battingOrder: [],
          },
        },
      },
      plays: { allPlays: plays },
    },
  };
}

let passed = 0;

function check(name, fn) {
  fn();
  passed += 1;
  console.log(`✅ ${name}`);
}

async function checkAsync(name, fn) {
  await fn();
  passed += 1;
  console.log(`✅ ${name}`);
}

async function runTests() {
  console.log("🧪 Ejecutando pruebas unitarias de Bullpen (IR / IRS / Inning / Multi-Equipo)...");

  // 1. extractRelieverEntryInnings
  check("1a. extractRelieverEntryInnings separa half-innings top (home) y bottom (away) y conserva primer inning", () => {
    const feed = makePitchingFeed({
      gamePk: 900001,
      gameDate: "2026-11-05",
      homeId: 695,
      awayId: 696,
      plays: [
        // Top 1-4: abridor home (101)
        { about: { halfInning: "top", inning: 1 }, matchup: { pitcher: { id: 101 } } },
        // Bottom 1: abridor away (201)
        { about: { halfInning: "bottom", inning: 1 }, matchup: { pitcher: { id: 201 } } },
        // Top 5: relevista home 102 entra en el 5to y sigue en el 6to
        { about: { halfInning: "top", inning: 5 }, matchup: { pitcher: { id: 102 } } },
        { about: { halfInning: "top", inning: 6 }, matchup: { pitcher: { id: 102 } } },
        // Bottom 6: relevista away 202 entra en el 6to y sigue en el 7mo
        { about: { halfInning: "bottom", inning: 6 }, matchup: { pitcher: { id: 202 } } },
        { about: { halfInning: "bottom", inning: 7 }, matchup: { pitcher: { id: 202 } } },
        // Top 8: relevista home 103 entra en el 8vo
        { about: { halfInning: "top", inning: 8 }, matchup: { pitcher: { id: 103 } } },
        // Bottom 9: relevista away 203 entra en el 9no
        { about: { halfInning: "bottom", inning: 9 }, matchup: { pitcher: { id: 203 } } },
      ],
    });

    const homeEntries = extractRelieverEntryInnings(feed, 695);
    assert.equal(homeEntries.get(101), 1);
    assert.equal(homeEntries.get(102), 5);
    assert.equal(homeEntries.get(103), 8);
    assert.equal(homeEntries.has(201), false);
    assert.equal(homeEntries.has(202), false);

    const awayEntries = extractRelieverEntryInnings(feed, 696);
    assert.equal(awayEntries.get(201), 1);
    assert.equal(awayEntries.get(202), 6);
    assert.equal(awayEntries.get(203), 9);
    assert.equal(awayEntries.has(102), false);

    const otherEntries = extractRelieverEntryInnings(feed, 699);
    assert.equal(otherEntries.size, 0);
  });

  // 2. getBullpenAndLineups with overrideData
  check("2a. getBullpenAndLineups con overrideData vacío no hace fallback a snapshot congelado", () => {
    const empty = getBullpenAndLineups(2026, 695, {
      bullpen_records: [],
      lineup_records: [],
    });
    assert.equal(empty.bullpen.kpis.totalIr, 0);
    assert.equal(empty.bullpen.kpis.totalIrs, 0);
    assert.equal(empty.bullpen.kpis.irsPct, "0.0%");
    assert.equal(empty.bullpen.relievers.length, 0);
    assert.equal(empty.bullpen.logs.length, 0);
    assert.equal(empty.lineups.kpis.totalGames, 0);
  });

  check("2b. getBullpenAndLineups agrupa por id: evitando colisión de homónimos", () => {
    const result = getBullpenAndLineups(2026, 695, {
      bullpen_records: [
        {
          team_id: 695,
          game_pk: 1,
          game_date: "2026-10-20",
          opposing_team: "Magallanes",
          pitcher_id: 1001,
          pitcher_name: "Carlos Pérez",
          inning: 6,
          inherited_runners: 2,
          inherited_scored: 0,
        },
        {
          team_id: 695,
          game_pk: 2,
          game_date: "2026-10-22",
          opposing_team: "Cardenales",
          pitcher_id: 1002,
          pitcher_name: "Carlos Pérez",
          inning: 8,
          inherited_runners: 3,
          inherited_scored: 2,
        },
      ],
      lineup_records: [],
    });

    assert.equal(result.bullpen.relievers.length, 2);
    const byId = new Map(result.bullpen.relievers.map((r) => [r.pitcherId, r]));
    assert.equal(byId.get(1001)?.ir, 2);
    assert.equal(byId.get(1001)?.irs, 0);
    assert.equal(byId.get(1002)?.ir, 3);
    assert.equal(byId.get(1002)?.irs, 2);
  });

  check("2c. getBullpenAndLineups ordena qualifiedRelievers por ratio exacto irs/ir sobre porcentaje redondeado", () => {
    // 5/41 = 12.195% -> 12.2%; 6/49 = 12.245% -> 12.2%.
    // El ordenamiento viejo por irsPctNum (ambos 12.2) + b.ir - a.ir elegía incorrectamente a Pitcher 49.
    const result = getBullpenAndLineups(2026, 695, {
      bullpen_records: [
        {
          team_id: 695,
          game_pk: 10,
          game_date: "2026-10-25",
          opposing_team: "Tiburones",
          pitcher_id: 2001,
          pitcher_name: "Relevista Exacto",
          inning: 7,
          inherited_runners: 41,
          inherited_scored: 5,
        },
        {
          team_id: 695,
          game_pk: 11,
          game_date: "2026-10-26",
          opposing_team: "Tiburones",
          pitcher_id: 2002,
          pitcher_name: "Relevista MayorIR",
          inning: 8,
          inherited_runners: 49,
          inherited_scored: 6,
        },
      ],
      lineup_records: [],
    });

    assert.equal(result.bullpen.kpis.bestReliever, "Relevista Exacto");
    assert.equal(result.bullpen.kpis.bestRelieverSub, "12.2% IRS (5/41 anotaron)");
  });

  check("2d. getBullpenAndLineups descarta filas 0-IR de logs y retiene >50 salidas reales (60 IR logs)", () => {
    const records = [];
    for (let i = 1; i <= 10; i++) {
      records.push({
        team_id: 695,
        game_pk: 3000 + i,
        game_date: "2026-10-15",
        opposing_team: "Águilas",
        pitcher_id: 3001,
        pitcher_name: "Limpio Cero",
        inning: 7,
        inherited_runners: 0,
        inherited_scored: 0,
      });
    }
    for (let i = 1; i <= 60; i++) {
      records.push({
        team_id: 695,
        game_pk: 4000 + i,
        game_date: "2026-10-28",
        opposing_team: "Tigres",
        pitcher_id: 3002,
        pitcher_name: "Apagafuegos Activo",
        inning: (i % 4) + 6,
        inherited_runners: 1,
        inherited_scored: i % 3 === 0 ? 1 : 0,
      });
    }

    const result = getBullpenAndLineups(2026, 695, {
      bullpen_records: records,
      lineup_records: [],
    });

    assert.equal(result.bullpen.logs.length, 60);
    assert.ok(result.bullpen.logs.every((l) => l.ir > 0 || l.irs > 0));
    assert.equal(result.bullpen.kpis.totalIr, 60);
    assert.equal(result.bullpen.kpis.totalIrs, 20);
  });

  // 3. getDynamicBullpenAndLineups end-to-end with mocked Supabase & MLB feeds
  const originalFetch = globalThis.fetch;
  try {
    await checkAsync("3a. getDynamicBullpenAndLineups respeta targetTeamId (696 vs 695), guardia pitchersList[0], filtro 0-IR e innings reales", async () => {
      const game695 = 950001;
      const game696 = 950002;

      const feed695 = makePitchingFeed({
        gamePk: game695,
        gameDate: "2026-11-08",
        homeId: 695,
        awayId: 699,
        homePitchers: [
          // Abridor sin gamesStarted explícito (prueba fallback pitchersList[0] === pId):
          // aunque tenga IR ficticio, NO debe aparecer como relevista.
          { id: 5001, name: "Abridor Caracas", gamesStarted: undefined, ir: 2, irs: 1 },
          // Relevista con 0 IR: debe ser filtrado fuera de bpRecords / logs.
          { id: 5002, name: "Relevista Sin IR", gamesStarted: 0, ir: 0, irs: 0 },
          // Relevista con IR real entrando en el 7mo inning.
          { id: 5003, name: "Relevista Caracas", gamesStarted: 0, ir: 3, irs: 1 },
        ],
        plays: [
          { about: { halfInning: "top", inning: 1 }, matchup: { pitcher: { id: 5001 } } },
          { about: { halfInning: "top", inning: 6 }, matchup: { pitcher: { id: 5002 } } },
          { about: { halfInning: "top", inning: 7 }, matchup: { pitcher: { id: 5003 } } },
          { about: { halfInning: "top", inning: 8 }, matchup: { pitcher: { id: 5003 } } },
        ],
      });

      const feed696 = makePitchingFeed({
        gamePk: game696,
        gameDate: "2026-11-09",
        homeId: 698,
        awayId: 696,
        homePitchers: [{ id: 6099, name: "Rival", gamesStarted: 1, ir: 1, irs: 1 }],
        awayPitchers: [
          { id: 6001, name: "Abridor Magallanes", gamesStarted: 1, ir: 0, irs: 0 },
          { id: 6002, name: "Relevista Magallanes A", gamesStarted: 0, ir: 2, irs: 0 },
          { id: 6003, name: "Relevista Magallanes B", gamesStarted: 0, ir: 4, irs: 2 },
        ],
        plays: [
          { about: { halfInning: "bottom", inning: 1 }, matchup: { pitcher: { id: 6001 } } },
          { about: { halfInning: "bottom", inning: 6 }, matchup: { pitcher: { id: 6002 } } },
          { about: { halfInning: "bottom", inning: 9 }, matchup: { pitcher: { id: 6003 } } },
        ],
      });

      mockSupabaseClient = createMockSupabase({
        2026: [
          { id: game695, game_date: "2026-11-08", season: 2026, status: "Final", home_team_id: 695, away_team_id: 699, home_score: 4, away_score: 2 },
          { id: game696, game_date: "2026-11-09", season: 2026, status: "Final", home_team_id: 698, away_team_id: 696, home_score: 2, away_score: 4 },
        ],
      });

      globalThis.fetch = async (url) => {
        const u = String(url);
        if (u.includes(`/game/${game695}/feed/live`)) {
          return new Response(JSON.stringify(feed695), { status: 200 });
        }
        if (u.includes(`/game/${game696}/feed/live`)) {
          return new Response(JSON.stringify(feed696), { status: 200 });
        }
        return new Response(JSON.stringify({ dates: [], roster: [] }), { status: 200 });
      };

      const data695 = await getDynamicBullpenAndLineups(2026, { teamId: 695 });
      assert.equal(data695.bullpen.kpis.totalIr, 3);
      assert.equal(data695.bullpen.kpis.totalIrs, 1);
      assert.equal(data695.bullpen.relievers.length, 1);
      assert.equal(data695.bullpen.relievers[0].pitcherId, 5003);
      assert.equal(data695.bullpen.logs.length, 1);
      assert.equal(data695.bullpen.logs[0].inning, 7);

      const data696 = await getDynamicBullpenAndLineups(2026, { teamId: 696 });
      assert.equal(data696.bullpen.kpis.totalIr, 6);
      assert.equal(data696.bullpen.kpis.totalIrs, 2);
      assert.equal(data696.bullpen.kpis.irsPct, "33.3%");
      assert.equal(data696.bullpen.relievers.length, 2);
      assert.deepEqual(
        data696.bullpen.logs.map((l) => [l.pitcher, l.inning, l.ir, l.irs]),
        [
          ["Relevista Magallanes A", 6, 2, 0],
          ["Relevista Magallanes B", 9, 4, 2],
        ]
      );
    });

    await checkAsync("3b. getDynamicBullpenAndLineups sin feeds en season >= 2026 retorna 0 IR/IRS (sin fallback a snapshot 2026)", async () => {
      mockSupabaseClient = createMockSupabase({ 2026: [] });
      globalThis.fetch = async () => new Response(JSON.stringify({ dates: [], roster: [] }), { status: 200 });

      const data = await getDynamicBullpenAndLineups(2026, { teamId: 695 });
      assert.equal(data.bullpen.kpis.totalIr, 0);
      assert.equal(data.bullpen.kpis.totalIrs, 0);
      assert.equal(data.bullpen.logs.length, 0);
      assert.equal(data.bullpen.relievers.length, 0);
    });
  } finally {
    mockSupabaseClient = null;
    globalThis.fetch = originalFetch;
  }

  console.log(`🎉 ${passed} pruebas unitarias de bullpen IR/IRS completadas exitosamente.`);
}

await runTests();
