import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import fallbackCalendar from "../src/data/calendar_2026_27.json" with { type: "json" };

function getVenezuelanDate(gameDate, gameDatetime) {
  if (gameDatetime) {
    try {
      const d = new Date(gameDatetime);
      if (!isNaN(d.getTime())) {
        const vet = new Date(d.getTime() - 4 * 3600 * 1000);
        return vet.toISOString().slice(0, 10);
      }
    } catch {}
  }
  return gameDate ? gameDate.slice(0, 10) : "";
}

async function testCalendarAttachment() {
  console.log("🧪 Iniciando validación de sincronización de fechas en el calendario...");

  // 1. Obtener datos de MLB Stats API
  const mlbResultsMap = new Map();
  const mlbRes = await fetch(
    "https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=2026"
  );
  assert.ok(mlbRes.ok, "MLB Stats API debe responder 200 OK");
  const mlbJson = await mlbRes.json();

  for (const dateObj of mlbJson.dates || []) {
    for (const g of dateObj.games || []) {
      const homeId = Number(g.teams?.home?.team?.id);
      const awayId = Number(g.teams?.away?.team?.id);
      if (homeId === 695 || awayId === 695) {
        const isHome = homeId === 695;
        const oppId = isHome ? awayId : homeId;
        const targetDate = g.officialDate || g.originalDate || dateObj.date;
        const status = g.status?.detailedState || g.status?.abstractGameState || "Final";
        const isCompleted = [
          "final",
          "completed",
          "completed early",
          "game over",
        ].includes(status.toLowerCase());

        const homeScore = Number(g.teams?.home?.score ?? 0);
        const awayScore = Number(g.teams?.away?.score ?? 0);

        mlbResultsMap.set(`${targetDate}-${oppId}-${isHome ? "H" : "A"}`, {
          homeScore,
          awayScore,
          status,
          isCompleted,
        });
      }
    }
  }

  // 2. Obtener datos de Supabase
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseGames = [];
  if (url && key) {
    const sb = createClient(url, key);
    const { data } = await sb
      .from("games")
      .select("game_date, game_datetime, home_team_id, away_team_id, home_score, away_score, status")
      .or("home_team_id.eq.695,away_team_id.eq.695");
    supabaseGames = data || [];
  }

  // 3. Procesar eventos del calendario
  const events = fallbackCalendar.events;
  const enriched = events.map((event) => {
    const mlbKey = `${event.date}-${event.opponentId}-${event.isHome ? "H" : "A"}`;
    const mlbMatch = mlbResultsMap.get(mlbKey);

    if (mlbMatch && mlbMatch.isCompleted) {
      const caracasScore = event.isHome ? mlbMatch.homeScore : mlbMatch.awayScore;
      const opponentScore = event.isHome ? mlbMatch.awayScore : mlbMatch.homeScore;
      return {
        ...event,
        result: {
          isCompleted: true,
          status: mlbMatch.status,
          homeScore: mlbMatch.homeScore,
          awayScore: mlbMatch.awayScore,
          caracasScore,
          opponentScore,
          won: caracasScore > opponentScore,
        },
      };
    }

    const matchedGame = supabaseGames.find((g) => {
      const gVetDate = getVenezuelanDate(g.game_date, g.game_datetime);
      const dateMatch =
        gVetDate === event.date ||
        (g.game_date && g.game_date.slice(0, 10) === event.date);
      if (!dateMatch) return false;

      const isHome = Number(g.home_team_id) === 695;
      if (isHome !== event.isHome) return false;

      const oppId = isHome ? Number(g.away_team_id) : Number(g.home_team_id);
      return oppId === event.opponentId;
    });

    if (matchedGame) {
      const isHome = Number(matchedGame.home_team_id) === 695;
      const homeScore = Number(matchedGame.home_score ?? 0);
      const awayScore = Number(matchedGame.away_score ?? 0);
      const caracasScore = isHome ? homeScore : awayScore;
      const opponentScore = isHome ? awayScore : homeScore;
      const isCompleted = [
        "final",
        "completed",
        "completed early",
        "game over",
      ].includes((matchedGame.status || "").toLowerCase());

      return {
        ...event,
        result: {
          isCompleted,
          status: matchedGame.status || "Final",
          homeScore,
          awayScore,
          caracasScore,
          opponentScore,
          won: caracasScore > opponentScore,
        },
      };
    }

    return event;
  });

  // Validaciones
  const oct24 = enriched.find((e) => e.date === "2026-10-24");
  assert.ok(oct24, "El juego del 24 de Octubre debe existir");
  assert.equal(oct24.isHome, true, "24 Oct: Leones de CASA");
  assert.equal(oct24.opponentAbbr, "MAG", "24 Oct: Rival es MAG");
  assert.ok(oct24.result, "24 Oct: Debe tener resultado adjunto");
  assert.equal(oct24.result.isCompleted, true, "24 Oct: Debe ser Final");
  assert.equal(oct24.result.won, true, "24 Oct: Caracas ganó");
  assert.equal(oct24.result.caracasScore, 10, "24 Oct: Caracas 10");
  assert.equal(oct24.result.opponentScore, 1, "24 Oct: Magallanes 1");

  console.log("✅ Sábado 24 de Octubre verificado: G 10-1 vs MAG (Final)");

  const oct25 = enriched.find((e) => e.date === "2026-10-25");
  assert.ok(oct25, "El juego del 25 de Octubre debe existir");
  assert.equal(oct25.isHome, false, "25 Oct: Leones de VISITA");
  assert.equal(oct25.opponentAbbr, "MAG", "25 Oct: Rival es MAG");
  assert.ok(oct25.result, "25 Oct: Debe tener resultado adjunto");
  assert.equal(oct25.result.isCompleted, true, "25 Oct: Debe ser Final");
  assert.equal(oct25.result.won, true, "25 Oct: Caracas ganó");
  assert.equal(oct25.result.caracasScore, 8, "25 Oct: Caracas 8");
  assert.equal(oct25.result.opponentScore, 3, "25 Oct: Magallanes 3");

  console.log("✅ Domingo 25 de Octubre verificado: G 8-3 @ MAG (Final)");

  const completed = enriched.filter((e) => e.result?.isCompleted);
  assert.equal(completed.length, 11, "Deben haber 11 juegos completados hasta el momento");
  console.log(`✅ Total de juegos completados auditados correctamente: ${completed.length}/11`);
}

testCalendarAttachment().catch((err) => {
  console.error("❌ Falló la prueba:", err);
  process.exit(1);
});
