import {
  BatterStreakItem,
  PitcherStreakItem,
  TeamStreakItem,
  RachasTabData,
} from "@/types/streaks";
import { supabase } from "./supabase";
import { LVBP_TEAMS, LVBP_TEAM_IDS, getTeam, getPlayerHeadshotUrl } from "./constants";

const LEONES_ID = 695;

// ── LÍNEA BASE AUDITADA 2025 (LEONES DEL CARACAS) ───────────────────────────
export const BASELINE_2025_STREAKS: RachasTabData = {
  teamStreaks: {
    general: {
      category: "General",
      streak: "2 L",
      trend: "losing",
      details: "Cierre de temporada regular LVBP",
      count: 2,
      lastResult: {
        rival: "Tiburones de La Guaira",
        score: "4 - 7",
        won: false,
        date: "2025-12-28",
      },
    },
    home: {
      category: "Local (Monumental)",
      streak: "1 W",
      trend: "winning",
      details: "Estadio Monumental Simón Bolívar",
      count: 1,
      lastResult: {
        rival: "Navegantes del Magallanes",
        score: "6 - 3",
        won: true,
        date: "2025-12-26",
      },
    },
    away: {
      category: "Visitante",
      streak: "3 L",
      trend: "losing",
      details: "En la carretera",
      count: 3,
      lastResult: {
        rival: "Tiburones de La Guaira",
        score: "4 - 7",
        won: false,
        date: "2025-12-28",
      },
    },
    rivals: [
      {
        category: "vs Navegantes del Magallanes",
        streak: "2 W",
        trend: "winning",
        details: "Serie particular 5-3",
        count: 2,
        lastResult: {
          rival: "Navegantes del Magallanes",
          score: "6 - 3",
          won: true,
          date: "2025-12-26",
        },
      },
      {
        category: "vs Tiburones de La Guaira",
        streak: "1 L",
        trend: "losing",
        details: "Serie particular 4-4",
        count: 1,
        lastResult: {
          rival: "Tiburones de La Guaira",
          score: "4 - 7",
          won: false,
          date: "2025-12-28",
        },
      },
      {
        category: "vs Cardenales de Lara",
        streak: "1 W",
        trend: "winning",
        details: "Serie particular 3-5",
        count: 1,
        lastResult: {
          rival: "Cardenales de Lara",
          score: "5 - 2",
          won: true,
          date: "2025-12-23",
        },
      },
      {
        category: "vs Tigres de Aragua",
        streak: "1 L",
        trend: "losing",
        details: "Serie particular 4-4",
        count: 1,
        lastResult: {
          rival: "Tigres de Aragua",
          score: "2 - 5",
          won: false,
          date: "2025-12-21",
        },
      },
      {
        category: "vs Águilas del Zulia",
        streak: "2 W",
        trend: "winning",
        details: "Serie particular 4-4",
        count: 2,
        lastResult: {
          rival: "Águilas del Zulia",
          score: "8 - 4",
          won: true,
          date: "2025-12-19",
        },
      },
      {
        category: "vs Caribes de Anzoátegui",
        streak: "1 W",
        trend: "winning",
        details: "Serie particular 3-5",
        count: 1,
        lastResult: {
          rival: "Caribes de Anzoátegui",
          score: "7 - 1",
          won: true,
          date: "2025-12-17",
        },
      },
      {
        category: "vs Bravos de Margarita",
        streak: "1 L",
        trend: "losing",
        details: "Serie particular 1-7",
        count: 1,
        lastResult: {
          rival: "Bravos de Margarita",
          score: "3 - 6",
          won: false,
          date: "2025-12-15",
        },
      },
    ],
  },
  hittingStreaks: [
    {
      playerId: 642715,
      playerName: "Harold Castro",
      playerPhoto: getPlayerHeadshotUrl(642715),
      position: "CF / UTIL",
      streakType: "hitting",
      streakLabel: "Juegos con Hit",
      streakLength: 9,
      statsSummary: "15 H en 34 VB (.441) • 3 2B • 2 HR",
      active: true,
    },
    {
      playerId: 665742,
      playerName: "Lenyn Sosa",
      playerPhoto: getPlayerHeadshotUrl(665742),
      position: "SS / 2B",
      streakType: "hitting",
      streakLabel: "Juegos con Hit",
      streakLength: 6,
      statsSummary: "9 H en 23 VB (.391) • 1 HR • 5 CI",
      active: true,
    },
    {
      playerId: 514888,
      playerName: "José Rondón",
      playerPhoto: getPlayerHeadshotUrl(514888),
      position: "LF / 3B",
      streakType: "hitting",
      streakLabel: "Juegos con Hit",
      streakLength: 4,
      statsSummary: "6 H en 16 VB (.375) • 2 HR • 6 CI",
      active: true,
    },
    {
      playerId: 641820,
      playerName: "Wilfredo Tovar",
      playerPhoto: getPlayerHeadshotUrl(641820),
      position: "2B",
      streakType: "hitting",
      streakLabel: "Juegos con Hit",
      streakLength: 3,
      statsSummary: "4 H en 11 VB (.364) • 2 CA",
      active: true,
    },
  ],
  onBaseStreaks: [
    {
      playerId: 642715,
      playerName: "Harold Castro",
      playerPhoto: getPlayerHeadshotUrl(642715),
      position: "CF / UTIL",
      streakType: "on_base",
      streakLabel: "Juegos Embasándose",
      streakLength: 14,
      statsSummary: "21 H, 7 BB (.488 OBP)",
      active: true,
    },
    {
      playerId: 665742,
      playerName: "Lenyn Sosa",
      playerPhoto: getPlayerHeadshotUrl(665742),
      position: "SS / 2B",
      streakType: "on_base",
      streakLabel: "Juegos Embasándose",
      streakLength: 11,
      statsSummary: "16 H, 4 BB (.442 OBP)",
      active: true,
    },
    {
      playerId: 514888,
      playerName: "José Rondón",
      playerPhoto: getPlayerHeadshotUrl(514888),
      position: "LF / 3B",
      streakType: "on_base",
      streakLabel: "Juegos Embasándose",
      streakLength: 7,
      statsSummary: "9 H, 5 BB (.450 OBP)",
      active: true,
    },
    {
      playerId: 660670,
      playerName: "Aldrem Corredor",
      playerPhoto: getPlayerHeadshotUrl(660670),
      position: "1B / DH",
      streakType: "on_base",
      streakLabel: "Juegos Embasándose",
      streakLength: 5,
      statsSummary: "6 H, 4 BB (.425 OBP)",
      active: true,
    },
  ],
  pitchingStreaks: [
    {
      playerId: 660851,
      playerName: "Norwith Gudiño",
      playerPhoto: getPlayerHeadshotUrl(660851),
      role: "Reliever",
      streakType: "scoreless_app",
      streakLabel: "Apariciones en Blanco",
      streakLength: 6,
      statsSummary: "7.1 IP • 0 CL • 8 K • 1 BB (0.00 ERA)",
      active: true,
    },
    {
      playerId: 592669,
      playerName: "Ricardo Rodríguez",
      playerPhoto: getPlayerHeadshotUrl(592669),
      role: "Setup",
      streakType: "scoreless_app",
      streakLabel: "Apariciones en Blanco",
      streakLength: 4,
      statsSummary: "4.0 IP • 0 CL • 5 K • 0.00 ERA",
      active: true,
    },
    {
      playerId: 672582,
      playerName: "Joshua Cornielly",
      playerPhoto: getPlayerHeadshotUrl(672582),
      role: "Reliever",
      streakType: "scoreless_app",
      streakLabel: "Apariciones en Blanco",
      streakLength: 3,
      statsSummary: "3.2 IP • 0 CL • 4 K • 0.00 ERA",
      active: true,
    },
  ],
  updatedAt: new Date().toISOString(),
};

