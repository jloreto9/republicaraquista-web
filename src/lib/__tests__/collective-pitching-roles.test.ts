import assert from "node:assert/strict";
import {
  aggregateBoxscoresByPitchingRole,
  getCollectiveStats,
} from "../collective";

function makePitcherStat(overrides: Record<string, unknown> = {}) {
  return {
    gamesStarted: 0,
    inningsPitched: "1.0",
    hits: 1,
    runs: 0,
    earnedRuns: 0,
    baseOnBalls: 0,
    strikeOuts: 1,
    homeRuns: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    holds: 0,
    blownSaves: 0,
    groundIntoDoublePlay: 0,
    atBats: 4,
    ...overrides,
  };
}

function runTests() {
  // 1. Clasificación SP vs RP: gamesStarted === 1 y fallback idx === 0
  const game1 = {
    gamePk: 1001,
    teams: {
      away: {
        team: { id: 695, name: "Leones del Caracas" },
        pitchers: [101, 102, 103],
        players: {
          // idx === 0 SIN gamesStarted explícito -> debe clasificarse SP por fallback idx === 0
          ID101: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: undefined,
                inningsPitched: "5.2", // 17 outs
                hits: 4,
                runs: 2,
                earnedRuns: 2,
                baseOnBalls: 2,
                strikeOuts: 6,
                homeRuns: 1,
                wins: 1,
                groundIntoDoublePlay: 1,
                atBats: 20,
              }),
            },
          },
          // idx === 1 relevista
          ID102: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 0,
                inningsPitched: "1.1", // 4 outs
                hits: 1,
                runs: 0,
                earnedRuns: 0,
                baseOnBalls: 1,
                strikeOuts: 2,
                holds: 1,
                atBats: 5,
              }),
            },
          },
          // idx === 2 cerrador
          ID103: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 0,
                inningsPitched: "2.0", // 6 outs
                hits: 1,
                runs: 1,
                earnedRuns: 1,
                baseOnBalls: 0,
                strikeOuts: 3,
                saves: 1,
                atBats: 7,
              }),
            },
          },
        },
      },
      home: {
        team: { id: 696, name: "Navegantes del Magallanes" },
        pitchers: [201, 202],
        players: {
          ID201: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "4.2", // 14 outs
                hits: 6,
                runs: 4,
                earnedRuns: 3,
                baseOnBalls: 2,
                strikeOuts: 4,
                losses: 1,
                atBats: 19,
              }),
            },
          },
          // Caso especial: gamesStarted === 1 aunque idx === 1 (debe ser SP)
          ID202: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "4.1", // 13 outs
                hits: 2,
                runs: 1,
                earnedRuns: 1,
                baseOnBalls: 1,
                strikeOuts: 5,
                atBats: 15,
              }),
            },
          },
        },
      },
    },
  };

  // Segundo juego para probar aritmética de tercios de inning ("5.2" + "4.2" = "10.1")
  const game2 = {
    gamePk: 1002,
    teams: {
      away: {
        team: { id: 695, name: "Leones del Caracas" },
        pitchers: [104, 105],
        players: {
          ID104: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "4.2", // 14 outs -> 17 + 14 = 31 outs = 10.1 IP
                hits: 5,
                runs: 1,
                earnedRuns: 1,
                baseOnBalls: 1,
                strikeOuts: 4,
                atBats: 18,
              }),
            },
          },
          ID105: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 0,
                inningsPitched: "4.1", // 13 outs -> RP total: 4 + 6 + 13 = 23 outs = 7.2 IP
                hits: 3,
                runs: 2,
                earnedRuns: 2,
                baseOnBalls: 2,
                strikeOuts: 4,
                blownSaves: 1,
                atBats: 15,
              }),
            },
          },
        },
      },
      home: {
        team: { id: 698, name: "Tiburones de La Guaira" },
        pitchers: [301],
        players: {
          // Juego completo sin relevistas (para probar 0.0 IP en RP)
          ID301: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "9.0",
                hits: 4,
                runs: 1,
                earnedRuns: 1,
                baseOnBalls: 1,
                strikeOuts: 8,
                wins: 1,
                atBats: 31,
              }),
            },
          },
        },
      },
    },
  };

  const spRows = aggregateBoxscoresByPitchingRole([game1, game2], "sp");
  const rpRows = aggregateBoxscoresByPitchingRole([game1, game2], "rp");

  const carSp = spRows.find((t) => t.teamId === 695)!;
  const carRp = rpRows.find((t) => t.teamId === 695)!;
  const magSp = spRows.find((t) => t.teamId === 696)!;
  const magRp = rpRows.find((t) => t.teamId === 696)!;
  const lagSp = spRows.find((t) => t.teamId === 698)!;
  const lagRp = rpRows.find((t) => t.teamId === 698)!;

  assert.ok(carSp && carRp && magSp && magRp && lagSp && lagRp, "Todos los equipos deben existir");

  // 2. Aritmética de tercios de inning
  assert.equal(carSp.ipStr, "10.1");
  assert.equal(carSp.ip, 10.1);
  assert.equal(carSp.games, 2);
  assert.equal(carRp.ipStr, "7.2");
  assert.equal(carRp.ip, 7.2);
  assert.equal(carRp.games, 2); // game1 tuvo 2 RPs pero cuenta 1 juego por gamePk

  // Verificar tasas de SP Caracas: 31 outs = 10.3333 IP, 3 ER -> ERA = 27 / (31/3) = 81/31 = 2.6129
  const expectedCarSpEra = (3 * 9) / (31 / 3);
  assert.ok(Math.abs(carSp.era - expectedCarSpEra) < 1e-6);
  assert.equal(carSp.eraStr, expectedCarSpEra.toFixed(2));
  assert.equal(carSp.gidp, 1);

  // Magallanes tuvo ambos lanzadores con gamesStarted: 1 -> 9.0 IP en SP y 0.0 IP en RP
  assert.equal(magSp.ipStr, "9.0");
  assert.equal(magRp.ipStr, "0.0");

  // 3. Suma SP + RP cuadra con totales brutos
  assert.equal(carSp.h + carRp.h, 4 + 1 + 1 + 5 + 3);
  assert.equal(carSp.r + carRp.r, 2 + 0 + 1 + 1 + 2);
  assert.equal(carSp.er + carRp.er, 2 + 0 + 1 + 1 + 2);
  assert.equal(carSp.bb + carRp.bb, 2 + 1 + 0 + 1 + 2);
  assert.equal(carSp.so + carRp.so, 6 + 2 + 3 + 4 + 4);
  assert.equal(carSp.hr + carRp.hr, 1);
  assert.equal(carSp.wins + carRp.wins, 1);
  assert.equal(carSp.sv + carRp.sv, 1);
  assert.equal(carSp.holds + carRp.holds, 1);
  assert.equal(carSp.blownSaves + carRp.blownSaves, 1);

  const outsFromIp = (ip: number) => Math.floor(ip) * 3 + Math.round((ip - Math.floor(ip)) * 10);
  assert.equal(outsFromIp(carSp.ip) + outsFromIp(carRp.ip), 31 + 23);

  // 4. Manejo de 0.0 IP sin NaN/Infinity y ordenado al final
  assert.equal(lagRp.ip, 0);
  assert.equal(lagRp.ipStr, "0.0");
  for (const row of [...spRows, ...rpRows]) {
    assert.ok(Number.isFinite(row.era), `ERA finita para ${row.teamName}`);
    assert.ok(Number.isFinite(row.whip), `WHIP finito para ${row.teamName}`);
    assert.ok(Number.isFinite(row.k9), `K/9 finito para ${row.teamName}`);
    assert.ok(Number.isFinite(row.bb9), `BB/9 finito para ${row.teamName}`);
    assert.ok(Number.isFinite(row.kbb), `K/BB finito para ${row.teamName}`);
    assert.ok(Number.isFinite(row.baa), `BAA finito para ${row.teamName}`);
  }
  // En rpRows, Caracas (7.2 IP) debe estar antes que los equipos con 0.0 IP
  assert.equal(rpRows[0].teamId, 695);
  assert.equal(rpRows[rpRows.length - 1].ip, 0);

  // Caso adicional: pitcher con 0.0 IP pero con 2 hits y 2 ER permitidos (sin outs)
  const zeroOutGame = {
    gamePk: 1003,
    teams: {
      away: {
        team: { id: 699, name: "Tigres de Aragua" },
        pitchers: [401, 402],
        players: {
          ID401: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "5.0",
                earnedRuns: 1,
                atBats: 18,
              }),
            },
          },
          ID402: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 0,
                inningsPitched: "0.0",
                hits: 2,
                runs: 2,
                earnedRuns: 2,
                baseOnBalls: 1,
                strikeOuts: 0,
                atBats: 2,
              }),
            },
          },
        },
      },
      home: {
        team: { id: 697, name: "Bravos de Margarita" },
        pitchers: [501],
        players: {
          ID501: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "6.0",
                earnedRuns: 2,
                atBats: 22,
              }),
            },
          },
        },
      },
    },
  };

  const zeroRp = aggregateBoxscoresByPitchingRole([zeroOutGame], "rp");
  const tigresRp = zeroRp.find((t) => t.teamId === 699)!;
  assert.equal(tigresRp.ip, 0);
  assert.equal(tigresRp.ipStr, "0.0");
  assert.equal(tigresRp.era, 0);
  assert.equal(tigresRp.whip, 0);
  assert.equal(tigresRp.k9, 0);
  assert.equal(tigresRp.bb9, 0);
  assert.ok(Number.isFinite(tigresRp.baa));
}

