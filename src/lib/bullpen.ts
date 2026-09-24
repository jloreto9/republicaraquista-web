import fs from "fs";
import path from "path";
import { getTeam, LVBP_TEAMS } from "./constants";
import {
  RelieverInheritedStat,
  InheritedLog,
  StarterSlot,
  GameLineup,
  TopLineup,
  PlayerSlotBreakdown,
  PlayerLineupImpact,
  BullpenAndLineupsData,
} from "@/types/bullpen";

const LEONES_TEAM_ID = 695;

interface RawBullpenRecord {
  team_id?: number;
  pitcher_id?: number;
  pitcher_name?: string;
  inherited_runners?: number;
  inherited_scored?: number;
  game_pk?: number;
  game_id?: number;
  game_date?: string;
  opposing_team?: string;
  inning?: number;
}

interface RawStarter {
  order?: number;
  player_id?: number;
  player_name?: string;
  position?: string;
}

interface RawLineupRecord {
  team_id?: number;
  game_pk?: number;
  game_id?: number;
  game_date?: string;
  opposing_team?: string;
  opponent_id?: number;
  leones_won?: boolean;
  won?: number;
  leones_score?: number;
  opposing_score?: number;
  score_str?: string;
  is_home?: boolean;
  starters?: RawStarter[];
}

