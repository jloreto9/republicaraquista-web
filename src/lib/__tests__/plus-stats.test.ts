import assert from "node:assert/strict";
import { BattingStats, PitchingStats } from "../../types/sports";

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

function makeBatter(
  overrides: Partial<BattingStats> & { playerId: number; playerName: string }
): BattingStats {
  const ab = overrides.atBats ?? 100;
  const h = overrides.hits ?? 30;
  const doubles = overrides.doubles ?? 5;
  const triples = overrides.triples ?? 1;
  const hr = overrides.homeRuns ?? 3;
  const bb = overrides.walks ?? 10;
  const hbp = overrides.hbp ?? 0;
  const sf = overrides.sf ?? 0;
  const sh = overrides.sh ?? 0;
  const singles = Math.max(0, h - doubles - triples - hr);
  const avg = overrides.avg ?? (ab > 0 ? Number((h / ab).toFixed(3)) : 0);
  const obpDen = ab + bb + hbp + sf;
  const obp = overrides.obp ?? (obpDen > 0 ? Number(((h + bb + hbp) / obpDen).toFixed(3)) : 0);
  const slg =
    overrides.slg ??
    (ab > 0 ? Number(((singles + 2 * doubles + 3 * triples + 4 * hr) / ab).toFixed(3)) : 0);
  const ops = overrides.ops ?? Number((obp + slg).toFixed(3));

  const base: BattingStats = {
    playerId: overrides.playerId,
    playerName: overrides.playerName,
    playerAvatar: `/assets/players/${overrides.playerId}.png`,
    teamId: overrides.teamId ?? 695,
    teamName: overrides.teamName ?? "Leones del Caracas",
    teamAbbr: overrides.teamAbbr ?? "CAR",
    teamLogo: `/logos/${overrides.teamId ?? 695}.png`,
    games: overrides.games ?? 25,
    atBats: ab,
    runs: overrides.runs ?? 15,
    hits: h,
    doubles,
    triples,
    homeRuns: hr,
    rbi: overrides.rbi ?? 15,
    walks: bb,
    strikeouts: overrides.strikeouts ?? 18,
    stolenBases: overrides.stolenBases ?? 2,
    caughtStealing: overrides.caughtStealing ?? 1,
    gidp: overrides.gidp ?? 1,
    hbp: overrides.hbp,
    sf: overrides.sf,
    sh: overrides.sh,
    avg,
    obp,
    slg,
    ops,
    iso: overrides.iso ?? Number((slg - avg).toFixed(3)),
    babip: overrides.babip ?? 0.3,
  };

  if ("plateAppearances" in overrides) {
    base.plateAppearances = overrides.plateAppearances;
  } else {
    base.plateAppearances = ab + bb + hbp + sf + sh;
  }
  if ("pa" in overrides) {
    base.pa = overrides.pa;
  }

  return base;
}

function makePitcher(
  overrides: Partial<PitchingStats> & { playerId: number; playerName: string }
): PitchingStats {
  const ip = overrides.inningsPitched ?? 50;
  const er = overrides.earnedRuns ?? 20;
  const h = overrides.hits ?? 45;
  const bb = overrides.walks ?? 15;
  const so = overrides.strikeouts ?? 40;
  const era = overrides.era ?? (ip > 0 ? Number(((er * 9) / ip).toFixed(2)) : 0);
  const whip = overrides.whip ?? (ip > 0 ? Number(((h + bb) / ip).toFixed(2)) : 0);

  return {
    playerId: overrides.playerId,
    playerName: overrides.playerName,
    playerAvatar: `/assets/players/${overrides.playerId}.png`,
    teamId: overrides.teamId ?? 695,
    teamName: overrides.teamName ?? "Leones del Caracas",
    teamAbbr: overrides.teamAbbr ?? "CAR",
    teamLogo: `/logos/${overrides.teamId ?? 695}.png`,
    games: overrides.games ?? 10,
    gamesStarted: overrides.gamesStarted ?? 8,
    inningsPitched: ip,
    inningsDisplay: overrides.inningsDisplay ?? `${Math.floor(ip)}.0`,
    hits: h,
    runs: overrides.runs ?? er,
    earnedRuns: er,
    walks: bb,
    strikeouts: so,
    homeRuns: overrides.homeRuns ?? 4,
    gidp: overrides.gidp ?? 2,
    hbp: overrides.hbp,
    era,
    whip,
    kPer9: overrides.kPer9 ?? (ip > 0 ? Number(((so * 9) / ip).toFixed(2)) : 0),
    bbPer9: overrides.bbPer9 ?? (ip > 0 ? Number(((bb * 9) / ip).toFixed(2)) : 0),
    kToBb: overrides.kToBb ?? (bb > 0 ? Number((so / bb).toFixed(2)) : so),
    wins: overrides.wins ?? 3,
    losses: overrides.losses ?? 2,
    saves: overrides.saves ?? 0,
  };
}

