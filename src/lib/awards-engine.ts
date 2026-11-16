import { BattingStats, PitchingStats } from "@/types/sports";

export interface AwardPillarBreakdown {
  label: string;
  score: number;
  maxScore: number;
}

export interface LeagueBattingEnvironment {
  lgWoba: number;
  lgRunsPerPa: number;
  wobaScale: number;
  totalPa: number;
}

export interface LeaguePitchingEnvironment {
  lgEra: number;
  cFip: number;
  totalIp: number;
}

export interface MvpCandidate {
  overallRank: number;
  player: BattingStats;
  totalScore: number; // 0 - 100 (1 decimal)
  advancedScore: number; // / 45
  traditionalScore: number; // / 40
  teamScore: number; // / 15
  pillars: [AwardPillarBreakdown, AwardPillarBreakdown, AwardPillarBreakdown];
  woba: number;
  wraa: number;
  wrcPlus: number;
  totalBases: number;
  netSb: number;
  pa: number;
  minPaRequired: number;
  teamWinPct: number;
  leaderBadges: string[];
}

export interface PitcherOfYearCandidate {
  overallRank: number;
  player: PitchingStats;
  totalScore: number; // 0 - 100 (1 decimal)
  preventionScore: number; // / 45
  volumeScore: number; // / 35
  decisionTeamScore: number; // / 20
  pillars: [AwardPillarBreakdown, AwardPillarBreakdown, AwardPillarBreakdown];
  fip: number;
  eraMinus: number;
  wins: number;
  losses: number;
  saves: number;
  gamesStarted: number;
  minIpRequired: number;
  teamWinPct: number;
  leaderBadges: string[];
}

export interface AwardsRaceOptions {
  teamGamesMap?: Record<number, number>;
  teamWinPctMap?: Record<number, number>;
  maxGames?: number;
}

export interface MvpRaceResult {
  candidates: MvpCandidate[];
  environment: LeagueBattingEnvironment;
  activeMultiplier: number;
  minPaReference: number;
  usedFallback: boolean;
}

export interface PitcherRaceResult {
  candidates: PitcherOfYearCandidate[];
  environment: LeaguePitchingEnvironment;
  activeMultiplier: number;
  minIpReference: number;
  usedFallback: boolean;
}

const WOBA_WEIGHTS = {
  bb: 0.69,
  hbp: 0.72,
  single: 0.888,
  double: 1.271,
  triple: 1.616,
  hr: 2.101,
  scale: 1.15,
};

const MVP_CANONICAL_MULTIPLIER = 3.1;
const MVP_FALLBACK_MULTIPLIERS = [2.2, 1.5, 0.5];

const PITCHER_WINTER_MULTIPLIER = 0.8;
const PITCHER_FALLBACK_MULTIPLIERS = [0.6, 0.4, 0.1];

