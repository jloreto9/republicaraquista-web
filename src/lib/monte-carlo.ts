import { TeamStanding } from "@/types/sports";
import { LVBP_TEAMS, LVBP_TEAM_IDS } from "@/lib/constants";

export interface TeamProjection {
  teamId: number;
  teamName: string;
  teamAbbr: string;
  logoUrl: string;
  elo: number;
  top4Prob: number;   // 0.0 - 1.0
  wcProb: number;     // 0.0 - 1.0
  rrProb: number;     // 0.0 - 1.0
  finalProb: number;  // 0.0 - 1.0
  champProb: number;  // 0.0 - 1.0
  positionProbs: number[]; // Posición 1° a 8° (0.0 - 1.0)
}

export interface MonteCarloResults {
  projections: TeamProjection[];
  caracasProjection: TeamProjection | null;
}

const BASE_ELO = 1500;
const HOME_ADVANTAGE = 35;

function expectedScore(rHome: number, rAway: number): number {
  return 1.0 / (1.0 + Math.pow(10, (rAway - (rHome + HOME_ADVANTAGE)) / 400.0));
}

function simulateGame(eloHome: number, eloAway: number): boolean {
  const pHome = expectedScore(eloHome, eloAway);
  return Math.random() < pHome;
}

function simulateWildCardSeries(
  team5: number,
  team6: number,
  eloMap: Map<number, number>
): number {
  const elo5 = eloMap.get(team5) ?? BASE_ELO;
  const elo6 = eloMap.get(team6) ?? BASE_ELO;

  // Juego 1: en casa del 5to
  if (simulateGame(elo5, elo6)) {
    return team5; // El 5to clasifica ganando 1 juego
  }

  // Juego 2: si el 6to ganó el primero
  if (simulateGame(elo5, elo6)) {
    return team5;
  }
  return team6;
}

function simulateRoundRobin(
  qualifiers: number[],
  eloMap: Map<number, number>
): [number, number] {
  const rrWins = new Map<number, number>();
  for (const q of qualifiers) rrWins.set(q, 0);

  for (let i = 0; i < qualifiers.length; i++) {
    for (let j = i + 1; j < qualifiers.length; j++) {
      const t1 = qualifiers[i];
      const t2 = qualifiers[j];
      const elo1 = eloMap.get(t1) ?? BASE_ELO;
      const elo2 = eloMap.get(t2) ?? BASE_ELO;

      // 2 juegos t1 local, t2 visitante
      for (let k = 0; k < 2; k++) {
        if (simulateGame(elo1, elo2)) {
          rrWins.set(t1, (rrWins.get(t1) ?? 0) + 1);
        } else {
          rrWins.set(t2, (rrWins.get(t2) ?? 0) + 1);
        }
      }

      // 2 juegos t2 local, t1 visitante
      for (let k = 0; k < 2; k++) {
        if (simulateGame(elo2, elo1)) {
          rrWins.set(t2, (rrWins.get(t2) ?? 0) + 1);
        } else {
          rrWins.set(t1, (rrWins.get(t1) ?? 0) + 1);
        }
      }
    }
  }

  // Ordenar por victorias con desempate ELO + aleatorio
  const sorted = [...qualifiers].sort((a, b) => {
    const wA = rrWins.get(a) ?? 0;
    const wB = rrWins.get(b) ?? 0;
    if (wB !== wA) return wB - wA;
    const eA = (eloMap.get(a) ?? BASE_ELO) + Math.random() * 0.01;
    const eB = (eloMap.get(b) ?? BASE_ELO) + Math.random() * 0.01;
    return eB - eA;
  });

  return [sorted[0], sorted[1]];
}

function simulateFinalSeries(
  team1: number,
  team2: number,
  eloMap: Map<number, number>
): number {
  const elo1 = eloMap.get(team1) ?? BASE_ELO;
  const elo2 = eloMap.get(team2) ?? BASE_ELO;

  let w1 = 0;
  let w2 = 0;
  // Formato 2-3-2
  const homePattern = [team1, team1, team2, team2, team2, team1, team1];

  for (const h of homePattern) {
    if (h === team1) {
      if (simulateGame(elo1, elo2)) w1++;
      else w2++;
    } else {
      if (simulateGame(elo2, elo1)) w2++;
      else w1++;
    }

    if (w1 === 4) return team1;
    if (w2 === 4) return team2;
  }

  return w1 > w2 ? team1 : team2;
}

