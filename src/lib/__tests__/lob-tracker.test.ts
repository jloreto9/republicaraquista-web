import assert from "node:assert/strict";
import {
  computeSituationalDataFromFeeds,
  fetchGameLiveFeed,
  getDynamicSituationalData,
} from "../game-feed-service";
import { supabase } from "../supabase";

async function runTests() {
  console.log("=== Ejecutando pruebas de LOB Tracker & Splits Situacionales ===");

  // 1. Prueba unitaria determinista de máquina de estados por media entrada
  const syntheticFeed = {
    gamePk: 999001,
    gameData: {
      teams: {
        home: { id: 698, name: "Tiburones de La Guaira" },
        away: { id: 695, name: "Leones del Caracas" },
      },
    },
    liveData: {
      plays: {
        allPlays: [
          // Inn 1 Top, 0 outs: Batter 101 conecta Doble con bases limpias ante LHP -> NO es turno en RISP
          {
            about: { inning: 1, halfInning: "top" },
            count: { outs: 0 },
            result: { event: "Double", eventType: "double", rbi: 0 },
            matchup: {
              batter: { id: 101, fullName: "Bateador Uno" },
              pitcher: { id: 901, fullName: "Zurdo Rival" },
              pitchHand: { code: "L" },
              postOnSecond: { id: 101 },
              splits: { menOnBase: "RISP" },
            },
            runners: [
              {
                details: { runner: { id: 101 }, eventType: "double" },
                movement: { originBase: null, end: "2B", isOut: false },
              },
            ],
          },
          // Inn 1 Top, 0 outs, corredor 101 en 2B: Batter 102 falla con elevado (1 out) -> rispLobMid = 1
          {
            about: { inning: 1, halfInning: "top" },
            count: { outs: 1 },
            result: { event: "Flyout", eventType: "field_out", rbi: 0 },
            matchup: {
              batter: { id: 102, fullName: "Bateador Dos" },
              pitcher: { id: 901, fullName: "Zurdo Rival" },
              pitchHand: { code: "L" },
              postOnSecond: { id: 101 },
              splits: { menOnBase: "RISP" },
            },
            runners: [
              {
                details: { runner: { id: 102 }, eventType: "field_out" },
                movement: { originBase: null, end: null, isOut: true },
              },
            ],
          },
          // Inn 1 Top, 1 out, corredor 101 en 2B: Batter 103 pega Sencillo (1B y 3B, 1 out) -> H en RISP
          {
            about: { inning: 1, halfInning: "top" },
            count: { outs: 1 },
            result: { event: "Single", eventType: "single", rbi: 0 },
            matchup: {
              batter: { id: 103, fullName: "Bateador Tres" },
              pitcher: { id: 902, fullName: "Derecho Rival" },
              pitchHand: { code: "R" },
              postOnFirst: { id: 103 },
              postOnThird: { id: 101 },
              splits: { menOnBase: "RISP" },
            },
            runners: [
              {
                details: { runner: { id: 103 }, eventType: "single" },
                movement: { originBase: null, end: "1B", isOut: false },
              },
              {
                details: { runner: { id: 101 }, eventType: "single" },
                movement: { originBase: "2B", end: "3B", isOut: false },
              },
            ],
          },
          // Inn 1 Top, 1 out: Corredor 103 puesto out intentando robar 2B (2 outs), NO cuenta PA al bateador 104
          {
            about: { inning: 1, halfInning: "top" },
            count: { outs: 2 },
            result: { event: "Caught Stealing 2B", eventType: "caught_stealing_2b", rbi: 0 },
            matchup: {
              batter: { id: 104, fullName: "Bateador Cuatro" },
              pitcher: { id: 902, fullName: "Derecho Rival" },
              pitchHand: { code: "R" },
              postOnThird: { id: 101 },
              splits: { menOnBase: "RISP" },
            },
            runners: [
              {
                details: { runner: { id: 103 }, eventType: "caught_stealing_2b" },
                movement: { originBase: "1B", end: null, isOut: true },
              },
            ],
          },
          // Inn 1 Top, 2 outs, corredor 101 en 3B: Batter 104 se poncha (3er out) -> lobEnding = 1, rispLobEnding = 1
          {
            about: { inning: 1, halfInning: "top" },
            count: { outs: 3 },
            result: { event: "Strikeout", eventType: "strikeout", rbi: 0 },
            matchup: {
              batter: { id: 104, fullName: "Bateador Cuatro" },
              pitcher: { id: 902, fullName: "Derecho Rival" },
              pitchHand: { code: "R" },
              splits: { menOnBase: "Empty" },
            },
            runners: [
              {
                details: { runner: { id: 104 }, eventType: "strikeout" },
                movement: { originBase: null, end: null, isOut: true },
              },
            ],
          },
          // Inn 1 Bottom (Pitcheo de Leones): 3 outs seguidos -> 1.0 IP
          {
            about: { inning: 1, halfInning: "bottom" },
            count: { outs: 3 },
            result: { event: "Triple Play", eventType: "triple_play", rbi: 0 },
            matchup: {
              batter: { id: 501, fullName: "Rival Uno" },
              batSide: { code: "R" },
              pitcher: { id: 701, fullName: "Abridor Leones" },
              splits: { menOnBase: "Empty" },
            },
            runners: [],
          },
          // Inn 2 Top: Bases llenas con 2 outs y Batter 105 batea Triple barre-bases pero es out en 3B -> 0 LOB
          {
            about: { inning: 2, halfInning: "top" },
            count: { outs: 2 },
            result: { event: "Walk", eventType: "walk", rbi: 0 },
            matchup: {
              batter: { id: 101, fullName: "Bateador Uno" },
              pitcher: { id: 902, fullName: "Derecho Rival" },
              pitchHand: { code: "R" },
              postOnFirst: { id: 101 },
              postOnSecond: { id: 102 },
              postOnThird: { id: 103 },
              splits: { menOnBase: "Loaded" },
            },
            runners: [
              {
                details: { runner: { id: 101 }, eventType: "walk" },
                movement: { originBase: null, end: "1B", isOut: false },
              },
            ],
          },
          {
            about: { inning: 2, halfInning: "top" },
            count: { outs: 3 },
            result: { event: "Triple", eventType: "triple", rbi: 3 },
            matchup: {
              batter: { id: 105, fullName: "Bateador Cinco" },
              pitcher: { id: 902, fullName: "Derecho Rival" },
              pitchHand: { code: "R" },
              splits: { menOnBase: "Empty" },
            },
            runners: [
              {
                details: { runner: { id: 103 }, eventType: "triple" },
                movement: { originBase: "3B", end: "score", isOut: false },
              },
              {
                details: { runner: { id: 102 }, eventType: "triple" },
                movement: { originBase: "2B", end: "score", isOut: false },
              },
              {
                details: { runner: { id: 101 }, eventType: "triple" },
                movement: { originBase: "1B", end: "score", isOut: false },
              },
              {
                details: { runner: { id: 105 }, eventType: "other_out" },
                movement: { originBase: null, end: null, isOut: true },
              },
            ],
          },
        ],
      },
    },
  };

  const unitRes = computeSituationalDataFromFeeds([syntheticFeed]);
  assert.equal(unitRes.lobSummary.totalPa, 6, "Caught stealing no debe inflar PA total");
  assert.equal(unitRes.lobSummary.totalLobEnding, 1, "Solo 1 corredor varado al terminar inning");
  assert.equal(unitRes.lobSummary.totalRispLobEnding, 1, "1 corredor varado en RISP al 3er out");
  assert.equal(unitRes.lobSummary.totalRispLobMid, 1, "1 corredor varado en RISP dentro del inning");
  assert.equal(unitRes.lobSummary.totalRispLob, 2, "Total RISP LOB = 1 terminar + 1 dentro");

  const b104 = unitRes.lobBatterRanking.find((b) => b.batterId === 104);
  assert.ok(b104, "Bateador 104 debe existir");
  assert.equal(b104.pa, 1, "CS previo no debe sumarle PA extra a Bateador 104");
  assert.equal(b104.lobEnding, 1);
  assert.equal(b104.rispLobEnding, 1);

  const b105 = unitRes.lobBatterRanking.find((b) => b.batterId === 105);
  assert.ok(b105, "Bateador 105 debe existir");
  assert.equal(b105.lobEnding, 0, "Triple barre-bases con out en 3B no deja corredores en base");

  const lhpSplit = unitRes.splits.find((s) => s.situacion.includes("Zurdos (LHP)"));
  assert.equal(lhpSplit?.pa, 2, "Debe detectar correctamente pitchHand.code === 'L'");

  const pitchTotal = unitRes.pitchingSplits?.find((s) => s.situacion === "Total General");
  assert.equal(pitchTotal?.ipDisplay, "1.0", "Pitcheo situacional debe acumular outs reales");

  // 2. Paridad exacta contra feed oficial MLB Stats API (Juego 870072: CAR 13 @ LAG 16)
  const feed870072 = await fetchGameLiveFeed(870072);
  assert.ok(feed870072, "Debe descargar feed oficial del juego 870072");
  const officialTeamLob = Number(feed870072.liveData?.linescore?.teams?.away?.leftOnBase ?? -1);
  const res870072 = computeSituationalDataFromFeeds([feed870072]);

  assert.equal(
    res870072.lobSummary.totalLobEnding,
    officialTeamLob,
    `totalLobEnding (${res870072.lobSummary.totalLobEnding}) debe coincidir con linescore.leftOnBase oficial (${officialTeamLob})`
  );

  const duno = res870072.lobBatterRanking.find((b) => b.batterName.includes("Duno"));
  const tovar = res870072.lobBatterRanking.find((b) => b.batterName.includes("Tovar"));
  const bericoto = res870072.lobBatterRanking.find((b) => b.batterName.includes("Bericoto"));

  assert.equal(duno?.lobEnding, 4, "Alfredo Duno dejó 4 en base cerrando los innings 3 y 4");
  assert.equal(tovar?.rispLobMid, 2, "Wilfredo Tovar dejó 2 en RISP dentro de los innings 2 y 7");
  assert.equal(bericoto?.lobEnding, 0, "Víctor Bericoto impulsó las 3 en su triple del 7mo (0 LOB)");

  // 3. Prueba integral de temporada activa 2026
  if (supabase) {
    const seasonData = await getDynamicSituationalData(2026);
    assert.ok(
      seasonData.lobSummary.totalLobEnding > 0,
      `totalLobEnding en 2026 debe ser > 0 (actual: ${seasonData.lobSummary.totalLobEnding})`
    );
    assert.ok(
      seasonData.lobSummary.totalRispLob > 0,
      `totalRispLob en 2026 debe ser > 0 (actual: ${seasonData.lobSummary.totalRispLob})`
    );
    assert.ok(
      seasonData.lobBatterRanking.length > 0 && seasonData.lobBatterRanking[0].totalRispLob > 0,
      "El líder de oportunidades debe registrar Total RISP LOB > 0"
    );
    const seasonPitchTotal = seasonData.pitchingSplits?.find((s) => s.situacion === "Total General");
    assert.notEqual(seasonPitchTotal?.ipDisplay, "0.0", "IP colectivo situacional en 2026 no puede ser 0.0");

    console.log(
      `[OK] Temporada 2026 verificada -> PA=${seasonData.lobSummary.totalPa} | LOB Terminar=${seasonData.lobSummary.totalLobEnding} | RISP LOB Terminar=${seasonData.lobSummary.totalRispLobEnding} | RISP LOB Dentro=${seasonData.lobSummary.totalRispLobMid} | Total RISP LOB=${seasonData.lobSummary.totalRispLob} | Pitch IP=${seasonPitchTotal?.ipDisplay}`
    );
    console.log(
      `[OK] Top 3 LOB Ranking 2026:`,
      seasonData.lobBatterRanking
        .slice(0, 3)
        .map(
          (b) =>
            `${b.batterName} (PA RISP=${b.paRisp}, AVG RISP=${b.avgRisp}, 3erOut=${b.lobEnding}, RISP3er=${b.rispLobEnding}, RISPMid=${b.rispLobMid}, TotalRISP=${b.totalRispLob})`
        )
        .join(" | ")
    );
  }

  console.log("=== TODAS LAS PRUEBAS DE LOB TRACKER PASARON EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("Fallo en lob-tracker.test.ts:", err);
  process.exit(1);
});