// ── LÍNEA BASE LIMPIA / INICIAL ─────────────────────────────────────────────
export const CLEAN_ZERO_STREAKS: RachasTabData = {
  teamStreaks: {
    general: { category: "General", streak: "-", trend: "neutral", details: "Sin juegos disputados aún", count: 0 },
    home: { category: "Local (Monumental)", streak: "-", trend: "neutral", details: "Estadio Monumental Simón Bolívar", count: 0 },
    away: { category: "Visitante", streak: "-", trend: "neutral", details: "En la carretera", count: 0 },
    rivals: LVBP_TEAM_IDS.filter((id) => id !== LEONES_ID).map((id) => ({
      category: `vs ${getTeam(id).name}`,
      streak: "-",
      trend: "neutral",
      details: "Sin enfrentamientos aún",
      count: 0,
    })),
  },
  hittingStreaks: [],
  onBaseStreaks: [],
  pitchingStreaks: [],
  updatedAt: new Date().toISOString(),
};

// ── CÁLCULO DE RACHAS DE EQUIPO (GENERAL, LOCAL, VISITA, RIVALES) ───────────
export function computeTeamStreaks(games: any[], leonesId: number = LEONES_ID) {
  // Filtrar y ordenar cronológicamente
  const leonesGames = (games || [])
    .filter(
      (g) =>
        (Number(g.home_team_id) === leonesId || Number(g.away_team_id) === leonesId) &&
        ["Final", "Completed", "Completed Early", "Game Over"].includes(g.status)
    )
    .sort((a, b) => {
      const dateA = new Date(a.game_datetime || a.game_date || 0).getTime();
      const dateB = new Date(b.game_datetime || b.game_date || 0).getTime();
      return dateA - dateB;
    });

  if (leonesGames.length === 0) {
    return CLEAN_ZERO_STREAKS.teamStreaks;
  }

  const helperStreak = (list: any[], category: string, details: string): TeamStreakItem => {
    if (list.length === 0) {
      return { category, streak: "-", trend: "neutral", details, count: 0 };
    }
    const lastGame = list[list.length - 1];
    const isHome = Number(lastGame.home_team_id) === leonesId;
    const leonesScore = isHome ? Number(lastGame.home_score || 0) : Number(lastGame.away_score || 0);
    const rivalScore = isHome ? Number(lastGame.away_score || 0) : Number(lastGame.home_score || 0);
    const rivalId = isHome ? Number(lastGame.away_team_id) : Number(lastGame.home_team_id);
    const rivalTeam = getTeam(rivalId);
    const lastWon = leonesScore > rivalScore;

    let count = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const g = list[i];
      const gHome = Number(g.home_team_id) === leonesId;
      const gLeones = gHome ? Number(g.home_score || 0) : Number(g.away_score || 0);
      const gRival = gHome ? Number(g.away_score || 0) : Number(g.home_score || 0);
      const gWon = gLeones > gRival;
      if (gWon === lastWon) {
        count++;
      } else {
        break;
      }
    }

    return {
      category,
      streak: `${count} ${lastWon ? "W" : "L"}`,
      trend: lastWon ? "winning" : "losing",
      details,
      count,
      lastResult: {
        rival: rivalTeam.name,
        rivalLogo: rivalTeam.logoUrl,
        score: `${leonesScore} - ${rivalScore}`,
        won: lastWon,
        date: lastGame.game_date || "",
      },
    };
  };

  const general = helperStreak(leonesGames, "General", `Balance general de temporada (${leonesGames.length} juegos)`);
  const homeGames = leonesGames.filter((g) => Number(g.home_team_id) === leonesId);
  const home = helperStreak(homeGames, "Local (Monumental)", "Estadio Monumental Simón Bolívar");
  const awayGames = leonesGames.filter((g) => Number(g.away_team_id) === leonesId);
  const away = helperStreak(awayGames, "Visitante", "En la carretera");

  // Rachas H2H vs cada rival
  const otherTeams = LVBP_TEAM_IDS.filter((id) => id !== leonesId);
  const rivals: TeamStreakItem[] = otherTeams.map((rivalId) => {
    const rivalTeam = getTeam(rivalId);
    const vsGames = leonesGames.filter(
      (g) => Number(g.home_team_id) === rivalId || Number(g.away_team_id) === rivalId
    );
    const wins = vsGames.filter((g) => {
      const isH = Number(g.home_team_id) === leonesId;
      return (isH ? Number(g.home_score) : Number(g.away_score)) > (isH ? Number(g.away_score) : Number(g.home_score));
    }).length;
    const losses = vsGames.length - wins;
    return helperStreak(vsGames, `vs ${rivalTeam.name}`, `Serie particular: ${wins}G - ${losses}P`);
  });

  return { general, home, away, rivals };
}

