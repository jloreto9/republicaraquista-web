import {
  GameCenterScorecard,
  TeamScorecard,
  ScorecardBatterRow,
  ScorecardCell,
  ScorecardDiamond,
  ScorecardInningSummary,
} from "@/types/scorecard";
import { GameCenterTeam } from "@/types/game-center";

/**
 * Deduce la abreviatura de béisbol canónica para la celda de la hoja de anotación
 * a partir del evento oficial y la descripción en texto de la jugada.
 */
function deduceScorecardEventCode(play: any): string {
  const res = play.result || {};
  const rawEvent = res.event || "";
  const desc = (res.description || "").toLowerCase();

  switch (rawEvent) {
    case "Home Run":
      return "HR";
    case "Triple":
      return "3B";
    case "Double":
      return "2B";
    case "Single":
      return "1B";
    case "Walk":
      return "BB";
    case "Intent Walk":
      return "IBB";
    case "Hit By Pitch":
      return "HBP";
    case "Strikeout": {
      // Diferenciar ponche cantado (ꓘ) de ponche tirándole (K)
      const playEvents = play.playEvents || [];
      const pitches = playEvents.filter((e: any) => e.isPitch);
      const lastPitch = pitches[pitches.length - 1];
      const callCode = lastPitch?.details?.call?.code;
      const callDesc = (lastPitch?.details?.description || "").toLowerCase();

      if (callCode === "C" || callDesc.includes("called strike")) {
        return "ꓘ";
      }
      return "K";
    }
    case "Sac Fly": {
      if (desc.includes("right field")) return "SF9";
      if (desc.includes("center field")) return "SF8";
      if (desc.includes("left field")) return "SF7";
      return "SF";
    }
    case "Sac Bunt": {
      if (desc.includes("pitcher to first")) return "SH 1-3";
      if (desc.includes("third baseman to first")) return "SH 5-3";
      if (desc.includes("catcher to first")) return "SH 2-3";
      return "SH";
    }
    case "Field Error": {
      if (desc.includes("shortstop")) return "E6";
      if (desc.includes("second baseman")) return "E4";
      if (desc.includes("third baseman")) return "E5";
      if (desc.includes("first baseman")) return "E3";
      if (desc.includes("pitcher")) return "E1";
      if (desc.includes("catcher")) return "E2";
      if (desc.includes("center field")) return "E8";
      if (desc.includes("left field")) return "E7";
      if (desc.includes("right field")) return "E9";
      return "E";
    }
    case "Grounded Into DP":
    case "Double Play": {
      if (desc.includes("shortstop to second baseman to first")) return "DP 6-4-3";
      if (desc.includes("second baseman to shortstop to first")) return "DP 4-6-3";
      if (desc.includes("third baseman to second baseman to first")) return "DP 5-4-3";
      if (desc.includes("first baseman to shortstop to first")) return "DP 3-6-3";
      if (desc.includes("pitcher to second baseman to first")) return "DP 1-4-3";
      if (desc.includes("pitcher to shortstop to first")) return "DP 1-6-3";
      return "DP";
    }
    case "Triple Play":
      return "TP";
    case "Groundout": {
      if (desc.includes("shortstop to first")) return "6-3";
      if (desc.includes("second baseman to first")) return "4-3";
      if (desc.includes("third baseman to first")) return "5-3";
      if (desc.includes("pitcher to first")) return "1-3";
      if (desc.includes("first baseman to pitcher")) return "3-1";
      if (desc.includes("to first baseman")) return "3U";
      if (desc.includes("catcher to first")) return "2-3";
      return "GO";
    }
    case "Flyout": {
      if (desc.includes("center field")) return "F8";
      if (desc.includes("left field")) return "F7";
      if (desc.includes("right field")) return "F9";
      return "FO";
    }
    case "Lineout": {
      if (desc.includes("shortstop")) return "L6";
      if (desc.includes("second baseman")) return "L4";
      if (desc.includes("third baseman")) return "L5";
      if (desc.includes("first baseman")) return "L3";
      if (desc.includes("center field")) return "L8";
      if (desc.includes("left field")) return "L7";
      if (desc.includes("right field")) return "L9";
      if (desc.includes("pitcher")) return "L1";
      return "LO";
    }
    case "Pop Out": {
      if (desc.includes("shortstop")) return "P6";
      if (desc.includes("second baseman")) return "P4";
      if (desc.includes("third baseman")) return "P5";
      if (desc.includes("first baseman")) return "P3";
      if (desc.includes("catcher")) return "P2";
      return "PO";
    }
    case "Forceout": {
      if (desc.includes("shortstop to second")) return "FC 6-4";
      if (desc.includes("second baseman to shortstop")) return "FC 4-6";
      if (desc.includes("third baseman to second")) return "FC 5-4";
      return "FC";
    }
    case "Fielders Choice":
    case "Fielders Choice Out":
      return "FC";
    default:
      if (res.isOut) return "OUT";
      return rawEvent.slice(0, 4).toUpperCase();
  }
}

