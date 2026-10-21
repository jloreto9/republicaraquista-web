import { getTeam, getPlayerHeadshotUrl } from "./constants";
import {
  BullpenBudgetData,
  RelieverBudgetItem,
  RelieverDayUsage,
} from "@/types/bullpen";

// En-memoria cache de boxscores completados (inmutable)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const boxscoreCache = new Map<number, any>();
// Cache de budget por temporada y equipo
const budgetCache = new Map<string, { timestamp: number; data: BullpenBudgetData }>();

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RepublicaCaraquista/1.0",
  Accept: "application/json, text/plain, */*",
};

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatDayLabel(dateStr: string): { dayLabel: string; dayOfWeek: string } {
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr);
    const day = d.getUTCDate();
    const month = MONTHS_ES[d.getUTCMonth()] || "";
    const dayOfWeek = DAYS_ES[d.getUTCDay()] || "";
    return {
      dayLabel: `${day} ${month}`,
      dayOfWeek,
    };
  } catch {
    return { dayLabel: dateStr.slice(5), dayOfWeek: "" };
  }
}

function parseOuts(ipStr: string): number {
  const num = parseFloat(ipStr) || 0;
  const full = Math.floor(num);
  const part = Math.round((num - full) * 10);
  return full * 3 + part;
}

function formatOutsToIp(totalOuts: number): string {
  const full = Math.floor(totalOuts / 3);
  const rem = totalOuts % 3;
  return `${full}.${rem}`;
}