async function runTests() {
  console.log("=== Ejecutando suite: wOBA, FIP y Stats+ (Spec 034) ===");

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
  const {
    supabase,
    clearCanonicalSyncCache,
    enrichBattingStatsWithPlus,
    enrichPitchingStatsWithPlus,
    getBattingStats,
    getPitchingStats,
  } = supabaseMod;

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
    // ── 1. Arreglos vacíos y pureza (sin mutar inputs) ─────────────────────────
    console.log("1. Validando arreglos vacíos e inmutabilidad...");
    assert.deepEqual(enrichBattingStatsWithPlus([]), []);
    assert.deepEqual(enrichPitchingStatsWithPlus([]), []);

    const immBatter = makeBatter({ playerId: 1, playerName: "Inmutable B" });
    const immPitcher = makePitcher({ playerId: 2, playerName: "Inmutable P" });
    const enrichedBatImm = enrichBattingStatsWithPlus([immBatter]);
    const enrichedPitImm = enrichPitchingStatsWithPlus([immPitcher]);
    assert.equal(immBatter.woba, undefined, "No debe mutar el objeto de entrada de bateo");
    assert.equal(immPitcher.fip, undefined, "No debe mutar el objeto de entrada de pitcheo");
    assert.notEqual(enrichedBatImm[0], immBatter);
    assert.notEqual(enrichedPitImm[0], immPitcher);

    // ── 2. Fórmulas exactas de bateo (wOBA y Stats+) ───────────────────────────
    console.log("2. Validando fórmulas exactas de wOBA, AVG+, OBP+, SLG+, OPS+, wOBA+, wRC+...");
    const batterElite = makeBatter({
      playerId: 101,
      playerName: "Bateador Élite",
      atBats: 100,
      hits: 35,
      doubles: 8,
      triples: 2,
      homeRuns: 6,
      walks: 18,
      hbp: 2,
      sf: 2,
      sh: 1,
      runs: 25,
    });
    const batterAvg = makeBatter({
      playerId: 102,
      playerName: "Bateador Medio",
      atBats: 100,
      hits: 22,
      doubles: 3,
      triples: 0,
      homeRuns: 1,
      walks: 6,
      hbp: 0,
      sf: 1,
      sh: 0,
      runs: 9,
    });
    const batterSmallNoPaField = makeBatter({
      playerId: 103,
      playerName: "Emergente Sin PA",
      atBats: 5,
      hits: 1,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 1,
      runs: 1,
      plateAppearances: undefined,
      pa: undefined,
    });

    const batRes = enrichBattingStatsWithPlus([batterElite, batterAvg, batterSmallNoPaField]);
    assert.equal(batRes.length, 3);

    // Bateador 1: wobaRaw = 56.738 / 122 = 0.46506557... -> 0.465
    assert.equal(batRes[0].woba, 0.465);
    assert.equal(batRes[0].avgPlus, 124);
    assert.equal(batRes[0].obpPlus, 125);
    assert.equal(batRes[0].slgPlus, 142);
    assert.equal(batRes[0].opsPlus, 166);
    assert.equal(batRes[0].wobaPlus, 130);
    assert.equal(batRes[0].wrcPlus, 162);

    // Bateador 2: wobaRaw = 26.038 / 107 = 0.24334579... -> 0.243
    assert.equal(batRes[1].woba, 0.243);
    assert.equal(batRes[1].avgPlus, 78);
    assert.equal(batRes[1].obpPlus, 72);
    assert.equal(batRes[1].slgPlus, 61);
    assert.equal(batRes[1].opsPlus, 33);
    assert.equal(batRes[1].wobaPlus, 68);
    assert.equal(batRes[1].wrcPlus, 32);

    // Bateador 3: wobaRaw = 1.578 / 6 = 0.263
    assert.equal(batRes[2].woba, 0.263);
    assert.equal(batRes[2].avgPlus, 71);
    assert.equal(batRes[2].obpPlus, 92);
    assert.equal(batRes[2].slgPlus, 44);
    assert.equal(batRes[2].opsPlus, 36);
    assert.equal(batRes[2].wobaPlus, 73);
    assert.equal(batRes[2].wrcPlus, 44);

    // Verificar fallback a `pa` cuando `plateAppearances` es undefined
    const batterWithPaOnly = makeBatter({
      playerId: 104,
      playerName: "Solo PA",
      atBats: 10,
      hits: 4,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 2,
      runs: 4,
      plateAppearances: undefined,
      pa: 12,
    });
    const singlePaRes = enrichBattingStatsWithPlus([batterWithPaOnly]);
    assert.equal(singlePaRes[0].woba, 0.411);
    assert.equal(singlePaRes[0].wobaPlus, 100);
    assert.equal(singlePaRes[0].wrcPlus, 100);

    // ── 3. Casos borde de bateo (0 AB, solo BB, división por cero, clamp >= 0) ─
    console.log("3. Validando casos borde de bateo (0 AB, 0 PA, 0 carreras, clamp a 0)...");
    const zeroBatter = makeBatter({
      playerId: 105,
      playerName: "Cero Turnos",
      atBats: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      runs: 0,
    });
    const walkOnlyBatter = makeBatter({
      playerId: 106,
      playerName: "Solo Boletos",
      atBats: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 2,
      runs: 1,
    });
    const hitlessBatter = makeBatter({
      playerId: 107,
      playerName: "Sin Hits",
      atBats: 50,
      hits: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      walks: 0,
      runs: 0,
      avg: 0,
      obp: 0,
      slg: 0,
      ops: 0,
    });

    const edgeBatPool = enrichBattingStatsWithPlus([
      zeroBatter,
      walkOnlyBatter,
      hitlessBatter,
      batterElite,
    ]);
    // 0 AB y 0 wobaDen -> todo en 0
    assert.equal(edgeBatPool[0].woba, 0);
    assert.equal(edgeBatPool[0].avgPlus, 0);
    assert.equal(edgeBatPool[0].obpPlus, 0);
    assert.equal(edgeBatPool[0].slgPlus, 0);
    assert.equal(edgeBatPool[0].opsPlus, 0);
    assert.equal(edgeBatPool[0].wobaPlus, 0);
    assert.equal(edgeBatPool[0].wrcPlus, 0);

    // 0 AB pero con BB -> avgPlus/slgPlus/opsPlus = 0, woba/obpPlus/wobaPlus > 0
    assert.equal(edgeBatPool[1].woba, 0.69);
    assert.equal(edgeBatPool[1].avgPlus, 0);
    assert.equal(edgeBatPool[1].slgPlus, 0);
    assert.equal(edgeBatPool[1].opsPlus, 0);
    assert.ok((edgeBatPool[1].obpPlus ?? 0) > 100);
    assert.ok((edgeBatPool[1].wobaPlus ?? 0) > 100);

    // Bateador 0-for-50 -> opsPlus y wrcPlus clamped a 0 (nunca negativos)
    assert.equal(edgeBatPool[2].opsPlus, 0);
    assert.equal(edgeBatPool[2].wrcPlus, 0);

    // Pool completo en ceros (evita división por cero y NaN)
    const allZeroBatPool = enrichBattingStatsWithPlus([zeroBatter]);
    assert.equal(allZeroBatPool[0].woba, 0);
    assert.equal(allZeroBatPool[0].avgPlus, 0);
    assert.equal(allZeroBatPool[0].obpPlus, 0);
    assert.equal(allZeroBatPool[0].slgPlus, 0);
    assert.equal(allZeroBatPool[0].opsPlus, 0);
    assert.equal(allZeroBatPool[0].wobaPlus, 0);
    assert.equal(allZeroBatPool[0].wrcPlus, 0);

    // Pool con sumRuns === 0 -> lgRunsPerPa = 0 -> wrcPlus = 0 (sin Infinity/NaN)
    const noRunsBatter = makeBatter({
      playerId: 108,
      playerName: "Sin Anotadas",
      atBats: 20,
      hits: 6,
      doubles: 1,
      triples: 0,
      homeRuns: 0,
      walks: 2,
      runs: 0,
    });
    const noRunsRes = enrichBattingStatsWithPlus([noRunsBatter]);
    assert.equal(noRunsRes[0].wrcPlus, 0);
    assert.equal(noRunsRes[0].wobaPlus, 100);

    // ── 4. Fórmulas exactas de pitcheo (FIP, ERA+, WHIP+, FIP+) y casos borde ─
    console.log("4. Validando fórmulas exactas de pitcheo y casos borde (0 IP, tope 500, lgEra=0)...");
    const acePitcher = makePitcher({
      playerId: 201,
      playerName: "As de la Rotación",
      inningsPitched: 50,
      earnedRuns: 10,
      hits: 35,
      walks: 10,
      hbp: 2,
      strikeouts: 55,
      homeRuns: 2,
      era: 1.8,
      whip: 0.9,
    });
    const roughPitcher = makePitcher({
      playerId: 202,
      playerName: "Relevista Castigado",
      inningsPitched: 40,
      earnedRuns: 30,
      hits: 55,
      walks: 20,
      hbp: 3,
      strikeouts: 20,
      homeRuns: 8,
      era: 6.75,
      whip: 1.88,
    });

    const pitRes = enrichPitchingStatsWithPlus([acePitcher, roughPitcher]);
    assert.equal(pitRes.length, 2);

    // lgEra = 4.00, lgWhip = 120/90 = 1.3333..., cFip = 3.0555...
    assert.equal(pitRes[0].fip, 2.1);
    assert.equal(pitRes[0].eraPlus, 222);
    assert.equal(pitRes[0].whipPlus, 148);
    assert.equal(pitRes[0].fipPlus, 190);

    assert.equal(pitRes[1].fip, 6.38);
    assert.equal(pitRes[1].eraPlus, 59);
    assert.equal(pitRes[1].whipPlus, 71);
    assert.equal(pitRes[1].fipPlus, 63);

    // Casos borde: 0 IP, tope 500 y clamp FIP >= 0
    const zeroIpPitcher = makePitcher({
      playerId: 203,
      playerName: "Cero Innings",
      inningsPitched: 0,
      earnedRuns: 2,
      hits: 1,
      walks: 1,
      strikeouts: 0,
      homeRuns: 0,
      era: 0,
      whip: 0,
    });
    const cappedPitcher = makePitcher({
      playerId: 204,
      playerName: "Intocable Tope",
      inningsPitched: 10,
      earnedRuns: 0,
      hits: 0,
      walks: 0,
      hbp: 0,
      strikeouts: 30,
      homeRuns: 0,
      era: 0,
      whip: 0,
    });
    const edgePitRes = enrichPitchingStatsWithPlus([zeroIpPitcher, cappedPitcher, roughPitcher]);
    assert.equal(edgePitRes[0].fip, 0);
    assert.equal(edgePitRes[0].eraPlus, 0);
    assert.equal(edgePitRes[0].whipPlus, 0);
    assert.equal(edgePitRes[0].fipPlus, 0);

    // fipRaw negativo (-2*30/10 + cFip) clamped a 0; eraPlus, whipPlus y fipPlus con tope 500
    assert.equal(edgePitRes[1].fip, 0);
    assert.equal(edgePitRes[1].eraPlus, 500);
    assert.equal(edgePitRes[1].whipPlus, 500);
    assert.equal(edgePitRes[1].fipPlus, 500);

    // Pool con lgEra === 0 y lgWhip === 0 (totalIp > 0 pero 0 ER, 0 H, 0 BB)
    const cleanZeroLeaguePitcher = makePitcher({
      playerId: 205,
      playerName: "Perfecto Único",
      inningsPitched: 9,
      earnedRuns: 0,
      hits: 0,
      walks: 0,
      hbp: 0,
      strikeouts: 12,
      homeRuns: 0,
      era: 0,
      whip: 0,
    });
    const zeroLgPitRes = enrichPitchingStatsWithPlus([cleanZeroLeaguePitcher]);
    assert.equal(zeroLgPitRes[0].fip, 0);
    assert.equal(zeroLgPitRes[0].eraPlus, 0);
    assert.equal(zeroLgPitRes[0].whipPlus, 0);
    assert.equal(zeroLgPitRes[0].fipPlus, 0);

    // ── 5. Flujo getBattingStats / getPitchingStats (pool completo pre-minAb/minIp y orden) ─
    console.log("5. Validando getBattingStats y getPitchingStats (enriquecimiento previo a minAb/minIp y orden)...");
    clearCanonicalSyncCache();

    // 5a. Rama MLB byDateRange (startDate & endDate)
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("group=hitting") && url.includes("byDateRange")) {
        return jsonResponse({
          stats: [
            {
              splits: [
                {
                  sport: { id: 17 },
                  player: { id: 602922, fullName: "José Rondón" },
                  team: { id: 695 },
                  stat: {
                    gamesPlayed: 15,
                    plateAppearances: 60,
                    atBats: 50,
                    runs: 10,
                    hits: 18,
                    doubles: 4,
                    triples: 1,
                    homeRuns: 3,
                    rbi: 12,
                    baseOnBalls: 8,
                    strikeOuts: 10,
                    hitByPitch: 1,
                    sacFlies: 1,
                    sacBunts: 0,
                    avg: ".360",
                    obp: ".450",
                    slg: ".660",
                    ops: "1.110",
                  },
                },
                {
                  sport: { id: 17 },
                  player: { id: 605612, fullName: "Harold Castro" },
                  team: { id: 695 },
                  stat: {
                    gamesPlayed: 15,
                    plateAppearances: 55,
                    atBats: 50,
                    runs: 6,
                    hits: 14,
                    doubles: 2,
                    triples: 0,
                    homeRuns: 1,
                    rbi: 6,
                    baseOnBalls: 4,
                    strikeOuts: 8,
                    hitByPitch: 0,
                    sacFlies: 1,
                    sacBunts: 0,
                    avg: ".280",
                    obp: ".327",
                    slg: ".380",
                    ops: ".707",
                  },
                },
                // Jugador con pocos AB (4 AB) pero alto impacto en promedio de liga
                {
                  sport: { id: 17 },
                  player: { id: 700001, fullName: "Emergente Explosivo" },
                  team: { id: 696 },
                  stat: {
                    gamesPlayed: 3,
                    plateAppearances: 5,
                    atBats: 4,
                    runs: 4,
                    hits: 4,
                    doubles: 0,
                    triples: 0,
                    homeRuns: 4,
                    rbi: 8,
                    baseOnBalls: 1,
                    strikeOuts: 0,
                    hitByPitch: 0,
                    sacFlies: 0,
                    sacBunts: 0,
                    avg: "1.000",
                    obp: "1.000",
                    slg: "4.000",
                    ops: "5.000",
                  },
                },
              ],
            },
          ],
        });
      }
      if (url.includes("group=pitching") && url.includes("byDateRange")) {
        return jsonResponse({
          stats: [
            {
              splits: [
                {
                  sport: { id: 17 },
                  player: { id: 660508, fullName: "Norwith Gudiño" },
                  team: { id: 695 },
                  stat: {
                    gamesPitched: 5,
                    gamesStarted: 0,
                    inningsPitched: "10.0",
                    hits: 6,
                    runs: 2,
                    earnedRuns: 2,
                    baseOnBalls: 2,
                    strikeOuts: 14,
                    homeRuns: 0,
                    hitBatsmen: 0,
                    era: "1.80",
                    whip: "0.80",
                  },
                },
                {
                  sport: { id: 17 },
                  player: { id: 660509, fullName: "Jesús Vargas" },
                  team: { id: 695 },
                  stat: {
                    gamesPitched: 3,
                    gamesStarted: 3,
                    inningsPitched: "12.0",
                    hits: 14,
                    runs: 6,
                    earnedRuns: 5,
                    baseOnBalls: 4,
                    strikeOuts: 8,
                    homeRuns: 2,
                    hitBatsmen: 1,
                    era: "3.75",
                    whip: "1.50",
                  },
                },
                // Relevista de corta muestra (1.0 IP) que eleva lgEra si se incluye en el pool
                {
                  sport: { id: 17 },
                  player: { id: 700002, fullName: "Relevista Corto" },
                  team: { id: 696 },
                  stat: {
                    gamesPitched: 1,
                    gamesStarted: 0,
                    inningsPitched: "1.0",
                    hits: 5,
                    runs: 6,
                    earnedRuns: 6,
                    baseOnBalls: 3,
                    strikeOuts: 0,
                    homeRuns: 2,
                    hitBatsmen: 0,
                    era: "54.00",
                    whip: "8.00",
                  },
                },
              ],
            },
          ],
        });
      }
      return jsonResponse({ stats: [{ splits: [] }] });
    }) as typeof fetch;

    const batRangeAll = await getBattingStats(2026, "all", "all", 250, 0, "2026-10-15", "2026-10-31");
    assert.equal(batRangeAll.length, 3);
    // Orden por defecto OPS desc: 700001 (5.000) -> 602922 (1.110) -> 605612 (.707)
    assert.deepEqual(
      batRangeAll.map((b) => b.playerId),
      [700001, 602922, 605612]
    );

    const batRangeFiltered = await getBattingStats(
      2026,
      "all",
      "all",
      1,
      20,
      "2026-10-15",
      "2026-10-31"
    );
    assert.equal(batRangeFiltered.length, 1);
    assert.equal(batRangeFiltered[0].playerId, 602922);

    const rondonAll = batRangeAll.find((b) => b.playerId === 602922)!;
    assert.equal(
      batRangeFiltered[0].woba,
      rondonAll.woba,
      "wOBA debe coincidir con filtro minAb/limit"
    );
    assert.equal(
      batRangeFiltered[0].opsPlus,
      rondonAll.opsPlus,
      "OPS+ debe calcularse sobre el pool completo ANTES de filtrar minAb/limit"
    );
    assert.equal(
      batRangeFiltered[0].wrcPlus,
      rondonAll.wrcPlus,
      "wRC+ debe calcularse sobre el pool completo ANTES de filtrar minAb/limit"
    );
    assert.ok((rondonAll.woba ?? 0) > 0.4);

    const pitRangeAll = await getPitchingStats(2026, "all", "all", 250, 0, "2026-10-15", "2026-10-31");
    assert.equal(pitRangeAll.length, 3);
    // Orden por defecto ERA asc: 660508 (1.80) -> 660509 (3.75) -> 700002 (54.00)
    assert.deepEqual(
      pitRangeAll.map((p) => p.playerId),
      [660508, 660509, 700002]
    );

    const pitRangeFiltered = await getPitchingStats(
      2026,
      "all",
      "all",
      1,
      5.0,
      "2026-10-15",
      "2026-10-31"
    );
    assert.equal(pitRangeFiltered.length, 1);
    assert.equal(pitRangeFiltered[0].playerId, 660508);
    assert.equal(pitRangeFiltered[0].fip, pitRangeAll[0].fip);
    assert.equal(
      pitRangeFiltered[0].eraPlus,
      pitRangeAll[0].eraPlus,
      "ERA+ debe calcularse sobre el pool completo ANTES de filtrar minIp/limit"
    );
    assert.equal(
      pitRangeFiltered[0].fipPlus,
      pitRangeAll[0].fipPlus,
      "FIP+ debe calcularse sobre el pool completo ANTES de filtrar minIp/limit"
    );

    // 5b. Rama aggregateBattingRows / aggregatePitchingRows (temporada sin rango de fechas)
    clearCanonicalSyncCache();
    globalThis.fetch = (async () => jsonResponse({ stats: [{ splits: [] }], dates: [] })) as typeof fetch;

    mockDb.batting_stats = [
      {
        game_id: 8001,
        player_id: 602922,
        team_id: 695,
        ab: 30,
        r: 7,
        h: 12,
        doubles: 3,
        triples: 0,
        hr: 2,
        rbi: 8,
        bb: 5,
        so: 5,
        sb: 1,
        cs: 0,
        hbp: 1,
        sf: 0,
        sh: 0,
        players: { full_name: "José Rondón" },
        games: { season: 2026, game_type: "regular", status: "Final" },
      },
      {
        game_id: 8002,
        player_id: 605612,
        team_id: 695,
        ab: 30,
        r: 3,
        h: 7,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 3,
        bb: 2,
        so: 6,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Harold Castro" },
        games: { season: 2026, game_type: "regular", status: "Final" },
      },
      // Baja muestra que sí altera el promedio de la liga si se calcula antes de minAb
      {
        game_id: 8003,
        player_id: 700003,
        team_id: 696,
        ab: 3,
        r: 0,
        h: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        bb: 0,
        so: 3,
        sb: 0,
        cs: 0,
        hbp: 0,
        sf: 0,
        sh: 0,
        players: { full_name: "Bateador Corto" },
        games: { season: 2026, game_type: "regular", status: "Final" },
      },
    ];

    mockDb.pitching_stats = [
      {
        game_id: 8001,
        player_id: 660508,
        team_id: 695,
        ip_decimal: 10.0,
        h: 7,
        r: 2,
        er: 2,
        bb: 2,
        hbp: 0,
        so: 12,
        hr: 1,
        players: { full_name: "Norwith Gudiño" },
        games: { season: 2026, game_type: "regular", status: "Final" },
      },
      {
        game_id: 8002,
        player_id: 660509,
        team_id: 695,
        ip_decimal: 10.0,
        h: 12,
        r: 5,
        er: 5,
        bb: 4,
        hbp: 1,
        so: 6,
        hr: 2,
        players: { full_name: "Jesús Vargas" },
        games: { season: 2026, game_type: "regular", status: "Final" },
      },
      // Baja muestra (< minIp) que altera el promedio de la liga si se calcula antes de minIp
      {
        game_id: 8003,
        player_id: 700004,
        team_id: 696,
        ip_decimal: 1.0,
        h: 5,
        r: 5,
        er: 5,
        bb: 2,
        hbp: 0,
        so: 0,
        hr: 1,
        players: { full_name: "Relevo Corto" },
        games: { season: 2026, game_type: "regular", status: "Final" },
      },
    ];

    const batSeasonAll = await getBattingStats(2026, "R", "all", 250, 0);
    const batSeasonFiltered = await getBattingStats(2026, "R", "all", 1, 10);
    assert.equal(batSeasonAll.length, 3);
    assert.deepEqual(
      batSeasonAll.map((b) => b.playerId),
      [602922, 605612, 700003]
    );
    assert.equal(batSeasonFiltered.length, 1);
    assert.equal(batSeasonFiltered[0].playerId, 602922);
    assert.equal(batSeasonFiltered[0].woba, batSeasonAll[0].woba);
    assert.equal(batSeasonFiltered[0].wrcPlus, batSeasonAll[0].wrcPlus);
    assert.equal(batSeasonFiltered[0].opsPlus, batSeasonAll[0].opsPlus);

    const pitSeasonAll = await getPitchingStats(2026, "R", "all", 250, 0);
    const pitSeasonFiltered = await getPitchingStats(2026, "R", "all", 1, 5.0);
    assert.equal(pitSeasonAll.length, 3);
    assert.deepEqual(
      pitSeasonAll.map((p) => p.playerId),
      [660508, 660509, 700004]
    );
    assert.equal(pitSeasonFiltered.length, 1);
    assert.equal(pitSeasonFiltered[0].playerId, 660508);
    assert.equal(pitSeasonFiltered[0].fip, pitSeasonAll[0].fip);
    assert.equal(pitSeasonFiltered[0].eraPlus, pitSeasonAll[0].eraPlus);
    assert.equal(pitSeasonFiltered[0].fipPlus, pitSeasonAll[0].fipPlus);

    console.log("=== TODAS LAS PRUEBAS DE wOBA, FIP Y STATS+ PASARON EXITOSAMENTE ===");
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
  console.error("Fallo en plus-stats.test.ts:", err);
  process.exit(1);
});
