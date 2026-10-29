import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Cargar variables de entorno de .env.local
const envContent = readFileSync(".env.local", "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  if (line.includes("=") && !line.startsWith("#")) {
    const [k, v] = line.trim().split("=", 2);
    env[k] = v;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getVenezuelanDate(dateStr, datetimeStr) {
  if (datetimeStr) {
    try {
      const dt = new Date(datetimeStr);
      if (!isNaN(dt.getTime())) {
        const vet = new Date(dt.getTime() - 4 * 3600 * 1000);
        return vet.toISOString().slice(0, 10);
      }
    } catch {}
  }
  return dateStr ? String(dateStr).slice(0, 10) : "";
}

console.log("🧪 Validando récord situacional por día de semana (Sábados 1-1, Domingos 2-0)...");

async function run() {
  const { data: rawGames } = await supabase
    .from("games")
    .select("*")
    .eq("season", 2026)
    .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
    .in("game_type", ["R", "regular"])
    .or("home_team_id.eq.695,away_team_id.eq.695");

  assert.ok(rawGames && rawGames.length > 0, "Debe haber juegos disputados en 2026");

  const daysCount = {
    0: { w: 0, l: 0 },
    1: { w: 0, l: 0 },
    2: { w: 0, l: 0 },
    3: { w: 0, l: 0 },
    4: { w: 0, l: 0 },
    5: { w: 0, l: 0 },
    6: { w: 0, l: 0 },
  };

  rawGames.forEach((g) => {
    const isHome = Number(g.home_team_id) === 695;
    const cScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
    const oScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
    const won = cScore > oScore;

    const effDate = getVenezuelanDate(g.game_date, g.game_datetime);
    if (effDate) {
      const d = new Date(`${effDate}T12:00:00Z`);
      const wd = (d.getUTCDay() + 6) % 7; // Lunes=0, Domingo=6
      if (won) daysCount[wd].w++;
      else daysCount[wd].l++;
    }
  });

  const daysRecord = {
    lunes: `${daysCount[0].w}G-${daysCount[0].l}P`,
    martes: `${daysCount[1].w}G-${daysCount[1].l}P`,
    miercoles: `${daysCount[2].w}G-${daysCount[2].l}P`,
    jueves: `${daysCount[3].w}G-${daysCount[3].l}P`,
    viernes: `${daysCount[4].w}G-${daysCount[4].l}P`,
    sabado: `${daysCount[5].w}G-${daysCount[5].l}P`,
    domingo: `${daysCount[6].w}G-${daysCount[6].l}P`,
  };

  console.log("Récord por Día de Semana (2026):", daysRecord);

  // Aserciones exactas solicitadas por el usuario:
  assert.equal(daysRecord.sabado, "1G-1P", "Sábados debe ser 1G-1P (derrota 17/10 y victoria 24/10)");
  assert.equal(daysRecord.domingo, "2G-0P", "Domingos debe ser 2G-0P (victoria 18/10 y victoria 25/10)");
  assert.equal(daysRecord.lunes, "0G-1P", "Lunes debe ser 0G-1P (derrota 26/10 vs Aragua)");
  assert.equal(daysRecord.martes, "0G-2P", "Martes debe ser 0G-2P");
  assert.equal(daysRecord.miercoles, "1G-0P", "Miércoles debe ser 1G-0P");
  assert.equal(daysRecord.jueves, "0G-1P", "Jueves debe ser 0G-1P");
  assert.equal(daysRecord.viernes, "0G-2P", "Viernes debe ser 0G-2P");

  console.log("✅ Validación de situacionales por día de semana completada al 100%!");
}

run().catch((err) => {
  console.error("❌ Falló la prueba:", err);
  process.exit(1);
});
