import assert from "node:assert/strict";
import {
  normalizeLineupPosition,
  formatOpponentShortName,
  formatShortSpanishDate,
  formatCompactTime,
  formatTransmissionLines,
  formatStadiumBannerName,
  formatPlayerDisplayName,
  getLineupCardData,
} from "../lineup-card-service";

const LEONES_ID = 695;
const AGUILAS_ID = 692;
const CARDENALES_ID = 693;
const TIGRES_ID = 699;

interface MockStarterInput {
  id: number;
  fullName: string;
  position: string;
}

function buildMockFeedLive(params: {
  gamePk: number;
  officialDate: string;
  homeTeamId: number;
  awayTeamId: number;
  detailedState?: string;
  probablePitcherHome?: string;
  probablePitcherAway?: string;
  homeStarters?: MockStarterInput[];
  awayStarters?: MockStarterInput[];
  homePitcherIds?: number[];
  awayPitcherIds?: number[];
  extraPlayers?: Record<string, { fullName: string }>;
}) {
  const {
    gamePk,
    officialDate,
    homeTeamId,
    awayTeamId,
    detailedState = "Pre-Game",
    probablePitcherHome,
    probablePitcherAway,
    homeStarters = [],
    awayStarters = [],
    homePitcherIds = [],
    awayPitcherIds = [],
    extraPlayers = {},
  } = params;

  const homePlayers: Record<string, Record<string, unknown>> = {};
  const awayPlayers: Record<string, Record<string, unknown>> = {};
  const gameDataPlayers: Record<string, Record<string, unknown>> = {};

  for (const starter of homeStarters) {
    const key = `ID${starter.id}`;
    homePlayers[key] = {
      person: { id: starter.id, fullName: starter.fullName },
      position: { abbreviation: starter.position },
    };
    gameDataPlayers[key] = {
      id: starter.id,
      fullName: starter.fullName,
      primaryPosition: { abbreviation: starter.position },
    };
  }

  for (const starter of awayStarters) {
    const key = `ID${starter.id}`;
    awayPlayers[key] = {
      person: { id: starter.id, fullName: starter.fullName },
      position: { abbreviation: starter.position },
    };
    gameDataPlayers[key] = {
      id: starter.id,
      fullName: starter.fullName,
      primaryPosition: { abbreviation: starter.position },
    };
  }

  for (const [key, info] of Object.entries(extraPlayers)) {
    gameDataPlayers[key] = { fullName: info.fullName };
    awayPlayers[key] = { person: { fullName: info.fullName } };
    homePlayers[key] = { person: { fullName: info.fullName } };
  }

  return {
    gamePk,
    gameData: {
      game: { pk: gamePk, gameNumber: 1 },
      datetime: {
        officialDate,
        originalDate: officialDate,
        dateTime: `${officialDate}T23:00:00Z`,
      },
      status: {
        abstractGameState: detailedState === "Final" ? "Final" : "Preview",
        codedGameState: detailedState === "Final" ? "F" : "P",
        detailedState,
      },
      teams: {
        home: { id: homeTeamId, name: "Home Team" },
        away: { id: awayTeamId, name: "Away Team" },
      },
      probablePitchers: {
        ...(probablePitcherHome ? { home: { id: 7001, fullName: probablePitcherHome } } : {}),
        ...(probablePitcherAway ? { away: { id: 7002, fullName: probablePitcherAway } } : {}),
      },
      players: gameDataPlayers,
    },
    liveData: {
      boxscore: {
        teams: {
          home: {
            battingOrder: homeStarters.map((s) => s.id),
            pitchers: homePitcherIds,
            players: homePlayers,
          },
          away: {
            battingOrder: awayStarters.map((s) => s.id),
            pitchers: awayPitcherIds,
            players: awayPlayers,
          },
        },
      },
    },
  };
}