function roundTo(val: number, decimals = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function normalizeMetric(
  val: number,
  min: number,
  max: number,
  higherBetter = true
): number {
  if (!Number.isFinite(val) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return 0.5;
  }
  if (Math.abs(max - min) < 1e-9) {
    return 0.5;
  }
  const ratio = clamp((val - min) / (max - min), 0, 1);
  return higherBetter ? ratio : 1 - ratio;
}

export function getBatterPlateAppearances(b: BattingStats): number {
  if (typeof b.plateAppearances === "number" && b.plateAppearances > 0) {
    return b.plateAppearances;
  }
  if (typeof b.pa === "number" && b.pa > 0) {
    return b.pa;
  }
  return (
    Number(b.atBats || 0) +
    Number(b.walks || 0) +
    Number(b.hbp || 0) +
    Number(b.sf || 0) +
    Number(b.sh || 0)
  );
}

function getBatterWobaParts(b: BattingStats): { num: number; den: number; totalBases: number } {
  const hits = Number(b.hits || 0);
  const doubles = Number(b.doubles || 0);
  const triples = Number(b.triples || 0);
  const hr = Number(b.homeRuns || 0);
  const singles = Math.max(0, hits - doubles - triples - hr);
  const bb = Number(b.walks || 0);
  const hbp = Number(b.hbp || 0);
  const sf = Number(b.sf || 0);
  const ab = Number(b.atBats || 0);

  const num =
    WOBA_WEIGHTS.bb * bb +
    WOBA_WEIGHTS.hbp * hbp +
    WOBA_WEIGHTS.single * singles +
    WOBA_WEIGHTS.double * doubles +
    WOBA_WEIGHTS.triple * triples +
    WOBA_WEIGHTS.hr * hr;
  const den = ab + bb + hbp + sf;
  const totalBases = singles + 2 * doubles + 3 * triples + 4 * hr;

  return { num, den, totalBases };
}

/**
 * Calcula las constantes ofensivas reales del entorno de la liga (lgwOBA y R/PA).
 */
export function computeLeagueBattingEnvironment(
  batters: BattingStats[]
): LeagueBattingEnvironment {
  let totalWobaNum = 0;
  let totalWobaDen = 0;
  let totalRuns = 0;
  let totalPa = 0;

  for (const b of batters) {
    const { num, den } = getBatterWobaParts(b);
    totalWobaNum += num;
    totalWobaDen += den;
    totalRuns += Number(b.runs || 0);
    totalPa += getBatterPlateAppearances(b);
  }

  const lgWoba = totalWobaDen > 0 ? totalWobaNum / totalWobaDen : 0.33;
  const lgRunsPerPa = totalPa > 0 ? totalRuns / totalPa : 0.125;

  return {
    lgWoba: roundTo(lgWoba, 3),
    lgRunsPerPa: roundTo(lgRunsPerPa, 4),
    wobaScale: WOBA_WEIGHTS.scale,
    totalPa,
  };
}

/**
 * Calcula las constantes reales de pitcheo de la liga (ERA promedio y constante cFIP).
 */
export function computeLeaguePitchingEnvironment(
  pitchers: PitchingStats[]
): LeaguePitchingEnvironment {
  let totalIp = 0;
  let totalEr = 0;
  let totalHr = 0;
  let totalBb = 0;
  let totalHbp = 0;
  let totalSo = 0;

  for (const p of pitchers) {
    totalIp += Number(p.inningsPitched || 0);
    totalEr += Number(p.earnedRuns || 0);
    totalHr += Number(p.homeRuns || 0);
    totalBb += Number(p.walks || 0);
    totalHbp += Number(p.hbp || 0);
    totalSo += Number(p.strikeouts || 0);
  }

  const lgEra = totalIp > 0 ? (totalEr * 9) / totalIp : 4.5;
  const fipCore =
    totalIp > 0 ? (13 * totalHr + 3 * (totalBb + totalHbp) - 2 * totalSo) / totalIp : 0.7;
  const cFip = totalIp > 0 ? lgEra - fipCore : 3.8;

  return {
    lgEra: roundTo(lgEra, 2),
    cFip: roundTo(cFip, 2),
    totalIp: roundTo(totalIp, 1),
  };
}

function getTeamGames(
  teamId: number,
  teamGamesMap?: Record<number, number>,
  maxGames = 0
): number {
  const fromMap = teamGamesMap?.[teamId];
  if (typeof fromMap === "number" && fromMap > 0) return fromMap;
  if (maxGames > 0) return maxGames;
  return 0;
}

/**
 * Calcula la carrera al Jugador Más Valioso (Premio "Víctor Davalillo")
 * evaluando siempre a toda la LVBP bajo el modelo híbrido (45% Avanzado + 40% Tradicional + 15% Equipo).
 */
export function calculateMvpRace(
  batters: BattingStats[],
  options: AwardsRaceOptions = {}
): MvpRaceResult {
  const { teamGamesMap = {}, teamWinPctMap = {}, maxGames = 0 } = options;
  const environment = computeLeagueBattingEnvironment(batters);

  if (!batters || batters.length === 0) {
    return {
      candidates: [],
      environment,
      activeMultiplier: MVP_CANONICAL_MULTIPLIER,
      minPaReference: Math.round(maxGames * MVP_CANONICAL_MULTIPLIER),
      usedFallback: false,
    };
  }

  const enriched = batters
    .map((player) => {
      const pa = getBatterPlateAppearances(player);
      const { num, den, totalBases } = getBatterWobaParts(player);
      const wobaRaw = den > 0 ? num / den : 0;
      const woba = roundTo(wobaRaw, 3);
      const wraaRaw = ((wobaRaw - environment.lgWoba) / environment.wobaScale) * pa;
      const wraa = roundTo(wraaRaw, 1);
      const wrcPlus =
        environment.lgRunsPerPa > 0
          ? clamp(
              Math.round(
                (((wobaRaw - environment.lgWoba) / environment.wobaScale +
                  environment.lgRunsPerPa) /
                  environment.lgRunsPerPa) *
                  100
              ),
              20,
              280
            )
          : 100;
      const netSb = Number(player.stolenBases || 0) - Number(player.caughtStealing || 0);
      const tGames = getTeamGames(player.teamId, teamGamesMap, maxGames);
      const teamWinPct = teamWinPctMap[player.teamId] ?? 0.5;

      return {
        player,
        pa,
        woba,
        wraa,
        wrcPlus,
        totalBases,
        netSb,
        tGames,
        teamWinPct,
      };
    })
    .filter((entry) => entry.pa > 0);

  if (enriched.length === 0) {
    return {
      candidates: [],
      environment,
      activeMultiplier: MVP_CANONICAL_MULTIPLIER,
      minPaReference: Math.round(maxGames * MVP_CANONICAL_MULTIPLIER),
      usedFallback: false,
    };
  }

  const filterByMultiplier = (mult: number) =>
    enriched.filter((e) => {
      const req = e.tGames > 0 ? Math.max(1, Math.round(e.tGames * mult)) : 1;
      return e.pa >= req;
    });

  let activeMultiplier = MVP_CANONICAL_MULTIPLIER;
  let eligible = filterByMultiplier(MVP_CANONICAL_MULTIPLIER);
  let usedFallback = false;

  if (eligible.length < 5 && enriched.length > eligible.length) {
    for (const fallbackMult of MVP_FALLBACK_MULTIPLIERS) {
      const attempt = filterByMultiplier(fallbackMult);
      if (attempt.length >= 5 || attempt.length === enriched.length) {
        eligible = attempt;
        activeMultiplier = fallbackMult;
        usedFallback = true;
        break;
      }
      if (attempt.length > eligible.length) {
        eligible = attempt;
        activeMultiplier = fallbackMult;
        usedFallback = true;
      }
    }
  }

  const getMinMax = (vals: number[]): [number, number] => [
    Math.min(...vals),
    Math.max(...vals),
  ];

  const [minWraa, maxWraa] = getMinMax(eligible.map((e) => e.wraa));
  const [minWrc, maxWrc] = getMinMax(eligible.map((e) => e.wrcPlus));
  const [minWoba, maxWoba] = getMinMax(eligible.map((e) => e.woba));

  const [minOps, maxOps] = getMinMax(eligible.map((e) => e.player.ops));
  const [minAvg, maxAvg] = getMinMax(eligible.map((e) => e.player.avg));
  const [minHr, maxHr] = getMinMax(eligible.map((e) => e.player.homeRuns));
  const [minRbi, maxRbi] = getMinMax(eligible.map((e) => e.player.rbi));
  const [minRuns, maxRuns] = getMinMax(eligible.map((e) => e.player.runs));
  const [minNetSb, maxNetSb] = getMinMax(eligible.map((e) => e.netSb));
  const [minTeamPct, maxTeamPct] = getMinMax(eligible.map((e) => e.teamWinPct));

  const maxHits = Math.max(...eligible.map((e) => e.player.hits));
  const maxSb = Math.max(...eligible.map((e) => e.player.stolenBases));

  const scored = eligible.map((e) => {
    const advancedScore = roundTo(
      25 * normalizeMetric(e.wraa, minWraa, maxWraa, true) +
        12 * normalizeMetric(e.wrcPlus, minWrc, maxWrc, true) +
        8 * normalizeMetric(e.woba, minWoba, maxWoba, true),
      1
    );

    const traditionalScore = roundTo(
      10 * normalizeMetric(e.player.ops, minOps, maxOps, true) +
        8 * normalizeMetric(e.player.avg, minAvg, maxAvg, true) +
        8 * normalizeMetric(e.player.homeRuns, minHr, maxHr, true) +
        8 * normalizeMetric(e.player.rbi, minRbi, maxRbi, true) +
        4 * normalizeMetric(e.player.runs, minRuns, maxRuns, true) +
        2 * normalizeMetric(e.netSb, minNetSb, maxNetSb, true),
      1
    );

    const teamScore = roundTo(
      15 * normalizeMetric(e.teamWinPct, minTeamPct, maxTeamPct, true),
      1
    );

    const totalScore = roundTo(advancedScore + traditionalScore + teamScore, 1);

    const leaderBadges: string[] = [];
    if (maxAvg > 0 && Math.abs(e.player.avg - maxAvg) < 1e-6) leaderBadges.push("Líder AVG");
    if (maxHr > 0 && e.player.homeRuns === maxHr) leaderBadges.push("Líder HR");
    if (maxRbi > 0 && e.player.rbi === maxRbi) leaderBadges.push("Líder CI");
    if (maxOps > 0 && Math.abs(e.player.ops - maxOps) < 1e-6) leaderBadges.push("Líder OPS");
    if (maxWrc > 0 && e.wrcPlus === maxWrc) leaderBadges.push("Líder wRC+");
    if (maxHits > 0 && e.player.hits === maxHits) leaderBadges.push("Líder H");
    if (maxRuns > 0 && e.player.runs === maxRuns) leaderBadges.push("Líder CA");
    if (maxSb > 0 && e.player.stolenBases === maxSb) leaderBadges.push("Líder BR");

    const minPaRequired = e.tGames > 0 ? Math.max(1, Math.round(e.tGames * activeMultiplier)) : 1;

    return {
      overallRank: 0,
      player: e.player,
      totalScore,
      advancedScore,
      traditionalScore,
      teamScore,
      pillars: [
        { label: "Impacto Ofensivo", score: advancedScore, maxScore: 45 },
        { label: "Producción / Triple Corona", score: traditionalScore, maxScore: 40 },
        { label: "Éxito Colectivo", score: teamScore, maxScore: 15 },
      ] as [AwardPillarBreakdown, AwardPillarBreakdown, AwardPillarBreakdown],
      woba: e.woba,
      wraa: e.wraa,
      wrcPlus: e.wrcPlus,
      totalBases: e.totalBases,
      netSb: e.netSb,
      pa: e.pa,
      minPaRequired,
      teamWinPct: e.teamWinPct,
      leaderBadges,
    };
  });

  scored.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      b.wraa - a.wraa ||
      b.player.ops - a.player.ops ||
      b.player.hits - a.player.hits
  );

  scored.forEach((candidate, idx) => {
    candidate.overallRank = idx + 1;
  });

  return {
    candidates: scored,
    environment,
    activeMultiplier,
    minPaReference: Math.max(1, Math.round(maxGames * activeMultiplier)),
    usedFallback,
  };
}