/**
 * Inicializa el avance del rombo de bases para el bateador según el resultado inicial de su turno.
 */
function initDiamondForPlay(rawEvent: string, runners: any[], batterId: number): ScorecardDiamond {
  const diamond: ScorecardDiamond = {
    reach1B: false,
    reach2B: false,
    reach3B: false,
    scored: false,
    outAt: null,
  };

  if (rawEvent === "Home Run") {
    diamond.reach1B = true;
    diamond.reach2B = true;
    diamond.reach3B = true;
    diamond.scored = true;
    return diamond;
  }

  if (rawEvent === "Triple") {
    diamond.reach1B = true;
    diamond.reach2B = true;
    diamond.reach3B = true;
    return diamond;
  }

  if (rawEvent === "Double") {
    diamond.reach1B = true;
    diamond.reach2B = true;
    return diamond;
  }

  const reachedFirstEvents = [
    "Single",
    "Walk",
    "Intent Walk",
    "Hit By Pitch",
    "Field Error",
    "Fielders Choice",
    "Fielders Choice Out",
    "Forceout",
  ];

  if (reachedFirstEvents.includes(rawEvent)) {
    diamond.reach1B = true;
  }

  // Comprobar movimientos del bateador en la jugada en sí
  const batterRunner = runners.find(
    (r: any) =>
      Number(r?.details?.runner?.id) === batterId ||
      r?.movement?.originBase === null ||
      r?.movement?.originBase === undefined
  );

  if (batterRunner) {
    const end = batterRunner.movement?.end;
    if (end === "score") {
      diamond.reach1B = true;
      diamond.reach2B = true;
      diamond.reach3B = true;
      diamond.scored = true;
    } else if (end === "3B") {
      diamond.reach1B = true;
      diamond.reach2B = true;
      diamond.reach3B = true;
    } else if (end === "2B") {
      diamond.reach1B = true;
      diamond.reach2B = true;
    } else if (end === "1B") {
      diamond.reach1B = true;
    }

    if (batterRunner.movement?.isOut) {
      const outBase = batterRunner.movement?.outBase || end;
      if (outBase === "2B") diamond.outAt = "2B";
      else if (outBase === "3B") diamond.outAt = "3B";
      else if (outBase === "score" || outBase === "HP") diamond.outAt = "HP";
      else diamond.outAt = "1B";
    }
  }

  return diamond;
}

/**
 * Ensambla la estructura de filas de bateadores a partir del boxscore oficial.
 */
function buildBatterRows(boxTeam: any): ScorecardBatterRow[] {
  const rawBatters: number[] = boxTeam?.batters || [];
  const playersMap = boxTeam?.players || {};

  // Filtrar lanzadores puros
  const filteredBatterIds = rawBatters.filter((pId) => {
    const p = playersMap[`ID${pId}`];
    if (!p) return false;
    const pos = p.position?.abbreviation;
    const isPitcher =
      pos === "P" || p.position?.type === "Pitcher" || p.position?.code === "1";

    if (!isPitcher) return true;

    const allPos = (p.allPositions || []).map((x: any) => x.abbreviation);
    const hasOffensiveAction =
      allPos.includes("PR") ||
      allPos.includes("PH") ||
      allPos.includes("DH") ||
      Boolean(p.battingOrder) ||
      Number(p.stats?.batting?.plateAppearances ?? 0) > 0 ||
      Number(p.stats?.batting?.runs ?? 0) > 0;

    return hasOffensiveAction;
  });

  // Ordenar por battingOrder (100, 101, 200, 201...)
  filteredBatterIds.sort((a, b) => {
    const pA = playersMap[`ID${a}`] || {};
    const pB = playersMap[`ID${b}`] || {};
    const boA = pA.battingOrder ? parseInt(pA.battingOrder, 10) : 9999;
    const boB = pB.battingOrder ? parseInt(pB.battingOrder, 10) : 9999;
    return boA - boB;
  });

  let currentSlot = 1;
  return filteredBatterIds.map((pId) => {
    const p = playersMap[`ID${pId}`] || {};
    const stats = p.stats?.batting || {};
    const season = p.seasonStats?.batting || {};
    const allPos = (p.allPositions || []).map((x: any) => x.abbreviation);

    const bo = p.battingOrder ? parseInt(p.battingOrder, 10) : null;
    const slot = bo ? Math.floor(bo / 100) : currentSlot;
    const isSubstitute = bo ? bo % 100 > 0 : false;
    if (!isSubstitute && bo) {
      currentSlot = slot;
    }

    let posDisplay = p.position?.abbreviation || "OF";
    if (posDisplay === "P" && allPos.includes("PR")) {
      posDisplay = "PR";
    } else if (allPos.includes("PR") && Number(stats.atBats ?? 0) === 0) {
      posDisplay = "PR";
    }

    return {
      id: pId,
      name: p.person?.fullName || "Pelotero",
      jersey: p.jerseyNumber || "-",
      position: posDisplay,
      slot,
      order: bo || slot * 100,
      isSubstitute,
      note: stats.note || "",
      todaySummary: stats.summary || `${stats.hits || 0}-${stats.atBats || 0}`,
      ab: Number(stats.atBats ?? 0),
      r: Number(stats.runs ?? 0),
      h: Number(stats.hits ?? 0),
      doubles: Number(stats.doubles ?? 0),
      triples: Number(stats.triples ?? 0),
      hr: Number(stats.homeRuns ?? 0),
      rbi: Number(stats.rbi ?? 0),
      bb: Number(stats.baseOnBalls ?? 0),
      so: Number(stats.strikeOuts ?? 0),
      avg: season.avg || ".000",
      ops: season.ops,
      innings: {},
    };
  });
}

