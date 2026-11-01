import assert from "node:assert/strict";
import { isExtraInningGame, getLeonesAdvancedStats } from "../leones-stats-service";
import { supabase } from "../supabase";

async function runTests() {
  console.log("=== Ejecutando pruebas de Extrainning en Leones Stats ===");

  // 1. Juego estándar de 9 entradas -> NO es extrainning
  assert.equal(
    isExtraInningGame({ scheduledInnings: 9, currentInning: 9, innings: new Array(9) }, 9, null),
    false
  );

  // 2. Juego CAR 8 @ MAG 3 (10 entradas sobre 9 pactadas) -> SÍ es extrainning
  assert.equal(
    isExtraInningGame({ scheduledInnings: 9, currentInning: 10, innings: new Array(10) }, 10, null),
    true
  );

  // 3. Doble juego de 7 entradas que termina en 7 -> NO es extrainning
  assert.equal(
    isExtraInningGame({ scheduledInnings: 7, currentInning: 7, innings: new Array(7) }, 7, null),
    false
  );

  // 4. Doble juego de 7 entradas que se define en el 8vo -> SÍ es extrainning
  assert.equal(
    isExtraInningGame({ scheduledInnings: 7, currentInning: 8, innings: new Array(8) }, 8, null),
    true
  );

  // 5. Verificación real contra Supabase + MLB Stats API (temporada 2026)
  if (supabase) {
    const stats = await getLeonesAdvancedStats(2026);
    const [extW, extL] = stats.extraInning.split("-").map(Number);
    assert.ok(
      extW >= 1,
      `Leones debe registrar al menos 1 victoria en extrainning en 2026 (CAR 8 @ MAG 3 en 10 entradas). Recibido: ${stats.extraInning}`
    );
    console.log(`[OK] Leones Stats 2026 verificado: Juego N°${stats.totalGames} (${stats.record}) | En extrainning: ${stats.extraInning}`);
  }

  console.log("=== TODAS LAS PRUEBAS DE EXTRAINNING PASARON EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("Fallo en leones-stats-extrainning.test.ts:", err);
  process.exit(1);
});