/**
 * Calcula la carrera al Pitcher del Año (Premio "Carrao Bracho")
 * evaluando siempre a toda la LVBP bajo elegibilidad invernal (0.8 IP/J) y ponderación híbrida (45/35/20).
 */
export function calculatePitcherOfYearRace(
  pitchers: PitchingStats[],
  options: AwardsRaceOptions = {}
): PitcherRaceResult {
  const { teamGamesMap = {}, teamWinPctMap = {}, maxGames = 0 } = options;
  const environment = computeLeaguePitchingEnvironment(pitchers);

  if (!pitchers || pitchers.length === 0) {
    return {
      candidates: [],
      environment,
      activeMultiplier: PITCHER_WINTER_MULTIPLIER,
      minIpReference: roundTo(maxGames * PITCHER_WINTER_MULTIPLIER, 1),
      usedFallback: false,
    };
  }

  const enriched = pitchers
    .map((player) => {
      const ip = Number(player.inningsPitched || 0);
      const hbp = Number(player.hbp || 0);
      const fipRaw =
        ip > 0
          ? Math.max(
              0.5,
              (13 * Number(player.homeRuns || 0) +
                3 * (Number(player.walks || 0) + hbp) -
                2 * Number(player.strikeouts || 0)) /
                ip +
                environment.cFip
            )
          : player.era;
      const fip = roundTo(fipRaw, 2);
      const eraMinus =
        environment.lgEra > 0
          ? clamp(Math.round((player.era / environment.lgEra) * 100), 15, 250)
          : 100;
      const wins = Number(player.wins || 0);
      const losses = Number(player.losses || 0);
      const saves = Number(player.saves || 0);
      const gamesStarted = Number(player.gamesStarted || 0);
      const tGames = getTeamGames(player.teamId, teamGamesMap, maxGames);
      const teamWinPct = teamWinPctMap[player.teamId] ?? 0.5;

      return {
        player,
        ip,
        fip,
        eraMinus,
        wins,
        losses,
        saves,
        gamesStarted,
        decisionNet: wins - losses,
        tGames,
        teamWinPct,
      };
    })
    .filter((entry) => entry.ip > 0);

  if (enriched.length === 0) {
    return {
      candidates: [],
      environment,
      activeMultiplier: PITCHER_WINTER_MULTIPLIER,
      minIpReference: roundTo(maxGames * PITCHER_WINTER_MULTIPLIER, 1),
      usedFallback: false,
    };
  }

  const filterByMultiplier = (mult: number) =>
    enriched.filter((e) => {
      const reqIp = e.tGames > 0 ? roundTo(e.tGames * mult, 1) : 1.0;
      return e.ip >= Math.max(0.1, reqIp - 0.05);
    });

  let activeMultiplier = PITCHER_WINTER_MULTIPLIER;
  let eligible = filterByMultiplier(PITCHER_WINTER_MULTIPLIER);
  let usedFallback = false;

  if (eligible.length < 5 && enriched.length > eligible.length) {
    for (const fallbackMult of PITCHER_FALLBACK_MULTIPLIERS) {
      const attempt = filterByMultiplier(fallbackMult);
      if (attempt.length >= 5 || attempt.length === enriched.length) {
        eligible = attempt;
        activeMultiplier = fallbackMult;
        usedFallback = true;
        break;
      }
      if (attempt.length > eligible.length) {
        eligible = attempt;
        activeMultiplier = fallbackMult;
        usedFallback = true;
      }
    }
  }

  const getMinMax = (vals: number[]): [number, number] => [
    Math.min(...vals),
    Math.max(...vals),
  ];

  const [minEra, maxEra] = getMinMax(eligible.map((e) => e.player.era));
  const [minWhip, maxWhip] = getMinMax(eligible.map((e) => e.player.whip));
  const [minFip, maxFip] = getMinMax(eligible.map((e) => e.fip));

  const [minIp, maxIp] = getMinMax(eligible.map((e) => e.ip));
  const [minSo, maxSo] = getMinMax(eligible.map((e) => e.player.strikeouts));
  const [minK9, maxK9] = getMinMax(eligible.map((e) => e.player.kPer9));
  const [minKbb, maxKbb] = getMinMax(eligible.map((e) => e.player.kToBb));

  const [minWins, maxWins] = getMinMax(eligible.map((e) => e.wins));
  const [minDecNet, maxDecNet] = getMinMax(eligible.map((e) => e.decisionNet));
  const [minTeamPct, maxTeamPct] = getMinMax(eligible.map((e) => e.teamWinPct));

  const scored = eligible.map((e) => {
    const preventionScore = roundTo(
      20 * normalizeMetric(e.player.era, minEra, maxEra, false) +
        13 * normalizeMetric(e.player.whip, minWhip, maxWhip, false) +
        12 * normalizeMetric(e.fip, minFip, maxFip, false),
      1
    );

    const volumeScore = roundTo(
      15 * normalizeMetric(e.ip, minIp, maxIp, true) +
        12 * normalizeMetric(e.player.strikeouts, minSo, maxSo, true) +
        4 * normalizeMetric(e.player.kPer9, minK9, maxK9, true) +
        4 * normalizeMetric(e.player.kToBb, minKbb, maxKbb, true),
      1
    );

    const decisionTeamScore = roundTo(
      6 * normalizeMetric(e.wins, minWins, maxWins, true) +
        4 * normalizeMetric(e.decisionNet, minDecNet, maxDecNet, true) +
        10 * normalizeMetric(e.teamWinPct, minTeamPct, maxTeamPct, true),
      1
    );

    const totalScore = roundTo(preventionScore + volumeScore + decisionTeamScore, 1);

    const leaderBadges: string[] = [];
    if (Math.abs(e.player.era - minEra) < 1e-6) leaderBadges.push("Líder ERA");
    if (Math.abs(e.player.whip - minWhip) < 1e-6) leaderBadges.push("Líder WHIP");
    if (Math.abs(e.fip - minFip) < 1e-6) leaderBadges.push("Líder FIP");
    if (maxWins > 0 && e.wins === maxWins) leaderBadges.push("Líder G");
    if (maxSo > 0 && e.player.strikeouts === maxSo) leaderBadges.push("Líder SO");
    if (maxIp > 0 && Math.abs(e.ip - maxIp) < 1e-6) leaderBadges.push("Líder IP");

    const minIpRequired = e.tGames > 0 ? roundTo(e.tGames * activeMultiplier, 1) : 1.0;

    return {
      overallRank: 0,
      player: e.player,
      totalScore,
      preventionScore,
      volumeScore,
      decisionTeamScore,
      pillars: [
        { label: "Prevención y Dominio", score: preventionScore, maxScore: 45 },
        { label: "Volumen y Ponches", score: volumeScore, maxScore: 35 },
        { label: "Decisiones y Equipo", score: decisionTeamScore, maxScore: 20 },
      ] as [AwardPillarBreakdown, AwardPillarBreakdown, AwardPillarBreakdown],
      fip: e.fip,
      eraMinus: e.eraMinus,
      wins: e.wins,
      losses: e.losses,
      saves: e.saves,
      gamesStarted: e.gamesStarted,
      minIpRequired,
      teamWinPct: e.teamWinPct,
      leaderBadges,
    };
  });

  scored.sort(
    (a, b) =>
      b.totalScore - a.totalScore ||
      a.player.era - b.player.era ||
      b.player.inningsPitched - a.player.inningsPitched ||
      b.player.strikeouts - a.player.strikeouts
  );

  scored.forEach((candidate, idx) => {
    candidate.overallRank = idx + 1;
  });

  return {
    candidates: scored,
    environment,
    activeMultiplier,
    minIpReference: roundTo(maxGames * activeMultiplier, 1),
    usedFallback,
  };
}