/**
 * Construye la hoja de anotación (Scorecard) completa para ambos equipos
 * a partir de las jugadas reales (allPlays) y el boxscore oficial.
 */
export function buildGameScorecard(
  allRawPlays: any[],
  boxscore: any,
  homeTeam: GameCenterTeam,
  awayTeam: GameCenterTeam,
  maxInnings: number
): GameCenterScorecard {
  const awayBatters = buildBatterRows(boxscore?.teams?.away);
  const homeBatters = buildBatterRows(boxscore?.teams?.home);

  // Mapeos rápidos para encontrar la fila del bateador
  const awayBatterMap = new Map<number, ScorecardBatterRow>();
  awayBatters.forEach((b) => awayBatterMap.set(b.id, b));

  const homeBatterMap = new Map<number, ScorecardBatterRow>();
  homeBatters.forEach((b) => homeBatterMap.set(b.id, b));

  // Estructuras de resumen de entradas (1..maxInnings)
  const awayInningsSummary: ScorecardInningSummary[] = [];
  const homeInningsSummary: ScorecardInningSummary[] = [];

  for (let i = 1; i <= maxInnings; i++) {
    awayInningsSummary.push({ inning: i, runs: 0, hits: 0, errors: 0, lob: 0 });
    homeInningsSummary.push({ inning: i, runs: 0, hits: 0, errors: 0, lob: 0 });
  }

  // Registro de celdas por entrada para seguimiento de avance posterior de corredores
  // Map: half-inning key ("away-1", "home-1") -> Map<runnerId, ScorecardCell>
  const activeRunnersByInning = new Map<string, Map<number, ScorecardCell>>();

  // Recorrer cronológicamente todas las jugadas del encuentro
  for (const play of allRawPlays) {
    const isTopInning = Boolean(play.about?.isTopInning);
    const inning = Number(play.about?.inning ?? 1);
    if (inning < 1 || inning > maxInnings) continue;

    const res = play.result || {};
    const rawEvent = res.event || "";
    const batterId = Number(play.matchup?.batter?.id);
    const batterName = play.matchup?.batter?.fullName || "Bateador";
    const pitcherName = play.matchup?.pitcher?.fullName || undefined;
    const desc = res.description || "Turno al bate registrado.";
    const rbi = Number(res.rbi ?? 0);
    const isOut = Boolean(res.isOut);
    const isHit = ["Single", "Double", "Triple", "Home Run"].includes(rawEvent);
    const isScoring = Boolean(rbi > 0 || desc.toLowerCase().includes("scores"));

    const isAwayBatting = isTopInning;
    const currentBatters = isAwayBatting ? awayBatters : homeBatters;
    const currentBatterMap = isAwayBatting ? awayBatterMap : homeBatterMap;
    const currentSummary = isAwayBatting
      ? awayInningsSummary[inning - 1]
      : homeInningsSummary[inning - 1];

    const halfKey = `${isAwayBatting ? "away" : "home"}-${inning}`;
    if (!activeRunnersByInning.has(halfKey)) {
      activeRunnersByInning.set(halfKey, new Map<number, ScorecardCell>());
    }
    const inningRunners = activeRunnersByInning.get(halfKey)!;

    // 1. Deducir código de evento canónico y rombo inicial
    const eventCode = deduceScorecardEventCode(play);
    const runners = play.runners || [];
    const diamond = initDiamondForPlay(rawEvent, runners, batterId);

    // Conteo y Outs
    const outsOnPlay = Number(play.count?.outs ?? 0);
    const outNumber = isOut ? (outsOnPlay > 0 ? outsOnPlay : null) : null;
    const countText =
      play.count?.balls !== undefined && play.count?.strikes !== undefined
        ? `${play.count.balls}-${play.count.strikes}`
        : undefined;

    const cell: ScorecardCell = {
      playId: `sc-play-${play.atBatIndex ?? play.about?.atBatIndex ?? Math.random()}`,
      atBatIndex: Number(play.atBatIndex ?? 0),
      inning,
      isTopInning,
      batterId,
      batterName,
      pitcherName,
      event: rawEvent,
      eventCode,
      description: desc,
      rbi,
      diamond,
      outNumber,
      countText,
      isHit,
      isOut,
      isScoringPlay: isScoring,
    };

    // 2. Asignar la celda a la fila del bateador correspondiente
    let batterRow = currentBatterMap.get(batterId);
    if (!batterRow) {
      // Fallback: Si el bateador no está en el mapa, agregarlo
      batterRow = {
        id: batterId,
        name: batterName,
        jersey: "-",
        position: "PH",
        slot: currentBatters.length > 0 ? Math.min(9, currentBatters.length + 1) : 1,
        order: (currentBatters.length + 1) * 100,
        isSubstitute: true,
        ab: 0,
        r: 0,
        h: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        bb: 0,
        so: 0,
        avg: ".000",
        innings: {},
      };
      currentBatters.push(batterRow);
      currentBatterMap.set(batterId, batterRow);
    }

    if (!batterRow.innings[inning]) {
      batterRow.innings[inning] = [];
    }
    batterRow.innings[inning].push(cell);

    // Si el bateador alcanzó base y no fue puesto out, guardarlo como corredor activo en esta entrada
    if (diamond.reach1B && !diamond.scored && !diamond.outAt) {
      inningRunners.set(batterId, cell);
    }

    // 3. Rastrear avance posterior de otros corredores en base durante esta jugada
    for (const r of runners) {
      const runnerId = Number(r?.details?.runner?.id);
      if (!runnerId) continue;

      const activeCell = inningRunners.get(runnerId);
      if (activeCell) {
        const end = r?.movement?.end;
        if (end === "score") {
          activeCell.diamond.reach2B = true;
          activeCell.diamond.reach3B = true;
          activeCell.diamond.scored = true;
          inningRunners.delete(runnerId); // Anotó, ya no está en base
        } else if (end === "3B") {
          activeCell.diamond.reach2B = true;
          activeCell.diamond.reach3B = true;
        } else if (end === "2B") {
          activeCell.diamond.reach2B = true;
        }

        if (r?.movement?.isOut) {
          const outBase = r.movement?.outBase || end;
          if (outBase === "2B") activeCell.diamond.outAt = "2B";
          else if (outBase === "3B") activeCell.diamond.outAt = "3B";
          else if (outBase === "score" || outBase === "HP") activeCell.diamond.outAt = "HP";
          else activeCell.diamond.outAt = "1B";
          inningRunners.delete(runnerId); // Puesto out
        }
      }
    }

    // 4. Actualizar contadores del resumen de la entrada
    if (currentSummary) {
      if (isHit) currentSummary.hits += 1;
      if (rawEvent === "Field Error") currentSummary.errors += 1;

      // Contar carreras que cruzaron el plato en esta jugada
      for (const r of runners) {
        if (r?.movement?.end === "score") {
          currentSummary.runs += 1;
        }
      }
    }
  }

  // Calcular LOB (Dejados en Base) por entrada a partir de corredores que quedaron activos
  activeRunnersByInning.forEach((runnersMap, halfKey) => {
    const [teamKey, inningStr] = halfKey.split("-");
    const inningIdx = parseInt(inningStr, 10) - 1;
    const summaries = teamKey === "away" ? awayInningsSummary : homeInningsSummary;
    if (summaries[inningIdx]) {
      summaries[inningIdx].lob = runnersMap.size;
    }
  });

  return {
    maxInnings,
    away: {
      teamId: awayTeam.id,
      teamName: awayTeam.name,
      abbreviation: awayTeam.abbreviation,
      logoUrl: awayTeam.logoUrl,
      isHome: false,
      isLeones: awayTeam.isLeones,
      batters: awayBatters,
      inningsSummary: awayInningsSummary,
      totals: {
        runs: awayTeam.score,
        hits: awayTeam.hits,
        errors: awayTeam.errors,
        lob: awayTeam.lob,
      },
    },
    home: {
      teamId: homeTeam.id,
      teamName: homeTeam.name,
      abbreviation: homeTeam.abbreviation,
      logoUrl: homeTeam.logoUrl,
      isHome: true,
      isLeones: homeTeam.isLeones,
      batters: homeBatters,
      inningsSummary: homeInningsSummary,
      totals: {
        runs: homeTeam.score,
        hits: homeTeam.hits,
        errors: homeTeam.errors,
        lob: homeTeam.lob,
      },
    },
  };
}
