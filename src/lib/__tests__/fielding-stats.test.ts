import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  formatDecimalToBaseballInnings,
  getFieldingStats,
  parseBaseballInningsToDecimal,
} from "../supabase";

function buildFieldingSplit(overrides: {
  playerId: number;
  fullName: string;
  teamId: number;
  position: string;
  gamesPlayed?: number;
  gamesStarted?: number;
  innings?: string;
  putOuts?: number;
  assists?: number;
  errors?: number;
  doublePlays?: number;
  triplePlays?: number;
  caughtStealing?: number;
  stolenBases?: number;
  passedBall?: number;
}) {
  const po = overrides.putOuts ?? 0;
  const a = overrides.assists ?? 0;
  const e = overrides.errors ?? 0;
  const tc = po + a + e;
  return {
    player: { id: overrides.playerId, fullName: overrides.fullName },
    team: { id: overrides.teamId, name: `Equipo ${overrides.teamId}` },
    position: { abbreviation: overrides.position },
    stat: {
      gamesPlayed: overrides.gamesPlayed ?? 10,
      gamesStarted: overrides.gamesStarted ?? 8,
      innings: overrides.innings ?? "72.0",
      putOuts: po,
      assists: a,
      errors: e,
      chances: tc,
      fielding: tc > 0 ? ((po + a) / tc).toFixed(3) : ".000",
      doublePlays: overrides.doublePlays ?? 0,
      triplePlays: overrides.triplePlays ?? 0,
      caughtStealing: overrides.caughtStealing ?? 0,
      stolenBases: overrides.stolenBases ?? 0,
      passedBall: overrides.passedBall ?? 0,
    },
  };
}

async function runTests() {
  // 1. Aritmética de entradas en béisbol
  const d1 = parseBaseballInningsToDecimal("9.2");
  const d2 = parseBaseballInningsToDecimal("5.1");
  assert.equal(
    formatDecimalToBaseballInnings(d1 + d2),
    "15.0",
    "9.2 + 5.1 entradas deben sumar exactamente 15.0"
  );
  assert.equal(formatDecimalToBaseballInnings(parseBaseballInningsToDecimal("11.1") + parseBaseballInningsToDecimal("2.1")), "13.2");

  const originalFetch = globalThis.fetch;

  try {
    // Mock de MLB Stats API por fase
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("gameType=R")) {
        return new Response(
          JSON.stringify({
            stats: [
              {
                splits: [
                  buildFieldingSplit({
                    playerId: 602922,
                    fullName: "Wilfredo Tovar",
                    teamId: 695,
                    position: "SS",
                    gamesPlayed: 40,
                    gamesStarted: 39,
                    innings: "340.0",
                    putOuts: 60,
                    assists: 110,
                    errors: 5,
                    doublePlays: 24,
                  }),
                  buildFieldingSplit({
                    playerId: 680846,
                    fullName: "Gabriel Lino",
                    teamId: 695,
                    position: "C",
                    gamesPlayed: 15,
                    gamesStarted: 12,
                    innings: "9.2",
                    putOuts: 80,
                    assists: 10,
                    errors: 2,
                    doublePlays: 1,
                    caughtStealing: 6,
                    stolenBases: 9,
                    passedBall: 2,
                  }),
                  // DH y registro vacío deben quedar excluidos
                  buildFieldingSplit({
                    playerId: 9001,
                    fullName: "Designado Puro",
                    teamId: 695,
                    position: "DH",
                    gamesPlayed: 30,
                    innings: "0.0",
                    putOuts: 0,
                    assists: 0,
                    errors: 0,
                  }),
                  buildFieldingSplit({
                    playerId: 9002,
                    fullName: "Sin Juego",
                    teamId: 693,
                    position: "1B",
                    gamesPlayed: 0,
                    innings: "0.0",
                    putOuts: 0,
                    assists: 0,
                    errors: 0,
                  }),
                  // Equipo fuera de LVBP debe ignorarse
                  buildFieldingSplit({
                    playerId: 9003,
                    fullName: "Jugador Ajeno",
                    teamId: 99999,
                    position: "CF",
                    gamesPlayed: 20,
                    putOuts: 40,
                  }),
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("gameType=L")) {
        return new Response(
          JSON.stringify({
            stats: [
              {
                splits: [
                  buildFieldingSplit({
                    playerId: 680846,
                    fullName: "Gabriel Lino",
                    teamId: 695,
                    position: "C",
                    gamesPlayed: 3,
                    gamesStarted: 3,
                    innings: "5.1",
                    putOuts: 20,
                    assists: 4,
                    errors: 0,
                    caughtStealing: 2,
                    stolenBases: 1,
                    passedBall: 1,
                  }),
                ],
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ stats: [{ splits: [] }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    // 2. Prueba en fase Regular ("R")
    const regularStats = await getFieldingStats(2026, "R", "all", 1000, 0);
    assert.equal(regularStats.length, 2, "Debe excluir DH, filas en 0 y equipos fuera de LVBP");
    assert.equal(regularStats[0].playerName, "Wilfredo Tovar");
    assert.equal(regularStats[0].totalChances, 175);
    assert.equal(regularStats[0].fieldingPct, 0.971);
    assert.equal(regularStats[0].rangeFactorPer9, 4.5);

    const catcherR = regularStats.find((f) => f.position === "C");
    assert.ok(catcherR);
    assert.equal(catcherR.caughtStealing, 6);
    assert.equal(catcherR.stolenBases, 9);
    assert.equal(catcherR.caughtStealingPct, 0.4);
    assert.equal(catcherR.passedBalls, 2);

    // 3. Prueba consolidada ("all"): suma innings 9.2 + 5.1 = 15.0 y métricas de receptor
    const allPhaseStats = await getFieldingStats(2026, "all", 695, 1000, 0);
    const catcherAll = allPhaseStats.find((f) => f.playerId === 680846 && f.position === "C");
    assert.ok(catcherAll);
    assert.equal(catcherAll.innings, "15.0");
    assert.equal(catcherAll.games, 18);
    assert.equal(catcherAll.putouts, 100);
    assert.equal(catcherAll.assists, 14);
    assert.equal(catcherAll.errors, 2);
    assert.equal(catcherAll.totalChances, 116);
    assert.equal(catcherAll.fieldingPct, 0.983);
    assert.equal(catcherAll.caughtStealing, 8);
    assert.equal(catcherAll.stolenBases, 10);
    assert.equal(catcherAll.caughtStealingPct, 0.444);
    assert.equal(catcherAll.passedBalls, 3);

    // 4. Filtro minChances
    const filteredMinTc = await getFieldingStats(2026, "R", "all", 1000, 120);
    assert.equal(filteredMinTc.length, 1);
    assert.equal(filteredMinTc[0].playerId, 602922);

    // 5. Auditoría de copy UI (cero menciones de "saberm")
    const rootDir = path.resolve(__dirname, "../../..");
    const filesToAudit = [
      "src/components/stats/fielding-table.tsx",
      "src/components/stats/individuales-view.tsx",
      "src/components/stats/stats-filters.tsx",
      "src/app/api/stats/fielding/route.ts",
    ];
    for (const rel of filesToAudit) {
      const content = fs.readFileSync(path.join(rootDir, rel), "utf8");
      assert.equal(
        /saberm/i.test(content),
        false,
        `El archivo ${rel} no debe contener la palabra prohibida 'sabermétrico/a/ía'`
      );
    }

    console.log("=== TODAS LAS PRUEBAS DE FILDEO INDIVIDUAL PASARON EXITOSAMENTE ===");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
