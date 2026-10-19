import assert from "node:assert/strict";
import { getLeonesAdvancedStats } from "../src/lib/leones-stats-service.ts";

console.log("🧪 Iniciando prueba de Leones Advanced Stats (Temporada 2026)...");

async function run() {
  const stats = await getLeonesAdvancedStats(2026);

  console.log("Estadísticas calculadas para Leones 2026:", {
    totalGames: stats.totalGames,
    record: stats.record,
    homeRecord: stats.homeRecord,
    awayRecord: stats.awayRecord,
    remontados: stats.remontados,
    up: stats.up,
    terreneadas: stats.terreneadas,
    starters: stats.starters,
    relievers: stats.relievers,
    saves: stats.saves,
  });

  // Validaciones canónicas
  assert.equal(stats.totalGames, 6, "Total de juegos debe ser 6");
  assert.equal(stats.record, "2-4", "Récord debe ser 2-4");
  assert.equal(stats.remontados, 1, "Debe haber 1 remontada (juego del 18/10 tras ir perdiendo 2-4 al 6to inning)");
  assert.equal(stats.up, "1-0", "Récord yendo arriba debe ser 1-0 (juego del 14/10 liderando 9-1 al 6to inning)");
  assert.equal(stats.starters, "0-2", "Abridores deben tener récord de 0-2");
  assert.equal(stats.relievers, "2-2", "Relevistas deben tener récord de 2-2");
  assert.equal(stats.terreneadas, 0, "Terreneadas debe ser 0");
  assert.equal(stats.saves, 0, "Salvados debe ser 0");

  console.log("✅ Todas las aserciones de Leones Advanced Stats pasaron al 100%!");
}

run().catch((err) => {
  console.error("❌ Falló la prueba:", err);
  process.exit(1);
});