export function runMonteCarloSimulation(
  standings: TeamStanding[],
  mode: "actual" | "scratch" = "actual",
  nSimulations: number = 3000
): MonteCarloResults {
  const teams = LVBP_TEAM_IDS;
  const eloMap = new Map<number, number>();
  const standingsMap = new Map<number, TeamStanding>();

  for (const s of standings) {
    eloMap.set(s.teamId, s.eloRating || BASE_ELO);
    standingsMap.set(s.teamId, s);
  }

  // Inicializar contadores
  const posCounts = new Map<number, number[]>();
  const top4Counts = new Map<number, number>();
  const wcCounts = new Map<number, number>();
  const rrCounts = new Map<number, number>();
  const finalCounts = new Map<number, number>();
  const champCounts = new Map<number, number>();

  for (const tid of teams) {
    posCounts.set(tid, new Array(8).fill(0));
    top4Counts.set(tid, 0);
    wcCounts.set(tid, 0);
    rrCounts.set(tid, 0);
    finalCounts.set(tid, 0);
    champCounts.set(tid, 0);
  }

  // Comprobar si la temporada regular ya completó 56 juegos
  const totalGames = standings.reduce((acc, s) => acc + s.gamesPlayed, 0);
  const isCompleted = totalGames >= 224;

  // Generar calendario balanceado para modo scratch
  const balancedSchedule: [number, number][] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const t1 = teams[i];
      const t2 = teams[j];
      for (let k = 0; k < 4; k++) {
        balancedSchedule.push([t1, t2]);
        balancedSchedule.push([t2, t1]);
      }
    }
  }

  for (let sim = 0; sim < nSimulations; sim++) {
    let ranked: number[];

    if (mode === "actual" && isCompleted) {
      // Orden por porcentaje de victorias de la tabla oficial
      ranked = [...standings]
        .sort((a, b) => {
          if (b.pct !== a.pct) return b.pct - a.pct;
          return b.runDifferential - a.runDifferential;
        })
        .map((s) => s.teamId);
    } else if (mode === "scratch") {
      // Simular los 224 juegos completos
      const simWins = new Map<number, number>();
      for (const t of teams) simWins.set(t, 0);

      for (const [h, a] of balancedSchedule) {
        const eloH = eloMap.get(h) ?? BASE_ELO;
        const eloA = eloMap.get(a) ?? BASE_ELO;
        if (simulateGame(eloH, eloA)) {
          simWins.set(h, (simWins.get(h) ?? 0) + 1);
        } else {
          simWins.set(a, (simWins.get(a) ?? 0) + 1);
        }
      }

      ranked = [...teams].sort((a, b) => {
        const wA = simWins.get(a) ?? 0;
        const wB = simWins.get(b) ?? 0;
        if (wB !== wA) return wB - wA;
        return (eloMap.get(b) ?? BASE_ELO) - (eloMap.get(a) ?? BASE_ELO);
      });
    } else {
      // Simular restante a partir de victorias actuales
      const simWins = new Map<number, number>();
      for (const t of teams) {
        simWins.set(t, standingsMap.get(t)?.wins ?? 0);
      }

      ranked = [...teams].sort((a, b) => {
        const wA = simWins.get(a) ?? 0;
        const wB = simWins.get(b) ?? 0;
        if (wB !== wA) return wB - wA;
        return (eloMap.get(b) ?? BASE_ELO) - (eloMap.get(a) ?? BASE_ELO);
      });
    }

    // 1. Contabilizar posiciones
    for (let r = 0; r < 8; r++) {
      const tid = ranked[r];
      if (tid) {
        const arr = posCounts.get(tid);
        if (arr) arr[r]++;

        if (r < 4) {
          top4Counts.set(tid, (top4Counts.get(tid) ?? 0) + 1);
        } else if (r < 6) {
          wcCounts.set(tid, (wcCounts.get(tid) ?? 0) + 1);
        }
      }
    }

    // 2. Serie Comodín (5° vs 6°)
    const t5 = ranked[4];
    const t6 = ranked[5];
    const wcWinner = simulateWildCardSeries(t5, t6, eloMap);

    // 3. Round Robin (Top 4 + Ganador Comodín)
    const rrQualifiers = [ranked[0], ranked[1], ranked[2], ranked[3], wcWinner];
    for (const q of rrQualifiers) {
      rrCounts.set(q, (rrCounts.get(q) ?? 0) + 1);
    }

    const [f1, f2] = simulateRoundRobin(rrQualifiers, eloMap);
    finalCounts.set(f1, (finalCounts.get(f1) ?? 0) + 1);
    finalCounts.set(f2, (finalCounts.get(f2) ?? 0) + 1);

    // 4. Gran Final
    const champ = simulateFinalSeries(f1, f2, eloMap);
    champCounts.set(champ, (champCounts.get(champ) ?? 0) + 1);
  }

  // Generar proyecciones consolidadas
  const projections: TeamProjection[] = teams.map((tid) => {
    const teamDef = LVBP_TEAMS[tid];
    const standing = standingsMap.get(tid);
    const pCounts = posCounts.get(tid) ?? new Array(8).fill(0);

    return {
      teamId: tid,
      teamName: standing?.teamName || teamDef?.name || "Equipo",
      teamAbbr: standing?.abbreviation || teamDef?.abbreviation || "LVBP",
      logoUrl: standing?.logoUrl || teamDef?.logoUrl || "",
      elo: standing?.eloRating || BASE_ELO,
      top4Prob: (top4Counts.get(tid) ?? 0) / nSimulations,
      wcProb: (wcCounts.get(tid) ?? 0) / nSimulations,
      rrProb: (rrCounts.get(tid) ?? 0) / nSimulations,
      finalProb: (finalCounts.get(tid) ?? 0) / nSimulations,
      champProb: (champCounts.get(tid) ?? 0) / nSimulations,
      positionProbs: pCounts.map((c) => c / nSimulations),
    };
  });

  // Ordenar por probabilidad de campeonato descendente
  projections.sort((a, b) => b.champProb - a.champProb);

  const caracasProjection = projections.find((p) => p.teamId === 695) ?? null;

  return {
    projections,
    caracasProjection,
  };
}