async function runIntegrationTests() {
  const originalFetch = globalThis.fetch;

  const mockSchedule = {
    dates: [
      {
        date: "2025-10-15",
        games: [
          { gamePk: 77001, status: { detailedState: "Final" } },
          { gamePk: 77001, status: { detailedState: "Completed" } }, // duplicado
          { gamePk: 77002, status: { detailedState: "In Progress" } }, // debe ignorarse
        ],
      },
    ],
  };

  const mockBoxscore = {
    gamePk: 77001,
    teams: {
      away: {
        team: { id: 695, name: "Leones del Caracas" },
        pitchers: [901, 902],
        players: {
          ID901: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "6.0",
                earnedRuns: 2,
                strikeOuts: 7,
                wins: 1,
                atBats: 22,
              }),
            },
          },
          ID902: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 0,
                inningsPitched: "3.0",
                earnedRuns: 0,
                strikeOuts: 4,
                saves: 1,
                atBats: 10,
              }),
            },
          },
        },
      },
      home: {
        team: { id: 693, name: "Cardenales de Lara" },
        pitchers: [903],
        players: {
          ID903: {
            stats: {
              pitching: makePitcherStat({
                gamesStarted: 1,
                inningsPitched: "9.0",
                earnedRuns: 3,
                strikeOuts: 5,
                losses: 1,
                atBats: 34,
              }),
            },
          },
        },
      },
    },
  };

  const fetchedUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    fetchedUrls.push(url);
    if (url.includes("/schedule")) {
      return new Response(JSON.stringify(mockSchedule), { status: 200 });
    }
    if (url.includes("/game/77001/boxscore")) {
      return new Response(JSON.stringify(mockBoxscore), { status: 200 });
    }
    if (url.includes("stats=statSplits")) {
      return new Response(
        JSON.stringify({
          stats: [
            {
              splits: [
                {
                  team: { id: 695, name: "Leones del Caracas" },
                  stat: {
                    gamesPlayed: 10,
                    wins: 6,
                    losses: 2,
                    era: "3.15",
                    whip: "1.20",
                    inningsPitched: "54.1",
                    hits: 48,
                    runs: 21,
                    earnedRuns: 19,
                    baseOnBalls: 17,
                    strikeOuts: 45,
                    homeRuns: 4,
                    saves: 0,
                    holds: 0,
                    blownSaves: 0,
                    strikeoutsPer9Inn: "7.45",
                    walksPer9Inn: "2.82",
                    strikeoutWalkRatio: "2.65",
                    avg: ".235",
                  },
                },
              ],
            },
          ],
        }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ stats: [{ splits: [] }] }), { status: 200 });
  }) as typeof fetch;

  try {
    // 1. Con rango de fechas y role="rp": Cardenales tiene 0.0 IP, Leones 3.0 IP (0.00 ERA)
    const rpDateRes = await getCollectiveStats(2025, "R", "2025-10-15", "2025-10-15", "rp");
    assert.equal(rpDateRes.pitchingRole, "rp");
    assert.equal(rpDateRes.pitching.length, 2);
    assert.equal(rpDateRes.pitching[0].teamId, 695);
    assert.equal(rpDateRes.pitching[1].teamId, 693);
    assert.equal(rpDateRes.pitching[1].ip, 0);
    // KPI de mejor ERA debe elegir al equipo con IP > 0 (Leones), nunca al de 0.0 IP
    assert.equal(rpDateRes.pitchingKpis.eraTeam, "Leones del Caracas");
    assert.equal(rpDateRes.pitchingKpis.svVal, "1");
    assert.equal(rpDateRes.pitchingSummary?.total.ipStr, "3.0");

    // 2. Sin rango de fechas y role="sp": usa stats=statSplits&sitCodes=sp
    const spSeasonRes = await getCollectiveStats(2025, "R", undefined, undefined, "sp");
    assert.equal(spSeasonRes.pitchingRole, "sp");
    assert.ok(
      fetchedUrls.some((u) => u.includes("stats=statSplits&sitCodes=sp&gameType=R")),
      "Debe consultar teams/stats con statSplits y sitCodes=sp"
    );
    assert.equal(spSeasonRes.pitching[0].eraStr, "3.15");
    assert.equal(spSeasonRes.pitching[0].ipStr, "54.1");
    assert.equal(spSeasonRes.pitchingKpis.eraTeam, "Leones del Caracas");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  runTests();
  await runIntegrationTests();
  console.log("=== TODAS LAS PRUEBAS DE ROLES DE PITCHEO COLECTIVO (SP/RP) PASARON EXITOSAMENTE ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