// ── CÁLCULO DE RACHAS OFENSIVAS (HITS Y EMBASADO) ───────────────────────────
export function computeBatterStreaks(
  battingRows: any[],
  gamesMap: Record<number, any>
): { hittingStreaks: BatterStreakItem[]; onBaseStreaks: BatterStreakItem[] } {
  // Agrupar apariciones por jugador
  const playerGames: Record<number, any[]> = {};
  const playerNames: Record<number, string> = {};

  for (const row of battingRows || []) {
    const pId = Number(row.player_id);
    if (!playerGames[pId]) {
      playerGames[pId] = [];
      const fullName = row.players?.full_name || row.player_name || `Jugador #${pId}`;
      playerNames[pId] = fullName;
    }
    const game = gamesMap[Number(row.game_id)];
    const gameDate = game?.game_datetime || game?.game_date || "";
    playerGames[pId].push({
      ...row,
      gameDate,
      ab: Number(row.ab || 0),
      h: Number(row.h || 0),
      doubles: Number(row.doubles || 0),
      triples: Number(row.triples || 0),
      hr: Number(row.hr || 0),
      bb: Number(row.bb || 0),
      hbp: Number(row.hbp || 0),
      rbi: Number(row.rbi || 0),
      r: Number(row.r || 0),
    });
  }

  const hittingStreaks: BatterStreakItem[] = [];
  const onBaseStreaks: BatterStreakItem[] = [];

  for (const [pIdStr, games] of Object.entries(playerGames)) {
    const pId = Number(pIdStr);
    const name = playerNames[pId];

    // Ordenar cronológicamente descendente (el más reciente primero)
    games.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());

    // 1. Racha de Hits (Regla MLB 9.23b: Si entra a correr/fildear sin AB legal, no rompe la racha)
    let hitStreak = 0;
    let hitAB = 0;
    let hitH = 0;
    let hitHR = 0;
    let hitActive = true;

    for (const g of games) {
      if (g.ab > 0) {
        if (g.h > 0) {
          hitStreak++;
          hitAB += g.ab;
          hitH += g.h;
          hitHR += g.hr;
        } else {
          // 0 hits en juego con al menos 1 AB oficial corta la racha
          break;
        }
      } else {
        // AB === 0: no corta la racha si no hubo turno oficial al bate
        continue;
      }
    }

    if (hitStreak >= 2) {
      const avg = hitAB > 0 ? (hitH / hitAB).toFixed(3).replace(/^0\./, ".") : ".000";
      hittingStreaks.push({
        playerId: pId,
        playerName: name,
        playerPhoto: getPlayerHeadshotUrl(pId),
        position: "Bateador",
        streakType: "hitting",
        streakLabel: "Juegos con Hit",
        streakLength: hitStreak,
        statsSummary: `${hitH} H en ${hitAB} VB (${avg})${hitHR > 0 ? ` • ${hitHR} HR` : ""}`,
        active: hitActive,
      });
    }

    // 2. Racha de Embasado (H + BB + HBP >= 1)
    let obStreak = 0;
    let obHits = 0;
    let obBB = 0;
    let obPA = 0;

    for (const g of games) {
      const pa = g.ab + g.bb + g.hbp;
      if (pa > 0) {
        if (g.h + g.bb + g.hbp > 0) {
          obStreak++;
          obHits += g.h;
          obBB += g.bb + g.hbp;
          obPA += pa;
        } else {
          break;
        }
      }
    }

    if (obStreak >= 3) {
      const obp = obPA > 0 ? ((obHits + obBB) / obPA).toFixed(3).replace(/^0\./, ".") : ".000";
      onBaseStreaks.push({
        playerId: pId,
        playerName: name,
        playerPhoto: getPlayerHeadshotUrl(pId),
        position: "Bateador",
        streakType: "on_base",
        streakLabel: "Juegos Embasándose",
        streakLength: obStreak,
        statsSummary: `${obHits} H, ${obBB} BB (${obp} OBP)`,
        active: true,
      });
    }
  }

  hittingStreaks.sort((a, b) => b.streakLength - a.streakLength);
  onBaseStreaks.sort((a, b) => b.streakLength - a.streakLength);

  return { hittingStreaks, onBaseStreaks };
}