async function runTests() {
  console.log("=== Ejecutando suite de pruebas: Generador de Tarjeta de Lineup (Spec 027) ===");

  // ── 1. NORMALIZACIÓN DE POSICIONES ────────────────────────────────────────
  console.log("1. Validando normalizeLineupPosition ('DH' -> 'BD' y posiciones estándar)...");
  assert.equal(normalizeLineupPosition("DH"), "BD");
  assert.equal(normalizeLineupPosition("dh"), "BD");
  assert.equal(normalizeLineupPosition(" BD "), "BD");
  assert.equal(normalizeLineupPosition(""), "BD");

  for (const pos of ["LF", "CF", "RF", "3B", "SS", "2B", "1B", "C"] as const) {
    assert.equal(normalizeLineupPosition(pos), pos);
    assert.equal(normalizeLineupPosition(` ${pos.toLowerCase()} `), pos);
  }

  // ── 2. NOMBRES CORTOS DE LOS 7 RIVALES LVBP ──────────────────────────────
  console.log("2. Validando formatOpponentShortName para los 7 rivales de la LVBP...");
  const rivalCases: Array<{ id: number; name: string; expected: string }> = [
    { id: 692, name: "Águilas del Zulia", expected: "AGUILAS" },
    { id: 693, name: "Cardenales de Lara", expected: "CARDENALES" },
    { id: 694, name: "Caribes de Anzoátegui", expected: "CARIBES" },
    { id: 696, name: "Navegantes del Magallanes", expected: "MAGALLANES" },
    { id: 697, name: "Bravos de Margarita", expected: "BRAVOS" },
    { id: 698, name: "Tiburones de La Guaira", expected: "TIBURONES" },
    { id: 699, name: "Tigres de Aragua", expected: "TIGRES" },
  ];

  for (const rival of rivalCases) {
    assert.equal(
      formatOpponentShortName(rival.id),
      rival.expected,
      `ID ${rival.id} debe mapear a ${rival.expected}`
    );
    assert.equal(
      formatOpponentShortName(rival.name),
      rival.expected,
      `Nombre "${rival.name}" debe mapear a ${rival.expected}`
    );
  }

  // ── 3. FECHA CORTA Y HORA COMPACTA ────────────────────────────────────────
  console.log("3. Validando formatShortSpanishDate y formatCompactTime...");
  assert.equal(formatShortSpanishDate("2026-11-14"), "14NOV");
  assert.equal(formatShortSpanishDate("2026-10-05"), "5OCT");
  assert.equal(formatShortSpanishDate("2026-12-01"), "1DIC");
  assert.equal(formatShortSpanishDate("2027-01-20"), "20ENE");

  assert.equal(formatCompactTime("8:00 PM"), "8:00PM");
  assert.equal(formatCompactTime("7:00 PM"), "7:00PM");
  assert.equal(formatCompactTime("1:05 pm"), "1:05PM");
  assert.equal(formatCompactTime("Por confirmar"), "POR CONFIRMAR");

  // ── 4. TRANSMISIÓN, ESTADIO Y NOMBRES DE PELOTEROS (PRESERVANDO Ñ) ────────
  console.log("4. Validando formatTransmissionLines, formatStadiumBannerName y formatPlayerDisplayName...");
  assert.deepEqual(formatTransmissionLines("IVC, BeisbolPlay"), {
    line1: "TRANSMISIÓN IVC,",
    line2: "BeisbolPlay, La Mega",
  });
  assert.deepEqual(formatTransmissionLines("ByM Sport, IVC, BeisbolPlay"), {
    line1: "TRANSMISIÓN BYM SPORT, IVC,",
    line2: "BeisbolPlay, La Mega",
  });
  assert.deepEqual(formatTransmissionLines("BeisbolPlay, La Mega"), {
    line1: "TRANSMISIÓN OFICIAL",
    line2: "BeisbolPlay, La Mega",
  });

  assert.equal(
    formatStadiumBannerName("Estadio Monumental Simón Bolívar"),
    "ESTADIO MONUMENTAL SIMON BOLIVAR"
  );
  assert.equal(
    formatStadiumBannerName("Estadio José Bernardo Pérez"),
    "ESTADIO JOSE BERNARDO PEREZ"
  );

  assert.equal(formatPlayerDisplayName("Leandro Cedeño"), "LEANDRO CEDEÑO");
  assert.equal(formatPlayerDisplayName("Víctor Bericoto"), "VICTOR BERICOTO");
  assert.equal(formatPlayerDisplayName("José Rondón"), "JOSE RONDON");
  assert.equal(formatPlayerDisplayName("Norwith Gudiño"), "NORWITH GUDIÑO");

  // ── 5. INTEGRACIÓN getLineupCardData CON fetch MOCKEADO ───────────────────
  console.log("5. Validando getLineupCardData con fetch mockeado (schedule + feed/live + calendar)...");
  const originalFetch = globalThis.fetch;

  const sampleStarters: MockStarterInput[] = [
    { id: 101, fullName: "Wilfredo Tovar", position: "2B" },
    { id: 102, fullName: "Víctor Bericoto", position: "RF" },
    { id: 103, fullName: "Harold Castro", position: "1B" },
    { id: 104, fullName: "Leandro Cedeño", position: "DH" },
    { id: 105, fullName: "José Rondón", position: "CF" },
    { id: 106, fullName: "Oswaldo Arcia", position: "LF" },
    { id: 107, fullName: "Gabriel Noriega", position: "3B" },
    { id: 108, fullName: "Liván Soto", position: "SS" },
    { id: 109, fullName: "Freddy Fermín", position: "C" },
  ];

  const feed970114 = buildMockFeedLive({
    gamePk: 970114,
    officialDate: "2026-11-14",
    homeTeamId: LEONES_ID,
    awayTeamId: AGUILAS_ID,
    detailedState: "Pre-Game",
    probablePitcherHome: "Erick Leal",
    homeStarters: sampleStarters,
  });

  // Juego 970115: sin battingOrder en boxscore, usa fallback de schedule.lineups + boxscore.pitchers[0]
  const feed970115 = buildMockFeedLive({
    gamePk: 970115,
    officialDate: "2026-11-15",
    homeTeamId: CARDENALES_ID,
    awayTeamId: LEONES_ID,
    detailedState: "Scheduled",
    awayPitcherIds: [660508],
    extraPlayers: {
      ID660508: { fullName: "Norwith Gudiño" },
    },
  });

  // Juego 970116: sin alineación oficial ni lanzador probable -> 9 slots vacíos editables + POR ANUNCIAR
  const feed970116 = buildMockFeedLive({
    gamePk: 970116,
    officialDate: "2026-11-17",
    homeTeamId: LEONES_ID,
    awayTeamId: TIGRES_ID,
    detailedState: "Scheduled",
  });

  let scheduleRequestUrl = "";
  const feedUrlsRequested: string[] = [];

  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/v1/schedule")) {
        scheduleRequestUrl = url;
        return new Response(
          JSON.stringify({
            dates: [
              {
                date: "2026-11-14",
                games: [
                  {
                    gamePk: 970114,
                    officialDate: "2026-11-14",
                    gameDate: "2026-11-15T00:00:00Z",
                    gameNumber: 1,
                    status: {
                      abstractGameState: "Preview",
                      codedGameState: "P",
                      detailedState: "Pre-Game",
                    },
                    teams: {
                      home: {
                        team: { id: LEONES_ID, name: "Leones del Caracas" },
                        probablePitcher: { id: 7001, fullName: "Erick Leal" },
                      },
                      away: {
                        team: { id: AGUILAS_ID, name: "Águilas del Zulia" },
                      },
                    },
                    venue: { name: "Estadio Monumental Simón Bolívar" },
                  },
                ],
              },
              {
                date: "2026-11-15",
                games: [
                  // Duplicado pospuesto del mismo gamePk para validar deduplicación
                  {
                    gamePk: 970115,
                    officialDate: "2026-11-15",
                    gameDate: "2026-11-15T22:00:00Z",
                    status: {
                      abstractGameState: "Preview",
                      codedGameState: "D",
                      detailedState: "Postponed",
                    },
                    teams: {
                      home: { team: { id: CARDENALES_ID, name: "Cardenales de Lara" } },
                      away: { team: { id: LEONES_ID, name: "Leones del Caracas" } },
                    },
                  },
                  {
                    gamePk: 970115,
                    officialDate: "2026-11-15",
                    gameDate: "2026-11-15T22:00:00Z",
                    status: {
                      abstractGameState: "Preview",
                      codedGameState: "S",
                      detailedState: "Scheduled",
                    },
                    teams: {
                      home: { team: { id: CARDENALES_ID, name: "Cardenales de Lara" } },
                      away: { team: { id: LEONES_ID, name: "Leones del Caracas" } },
                    },
                    lineups: {
                      awayPlayers: sampleStarters.map((s) => ({
                        id: s.id,
                        fullName: s.fullName,
                        primaryPosition: { abbreviation: s.position },
                      })),
                    },
                  },
                ],
              },
              {
                date: "2026-11-17",
                games: [
                  {
                    gamePk: 970116,
                    officialDate: "2026-11-17",
                    gameDate: "2026-11-17T23:00:00Z",
                    status: {
                      abstractGameState: "Preview",
                      codedGameState: "S",
                      detailedState: "Scheduled",
                    },
                    teams: {
                      home: { team: { id: LEONES_ID, name: "Leones del Caracas" } },
                      away: { team: { id: TIGRES_ID, name: "Tigres de Aragua" } },
                    },
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.includes("/api/v1.1/game/970114/feed/live")) {
        feedUrlsRequested.push(url);
        return new Response(JSON.stringify(feed970114), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/api/v1.1/game/970115/feed/live")) {
        feedUrlsRequested.push(url);
        return new Response(JSON.stringify(feed970115), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("/api/v1.1/game/970116/feed/live")) {
        feedUrlsRequested.push(url);
        return new Response(JSON.stringify(feed970116), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    // 5a. Juego 970114: lineup oficial desde feed/live + cruce de calendario 2026-11-14
    const payload = await getLineupCardData(970114, 2026);

    assert.ok(
      scheduleRequestUrl.includes("hydrate=lineups,probablePitcher"),
      "Debe consultar schedule con hydrate=lineups,probablePitcher"
    );
    assert.ok(
      feedUrlsRequested.some((u) => u.includes("/api/v1.1/game/970114/feed/live")),
      "Debe consultar /feed/live del gamePk seleccionado"
    );

    assert.equal(payload.gamePk, 970114);
    assert.equal(payload.date, "2026-11-14");
    assert.equal(payload.dateShort, "14NOV");
    assert.equal(payload.timeCompact, "8:00PM");
    assert.equal(payload.opponentId, AGUILAS_ID);
    assert.equal(payload.opponentName, "Águilas del Zulia");
    assert.equal(payload.opponentShort, "AGUILAS");
    assert.equal(payload.isHome, true);
    assert.equal(payload.status, "Pre-Game");
    assert.equal(payload.hasOfficialLineup, true);
    assert.equal(payload.pitcherName, "ERICK LEAL");
    assert.equal(payload.transmissionLine1, "TRANSMISIÓN IVC,");
    assert.equal(payload.transmissionLine2, "BeisbolPlay, La Mega");
    assert.equal(payload.stadiumName, "ESTADIO MONUMENTAL SIMON BOLIVAR");

    assert.equal(payload.slots.length, 9, "Debe retornar exactamente 9 titulares");
    assert.deepEqual(
      payload.slots.map((s) => s.order),
      [1, 2, 3, 4, 5, 6, 7, 8, 9]
    );
    assert.equal(payload.slots[1].position, "RF");
    assert.equal(payload.slots[1].playerName, "VICTOR BERICOTO");
    assert.equal(payload.slots[3].position, "BD", "El slot 4 con DH debe normalizarse a BD");
    assert.equal(payload.slots[3].playerName, "LEANDRO CEDEÑO");
    assert.equal(payload.slots[4].playerName, "JOSE RONDON");
    assert.equal(payload.slots[8].position, "C");
    assert.equal(payload.slots[8].playerName, "FREDDY FERMIN");

    const matches970115 = payload.availableGames.filter((g) => g.gamePk === 970115);
    assert.equal(matches970115.length, 1, "Debe deduplicar gamePk 970115 en availableGames");
    assert.equal(matches970115[0].status, "Scheduled", "Debe priorizar Scheduled sobre Postponed");

    // 5b. Juego 970115: fallback a schedule.lineups y boxscore.pitchers[0]
    const fallbackLineupPayload = await getLineupCardData(970115, 2026);
    assert.equal(fallbackLineupPayload.hasOfficialLineup, true);
    assert.equal(fallbackLineupPayload.slots[3].position, "BD");
    assert.equal(fallbackLineupPayload.slots[3].playerName, "LEANDRO CEDEÑO");
    assert.equal(fallbackLineupPayload.pitcherName, "NORWITH GUDIÑO");
    assert.equal(fallbackLineupPayload.opponentShort, "CARDENALES");
    assert.equal(fallbackLineupPayload.dateShort, "15NOV");

    // 5c. Juego 970116: sin alineación oficial -> 9 slots vacíos editables + POR ANUNCIAR
    const pendingPayload = await getLineupCardData(970116, 2026);
    assert.equal(pendingPayload.hasOfficialLineup, false);
    assert.equal(pendingPayload.slots.length, 9);
    assert.ok(pendingPayload.slots.every((s) => s.playerName === ""));
    assert.equal(pendingPayload.pitcherName, "POR ANUNCIAR");
    assert.equal(pendingPayload.opponentShort, "TIGRES");
    assert.equal(pendingPayload.dateShort, "17NOV");

    console.log("=== TODAS LAS PRUEBAS DEL GENERADOR DE LINEUP PASARON EXITOSAMENTE ===");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

runTests().catch((err) => {
  console.error("Fallo en lineup-card.test.ts:", err);
  process.exit(1);
});
