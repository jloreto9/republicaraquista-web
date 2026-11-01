import assert from "node:assert/strict";
import {
  hasBatterAppearance,
  hasPitcherAppearance,
  getBattingStats,
  getPitchingStats,
  supabase,
} from "../supabase";
import {
  buildBatterSplitRow,
  buildPitcherSplitRow,
  decimalInningsToOuts,
  parseInningsStringToOuts,
  outsToInningsDisplay,
  fetchMlbStatSplits,
  getPlayerSplitsProfile,
  getAllAvailablePlayersForSplits,
  clearPlayerSplitsCache,
  RawGameBattingRow,
  RawGamePitchingRow,
} from "../player-splits-service";

async function runTests() {
  console.log("=== Ejecutando suite de pruebas: Player Splits LVBP (splits-fake-games-players) ===");

  // 1. Predicados de participación real
  assert.equal(
    hasBatterAppearance({ ab: 0, bb: 0, hbp: 0, sf: 0, sh: 0, r: 0, sb: 0, cs: 0 }),
    false,
    "Fila de banca en cero NO debe contar como juego disputado"
  );
  assert.equal(
    hasBatterAppearance({ ab: 0, bb: 1, hbp: 0, sf: 0, sh: 0, r: 0, sb: 0, cs: 0 }),
    true,
    "Bateador con boleto (0 AB, 1 BB) SÍ debe contar como juego disputado"
  );
  assert.equal(
    hasBatterAppearance({ ab: 0, bb: 0, hbp: 0, sf: 0, sh: 0, r: 1, sb: 0, cs: 0 }),
    true,
    "Corredor emergente que anotó carrera (0 PA, 1 R) SÍ debe contar como juego disputado"
  );

  assert.equal(
    hasPitcherAppearance({ ip_decimal: 0, h: 0, r: 0, er: 0, bb: 0, hbp: 0, so: 0, hr: 0 }),
    false,
    "Fila de bullpen sin acción (todo en 0) NO debe contar como relevo"
  );
  assert.equal(
    hasPitcherAppearance({ ip_decimal: 0, h: 0, r: 1, er: 1, bb: 2, hbp: 0, so: 0, hr: 0 }),
    true,
    "Relevista con 0.0 IP pero 2 BB y 1 R SÍ enfrentó bateadores y debe contar"
  );

  // 2. Aritmética exacta de tercios de entrada (outs)
  assert.equal(decimalInningsToOuts(0.333), 1);
  assert.equal(decimalInningsToOuts(0.667), 2);
  assert.equal(decimalInningsToOuts(0.1), 1);
  assert.equal(decimalInningsToOuts(0.2), 2);
  assert.equal(parseInningsStringToOuts("11.1") + parseInningsStringToOuts("1.2"), 39);
  assert.equal(outsToInningsDisplay(39), "13.0");

  // 3. Construcción determinista de filas filtrando banca/bullpen, duplicados y juegos no jugados
  const sampleBatRows: RawGameBattingRow[] = [
    // Juego real 1: 4 AB, 2 H
    {
      game_id: 101,
      player_id: 1,
      team_id: 695,
      ab: 4,
      r: 1,
      h: 2,
      doubles: 1,
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
      games: { id: 101, home_team_id: 695, away_team_id: 696, status: "Final" },
    },
    // Duplicado accidental del juego 101 -> debe ignorarse
    {
      game_id: 101,
      player_id: 1,
      team_id: 695,
      ab: 4,
      r: 1,
      h: 2,
      doubles: 1,
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
      games: { id: 101, home_team_id: 695, away_team_id: 696, status: "Final" },
    },
    // Día en la banca sin ver acción -> NO debe inflar games
    {
      game_id: 102,
      player_id: 1,
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
      games: { id: 102, home_team_id: 695, away_team_id: 697, status: "Final" },
    },
    // Juego pospuesto -> NO debe contar
    {
      game_id: 103,
      player_id: 1,
      team_id: 695,
      ab: 2,
      r: 0,
      h: 1,
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
      games: { id: 103, home_team_id: 695, away_team_id: 698, status: "Postponed" },
    },
  ];

  const batSplit = buildBatterSplitRow("Test", "context", "General", sampleBatRows);
  assert.equal(batSplit.games, 1, "Bateador solo debe registrar 1 juego real");
  assert.equal(batSplit.ab, 4);
  assert.equal(batSplit.h, 2);
  assert.equal(batSplit.avg, ".500");

  const samplePitRows: RawGamePitchingRow[] = [
    {
      game_id: 201,
      player_id: 2,
      team_id: 695,
      ip_decimal: 1.333,
      h: 1,
      r: 0,
      er: 0,
      bb: 0,
      hbp: 0,
      so: 2,
      hr: 0,
      games: { id: 201, home_team_id: 695, away_team_id: 696, status: "Final" },
    },
    // Bullpen sin lanzar -> NO debe contar
    {
      game_id: 202,
      player_id: 2,
      team_id: 695,
      ip_decimal: 0,
      h: 0,
      r: 0,
      er: 0,
      bb: 0,
      hbp: 0,
      so: 0,
      hr: 0,
      games: { id: 202, home_team_id: 695, away_team_id: 697, status: "Final" },
    },
  ];

  const pitSplit = buildPitcherSplitRow("TestP", "context", "General", samplePitRows);
  assert.equal(pitSplit.games, 1, "Lanzador solo debe registrar 1 relevo real");
  assert.equal(pitSplit.ipDisplay, "1.1");
  assert.equal(pitSplit.so, 2);

  // 4. Verificación en vivo contra MLB Stats API (sportId=17&leagueId=135)
  const haroldSplits2026 = await fetchMlbStatSplits(605612, "hitting", 2026);
  assert.equal(
    haroldSplits2026.length,
    0,
    "Harold Castro (605612) tiene 0 juegos en LVBP 2026; fetchMlbStatSplits no debe traer 2025 ni MLB"
  );

  const corredorSplits2026 = await fetchMlbStatSplits(625506, "hitting", 2026);
  assert.ok(
    corredorSplits2026.length >= 15,
    `Aldrem Corredor (625506) debe traer splits oficiales LVBP 2026 (recibidos: ${corredorSplits2026.length})`
  );
  for (const s of corredorSplits2026) {
    if (s.league?.id) {
      assert.equal(Number(s.league.id), 135, "Todos los splits deben pertenecer a LVBP (leagueId=135)");
    }
  }

  // 5. Verificación de integración con Supabase si las credenciales están presentes
  if (supabase) {
    clearPlayerSplitsCache();
    const list2026 = await getAllAvailablePlayersForSplits(2026);
    assert.ok(list2026.length > 50, `Lista 2026 debe contener jugadores activos reales (total: ${list2026.length})`);

    // Ningún jugador inactivo o ID fantasma debe aparecer en 2026
    assert.equal(
      list2026.some((p) => p.id === 605612),
      false,
      "Harold Castro (605612, inactivo en 2026) NO debe aparecer en el selector 2026"
    );
    assert.equal(
      list2026.some((p) => p.id === 682845),
      false,
      "Rito Lugo (682845, inactivo en 2026) NO debe aparecer en el selector 2026"
    );
    assert.equal(
      list2026.some((p) => p.id === 672580),
      false,
      "El ID erróneo 672580 de Aldrem Corredor NO debe aparecer"
    );
    assert.equal(
      list2026.some((p) => p.id === 625506 && p.type === "batter"),
      true,
      "Aldrem Corredor real (625506) SÍ debe aparecer como bateador activo en 2026"
    );
    assert.equal(
      list2026.some((p) => p.id === 682624 && p.type === "pitcher"),
      true,
      "Sandy Gastón (682624) SÍ debe aparecer como lanzador activo en 2026"
    );

    // Ningún lanzador sin turnos debe aparecer listado como bateador
    assert.equal(
      list2026.some((p) => p.id === 612797 && p.type === "batter"),
      false,
      "Erick Leal (lanzador con 0 PA) NO debe aparecer en la lista de bateadores"
    );
    assert.equal(
      list2026.some((p) => p.id === 682624 && p.type === "batter"),
      false,
      "Sandy Gastón (lanzador con 0 PA) NO debe aparecer en la lista de bateadores"
    );

    // Consultar jugadores inactivos en 2026 debe retornar null (cero fallback silencioso a 2025)
    const haroldProfile = await getPlayerSplitsProfile(605612, "batter", 2026);
    assert.equal(haroldProfile, null, "Perfil 2026 de Harold Castro (0 JJ) debe ser null");

    const ritoProfile = await getPlayerSplitsProfile(682845, "pitcher", 2026);
    assert.equal(ritoProfile, null, "Perfil 2026 de Rito Lugo (0 JJ) debe ser null");

    // Perfil real de Aldrem Corredor (625506)
    const corredorProfile = await getPlayerSplitsProfile(625506, "batter", 2026);
    assert.ok(corredorProfile, "Perfil 2026 de Aldrem Corredor debe existir");
    assert.equal(corredorProfile.season, 2026);
    const batHome = corredorProfile.contextSplits.find((r) => r.badge === "Local")?.games || 0;
    const batAway = corredorProfile.contextSplits.find((r) => r.badge === "Visitante")?.games || 0;
    assert.equal(
      corredorProfile.totalGames,
      batHome + batAway,
      `Juegos totales de Corredor (${corredorProfile.totalGames}) deben cuadrar exactamente con Local (${batHome}) + Visitante (${batAway})`
    );

    // Perfil real de Sandy Gastón (682624): no debe inflarse con filas de bullpen en 0.0 IP
    const gastonProfile = await getPlayerSplitsProfile(682624, "pitcher", 2026);
    assert.ok(gastonProfile, "Perfil 2026 de Sandy Gastón debe existir");
    assert.equal(gastonProfile.season, 2026);
    const pitHome = gastonProfile.pitcherContextSplits?.find((r) => r.badge === "Local")?.games || 0;
    const pitAway = gastonProfile.pitcherContextSplits?.find((r) => r.badge === "Visitante")?.games || 0;
    assert.equal(
      gastonProfile.totalGames,
      pitHome + pitAway,
      `Juegos totales de Sandy Gastón (${gastonProfile.totalGames}) deben cuadrar con Local (${pitHome}) + Visitante (${pitAway})`
    );
    assert.ok(
      gastonProfile.pitcherOpponentSplits?.every((r) => r.games > 0),
      "Ningún rival en pitcherOpponentSplits debe tener 0 juegos reales"
    );

    // Tablas agregadas de supabase.ts tampoco deben inflar JJ con banca/bullpen
    const carBatters = await getBattingStats(2026, "R", 695);
    assert.equal(
      carBatters.some((b) => b.playerId === 612797),
      false,
      "getBattingStats no debe incluir a Erick Leal con 0 PA"
    );
    const carPitchers = await getPitchingStats(2026, "R", 695);
    const gastonAgg = carPitchers.find((p) => p.playerId === 682624);
    assert.ok(gastonAgg && gastonAgg.games >= 7 && gastonAgg.games <= gastonProfile.totalGames);

    console.log(
      `[OK] Supabase + MLB LVBP verificados: ${list2026.length} jugadores activos | Corredor=${corredorProfile.totalGames} JJ | Gastón=${gastonProfile.totalGames} JJ`
    );
  }

  console.log("=== TODAS LAS PRUEBAS DE PLAYER SPLITS PASARON EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("Fallo en player-splits.test.ts:", err);
  process.exit(1);
});
