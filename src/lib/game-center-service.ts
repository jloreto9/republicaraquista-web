import { supabase } from "./supabase";
import { getTeam, getPlayerHeadshotUrl } from "./constants";
import {
  GameCenterData,
  GameCenterTeam,
  GameCenterLinescore,
  GameCenterCount,
  GameCenterBases,
  GameCenterPlayerMatchup,
  GameCenterPlay,
  GameCenterBoxscoreBatter,
  GameCenterBoxscorePitcher,
  GameCenterAvailableGame,
} from "@/types/game-center";

const LEONES_TEAM_ID = 695;

const EVENT_TRANSLATIONS: Record<string, string> = {
  "Single": "Sencillo",
  "Double": "Doble",
  "Triple": "Triple",
  "Home Run": "Jonrón",
  "Strikeout": "Ponche",
  "Walk": "Base por Bolas",
  "Intent Walk": "Boleto Intencional",
  "Hit By Pitch": "Pelotazo",
  "Groundout": "Rodado de Out",
  "Flyout": "Elevado de Out",
  "Lineout": "Línea de Out",
  "Pop Out": "Elevado Corto",
  "Forceout": "Out Forzado",
  "Field Error": "Error Defensivo",
  "Grounded Into DP": "Doble Play",
  "Double Play": "Doble Play",
  "Triple Play": "Triple Play",
  "Sac Fly": "Elevado de Sacrificio",
  "Sac Bunt": "Toque de Sacrificio",
  "Fielders Choice": "Fielder's Choice",
  "Fielders Choice Out": "Fielder's Choice",
  "Stolen Base": "Base Robada",
  "Caught Stealing": "Atrapado Robando",
  "Wild Pitch": "Wild Pitch",
  "Passed Ball": "Passed Ball",
  "Balk": "Balk",
  "Pickoff": "Sorprendido Fuera de Base",
  "Game Advisory": "Nota Oficial",
};

/**
 * Traduce descripciones comunes de jugadas en inglés al español venezolano/beisbolero.
 */
function translateDescriptionToSpanish(desc: string): string {
  if (!desc) return "Jugada en desarrollo.";

  let text = desc;
  text = text.replace(/homers \((\d+)\) on a fly ball to left field/gi, "conecta jonrón ($1) con elevado al jardín izquierdo");
  text = text.replace(/homers \((\d+)\) on a fly ball to right field/gi, "conecta jonrón ($1) con elevado al jardín derecho");
  text = text.replace(/homers \((\d+)\) on a fly ball to center field/gi, "conecta jonrón ($1) con elevado al jardín central");
  text = text.replace(/homers \((\d+)\)/gi, "conecta cuadrangular ($1)");
  text = text.replace(/singles on a ground ball to center field/gi, "batea sencillo con rodado al jardín central");
  text = text.replace(/singles on a ground ball to left field/gi, "batea sencillo con rodado al jardín izquierdo");
  text = text.replace(/singles on a ground ball to right field/gi, "batea sencillo con rodado al jardín derecho");
  text = text.replace(/singles on a line drive to center field/gi, "batea sencillo con línea al jardín central");
  text = text.replace(/singles on a line drive to left field/gi, "batea sencillo con línea al jardín izquierdo");
  text = text.replace(/singles on a line drive to right field/gi, "batea sencillo con línea al jardín derecho");
  text = text.replace(/singles on a fly ball to/gi, "batea sencillo con elevado hacia");
  text = text.replace(/doubles on a sharp line drive to/gi, "conecta doblete con línea sólida hacia");
  text = text.replace(/doubles on a line drive to/gi, "conecta doblete con línea hacia");
  text = text.replace(/doubles on a fly ball to/gi, "conecta doblete con elevado hacia");
  text = text.replace(/triples on a line drive to/gi, "conecta triple con línea hacia");
  text = text.replace(/triples on a fly ball to/gi, "conecta triple con elevado hacia");
  text = text.replace(/strikes out swinging/gi, "se poncha tirándole");
  text = text.replace(/strikes out looking/gi, "se poncha con el tercer strike cantado");
  text = text.replace(/walks\./gi, "recibe base por bolas.");
  text = text.replace(/intentionally walks/gi, "recibe boleto intencional");
  text = text.replace(/flies out to center field/gi, "falla con elevado al jardín central");
  text = text.replace(/flies out to left field/gi, "falla con elevado al jardín izquierdo");
  text = text.replace(/flies out to right field/gi, "falla con elevado al jardín derecho");
  text = text.replace(/lines out to center field/gi, "falla con línea al jardín central");
  text = text.replace(/lines out to left field/gi, "falla con línea al jardín izquierdo");
  text = text.replace(/lines out to right field/gi, "falla con línea al jardín derecho");
  text = text.replace(/lines out to shortstop/gi, "falla con línea al campocorto");
  text = text.replace(/lines out to second baseman/gi, "falla con línea al segunda base");
  text = text.replace(/lines out to third baseman/gi, "falla con línea al tercera base");
  text = text.replace(/lines out to first baseman/gi, "falla con línea a primera base");
  text = text.replace(/grounds out, shortstop to first baseman/gi, "falla con rodado de campo corto a primera base");
  text = text.replace(/grounds out, second baseman to first baseman/gi, "falla con rodado de segunda a primera base");
  text = text.replace(/grounds out, third baseman to first baseman/gi, "falla con rodado de tercera a primera base");
  text = text.replace(/grounds out, pitcher to first baseman/gi, "falla con rodado del lanzador a primera base");
  text = text.replace(/grounds out to first baseman/gi, "falla con rodado a primera base");
  text = text.replace(/pops out to shortstop/gi, "falla con elevado corto al campocorto");
  text = text.replace(/pops out to second baseman/gi, "falla con elevado corto a segunda base");
  text = text.replace(/pops out to catcher/gi, "falla con elevado al receptor");
  text = text.replace(/scores\./gi, "anota en carrera.");
  text = text.replace(/scores/gi, "anota");
  text = text.replace(/to third\./gi, "a tercera base.");
  text = text.replace(/to second\./gi, "a segunda base.");
  text = text.replace(/out at home/gi, "puesto out en home");
  text = text.replace(/out at third/gi, "puesto out en tercera");
  text = text.replace(/out at second/gi, "puesto out en segunda");
  text = text.replace(/out at first/gi, "puesto out en primera");

  return text;
}