export async function getBullpenBudget(
  season: number,
  teamId: number = 695
): Promise<BullpenBudgetData> {
  const cacheKey = `${season}_${teamId}`;
  const cached = budgetCache.get(cacheKey);
  const now = Date.now();
  // TTL de 2 minutos para datos vivos
  if (cached && now - cached.timestamp < 120_000) {
    return cached.data;
  }

  const teamObj = getTeam(teamId);
  const emptyBudget: BullpenBudgetData = {
    teamId,
    teamName: teamObj.name || "Equipo",
    teamLogo: teamObj.logoUrl,
    season,
    dates: [],
    relievers: [],
    kpis: {
      availableArms: 0,
      cautionArms: 0,
      unavailableArms: 0,
      totalRelievers: 0,
      teamPitchesLast3Days: 0,
      teamPitchesLast5Days: 0,
      mostWorkedReliever: "Sin datos",
      mostWorkedPitches: 0,
    },
  };

  try {
    // 1. Obtener calendario oficial del equipo para la temporada
    let schedRes = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${season}&teamId=${teamId}`,
      {
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 300 },
      }
    );

    if (!schedRes.ok) {
      return emptyBudget;
    }

    let schedData = await schedRes.json();
    let allGames = (schedData.dates || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((d: any) => d.games || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((g: any) =>
        ["Final", "Completed", "Game Over", "Completed Early"].includes(
          g.status?.detailedState || g.status?.abstractGameState
        )
      );

    // Fallback a 2025 si la temporada 2026 aún no tiene juegos completados
    let effectiveSeason = season;
    if (!allGames.length && season >= 2026) {
      effectiveSeason = 2025;
      schedRes = await fetch(
        `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${effectiveSeason}&teamId=${teamId}`,
        {
          headers: HEADERS,
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 300 },
        }
      );
      if (schedRes.ok) {
        schedData = await schedRes.json();
        allGames = (schedData.dates || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .flatMap((d: any) => d.games || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((g: any) =>
            ["Final", "Completed", "Game Over", "Completed Early"].includes(
              g.status?.detailedState || g.status?.abstractGameState
            )
          );
      }
    }

    if (!allGames.length) {
      return emptyBudget;
    }

    // Tomar los últimos 6 juegos completados del equipo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentGames = allGames.slice(-6);

    // 2. Descargar boxscores concurrentemente
    const boxscores = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentGames.map(async (g: any) => {
        const gamePk = g.gamePk;
        if (boxscoreCache.has(gamePk)) {
          return boxscoreCache.get(gamePk);
        }

        try {
          const bRes = await fetch(
            `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`,
            {
              headers: HEADERS,
              signal: AbortSignal.timeout(6000),
              next: { revalidate: 3600 },
            }
          );
          if (!bRes.ok) return null;
          const box = await bRes.json();
          const isHome = box.teams?.home?.team?.id === teamId;
          const teamBox = isHome ? box.teams?.home : box.teams?.away;
          const oppBox = isHome ? box.teams?.away : box.teams?.home;

          const parsed = {
            gamePk,
            gameDate: String(g.gameDate || "").slice(0, 10),
            oppName: oppBox?.team?.name || "Rival",
            oppAbbr: oppBox?.team?.abbreviation || getTeam(oppBox?.team?.id).abbreviation || "RIV",
            isHome,
            pitchers: (teamBox?.pitchers as number[]) || [],
            players: teamBox?.players || {},
          };

          boxscoreCache.set(gamePk, parsed);
          return parsed;
        } catch (e) {
          console.error(`Error fetching boxscore for game ${gamePk}:`, e);
          return null;
        }
      })
    );

    const validBoxes = boxscores.filter(Boolean);
    if (!validBoxes.length) return emptyBudget;

    // 3. Generar secuencia continua de días calendario (incluyendo Días Libres / Descanso)
    const firstDateStr = validBoxes[0].gameDate;
    const lastDateStr = validBoxes[validBoxes.length - 1].gameDate;

    const endMs = new Date(`${lastDateStr}T12:00:00Z`).getTime();
    let startMs = new Date(`${firstDateStr}T12:00:00Z`).getTime();

    // Asegurar al menos 7 días de ventana rolling
    const minStartMs = endMs - 6 * 86_400_000;
    if (startMs > minStartMs) {
      startMs = minStartMs;
    }
    // Limitar el ancho máximo a 8 días para preservar la ergonomía visual
    const maxSpanMs = 8 * 86_400_000;
    if (endMs - startMs > maxSpanMs) {
      startMs = endMs - maxSpanMs;
    }

    const calendarDates: string[] = [];
    let currMs = startMs;
    while (currMs <= endMs) {
      const dStr = new Date(currMs).toISOString().slice(0, 10);
      calendarDates.push(dStr);
      currMs += 86_400_000;
    }

    // Metadatos de columnas de fechas (con detección explícita de Día Libre)
    const datesMeta = calendarDates.map((dStr) => {
      const { dayLabel, dayOfWeek } = formatDayLabel(dStr);
      const boxesOnDate = validBoxes.filter((b) => b.gameDate === dStr);
      const isOffDay = boxesOnDate.length === 0;

      const opponent = isOffDay
        ? "Día Libre"
        : boxesOnDate.length > 1
        ? `${boxesOnDate[0].isHome ? "vs" : "@"} ${boxesOnDate[0].oppAbbr} (DH)`
        : `${boxesOnDate[0].isHome ? "vs" : "@"} ${boxesOnDate[0].oppAbbr}`;

      return {
        date: dStr,
        dayLabel,
        dayOfWeek,
        opponent,
        gamePk: isOffDay ? 0 : boxesOnDate[0].gamePk,
        isOffDay,
      };
    });

    // 4. Recopilar lanzadores (Tanto Abridores GS como Relevistas)
    const pitcherMap = new Map<
      number,
      {
        id: number;
        name: string;
        throws: "R" | "L";
        gamesCount: number;
        startsCount: number;
        reliefCount: number;
        totalEr: number;
        totalSo: number;
        totalIpOuts: number;
        totalSaves: number;
        totalHolds: number;
        totalBb: number;
        totalH: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameOutingsByDate: Map<string, any>;
      }
    >();

    for (const b of validBoxes) {
      const starterId = b.pitchers[0];

      for (let pIdx = 0; pIdx < b.pitchers.length; pIdx++) {
        const pId = b.pitchers[pIdx];
        if (!pId) continue;
        const pData = b.players[`ID${pId}`];
        if (!pData) continue;
        const stats = pData.stats?.pitching || {};
        const name = pData.person?.fullName || "Lanzador";
        const throws = (pData.pitchHand?.code as "R" | "L") || "R";
        const isStarter = pId === starterId || Number(stats.gamesStarted || 0) > 0;

        if (!pitcherMap.has(pId)) {
          pitcherMap.set(pId, {
            id: pId,
            name,
            throws,
            gamesCount: 0,
            startsCount: 0,
            reliefCount: 0,
            totalEr: 0,
            totalSo: 0,
            totalIpOuts: 0,
            totalSaves: 0,
            totalHolds: 0,
            totalBb: 0,
            totalH: 0,
            gameOutingsByDate: new Map(),
          });
        }

        const pRec = pitcherMap.get(pId)!;
        pRec.gamesCount += 1;
        if (isStarter) {
          pRec.startsCount += 1;
        } else {
          pRec.reliefCount += 1;
        }

        const ipStr = String(stats.inningsPitched || "0.0");
        const outs = parseOuts(ipStr);
        const pitches = Number(stats.numberOfPitches || 0);
        const strikes = Number(stats.strikes || 0);
        const er = Number(stats.earnedRuns || 0);
        const so = Number(stats.strikeOuts || 0);
        const bb = Number(stats.baseOnBalls || 0);
        const h = Number(stats.hits || 0);
        const isSv = Number(stats.saves || 0) > 0;
        const isHld = Number(stats.holds || 0) > 0;
        const isW = Number(stats.wins || 0) > 0;
        const isL = Number(stats.losses || 0) > 0;

        let decision: "W" | "L" | "SV" | "HLD" | "" = "";
        if (isSv) decision = "SV";
        else if (isHld) decision = "HLD";
        else if (isW) decision = "W";
        else if (isL) decision = "L";

        pRec.totalEr += er;
        pRec.totalSo += so;
        pRec.totalIpOuts += outs;
        pRec.totalBb += bb;
        pRec.totalH += h;
        if (isSv) pRec.totalSaves += 1;
        if (isHld) pRec.totalHolds += 1;

        let loadLevel: "rest" | "low" | "medium" | "high" = "rest";
        if (pitches >= 26) loadLevel = "high";
        else if (pitches >= 16) loadLevel = "medium";
        else if (pitches >= 1) loadLevel = "low";

        // Acumular si hubo doble juego el mismo día
        const existing = pRec.gameOutingsByDate.get(b.gameDate);
        if (existing) {
          const combinedPitches = existing.pitches + pitches;
          let combLoad: "rest" | "low" | "medium" | "high" = "low";
          if (combinedPitches >= 26) combLoad = "high";
          else if (combinedPitches >= 16) combLoad = "medium";

          pRec.gameOutingsByDate.set(b.gameDate, {
            gamePk: b.gamePk,
            date: b.gameDate,
            opponent: existing.opponent,
            isOffDay: false,
            isStarter: existing.isStarter || isStarter,
            isGS: existing.isGS || isStarter,
            pitched: true,
            pitches: combinedPitches,
            strikes: existing.strikes + strikes,
            ip: formatOutsToIp(parseOuts(existing.ip) + outs),
            ipDecimal: existing.ipDecimal + outs / 3,
            er: existing.er + er,
            so: existing.so + so,
            bb: existing.bb + bb,
            h: existing.h + h,
            decision: decision || existing.decision,
            loadLevel: combLoad,
          });
        } else {
          pRec.gameOutingsByDate.set(b.gameDate, {
            gamePk: b.gamePk,
            date: b.gameDate,
            opponent: b.isHome ? `vs ${b.oppAbbr}` : `@ ${b.oppAbbr}`,
            isOffDay: false,
            isStarter,
            isGS: isStarter,
            pitched: true,
            pitches,
            strikes,
            ip: ipStr,
            ipDecimal: outs / 3,
            er,
            so,
            bb,
            h,
            decision,
            loadLevel,
          });
        }
      }
    }

    // 5. Construir ítems de cada lanzador y clasificar rol FanGraphs
    const relieversList: RelieverBudgetItem[] = Array.from(pitcherMap.values()).map((p) => {
      // Matriz de uso diaria para todos los días del calendario (incluyendo Días Libres)
      const dailyUsage: RelieverDayUsage[] = calendarDates.map((dStr) => {
        const { dayLabel, dayOfWeek } = formatDayLabel(dStr);
        const boxesOnDate = validBoxes.filter((b) => b.gameDate === dStr);
        const isOffDay = boxesOnDate.length === 0;

        if (isOffDay) {
          return {
            date: dStr,
            dayLabel,
            dayOfWeek,
            gamePk: 0,
            opponent: "Día Libre",
            isOffDay: true,
            isStarter: false,
            isGS: false,
            pitched: false,
            pitches: 0,
            strikes: 0,
            ip: "0.0",
            ipDecimal: 0,
            er: 0,
            so: 0,
            bb: 0,
            h: 0,
            decision: "",
            loadLevel: "rest",
          };
        }

        if (p.gameOutingsByDate.has(dStr)) {
          const app = p.gameOutingsByDate.get(dStr);
          return {
            ...app,
            dayLabel,
            dayOfWeek,
          };
        }

        const mainBox = boxesOnDate[0];
        return {
          date: dStr,
          dayLabel,
          dayOfWeek,
          gamePk: mainBox.gamePk,
          opponent: mainBox.isHome ? `vs ${mainBox.oppAbbr}` : `@ ${mainBox.oppAbbr}`,
          isOffDay: false,
          isStarter: false,
          isGS: false,
          pitched: false,
          pitches: 0,
          strikes: 0,
          ip: "0.0",
          ipDecimal: 0,
          er: 0,
          so: 0,
          bb: 0,
          h: 0,
          decision: "",
          loadLevel: "rest",
        };
      });

      // Cálculo de cargas acumuladas rolling (en la ventana de días calendario)
      const last3 = dailyUsage.slice(-3);
      const last5 = dailyUsage.slice(-5);

      const pitchesLast3Days = last3.reduce((sum, u) => sum + u.pitches, 0);
      const pitchesLast5Days = last5.reduce((sum, u) => sum + u.pitches, 0);
      const totalPitchesWeek = dailyUsage.reduce((sum, u) => sum + u.pitches, 0);
      const totalOutsWeek = dailyUsage.reduce((sum, u) => sum + Math.round(u.ipDecimal * 3), 0);
      const totalInningsWeek = formatOutsToIp(totalOutsWeek);

      // Días consecutivos lanzados en el tramo final (los días libres rompen la racha)
      let consecutiveDaysPitched = 0;
      for (let i = dailyUsage.length - 1; i >= 0; i--) {
        if (dailyUsage[i].pitched && dailyUsage[i].pitches > 0) {
          consecutiveDaysPitched++;
        } else {
          break;
        }
      }

      // Días transcurridos desde su última aparición
      let daysSinceLastPitched = 99;
      for (let i = dailyUsage.length - 1; i >= 0; i--) {
        if (dailyUsage[i].pitched && dailyUsage[i].pitches > 0) {
          daysSinceLastPitched = dailyUsage.length - 1 - i;
          break;
        }
      }

      // Clasificación de Rol FanGraphs Depth Chart
      const isStarterStaff = p.startsCount > 0 && p.startsCount >= p.gamesCount * 0.5;
      let role: "Starter" | "Closer" | "Setup" | "High Leverage" | "Middle Relief" | "Long Relief" =
        "Middle Relief";
      let roleAbbr: "SP" | "CL" | "SU" | "HL" | "MR" | "LR" = "MR";

      if (isStarterStaff) {
        role = "Starter";
        roleAbbr = "SP";
      } else if (p.totalSaves >= 2) {
        role = "Closer";
        roleAbbr = "CL";
      } else if (p.totalHolds >= 2 || (p.totalSaves >= 1 && p.totalHolds >= 1)) {
        role = "Setup";
        roleAbbr = "SU";
      } else if (p.gamesCount >= 3 && p.totalSo >= 4) {
        role = "High Leverage";
        roleAbbr = "HL";
      } else if (p.totalIpOuts / Math.max(1, p.gamesCount) >= 4.5 || p.startsCount > 0) {
        role = "Long Relief";
        roleAbbr = "LR";
      }

      // Veredicto de disponibilidad / fatiga
      const lastApp = dailyUsage[dailyUsage.length - 1];
      const prevApp = dailyUsage[dailyUsage.length - 2];

      let availabilityStatus: "available" | "caution" | "unavailable" = "available";
      let availabilityLabel: "Disponible" | "Precaución" | "Fatiga / Descanso" = "Disponible";

      if (isStarterStaff) {
        // Criterios fisiológicos para abridores (recuperación de 4-5 días tras 50+ pitcheos)
        if (daysSinceLastPitched <= 2) {
          availabilityStatus = "unavailable";
          availabilityLabel = "Fatiga / Descanso";
        } else if (daysSinceLastPitched === 3) {
          availabilityStatus = "caution";
          availabilityLabel = "Precaución";
        } else {
          availabilityStatus = "available";
          availabilityLabel = "Disponible";
        }
      } else {
        // Criterios para cuerpo de relevo
        if (consecutiveDaysPitched >= 3) {
          availabilityStatus = "unavailable";
          availabilityLabel = "Fatiga / Descanso";
        } else if (lastApp.pitches >= 30) {
          availabilityStatus = "unavailable";
          availabilityLabel = "Fatiga / Descanso";
        } else if (
          consecutiveDaysPitched === 2 &&
          lastApp.pitches + (prevApp?.pitches || 0) >= 32
        ) {
          availabilityStatus = "unavailable";
          availabilityLabel = "Fatiga / Descanso";
        } else if (consecutiveDaysPitched === 2) {
          availabilityStatus = "caution";
          availabilityLabel = "Precaución";
        } else if (lastApp.pitches >= 18) {
          availabilityStatus = "caution";
          availabilityLabel = "Precaución";
        } else if (pitchesLast3Days >= 38) {
          availabilityStatus = "caution";
          availabilityLabel = "Precaución";
        }
      }

      // Métricas de temporada para la tarjeta
      const ipDec = p.totalIpOuts / 3;
      const eraVal = ipDec > 0 ? (p.totalEr * 9) / ipDec : 0;
      const whipVal = ipDec > 0 ? (p.totalBb + p.totalH) / ipDec : 0;

      return {
        pitcherId: p.id,
        pitcherName: p.name,
        headshot: getPlayerHeadshotUrl(p.id),
        role,
        roleAbbr,
        throws: p.throws,
        isStarterStaff,
        seasonStats: {
          games: p.gamesCount,
          gs: p.startsCount,
          era: eraVal.toFixed(2),
          whip: whipVal.toFixed(2),
          sv: p.totalSaves,
          holds: p.totalHolds,
          so: p.totalSo,
          totalIp: formatOutsToIp(p.totalIpOuts),
        },
        dailyUsage,
        summary: {
          pitchesLast3Days,
          pitchesLast5Days,
          totalPitchesWeek,
          totalInningsWeek,
          totalOutsWeek,
          consecutiveDaysPitched,
          daysSinceLastPitched,
          availabilityStatus,
          availabilityLabel,
        },
      };
    });

    // Ordenar por Jerarquía FanGraphs: SP -> CL -> SU -> HL -> MR -> LR
    const roleWeight: Record<string, number> = {
      SP: 1,
      CL: 2,
      SU: 3,
      HL: 4,
      MR: 5,
      LR: 6,
    };

    relieversList.sort((a, b) => {
      const wA = roleWeight[a.roleAbbr] || 99;
      const wB = roleWeight[b.roleAbbr] || 99;
      if (wA !== wB) return wA - wB;
      return b.seasonStats.games - a.seasonStats.games || b.summary.totalPitchesWeek - a.summary.totalPitchesWeek;
    });

    // 6. KPIs de Salud del Staff
    const availableArms = relieversList.filter((r) => r.summary.availabilityStatus === "available").length;
    const cautionArms = relieversList.filter((r) => r.summary.availabilityStatus === "caution").length;
    const unavailableArms = relieversList.filter((r) => r.summary.availabilityStatus === "unavailable").length;

    const teamPitchesLast3Days = relieversList.reduce((acc, r) => acc + r.summary.pitchesLast3Days, 0);
    const teamPitchesLast5Days = relieversList.reduce((acc, r) => acc + r.summary.pitchesLast5Days, 0);

    const mostWorked = [...relieversList].sort((a, b) => b.summary.totalPitchesWeek - a.summary.totalPitchesWeek)[0];

    const budgetData: BullpenBudgetData = {
      teamId,
      teamName: teamObj.name || "Equipo",
      teamLogo: teamObj.logoUrl,
      season: effectiveSeason,
      dates: datesMeta,
      relievers: relieversList,
      kpis: {
        availableArms,
        cautionArms,
        unavailableArms,
        totalRelievers: relieversList.length,
        teamPitchesLast3Days,
        teamPitchesLast5Days,
        mostWorkedReliever: mostWorked ? mostWorked.pitcherName : "Sin datos",
        mostWorkedPitches: mostWorked ? mostWorked.summary.pitchesLast3Days : 0,
      },
    };

    budgetCache.set(cacheKey, { timestamp: now, data: budgetData });
    return budgetData;
  } catch (error) {
    console.error("Error computing bullpen budget:", error);
    return emptyBudget;
  }
}
