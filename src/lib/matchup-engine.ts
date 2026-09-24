import { BattingStats, PitchingStats } from "@/types/sports";
import {
  RadarAxis,
  H2HRow,
  PlayerProfileCardData,
  MatchupComparisonData,
} from "@/types/matchup";

export function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}

function calculatePercentile(
  val: number,
  allVals: number[],
  higherBetter: boolean
): number {
  if (!allVals.length) return 50;
  let rankCount = 0;
  if (higherBetter) {
    rankCount = allVals.filter((v) => v <= val).length;
  } else {
    rankCount = allVals.filter((v) => v >= val).length;
  }
  const pct = Math.round((rankCount / allVals.length) * 100);
  return Math.min(100, Math.max(5, pct));
}

// Cálculo aproximado de wOBA si no viene explícito
export function computeWoba(b: BattingStats): number {
  // Coeficientes sabermétricos de wOBA estándar LVBP
  const pa = b.atBats + b.walks;
  if (pa === 0) return 0;
  const singles = Math.max(0, b.hits - b.doubles - b.triples - b.homeRuns);
  const wobaVal =
    (0.69 * b.walks +
      0.888 * singles +
      1.271 * b.doubles +
      1.616 * b.triples +
      2.101 * b.homeRuns) /
    pa;
  return Number(wobaVal.toFixed(3));
}

// Cálculo aproximado de wRC+ relativo a liga (.320 wOBA medio)
export function computeWrcPlus(woba: number, leagueWoba = 0.33): number {
  if (leagueWoba === 0) return 100;
  const wrc = Math.round(((woba - leagueWoba) / 1.15 + leagueWoba) / leagueWoba * 100);
  return Math.max(20, Math.min(250, wrc));
}

// Cálculo de FIP para lanzadores
export function computeFip(p: PitchingStats, cFIP = 3.8): number {
  if (p.inningsPitched === 0) return p.era;
  const fip = (13 * p.homeRuns + 3 * p.walks - 2 * p.strikeouts) / p.inningsPitched + cFIP;
  return Number(Math.max(0, fip).toFixed(2));
}