/**
 * Consulta la lista de juegos recientes o en vivo de Leones del Caracas en Supabase.
 */
export async function getCaracasAvailableGames(season = 2026): Promise<GameCenterAvailableGame[]> {
  if (!supabase) return [];

  try {
    const { data: rawGames, error } = await supabase
      .from("games")
      .select("id, game_pk, game_date, season, game_type, status, home_team_id, away_team_id, home_score, away_score")
      .eq("season", season)
      .or("home_team_id.eq.695,away_team_id.eq.695")
      .order("game_date", { ascending: false })
      .limit(12);

    if (error || !rawGames) {
      console.error("Error al consultar juegos de Leones:", error);
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rawGames as any[]).map((g) => {
      const isHome = Number(g.home_team_id) === LEONES_TEAM_ID;
      const oppId = isHome ? Number(g.away_team_id) : Number(g.home_team_id);
      const oppTeam = getTeam(oppId);
      const caracasScore = isHome ? Number(g.home_score ?? 0) : Number(g.away_score ?? 0);
      const oppScore = isHome ? Number(g.away_score ?? 0) : Number(g.home_score ?? 0);
      const isLive = ["Live", "In Progress"].includes(g.status || "");

      return {
        id: Number(g.id),
        gamePk: Number(g.game_pk ?? g.id),
        date: g.game_date || "",
        opponent: isHome ? `vs ${oppTeam.name}` : `@ ${oppTeam.name}`,
        opponentLogo: oppTeam.logoUrl,
        score: `${caracasScore}-${oppScore}`,
        status: g.status || "Final",
        isHome,
        isLive,
      };
    });
  } catch (err) {
    console.error("Fallo obteniendo juegos disponibles para Game Center:", err);
    return [];
  }
}

/**
 * Descarga y formatea el Live Feed oficial de un juego desde MLB Stats API.
 */
