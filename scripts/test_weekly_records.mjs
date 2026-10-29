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

console.log("🧪 Validando cálculo de semanas oficiales LVBP (Martes a Lunes)...");

const WEEKS_2026_CONFIG = [
  { weekNum: 1, semana: "Semana 1 (12/10 - 19/10)", startDate: "2026-10-12", endDate: "2026-10-19" },
  { weekNum: 2, semana: "Semana 2 (20/10 - 26/10)", startDate: "2026-10-20", endDate: "2026-10-26" },
  { weekNum: 3, semana: "Semana 3 (27/10 - 02/11)", startDate: "2026-10-27", endDate: "2026-11-02" },
  { weekNum: 4, semana: "Semana 4 (03/11 - 09/11)", startDate: "2026-11-03", endDate: "2026-11-09" },
  { weekNum: 5, semana: "Semana 5 (10/11 - 16/11)", startDate: "2026-11-10", endDate: "2026-11-16" },
  { weekNum: 6, semana: "Semana 6 (17/11 - 23/11)", startDate: "2026-11-17", endDate: "2026-11-23" },
  { weekNum: 7, semana: "Semana 7 (24/11 - 30/11)", startDate: "2026-11-24", endDate: "2026-11-30" },
  { weekNum: 8, semana: "Semana 8 (01/12 - 07/12)", startDate: "2026-12-01", endDate: "2026-12-07" },
  { weekNum: 9, semana: "Semana 9 (08/12 - 14/12)", startDate: "2026-12-08", endDate: "2026-12-14" },
  { weekNum: 10, semana: "Semana 10 (15/12 - 21/12)", startDate: "2026-12-15", endDate: "2026-12-21" },
  { weekNum: 11, semana: "Semana 11 (22/12 - 28/12)", startDate: "2026-12-22", endDate: "2026-12-28" },
];

async function run() {
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("season", 2026)
    .in("status", ["Final", "Completed", "Completed Early", "Game Over"])
    .in("game_type", ["R", "regular"])
    .or("home_team_id.eq.695,away_team_id.eq.695");

  assert.ok(games && games.length > 0, "Debe haber juegos disputados en 2026");

  const weeklyRecords = WEEKS_2026_CONFIG.map((w) => {
    const weekGames = games.filter((g) => {
      if (!g.game_date) return false;
      const d = g.game_date.slice(0, 10);
      return d >= w.startDate && d <= w.endDate;
    });

    let wWins = 0;
    let wLosses = 0;
    let wCf = 0;
    let wCp = 0;

    weekGames.forEach((g) => {
      const isHome = Number(g.home_team_id) === 695;
      const cScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
      const oScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
      if (cScore > oScore) wWins++;
      else wLosses++;
      wCf += cScore;
      wCp += oScore;
    });

    const totalPlayed = weekGames.length;
    const pctVal = totalPlayed > 0 ? (wWins / totalPlayed).toFixed(3).replace(/^0+/, "") : ".000";
    const difNum = wCf - wCp;
    const difStr = difNum > 0 ? `+${difNum}` : `${difNum}`;

    return {
      weekNum: w.weekNum,
      semana: w.semana,
      juegos: totalPlayed,
      w: wWins,
      l: wLosses,
      pct: pctVal.startsWith(".") ? pctVal : `.${pctVal}`,
      cf: wCf,
      cp: wCp,
      dif: difStr,
      record: `${wWins}G-${wLosses}P`,
    };
  });

  console.log("Semanas calculadas:", weeklyRecords.slice(0, 4));

  // Aserciones
  const w1 = weeklyRecords[0];
  assert.equal(w1.semana, "Semana 1 (12/10 - 19/10)");
  assert.equal(w1.juegos, 6);
  assert.equal(w1.record, "2G-4P");

  const w2 = weeklyRecords[1];
  assert.equal(w2.semana, "Semana 2 (20/10 - 26/10)");
  // El juego del lunes 26/10 DEBE estar en Semana 2
  assert.equal(w2.juegos, 5, "Semana 2 debe contener 5 juegos incluyendo el lunes 26/10");
  assert.equal(w2.record, "2G-3P");

  const w3 = weeklyRecords[2];
  assert.equal(w3.semana, "Semana 3 (27/10 - 02/11)");
  // Semana 3 inició el martes 27/10, no debe incluir el juego del lunes 26/10
  assert.equal(w3.juegos, 0, "Semana 3 no debe tener juegos aún al haber arrancado el martes 27/10");

  console.log("✅ Validación de semanas oficiales LVBP exitosa al 100%!");
}

run().catch((err) => {
  console.error("❌ Falló la prueba:", err);
  process.exit(1);
});
