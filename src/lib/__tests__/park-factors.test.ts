import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

type MockRow = Record<string, unknown>;

interface ThenableQuery {
  select: () => ThenableQuery;
  in: (col: string, vals: unknown[]) => ThenableQuery;
  limit: (n: number) => ThenableQuery;
  range: (from: number, to: number) => ThenableQuery;
  then: <TResult1 = { data: MockRow[]; error: null }, TResult2 = never>(
    onFulfilled?:
      | ((value: { data: MockRow[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

function createMockQuery(rows: MockRow[]): ThenableQuery {
  let filtered = [...rows];
  const builder: ThenableQuery = {
    select() {
      return builder;
    },
    in(col: string, vals: unknown[]) {
      const set = new Set((vals || []).map((v) => String(v)));
      filtered = filtered.filter((r) => set.has(String(r[col])));
      return builder;
    },
    limit(n: number) {
      filtered = filtered.slice(0, n);
      return builder;
    },
    range(from: number, to: number) {
      filtered = filtered.slice(from, to + 1);
      return builder;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve({ data: filtered, error: null }).then(
        onFulfilled,
        onRejected
      );
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
  console.log("=== Ejecutando suite: Factores de Parque LVBP (Spec 031) ===");

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

  const pfMod = await import("../park-factors-service");
  const supabaseMod = await import("../supabase");
  const routeMod = await import("../../app/api/park-factors/route");

  const originalFetch = globalThis.fetch;
  const mutableSupabase = supabaseMod.supabase as unknown as {
    from: (table: string) => unknown;
  };
  const originalFrom = mutableSupabase?.from;

  try {
    // ── 1. Normalización canónica de estadios ────────────────────────────────
    console.log("1. Probando resolveCanonicalVenueId para los 9 estadios LVBP y alternos...");
    assert.equal(
      pfMod.resolveCanonicalVenueId("Monumental Simon Bolivar").venueId,
      "monumental"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Universitario").venueId,
      "universitario"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Jorge Luis Garcia Carneiro").venueId,
      "macuto"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Alfonso Carrasquel").venueId,
      "plc"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Luis Aparicio").venueId,
      "maracaibo"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Jose Bernardo Perez").venueId,
      "valencia"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Antonio Herrera Gutierrez").venueId,
      "barquisimeto"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Jose Perez Colmenares").venueId,
      "maracay"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Nueva Esparta").venueId,
      "margarita"
    );
    assert.equal(
      pfMod.resolveCanonicalVenueId("Estadio Metropolitano de San Cristobal").venueId,
      "estadio_metropolitano_de_san_cristobal"
    );
    assert.equal(pfMod.resolveCanonicalVenueId("", 695).venueId, "monumental");

    // ── 2. Convergencia iterativa sin sesgo de equipo + regresión bayesiana ──
    console.log("2. Probando computeIterativeParkFactors (aislamiento de calidad y k=30)...");
    const syntheticGames = [
      // Parque hitter-friendly (1.30x), equipo 694 fuerte (1.50x) vs equipo 692 débil (0.75x)
      // Si se usaran promedios brutos, 694 sesgaría su propio estadio; el iterativo debe aislar 1.30 vs 0.70.
      ...Array.from({ length: 10 }, (_, idx) => ({
        gameId: 100 + idx,
        season: 2025,
        venueId: "plc",
        venueDisplayName: "Puerto La Cruz",
        homeTeamId: 694,
        awayTeamId: 692,
        metrics: {
          r: 10 * 1.5 * 0.75 * 1.3,
          hr: 2,
          h: 18,
          doubles: 3,
          triples: 0,
          bb: 6,
          so: 12,
        },
      })),
      ...Array.from({ length: 10 }, (_, idx) => ({
        gameId: 200 + idx,
        season: 2025,
        venueId: "maracaibo",
        venueDisplayName: "Maracaibo",
        homeTeamId: 692,
        awayTeamId: 694,
        metrics: {
          r: 10 * 0.75 * 1.5 * 0.7,
          hr: 1,
          h: 14,
          doubles: 2,
          triples: 0,
          bb: 5,
          so: 14,
        },
      })),
    ];

    const pfMap = pfMod.computeIterativeParkFactors(syntheticGames, "r", 30);
    const plcPf = pfMap.get("plc")!;
    const maracaiboPf = pfMap.get("maracaibo")!;
    assert.ok(
      Math.abs(plcPf.raw - 1.3) < 0.02,
      `PLC raw PF debe converger cerca de 1.30 (obtenido: ${plcPf.raw})`
    );
    assert.ok(
      Math.abs(maracaiboPf.raw - 0.7) < 0.02,
      `Maracaibo raw PF debe converger cerca de 0.70 (obtenido: ${maracaiboPf.raw})`
    );
    // Con n=10 y k=30, stabilized = (10*raw + 30*1.0)/40 = 0.25*raw + 0.75
    assert.ok(
      plcPf.stabilized < plcPf.raw && plcPf.stabilized > 1.0,
      "Estabilización k=30 debe contraer hacia 1.000"
    );
    const weightedAvg = (plcPf.raw * 10 + maracaiboPf.raw * 10) / 20;
    assert.ok(
      Math.abs(weightedAvg - 1.0) < 0.01,
      `El promedio ponderado debe ser ~1.000 (obtenido: ${weightedAvg})`
    );

    // ── 3. getParkFactorsData con mocks MLB API + Supabase paginado (>1000 filas) ──
    console.log("3. Probando getParkFactorsData (separación UCV/Macuto y paginación Supabase)...");
    pfMod.clearParkFactorsCache();

    const mockGamesTable: MockRow[] = [
      // Monumental (6 JJ)
      ...Array.from({ length: 6 }, (_, i) => ({
        id: 5000 + i,
        season: 2025,
        game_type: "R",
        status: "Final",
        venue: "Monumental Simon Bolivar",
        home_team_id: 695,
        away_team_id: 694,
        home_score: 5,
        away_score: 4,
      })),
      // PLC (6 JJ)
      ...Array.from({ length: 6 }, (_, i) => ({
        id: 6000 + i,
        season: 2025,
        game_type: "R",
        status: "Final",
        venue: "Estadio Alfonso Carrasquel",
        home_team_id: 694,
        away_team_id: 695,
        home_score: 8,
        away_score: 6,
      })),
      // Tiburones split: 3 JJ en UCV (12 R/J) vs 695 + 3 JJ en Macuto (5 R/J) vs 695
      ...Array.from({ length: 3 }, (_, i) => ({
        id: 7000 + i,
        season: 2026,
        game_type: "R",
        status: "Final",
        venue: "Estadio Universitario",
        home_team_id: 698,
        away_team_id: 695,
        home_score: 7,
        away_score: 5,
      })),
      ...Array.from({ length: 3 }, (_, i) => ({
        id: 8000 + i,
        season: 2026,
        game_type: "R",
        status: "Final",
        venue: "Estadio Jorge Luis Garcia Carneiro",
        home_team_id: 698,
        away_team_id: 695,
        home_score: 3,
        away_score: 2,
      })),
      // Plaza alterna (1 JJ)
      {
        id: 9001,
        season: 2025,
        game_type: "R",
        status: "Final",
        venue: "Estadio Metropolitano de San Cristobal",
        home_team_id: 697,
        away_team_id: 695,
        home_score: 8,
        away_score: 7,
      },
    ];

    // Generar >1050 filas en batting_stats para validar paginación sin pérdida
    const mockBatTable: MockRow[] = [];
    for (const g of mockGamesTable) {
      const gid = Number(g.id);
      const isPlc = gid >= 6000 && gid < 7000;
      // 60 filas por juego => 19*60 = 1140 filas totales (y chunk de 30 juegos > 1000)
      for (let rIdx = 0; rIdx < 60; rIdx++) {
        mockBatTable.push({
          game_id: gid,
          r: rIdx === 0 ? Number(g.home_score) + Number(g.away_score) : 0,
          h: rIdx < 10 ? 1 : 0,
          doubles: rIdx < (gid >= 5000 && gid < 6000 ? 4 : 2) ? 1 : 0,
          triples: 0,
          hr: rIdx < (isPlc ? 3 : 1) ? 1 : 0,
          bb: rIdx < 4 ? 1 : 0,
          so: rIdx < 8 ? 1 : 0,
        });
      }
    }

    mutableSupabase.from = (table: string) => {
      if (table === "games") return createMockQuery(mockGamesTable);
      if (table === "batting_stats") return createMockQuery(mockBatTable);
      return createMockQuery([]);
    };

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const match = url.match(/season=(\d{4})/);
      const season = match ? Number(match[1]) : 2026;
      const seasonGames = mockGamesTable
        .filter((g) => Number(g.season) === season)
        .map((g) => ({
          gamePk: g.id,
          gameType: "R",
          status: { abstractGameState: "Final", detailedState: "Final" },
          venue: { name: g.venue },
          teams: {
            home: { team: { id: g.home_team_id }, score: g.home_score },
            away: { team: { id: g.away_team_id }, score: g.away_score },
          },
        }));
      return jsonResponse({ dates: [{ date: `${season}-11-01`, games: seasonGames }] });
    }) as typeof fetch;

    const multiRes = await pfMod.getParkFactorsData("multi");
    assert.equal(multiRes.totalRunsGames, 19);
    assert.equal(multiRes.totalBoxscoreGames, 19);
    assert.equal(multiRes.hasEventFactors, true);
    assert.equal(multiRes.alternateVenues.length, 1);
    assert.equal(multiRes.alternateVenues[0].games, 1);

    const plcRow = multiRes.stadiums.find((s) => s.stadiumId === "plc");
    const monRow = multiRes.stadiums.find((s) => s.stadiumId === "monumental");
    const ucvRow = multiRes.stadiums.find((s) => s.stadiumId === "universitario");
    const macRow = multiRes.stadiums.find((s) => s.stadiumId === "macuto");
    assert.ok(plcRow && monRow && ucvRow && macRow);
    assert.equal(plcRow.runsGames, 6);
    assert.equal(plcRow.boxscoreGames, 6);
    assert.ok(
      (plcRow.metrics.hr?.raw ?? 0) > (monRow.metrics.hr?.raw ?? 0),
      "PLC debe tener mayor PF de HR que Monumental tras leer todas las filas paginadas"
    );
    assert.ok(
      (monRow.metrics.doubles?.raw ?? 0) > (plcRow.metrics.doubles?.raw ?? 0),
      "Monumental debe liderar en PF de Dobles (2B)"
    );
    assert.ok(
      ucvRow.metrics.r.raw > macRow.metrics.r.raw,
      "UCV y Macuto deben calcularse por separado con UCV > Macuto"
    );

    const res2024 = await pfMod.getParkFactorsData("2024");
    assert.equal(res2024.hasEventFactors, false);
    assert.deepEqual(res2024.boxscoreSeasons, []);

    // ── 4. Route handler /api/park-factors ────────────────────────────────────
    console.log("4. Probando route handler GET /api/park-factors...");
    const badReq = new NextRequest("http://localhost:3000/api/park-factors?scope=invalid");
    const badRes = await routeMod.GET(badReq);
    assert.equal(badRes.status, 400);

    const closedReq = new NextRequest("http://localhost:3000/api/park-factors?scope=2025");
    const closedRes = await routeMod.GET(closedReq);
    assert.equal(closedRes.status, 200);
    assert.equal(
      closedRes.headers.get("Cache-Control"),
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=300"
    );

    const activeReq = new NextRequest("http://localhost:3000/api/park-factors?scope=multi");
    const activeRes = await routeMod.GET(activeReq);
    assert.equal(activeRes.status, 200);
    assert.equal(
      activeRes.headers.get("Cache-Control"),
      "public, max-age=300, s-maxage=300, stale-while-revalidate=60"
    );

    // ── 5. Auditoría de copy sin términos prohibidos ('saberm*') ──────────────
    console.log("5. Auditando ausencia de términos prohibidos ('saberm*')...");
    const rootDir = path.resolve(__dirname, "../../..");
    const filesToAudit = [
      "src/types/park-factors.ts",
      "src/lib/park-factors-service.ts",
      "src/app/api/park-factors/route.ts",
      "src/app/park-factors/page.tsx",
      "src/components/park-factors/park-factors-view.tsx",
    ];
    for (const rel of filesToAudit) {
      const content = fs.readFileSync(path.join(rootDir, rel), "utf8");
      assert.equal(
        /saberm/i.test(content),
        false,
        `El archivo ${rel} no debe contener 'sabermétrico/a/ía'`
      );
    }

    console.log("=== TODAS LAS PRUEBAS DE FACTORES DE PARQUE PASARON EXITOSAMENTE ===");
  } finally {
    globalThis.fetch = originalFetch;
    if (mutableSupabase && originalFrom) {
      mutableSupabase.from = originalFrom;
    }
    pfMod.clearParkFactorsCache();
    process.env.NEXT_PUBLIC_SUPABASE_URL = prevEnv.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevEnv.SUPABASE_SERVICE_ROLE_KEY;
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