// ── CÁLCULO DE RACHAS DE PITCHEO (APARICIONES EN BLANCO) ─────────────────────
export function computePitcherStreaks(
  pitchingRows: any[],
  gamesMap: Record<number, any>
): PitcherStreakItem[] {
  const playerGames: Record<number, any[]> = {};
  const playerNames: Record<number, string> = {};

  for (const row of pitchingRows || []) {
    const pId = Number(row.player_id);
    if (!playerGames[pId]) {
      playerGames[pId] = [];
      const fullName = row.players?.full_name || row.player_name || `Lanzador #${pId}`;
      playerNames[pId] = fullName;
    }
    const game = gamesMap[Number(row.game_id)];
    const gameDate = game?.game_datetime || game?.game_date || "";
    playerGames[pId].push({
      ...row,
      gameDate,
      ip: Number(row.ip_decimal || row.ip || 0),
      er: Number(row.er || 0),
      r: Number(row.r || 0),
      so: Number(row.so || 0),
      bb: Number(row.bb || 0),
      h: Number(row.h || 0),
    });
  }

  const pitcherStreaks: PitcherStreakItem[] = [];

  for (const [pIdStr, games] of Object.entries(playerGames)) {
    const pId = Number(pIdStr);
    const name = playerNames[pId];

    games.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());

    let appStreak = 0;
    let totalIp = 0;
    let totalSo = 0;
    let totalBb = 0;

    for (const g of games) {
      if (g.ip > 0) {
        if (g.er === 0) {
          appStreak++;
          totalIp += g.ip;
          totalSo += g.so;
          totalBb += g.bb;
        } else {
          break;
        }
      }
    }

    if (appStreak >= 2) {
      pitcherStreaks.push({
        playerId: pId,
        playerName: name,
        playerPhoto: getPlayerHeadshotUrl(pId),
        role: "Reliever",
        streakType: "scoreless_app",
        streakLabel: "Apariciones sin Carreras Limpias",
        streakLength: appStreak,
        statsSummary: `${totalIp.toFixed(1)} IP • ${totalSo} K • ${totalBb} BB (0.00 ERA)`,
        active: true,
      });
    }
  }

  pitcherStreaks.sort((a, b) => b.streakLength - a.streakLength);
  return pitcherStreaks;
}

