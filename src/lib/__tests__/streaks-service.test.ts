import assert from "node:assert/strict";
import {
  computeTeamStreaks,
  computeBatterStreaks,
  computePitcherStreaks,
} from "../streaks-service";

async function runStreaksTests() {
  console.log("=== Ejecutando pruebas unitarias de Cálculo de Rachas (streaks-service) ===");

  const LEONES_ID = 695;
  const MAGALLANES_ID = 696;
  const LA_GUAIRA_ID = 698;

  // ── 1. PRUEBAS DE RACHAS DE EQUIPO (computeTeamStreaks) ─────────────────
  console.log("1. Probando rachas de equipo (general, local, visita, H2H)...");

  const sampleGames = [
    {
      id: 1,
      game_date: "2026-10-15",
      game_datetime: "2026-10-15T19:00:00Z",
      status: "Final",
      home_team_id: LEONES_ID,
      away_team_id: MAGALLANES_ID,
      home_score: 5,
      away_score: 3, // W
    },
    {
      id: 2,
      game_date: "2026-10-16",
      game_datetime: "2026-10-16T19:00:00Z",
      status: "Final",
      home_team_id: LEONES_ID,
      away_team_id: LA_GUAIRA_ID,
      home_score: 6,
      away_score: 2, // W
    },
    {
      id: 3,
      game_date: "2026-10-17",
      game_datetime: "2026-10-17T19:00:00Z",
      status: "Final",
      home_team_id: MAGALLANES_ID,
      away_team_id: LEONES_ID,
      home_score: 1,
      away_score: 4, // W (en visita)
    },
  ];

  const streaks1 = computeTeamStreaks(sampleGames, LEONES_ID);
  assert.equal(streaks1.general.streak, "3 W", "Racha general debe ser 3 W");
  assert.equal(streaks1.general.trend, "winning");
  assert.equal(streaks1.general.count, 3);
  assert.equal(streaks1.home.streak, "2 W", "Racha de local debe ser 2 W");
  assert.equal(streaks1.away.streak, "1 W", "Racha de visita debe ser 1 W");

  // Verificar racha H2H vs Magallanes (2 W: juego 1 y juego 3)
  const vsMagallanes = streaks1.rivals.find((r) => r.category.includes("Magallanes"));
  assert.ok(vsMagallanes, "Debe existir racha vs Magallanes");
  assert.equal(vsMagallanes.streak, "2 W", "Racha vs Magallanes debe ser 2 W");

  // Agregar una derrota reciente al final
  const sampleWithLoss = [
    ...sampleGames,
    {
      id: 4,
      game_date: "2026-10-18",
      game_datetime: "2026-10-18T19:00:00Z",
      status: "Final",
      home_team_id: LA_GUAIRA_ID,
      away_team_id: LEONES_ID,
      home_score: 7,
      away_score: 3, // L
    },
  ];
  const streaks2 = computeTeamStreaks(sampleWithLoss, LEONES_ID);
  assert.equal(streaks2.general.streak, "1 L", "Racha general debe cambiar a 1 L tras la derrota");
  assert.equal(streaks2.general.trend, "losing");
  assert.equal(streaks2.away.streak, "1 L", "Racha de visita debe ser 1 L");
  assert.equal(streaks2.home.streak, "2 W", "Racha de local debe mantenerse intacta en 2 W");

  // ── 2. PRUEBAS DE RACHAS DE BATEO (computeBatterStreaks) ─────────────────
  console.log("2. Probando rachas ofensivas (hits, embasado y regla MLB 9.23b)...");

  const gamesMap: Record<number, any> = {
    101: { game_date: "2026-10-10T19:00:00Z" },
    102: { game_date: "2026-10-11T19:00:00Z" },
    103: { game_date: "2026-10-12T19:00:00Z" },
    104: { game_date: "2026-10-13T19:00:00Z" },
  };

  // Jugador A: 3 juegos con hit consecutivos
  // Jugador B: 2 juegos con hit, 1 juego intermedio sin AB (corredor emergente), 1 juego con hit -> racha de 3 juegos (Regla MLB 9.23b)
  // Jugador C: 2 juegos con hit, luego 0-3 en el último juego -> racha activa cortada (0 o < 2)
  const battingRows = [
    // Jugador A (ID 1001)
    { game_id: 101, player_id: 1001, player_name: "Harold Castro", ab: 4, h: 2, bb: 0, hbp: 0, hr: 1 },
    { game_id: 102, player_id: 1001, player_name: "Harold Castro", ab: 3, h: 1, bb: 1, hbp: 0, hr: 0 },
    { game_id: 103, player_id: 1001, player_name: "Harold Castro", ab: 4, h: 2, bb: 0, hbp: 0, hr: 0 },

    // Jugador B (ID 1002): Lenyn Sosa
    { game_id: 101, player_id: 1002, player_name: "Lenyn Sosa", ab: 4, h: 1, bb: 0, hbp: 0, hr: 0 },
    { game_id: 102, player_id: 1002, player_name: "Lenyn Sosa", ab: 0, h: 0, bb: 0, hbp: 0, hr: 0 }, // Corredor emergente
    { game_id: 103, player_id: 1002, player_name: "Lenyn Sosa", ab: 3, h: 2, bb: 1, hbp: 0, hr: 1 },

    // Jugador C (ID 1003): José Rondón (se le cortó la racha en el juego 103)
    { game_id: 101, player_id: 1003, player_name: "José Rondón", ab: 4, h: 1, bb: 0, hbp: 0, hr: 0 },
    { game_id: 102, player_id: 1003, player_name: "José Rondón", ab: 3, h: 2, bb: 0, hbp: 0, hr: 0 },
    { game_id: 103, player_id: 1003, player_name: "José Rondón", ab: 4, h: 0, bb: 0, hbp: 0, hr: 0 }, // Cortó
  ];

  const { hittingStreaks, onBaseStreaks } = computeBatterStreaks(battingRows, gamesMap);

  const haroldHit = hittingStreaks.find((b) => b.playerId === 1001);
  assert.ok(haroldHit, "Harold Castro debe tener racha activa de hit");
  assert.equal(haroldHit.streakLength, 3, "Harold debe tener 3 juegos consecutivos con hit");

  const lenynHit = hittingStreaks.find((b) => b.playerId === 1002);
  assert.ok(lenynHit, "Lenyn Sosa debe tener racha activa de hit");
  assert.equal(lenynHit.streakLength, 2, "Lenyn debe tener 2 juegos con hit (el juego sin AB no la rompe)");

  const rondonHit = hittingStreaks.find((b) => b.playerId === 1003);
  assert.equal(rondonHit, undefined, "José Rondón no debe tener racha activa de hit tras irse de 4-0");

  // Racha de embasado de Harold: 3 juegos con H o BB
  const haroldOB = onBaseStreaks.find((b) => b.playerId === 1001);
  assert.ok(haroldOB, "Harold Castro debe tener racha de embasado");
  assert.equal(haroldOB.streakLength, 3);

  // ── 3. PRUEBAS DE RACHAS DE PITCHEO (computePitcherStreaks) ──────────────
  console.log("3. Probando rachas de pitcheo (apariciones sin carreras limpias)...");

  const pitchingRows = [
    // Gudiño: 3 apariciones consecutivas con 0 ER
    { game_id: 101, player_id: 2001, player_name: "Norwith Gudiño", ip_decimal: 1.1, er: 0, so: 2, bb: 0 },
    { game_id: 102, player_id: 2001, player_name: "Norwith Gudiño", ip_decimal: 1.0, er: 0, so: 1, bb: 1 },
    { game_id: 103, player_id: 2001, player_name: "Norwith Gudiño", ip_decimal: 2.0, er: 0, so: 3, bb: 0 },

    // Relevista B: permitió 1 ER en su última salida
    { game_id: 101, player_id: 2002, player_name: "Lanzador B", ip_decimal: 1.0, er: 0, so: 1, bb: 0 },
    { game_id: 102, player_id: 2002, player_name: "Lanzador B", ip_decimal: 1.0, er: 0, so: 2, bb: 0 },
    { game_id: 103, player_id: 2002, player_name: "Lanzador B", ip_decimal: 1.0, er: 2, so: 0, bb: 1 }, // Cortó racha
  ];

  const pitcherStreaks = computePitcherStreaks(pitchingRows, gamesMap);
  const gudino = pitcherStreaks.find((p) => p.playerId === 2001);
  assert.ok(gudino, "Norwith Gudiño debe tener racha de apariciones en blanco");
  assert.equal(gudino.streakLength, 3, "Gudiño debe tener 3 apariciones consecutivas en blanco");

  const pitcherB = pitcherStreaks.find((p) => p.playerId === 2002);
  assert.equal(pitcherB, undefined, "Lanzador B no debe tener racha activa tras permitir 2 ER en su última salida");

  console.log("=== TODAS LAS PRUEBAS DE RACHAS ACTIVAS PASARON EXITOSAMENTE ===");
}

runStreaksTests().catch((err) => {
  console.error("Fallo en pruebas de rachas:", err);
  process.exit(1);
});
