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
  season = 2026,
  teamId = 695
): Promise<BullpenBudgetData> {
  const cacheKey = `${season}_${teamId}`;
  const cached = budgetCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 180000) { // 3 min cache
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
      mostWorkedReliever: "N/A",
      mostWorkedPitches: 0,
    },
  };

  try {
    // 1. Consultar calendario del equipo en la temporada solicitada
    let targetSeason = season;
    let schedUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${targetSeason}&teamId=${teamId}&hydrate=linescore`;
    let res = await fetch(schedUrl, { headers: HEADERS, next: { revalidate: 300 } });
    let schedData = res.ok ? await res.json() : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allGames = (schedData?.dates || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((d: any) => d.games || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((g: any) =>
        ["Final", "Completed", "Game Over", "Completed Early"].includes(
          g.status?.detailedState || g.status?.abstractGameState
        )
      );

    // Fallback si la temporada solicitada (ej. 2026 antes de iniciar) no tiene juegos finalizados aún
    if (allGames.length === 0 && season >= 2026) {
      targetSeason = 2025;
      schedUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=17&leagueId=135&season=${targetSeason}&teamId=${teamId}&hydrate=linescore`;
      res = await fetch(schedUrl, { headers: HEADERS, next: { revalidate: 300 } });
      schedData = res.ok ? await res.json() : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allGames = (schedData?.dates || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .flatMap((d: any) => d.games || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((g: any) =>
          ["Final", "Completed", "Game Over", "Completed Early"].includes(
            g.status?.detailedState || g.status?.abstractGameState
          )
        );
    }

    if (!allGames.length) {
      return emptyBudget;
    }

    // Tomar los últimos 6 juegos del equipo (ciclo semanal típico en LVBP)
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

    // Metadatos de columnas de fechas
    const datesMeta = validBoxes.map((b) => {
      const { dayLabel, dayOfWeek } = formatDayLabel(b.gameDate);
      return {
        date: b.gameDate,
        dayLabel,
        dayOfWeek,
        opponent: b.isHome ? `vs ${b.oppAbbr}` : `@ ${b.oppAbbr}`,
        gamePk: b.gamePk,
      };
    });

    // 3. Recopilar relevistas únicos que hayan lanzado en la ventana
    const pitcherMap = new Map<
      number,
      {
        id: number;
        name: string;
        throws: "R" | "L";
        gamesCount: number;
        totalEr: number;
        totalSo: number;
        totalIpOuts: number;
        totalSaves: number;
        totalHolds: number;
        totalBb: number;
        totalH: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gameOutings: Map<number, any>;
      }
    >();

    for (const b of validBoxes) {
      // El abridor es el primer lanzador registrado en el boxscore
      const starterId = b.pitchers[0];
      const relievers = b.pitchers.slice(1);

      for (const pId of relievers) {
        if (!pId) continue;
        const pData = b.players[`ID${pId}`];
        if (!pData) continue;
        const stats = pData.stats?.pitching || {};
        const name = pData.person?.fullName || "Relevista";
        const throws = (pData.pitchHand?.code as "R" | "L") || "R";

        if (!pitcherMap.has(pId)) {
          pitcherMap.set(pId, {
            id: pId,
            name,
            throws,
            gamesCount: 0,
            totalEr: 0,
            totalSo: 0,
            totalIpOuts: 0,
            totalSaves: 0,
            totalHolds: 0,
            totalBb: 0,
            totalH: 0,
            gameOutings: new Map(),
          });
        }

        const pRec = pitcherMap.get(pId)!;
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

        pRec.gamesCount += 1;
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

        pRec.gameOutings.set(b.gamePk, {
          gamePk: b.gamePk,
          date: b.gameDate,
          opponent: b.isHome ? `vs ${b.oppAbbr}` : `@ ${b.oppAbbr}`,
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

    // 4. Construir ítems de cada relevista y clasificar rol FanGraphs
    const relieversList: RelieverBudgetItem[] = Array.from(pitcherMap.values()).map((p) => {
      // Matriz de uso diaria para los juegos en orden cronológico
      const dailyUsage: RelieverDayUsage[] = validBoxes.map((b) => {
        const { dayLabel, dayOfWeek } = formatDayLabel(b.gameDate);
        if (p.gameOutings.has(b.gamePk)) {
          const app = p.gameOutings.get(b.gamePk);
          return {
            ...app,
            dayLabel,
            dayOfWeek,
          };
        }
        return {
          date: b.gameDate,
          dayLabel,
          dayOfWeek,
          gamePk: b.gamePk,
          opponent: b.isHome ? `vs ${b.oppAbbr}` : `@ ${b.oppAbbr}`,
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

      // Cálculo de cargas acumuladas rolling
      const last3 = dailyUsage.slice(-3);
      const last5 = dailyUsage.slice(-5);

      const pitchesLast3Days = last3.reduce((sum, u) => sum + u.pitches, 0);
      const pitchesLast5Days = last5.reduce((sum, u) => sum + u.pitches, 0);
      const totalPitchesWeek = dailyUsage.reduce((sum, u) => sum + u.pitches, 0);
      const totalOutsWeek = dailyUsage.reduce((sum, u) => sum + Math.round(u.ipDecimal * 3), 0);
      const totalInningsWeek = formatOutsToIp(totalOutsWeek);

      // Días consecutivos lanzados en el tramo final
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

      // Veredicto de disponibilidad / fatiga
      const lastApp = dailyUsage[dailyUsage.length - 1];
      const prevApp = dailyUsage[dailyUsage.length - 2];

      let availabilityStatus: "available" | "caution" | "unavailable" = "available";
      let availabilityLabel: "Disponible" | "Precaución" | "Fatiga / Descanso" = "Disponible";

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

      // Asignar Rol FanGraphs
      let role: "Closer" | "Setup" | "High Leverage" | "Middle Relief" | "Long Relief" =
        "Middle Relief";
      let roleAbbr: "CL" | "SU" | "HL" | "MR" | "LR" = "MR";

      if (p.totalSaves >= 2) {
        role = "Closer";
        roleAbbr = "CL";
      } else if (p.totalHolds >= 2 || (p.totalSaves >= 1 && p.totalHolds >= 1)) {
        role = "Setup";
        roleAbbr = "SU";
      } else if (p.gamesCount >= 3 && p.totalSo >= 4) {
        role = "High Leverage";
        roleAbbr = "HL";
      } else if (p.totalIpOuts / Math.max(1, p.gamesCount) >= 4.5) { // 1.2+ IP por salida
        role = "Long Relief";
        roleAbbr = "LR";
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
        seasonStats: {
          games: p.gamesCount,
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

    // Ordenar por Jerarquía de Bullpen FanGraphs: CL -> SU -> HL -> MR -> LR
    const roleWeight: Record<string, number> = {
      CL: 1,
      SU: 2,
      HL: 3,
      MR: 4,
      LR: 5,
    };

    relieversList.sort((a, b) => {
      const wA = roleWeight[a.roleAbbr] || 99;
      const wB = roleWeight[b.roleAbbr] || 99;
      if (wA !== wB) return wA - wB;
      return b.seasonStats.games - a.seasonStats.games || b.summary.totalPitchesWeek - a.summary.totalPitchesWeek;
    });

    // 5. KPIs de Salud del Bullpen
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
      season: targetSeason,
      dates: datesMeta,
      relievers: relieversList,
      kpis: {
        availableArms,
        cautionArms,
        unavailableArms,
        totalRelievers: relieversList.length,
        teamPitchesLast3Days,
        teamPitchesLast5Days,
        mostWorkedReliever: mostWorked ? mostWorked.pitcherName : "N/A",
        mostWorkedPitches: mostWorked ? mostWorked.summary.totalPitchesWeek : 0,
      },
    };

    budgetCache.set(cacheKey, { timestamp: Date.now(), data: budgetData });
    return budgetData;
  } catch (err) {
    console.error("Exception in getBullpenBudget:", err);
    return emptyBudget;
  }
}