export function compareBatters(
  p1: BattingStats,
  p2: BattingStats,
  pool1: BattingStats[],
  pool2: BattingStats[],
  phase1Label = "Temporada Regular",
  phase2Label = "Temporada Regular"
): MatchupComparisonData {
  const p1Woba = computeWoba(p1);
  const p2Woba = computeWoba(p2);
  const p1Wrc = computeWrcPlus(p1Woba);
  const p2Wrc = computeWrcPlus(p2Woba);

  // Pool de valores
  const pool1Woba = pool1.map(computeWoba);
  const pool2Woba = pool2.map(computeWoba);
  const pool1Wrc = pool1Woba.map((w) => computeWrcPlus(w));
  const pool2Wrc = pool2Woba.map((w) => computeWrcPlus(w));

  const axesConfig: {
    name: string;
    key: string;
    higherBetter: boolean;
    getVal: (b: BattingStats) => number;
    formatVal: (b: BattingStats) => string;
    pool1Vals: number[];
    pool2Vals: number[];
  }[] = [
    {
      name: "Contacto (AVG)",
      key: "avg",
      higherBetter: true,
      getVal: (b) => b.avg,
      formatVal: (b) => b.avg.toFixed(3).replace(/^0/, ""),
      pool1Vals: pool1.map((b) => b.avg),
      pool2Vals: pool2.map((b) => b.avg),
    },
    {
      name: "Embasado (OBP)",
      key: "obp",
      higherBetter: true,
      getVal: (b) => b.obp,
      formatVal: (b) => b.obp.toFixed(3).replace(/^0/, ""),
      pool1Vals: pool1.map((b) => b.obp),
      pool2Vals: pool2.map((b) => b.obp),
    },
    {
      name: "Poder (SLG)",
      key: "slg",
      higherBetter: true,
      getVal: (b) => b.slg,
      formatVal: (b) => b.slg.toFixed(3).replace(/^0/, ""),
      pool1Vals: pool1.map((b) => b.slg),
      pool2Vals: pool2.map((b) => b.slg),
    },
    {
      name: "Producción (OPS)",
      key: "ops",
      higherBetter: true,
      getVal: (b) => b.ops,
      formatVal: (b) => b.ops.toFixed(3).replace(/^0/, ""),
      pool1Vals: pool1.map((b) => b.ops),
      pool2Vals: pool2.map((b) => b.ops),
    },
    {
      name: "wOBA",
      key: "woba",
      higherBetter: true,
      getVal: (b) => (b.playerId === p1.playerId ? p1Woba : p2Woba),
      formatVal: (b) =>
        (b.playerId === p1.playerId ? p1Woba : p2Woba).toFixed(3).replace(/^0/, ""),
      pool1Vals: pool1Woba,
      pool2Vals: pool2Woba,
    },
    {
      name: "wRC+",
      key: "wrc_plus",
      higherBetter: true,
      getVal: (b) => (b.playerId === p1.playerId ? p1Wrc : p2Wrc),
      formatVal: (b) => `${b.playerId === p1.playerId ? p1Wrc : p2Wrc}`,
      pool1Vals: pool1Wrc,
      pool2Vals: pool2Wrc,
    },
    {
      name: "Extrabases (ISO)",
      key: "iso",
      higherBetter: true,
      getVal: (b) => b.iso,
      formatVal: (b) => b.iso.toFixed(3).replace(/^0/, ""),
      pool1Vals: pool1.map((b) => b.iso),
      pool2Vals: pool2.map((b) => b.iso),
    },
    {
      name: "Paciencia (BB)",
      key: "walks",
      higherBetter: true,
      getVal: (b) => b.walks,
      formatVal: (b) => `${b.walks}`,
      pool1Vals: pool1.map((b) => b.walks),
      pool2Vals: pool2.map((b) => b.walks),
    },
  ];

  const radarAxes: RadarAxis[] = axesConfig.map((ax) => {
    const v1 = ax.getVal(p1);
    const v2 = ax.getVal(p2);
    const pct1 = calculatePercentile(v1, ax.pool1Vals, ax.higherBetter);
    const pct2 = calculatePercentile(v2, ax.pool2Vals, ax.higherBetter);

    let leader = "Empate";
    let leaderScheme: "amber" | "blue" | "gray" = "gray";

    if (pct1 > pct2) {
      leader = `${shortenName(p1.playerName)} (${p1.teamAbbr})`;
      leaderScheme = "amber";
    } else if (pct2 > pct1) {
      leader = `${shortenName(p2.playerName)} (${p2.teamAbbr})`;
      leaderScheme = "blue";
    }

    return {
      name: ax.name,
      key: ax.key,
      higherBetter: ax.higherBetter,
      val1: ax.formatVal(p1),
      val2: ax.formatVal(p2),
      pct1,
      pct2,
      leader,
      leaderScheme,
    };
  });

  // H2H Filas Desglosadas
  const h2hConfig: {
    category: string;
    metric: string;
    v1Str: string;
    v2Str: string;
    isP1Win: boolean;
    isP2Win: boolean;
  }[] = [
    // ⚡ Sabermetría
    {
      category: "⚡ Métricas Sabermétricas de Impacto",
      metric: "OPS (On-base Plus Slugging)",
      v1Str: p1.ops.toFixed(3).replace(/^0/, ""),
      v2Str: p2.ops.toFixed(3).replace(/^0/, ""),
      isP1Win: p1.ops > p2.ops,
      isP2Win: p2.ops > p1.ops,
    },
    {
      category: "⚡ Métricas Sabermétricas de Impacto",
      metric: "wOBA (Weighted On-Base Average)",
      v1Str: p1Woba.toFixed(3).replace(/^0/, ""),
      v2Str: p2Woba.toFixed(3).replace(/^0/, ""),
      isP1Win: p1Woba > p2Woba,
      isP2Win: p2Woba > p1Woba,
    },
    {
      category: "⚡ Métricas Sabermétricas de Impacto",
      metric: "wRC+ (Runs Created Plus)",
      v1Str: `${p1Wrc}`,
      v2Str: `${p2Wrc}`,
      isP1Win: p1Wrc > p2Wrc,
      isP2Win: p2Wrc > p1Wrc,
    },
    {
      category: "⚡ Métricas Sabermétricas de Impacto",
      metric: "ISO (Isolated Power)",
      v1Str: p1.iso.toFixed(3).replace(/^0/, ""),
      v2Str: p2.iso.toFixed(3).replace(/^0/, ""),
      isP1Win: p1.iso > p2.iso,
      isP2Win: p2.iso > p1.iso,
    },
    {
      category: "⚡ Métricas Sabermétricas de Impacto",
      metric: "BABIP (Bolas en Juego)",
      v1Str: p1.babip.toFixed(3).replace(/^0/, ""),
      v2Str: p2.babip.toFixed(3).replace(/^0/, ""),
      isP1Win: p1.babip > p2.babip,
      isP2Win: p2.babip > p1.babip,
    },

    // 🏏 Línea Tradicional
    {
      category: "🏏 Línea Ofensiva Tradicional",
      metric: "Promedio de Bateo (AVG)",
      v1Str: p1.avg.toFixed(3).replace(/^0/, ""),
      v2Str: p2.avg.toFixed(3).replace(/^0/, ""),
      isP1Win: p1.avg > p2.avg,
      isP2Win: p2.avg > p1.avg,
    },
    {
      category: "🏏 Línea Ofensiva Tradicional",
      metric: "Porcentaje de Embasado (OBP)",
      v1Str: p1.obp.toFixed(3).replace(/^0/, ""),
      v2Str: p2.obp.toFixed(3).replace(/^0/, ""),
      isP1Win: p1.obp > p2.obp,
      isP2Win: p2.obp > p1.obp,
    },
    {
      category: "🏏 Línea Ofensiva Tradicional",
      metric: "Porcentaje de Slugging (SLG)",
      v1Str: p1.slg.toFixed(3).replace(/^0/, ""),
      v2Str: p2.slg.toFixed(3).replace(/^0/, ""),
      isP1Win: p1.slg > p2.slg,
      isP2Win: p2.slg > p1.slg,
    },

    // 🔢 Volumen y Poder
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Jonrones (HR)",
      v1Str: `${p1.homeRuns}`,
      v2Str: `${p2.homeRuns}`,
      isP1Win: p1.homeRuns > p2.homeRuns,
      isP2Win: p2.homeRuns > p1.homeRuns,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Carreras Impulsadas (RBI)",
      v1Str: `${p1.rbi}`,
      v2Str: `${p2.rbi}`,
      isP1Win: p1.rbi > p2.rbi,
      isP2Win: p2.rbi > p1.rbi,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Carreras Anotadas (R)",
      v1Str: `${p1.runs}`,
      v2Str: `${p2.runs}`,
      isP1Win: p1.runs > p2.runs,
      isP2Win: p2.runs > p1.runs,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Hits Conectados (H)",
      v1Str: `${p1.hits}`,
      v2Str: `${p2.hits}`,
      isP1Win: p1.hits > p2.hits,
      isP2Win: p2.hits > p1.hits,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Dobles (2B)",
      v1Str: `${p1.doubles}`,
      v2Str: `${p2.doubles}`,
      isP1Win: p1.doubles > p2.doubles,
      isP2Win: p2.doubles > p1.doubles,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Bases Robadas (SB)",
      v1Str: `${p1.stolenBases}`,
      v2Str: `${p2.stolenBases}`,
      isP1Win: p1.stolenBases > p2.stolenBases,
      isP2Win: p2.stolenBases > p1.stolenBases,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Bases por Bolas (BB)",
      v1Str: `${p1.walks}`,
      v2Str: `${p2.walks}`,
      isP1Win: p1.walks > p2.walks,
      isP2Win: p2.walks > p1.walks,
    },
    {
      category: "🔢 Volumen, Fuerza y Extrabases",
      metric: "Turnos Oficiales (AB)",
      v1Str: `${p1.atBats}`,
      v2Str: `${p2.atBats}`,
      isP1Win: p1.atBats > p2.atBats,
      isP2Win: p2.atBats > p1.atBats,
    },
  ];

  let p1Wins = 0;
  let p2Wins = 0;
  let ties = 0;

  const h2hRows: H2HRow[] = [];
  let currentCat = "";

  h2hConfig.forEach((item) => {
    if (item.category !== currentCat) {
      currentCat = item.category;
      h2hRows.push({
        category: item.category,
        metric: item.category,
        val1: "",
        val2: "",
        winner: "",
        winnerColor: "",
        winnerScheme: "gray",
        isHeader: true,
      });
    }

    let winner = "Empate";
    let winnerColor = "#94A3B8";
    let winnerScheme: "amber" | "blue" | "gray" = "gray";

    if (item.isP1Win) {
      p1Wins += 1;
      winner = `${shortenName(p1.playerName)} (${p1.teamAbbr})`;
      winnerColor = "#FDB827";
      winnerScheme = "amber";
    } else if (item.isP2Win) {
      p2Wins += 1;
      winner = `${shortenName(p2.playerName)} (${p2.teamAbbr})`;
      winnerColor = "#38BDF8";
      winnerScheme = "blue";
    } else {
      ties += 1;
    }

    h2hRows.push({
      category: item.category,
      metric: item.metric,
      val1: item.v1Str,
      val2: item.v2Str,
      winner,
      winnerColor,
      winnerScheme,
      isHeader: false,
    });
  });

  const name1 = `${p1.playerName} (${p1.teamAbbr})`;
  const name2 = `${p2.playerName} (${p2.teamAbbr})`;

  let verdict = "";
  if (p1Wins > p2Wins) {
    verdict = `🏆 Veredicto Sabermétrico: ${name1} se impone en el matchup ganando ${p1Wins} de las métricas evaluadas frente a ${p2Wins} de ${name2}. Destaca con una línea ofensiva de ${p1.avg.toFixed(3).replace(/^0/, "")}/${p1.obp.toFixed(3).replace(/^0/, "")}/${p1.slg.toFixed(3).replace(/^0/, "")} y un OPS de ${p1.ops.toFixed(3).replace(/^0/, "")}.`;
  } else if (p2Wins > p1Wins) {
    verdict = `🏆 Veredicto Sabermétrico: ${name2} domina el duelo individual al superar a ${name1} en ${p2Wins} de las métricas ofensivas analizadas. Destaca con una línea ofensiva de ${p2.avg.toFixed(3).replace(/^0/, "")}/${p2.obp.toFixed(3).replace(/^0/, "")}/${p2.slg.toFixed(3).replace(/^0/, "")} y un OPS de ${p2.ops.toFixed(3).replace(/^0/, "")}.`;
  } else {
    verdict = `⚖️ Veredicto Sabermétrico: Duelo sumamente parejo entre ${name1} y ${name2} (${p1Wins} victorias cada uno con ${ties} empates). Ambos toleteros presentan un impacto ofensivo de alto nivel.`;
  }

  const card1: PlayerProfileCardData = {
    playerId: p1.playerId,
    name: p1.playerName,
    team: p1.teamName,
    teamAbbr: p1.teamAbbr,
    teamLogo: p1.teamLogo,
    pos: "Bateador",
    headshot: p1.playerAvatar,
    phase: phase1Label,
    mainStats: [
      { label: "AVG", value: p1.avg.toFixed(3).replace(/^0/, "") },
      { label: "OBP", value: p1.obp.toFixed(3).replace(/^0/, "") },
      { label: "SLG", value: p1.slg.toFixed(3).replace(/^0/, "") },
      { label: "OPS", value: p1.ops.toFixed(3).replace(/^0/, "") },
      { label: "HR", value: `${p1.homeRuns}` },
      { label: "RBI", value: `${p1.rbi}` },
    ],
  };

  const card2: PlayerProfileCardData = {
    playerId: p2.playerId,
    name: p2.playerName,
    team: p2.teamName,
    teamAbbr: p2.teamAbbr,
    teamLogo: p2.teamLogo,
    pos: "Bateador",
    headshot: p2.playerAvatar,
    phase: phase2Label,
    mainStats: [
      { label: "AVG", value: p2.avg.toFixed(3).replace(/^0/, "") },
      { label: "OBP", value: p2.obp.toFixed(3).replace(/^0/, "") },
      { label: "SLG", value: p2.slg.toFixed(3).replace(/^0/, "") },
      { label: "OPS", value: p2.ops.toFixed(3).replace(/^0/, "") },
      { label: "HR", value: `${p2.homeRuns}` },
      { label: "RBI", value: `${p2.rbi}` },
    ],
  };

  return {
    compareType: "Bateadores",
    player1: card1,
    player2: card2,
    radarAxes,
    h2hRows,
    verdict,
    p1Wins,
    p2Wins,
    ties,
  };
}

