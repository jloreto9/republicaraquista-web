import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { BattingStats, PitchingStats } from "../../types/sports";
import {
  calculateMvpRace,
  calculatePitcherOfYearRace,
  computeLeagueBattingEnvironment,
  computeLeaguePitchingEnvironment,
} from "../awards-engine";

function makeBatter(overrides: Partial<BattingStats> & { playerId: number; playerName: string; teamId: number }): BattingStats {
  const ab = overrides.atBats ?? 180;
  const h = overrides.hits ?? 55;
  const doubles = overrides.doubles ?? 10;
  const triples = overrides.triples ?? 1;
  const hr = overrides.homeRuns ?? 6;
  const bb = overrides.walks ?? 22;
  const hbp = overrides.hbp ?? 2;
  const sf = overrides.sf ?? 2;
  const sh = overrides.sh ?? 0;
  const pa = overrides.plateAppearances ?? ab + bb + hbp + sf + sh;
  const singles = Math.max(0, h - doubles - triples - hr);
  const avg = ab > 0 ? Number((h / ab).toFixed(3)) : 0;
  const obpDen = ab + bb + hbp + sf;
  const obp = obpDen > 0 ? Number(((h + bb + hbp) / obpDen).toFixed(3)) : 0;
  const slg = ab > 0 ? Number(((singles + 2 * doubles + 3 * triples + 4 * hr) / ab).toFixed(3)) : 0;
  const ops = Number((obp + slg).toFixed(3));

  return {
    playerId: overrides.playerId,
    playerName: overrides.playerName,
    playerAvatar: `/assets/players/${overrides.playerId}.png`,
    teamId: overrides.teamId,
    teamName: overrides.teamName ?? `Equipo ${overrides.teamId}`,
    teamAbbr: overrides.teamAbbr ?? `EQ${overrides.teamId}`,
    teamLogo: `/logos/${overrides.teamId}.png`,
    games: overrides.games ?? 50,
    atBats: ab,
    plateAppearances: pa,
    pa,
    runs: overrides.runs ?? 32,
    hits: h,
    doubles,
    triples,
    homeRuns: hr,
    rbi: overrides.rbi ?? 35,
    walks: bb,
    strikeouts: overrides.strikeouts ?? 34,
    stolenBases: overrides.stolenBases ?? 4,
    caughtStealing: overrides.caughtStealing ?? 1,
    gidp: overrides.gidp ?? 3,
    hbp,
    sf,
    sh,
    avg: overrides.avg ?? avg,
    obp: overrides.obp ?? obp,
    slg: overrides.slg ?? slg,
    ops: overrides.ops ?? ops,
    iso: overrides.iso ?? Number((slg - avg).toFixed(3)),
    babip: overrides.babip ?? 0.31,
  };
}

function makePitcher(overrides: Partial<PitchingStats> & { playerId: number; playerName: string; teamId: number }): PitchingStats {
  const ip = overrides.inningsPitched ?? 50;
  const er = overrides.earnedRuns ?? 15;
  const h = overrides.hits ?? 42;
  const bb = overrides.walks ?? 14;
  const so = overrides.strikeouts ?? 45;
  const era = overrides.era ?? Number(((er * 9) / ip).toFixed(2));
  const whip = overrides.whip ?? Number(((h + bb) / ip).toFixed(2));
  const kPer9 = overrides.kPer9 ?? Number(((so * 9) / ip).toFixed(2));
  const bbPer9 = overrides.bbPer9 ?? Number(((bb * 9) / ip).toFixed(2));
  const kToBb = overrides.kToBb ?? (bb > 0 ? Number((so / bb).toFixed(2)) : so);

  return {
    playerId: overrides.playerId,
    playerName: overrides.playerName,
    playerAvatar: `/assets/players/${overrides.playerId}.png`,
    teamId: overrides.teamId,
    teamName: overrides.teamName ?? `Equipo ${overrides.teamId}`,
    teamAbbr: overrides.teamAbbr ?? `EQ${overrides.teamId}`,
    teamLogo: `/logos/${overrides.teamId}.png`,
    games: overrides.games ?? 12,
    gamesStarted: overrides.gamesStarted ?? 10,
    inningsPitched: ip,
    inningsDisplay: overrides.inningsDisplay ?? `${Math.floor(ip)}.0`,
    hits: h,
    runs: overrides.runs ?? er + 2,
    earnedRuns: er,
    walks: bb,
    strikeouts: so,
    homeRuns: overrides.homeRuns ?? 3,
    gidp: overrides.gidp ?? 4,
    hbp: overrides.hbp ?? 2,
    wins: overrides.wins ?? 5,
    losses: overrides.losses ?? 2,
    saves: overrides.saves ?? 0,
    era,
    whip,
    kPer9,
    bbPer9,
    kToBb,
  };
}