export async function getGameCenterData(
  targetGamePk?: number,
  season = 2026
): Promise<GameCenterData | null> {
  const availableGames = await getCaracasAvailableGames(season);

  let gamePk = targetGamePk;
  if (!gamePk) {
    // 1. Priorizar juego en vivo
    const liveGame = availableGames.find((g) => g.isLive);
    if (liveGame) {
      gamePk = liveGame.gamePk;
    } else if (availableGames.length > 0) {
      // 2. Tomar el partido más reciente
      gamePk = availableGames[0].gamePk;
    } else {
      // Fallback canónico si no hay partidos en Supabase
      gamePk = 829925; // Juego real LVBP Leones vs Bravos
    }
  }

  // Descarga del feed de MLB Stats API
  let json: any = null;
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 10 },
    });
    if (res.ok) {
      json = await res.json();
    }
  } catch (err) {
    console.warn(`Error al consultar feed oficial de MLB para gamePk ${gamePk}:`, err);
  }

  if (!json || !json.gameData) {
    return null;
  }

  const gameData = json.gameData;
  const liveData = json.liveData || {};
  const linescore = liveData.linescore || {};
  const plays = liveData.plays || {};
  const boxscore = liveData.boxscore || {};

  // Equipos e identidades
  const homeRawId = Number(gameData.teams?.home?.id || 695);
  const awayRawId = Number(gameData.teams?.away?.id || 696);
  const homeTeamInfo = getTeam(homeRawId);
  const awayTeamInfo = getTeam(awayRawId);
  const isHomeLeones = homeRawId === LEONES_TEAM_ID;

  // Estatus
  const detailedState = gameData.status?.detailedState || "Final";
  const abstractState = gameData.status?.abstractGameState || "Final";
  const isLive = ["Live", "In Progress"].includes(abstractState) || detailedState === "In Progress";
  const isPreview = abstractState === "Preview" || ["Scheduled", "Pre-Game"].includes(detailedState);
  const status: "Live" | "Final" | "Preview" = isLive ? "Live" : isPreview ? "Preview" : "Final";
  const statusLabel = isLive ? "EN VIVO" : isPreview ? "PRE-JUEGO" : "FINAL";

  // Sede y Fecha
  const venue = gameData.venue?.name || "Estadio Monumental Simón Bolívar";
  const venueCity = gameData.venue?.location?.city || "Caracas";
  const gameDate = gameData.datetime?.dateTime?.slice(0, 10) || gameData.datetime?.originalDate || "";
  const gameTime = gameData.datetime?.time ? `${gameData.datetime.time} ${gameData.datetime.ampm || ""}` : "7:00 PM";

  // Marcadores y Totales
  const homeTotals = linescore.teams?.home || {};
  const awayTotals = linescore.teams?.away || {};

  const homeTeam: GameCenterTeam = {
    id: homeTeamInfo.id,
    name: homeTeamInfo.name,
    abbreviation: homeTeamInfo.abbreviation,
    logoUrl: homeTeamInfo.logoUrl,
    isHome: true,
    isLeones: isHomeLeones,
    score: Number(homeTotals.runs ?? gameData.teams?.home?.score ?? 0),
    hits: Number(homeTotals.hits ?? 0),
    errors: Number(homeTotals.errors ?? 0),
    lob: Number(homeTotals.leftOnBase ?? 0),
  };

  const awayTeam: GameCenterTeam = {
    id: awayTeamInfo.id,
    name: awayTeamInfo.name,
    abbreviation: awayTeamInfo.abbreviation,
    logoUrl: awayTeamInfo.logoUrl,
    isHome: false,
    isLeones: !isHomeLeones,
    score: Number(awayTotals.runs ?? gameData.teams?.away?.score ?? 0),
    hits: Number(awayTotals.hits ?? 0),
    errors: Number(awayTotals.errors ?? 0),
    lob: Number(awayTotals.leftOnBase ?? 0),
  };

  // Linescore entrada por entrada (mínimo 9 entradas para tablero estético)
  const rawInnings = linescore.innings || [];
  const maxInnings = Math.max(9, rawInnings.length);
  const inningsList = [];
  for (let i = 1; i <= maxInnings; i++) {
    const rawInn = rawInnings[i - 1];
    inningsList.push({
      num: i,
      away: rawInn?.away?.runs !== undefined ? Number(rawInn.away.runs) : null,
      home: rawInn?.home?.runs !== undefined ? Number(rawInn.home.runs) : null,
    });
  }

  const linescoreData: GameCenterLinescore = {
    innings: inningsList,
    awayTotals: {
      runs: homeTeam.isHome ? awayTeam.score : homeTeam.score,
      hits: Number(awayTotals.hits ?? 0),
      errors: Number(awayTotals.errors ?? 0),
      lob: Number(awayTotals.leftOnBase ?? 0),
    },
    homeTotals: {
      runs: homeTeam.isHome ? homeTeam.score : awayTeam.score,
      hits: Number(homeTotals.hits ?? 0),
      errors: Number(homeTotals.errors ?? 0),
      lob: Number(homeTotals.leftOnBase ?? 0),
    },
    currentInning: Number(linescore.currentInning || 9),
    currentInningOrdinal: linescore.currentInningOrdinal || "9no",
    inningHalf: (linescore.inningHalf as any) || "Bottom",
    isTopInning: Boolean(linescore.isTopInning),
  };

  // Conteo
  const count: GameCenterCount = {
    balls: Number(linescore.balls ?? plays.currentPlay?.count?.balls ?? 0),
    strikes: Number(linescore.strikes ?? plays.currentPlay?.count?.strikes ?? 0),
    outs: Number(linescore.outs ?? plays.currentPlay?.count?.outs ?? (status === "Final" ? 3 : 0)),
  };

  // Corredores en Base
  const offense = linescore.offense || {};
  const bases: GameCenterBases = {
    first: {
      occupied: Boolean(offense.first || offense.onFirst),
      runnerName: offense.first?.fullName || offense.onFirst?.fullName,
      runnerId: offense.first?.id || offense.onFirst?.id,
    },
    second: {
      occupied: Boolean(offense.second || offense.onSecond),
      runnerName: offense.second?.fullName || offense.onSecond?.fullName,
      runnerId: offense.second?.id || offense.onSecond?.id,
    },
    third: {
      occupied: Boolean(offense.third || offense.onThird),
      runnerName: offense.third?.fullName || offense.onThird?.fullName,
      runnerId: offense.third?.id || offense.onThird?.id,
    },
  };

  // Bateador y Lanzador en turno (Matchup)
  const currentMatchup = plays.currentPlay?.matchup || {};
  const currentBatter = currentMatchup.batter || offense.batter;
  const currentPitcher = currentMatchup.pitcher || linescore.defense?.pitcher;

  // Extraer stats de boxscore si existen
  const homeBoxPlayers = boxscore.teams?.home?.players || {};
  const awayBoxPlayers = boxscore.teams?.away?.players || {};
  const allBoxPlayers = { ...homeBoxPlayers, ...awayBoxPlayers };

  let batterMatchup: GameCenterPlayerMatchup | null = null;
  if (currentBatter && currentBatter.id) {
    const bId = currentBatter.id;
    const pBox = allBoxPlayers[`ID${bId}`] || {};
    const bStats = pBox.stats?.batting || {};
    const sStats = pBox.seasonStats?.batting || {};
    const batSideCode = currentMatchup.batSide?.code || (currentBatter as any).side || "R";
    const sideDisplay = batSideCode === "L" ? "Z" : batSideCode === "S" ? "A" : "D";

    batterMatchup = {
      id: bId,
      name: currentBatter.fullName,
      side: sideDisplay,
      jerseyNumber: pBox.jerseyNumber,
      position: pBox.position?.abbreviation,
      todaySummary: bStats.summary || `${bStats.hits || 0}-${bStats.atBats || 0}${bStats.rbi ? `, ${bStats.rbi} CI` : ""}`,
      seasonSlash: sStats.avg ? `${sStats.avg} / ${sStats.obp || ".000"} / ${sStats.slg || ".000"}` : undefined,
      headshotUrl: getPlayerHeadshotUrl(bId),
    };
  }

  let pitcherMatchup: GameCenterPlayerMatchup | null = null;
  if (currentPitcher && currentPitcher.id) {
    const pId = currentPitcher.id;
    const pBox = allBoxPlayers[`ID${pId}`] || {};
    const pStats = pBox.stats?.pitching || {};
    const sStats = pBox.seasonStats?.pitching || {};
    const pitchHandCode = currentMatchup.pitchHand?.code || (currentPitcher as any).hand || "R";
    const handDisplay = pitchHandCode === "L" ? "Z" : "D";

    pitcherMatchup = {
      id: pId,
      name: currentPitcher.fullName,
      side: handDisplay,
      jerseyNumber: pBox.jerseyNumber,
      position: "P",
      todaySummary: pStats.summary || `${pStats.inningsPitched || "0.0"} IP, ${pStats.hits || 0} H, ${pStats.earnedRuns || 0} CL, ${pStats.strikeOuts || 0} K`,
      seasonSlash: sStats.era ? `${sStats.era} ERA / ${sStats.whip || "0.00"} WHIP` : undefined,
      headshotUrl: getPlayerHeadshotUrl(pId),
    };
  }

  // Jugada a jugada (Play-by-Play)
  const allRawPlays = plays.allPlays || [];
  const parsedPlays: GameCenterPlay[] = allRawPlays.map((p: any, idx: number) => {
    const res = p.result || {};
    const rawEvent = res.event || "Jugada";
    const eventName = EVENT_TRANSLATIONS[rawEvent] || rawEvent;
    const description = translateDescriptionToSpanish(res.description || "");
    const inningNum = Number(p.about?.inning ?? 1);
    const half = p.about?.isTopInning ? "Alta" : "Baja";
    const isOut = Boolean(res.isOut);
    const isScoring = Boolean(res.rbi > 0 || res.description?.toLowerCase().includes("scores"));
    const isHit = ["Single", "Double", "Triple", "Home Run"].includes(rawEvent);

    let badgeColor: "gold" | "emerald" | "crimson" | "blue" | "slate" = "slate";
    if (rawEvent === "Home Run") badgeColor = "gold";
    else if (isHit) badgeColor = "emerald";
    else if (isScoring) badgeColor = "gold";
    else if (rawEvent === "Strikeout" || isOut) badgeColor = "crimson";
    else if (rawEvent.includes("Walk")) badgeColor = "blue";

    const isCaracasBatting = isHomeLeones ? !p.about?.isTopInning : p.about?.isTopInning;

    return {
      id: `play-${p.atBatIndex ?? idx}`,
      inning: inningNum,
      half,
      event: eventName,
      eventType: res.eventType || rawEvent,
      description,
      score: `${res.awayScore ?? 0} - ${res.homeScore ?? 0}`,
      outs: Number(p.count?.outs ?? 0),
      isCaracasBatting,
      isScoringPlay: isScoring,
      isHit,
      isOut,
      badgeColor,
    };
  });

  // Reversar jugadas para que la más reciente aparezca arriba
  parsedPlays.reverse();

  // Boxscore Oficial (Alineaciones 1-9 y Lanzadores)
  const formatBatters = (boxTeam: any): GameCenterBoxscoreBatter[] => {
    const rawBatters: number[] = boxTeam?.batters || [];
    const playersMap = boxTeam?.players || {};
    return rawBatters.map((pId, idx) => {
      const p = playersMap[`ID${pId}`] || {};
      const stats = p.stats?.batting || {};
      const season = p.seasonStats?.batting || {};
      return {
        id: pId,
        name: p.person?.fullName || "Pelotero",
        jersey: p.jerseyNumber || "-",
        position: p.position?.abbreviation || "OF",
        order: idx + 1,
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
        ops: season.ops || ".000",
      };
    });
  };

  const formatPitchers = (boxTeam: any): GameCenterBoxscorePitcher[] => {
    const rawPitchers: number[] = boxTeam?.pitchers || [];
    const playersMap = boxTeam?.players || {};
    return rawPitchers.map((pId) => {
      const p = playersMap[`ID${pId}`] || {};
      const stats = p.stats?.pitching || {};
      const season = p.seasonStats?.pitching || {};
      return {
        id: pId,
        name: p.person?.fullName || "Lanzador",
        jersey: p.jerseyNumber || "-",
        ip: stats.inningsPitched || "0.0",
        h: Number(stats.hits ?? 0),
        r: Number(stats.runs ?? 0),
        er: Number(stats.earnedRuns ?? 0),
        bb: Number(stats.baseOnBalls ?? 0),
        so: Number(stats.strikeOuts ?? 0),
        hr: Number(stats.homeRuns ?? 0),
        era: season.era || "0.00",
        pitches: Number(stats.numberOfPitches ?? 0),
        strikes: Number(stats.strikes ?? 0),
      };
    });
  };

  const boxscoreData = {
    awayBatters: formatBatters(boxscore.teams?.away),
    homeBatters: formatBatters(boxscore.teams?.home),
    awayPitchers: formatPitchers(boxscore.teams?.away),
    homePitchers: formatPitchers(boxscore.teams?.home),
  };

  return {
    gamePk,
    season,
    status,
    statusLabel,
    detailedState,
    date: gameDate,
    time: gameTime,
    venue,
    venueCity,
    homeTeam,
    awayTeam,
    isHomeLeones,
    currentInning: linescoreData.currentInning,
    inningHalf: linescoreData.inningHalf === "Top" ? "Alta" : "Baja",
    isTopInning: linescoreData.isTopInning,
    count,
    bases,
    batter: batterMatchup,
    pitcher: pitcherMatchup,
    linescore: linescoreData,
    plays: parsedPlays,
    boxscore: boxscoreData,
    availableGames,
  };
}