export function comparePitchers(
  p1: PitchingStats,
  p2: PitchingStats,
  pool1: PitchingStats[],
  pool2: PitchingStats[],
  phase1Label = "Temporada Regular",
  phase2Label = "Temporada Regular"
): MatchupComparisonData {
  const p1Fip = computeFip(p1);
  const p2Fip = computeFip(p2);
  const pool1Fip = pool1.map((p) => computeFip(p));
  const pool2Fip = pool2.map((p) => computeFip(p));

  const axesConfig: {
    name: string;
    key: string;
    higherBetter: boolean;
    getVal: (p: PitchingStats) => number;
    formatVal: (p: PitchingStats) => string;
    pool1Vals: number[];
    pool2Vals: number[];
  }[] = [
    {
      name: "Efectividad (ERA)",
      key: "era",
      higherBetter: false,
      getVal: (p) => p.era,
      formatVal: (p) => p.era.toFixed(2),
      pool1Vals: pool1.map((p) => p.era),
      pool2Vals: pool2.map((p) => p.era),
    },
    {
      name: "Control (WHIP)",
      key: "whip",
      higherBetter: false,
      getVal: (p) => p.whip,
      formatVal: (p) => p.whip.toFixed(2),
      pool1Vals: pool1.map((p) => p.whip),
      pool2Vals: pool2.map((p) => p.whip),
    },
    {
      name: "FIP Independiente",
      key: "fip",
      higherBetter: false,
      getVal: (p) => (p.playerId === p1.playerId ? p1Fip : p2Fip),
      formatVal: (p) => (p.playerId === p1.playerId ? p1Fip : p2Fip).toFixed(2),
      pool1Vals: pool1Fip,
      pool2Vals: pool2Fip,
    },
    {
      name: "Dominio (K/9)",
      key: "k9",
      higherBetter: true,
      getVal: (p) => p.kPer9,
      formatVal: (p) => p.kPer9.toFixed(2),
      pool1Vals: pool1.map((p) => p.kPer9),
      pool2Vals: pool2.map((p) => p.kPer9),
    },
    {
      name: "Comando (BB/9)",
      key: "bb9",
      higherBetter: false,
      getVal: (p) => p.bbPer9,
      formatVal: (p) => p.bbPer9.toFixed(2),
      pool1Vals: pool1.map((p) => p.bbPer9),
      pool2Vals: pool2.map((p) => p.bbPer9),
    },
    {
      name: "Relación K/BB",
      key: "kbb",
      higherBetter: true,
      getVal: (p) => p.kToBb,
      formatVal: (p) => p.kToBb.toFixed(2),
      pool1Vals: pool1.map((p) => p.kToBb),
      pool2Vals: pool2.map((p) => p.kToBb),
    },
    {
      name: "Innings (IP)",
      key: "inningsPitched",
      higherBetter: true,
      getVal: (p) => p.inningsPitched,
      formatVal: (p) => p.inningsPitched.toFixed(1),
      pool1Vals: pool1.map((p) => p.inningsPitched),
      pool2Vals: pool2.map((p) => p.inningsPitched),
    },
    {
      name: "Ponches (SO)",
      key: "strikeouts",
      higherBetter: true,
      getVal: (p) => p.strikeouts,
      formatVal: (p) => `${p.strikeouts}`,
      pool1Vals: pool1.map((p) => p.strikeouts),
      pool2Vals: pool2.map((p) => p.strikeouts),
    },
  ];

  const radarAxes: RadarAxis[] = axesConfig.map((ax) => {
    const v1 = ax.getVal(p1);
    const v2 = ax.getVal(p2);
    const pct1 = calculatePercentile(v1, ax.pool1Vals, ax.higherBetter);
    const pct2 = calculatePercentile(v2, ax.pool2Vals, ax.higherBetter);

    let leader = "Empate";
    let leaderScheme: "amber" | "blue" | "gray" = "gray";

    if (pct1 > pct2) {
      leader = `${shortenName(p1.playerName)} (${p1.teamAbbr})`;
      leaderScheme = "amber";
    } else if (pct2 > pct1) {
      leader = `${shortenName(p2.playerName)} (${p2.teamAbbr})`;
      leaderScheme = "blue";
    }

    return {
      name: ax.name,
      key: ax.key,
      higherBetter: ax.higherBetter,
      val1: ax.formatVal(p1),
      val2: ax.formatVal(p2),
      pct1,
      pct2,
      leader,
      leaderScheme,
    };
  });

  const h2hConfig: {
    category: string;
    metric: string;
    v1Str: string;
    v2Str: string;
    isP1Win: boolean;
    isP2Win: boolean;
  }[] = [
    // 🛡️ Eficiencia
    {
      category: "🛡️ Eficiencia y Prevención de Carreras",
      metric: "Efectividad (ERA)",
      v1Str: p1.era.toFixed(2),
      v2Str: p2.era.toFixed(2),
      isP1Win: p1.era < p2.era,
      isP2Win: p2.era < p1.era,
    },
    {
      category: "🛡️ Eficiencia y Prevención de Carreras",
      metric: "WHIP (Tráfico de Corredores)",
      v1Str: p1.whip.toFixed(2),
      v2Str: p2.whip.toFixed(2),
      isP1Win: p1.whip < p2.whip,
      isP2Win: p2.whip < p1.whip,
    },
    {
      category: "🛡️ Eficiencia y Prevención de Carreras",
      metric: "FIP (Fielding Independent Pitching)",
      v1Str: p1Fip.toFixed(2),
      v2Str: p2Fip.toFixed(2),
      isP1Win: p1Fip < p2Fip,
      isP2Win: p2Fip < p1Fip,
    },
    {
      category: "🛡️ Eficiencia y Prevención de Carreras",
      metric: "Carreras Limpias (ER)",
      v1Str: `${p1.earnedRuns}`,
      v2Str: `${p2.earnedRuns}`,
      isP1Win: p1.earnedRuns < p2.earnedRuns,
      isP2Win: p2.earnedRuns < p1.earnedRuns,
    },

    // ⚡ Mando & Ponches
    {
      category: "⚡ Mando, Dominio y Ponches",
      metric: "Ponches por 9 Entradas (K/9)",
      v1Str: p1.kPer9.toFixed(2),
      v2Str: p2.kPer9.toFixed(2),
      isP1Win: p1.kPer9 > p2.kPer9,
      isP2Win: p2.kPer9 > p1.kPer9,
    },
    {
      category: "⚡ Mando, Dominio y Ponches",
      metric: "Boletos por 9 Entradas (BB/9)",
      v1Str: p1.bbPer9.toFixed(2),
      v2Str: p2.bbPer9.toFixed(2),
      isP1Win: p1.bbPer9 < p2.bbPer9,
      isP2Win: p2.bbPer9 < p1.bbPer9,
    },
    {
      category: "⚡ Mando, Dominio y Ponches",
      metric: "Relación Ponches / Boletos (K/BB)",
      v1Str: p1.kToBb.toFixed(2),
      v2Str: p2.kToBb.toFixed(2),
      isP1Win: p1.kToBb > p2.kToBb,
      isP2Win: p2.kToBb > p1.kToBb,
    },
    {
      category: "⚡ Mando, Dominio y Ponches",
      metric: "Ponches Totales (SO)",
      v1Str: `${p1.strikeouts}`,
      v2Str: `${p2.strikeouts}`,
      isP1Win: p1.strikeouts > p2.strikeouts,
      isP2Win: p2.strikeouts > p1.strikeouts,
    },

    // 🔢 Volumen
    {
      category: "🔢 Volumen y Carga Monticular",
      metric: "Innings Lanzados (IP)",
      v1Str: p1.inningsPitched.toFixed(1),
      v2Str: p2.inningsPitched.toFixed(1),
      isP1Win: p1.inningsPitched > p2.inningsPitched,
      isP2Win: p2.inningsPitched > p1.inningsPitched,
    },
    {
      category: "🔢 Volumen y Carga Monticular",
      metric: "Juegos Lanzados (G)",
      v1Str: `${p1.games}`,
      v2Str: `${p2.games}`,
      isP1Win: p1.games > p2.games,
      isP2Win: p2.games > p1.games,
    },
    {
      category: "🔢 Volumen y Carga Monticular",
      metric: "Juegos Salvados (SV)",
      v1Str: `${p1.saves || 0}`,
      v2Str: `${p2.saves || 0}`,
      isP1Win: (p1.saves || 0) > (p2.saves || 0),
      isP2Win: (p2.saves || 0) > (p1.saves || 0),
    },
    {
      category: "🔢 Volumen y Carga Monticular",
      metric: "Hits Permitidos (H)",
      v1Str: `${p1.hits}`,
      v2Str: `${p2.hits}`,
      isP1Win: p1.hits < p2.hits,
      isP2Win: p2.hits < p1.hits,
    },
    {
      category: "🔢 Volumen y Carga Monticular",
      metric: "Boletos Permitidos (BB)",
      v1Str: `${p1.walks}`,
      v2Str: `${p2.walks}`,
      isP1Win: p1.walks < p2.walks,
      isP2Win: p2.walks < p1.walks,
    },
    {
      category: "🔢 Volumen y Carga Monticular",
      metric: "Jonrones Permitidos (HR)",
      v1Str: `${p1.homeRuns}`,
      v2Str: `${p2.homeRuns}`,
      isP1Win: p1.homeRuns < p2.homeRuns,
      isP2Win: p2.homeRuns < p1.homeRuns,
    },
  ];

  let p1Wins = 0;
  let p2Wins = 0;
  let ties = 0;

  const h2hRows: H2HRow[] = [];
  let currentCat = "";

  h2hConfig.forEach((item) => {
    if (item.category !== currentCat) {
      currentCat = item.category;
      h2hRows.push({
        category: item.category,
        metric: item.category,
        val1: "",
        val2: "",
        winner: "",
        winnerColor: "",
        winnerScheme: "gray",
        isHeader: true,
      });
    }

    let winner = "Empate";
    let winnerColor = "#94A3B8";
    let winnerScheme: "amber" | "blue" | "gray" = "gray";

    if (item.isP1Win) {
      p1Wins += 1;
      winner = `${shortenName(p1.playerName)} (${p1.teamAbbr})`;
      winnerColor = "#FDB827";
      winnerScheme = "amber";
    } else if (item.isP2Win) {
      p2Wins += 1;
      winner = `${shortenName(p2.playerName)} (${p2.teamAbbr})`;
      winnerColor = "#38BDF8";
      winnerScheme = "blue";
    } else {
      ties += 1;
    }

    h2hRows.push({
      category: item.category,
      metric: item.metric,
      val1: item.v1Str,
      val2: item.v2Str,
      winner,
      winnerColor,
      winnerScheme,
      isHeader: false,
    });
  });

  const name1 = `${p1.playerName} (${p1.teamAbbr})`;
  const name2 = `${p2.playerName} (${p2.teamAbbr})`;

  let verdict = "";
  if (p1Wins > p2Wins) {
    verdict = `🏆 Veredicto Sabermétrico: ${name1} domina el montículo ganando ${p1Wins} de las métricas evaluadas frente a ${p2Wins} de ${name2}. Aventaja con efectividad de ${p1.era.toFixed(2)} ERA y WHIP de ${p1.whip.toFixed(2)} frente a ${name2} (${p2.era.toFixed(2)} ERA, ${p2.whip.toFixed(2)} WHIP).`;
  } else if (p2Wins > p1Wins) {
    verdict = `🏆 Veredicto Sabermétrico: ${name2} domina el montículo ganando ${p2Wins} de las métricas evaluadas frente a ${p1Wins} de ${name1}. Aventaja con efectividad de ${p2.era.toFixed(2)} ERA y WHIP de ${p2.whip.toFixed(2)} frente a ${name1} (${p1.era.toFixed(2)} ERA, ${p1.whip.toFixed(2)} WHIP).`;
  } else {
    verdict = `⚖️ Veredicto Sabermétrico: Duelo de brazos sumamente equilibrado entre ${name1} y ${name2} (${p1Wins} victorias cada uno con ${ties} empates). Ambos lanzadores exhiben solidez monticular destacada.`;
  }

  const card1: PlayerProfileCardData = {
    playerId: p1.playerId,
    name: p1.playerName,
    team: p1.teamName,
    teamAbbr: p1.teamAbbr,
    teamLogo: p1.teamLogo,
    pos: "Lanzador",
    headshot: p1.playerAvatar,
    phase: phase1Label,
    mainStats: [
      { label: "ERA", value: p1.era.toFixed(2) },
      { label: "WHIP", value: p1.whip.toFixed(2) },
      { label: "K/9", value: p1.kPer9.toFixed(2) },
      { label: "BB/9", value: p1.bbPer9.toFixed(2) },
      { label: "SO", value: `${p1.strikeouts}` },
      { label: "IP", value: p1.inningsPitched.toFixed(1) },
    ],
  };

  const card2: PlayerProfileCardData = {
    playerId: p2.playerId,
    name: p2.playerName,
    team: p2.teamName,
    teamAbbr: p2.teamAbbr,
    teamLogo: p2.teamLogo,
    pos: "Lanzador",
    headshot: p2.playerAvatar,
    phase: phase2Label,
    mainStats: [
      { label: "ERA", value: p2.era.toFixed(2) },
      { label: "WHIP", value: p2.whip.toFixed(2) },
      { label: "K/9", value: p2.kPer9.toFixed(2) },
      { label: "BB/9", value: p2.bbPer9.toFixed(2) },
      { label: "SO", value: `${p2.strikeouts}` },
      { label: "IP", value: p2.inningsPitched.toFixed(1) },
    ],
  };

  return {
    compareType: "Lanzadores",
    player1: card1,
    player2: card2,
    radarAxes,
    h2hRows,
    verdict,
    p1Wins,
    p2Wins,
    ties,
  };
}