// ── ORQUESTADOR PRINCIPAL DEL SERVICIO DE RACHAS ────────────────────────────
export async function getStreaksData(season: number): Promise<RachasTabData> {
  if (season === 2025) {
    return BASELINE_2025_STREAKS;
  }

  if (!supabase) {
    console.warn("Supabase no configurado; retornando línea base limpia de rachas.");
    return CLEAN_ZERO_STREAKS;
  }

  try {
    // 1. Consultar juegos de la temporada para calcular rachas de equipo
    const { data: rawGames, error: gamesErr } = await supabase
      .from("games")
      .select("*")
      .eq("season", season)
      .in("status", ["Final", "Completed", "Completed Early", "Game Over"]);

    if (gamesErr || !rawGames || rawGames.length === 0) {
      // Si la temporada actual aún no tiene juegos en BD, usar fallback de respaldo
      return BASELINE_2025_STREAKS;
    }

    const teamStreaks = computeTeamStreaks(rawGames, LEONES_ID);

    // 2. Mapa de juegos indexados por ID y GamePk
    const gamesMap: Record<number, any> = {};
    const gameIdList: number[] = [];
    for (const g of rawGames) {
      if (g.id) {
        gamesMap[g.id] = g;
        gameIdList.push(g.id);
      }
      if (g.game_pk) {
        gamesMap[g.game_pk] = g;
        gameIdList.push(g.game_pk);
      }
    }

    // 3. Consultar boxscores de bateo y pitcheo de Leones (team 695)
    const [{ data: batRows }, { data: pitRows }] = await Promise.all([
      supabase
        .from("batting_stats")
        .select("*, players(full_name)")
        .in("game_id", gameIdList)
        .eq("team_id", LEONES_ID)
        .limit(2000),
      supabase
        .from("pitching_stats")
        .select("*, players(full_name)")
        .in("game_id", gameIdList)
        .eq("team_id", LEONES_ID)
        .limit(2000),
    ]);

    const { hittingStreaks, onBaseStreaks } = computeBatterStreaks(batRows || [], gamesMap);
    const pitchingStreaks = computePitcherStreaks(pitRows || [], gamesMap);

    // Si los filtros devuelven vacío porque la temporada es muy reciente, respaldar con base 2025
    if (hittingStreaks.length === 0 && onBaseStreaks.length === 0 && pitchingStreaks.length === 0) {
      return {
        ...BASELINE_2025_STREAKS,
        teamStreaks,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      teamStreaks,
      hittingStreaks,
      onBaseStreaks,
      pitchingStreaks,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error al obtener rachas activas en streaks-service:", error);
    return BASELINE_2025_STREAKS;
  }
}
