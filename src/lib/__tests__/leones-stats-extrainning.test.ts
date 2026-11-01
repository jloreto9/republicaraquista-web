import assert from "node:assert/strict";
import {
  isExtraInningGame,
  isPechofriadaGame,
  getLeonesAdvancedStats,
} from "../leones-stats-service";
import { supabase } from "../supabase";

async function runTests() {
  console.log("=== Ejecutando pruebas de Extrainning y Pechofriadas en Leones Stats ===");

  // 1. Pruebas unitarias de Extrainning
  assert.equal(
    isExtraInningGame({ scheduledInnings: 9, currentInning: 9, innings: new Array(9) }, 9, null),
    false
  );
  assert.equal(
    isExtraInningGame({ scheduledInnings: 9, currentInning: 10, innings: new Array(10) }, 10, null),
    true
  );
  assert.equal(
    isExtraInningGame({ scheduledInnings: 7, currentInning: 7, innings: new Array(7) }, 7, null),
    false
  );
  assert.equal(
    isExtraInningGame({ scheduledInnings: 7, currentInning: 8, innings: new Array(8) }, 8, null),
    true
  );

  // 2. Pruebas unitarias de Pechofriadas (> 5 carreras de ventaja en cualquier momento y pierde)
  // Ventaja máxima de +5 (ej. 7-2) y pierde -> NO es > 5 carreras
  assert.equal(
    isPechofriadaGame(false, false, [{ result: { awayScore: 7, homeScore: 2 } }, { result: { awayScore: 8, homeScore: 9 } }], null),
    false,
    "Ventaja máxima de exactamente 5 carreras no supera > 5"
  );

  // Ventaja de +6 (ej. 9-3 o 10-4) y pierde -> SÍ es Pechofriada
  assert.equal(
    isPechofriadaGame(false, false, [{ result: { awayScore: 9, homeScore: 3 } }, { result: { awayScore: 13, homeScore: 16 } }], null),
    true,
    "Ventaja de +6 carreras y derrota final SÍ es Pechofriada"
  );

  // Ventaja de +6 y termina ganando -> NO es Pechofriada
  assert.equal(
    isPechofriadaGame(true, true, [{ result: { homeScore: 8, awayScore: 1 } }, { result: { homeScore: 8, awayScore: 7 } }], null),
    false,
    "Si Leones gana el partido nunca es Pechofriada"
  );

  // Detección por linescore cuando allPlays está vacío (visitante anota 6 en el 1ro y pierde 6-7)
  assert.equal(
    isPechofriadaGame(false, false, [], {
      innings: [{ away: { runs: 6 }, home: { runs: 7 } }],
    }),
    true,
    "En la alta del 1ro tuvo ventaja 6-0 antes de la baja -> SÍ es Pechofriada"
  );

  // 3. Verificación real contra Supabase + MLB Stats API (temporada 2026 y baseline 2025)
  const stats2025 = await getLeonesAdvancedStats(2025);
  assert.equal(stats2025.pechofriadas, 1, "Temporada 2025 tuvo 1 pechofriada (10-3 en el 4to el 26/10/2025)");

  if (supabase) {
    const stats = await getLeonesAdvancedStats(2026);
    const [extW] = stats.extraInning.split("-").map(Number);
    assert.ok(extW >= 1, `Leones debe tener >= 1 victoria en extrainning en 2026 (actual: ${stats.extraInning})`);
    assert.ok(
      stats.pechofriadas >= 2,
      `Leones registra al menos 2 pechofriadas en 2026 (9-3 el 20/10 y 10-4 el 29/10). Actual: ${stats.pechofriadas}`
    );
    console.log(
      `[OK] Leones Stats 2026 verificado: Juego N°${stats.totalGames} (${stats.record}) | En extrainning: ${stats.extraInning} | Pechofriadas: ${stats.pechofriadas}`
    );
  }

  console.log("=== TODAS LAS PRUEBAS DE EXTRAINNING Y PECHOFRIADAS PASARON EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("Fallo en leones-stats-extrainning.test.ts:", err);
  process.exit(1);
});
