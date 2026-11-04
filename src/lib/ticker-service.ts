import { TickerGame, TickerResponse } from "@/types/ticker";
import { LVBP_TEAMS } from "./constants";

const LEONES_TEAM_ID = 695;

function getCaracasDate(offsetDays = 0): string {
  const d = new Date();
  // Compensar zona horaria de Venezuela (UTC -4)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const caracasTime = new Date(utc - 4 * 3600000);
  if (offsetDays !== 0) {
    caracasTime.setDate(caracasTime.getDate() + offsetDays);
  }
  return caracasTime.toISOString().split("T")[0];
}

function getTeamAbbr(teamId: number, fallbackName = ""): string {
  if (LVBP_TEAMS[teamId]?.abbreviation) {
    return LVBP_TEAMS[teamId].abbreviation;
  }
  if (fallbackName.toLowerCase().includes("caracas")) return "CAR";
  if (fallbackName.toLowerCase().includes("magallanes")) return "MAG";
  if (fallbackName.toLowerCase().includes("guaira")) return "LAG";
  if (fallbackName.toLowerCase().includes("lara")) return "LAR";
  if (fallbackName.toLowerCase().includes("aragua")) return "ARA";
  if (fallbackName.toLowerCase().includes("zulia")) return "ZUL";
  if (fallbackName.toLowerCase().includes("anzo") || fallbackName.toLowerCase().includes("caribes")) return "ANZ";
  if (fallbackName.toLowerCase().includes("margarita") || fallbackName.toLowerCase().includes("bravos")) return "MAR";
  return fallbackName.slice(0, 3).toUpperCase();
}

/**
 * Consulta la jornada de la LVBP para el Ticker superior.
 * Incluye partidos en vivo de hoy, programados y resultados recientes de ayer.
 */
export async function getLeagueTickerGames(season = 2026): Promise<TickerResponse> {
  const todayStr = getCaracasDate(0);
  const yesterdayStr = getCaracasDate(-1);

  try {
    // 1. Consultar el schedule de la MLB Stats API para ayer y hoy
    const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&startDate=${yesterdayStr}&endDate=${todayStr}&hydrate=linescore,team`;
    
    let res = await fetch(scheduleUrl, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 30 },
    });

    let json = res.ok ? await res.json() : null;
    let datesList = json?.dates || [];

    // Si no hay juegos entre ayer y hoy (por ejemplo descanso o fuera de temporada),
    // consultar los últimos juegos de la temporada para no dejar el ticker vacío
    if (!datesList || datesList.length === 0 || datesList.every((d: any) => !d.games || d.games.length === 0)) {
      const fallbackUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}&hydrate=linescore,team`;
      const fallbackRes = await fetch(fallbackUrl, {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 300 },
      });
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        const allDates = fallbackJson.dates || [];
        // Tomar las últimas 2 fechas con partidos jugados
        const validDates = allDates.filter((d: any) => d.games && d.games.length > 0);
        datesList = validDates.slice(-2);
      }
    }

    const tickerGames: TickerGame[] = [];
    let hasLiveGames = false;

    for (const dateObj of datesList) {
      const gameDate = dateObj.date;
      const isToday = gameDate === todayStr;

      for (const g of dateObj.games || []) {
        const gamePk = Number(g.gamePk);
        const detailedStatus = g.status?.detailedState || "";
        const abstractState = g.status?.abstractGameState || ""; // 'Live', 'Final', 'Preview'
        const codedState = g.status?.codedGameState || "";

        const isLive = abstractState === "Live" || codedState === "I";
        const isFinal = abstractState === "Final" || codedState === "F" || detailedStatus.toLowerCase().includes("final");
        
        if (isLive) hasLiveGames = true;

        const homeTeamObj = g.teams?.home;
        const awayTeamObj = g.teams?.away;

        const homeId = Number(homeTeamObj?.team?.id) || 0;
        const awayId = Number(awayTeamObj?.team?.id) || 0;

        const homeScore = Number(homeTeamObj?.score ?? 0);
        const awayScore = Number(awayTeamObj?.score ?? 0);

        const homeAbbr = getTeamAbbr(homeId, homeTeamObj?.team?.name || "");
        const awayAbbr = getTeamAbbr(awayId, awayTeamObj?.team?.name || "");

        // Determinar statusLabel
        let statusLabel = "PROGRAMADO";
        let status: "Preview" | "Live" | "Final" = "Preview";

        if (isLive) {
          status = "Live";
          const linescore = g.linescore;
          const inning = linescore?.currentInning || 1;
          const isTop = linescore?.isTopInning ?? true;
          const inningOrdinal = linescore?.currentInningOrdinal || `${inning}.ª`;
          statusLabel = `${isTop ? "ALTA" : "BAJA"} ${inningOrdinal}`;
        } else if (isFinal) {
          status = "Final";
          statusLabel = isToday ? "FINAL" : "AYER";
        } else {
          status = "Preview";
          if (g.gameDate) {
            try {
              const dt = new Date(g.gameDate);
              statusLabel = dt.toLocaleTimeString("es-VE", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "America/Caracas",
              });
            } catch {
              statusLabel = "HOY";
            }
          }
        }

        tickerGames.push({
          id: gamePk,
          gamePk,
          gameDate,
          status,
          statusLabel,
          isLive,
          homeTeam: {
            id: homeId,
            name: homeTeamObj?.team?.name || homeAbbr,
            abbreviation: homeAbbr,
            score: homeScore,
            isLeones: homeId === LEONES_TEAM_ID,
            isWinner: isFinal && homeScore > awayScore,
          },
          awayTeam: {
            id: awayId,
            name: awayTeamObj?.team?.name || awayAbbr,
            abbreviation: awayAbbr,
            score: awayScore,
            isLeones: awayId === LEONES_TEAM_ID,
            isWinner: isFinal && awayScore > homeScore,
          },
          currentInning: g.linescore?.currentInning,
          isTopInning: g.linescore?.isTopInning,
          venue: g.venue?.name,
        });
      }
    }

    // Ordenar: primero juegos en vivo, luego juegos de Leones, luego por fecha/hora
    tickerGames.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      const aHasLeones = a.homeTeam.isLeones || a.awayTeam.isLeones;
      const bHasLeones = b.homeTeam.isLeones || b.awayTeam.isLeones;
      if (aHasLeones && !bHasLeones) return -1;
      if (!aHasLeones && bHasLeones) return 1;
      return b.gamePk - a.gamePk;
    });

    return {
      success: true,
      dateLabel: hasLiveGames ? "Partidos en Vivo • LVBP" : "Jornada LVBP",
      games: tickerGames,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Error en getLeagueTickerGames:", err);
    return {
      success: false,
      dateLabel: "Jornada LVBP",
      games: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
