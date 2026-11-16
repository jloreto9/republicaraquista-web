import assert from "node:assert/strict";

const LEONES_ID = 695;
const AGUILAS_ID = 692;
const TIGRES_ID = 699;
const BRAVOS_ID = 697;
const JOSE_RONDON_ID = 602922;
const HAROLD_CASTRO_ID = 605612;
const NORWITH_GUDINO_ID = 660508;

type MockRow = Record<string, unknown>;

interface MockDbState {
  games: MockRow[];
  batting_stats: MockRow[];
  pitching_stats: MockRow[];
  upsertCalls: Array<{ table: string; rows: MockRow[]; onConflict?: string }>;
  failBatchUpsertTables: Set<string>;
}

interface ThenableQuery {
  select: () => ThenableQuery;
  eq: (col: string, val: unknown) => ThenableQuery;
  in: (col: string, vals: unknown[]) => ThenableQuery;
  order: () => ThenableQuery;
  limit: (n: number) => ThenableQuery;
  then: <TResult1 = { data: MockRow[]; error: null }, TResult2 = never>(
    onFulfilled?: ((value: { data: MockRow[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function createThenableQuery(rows: MockRow[]): ThenableQuery {
  let filtered = [...rows];
  const builder: ThenableQuery = {
    select() {
      return builder;
    },
    eq(col: string, val: unknown) {
      filtered = filtered.filter((r) => {
        if (col === "season") return Number(r.season ?? 2026) === Number(val);
        return r[col] === val;
      });
      return builder;
    },
    in(col: string, vals: unknown[]) {
      const set = new Set((vals || []).map((v) => String(v)));
      filtered = filtered.filter((r) => set.has(String(r[col])));
      return builder;
    },
    order() {
      return builder;
    },
    limit(n: number) {
      filtered = filtered.slice(0, n);
      return builder;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function buildSyntheticFeed(params: {
  gamePk: number;
  officialDate: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  rondonStats?: { ab: number; h: number; hr: number; rbi: number; r: number; bb?: number };
  castroStats?: { ab: number; h: number; hr?: number; rbi?: number; r?: number };
  gudinoStats?: { ip: string; er: number; so: number; bb: number; h?: number };
}) {
  const {
    gamePk,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    rondonStats = { ab: 4, h: 2, hr: 1, rbi: 2, r: 1, bb: 0 },
    castroStats = { ab: 4, h: 1, hr: 0, rbi: 1, r: 1 },
    gudinoStats = { ip: "2.1", er: 0, so: 3, bb: 0, h: 1 },
  } = params;

  const homePlayers: Record<string, Record<string, unknown>> = {
    [`ID${JOSE_RONDON_ID}`]: {
      person: { id: JOSE_RONDON_ID, fullName: "José Rondón" },
      position: { abbreviation: "CF" },
      jerseyNumber: "37",
      stats: {
        batting: {
          plateAppearances: rondonStats.ab + (rondonStats.bb ?? 0),
          atBats: rondonStats.ab,
          runs: rondonStats.r,
          hits: rondonStats.h,
          doubles: 0,
          triples: 0,
          homeRuns: rondonStats.hr,
          rbi: rondonStats.rbi,
          baseOnBalls: rondonStats.bb ?? 0,
          strikeOuts: 1,
          stolenBases: 0,
          caughtStealing: 0,
          hitByPitch: 0,
          sacFlies: 0,
          sacBunts: 0,
        },
      },
    },
    [`ID${HAROLD_CASTRO_ID}`]: {
      person: { id: HAROLD_CASTRO_ID, fullName: "Harold Castro" },
      position: { abbreviation: "2B" },
      jerseyNumber: "14",
      stats: {
        batting: {
          plateAppearances: castroStats.ab,
          atBats: castroStats.ab,
          runs: castroStats.r ?? 1,
          hits: castroStats.h,
          doubles: 1,
          triples: 0,
          homeRuns: castroStats.hr ?? 0,
          rbi: castroStats.rbi ?? 1,
          baseOnBalls: 0,
          strikeOuts: 0,
          stolenBases: 0,
          caughtStealing: 0,
          hitByPitch: 0,
          sacFlies: 0,
          sacBunts: 0,
        },
      },
    },
    // Jugador de banca sin actividad (debe ser excluido de batting_stats)
    ID999001: {
      person: { id: 999001, fullName: "Banca Inactiva" },
      position: { abbreviation: "C" },
      stats: {
        batting: {
          plateAppearances: 0,
          atBats: 0,
          runs: 0,
          hits: 0,
          baseOnBalls: 0,
        },
      },
    },
    [`ID${NORWITH_GUDINO_ID}`]: {
      person: { id: NORWITH_GUDINO_ID, fullName: "Norwith Gudiño" },
      position: { abbreviation: "P" },
      jerseyNumber: "55",
      stats: {
        pitching: {
          inningsPitched: gudinoStats.ip,
          hits: gudinoStats.h ?? 1,
          runs: gudinoStats.er,
          earnedRuns: gudinoStats.er,
          baseOnBalls: gudinoStats.bb,
          strikeOuts: gudinoStats.so,
          homeRuns: 0,
          hitBatsmen: 0,
          wildPitches: 0,
          balks: 0,
          numberOfPitches: 32,
          battersFaced: 8,
        },
      },
    },
    // Relevista sin acción (0.0 IP, 0 BF -> debe ser excluido)
    ID999002: {
      person: { id: 999002, fullName: "Bullpen Sin Acción" },
      position: { abbreviation: "P" },
      stats: {
        pitching: {
          inningsPitched: "0.0",
          hits: 0,
          runs: 0,
          earnedRuns: 0,
          baseOnBalls: 0,
          strikeOuts: 0,
          numberOfPitches: 0,
          battersFaced: 0,
        },
      },
    },
  };

  const awayPlayers: Record<string, Record<string, unknown>> = {
    ID888001: {
      person: { id: 888001, fullName: "Bateador Rival" },
      position: { abbreviation: "RF" },
      stats: {
        batting: {
          plateAppearances: 4,
          atBats: 4,
          runs: awayScore > 0 ? 1 : 0,
          hits: 1,
          rbi: awayScore > 0 ? 1 : 0,
        },
      },
    },
    ID888002: {
      person: { id: 888002, fullName: "Lanzador Rival" },
      position: { abbreviation: "P" },
      stats: {
        pitching: {
          inningsPitched: "5.0",
          hits: 7,
          runs: homeScore,
          earnedRuns: homeScore,
          baseOnBalls: 2,
          strikeOuts: 4,
          numberOfPitches: 85,
          battersFaced: 24,
        },
      },
    },
  };

  return {
    gamePk,
    gameData: {
      game: { pk: gamePk, season: "2026", type: "R" },
      status: { detailedState: "Final" },
      teams: {
        home: { id: homeTeamId, name: "Home Team" },
        away: { id: awayTeamId, name: "Away Team" },
      },
    },
    liveData: {
      linescore: {
        scheduledInnings: 9,
        currentInning: 9,
        innings: Array.from({ length: 9 }, (_, idx) => ({
          num: idx + 1,
          home: { runs: idx === 0 ? homeScore : 0 },
          away: { runs: idx === 1 ? awayScore : 0 },
        })),
        teams: {
          home: { runs: homeScore },
          away: { runs: awayScore },
        },
      },
      decisions: {
        winner: { id: NORWITH_GUDINO_ID, fullName: "Norwith Gudiño" },
        loser: { id: 888002, fullName: "Lanzador Rival" },
      },
      boxscore: {
        teams: {
          home: {
            team: { id: homeTeamId },
            batters: [JOSE_RONDON_ID, HAROLD_CASTRO_ID, 999001],
            pitchers: [NORWITH_GUDINO_ID, 999002],
            players: homePlayers,
          },
          away: {
            team: { id: awayTeamId },
            batters: [888001],
            pitchers: [888002],
            players: awayPlayers,
          },
        },
      },
      plays: {
        allPlays: [
          {
            about: { inning: 1, halfInning: "bottom", isComplete: true },
            result: {
              event: "Home Run",
              eventType: "home_run",
              homeScore,
              awayScore: 0,
              rbi: 2,
              description: "José Rondón conecta cuadrangular.",
            },
            matchup: {
              batter: { id: JOSE_RONDON_ID, fullName: "José Rondón" },
              pitcher: { id: 888002, fullName: "Lanzador Rival" },
            },
          },
          {
            about: { inning: 9, halfInning: "top", isComplete: true },
            result: {
              event: "Strikeout",
              eventType: "strikeout",
              homeScore,
              awayScore,
              rbi: 0,
            },
            matchup: {
              batter: { id: 888001, fullName: "Bateador Rival" },
              pitcher: { id: NORWITH_GUDINO_ID, fullName: "Norwith Gudiño" },
            },
          },
        ],
      },
    },
  };
}

async function runTests() {
  console.log("=== Ejecutando suite de pruebas: Sincronización Canónica Post-Juego (Spec 026) ===");

  const prevEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://mock-supabase.local";
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
  }

  const supabaseMod = await import("../supabase");
  const leonesMod = await import("../leones-stats-service");
  const streaksMod = await import("../streaks-service");

  const {
    supabase,
    supabaseAdmin,
    clearCanonicalSyncCache,
    extractBoxscoreRowsFromFeed,
    getCanonicalSeasonGames,
    getCanonicalPlayedGames,
    getCanonicalGameBoxscoreRows,
    getStandings,
    reconciledBoxscoreCache,
  } = supabaseMod;
  const {
    getLeonesAdvancedStats,
    getHeadToHeadRecords,
    getWeeklyRecords,
    getBroadcastChannelRecords,
  } = leonesMod;
  const { getStreaksData } = streaksMod;

  assert.ok(supabase, "El cliente supabase debe existir para probar la reconciliación completa");
  assert.ok(supabaseAdmin, "El cliente supabaseAdmin debe existir para write-through");

  interface MutableSupabaseClient {
    from: (table: string) => unknown;
  }

  const mutableSupabase = supabase as unknown as MutableSupabaseClient;
  const mutableAdmin = supabaseAdmin as unknown as MutableSupabaseClient;

  const originalSupabaseFrom = mutableSupabase.from;
  const originalAdminFrom = mutableAdmin.from;
  const originalFetch = globalThis.fetch;

  const dbState: MockDbState = {
    games: [],
    batting_stats: [],
    pitching_stats: [],
    upsertCalls: [],
    failBatchUpsertTables: new Set<string>(),
  };

  let scheduleHandler: () => Record<string, unknown> = () => ({ dates: [] });
  let feedHandler: (gamePk: number) => Record<string, unknown> | null = () => null;
  let scheduleFetchCount = 0;

  mutableSupabase.from = (table: string) => {
    if (table === "games") return createThenableQuery(dbState.games);
    if (table === "batting_stats") return createThenableQuery(dbState.batting_stats);
    if (table === "pitching_stats") return createThenableQuery(dbState.pitching_stats);
    return createThenableQuery([]);
  };

  mutableAdmin.from = (table: string) => ({
    upsert(payload: MockRow | MockRow[], options?: { onConflict?: string }) {
      const rows = Array.isArray(payload) ? payload : [payload];
      dbState.upsertCalls.push({ table, rows, onConflict: options?.onConflict });
      if (Array.isArray(payload) && dbState.failBatchUpsertTables.has(table)) {
        return Promise.resolve({ error: { message: `Simulated batch error on ${table}` } });
      }
      return Promise.resolve({ error: null });
    },
  });

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/api/v1/schedule")) {
      scheduleFetchCount++;
      const payload = scheduleHandler();
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    const feedMatch = url.match(/\/api\/v1\.1\/game\/(\d+)\/feed\/live/);
    if (feedMatch) {
      const gamePk = Number(feedMatch[1]);
      const feed = feedHandler(gamePk);
      if (!feed) {
        return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
      }
      return new Response(JSON.stringify(feed), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.includes("/api/v1/standings")) {
      return new Response(JSON.stringify({ records: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Not mocked", { status: 404 });
  }) as typeof fetch;

  try {
    // ── 1. EXTRACCIÓN Y DEDUPLICACIÓN DE BOXSCORES DESDE feed/live ──────────
    console.log("1. Probando extractBoxscoreRowsFromFeed y getCanonicalGameBoxscoreRows sin duplicados...");
    clearCanonicalSyncCache();

    const syntheticFeed = buildSyntheticFeed({
      gamePk: 970115,
      officialDate: "2026-11-15",
      homeTeamId: LEONES_ID,
      awayTeamId: AGUILAS_ID,
      homeScore: 6,
      awayScore: 2,
    });

    const extracted = extractBoxscoreRowsFromFeed(syntheticFeed, 2026, "regular");
    assert.equal(extracted.gamePk, 970115);
    assert.equal(extracted.players.length, 7, "Debe extraer los 7 jugadores del boxscore sin duplicar");
    assert.equal(
      extracted.batting_stats.length,
      3,
      "Debe extraer solo bateadores con actividad real (Rondón, Castro y rival; excluye banca en 0)"
    );
    assert.equal(
      extracted.pitching_stats.length,
      2,
      "Debe extraer solo lanzadores con actividad real (Gudiño y rival; excluye bullpen en 0.0 IP)"
    );

    const rondonExtracted = extracted.batting_stats.find((b) => b.player_id === JOSE_RONDON_ID);
    assert.ok(rondonExtracted, "José Rondón (602922) debe estar en batting_stats extraído");
    assert.equal(rondonExtracted.ab, 4);
    assert.equal(rondonExtracted.h, 2);
    assert.equal(rondonExtracted.hr, 1);
    assert.equal(rondonExtracted.rbi, 2);

    const gudinoExtracted = extracted.pitching_stats.find((p) => p.player_id === NORWITH_GUDINO_ID);
    assert.ok(gudinoExtracted, "Norwith Gudiño debe estar en pitching_stats extraído");
    assert.equal(gudinoExtracted.ip_decimal, 2.33, "2.1 IP debe normalizarse a 2.33 ip_decimal");

    // ── 2. DEDUPLICACIÓN DE gamePk POSPUESTO/REPROGRAMADO + officialDate ────
    console.log("2. Probando deduplicación de gamePk reprogramado (Postponed vs Final) y officialDate...");
    clearCanonicalSyncCache();
    scheduleFetchCount = 0;
    dbState.upsertCalls = [];

    dbState.games = [
      {
        id: 970020,
        game_pk: 970020,
        season: 2026,
        game_date: "2026-11-05",
        game_datetime: "2026-11-05T23:00:00Z",
        game_type: "regular",
        status: "Postponed",
        home_team_id: LEONES_ID,
        away_team_id: BRAVOS_ID,
        home_score: null,
        away_score: null,
      },
    ];
    dbState.batting_stats = [];
    dbState.pitching_stats = [];

    const rescheduledFeed = buildSyntheticFeed({
      gamePk: 970020,
      officialDate: "2026-11-06",
      homeTeamId: LEONES_ID,
      awayTeamId: BRAVOS_ID,
      homeScore: 4,
      awayScore: 2,
    });

    scheduleHandler = () => ({
      dates: [
        {
          date: "2026-11-05",
          games: [
            {
              gamePk: 970020,
              gameType: "R",
              officialDate: "2026-11-05",
              gameDate: "2026-11-05T23:00:00Z",
              status: { detailedState: "Postponed" },
              teams: {
                home: { team: { id: LEONES_ID } },
                away: { team: { id: BRAVOS_ID } },
              },
            },
          ],
        },
        {
          date: "2026-11-06",
          games: [
            {
              gamePk: 970020,
              gameType: "R",
              officialDate: "2026-11-06",
              gameDate: "2026-11-07T01:30:00Z",
              status: { detailedState: "Final" },
              teams: {
                home: { team: { id: LEONES_ID }, score: 4 },
                away: { team: { id: BRAVOS_ID }, score: 2 },
              },
            },
          ],
        },
      ],
    });
    feedHandler = (pk) => (pk === 970020 ? rescheduledFeed : null);

    const dedupedGames = await getCanonicalSeasonGames(2026, "regular");
    const matching970020 = dedupedGames.filter((g) => Number(g.id) === 970020);
    assert.equal(matching970020.length, 1, "El gamePk reprogramado 970020 debe aparecer exactamente una vez");
    assert.equal(matching970020[0].status, "Final", "Debe priorizar el estado Final sobre Postponed");
    assert.equal(
      matching970020[0].game_date,
      "2026-11-06",
      "Debe priorizar officialDate del encuentro disputado sobre la fecha UTC o pospuesta"
    );
    assert.equal(matching970020[0].home_score, 4);
    assert.equal(matching970020[0].away_score, 2);

    // ── 3. RECONCILIACIÓN INMEDIATA POST-JUEGO EN TODOS LOS CONSUMIDORES ────
    console.log("3. Probando reconciliación MLB Final vs Supabase Scheduled en todos los consumidores...");
    clearCanonicalSyncCache();
    scheduleFetchCount = 0;
    dbState.upsertCalls = [];

    // Juego 970114 (2026-11-14, Semana 5, IVC): ya Final en Supabase con boxscore en BD
    // Juego 970115 (2026-11-15, Semana 5, Televen, 9:00 PM VET = 2026-11-16T01:00:00Z):
    // aún 'Scheduled' en Supabase (y fecha UTC desplazada), pero 'Final' (6-2) en MLB API
    dbState.games = [
      {
        id: 970114,
        game_pk: 970114,
        season: 2026,
        game_date: "2026-11-14",
        game_datetime: "2026-11-14T23:00:00Z",
        game_type: "regular",
        status: "Final",
        home_team_id: LEONES_ID,
        away_team_id: TIGRES_ID,
        home_score: 5,
        away_score: 3,
      },
      {
        id: 970115,
        game_pk: 970115,
        season: 2026,
        game_date: "2026-11-16", // desfase UTC intencional en BD que officialDate debe corregir a 2026-11-15
        game_datetime: "2026-11-16T01:00:00Z",
        game_type: "regular",
        status: "Scheduled",
        home_team_id: LEONES_ID,
        away_team_id: AGUILAS_ID,
        home_score: null,
        away_score: null,
      },
    ];

    dbState.batting_stats = [
      {
        game_id: 970114,
        player_id: JOSE_RONDON_ID,
        team_id: LEONES_ID,
        ab: 4,
        r: 1,
        h: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 1,
        bb: 0,
        so: 1,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "José Rondón" },
      },
      {
        game_id: 970114,
        player_id: HAROLD_CASTRO_ID,
        team_id: LEONES_ID,
        ab: 4,
        r: 1,
        h: 2,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 2,
        bb: 0,
        so: 0,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Harold Castro" },
      },
    ];

    dbState.pitching_stats = [
      {
        game_id: 970114,
        player_id: NORWITH_GUDINO_ID,
        team_id: LEONES_ID,
        ip_decimal: 1.0,
        h: 0,
        r: 0,
        er: 0,
        bb: 0,
        so: 2,
        hr: 0,
        hbp: 0,
        players: { full_name: "Norwith Gudiño" },
      },
    ];

    const feed970114 = buildSyntheticFeed({
      gamePk: 970114,
      officialDate: "2026-11-14",
      homeTeamId: LEONES_ID,
      awayTeamId: TIGRES_ID,
      homeScore: 5,
      awayScore: 3,
      rondonStats: { ab: 4, h: 1, hr: 0, rbi: 1, r: 1 },
      castroStats: { ab: 4, h: 2, hr: 0, rbi: 2, r: 1 },
      gudinoStats: { ip: "1.0", er: 0, so: 2, bb: 0, h: 0 },
    });

    const feed970115 = buildSyntheticFeed({
      gamePk: 970115,
      officialDate: "2026-11-15",
      homeTeamId: LEONES_ID,
      awayTeamId: AGUILAS_ID,
      homeScore: 6,
      awayScore: 2,
      rondonStats: { ab: 4, h: 2, hr: 1, rbi: 2, r: 1 },
      castroStats: { ab: 4, h: 1, hr: 0, rbi: 1, r: 1 },
      gudinoStats: { ip: "2.1", er: 0, so: 3, bb: 0, h: 1 },
    });

    scheduleHandler = () => ({
      dates: [
        {
          date: "2026-11-14",
          games: [
            {
              gamePk: 970114,
              gameType: "R",
              officialDate: "2026-11-14",
              gameDate: "2026-11-14T23:00:00Z",
              status: { detailedState: "Final" },
              teams: {
                home: { team: { id: LEONES_ID }, score: 5 },
                away: { team: { id: TIGRES_ID }, score: 3 },
              },
            },
          ],
        },
        {
          date: "2026-11-15",
          games: [
            {
              gamePk: 970115,
              gameType: "R",
              officialDate: "2026-11-15",
              gameDate: "2026-11-16T01:00:00Z",
              status: { detailedState: "Final" },
              teams: {
                home: { team: { id: LEONES_ID }, score: 6 },
                away: { team: { id: AGUILAS_ID }, score: 2 },
              },
            },
          ],
        },
      ],
    });
    feedHandler = (pk) => {
      if (pk === 970114) return feed970114;
      if (pk === 970115) return feed970115;
      return null;
    };

    // 3a. getCanonicalPlayedGames
    const playedGames = await getCanonicalPlayedGames(2026, { phase: "regular" });
    assert.equal(playedGames.length, 2, "Debe incluir el juego ya Final y el juego recién finalizado 970115");
    const reconciled970115 = playedGames.find((g) => Number(g.id) === 970115);
    assert.ok(reconciled970115, "El juego 970115 debe aparecer inmediatamente como jugado");
    assert.equal(reconciled970115.status, "Final");
    assert.equal(reconciled970115.game_date, "2026-11-15", "Debe usar officialDate 2026-11-15 (VET)");
    assert.equal(reconciled970115.home_score, 6);
    assert.equal(reconciled970115.away_score, 2);

    // Verificar write-through vía supabaseAdmin y caché TTL de 60s
    const writeTables = new Set(dbState.upsertCalls.map((c) => c.table));
    assert.ok(writeTables.has("games"), "Write-through debe persistir games vía supabaseAdmin");
    assert.ok(writeTables.has("players"), "Write-through debe persistir players vía supabaseAdmin");
    assert.ok(writeTables.has("batting_stats"), "Write-through debe persistir batting_stats vía supabaseAdmin");
    assert.ok(writeTables.has("pitching_stats"), "Write-through debe persistir pitching_stats vía supabaseAdmin");
    assert.ok(reconciledBoxscoreCache.has(970115), "reconciledBoxscoreCache debe almacenar boxscore de 970115");

    // 3b. getCanonicalGameBoxscoreRows combina Supabase (970114) + cache (970115) sin duplicados
    const mergedBox = await getCanonicalGameBoxscoreRows(2026, [970114, 970115], LEONES_ID);
    const rondonMergedRows = mergedBox.battingRows.filter((r) => Number(r.player_id) === JOSE_RONDON_ID);
    assert.equal(rondonMergedRows.length, 2, "José Rondón debe tener exactamente 2 filas (970114 + 970115)");
    assert.ok(
      mergedBox.battingRows.every((r) => Number(r.team_id) === LEONES_ID),
      "Filtro teamId=695 debe excluir filas de equipos rivales"
    );
    const batKeys = new Set(mergedBox.battingRows.map((r) => `${r.game_id}-${r.player_id}`));
    assert.equal(batKeys.size, mergedBox.battingRows.length, "No debe haber duplicados game_id-player_id en bateo");
    const pitKeys = new Set(mergedBox.pitchingRows.map((r) => `${r.game_id}-${r.player_id}`));
    assert.equal(pitKeys.size, mergedBox.pitchingRows.length, "No debe haber duplicados game_id-player_id en pitcheo");
    assert.equal(scheduleFetchCount, 1, "La caché TTL de 60s debe evitar refetch de /schedule en lecturas consecutivas");

    // 3c. getStandings (RS, RA, DIF, ELO)
    const standings = await getStandings(2026, "regular");
    const leonesStanding = standings.find((s) => s.teamId === LEONES_ID);
    const aguilasStanding = standings.find((s) => s.teamId === AGUILAS_ID);
    assert.ok(leonesStanding && aguilasStanding);
    assert.equal(leonesStanding.gamesPlayed, 2);
    assert.equal(leonesStanding.wins, 2);
    assert.equal(leonesStanding.losses, 0);
    assert.equal(leonesStanding.runsScored, 11, "RS de Leones debe sumar 5 + 6 = 11");
    assert.equal(leonesStanding.runsAllowed, 5, "RA de Leones debe sumar 3 + 2 = 5");
    assert.equal(leonesStanding.runDifferential, 6, "DIF de Leones debe ser +6");
    assert.ok(leonesStanding.eloRating > 1500, "ELO de Leones debe subir tras 2 victorias");
    assert.equal(aguilasStanding.gamesPlayed, 1);
    assert.equal(aguilasStanding.losses, 1);
    assert.equal(aguilasStanding.runsScored, 2);
    assert.equal(aguilasStanding.runsAllowed, 6);
    assert.equal(aguilasStanding.runDifferential, -4);
    assert.ok(aguilasStanding.eloRating < 1500, "ELO de Águilas debe bajar tras la derrota");

    // 3d. getLeonesAdvancedStats (incluyendo withRondon inmediato)
    const advStats = await getLeonesAdvancedStats(2026);
    assert.equal(advStats.totalGames, 2);
    assert.equal(advStats.record, "2-0");
    assert.equal(advStats.homeRecord, "2-0");
    assert.equal(advStats.streak, "2 W");
    assert.equal(advStats.withRondon, "2-0", "José Rondón participó en ambos juegos y debe sumar 2-0");
    assert.equal(advStats.withoutRondon, "0-0");

    // 3e. getHeadToHeadRecords
    const h2h = await getHeadToHeadRecords(2026);
    const vsAguilas = h2h.find((r) => r.rivalId === AGUILAS_ID);
    const vsTigres = h2h.find((r) => r.rivalId === TIGRES_ID);
    assert.ok(vsAguilas && vsTigres);
    assert.equal(vsAguilas.gamesPlayed, 1);
    assert.equal(vsAguilas.wins, 1);
    assert.equal(vsAguilas.runsFor, 6);
    assert.equal(vsAguilas.runsAgainst, 2);
    assert.equal(vsAguilas.runDiff, "+4");
    assert.equal(vsTigres.gamesPlayed, 1);
    assert.equal(vsTigres.wins, 1);

    // 3f. getWeeklyRecords (Semana 5: 10/11 - 16/11)
    const weekly = await getWeeklyRecords(2026);
    const week5 = weekly.find((w) => w.weekNum === 5);
    assert.ok(week5, "Debe existir Semana 5");
    assert.equal(week5.juegos, 2);
    assert.equal(week5.w, 2);
    assert.equal(week5.l, 0);
    assert.equal(week5.cf, 11);
    assert.equal(week5.cp, 5);
    assert.equal(week5.dif, "+6");

    // 3g. getBroadcastChannelRecords (IVC 14/11 + Televen 15/11 con horario VET)
    const channels = await getBroadcastChannelRecords(2026);
    const televen = channels.find((c) => c.channelKey === "televen");
    const ivc = channels.find((c) => c.channelKey === "ivc");
    assert.ok(televen, "Televen debe aparecer en canales");
    assert.ok(ivc, "IVC debe aparecer en canales");
    assert.equal(televen.gamesPlayed, 1, "Juego del 15/11 (2026-11-16T01:00Z) debe emparejar en VET 2026-11-15 con Televen");
    assert.equal(televen.wins, 1);
    assert.equal(ivc.gamesPlayed, 1);
    assert.equal(ivc.wins, 1);

    // 3h. getStreaksData
    const streaks = await getStreaksData(2026);
    assert.equal(streaks.teamStreaks.general.streak, "2 W");
    const aguilasStreak = streaks.teamStreaks.rivals.find((r) => r.category.includes("Águilas"));
    assert.equal(aguilasStreak?.streak, "1 W");
    const rondonStreak = streaks.hittingStreaks.find((b) => b.playerId === JOSE_RONDON_ID);
    const castroStreak = streaks.hittingStreaks.find((b) => b.playerId === HAROLD_CASTRO_ID);
    const gudinoStreak = streaks.pitchingStreaks.find((p) => p.playerId === NORWITH_GUDINO_ID);
    assert.equal(rondonStreak?.streakLength, 2, "José Rondón debe reflejar racha activa de 2 juegos con hit");
    assert.equal(castroStreak?.streakLength, 2, "Harold Castro debe reflejar racha activa de 2 juegos con hit");
    assert.equal(gudinoStreak?.streakLength, 2, "Norwith Gudiño debe reflejar racha activa de 2 relevos en blanco");

    // ── 4. RESILIENCIA CON SUPABASE VACÍO Y FALLO EN LOTE WRITE-THROUGH ────
    console.log("4. Probando resiliencia con Supabase vacío y fallback fila por fila en write-through...");
    clearCanonicalSyncCache();
    dbState.games = [];
    dbState.batting_stats = [];
    dbState.pitching_stats = [];
    dbState.upsertCalls = [];
    dbState.failBatchUpsertTables.add("games");

    const emptyDbPlayed = await getCanonicalPlayedGames(2026, { phase: "regular" });
    assert.equal(emptyDbPlayed.length, 2, "Debe reconciliar desde MLB Stats API aunque Supabase games esté vacío");
    const singleRowRetries = dbState.upsertCalls.filter(
      (c) => c.table === "games" && c.rows.length === 1
    );
    assert.ok(
      singleRowRetries.length >= 2,
      "Cuando falla el batch upsert en games, debe reintentar fila por fila sin romper la lectura"
    );

    console.log("=== TODAS LAS PRUEBAS DE SINCRONIZACIÓN CANÓNICA POST-JUEGO PASARON EXITOSAMENTE ===");
  } finally {
    clearCanonicalSyncCache();
    mutableSupabase.from = originalSupabaseFrom;
    mutableAdmin.from = originalAdminFrom;
    globalThis.fetch = originalFetch;

    if (prevEnv.NEXT_PUBLIC_SUPABASE_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevEnv.NEXT_PUBLIC_SUPABASE_URL;

    if (prevEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (prevEnv.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevEnv.SUPABASE_SERVICE_ROLE_KEY;
  }
}

runTests().catch((err) => {
  console.error("Fallo en realtime-postgame-sync.test.ts:", err);
  process.exit(1);
});
