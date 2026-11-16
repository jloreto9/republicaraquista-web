import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

type MockRow = Record<string, unknown>;

interface MockDbState {
  games: MockRow[];
  batting_stats: MockRow[];
  pitching_stats: MockRow[];
}

interface ThenableQuery {
  select: () => ThenableQuery;
  eq: (col: string, val: unknown) => ThenableQuery;
  gte: (col: string, val: unknown) => ThenableQuery;
  lte: (col: string, val: unknown) => ThenableQuery;
  in: (col: string, vals: unknown[]) => ThenableQuery;
  order: () => ThenableQuery;
  limit: (n: number) => ThenableQuery;
  then: <TResult1 = { data: MockRow[]; error: null }, TResult2 = never>(
    onFulfilled?: ((value: { data: MockRow[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function getNestedField(row: MockRow, col: string): unknown {
  if (!col.includes(".")) return row[col];
  const parts = col.split(".");
  let curr: unknown = row;
  for (const part of parts) {
    if (Array.isArray(curr)) curr = curr[0];
    if (curr && typeof curr === "object") {
      curr = (curr as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return curr;
}

function createThenableQuery(rows: MockRow[]): ThenableQuery {
  let filtered = [...rows];
  const builder: ThenableQuery = {
    select() {
      return builder;
    },
    eq(col: string, val: unknown) {
      filtered = filtered.filter((r) => {
        const fieldVal = getNestedField(r, col);
        if (col === "season" || col.endsWith(".season")) {
          return Number(fieldVal ?? 2026) === Number(val);
        }
        return String(fieldVal) === String(val);
      });
      return builder;
    },
    gte(col: string, val: unknown) {
      filtered = filtered.filter((r) => {
        const fieldVal = getNestedField(r, col);
        return fieldVal !== undefined && String(fieldVal) >= String(val);
      });
      return builder;
    },
    lte(col: string, val: unknown) {
      filtered = filtered.filter((r) => {
        const fieldVal = getNestedField(r, col);
        return fieldVal !== undefined && String(fieldVal) <= String(val);
      });
      return builder;
    },
    in(col: string, vals: unknown[]) {
      const set = new Set((vals || []).map((v) => String(v)));
      filtered = filtered.filter((r) => set.has(String(getNestedField(r, col))));
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

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function runTests() {
  console.log("=== Ejecutando suite: Buscador Individual por Rango de Fechas (Spec 030) ===");

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
  const utilsMod = await import("../utils");
  const battingRoute = await import("../../app/api/stats/batting/route");
  const pitchingRoute = await import("../../app/api/stats/pitching/route");
  const fieldingRoute = await import("../../app/api/stats/fielding/route");

  const {
    supabase,
    clearCanonicalSyncCache,
    getTeamGamesMap,
    getBattingStats,
    getPitchingStats,
    getFieldingStats,
    INVALID_DATE_RANGE_ERROR,
  } = supabaseMod;
  const { getVenezuelanToday } = utilsMod;

  assert.ok(supabase, "El cliente supabase debe inicializarse con variables mock");

  const originalFetch = globalThis.fetch;
  const mutableSupabase = supabase as unknown as { from: (table: string) => unknown };
  const originalSupabaseFrom = mutableSupabase.from.bind(supabase);

  const mockDb: MockDbState = {
    games: [],
    batting_stats: [],
    pitching_stats: [],
  };

  mutableSupabase.from = (table: string) => {
    if (table === "games") return createThenableQuery(mockDb.games);
    if (table === "batting_stats") return createThenableQuery(mockDb.batting_stats);
    if (table === "pitching_stats") return createThenableQuery(mockDb.pitching_stats);
    return createThenableQuery([]);
  };

  try {
    // ── 1. getTeamGamesMap(season, phase, startDate, endDate): MLB primary + fallback ──
    console.log("1. Probando getTeamGamesMap (MLB teams/stats byDateRange y fallback)...");
    clearCanonicalSyncCache();
    const teamGamesRequestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      teamGamesRequestedUrls.push(url);

      if (url.includes("/api/v1/teams/stats") && url.includes("group=hitting")) {
        return jsonResponse({
          stats: [
            {
              splits: [
                { team: { id: 695 }, stat: { gamesPlayed: 10 } },
                { team: { id: 696 }, stat: { gamesPlayed: 0 } }, // debe tomar 9 desde pitching
                { team: { id: 99999 }, stat: { gamesPlayed: 50 } }, // fuera de LVBP
              ],
            },
          ],
        });
      }
      if (url.includes("/api/v1/teams/stats") && url.includes("group=pitching")) {
        return jsonResponse({
          stats: [
            {
              splits: [
                { team: { id: 695 }, stat: { gamesPlayed: 10, wins: 7, losses: 3 } },
                { team: { id: 696 }, stat: { gamesPlayed: 9, wins: 4, losses: 5 } },
                { team: { id: 698 }, stat: { gamesPlayed: 11, wins: 6, losses: 5 } },
              ],
            },
          ],
        });
      }
      return jsonResponse({ stats: [{ splits: [] }] });
    }) as typeof fetch;

    const tgPrimary = await getTeamGamesMap(2026, "all", "2026-10-15", "2026-10-31");
    assert.equal(teamGamesRequestedUrls.length, 2, "Debe consultar hitting y pitching en paralelo");
    assert.ok(
      teamGamesRequestedUrls.every(
        (u) =>
          u.includes("stats=byDateRange") &&
          u.includes("startDate=2026-10-15") &&
          u.includes("endDate=2026-10-31") &&
          u.includes("sportIds=17") &&
          u.includes("leagueIds=135")
      )
    );
    assert.equal(tgPrimary.teamGamesMap[695], 10);
    assert.equal(tgPrimary.teamGamesMap[696], 9);
    assert.equal(tgPrimary.teamGamesMap[698], 11);
    assert.equal(tgPrimary.teamGamesMap[693], 0);
    assert.equal(tgPrimary.teamGamesMap[99999], undefined);
    assert.equal(tgPrimary.teamWinPctMap[695], 0.7);
    assert.equal(Number(tgPrimary.teamWinPctMap[696].toFixed(4)), Number((4 / 9).toFixed(4)));
    assert.equal(tgPrimary.maxGames, 11);

    // Fallback path cuando /teams/stats falla
    clearCanonicalSyncCache();
    mockDb.games = [
      {
        id: 7001,
        game_pk: 7001,
        season: 2026,
        phase: "regular",
        game_type: "regular",
        status: "Final",
        game_date: "2026-10-20",
        home_team_id: 695,
        away_team_id: 696,
        home_score: 6,
        away_score: 2,
      },
      {
        id: 7002,
        game_pk: 7002,
        season: 2026,
        phase: "round_robin",
        game_type: "round_robin",
        status: "Final",
        game_date: "2026-10-25",
        home_team_id: 695,
        away_team_id: 698,
        home_score: 1,
        away_score: 4,
      },
      // Juego fuera de rango -> debe ignorarse
      {
        id: 7003,
        game_pk: 7003,
        season: 2026,
        phase: "regular",
        game_type: "regular",
        status: "Final",
        game_date: "2026-11-05",
        home_team_id: 695,
        away_team_id: 696,
        home_score: 5,
        away_score: 0,
      },
      // Juego pospuesto dentro del rango -> debe ignorarse
      {
        id: 7004,
        game_pk: 7004,
        season: 2026,
        phase: "regular",
        game_type: "regular",
        status: "Postponed",
        game_date: "2026-10-26",
        home_team_id: 695,
        away_team_id: 699,
        home_score: 0,
        away_score: 0,
      },
    ];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/teams/stats")) {
        return jsonResponse({ message: "error" }, 500);
      }
      if (url.includes("/api/v1/schedule")) {
        return jsonResponse({ dates: [] });
      }
      return jsonResponse({});
    }) as typeof fetch;

    const tgFallback = await getTeamGamesMap(2026, "all", "2026-10-15", "2026-10-31");
    assert.equal(tgFallback.teamGamesMap[695], 2);
    assert.equal(tgFallback.teamGamesMap[696], 1);
    assert.equal(tgFallback.teamGamesMap[698], 1);
    assert.equal(tgFallback.teamGamesMap[699], 0);
    assert.equal(tgFallback.teamWinPctMap[695], 0.5);
    assert.equal(tgFallback.teamWinPctMap[696], 0);
    assert.equal(tgFallback.teamWinPctMap[698], 1);
    assert.equal(tgFallback.maxGames, 2);

    // ── 2. getBattingStats con startDate & endDate ──────────────────────────────
    console.log("2. Probando getBattingStats con rango de fechas (splits, tasas, filtros y fallback)...");
    clearCanonicalSyncCache();
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.ok(
        url.includes("/api/v1/stats?stats=byDateRange") &&
          url.includes("group=hitting") &&
          url.includes("startDate=2026-10-15") &&
          url.includes("endDate=2026-10-31")
      );
      return jsonResponse({
        stats: [
          {
            splits: [
              // Jugador 1: split único
              {
                sport: { id: 17 },
                player: { id: 602922, fullName: "José Rondón" },
                team: { id: 695 },
                stat: {
                  gamesPlayed: 8,
                  plateAppearances: 34,
                  atBats: 30,
                  runs: 7,
                  hits: 12,
                  doubles: 3,
                  triples: 0,
                  homeRuns: 2,
                  rbi: 9,
                  baseOnBalls: 4,
                  strikeOuts: 5,
                  stolenBases: 1,
                  caughtStealing: 0,
                  groundIntoDoublePlay: 1,
                  hitByPitch: 0,
                  sacFlies: 0,
                  sacBunts: 0,
                  avg: ".400",
                  obp: ".471",
                  slg: ".700",
                  ops: "1.171",
                  babip: ".435",
                },
              },
              // Jugador 2: multi-equipo (dos splits que deben consolidarse)
              {
                sport: { id: 17 },
                player: { id: 605612, fullName: "Harold Castro" },
                team: { id: 695 },
                stat: {
                  gamesPlayed: 5,
                  plateAppearances: 20,
                  atBats: 18,
                  runs: 3,
                  hits: 6,
                  doubles: 1,
                  triples: 0,
                  homeRuns: 1,
                  rbi: 4,
                  baseOnBalls: 2,
                  strikeOuts: 2,
                  hitByPitch: 0,
                  sacFlies: 0,
                  sacBunts: 0,
                },
              },
              {
                sport: { id: 17 },
                player: { id: 605612, fullName: "Harold Castro" },
                team: { id: 696 },
                stat: {
                  gamesPlayed: 2,
                  plateAppearances: 6,
                  atBats: 6,
                  runs: 1,
                  hits: 2,
                  doubles: 0,
                  triples: 1,
                  homeRuns: 0,
                  rbi: 1,
                  baseOnBalls: 0,
                  strikeOuts: 1,
                  hitByPitch: 0,
                  sacFlies: 0,
                  sacBunts: 0,
                },
              },
              // Jugador 3: pocos AB (para validar minAb)
              {
                sport: { id: 17 },
                player: { id: 700001, fullName: "Emergente Corto" },
                team: { id: 696 },
                stat: {
                  gamesPlayed: 3,
                  plateAppearances: 5,
                  atBats: 4,
                  runs: 1,
                  hits: 2,
                  doubles: 0,
                  triples: 0,
                  homeRuns: 1,
                  rbi: 2,
                  baseOnBalls: 1,
                  strikeOuts: 1,
                  avg: ".500",
                  obp: ".600",
                  slg: "1.250",
                  ops: "1.850",
                  babip: ".500",
                },
              },
              // Equipo fuera de LVBP y sport.id=0 deben ignorarse
              {
                sport: { id: 0 },
                player: { id: 602922, fullName: "José Rondón" },
                team: { id: 695 },
                stat: { gamesPlayed: 99, atBats: 300, hits: 100 },
              },
              {
                sport: { id: 17 },
                player: { id: 999999, fullName: "Jugador Externo" },
                team: { id: 99999 },
                stat: { gamesPlayed: 10, atBats: 30, hits: 15, ops: "1.500" },
              },
            ],
          },
        ],
      });
    }) as typeof fetch;

    const batAll = await getBattingStats(2026, "all", "all", 250, 0, "2026-10-15", "2026-10-31");
    assert.equal(batAll.length, 3);
    // Orden esperado por OPS desc: Emergente Corto (1.850), José Rondón (1.171), Harold Castro (consolidado)
    assert.equal(batAll[0].playerId, 700001);
    assert.equal(batAll[1].playerId, 602922);
    assert.equal(batAll[1].avg, 0.4);
    assert.equal(batAll[1].iso, 0.3);
    assert.equal(batAll[1].gidp, 1);
    assert.equal(batAll[2].playerId, 605612);
    // Consolidación de Harold Castro: AB=24, H=8, 2B=1, 3B=1, HR=1, BB=2, PA=26, equipo primario 695
    assert.equal(batAll[2].teamId, 695);
    assert.equal(batAll[2].atBats, 24);
    assert.equal(batAll[2].hits, 8);
    assert.equal(batAll[2].plateAppearances, 26);
    assert.equal(batAll[2].avg, 0.333);
    assert.equal(batAll[2].obp, 0.385);
    assert.equal(batAll[2].slg, 0.583);
    assert.equal(batAll[2].ops, 0.968);
    assert.equal(batAll[2].iso, 0.25);

    // Filtro minAb y teamId
    const batFiltered = await getBattingStats(2026, "all", 695, 1, 20, "2026-10-15", "2026-10-31");
    assert.equal(batFiltered.length, 1);
    assert.equal(batFiltered[0].playerId, 602922);

    // Equipo inválido fuera de LVBP retorna []
    assert.deepEqual(
      await getBattingStats(2026, "all", 99999, 50, 0, "2026-10-15", "2026-10-31"),
      []
    );

    // Fallback de bateo a Supabase cuando MLB devuelve vacío
    mockDb.batting_stats = [
      {
        game_id: 7001,
        player_id: 602922,
        team_id: 695,
        ab: 4,
        r: 2,
        h: 3,
        doubles: 1,
        triples: 0,
        hr: 1,
        rbi: 3,
        bb: 1,
        so: 0,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "José Rondón" },
        games: { season: 2026, game_type: "regular", status: "Final", game_date: "2026-10-20" },
      },
      // Fuera del rango -> excluido
      {
        game_id: 7003,
        player_id: 602922,
        team_id: 695,
        ab: 4,
        r: 0,
        h: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        bb: 0,
        so: 4,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "José Rondón" },
        games: { season: 2026, game_type: "regular", status: "Final", game_date: "2026-11-05" },
      },
    ];
    globalThis.fetch = (async () => jsonResponse({ stats: [{ splits: [] }] })) as typeof fetch;
    const batFallback = await getBattingStats(2026, "all", 695, 50, 0, "2026-10-15", "2026-10-31");
    assert.equal(batFallback.length, 1);
    assert.equal(batFallback[0].atBats, 4);
    assert.equal(batFallback[0].hits, 3);
    assert.equal(batFallback[0].avg, 0.75);

    // ── 3. getPitchingStats con startDate & endDate ─────────────────────────────
    console.log("3. Probando getPitchingStats con rango de fechas (innings 5.2, tasas, orden)...");
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      assert.ok(
        url.includes("/api/v1/stats?stats=byDateRange") &&
          url.includes("group=pitching") &&
          url.includes("startDate=2026-10-15") &&
          url.includes("endDate=2026-10-31")
      );
      return jsonResponse({
        stats: [
          {
            splits: [
              // Lanzador A: split único con 5.2 IP
              {
                sport: { id: 17 },
                player: { id: 660508, fullName: "Norwith Gudiño" },
                team: { id: 695 },
                stat: {
                  gamesPitched: 2,
                  gamesStarted: 1,
                  inningsPitched: "5.2",
                  hits: 4,
                  runs: 2,
                  earnedRuns: 1,
                  baseOnBalls: 2,
                  strikeOuts: 8,
                  homeRuns: 0,
                  groundIntoDoublePlay: 1,
                  hitBatsmen: 1,
                  wins: 1,
                  losses: 0,
                  saves: 0,
                  era: "1.59",
                  whip: "1.06",
                  strikeoutsPer9Inn: "12.71",
                  walksPer9Inn: "3.18",
                  strikeoutWalkRatio: "4.00",
                },
              },
              // Lanzador B: dos splits (5.2 + 3.1 = 9.0 IP), ERA más baja (1.00)
              {
                sport: { id: 17 },
                player: { id: 660509, fullName: "Jesús Vargas" },
                team: { id: 695 },
                stat: {
                  gamesPitched: 1,
                  gamesStarted: 1,
                  inningsPitched: "5.2",
                  hits: 3,
                  runs: 1,
                  earnedRuns: 1,
                  baseOnBalls: 1,
                  strikeOuts: 6,
                  homeRuns: 0,
                  wins: 1,
                  losses: 0,
                  saves: 0,
                },
              },
              {
                sport: { id: 17 },
                player: { id: 660509, fullName: "Jesús Vargas" },
                team: { id: 696 },
                stat: {
                  gamesPitched: 1,
                  gamesStarted: 0,
                  inningsPitched: "3.1",
                  hits: 2,
                  runs: 0,
                  earnedRuns: 0,
                  baseOnBalls: 1,
                  strikeOuts: 3,
                  homeRuns: 0,
                  wins: 0,
                  losses: 0,
                  saves: 1,
                },
              },
            ],
          },
        ],
      });
    }) as typeof fetch;

    const pitAll = await getPitchingStats(2026, "all", "all", 250, 0, "2026-10-15", "2026-10-31");
    assert.equal(pitAll.length, 2);
    // Ordenado por ERA asc: Jesús Vargas (1.00), luego Norwith Gudiño (1.59)
    assert.equal(pitAll[0].playerId, 660509);
    assert.equal(pitAll[0].inningsPitched, 9);
    assert.equal(pitAll[0].inningsDisplay, "9.0");
    assert.equal(pitAll[0].era, 1.0);
    assert.equal(pitAll[0].whip, 0.78);
    assert.equal(pitAll[0].kPer9, 9.0);
    assert.equal(pitAll[0].bbPer9, 2.0);
    assert.equal(pitAll[0].kToBb, 4.5);
    assert.equal(pitAll[0].saves, 1);

    assert.equal(pitAll[1].playerId, 660508);
    assert.equal(pitAll[1].inningsPitched, 5.67);
    assert.equal(pitAll[1].inningsDisplay, "5.2");
    assert.equal(pitAll[1].era, 1.59);
    assert.equal(pitAll[1].whip, 1.06);
    assert.equal(pitAll[1].kPer9, 12.71);
    assert.equal(pitAll[1].bbPer9, 3.18);
    assert.equal(pitAll[1].kToBb, 4.0);
    assert.equal(pitAll[1].gidp, 1);
    assert.equal(pitAll[1].hbp, 1);

    const pitMinIp = await getPitchingStats(2026, "all", "all", 250, 6.0, "2026-10-15", "2026-10-31");
    assert.equal(pitMinIp.length, 1);
    assert.equal(pitMinIp[0].playerId, 660509);

    // Fallback de pitcheo a Supabase cuando MLB devuelve vacío
    mockDb.pitching_stats = [
      {
        game_id: 7001,
        player_id: 660508,
        team_id: 695,
        ip_decimal: 3.0,
        h: 2,
        r: 1,
        er: 1,
        bb: 1,
        hbp: 0,
        so: 4,
        hr: 0,
        players: { full_name: "Norwith Gudiño" },
        games: { season: 2026, game_type: "regular", status: "Final", game_date: "2026-10-20" },
      },
      // Fuera del rango -> excluido
      {
        game_id: 7003,
        player_id: 660508,
        team_id: 695,
        ip_decimal: 5.0,
        h: 8,
        r: 5,
        er: 5,
        bb: 3,
        hbp: 0,
        so: 2,
        hr: 2,
        players: { full_name: "Norwith Gudiño" },
        games: { season: 2026, game_type: "regular", status: "Final", game_date: "2026-11-05" },
      },
    ];
    globalThis.fetch = (async () => jsonResponse({ stats: [{ splits: [] }] })) as typeof fetch;
    const pitFallback = await getPitchingStats(2026, "all", 695, 50, 0, "2026-10-15", "2026-10-31");
    assert.equal(pitFallback.length, 1);
    assert.equal(pitFallback[0].inningsPitched, 3.0);
    assert.equal(pitFallback[0].inningsDisplay, "3.0");
    assert.equal(pitFallback[0].era, 3.0);
    assert.equal(pitFallback[0].strikeouts, 4);

    // ── 4. getFieldingStats con startDate & endDate (roster/fullSeason hydration) ──
    console.log("4. Probando getFieldingStats con rango de fechas (roster hydration, posiciones y agrupación)...");
    const requestedRosterUrls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requestedRosterUrls.push(url);
      assert.ok(
        url.includes("/roster/fullSeason") &&
          url.includes("hydrate=person(stats(type=byDateRange,group=fielding") &&
          url.includes("startDate=2026-10-15") &&
          url.includes("endDate=2026-10-31")
      );

      if (url.includes("/teams/695/roster/fullSeason")) {
        return jsonResponse({
          roster: [
            {
              person: {
                id: 602922,
                fullName: "Wilfredo Tovar",
                stats: [
                  {
                    splits: [
                      // Split válido en SS (posición dentro de stat.position)
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "SS" },
                          gamesPlayed: 8,
                          gamesStarted: 8,
                          innings: "70.0",
                          putOuts: 12,
                          assists: 25,
                          errors: 1,
                          chances: 38,
                          doublePlays: 6,
                        },
                      },
                      // Mismo jugador en 2B (posición en split.position) -> fila separada
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        position: { abbreviation: "2B" },
                        stat: {
                          gamesPlayed: 2,
                          gamesStarted: 1,
                          innings: "12.0",
                          putOuts: 4,
                          assists: 5,
                          errors: 0,
                          chances: 9,
                          doublePlays: 2,
                        },
                      },
                      // DH debe filtrarse
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "DH" },
                          gamesPlayed: 4,
                          innings: "0.0",
                          putOuts: 0,
                          assists: 0,
                          errors: 0,
                        },
                      },
                      // Resumen sport.id=0 debe ignorarse
                      {
                        sport: { id: 0 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "SS" },
                          gamesPlayed: 20,
                          innings: "180.0",
                          putOuts: 40,
                          assists: 60,
                          errors: 2,
                        },
                      },
                      // Split de otro equipo (696) dentro del roster 695 debe ignorarse para evitar duplicados
                      {
                        sport: { id: 17 },
                        team: { id: 696 },
                        stat: {
                          position: { abbreviation: "SS" },
                          gamesPlayed: 5,
                          innings: "40.0",
                          putOuts: 8,
                          assists: 14,
                          errors: 0,
                        },
                      },
                    ],
                  },
                ],
              },
            },
            {
              person: {
                id: 680846,
                fullName: "Gabriel Lino",
                stats: [
                  {
                    splits: [
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "C" },
                          gamesPlayed: 5,
                          gamesStarted: 5,
                          innings: "42.1",
                          putOuts: 35,
                          assists: 4,
                          errors: 1,
                          chances: 40,
                          caughtStealing: 3,
                          stolenBases: 4,
                          passedBall: 1,
                        },
                      },
                      // PH debe filtrarse
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "PH" },
                          gamesPlayed: 2,
                          putOuts: 0,
                          assists: 0,
                          errors: 0,
                        },
                      },
                      // PR debe filtrarse
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "PR" },
                          gamesPlayed: 1,
                          putOuts: 0,
                          assists: 0,
                          errors: 0,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        });
      }

      if (url.includes("/teams/696/roster/fullSeason")) {
        return jsonResponse({
          roster: [
            {
              person: {
                id: 602922,
                fullName: "Wilfredo Tovar",
                stats: [
                  {
                    splits: [
                      {
                        sport: { id: 17 },
                        team: { id: 696 },
                        stat: {
                          position: { abbreviation: "SS" },
                          gamesPlayed: 5,
                          innings: "40.0",
                          putOuts: 8,
                          assists: 14,
                          errors: 0,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        });
      }

      return jsonResponse({ roster: [] });
    }) as typeof fetch;

    const fldAll = await getFieldingStats(2026, "all", "all", 1000, 0, "2026-10-15", "2026-10-31");
    assert.equal(requestedRosterUrls.length, 8, "Con teamId=all debe consultar los 8 equipos LVBP");
    assert.equal(fldAll.length, 4, "Debe tener C(695), SS(695), SS(696) y 2B(695), sin DH/PH/PR");
    assert.equal(fldAll[0].position, "C");
    assert.equal(fldAll[0].totalChances, 40);
    assert.equal(fldAll[0].caughtStealingPct, 0.429);
    assert.equal(fldAll[0].passedBalls, 1);

    const tovarSs695 = fldAll.find((f) => f.playerId === 602922 && f.teamId === 695 && f.position === "SS");
    const tovar2b695 = fldAll.find((f) => f.playerId === 602922 && f.teamId === 695 && f.position === "2B");
    const tovarSs696 = fldAll.find((f) => f.playerId === 602922 && f.teamId === 696 && f.position === "SS");
    assert.ok(tovarSs695 && tovar2b695 && tovarSs696);
    assert.equal(tovarSs695.totalChances, 38);
    assert.equal(tovarSs695.putouts, 12, "No debe duplicar stats de 696 ni sport.id=0");
    assert.equal(tovar2b695.totalChances, 9);
    assert.equal(tovarSs696.totalChances, 22);

    // Con teamId específico solo debe consultar 1 equipo
    requestedRosterUrls.length = 0;
    const fldCaracas = await getFieldingStats(2026, "all", 695, 1000, 20, "2026-10-15", "2026-10-31");
    assert.equal(requestedRosterUrls.length, 1);
    assert.equal(fldCaracas.length, 2);

    // ── 5. Route handlers: validación HTTP 400, respuesta 200 y Cache-Control ──
    console.log("5. Probando route handlers /api/stats/{batting,pitching,fielding}...");
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/teams/stats")) {
        return jsonResponse({
          stats: [
            {
              splits: [{ team: { id: 695 }, stat: { gamesPlayed: 6, wins: 4, losses: 2 } }],
            },
          ],
        });
      }
      if (url.includes("group=hitting")) {
        return jsonResponse({
          stats: [
            {
              splits: [
                {
                  sport: { id: 17 },
                  player: { id: 602922, fullName: "José Rondón" },
                  team: { id: 695 },
                  stat: { gamesPlayed: 6, atBats: 22, hits: 8, ops: "1.050", avg: ".364" },
                },
              ],
            },
          ],
        });
      }
      if (url.includes("group=pitching")) {
        return jsonResponse({
          stats: [
            {
              splits: [
                {
                  sport: { id: 17 },
                  player: { id: 660508, fullName: "Norwith Gudiño" },
                  team: { id: 695 },
                  stat: { gamesPitched: 2, inningsPitched: "5.2", earnedRuns: 1, strikeOuts: 7, era: "1.59" },
                },
              ],
            },
          ],
        });
      }
      if (url.includes("/teams/695/roster/fullSeason")) {
        return jsonResponse({
          roster: [
            {
              person: {
                id: 602922,
                fullName: "Wilfredo Tovar",
                stats: [
                  {
                    splits: [
                      {
                        sport: { id: 17 },
                        team: { id: 695 },
                        stat: {
                          position: { abbreviation: "SS" },
                          gamesPlayed: 6,
                          innings: "54.0",
                          putOuts: 10,
                          assists: 18,
                          errors: 1,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          ],
        });
      }
      return jsonResponse({ roster: [], stats: [{ splits: [] }] });
    }) as typeof fetch;

    const routes = [
      { name: "batting", GET: battingRoute.GET },
      { name: "pitching", GET: pitchingRoute.GET },
      { name: "fielding", GET: fieldingRoute.GET },
    ];

    const invalidCases = [
      "startDate=2026-10-20&endDate=2026-10-10", // startDate > endDate
      "startDate=2026-10-15", // falta endDate
      "endDate=2026-10-31", // falta startDate
      "startDate=2026/10/15&endDate=2026-10-31", // formato inválido
      "startDate=2026-02-30&endDate=2026-03-05", // fecha inexistente
    ];

    for (const route of routes) {
      for (const qs of invalidCases) {
        const req = new NextRequest(`http://localhost:3000/api/stats/${route.name}?season=2026&${qs}`);
        const res = await route.GET(req);
        assert.equal(res.status, 400, `${route.name} con "${qs}" debe retornar 400`);
        const body = await res.json();
        assert.equal(body.success, false);
        assert.equal(body.error, INVALID_DATE_RANGE_ERROR);
      }

      // Caso 200 pasado (endDate < today VET) -> Cache-Control 3600s
      const pastReq = new NextRequest(
        `http://localhost:3000/api/stats/${route.name}?season=2025&phase=all&team_id=all&startDate=2025-10-15&endDate=2025-10-31`
      );
      const pastRes = await route.GET(pastReq);
      assert.equal(pastRes.status, 200);
      assert.equal(
        pastRes.headers.get("Cache-Control"),
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300",
        `${route.name} con rango pasado debe cachear por 3600s`
      );
      const pastBody = await pastRes.json();
      assert.equal(pastBody.success, true);
      assert.equal(pastBody.startDate, "2025-10-15");
      assert.equal(pastBody.endDate, "2025-10-31");
      assert.equal(pastBody.teamGamesMap[695], 6);
      assert.equal(pastBody.maxGames, 6);
      assert.equal(pastBody.data.length, 1);

      // Caso 200 activo/hoy (endDate >= today VET) -> Cache-Control 300s
      const todayVet = getVenezuelanToday().dateString;
      const activeReq = new NextRequest(
        `http://localhost:3000/api/stats/${route.name}?season=2026&phase=all&team_id=all&startDate=2026-10-15&endDate=${todayVet}`
      );
      const activeRes = await route.GET(activeReq);
      assert.equal(activeRes.status, 200);
      assert.equal(
        activeRes.headers.get("Cache-Control"),
        "public, max-age=300, s-maxage=300, stale-while-revalidate=60",
        `${route.name} con endDate=hoy VET debe cachear por 300s`
      );

      // Caso 200 sin rango de fechas (retrocompatibilidad) -> Cache-Control 300s y sin startDate/endDate
      const legacyReq = new NextRequest(
        `http://localhost:3000/api/stats/${route.name}?season=2026&phase=R&team_id=all`
      );
      const legacyRes = await route.GET(legacyReq);
      assert.equal(legacyRes.status, 200);
      assert.equal(
        legacyRes.headers.get("Cache-Control"),
        "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
      );
      const legacyBody = await legacyRes.json();
      assert.equal(legacyBody.success, true);
      assert.equal(legacyBody.startDate, undefined);
      assert.equal(legacyBody.endDate, undefined);
    }

    // ── 6. Auditoría de copy UI / API (cero menciones de "saberm*") ─────────────
    console.log("6. Auditando ausencia de términos prohibidos ('saberm*')...");
    const rootDir = path.resolve(__dirname, "../../..");
    const filesToAudit = [
      "src/components/stats/stathead-individual-search.tsx",
      "src/components/stats/individuales-view.tsx",
      "src/app/api/stats/batting/route.ts",
      "src/app/api/stats/pitching/route.ts",
      "src/app/api/stats/fielding/route.ts",
      "src/lib/supabase.ts",
    ];
    for (const rel of filesToAudit) {
      const content = fs.readFileSync(path.join(rootDir, rel), "utf8");
      assert.equal(
        /saberm/i.test(content),
        false,
        `El archivo ${rel} no debe contener 'sabermétrico/a/ía'`
      );
    }

    console.log("=== TODAS LAS PRUEBAS DE RANGO DE FECHAS INDIVIDUAL PASARON EXITOSAMENTE ===");
  } finally {
    globalThis.fetch = originalFetch;
    mutableSupabase.from = originalSupabaseFrom;
    clearCanonicalSyncCache();
    process.env.NEXT_PUBLIC_SUPABASE_URL = prevEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevEnv.SUPABASE_SERVICE_ROLE_KEY;
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