function runTests() {
  const teamGamesMap: Record<number, number> = {
    695: 56, // Leones del Caracas
    693: 56, // Cardenales de Lara
    692: 56, // Águilas del Zulia
    697: 56, // Bravos de Margarita
    699: 56, // Tigres de Aragua
  };
  const teamWinPctMap: Record<number, number> = {
    695: 0.554,
    693: 0.625,
    692: 0.518,
    697: 0.482,
    699: 0.429,
  };

  // 1. Prueba MVP: entorno de liga, puntajes, pilares e insignias
  const batters: BattingStats[] = [
    // Favorito absoluto (Cardenales)
    makeBatter({
      playerId: 1001,
      playerName: "Ildemaro Vargas",
      teamId: 693,
      teamAbbr: "LAR",
      atBats: 205,
      hits: 76,
      doubles: 16,
      triples: 2,
      homeRuns: 14,
      rbi: 52,
      runs: 48,
      walks: 34,
      stolenBases: 10,
      caughtStealing: 1,
    }),
    // Referente Caraquista (#2 o #3)
    makeBatter({
      playerId: 602922,
      playerName: "José Rondón",
      teamId: 695,
      teamAbbr: "CAR",
      atBats: 198,
      hits: 63,
      doubles: 13,
      triples: 1,
      homeRuns: 13,
      rbi: 46,
      runs: 38,
      walks: 26,
      stolenBases: 4,
      caughtStealing: 2,
    }),
    makeBatter({
      playerId: 1003,
      playerName: "Alí Castillo",
      teamId: 692,
      teamAbbr: "ZUL",
      atBats: 210,
      hits: 71,
      doubles: 10,
      triples: 3,
      homeRuns: 3,
      rbi: 28,
      runs: 36,
      walks: 20,
      stolenBases: 12,
      caughtStealing: 2,
    }),
    makeBatter({
      playerId: 1004,
      playerName: "Breyvic Valera",
      teamId: 697,
      teamAbbr: "MAR",
      atBats: 190,
      hits: 56,
      doubles: 11,
      triples: 0,
      homeRuns: 7,
      rbi: 34,
      runs: 31,
      walks: 24,
    }),
    makeBatter({
      playerId: 1005,
      playerName: "Cafecito Martínez",
      teamId: 699,
      teamAbbr: "TIG",
      atBats: 185,
      hits: 53,
      doubles: 9,
      triples: 0,
      homeRuns: 6,
      rbi: 30,
      runs: 25,
      walks: 18,
    }),
    // Jugador no elegible por pocos PA (aunque con promedio altísimo)
    makeBatter({
      playerId: 1006,
      playerName: "Emergente Caliente",
      teamId: 695,
      teamAbbr: "CAR",
      atBats: 40,
      hits: 22,
      homeRuns: 4,
      rbi: 14,
      walks: 6,
    }),
  ];

  const batEnv = computeLeagueBattingEnvironment(batters);
  assert.ok(batEnv.lgWoba > 0.25 && batEnv.lgWoba < 0.5, `lgWoba razonable: ${batEnv.lgWoba}`);
  assert.ok(batEnv.lgRunsPerPa > 0.05 && batEnv.lgRunsPerPa < 0.3, `R/PA razonable: ${batEnv.lgRunsPerPa}`);

  const mvpResult = calculateMvpRace(batters, {
    teamGamesMap,
    teamWinPctMap,
    maxGames: 56,
  });

  assert.equal(mvpResult.usedFallback, false, "Con 5 calificados >= 174 AP no debe usar fallback");
  assert.equal(mvpResult.candidates.length, 5, "Emergente con 46 PA debe quedar excluido del ranking MVP");
  assert.equal(mvpResult.candidates[0].player.playerId, 1001, "El #1 MVP debe ser Ildemaro Vargas");
  assert.equal(mvpResult.candidates[0].overallRank, 1);
  assert.ok(mvpResult.candidates[0].leaderBadges.includes("Líder HR"), "Debe detectar Líder HR");
  assert.ok(mvpResult.candidates[0].leaderBadges.includes("Líder CI"), "Debe detectar Líder CI");
  assert.ok(mvpResult.candidates[0].leaderBadges.includes("Líder OPS"), "Debe detectar Líder OPS");
  assert.ok(mvpResult.candidates[0].totalScore > 85 && mvpResult.candidates[0].totalScore <= 100);

  const caracasMvp = mvpResult.candidates.find((c) => c.player.teamId === 695);
  assert.ok(caracasMvp, "José Rondón debe aparecer en el ranking MVP");
  assert.equal(caracasMvp.overallRank, 2, "José Rondón debe ser #2 en la liga");
  assert.equal(caracasMvp.pillars.length, 3);

  // 2. Prueba Pitcher del Año con umbral invernal 0.8 IP/J (44.8 IP en 56 J)
  const pitchers: PitchingStats[] = [
    // Abridor estrella con 46.0 IP (0.82 IP/J -> califica bajo 0.8 IP/J aunque < 56 IP!)
    makePitcher({
      playerId: 2001,
      playerName: "Max Castillo",
      teamId: 693,
      teamAbbr: "LAR",
      inningsPitched: 48.0,
      inningsDisplay: "48.0",
      earnedRuns: 11,
      hits: 36,
      walks: 10,
      homeRuns: 2,
      strikeouts: 48,
      wins: 6,
      losses: 1,
    }),
    // Abridor Caraquista (46.2 IP = 46.67 -> califica bajo 0.8 IP/J y es claramente #2)
    makePitcher({
      playerId: 660508,
      playerName: "Norwith Gudiño",
      teamId: 695,
      teamAbbr: "CAR",
      inningsPitched: 46.7,
      inningsDisplay: "46.2",
      earnedRuns: 12,
      hits: 37,
      walks: 12,
      homeRuns: 3,
      strikeouts: 45,
      wins: 5,
      losses: 2,
    }),
    makePitcher({
      playerId: 2003,
      playerName: "Mario Sánchez",
      teamId: 692,
      teamAbbr: "ZUL",
      inningsPitched: 50.0,
      inningsDisplay: "50.0",
      earnedRuns: 20,
      hits: 48,
      walks: 14,
      homeRuns: 5,
      strikeouts: 40,
      wins: 4,
      losses: 2,
    }),
    makePitcher({
      playerId: 2004,
      playerName: "Osmer Morales",
      teamId: 697,
      teamAbbr: "MAR",
      inningsPitched: 47.0,
      inningsDisplay: "47.0",
      earnedRuns: 18,
      hits: 47,
      walks: 15,
      homeRuns: 5,
      strikeouts: 39,
      wins: 4,
      losses: 3,
    }),
    makePitcher({
      playerId: 2005,
      playerName: "Guillermo Moscoso",
      teamId: 699,
      teamAbbr: "TIG",
      inningsPitched: 45.0,
      inningsDisplay: "45.0",
      earnedRuns: 20,
      hits: 50,
      walks: 18,
      homeRuns: 6,
      strikeouts: 32,
      wins: 3,
      losses: 4,
    }),
    // Relevista corto con 15 IP -> fuera de carrera de Pitcher del Año cuando hay 5 >= 0.8 IP/J
    makePitcher({
      playerId: 2006,
      playerName: "Cerrador Corto",
      teamId: 695,
      teamAbbr: "CAR",
      inningsPitched: 15.0,
      inningsDisplay: "15.0",
      earnedRuns: 1,
      hits: 8,
      walks: 3,
      homeRuns: 0,
      strikeouts: 22,
      wins: 1,
      losses: 0,
      saves: 12,
    }),
  ];

  const pitEnv = computeLeaguePitchingEnvironment(pitchers);
  assert.ok(pitEnv.lgEra > 1.5 && pitEnv.lgEra < 6.0, `ERA liga válida: ${pitEnv.lgEra}`);
  assert.ok(Number.isFinite(pitEnv.cFip), `cFIP válido: ${pitEnv.cFip}`);

  const pitcherResult = calculatePitcherOfYearRace(pitchers, {
    teamGamesMap,
    teamWinPctMap,
    maxGames: 56,
  });

  assert.equal(pitcherResult.activeMultiplier, 0.8);
  assert.equal(pitcherResult.usedFallback, false, "Con 5 abridores >= 44.8 IP no debe usar fallback");
  assert.equal(pitcherResult.candidates.length, 5, "Cerrador de 15 IP no debe entrar al ranking abridor");
  assert.equal(pitcherResult.candidates[0].player.playerId, 2001, "Max Castillo debe liderar Pitcher del Año");
  assert.ok(pitcherResult.candidates[0].leaderBadges.includes("Líder ERA"));
  assert.ok(pitcherResult.candidates[0].leaderBadges.includes("Líder G"));
  assert.ok(pitcherResult.candidates[0].leaderBadges.includes("Líder SO"));
  assert.equal(
    pitcherResult.candidates.find((c) => c.player.teamId === 695)?.overallRank,
    2,
    "Norwith Gudiño debe ocupar el puesto #2 general"
  );

  // 3. Prueba de fallback progresivo cuando hay menos de 5 lanzadores en 0.8 IP/J
  const earlySeasonPitchers = pitchers.slice(0, 3).concat([
    makePitcher({
      playerId: 2010,
      playerName: "Abridor Cuarto",
      teamId: 697,
      inningsPitched: 34.0,
      earnedRuns: 12,
      strikeouts: 28,
    }),
    makePitcher({
      playerId: 2011,
      playerName: "Abridor Quinto",
      teamId: 699,
      inningsPitched: 35.0,
      earnedRuns: 14,
      strikeouts: 26,
    }),
  ]);
  const fallbackPitcherResult = calculatePitcherOfYearRace(earlySeasonPitchers, {
    teamGamesMap,
    teamWinPctMap,
    maxGames: 56,
  });
  assert.equal(fallbackPitcherResult.usedFallback, true, "Debe activar fallback a 0.6 IP/J cuando solo 3 cumplen 0.8");
  assert.equal(fallbackPitcherResult.activeMultiplier, 0.6);
  assert.equal(fallbackPitcherResult.candidates.length, 5);

  // 4. Caso borde: todos los equipos con igual winPct -> bono colectivo neutro (7.5 pts en MVP)
  const flatWinPctResult = calculateMvpRace(batters.slice(0, 5), {
    teamGamesMap,
    teamWinPctMap: { 695: 0.5, 693: 0.5, 692: 0.5, 697: 0.5, 699: 0.5 },
    maxGames: 56,
  });
  for (const c of flatWinPctResult.candidates) {
    assert.equal(c.teamScore, 7.5, "Con igualdad de récord colectivo, teamScore debe ser neutro (7.5)");
  }

  // 5. Verificación de regla inamovible de Lección 3: cero menciones de "sabermétrico/a" en el módulo Premios
  const filesToAudit = [
    "src/lib/awards-engine.ts",
    "src/components/stats/awards-view.tsx",
    "src/components/stats/individuales-view.tsx",
    "src/components/stats/stats-filters.tsx",
    "src/app/individuales/page.tsx",
  ];
  const rootDir = path.resolve(__dirname, "../../..");
  for (const rel of filesToAudit) {
    const content = fs.readFileSync(path.join(rootDir, rel), "utf8");
    assert.equal(
      /saberm/i.test(content),
      false,
      `El archivo ${rel} no debe contener la palabra prohibida 'sabermétrico/a/ía'`
    );
  }

  console.log("=== TODAS LAS PRUEBAS DEL MOTOR DE PREMIOS LVBP PASARON EXITOSAMENTE ===");
}

runTests();
