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
  "En Turno": "En Turno",
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
 * Consulta la lista de juegos oficiales de la temporada activa (2026-2027) directamente
 * desde el calendario oficial de MLB Stats API (`sportId=17`, `leagueId=135`).
 */
export async function getCaracasAvailableGames(season = 2026): Promise<GameCenterAvailableGame[]> {
  try {
    const res = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}`,
      {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 30 },
      }
    );

    if (res.ok) {
      const json = await res.json();
      const games: GameCenterAvailableGame[] = [];

      for (const dateObj of json.dates || []) {
        for (const g of dateObj.games || []) {
          const homeId = Number(g.teams?.home?.team?.id);
          const awayId = Number(g.teams?.away?.team?.id);

          if (homeId === LEONES_TEAM_ID || awayId === LEONES_TEAM_ID) {
            const isHome = homeId === LEONES_TEAM_ID;
            const oppId = isHome ? awayId : homeId;
            const oppTeam = getTeam(oppId);
            const statusDetail = g.status?.detailedState || g.status?.abstractGameState || "Final";
            const isLive =
              ["Live", "In Progress"].includes(statusDetail) ||
              g.status?.abstractGameState === "Live" ||
              g.status?.codedGameState === "I";

            const awayScore = g.teams?.away?.score;
            const homeScore = g.teams?.home?.score;
            const caracasScore = isHome ? homeScore : awayScore;
            const oppScore = isHome ? awayScore : homeScore;

            let scoreStr = "vs";
            if (awayScore !== undefined && homeScore !== undefined) {
              scoreStr = `${caracasScore}-${oppScore}`;
            } else if (isLive) {
              scoreStr = "EN VIVO";
            }

            games.push({
              id: g.gamePk,
              gamePk: g.gamePk,
              date: dateObj.date,
              opponent: isHome ? `vs ${oppTeam.name}` : `@ ${oppTeam.name}`,
              opponentLogo: oppTeam.logoUrl,
              score: scoreStr,
              status: statusDetail,
              isHome,
              isLive,
            });
          }
        }
      }

      // Filtrar partidos que ya se jugaron o que están en vivo / programados para hoy
      const todayIso = new Date().toISOString().slice(0, 10);
      const activeOrPlayed = games.filter(
        (g) =>
          g.isLive ||
          ["Final", "Completed", "Game Over", "Completed Early"].includes(g.status) ||
          g.date <= todayIso
      );

      // Priorizar juegos EN VIVO al inicio, luego ordenar por fecha descendente
      activeOrPlayed.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return b.date.localeCompare(a.date);
      });

      if (activeOrPlayed.length > 0) {
        return activeOrPlayed;
      }
    }
  } catch (err) {
    console.warn("Fallo obteniendo calendario de MLB Stats API:", err);
  }

  // Fallback a Supabase si la llamada directa al calendario falla
  if (supabase) {
    try {
      const { data: rawGames } = await supabase
        .from("games")
        .select("id, game_pk, game_date, season, game_type, status, home_team_id, away_team_id, home_score, away_score")
        .eq("season", season)
        .or("home_team_id.eq.695,away_team_id.eq.695")
        .order("game_date", { ascending: false })
        .limit(12);

      if (rawGames && rawGames.length > 0) {
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
      }
    } catch (err) {
      console.warn("Fallo fallback a Supabase:", err);
    }
  }

  // Default canónico para la temporada 2026 activa
  return [
    {
      id: 870083,
      gamePk: 870083,
      date: "2026-10-18",
      opponent: "@ Caribes de Anzoátegui",
      opponentLogo: "https://midfield.mlbstatic.com/v1/team/694/spots/120",
      score: "EN VIVO",
      status: "In Progress",
      isHome: false,
      isLive: true,
    },
  ];
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
      // 2. Tomar el partido más reciente de la temporada 2026
      gamePk = availableGames[0].gamePk;
    } else {
      // Fallback oficial de la temporada 2026
      gamePk = 870083; // 2026-10-18: Leones @ Caribes
    }
  }

  // Descarga del feed de MLB Stats API
  let json: any = null;
  try {
    const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      signal: AbortSignal.timeout(12000),
      next: { revalidate: 5 },
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
  const isLive =
    ["Live", "In Progress"].includes(abstractState) ||
    detailedState === "In Progress" ||
    gameData.status?.codedGameState === "I";
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

  // Actualizar el score en availableGames para el juego activo si aún decía "vs" o "EN VIVO"
  const updatedAvailableGames = availableGames.map((g) => {
    if (g.gamePk === gamePk) {
      const cScore = isHomeLeones ? homeTeam.score : awayTeam.score;
      const oScore = isHomeLeones ? awayTeam.score : homeTeam.score;
      return {
        ...g,
        score: `${cScore}-${oScore}`,
        isLive,
        status: detailedState,
      };
    }
    return g;
  });

  // Linescore entrada por entrada (mínimo 9 entradas)
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
      runs: awayTeam.score,
      hits: Number(awayTotals.hits ?? 0),
      errors: Number(awayTotals.errors ?? 0),
      lob: Number(awayTotals.leftOnBase ?? 0),
    },
    homeTotals: {
      runs: homeTeam.score,
      hits: Number(homeTotals.hits ?? 0),
      errors: Number(homeTotals.errors ?? 0),
      lob: Number(homeTotals.leftOnBase ?? 0),
    },
    currentInning: Number(linescore.currentInning || (rawInnings.length > 0 ? rawInnings.length : 1)),
    currentInningOrdinal: linescore.currentInningOrdinal || `${linescore.currentInning || 1}ra`,
    inningHalf: (linescore.inningHalf as any) || (linescore.isTopInning ? "Top" : "Bottom"),
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
    const rawEvent = res.event || (p.matchup?.batter ? "En Turno" : "Jugada");
    const eventName = EVENT_TRANSLATIONS[rawEvent] || rawEvent;

    let description = res.description ? translateDescriptionToSpanish(res.description) : "";
    if (!description && p.matchup?.batter && p.matchup?.pitcher) {
      const bName = p.matchup.batter.fullName;
      const pName = p.matchup.pitcher.fullName;
      const bCount = p.count?.balls ?? 0;
      const sCount = p.count?.strikes ?? 0;
      const oCount = p.count?.outs ?? 0;
      description = `${bName} al bate contra ${pName}. Conteo: ${bCount}-${sCount}, ${oCount} out(s).`;
    } else if (!description) {
      description = "Turno al bate en desarrollo.";
    }

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
      score: `${res.awayScore ?? awayTeam.score} - ${res.homeScore ?? homeTeam.score}`,
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

    // Filtrar lanzadores: en LVBP y béisbol con Bateador Designado (DH),
    // los lanzadores que no participan en la ofensiva no forman parte de la alineación ofensiva.
    // IMPORTANTE: Un jugador que entra como corredor emergente (PR) o bateador emergente (PH)
    // puede tener 0 turnos al bate (VB / AB = 0) y DEBE permanecer en la alineación ofensiva.
    // Solo se excluyen lanzadores netos (P) que no tuvieron ninguna actuación ofensiva.
    return rawBatters
      .filter((pId) => {
        const p = playersMap[`ID${pId}`];
        if (!p) return false;
        const pos = p.position?.abbreviation;
        const isPitcher =
          pos === "P" ||
          p.position?.type === "Pitcher" ||
          p.position?.code === "1";

        // Si no es lanzador (bateador titular, sustituto, bateador emergente PH, o corredor emergente PR),
        // se conserva SIEMPRE en la alineación ofensiva, incluso si no tomó turnos al bate (VB = 0).
        if (!isPitcher) return true;

        // Salvaguarda caso borde: Si en su perfil base figura como pitcher pero en este juego
        // tuvo un rol ofensivo activo (corredor emergente PR, bateador emergente PH, o turno al bate)
        const allPos = (p.allPositions || []).map((x: any) => x.abbreviation);
        const hasOffensiveAction =
          allPos.includes("PR") ||
          allPos.includes("PH") ||
          allPos.includes("DH") ||
          Boolean(p.battingOrder) ||
          Number(p.stats?.batting?.plateAppearances ?? 0) > 0 ||
          Number(p.stats?.batting?.runs ?? 0) > 0 ||
          Number(p.stats?.batting?.stolenBases ?? 0) > 0;

        return hasOffensiveAction;
      })
      .map((pId, idx) => {
        const p = playersMap[`ID${pId}`] || {};
        const stats = p.stats?.batting || {};
        const season = p.seasonStats?.batting || {};
        const allPos = (p.allPositions || []).map((x: any) => x.abbreviation);

        // Si el jugador actuó como corredor emergente (PR) y no ocupó posición defensiva
        let posDisplay = p.position?.abbreviation || "OF";
        if (posDisplay === "P" && allPos.includes("PR")) {
          posDisplay = "PR";
        } else if (allPos.includes("PR") && Number(stats.atBats ?? 0) === 0 && !["1B", "2B", "3B", "SS", "LF", "CF", "RF", "C", "DH"].includes(posDisplay)) {
          posDisplay = "PR";
        }

        return {
          id: pId,
          name: p.person?.fullName || "Pelotero",
          jersey: p.jerseyNumber || "-",
          position: posDisplay,
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
    availableGames: updatedAvailableGames,
  };
}
