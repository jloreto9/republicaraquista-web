import assert from "node:assert/strict";

type MockRow = Record<string, unknown>;

interface PaginatedQueryOptions {
  supportRange?: boolean;
  supportOrder?: boolean;
  includeExactCount?: boolean;
  maxRowsCap?: number;
  onOrder?: (col: string, ascending: boolean) => void;
  onRange?: (from: number, to: number) => void;
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

function createPaginatedMockQuery(rows: MockRow[], opts: PaginatedQueryOptions = {}) {
  const {
    supportRange = true,
    supportOrder = true,
    includeExactCount = true,
    maxRowsCap = 1000,
    onOrder,
    onRange,
  } = opts;

  let filtered = [...rows];
  let wantCount = false;
  let rangeSlice: [number, number] | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: Record<string, any> = {
    select(_cols?: string, selectOpts?: { count?: string }) {
      if (selectOpts?.count === "exact") {
        wantCount = true;
      }
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
    then(
      onFulfilled?: (val: { data: MockRow[]; error: null; count?: number }) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      const total = filtered.length;
      let page = filtered;
      if (rangeSlice) {
        const [from, to] = rangeSlice;
        const cappedTo = Math.min(to, from + maxRowsCap - 1);
        page = filtered.slice(from, cappedTo + 1);
      } else if (supportRange) {
        page = filtered.slice(0, maxRowsCap);
      }
      const result: { data: MockRow[]; error: null; count?: number } = {
        data: page,
        error: null,
      };
      if (includeExactCount && wantCount) {
        result.count = total;
      }
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
  };

  if (supportOrder) {
    builder.order = (col: string, orderOpts?: { ascending?: boolean }) => {
      const asc = orderOpts?.ascending !== false;
      onOrder?.(col, asc);
      filtered.sort((a, b) => {
        const av = Number(a[col] ?? 0);
        const bv = Number(b[col] ?? 0);
        return asc ? av - bv : bv - av;
      });
      return builder;
    };
  }

  if (supportRange) {
    builder.range = (from: number, to: number) => {
      onRange?.(from, to);
      rangeSlice = [from, to];
      return builder;
    };
  }

  return builder;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function runTests() {
  console.log("=== Ejecutando suite: Integridad de Paginación, Outs y Filtros LVBP (Spec 037) ===");

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
  const splitsMod = await import("../player-splits-service");
  const leverageMod = await import("../player-leverage-service");

  const {
    supabase,
    supabaseAdmin,
    clearCanonicalSyncCache,
    fetchAllSupabasePages,
    getBattingStats,
    getPitchingStats,
    getCanonicalSeasonGames,
    getCanonicalGameBoxscoreRows,
    reconciledBoxscoreCache,
  } = supabaseMod;
  const { getAllAvailablePlayersForSplits, getPlayerSplitsProfile, clearPlayerSplitsCache } =
    splitsMod;
  const { getPlayerLeverageSplits, clearPlayerLeverageCache } = leverageMod;

  assert.ok(supabase, "El cliente supabase debe inicializarse con variables mock");
  assert.ok(supabaseAdmin, "El cliente supabaseAdmin debe inicializarse con variables mock");

  const originalFetch = globalThis.fetch;
  const mutableSupabase = supabase as unknown as { from: (table: string) => unknown };
  const mutableAdmin = supabaseAdmin as unknown as { from: (table: string) => unknown };
  const originalSupabaseFrom = mutableSupabase.from.bind(supabase);
  const originalAdminFrom = mutableAdmin.from.bind(supabaseAdmin);

  const mockDb = {
    games: [] as MockRow[],
    batting_stats: [] as MockRow[],
    pitching_stats: [] as MockRow[],
    upsertCalls: [] as Array<{ table: string; rows: MockRow[]; onConflict?: string }>,
  };

  mutableAdmin.from = (table: string) => ({
    upsert(payload: MockRow | MockRow[], options?: { onConflict?: string }) {
      const rows = Array.isArray(payload) ? payload : [payload];
      mockDb.upsertCalls.push({ table, rows, onConflict: options?.onConflict });
      return Promise.resolve({ error: null });
    },
  });

  try {
    // ── 1. fetchAllSupabasePages: >10,000 filas, mocks sin range/order y max_rows ──
    console.log("1. Probando fetchAllSupabasePages (paralelo con count, secuencial sin count, cap 500 y mock básico)...");
    const largeRows: MockRow[] = Array.from({ length: 11503 }, (_, idx) => ({
      id: 11503 - idx, // desordenado a propósito para validar .order("id", { ascending: true })
      val: idx,
    }));

    const orderCalls: Array<{ col: string; asc: boolean }> = [];
    const rangeCalls: Array<[number, number]> = [];
    const parallelRes = await fetchAllSupabasePages<MockRow>(
      () =>
        createPaginatedMockQuery(largeRows, {
          supportRange: true,
          supportOrder: true,
          includeExactCount: true,
          maxRowsCap: 1000,
          onOrder: (col, asc) => orderCalls.push({ col, asc }),
          onRange: (from, to) => rangeCalls.push([from, to]),
        }).select("*", { count: "exact" })
    );
    assert.equal(parallelRes.error, null);
    assert.equal(parallelRes.data?.length, 11503, "Debe recuperar las 11,503 filas sin truncar en 10,000");
    assert.equal(parallelRes.data?.[0].id, 1);
    assert.equal(parallelRes.data?.[11502].id, 11503);
    assert.ok(orderCalls.every((c) => c.col === "id" && c.asc === true));
    assert.equal(rangeCalls.length, 12, "11,503 filas en páginas de 1,000 requieren 12 rangos");

    // Sin count y sin .order() (compatibilidad tipo park-factors.test.ts)
    const seqRows: MockRow[] = Array.from({ length: 2350 }, (_, idx) => ({ id: idx + 1 }));
    const seqRes = await fetchAllSupabasePages<MockRow>(() =>
      createPaginatedMockQuery(seqRows, {
        supportRange: true,
        supportOrder: false,
        includeExactCount: false,
        maxRowsCap: 1000,
      }).select("*")
    );
    assert.equal(seqRes.error, null);
    assert.equal(seqRes.data?.length, 2350, "Debe paginar secuencialmente sin count ni .order()");

    // PostgREST max_rows = 500 cuando se pide pageSize = 1000
    const cappedRows: MockRow[] = Array.from({ length: 1250 }, (_, idx) => ({ id: idx + 1 }));
    const cappedRes = await fetchAllSupabasePages<MockRow>(
      () =>
        createPaginatedMockQuery(cappedRows, {
          supportRange: true,
          supportOrder: true,
          includeExactCount: true,
          maxRowsCap: 500,
        }).select("*", { count: "exact" }),
      { pageSize: 1000 }
    );
    assert.equal(cappedRes.error, null);
    assert.equal(cappedRes.data?.length, 1250, "Debe respetar el step real devuelto por PostgREST (500)");

    // Mock legacy sin .range() ni .order()
    const noRangeRes = await fetchAllSupabasePages<MockRow>(() =>
      createPaginatedMockQuery(cappedRows.slice(0, 50), {
        supportRange: false,
        supportOrder: false,
      }).select("*")
    );
    assert.equal(noRangeRes.error, null);
    assert.equal(noRangeRes.data?.length, 50);

    // ── 2. Caso real >10,000 filas: Victor Bericoto (7 HR, 107 AB, 41 H, 31 RBI, .383 AVG) ─
    console.log("2. Probando getBattingStats con 11,503 filas (Victor Bericoto 7 HR y Jonathan Villar post-10,000)...");
    clearCanonicalSyncCache();

    // 25 juegos de Bericoto antes de la fila 10,000 (97 AB, 37 H, 5 HR, 26 RBI)
    const bericotoEarlyRows: MockRow[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      game_id: 870001 + i,
      player_id: 682674,
      team_id: 693,
      ab: i < 22 ? 4 : 3, // 22*4 + 3*3 = 97 AB
      r: i < 15 ? 1 : 0,
      h: i < 12 ? 2 : 1, // 12*2 + 13*1 = 37 H
      doubles: i < 6 ? 1 : 0, // 6 2B
      triples: i === 0 ? 1 : 0, // 1 3B
      hr: i < 5 ? 1 : 0, // 5 HR
      rbi: i === 0 ? 2 : 1, // 26 RBI
      bb: i < 18 ? 1 : 0, // 18 BB
      so: i < 13 ? 1 : 0, // 13 SO
      sb: 0,
      cs: 0,
      hbp: i === 1 ? 1 : 0,
      sf: i === 2 ? 1 : 0,
      sh: 0,
      players: { full_name: "Victor Bericoto" },
      games: {
        id: 870001 + i,
        season: 2026,
        game_type: "R",
        status: "Final",
        game_date: "2026-10-16",
        home_team_id: 693,
        away_team_id: 695,
        home_score: 5,
        away_score: 3,
      },
    }));

    // Relleno hasta >10,000 filas (filas 26..10,050) con pares (game_id, player_id) únicos
    // para que juegos 870030..870065 superen 1,000 filas por lote de 30 juegos en getCanonicalGameBoxscoreRows
    const fillerBatRows: MockRow[] = Array.from({ length: 10025 }, (_, i) => ({
      id: 26 + i,
      game_id: 870030 + (i % 65),
      player_id: 900000 + i,
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
      players: { full_name: `Banca ${i}` },
      games: { season: 2026, game_type: "R", status: "Final" },
    }));

    // 2 juegos de Bericoto después de la fila 10,000 (+10 AB, +4 H, +1 2B, +2 HR, +5 RBI, +2 BB, +2 SO)
    // Total Bericoto: 27 JJ, 107 AB, 41 H, 7 2B, 1 3B, 7 HR, 31 RBI, 20 BB, 15 SO, 1 HBP, 1 SF
    // AVG = 41/107 = .383, OBP = (41+20+1)/(107+20+1+1) = 62/129 = .481 -> wait: con 2 HBP: 63/130 = .485;
    // comprobamos AVG exacto (.383), HR (7), AB (107), H (41), RBI (31)
    const bericotoLateRows: MockRow[] = [
      {
        id: 11201,
        game_id: 870201,
        player_id: 682674,
        team_id: 693,
        ab: 5,
        r: 2,
        h: 2,
        doubles: 1,
        triples: 0,
        hr: 1,
        rbi: 3,
        bb: 1,
        so: 1,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Victor Bericoto" },
        games: {
          id: 870201,
          season: 2026,
          game_type: "R",
          status: "Final",
          game_date: "2026-12-01",
          home_team_id: 693,
          away_team_id: 696,
          home_score: 6,
          away_score: 4,
        },
      },
      {
        id: 11202,
        game_id: 870202,
        player_id: 682674,
        team_id: 693,
        ab: 5,
        r: 2,
        h: 2,
        doubles: 0,
        triples: 0,
        hr: 1,
        rbi: 2,
        bb: 1,
        so: 1,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Victor Bericoto" },
        games: {
          id: 870202,
          season: 2026,
          game_type: "R",
          status: "Final",
          game_date: "2026-12-02",
          home_team_id: 693,
          away_team_id: 698,
          home_score: 7,
          away_score: 2,
        },
      },
      // Jugador completo post-10,000 (Jonathan Villar 542340)
      {
        id: 11500,
        game_id: 870203,
        player_id: 542340,
        team_id: 696,
        ab: 10,
        r: 1,
        h: 2,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 1,
        bb: 0,
        so: 3,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Jonathan Villar" },
        games: {
          id: 870203,
          season: 2026,
          game_type: "R",
          status: "Final",
          game_date: "2026-12-03",
          home_team_id: 696,
          away_team_id: 695,
          home_score: 3,
          away_score: 5,
        },
      },
    ];

    // Filas de juego de exhibición 'E' y 'e' que DEBEN excluirse incluso con phase="all"
    const exhibitionBatRows: MockRow[] = [
      {
        id: 11501,
        game_id: 879001,
        player_id: 682674,
        team_id: 693,
        ab: 4,
        r: 2,
        h: 3,
        doubles: 0,
        triples: 0,
        hr: 2,
        rbi: 4,
        bb: 0,
        so: 0,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Victor Bericoto" },
        games: {
          id: 879001,
          season: 2026,
          game_type: "E",
          status: "Final",
          game_date: "2026-10-10",
          home_team_id: 693,
          away_team_id: 695,
          home_score: 8,
          away_score: 4,
        },
      },
      {
        id: 11502,
        game_id: 879002,
        player_id: 777001,
        team_id: 695,
        ab: 3,
        r: 1,
        h: 2,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 1,
        bb: 1,
        so: 0,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Solo Exhibición" },
        games: {
          id: 879002,
          season: 2026,
          game_type: "e",
          status: "Final",
          game_date: "2026-10-11",
          home_team_id: 695,
          away_team_id: 696,
          home_score: 4,
          away_score: 1,
        },
      },
    ];

    mockDb.batting_stats = [
      ...bericotoEarlyRows,
      ...fillerBatRows,
      ...bericotoLateRows,
      ...exhibitionBatRows,
    ];

    mockDb.games = [
      {
        id: 870001,
        game_pk: 870001,
        season: 2026,
        game_date: "2026-10-16",
        game_type: "R",
        status: "Final",
        home_team_id: 693,
        away_team_id: 695,
        home_score: 5,
        away_score: 3,
      },
      {
        id: 879001,
        game_pk: 879001,
        season: 2026,
        game_date: "2026-10-10",
        game_type: "E",
        status: "Final",
        home_team_id: 693,
        away_team_id: 695,
        home_score: 8,
        away_score: 4,
      },
    ];

    // ── 3. Pitcheo: suma exacta de outs (sin deriva ip_decimal.toFixed(1)) y exclusión 'E' ─
    mockDb.pitching_stats = [
      // Adolfo Oviedo: 3.1 + 3.1 = 6.2 IP (20 outs -> 6.67, ERA 7*9/(20/3) = 9.45)
      {
        id: 1,
        game_id: 870001,
        player_id: 700101,
        team_id: 695,
        ip_decimal: 3.33,
        h: 5,
        r: 4,
        er: 4,
        bb: 2,
        hbp: 0,
        so: 3,
        hr: 1,
        players: { full_name: "Adolfo Oviedo" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      {
        id: 2,
        game_id: 870002,
        player_id: 700101,
        team_id: 695,
        ip_decimal: 3.33,
        h: 4,
        r: 3,
        er: 3,
        bb: 1,
        hbp: 0,
        so: 4,
        hr: 0,
        players: { full_name: "Adolfo Oviedo" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      // Henry Gómez: 3.1 + 3.1 + 4.0 = 10.2 IP (32 outs -> 10.67, ERA 5*9/(32/3) = 4.22)
      {
        id: 3,
        game_id: 870001,
        player_id: 700102,
        team_id: 693,
        ip_decimal: 3.33,
        h: 4,
        r: 2,
        er: 2,
        bb: 1,
        hbp: 0,
        so: 3,
        hr: 0,
        players: { full_name: "Henry Gómez" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      {
        id: 4,
        game_id: 870002,
        player_id: 700102,
        team_id: 693,
        ip_decimal: 3.33,
        h: 3,
        r: 2,
        er: 2,
        bb: 1,
        hbp: 0,
        so: 2,
        hr: 1,
        players: { full_name: "Henry Gómez" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      {
        id: 5,
        game_id: 870003,
        player_id: 700102,
        team_id: 693,
        ip_decimal: 4.0,
        h: 3,
        r: 1,
        er: 1,
        bb: 1,
        hbp: 0,
        so: 4,
        hr: 0,
        players: { full_name: "Henry Gómez" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      // Touki Toussaint: 0.1 + 0.1 = 0.2 IP (2 outs -> 0.67, ERA 5*9/(2/3) = 67.50)
      {
        id: 6,
        game_id: 870001,
        player_id: 700103,
        team_id: 698,
        ip_decimal: 0.33,
        h: 2,
        r: 3,
        er: 3,
        bb: 2,
        hbp: 0,
        so: 0,
        hr: 0,
        players: { full_name: "Touki Toussaint" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      {
        id: 7,
        game_id: 870002,
        player_id: 700103,
        team_id: 698,
        ip_decimal: 0.33,
        h: 2,
        r: 2,
        er: 2,
        bb: 1,
        hbp: 0,
        so: 1,
        hr: 0,
        players: { full_name: "Touki Toussaint" },
        games: { season: 2026, game_type: "R", status: "Final" },
      },
      // Exhibición 'E' que debe excluirse
      {
        id: 8,
        game_id: 879001,
        player_id: 700999,
        team_id: 695,
        ip_decimal: 5.0,
        h: 1,
        r: 0,
        er: 0,
        bb: 0,
        hbp: 0,
        so: 10,
        hr: 0,
        players: { full_name: "Pitcher Exhibición" },
        games: { season: 2026, game_type: "E", status: "Final" },
      },
    ];

    mutableSupabase.from = (table: string) => {
      if (table === "games") return createPaginatedMockQuery(mockDb.games);
      if (table === "batting_stats") return createPaginatedMockQuery(mockDb.batting_stats);
      if (table === "pitching_stats") return createPaginatedMockQuery(mockDb.pitching_stats);
      return createPaginatedMockQuery([]);
    };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/v1/schedule")) {
        return jsonResponse({
          dates: [
            {
              date: "2026-10-18",
              games: [
                {
                  gamePk: 870099,
                  gameType: "R",
                  officialDate: "2026-10-18",
                  gameDate: "2026-10-18T23:00:00Z",
                  status: { detailedState: "Final" },
                  teams: {
                    home: { team: { id: 695 }, score: 4 },
                    away: { team: { id: 696 }, score: 1 },
                  },
                },
              ],
            },
          ],
        });
      }
      if (url.includes("/api/v1.1/game/870099/feed/live")) {
        return jsonResponse({
          gamePk: 870099,
          gameData: {
            game: { pk: 870099, season: "2026", type: "R" },
            status: { detailedState: "Final" },
            teams: { home: { id: 695 }, away: { id: 696 } },
          },
          liveData: {
            boxscore: {
              teams: {
                home: {
                  team: { id: 695 },
                  players: {
                    ID602922: {
                      person: { id: 602922, fullName: "José Rondón" },
                      stats: {
                        batting: { plateAppearances: 4, atBats: 4, hits: 2, runs: 1, rbi: 2 },
                      },
                    },
                  },
                },
                away: { team: { id: 696 }, players: {} },
              },
            },
          },
        });
      }
      return jsonResponse({ stats: [{ splits: [] }] });
    }) as typeof fetch;

    const batAll = await getBattingStats(2026, "all", "all", 500, 0);
    const bericoto = batAll.find((b) => b.playerId === 682674);
    assert.ok(bericoto, "Victor Bericoto debe aparecer en getBattingStats");
    assert.equal(bericoto.games, 27, "Bericoto debe sumar 27 juegos regulares (sin exhibición)");
    assert.equal(bericoto.atBats, 107, "Bericoto debe sumar 107 AB");
    assert.equal(bericoto.hits, 41, "Bericoto debe sumar 41 H");
    assert.equal(bericoto.homeRuns, 7, "Bericoto debe sumar 7 HR tras paginar >10,000 filas");
    assert.equal(bericoto.rbi, 31, "Bericoto debe sumar 31 RBI");
    assert.equal(bericoto.avg, 0.383, "AVG de Bericoto debe ser .383");

    const villar = batAll.find((b) => b.playerId === 542340);
    assert.ok(villar, "Jonathan Villar (post fila 10,000) no debe desaparecer");
    assert.equal(villar.atBats, 10);
    assert.equal(villar.hits, 2);

    assert.equal(
      batAll.find((b) => b.playerId === 777001),
      undefined,
      "Jugador de exhibición 'e' no debe aparecer en getBattingStats(phase='all')"
    );

    const pitAll = await getPitchingStats(2026, "all", "all", 500, 0);
    const oviedo = pitAll.find((p) => p.playerId === 700101);
    const gomez = pitAll.find((p) => p.playerId === 700102);
    const touki = pitAll.find((p) => p.playerId === 700103);
    assert.ok(oviedo && gomez && touki);

    assert.equal(oviedo.inningsPitched, 6.67);
    assert.equal(oviedo.inningsDisplay, "6.2");
    assert.equal(oviedo.era, 9.45, "Adolfo Oviedo ERA debe ser 9.45 (20 outs), nunca 9.40");

    assert.equal(gomez.inningsPitched, 10.67);
    assert.equal(gomez.inningsDisplay, "10.2");
    assert.equal(gomez.era, 4.22, "Henry Gómez ERA debe ser 4.22 (32 outs), nunca 4.25");

    assert.equal(touki.inningsPitched, 0.67);
    assert.equal(touki.inningsDisplay, "0.2");
    assert.equal(touki.era, 67.5, "Touki Toussaint ERA debe ser 67.50 (2 outs), nunca 64.29");

    assert.equal(
      pitAll.find((p) => p.playerId === 700999),
      undefined,
      "Lanzador de exhibición 'E' no debe aparecer en getPitchingStats(phase='all')"
    );

    // Verificar write-through canonical game_type="R" (no "regular") y exclusión de 'E' en getCanonicalSeasonGames('all')
    const gamesUpserts = mockDb.upsertCalls.filter((c) => c.table === "games");
    assert.ok(gamesUpserts.length > 0, "Debe ejecutar write-through de games");
    assert.ok(
      gamesUpserts.every((c) => c.rows.every((r) => r.game_type === "R")),
      "Write-through debe guardar game_type='R' y nunca 'regular'"
    );
    const seasonGamesAll = await getCanonicalSeasonGames(2026, "all");
    assert.equal(
      seasonGamesAll.some((g) => Number(g.id) === 879001),
      false,
      "getCanonicalSeasonGames('all') debe excluir juegos de exhibición 'E'"
    );

    // ── 4. getCanonicalGameBoxscoreRows: chunking >30 juegos + paginación + dedup cache ─
    console.log("3. Probando getCanonicalGameBoxscoreRows con chunking, >1,000 filas y reconciledBoxscoreCache...");
    const targetGameIds = Array.from({ length: 65 }, (_, i) => 870001 + i);
    // Agregar filas adicionales para cubrir juego 870099 (también en reconciledBoxscoreCache)
    mockDb.batting_stats.push({
      id: 99999,
      game_id: 870099,
      player_id: 602922,
      team_id: 695,
      ab: 4,
      r: 1,
      h: 2,
      doubles: 0,
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
      players: { full_name: "José Rondón" },
    });

    const boxRes = await getCanonicalGameBoxscoreRows(2026, [...targetGameIds, 870099]);
    assert.ok(
      reconciledBoxscoreCache.has(870099),
      "reconciledBoxscoreCache debe contener el juego 870099"
    );
    const rondon870099Rows = boxRes.battingRows.filter(
      (r) => Number(r.game_id) === 870099 && Number(r.player_id) === 602922
    );
    assert.equal(
      rondon870099Rows.length,
      1,
      "getCanonicalGameBoxscoreRows debe deduplicar BD + reconciledBoxscoreCache"
    );
    assert.ok(
      boxRes.battingRows.length > 1000,
      `Debe devolver >1,000 filas combinadas entre chunks y páginas (obtenidas: ${boxRes.battingRows.length})`
    );

    // ── 5. Splits y Leverage: paginación >10,000 y exclusión de exhibición 'E'/'e' ──
    console.log("4. Probando player-splits-service y player-leverage-service (paginación y exclusión 'E')...");
    clearPlayerSplitsCache();
    clearPlayerLeverageCache();

    const availablePlayers = await getAllAvailablePlayersForSplits(2026);
    assert.ok(
      availablePlayers.some((p) => p.id === 682674),
      "Victor Bericoto debe estar en el selector de splits"
    );
    assert.ok(
      availablePlayers.some((p) => p.id === 542340),
      "Jonathan Villar (post-10,000) debe estar en el selector de splits"
    );
    assert.equal(
      availablePlayers.some((p) => p.id === 777001 || p.id === 700999),
      false,
      "Jugadores solo de exhibición 'E'/'e' no deben aparecer en el selector de splits"
    );

    const bericotoProfile = await getPlayerSplitsProfile(682674, "batter", 2026);
    assert.ok(bericotoProfile);
    assert.equal(
      bericotoProfile.totalGames,
      27,
      "Perfil de splits debe contar solo los 27 juegos regulares (sin exhibición 'E')"
    );

    const leverageResult = await getPlayerLeverageSplits(682674, "batter", 2026);
    assert.equal(
      leverageResult.gamesAnalyzed,
      0,
      "Leverage sin feeds mockeados valida que no falle al excluir 'E'"
    );

    console.log("=== TODAS LAS PRUEBAS DE INTEGRIDAD DE PAGINACIÓN Y OUTS PASARON EXITOSAMENTE ===");
  } finally {
    clearCanonicalSyncCache();
    clearPlayerSplitsCache();
    clearPlayerLeverageCache();
    mutableSupabase.from = originalSupabaseFrom;
    mutableAdmin.from = originalAdminFrom;
    globalThis.fetch = originalFetch;

    if (prevEnv.NEXT_PUBLIC_SUPABASE_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = prevEnv.NEXT_PUBLIC_SUPABASE_URL;

    if (prevEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (prevEnv.SUPABASE_SERVICE_ROLE_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevEnv.SUPABASE_SERVICE_ROLE_KEY;
  }
}

runTests().catch((err) => {
  console.error("Fallo en stats-pagination-integrity.test.ts:", err);
  process.exit(1);
});