export function getBullpenAndLineups(
  season = 2025,
  teamId = LEONES_TEAM_ID
): BullpenAndLineupsData {
  const emptyResult: BullpenAndLineupsData = {
    bullpen: {
      kpis: {
        totalIr: 0,
        totalIrs: 0,
        irsPct: "0.0%",
        bestReliever: "N/A",
        bestRelieverSub: "Sin registros calificados",
      },
      relievers: [],
      logs: [],
    },
    lineups: {
      kpis: {
        totalGames: 0,
        totalPlayers: 0,
        topStarter: "N/A",
        topStarterJj: "0 JJ",
        topCleanup: "N/A",
        topCleanupJj: "0 JJ",
      },
      gameLineups: [],
      topFrequentLineups: [],
      heatmap: [],
      playerImpacts: {},
      availablePlayers: [],
    },
  };

  try {
    const filePath = path.join(process.cwd(), "src", "data", `lvbp_season_${season}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`Archivo de snapshot no encontrado: ${filePath}`);
      return emptyResult;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);

    const bpRecords: RawBullpenRecord[] = (data.bullpen_records || []).filter(
      (b: RawBullpenRecord) => Number(b.team_id) === teamId
    );

    const luRecords: RawLineupRecord[] = (data.lineup_records || []).filter(
      (l: RawLineupRecord) => Number(l.team_id) === teamId
    );

    // ── 1. PROCESAR BULLPEN ──
    const pitcherMap: Record<
      string,
      {
        pitcherId: number;
        pitcherName: string;
        appearances: number;
        ir: number;
        irs: number;
      }
    > = {};

    let totalIr = 0;
    let totalIrs = 0;

    bpRecords.forEach((b: RawBullpenRecord) => {
      const pName = b.pitcher_name || "Desconocido";
      const pId = Number(b.pitcher_id || 0);
      const ir = Number(b.inherited_runners || 0);
      const irs = Number(b.inherited_scored || 0);

      totalIr += ir;
      totalIrs += irs;

      if (!pitcherMap[pName]) {
        pitcherMap[pName] = {
          pitcherId: pId,
          pitcherName: pName,
          appearances: 0,
          ir: 0,
          irs: 0,
        };
      }

      pitcherMap[pName].appearances += 1;
      pitcherMap[pName].ir += ir;
      pitcherMap[pName].irs += irs;
    });

    const relievers: RelieverInheritedStat[] = Object.values(pitcherMap).map((p) => {
      const irsPctNum = p.ir > 0 ? Number(((p.irs / p.ir) * 100).toFixed(1)) : 0.0;
      return {
        pitcherId: p.pitcherId,
        pitcherName: p.pitcherName,
        appearances: p.appearances,
        ir: p.ir,
        irs: p.irs,
        irsPct: `${irsPctNum.toFixed(1)}%`,
        irsPctNum,
      };
    });

    // Ordenar relevistas por IR descendente, luego por mejor IRS%
    relievers.sort((a, b) => b.ir - a.ir || a.irsPctNum - b.irsPctNum);

    // Mejor relevista apagafuegos con mín. 5 IR
    const qualifiedRelievers = relievers.filter((r) => r.ir >= 5);
    qualifiedRelievers.sort((a, b) => a.irsPctNum - b.irsPctNum || b.ir - a.ir);

    const bestRelieverObj = qualifiedRelievers[0];
    const bestReliever = bestRelieverObj ? bestRelieverObj.pitcherName : "N/A";
    const bestRelieverSub = bestRelieverObj
      ? `${bestRelieverObj.irsPct} IRS (${bestRelieverObj.irs}/${bestRelieverObj.ir} anotaron)`
      : "Sin calificados (mín. 5 IR)";

    const overallIrsPct =
      totalIr > 0 ? `${((totalIrs / totalIr) * 100).toFixed(1)}%` : "0.0%";

    // Logs detallados
    const logs: InheritedLog[] = bpRecords.slice(0, 50).map((b: RawBullpenRecord) => ({
      gamePk: Number(b.game_pk || b.game_id || 0),
      gameDate: String(b.game_date || ""),
      opp: String(b.opposing_team || "Rival"),
      inning: Number(b.inning || 1),
      pitcher: String(b.pitcher_name || "Desconocido"),
      ir: Number(b.inherited_runners || 0),
      irs: Number(b.inherited_scored || 0),
    }));

    // ── 2. PROCESAR LINEUPS ──
    const gameLineups: GameLineup[] = [];
    const playerAppearances: Record<
      string,
      {
        totalStarts: number;
        turnCounts: number[]; // 0..8
        wins: number;
        losses: number;
        orderBreakdown: Record<number, { starts: number; wins: number; losses: number }>;
      }
    > = {};

    const lineupCombinationsMap: Record<
      string,
      {
        starters: StarterSlot[];
        games: number;
        wins: number;
        losses: number;
        gamesDetailList: string[];
      }
    > = {};

    const cleanupCounts: Record<string, number> = {};

    luRecords.forEach((lu: RawLineupRecord) => {
      const gPk = Number(lu.game_pk || lu.game_id || 0);
      const gDate = String(lu.game_date || "");
      const opp = String(
        lu.opposing_team || LVBP_TEAMS[Number(lu.opponent_id)]?.name || "Rival"
      );
      const oppId = Number(lu.opponent_id || 0);
      const oppObj = getTeam(oppId);

      const won = Boolean(lu.leones_won ?? (lu.won === 1));
      const leonesScore = Number(lu.leones_score || 0);
      const oppScore = Number(lu.opposing_score || 0);
      const scoreStr = String(lu.score_str || `${leonesScore}-${oppScore}`);

      const rawStarters: RawStarter[] = lu.starters || [];
      const starters: StarterSlot[] = rawStarters.map((s: RawStarter) => {
        const orderNum = Number(s.order || 1);
        let badgeColor = "#3b82f6"; // 1-3
        if (orderNum === 4) badgeColor = "#f59e0b"; // 4to bate
        else if (orderNum >= 5) badgeColor = "#8b5cf6"; // 5-9

        return {
          order: orderNum,
          playerId: Number(s.player_id || 0),
          playerName: String(s.player_name || "Desconocido"),
          position: String(s.position || "-"),
          badgeColor,
        };
      });

      starters.sort((a, b) => a.order - b.order);

      gameLineups.push({
        gamePk: gPk,
        gameDate: gDate,
        opp,
        oppLogo: oppObj.logoUrl,
        isHome: Boolean(lu.is_home),
        leonesScore,
        oppScore,
        won,
        scoreStr,
        starters,
      });

      // Registrar titulares individuales
      starters.forEach((st) => {
        const pName = st.playerName;
        const ord = st.order; // 1..9

        if (ord === 4) {
          cleanupCounts[pName] = (cleanupCounts[pName] || 0) + 1;
        }

        if (!playerAppearances[pName]) {
          playerAppearances[pName] = {
            totalStarts: 0,
            turnCounts: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            wins: 0,
            losses: 0,
            orderBreakdown: {},
          };
        }

        const pa = playerAppearances[pName];
        pa.totalStarts += 1;
        if (ord >= 1 && ord <= 9) {
          pa.turnCounts[ord - 1] += 1;
        }

        if (won) pa.wins += 1;
        else pa.losses += 1;

        if (!pa.orderBreakdown[ord]) {
          pa.orderBreakdown[ord] = { starts: 0, wins: 0, losses: 0 };
        }
        pa.orderBreakdown[ord].starts += 1;
        if (won) pa.orderBreakdown[ord].wins += 1;
        else pa.orderBreakdown[ord].losses += 1;
      });

      // Registrar combinaciones de alineación completa
      if (starters.length === 9) {
        const comboKey = starters.map((s) => s.playerName).join(" | ");
        if (!lineupCombinationsMap[comboKey]) {
          lineupCombinationsMap[comboKey] = {
            starters,
            games: 0,
            wins: 0,
            losses: 0,
            gamesDetailList: [],
          };
        }
        const comb = lineupCombinationsMap[comboKey];
        comb.games += 1;
        if (won) comb.wins += 1;
        else comb.losses += 1;
        comb.gamesDetailList.push(`${gDate} vs ${opp} (${won ? "G" : "P"})`);
      }
    });

    // Top alineaciones frecuentes
    const topFrequentLineups: TopLineup[] = Object.values(lineupCombinationsMap)
      .sort((a, b) => b.games - a.games || b.wins - a.wins)
      .slice(0, 10)
      .map((c, idx) => {
        const total = c.games;
        const pct = total > 0 ? (c.wins / total).toFixed(3).replace(/^0/, "") : ".000";
        return {
          rank: idx + 1,
          games: c.games,
          record: `${c.wins}G - ${c.losses}P`,
          pct,
          starters: c.starters,
          gamesDetail: c.gamesDetailList.slice(0, 4).join(" • "),
        };
      });

    // Matriz de Calor: Top 15 jugadores con más titularidades
    const sortedPlayers = Object.entries(playerAppearances).sort(
      (a, b) => b[1].totalStarts - a[1].totalStarts
    );

    const heatmap = sortedPlayers.slice(0, 15).map(([pName, pData]) => ({
      player: pName,
      counts: pData.turnCounts,
      total: pData.totalStarts,
    }));

    // Desglose de Impacto por Jugador
    const playerImpacts: Record<string, PlayerLineupImpact> = {};
    sortedPlayers.forEach(([pName, pData]) => {
      const pct =
        pData.totalStarts > 0
          ? (pData.wins / pData.totalStarts).toFixed(3).replace(/^0/, "")
          : ".000";

      const breakdown: PlayerSlotBreakdown[] = Object.entries(pData.orderBreakdown)
        .map(([slotStr, val]) => {
          const sNum = Number(slotStr);
          const sPct =
            val.starts > 0 ? (val.wins / val.starts).toFixed(3).replace(/^0/, "") : ".000";
          return {
            slot: `${sNum}º Bate`,
            starts: val.starts,
            wins: val.wins,
            losses: val.losses,
            pct: sPct,
          };
        })
        .sort((a, b) => parseInt(a.slot) - parseInt(b.slot));

      playerImpacts[pName] = {
        playerName: pName,
        games: pData.totalStarts,
        record: `${pData.wins}G - ${pData.losses}P`,
        pct,
        breakdown,
      };
    });

    const topStarterEntry = sortedPlayers[0];
    const topStarter = topStarterEntry ? topStarterEntry[0] : "N/A";
    const topStarterJj = topStarterEntry ? `${topStarterEntry[1].totalStarts} JJ` : "0 JJ";

    const topCleanupEntry = Object.entries(cleanupCounts).sort((a, b) => b[1] - a[1])[0];
    const topCleanup = topCleanupEntry ? topCleanupEntry[0] : "N/A";
    const topCleanupJj = topCleanupEntry
      ? `${topCleanupEntry[1]} titularidades`
      : "0 titularidades";

    return {
      bullpen: {
        kpis: {
          totalIr,
          totalIrs,
          irsPct: overallIrsPct,
          bestReliever,
          bestRelieverSub,
        },
        relievers,
        logs,
      },
      lineups: {
        kpis: {
          totalGames: gameLineups.length,
          totalPlayers: sortedPlayers.length,
          topStarter,
          topStarterJj,
          topCleanup,
          topCleanupJj,
        },
        gameLineups,
        topFrequentLineups,
        heatmap,
        playerImpacts,
        availablePlayers: sortedPlayers.map(([name]) => name),
      },
    };
  } catch (err) {
    console.error("Error computing bullpen and lineup data:", err);
    return emptyResult;
  }
}
