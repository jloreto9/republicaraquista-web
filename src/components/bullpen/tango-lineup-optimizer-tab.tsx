"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Shuffle,
  Zap,
  Layers,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  UserPlus,
  UserMinus,
} from "lucide-react";
import {
  GameLineup,
  TopLineup,
  StarterSlot,
  TodayLineupStatus,
} from "@/types/bullpen";
import {
  TangoPlayer,
  TangoOptimizationResult,
  TangoStatsSource,
  ActiveRosterBatter,
  BestLineupConstraintMode,
  BestAvailableLineupResult,
} from "@/types/tango-lineup";
import {
  resolvePlayerStats,
  optimizeTangoLineup,
  buildBestAvailableLineup,
  LVBP_REGULAR_SEASON_GAMES,
} from "@/lib/tango-lineup-engine";
import { cn } from "@/lib/utils";

type OptimizerMode = "game_lineup" | "best_available";

const MIN_PA_OPTIONS = [
  { value: 10, label: "Mín. 10 PA" },
  { value: 0, label: "Todos (0 PA)" },
  { value: 20, label: "Mín. 20 PA" },
  { value: 35, label: "Mín. 35 PA" },
] as const;

interface TangoLineupOptimizerTabProps {
  gameLineups?: GameLineup[];
  topFrequentLineups?: TopLineup[];
  todayLineup?: GameLineup | null;
  todayLineupStatus?: TodayLineupStatus;
  requestedLineup?: GameLineup | null;
  playerStatsMap?: Record<number, TangoPlayer>;
  activeRosterPool?: ActiveRosterBatter[];
  initialGamePk?: number;
  teamName?: string;
  season?: number;
}

function formatStatsSourceBadge(source?: TangoStatsSource): {
  label: string;
  className: string;
} {
  switch (source) {
    case "supabase":
      return {
        label: "Temporada BD",
        className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      };
    case "mlb":
      return {
        label: "MLB API",
        className: "bg-sky-500/15 text-sky-300 border-sky-500/30",
      };
    case "canonical_map":
      return {
        label: "Base Club",
        className: "bg-amber-500/15 text-[#FDB827] border-amber-500/30",
      };
    default:
      return {
        label: "Estimado",
        className: "bg-slate-700/40 text-slate-300 border-slate-600/40",
      };
  }
}

function formatRate(value: number): string {
  if (!Number.isFinite(value)) return ".000";
  return value.toFixed(3).replace(/^0(?=\.)/, "");
}

function formatGameStatusEs(status?: "Live" | "Final" | "Preview"): string {
  switch (status) {
    case "Live":
      return "En Vivo";
    case "Preview":
      return "Pre-Juego";
    case "Final":
      return "Final";
    default:
      return "Programado";
  }
}

export function TangoLineupOptimizerTab({
  gameLineups = [],
  topFrequentLineups = [],
  todayLineup = null,
  todayLineupStatus,
  requestedLineup = null,
  playerStatsMap,
  activeRosterPool = [],
  initialGamePk,
  teamName = "Leones del Caracas",
  season = 2026,
}: TangoLineupOptimizerTabProps) {
  const hasTodayLineup = Boolean(
    todayLineup && todayLineup.starters && todayLineup.starters.length >= 9
  );
  const hasRequestedLineup = Boolean(
    requestedLineup &&
      requestedLineup.starters &&
      requestedLineup.starters.length >= 9
  );
  const showDistinctRequestedOption = Boolean(
    hasRequestedLineup &&
      requestedLineup &&
      (!hasTodayLineup ||
        requestedLineup.gamePk !== todayLineup?.gamePk ||
        (requestedLineup.teamId !== undefined &&
          todayLineup?.teamId !== undefined &&
          requestedLineup.teamId !== todayLineup.teamId))
  );

  // Determinar clave inicial por defecto: gamePk solicitado -> lineup publicado de hoy -> más frecuente -> último juego
  const defaultKey = useMemo(() => {
    if (initialGamePk) {
      if (hasRequestedLineup && requestedLineup?.gamePk === initialGamePk) {
        return "requested";
      }
      if (hasTodayLineup && todayLineup?.gamePk === initialGamePk) {
        return "today";
      }
      const matchIdx = gameLineups.findIndex(
        (g) => g.gamePk === initialGamePk && g.starters && g.starters.length >= 9
      );
      if (matchIdx >= 0) {
        return `game_${matchIdx}`;
      }
    }
    if (hasTodayLineup) {
      return "today";
    }
    if (topFrequentLineups && topFrequentLineups.length > 0) {
      return "top_0";
    }
    if (gameLineups && gameLineups.length > 0) {
      return "game_0";
    }
    return "top_0";
  }, [
    initialGamePk,
    hasRequestedLineup,
    requestedLineup,
    hasTodayLineup,
    todayLineup,
    topFrequentLineups,
    gameLineups,
  ]);

  const [selectedLineupKey, setSelectedLineupKey] = useState<string>(defaultKey);
  const [showTheoryGuide, setShowTheoryGuide] = useState<boolean>(false);

  // Estado del modo dual: Del Juego vs Mejor Posible (Roster Activo)
  const [optimizerMode, setOptimizerMode] = useState<OptimizerMode>("game_lineup");
  const [constraintMode, setConstraintMode] =
    useState<BestLineupConstraintMode>("defensive_valid");
  const [minPlateAppearances, setMinPlateAppearances] = useState<number>(10);
  const [excludedPlayerIds, setExcludedPlayerIds] = useState<number[]>([]);
  const [showRosterPanel, setShowRosterPanel] = useState<boolean>(true);

  // Sincronizar clave si cambian los datos o el gamePk solicitado
  useEffect(() => {
    setSelectedLineupKey(defaultKey);
  }, [defaultKey]);

  // Generar conjunto inicial de 9 jugadores desde la alineación real seleccionada
  const { initialPlayers, contextTitle, contextSubtitle } = useMemo(() => {
    let starters: StarterSlot[] = [];
    let title = "Alineación Real";
    let subtitle = `Temporada ${season}`;

    const formatLineupSubtitle = (g: GameLineup) => {
      const statusText = formatGameStatusEs(g.status);
      const locText = g.isHome ? "Home Club" : "Visitante";
      if (g.status === "Preview") {
        return `${statusText} • ${locText}`;
      }
      const resultText = g.won ? "Victoria" : "Derrota";
      return g.scoreStr
        ? `${statusText} • ${resultText} ${g.scoreStr} • ${locText}`
        : `${statusText} • ${locText}`;
    };

    if (selectedLineupKey === "requested" && hasRequestedLineup && requestedLineup) {
      starters = requestedLineup.starters.slice(0, 9);
      const dhSuffix =
        requestedLineup.gameNumber && requestedLineup.gameNumber > 1
          ? ` · Juego ${requestedLineup.gameNumber}`
          : "";
      title = `${
        requestedLineup.teamName ? `${requestedLineup.teamName} vs ` : "Juego vs "
      }${requestedLineup.opp} (${requestedLineup.gameDate})${dhSuffix}`;
      subtitle = formatLineupSubtitle(requestedLineup);
    } else if (selectedLineupKey === "today" && hasTodayLineup && todayLineup) {
      starters = todayLineup.starters.slice(0, 9);
      const dhSuffix =
        todayLineup.gameNumber && todayLineup.gameNumber > 1
          ? ` · Juego ${todayLineup.gameNumber}`
          : "";
      title = `Lineup de Hoy vs ${todayLineup.opp} (${todayLineup.gameDate})${dhSuffix}`;
      subtitle = formatLineupSubtitle(todayLineup);
    } else if (selectedLineupKey.startsWith("top_")) {
      const idx = parseInt(selectedLineupKey.replace("top_", ""), 10);
      const top = topFrequentLineups[idx] || topFrequentLineups[0];
      if (top && top.starters && top.starters.length > 0) {
        starters = top.starters.slice(0, 9);
        title = `Alineación Más Frecuente #${top.rank || idx + 1}`;
        subtitle = `${top.games} Juegos disputados • Récord: ${top.record} (PCT ${top.pct})`;
      }
    } else if (selectedLineupKey.startsWith("game_")) {
      const idx = parseInt(selectedLineupKey.replace("game_", ""), 10);
      const g = gameLineups[idx] || gameLineups[0];
      if (g && g.starters && g.starters.length > 0) {
        starters = g.starters.slice(0, 9);
        title = `Juego vs ${g.opp} (${g.gameDate})`;
        subtitle = `${g.won ? "Victoria" : "Derrota"} ${g.scoreStr} • ${g.isHome ? "Home Club" : "Visitante"}`;
      }
    }

    // Fallback de contingencia si no hubiese starters en la clave exacta
    if (starters.length === 0) {
      if (hasTodayLineup && todayLineup) {
        starters = todayLineup.starters.slice(0, 9);
        title = `Lineup de Hoy vs ${todayLineup.opp} (${todayLineup.gameDate})`;
        subtitle = formatLineupSubtitle(todayLineup);
      } else if (hasRequestedLineup && requestedLineup) {
        starters = requestedLineup.starters.slice(0, 9);
        title = `Juego vs ${requestedLineup.opp} (${requestedLineup.gameDate})`;
        subtitle = formatLineupSubtitle(requestedLineup);
      } else if (
        topFrequentLineups.length > 0 &&
        topFrequentLineups[0].starters.length > 0
      ) {
        starters = topFrequentLineups[0].starters.slice(0, 9);
        title = `Alineación Más Frecuente #1`;
        subtitle = `${topFrequentLineups[0].games} JJ • ${topFrequentLineups[0].record}`;
      } else if (gameLineups.length > 0 && gameLineups[0].starters.length > 0) {
        starters = gameLineups[0].starters.slice(0, 9);
        title = `Juego vs ${gameLineups[0].opp} (${gameLineups[0].gameDate})`;
        subtitle = `${gameLineups[0].won ? "Victoria" : "Derrota"} ${gameLineups[0].scoreStr}`;
      }
    }

    const resolved: TangoPlayer[] = starters.map((s, idx) => {
      return resolvePlayerStats(
        s.playerName,
        s.position,
        s.playerId,
        idx + 1,
        playerStatsMap
      );
    });

    return { initialPlayers: resolved, contextTitle: title, contextSubtitle: subtitle };
  }, [
    selectedLineupKey,
    hasRequestedLineup,
    requestedLineup,
    hasTodayLineup,
    todayLineup,
    topFrequentLineups,
    gameLineups,
    playerStatsMap,
    season,
  ]);

  // Jugadores activos editables (permiten simular cambios de orden manuales)
  const [activePlayers, setActivePlayers] = useState<TangoPlayer[]>(initialPlayers);

  // Sincronizar si cambia la selección en el dropdown
  useEffect(() => {
    setActivePlayers(initialPlayers);
  }, [initialPlayers]);

  // Ejecutar optimización de Tom Tango (modo Del Juego)
  const result: TangoOptimizationResult = useMemo(() => {
    if (activePlayers.length < 9) {
      return {
        currentLineup: [],
        optimizedLineup: [],
        currentMetrics: { runsPerGame: 0, runsPerSeason: 0, teamWoba: 0, platoonBalanceScore: 0, contributions: [] },
        optimizedMetrics: { runsPerGame: 0, runsPerSeason: 0, teamWoba: 0, platoonBalanceScore: 0, contributions: [] },
        deltaRunsPerGame: 0,
        deltaRunsPerSeason: 0,
      };
    }
    return optimizeTangoLineup(activePlayers);
  }, [activePlayers]);

  // Derivados para modo Mejor Posible (Roster Activo)
  const rosterByPlayerId = useMemo(
    () => new Map(activeRosterPool.map((p) => [p.playerId, p])),
    [activeRosterPool]
  );

  const effectiveExcludedIds = useMemo(
    () => excludedPlayerIds.filter((id) => rosterByPlayerId.has(id)),
    [excludedPlayerIds, rosterByPlayerId]
  );

  const excludedIdSet = useMemo(
    () => new Set(effectiveExcludedIds),
    [effectiveExcludedIds]
  );

  const referenceLineup = useMemo(
    () => (initialPlayers.length >= 9 ? initialPlayers : undefined),
    [initialPlayers]
  );

  const referencePlayerIds = useMemo(
    () => new Set((referenceLineup ?? []).map((p) => p.playerId)),
    [referenceLineup]
  );

  const bestResult: BestAvailableLineupResult | null = useMemo(() => {
    if (activeRosterPool.length === 0) return null;
    return buildBestAvailableLineup({
      pool: activeRosterPool,
      mode: constraintMode,
      minPlateAppearances,
      excludedPlayerIds: effectiveExcludedIds,
      referenceLineup,
    });
  }, [
    activeRosterPool,
    constraintMode,
    minPlateAppearances,
    effectiveExcludedIds,
    referenceLineup,
  ]);

  const benchDisplayPlayers = useMemo(() => {
    if (!bestResult) return [];
    const selectedIds = new Set(
      bestResult.optimization.optimizedLineup.map((item) => item.player.playerId)
    );
    const seen = new Set<number>();
    const combined: ActiveRosterBatter[] = [];

    for (const p of bestResult.benchPlayers) {
      if (!selectedIds.has(p.playerId) && !seen.has(p.playerId)) {
        seen.add(p.playerId);
        combined.push(p);
      }
    }
    for (const p of activeRosterPool) {
      if (!selectedIds.has(p.playerId) && !seen.has(p.playerId)) {
        seen.add(p.playerId);
        combined.push(p);
      }
    }
    return combined;
  }, [bestResult, activeRosterPool]);

  const availablePoolCount = Math.max(
    0,
    activeRosterPool.length - effectiveExcludedIds.length
  );
  const hasRosterPoolData = activeRosterPool.length >= 9;

  const handleToggleExcludePlayer = (playerId: number) => {
    setExcludedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleResetPool = () => {
    setExcludedPlayerIds([]);
  };

  const handleSwap = (idx1: number, idx2: number) => {
    if (idx1 === idx2 || idx1 < 0 || idx2 < 0 || idx1 >= 9 || idx2 >= 9) return;
    const copy = [...activePlayers];
    const temp = copy[idx1];
    copy[idx1] = copy[idx2];
    copy[idx2] = temp;
    setActivePlayers(copy);
  };

  const getBatsBadge = (bats: "R" | "L" | "S") => {
    switch (bats) {
      case "L":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            Z
          </span>
        );
      case "R":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            D
          </span>
        );
      case "S":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-[#FDB827] border border-amber-500/30">
            A
          </span>
        );
    }
  };

  if (activePlayers.length < 9 && !hasRosterPoolData) {
    return (
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <Sparkles className="w-8 h-8 text-[#FDB827] mx-auto opacity-60" />
        <h3 className="text-base font-bold text-slate-200">Alineación no disponible</h3>
        <p className="text-xs">
          {todayLineupStatus?.message ||
            "No se encontraron los 9 peloteros titulares para el juego seleccionado."}
        </p>
      </div>
    );
  }

  const activeBreakdownResult =
    optimizerMode === "best_available" &&
    bestResult &&
    bestResult.optimization.optimizedLineup.length >= 9
      ? bestResult.optimization
      : result;

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO Y CONTROLES ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight">
                Optimizador Lineups (Tom Tango - The Book)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {optimizerMode === "best_available"
                ? `Selección óptima de los 9 mejores bateadores disponibles en el roster activo de ${teamName} (${season}) maximizando carreras proyectadas según Tom Tango.`
                : `Distribución óptima de turnos al bate (1 al 9) evaluando la alineación real empleada por el mánager para ${teamName} en ${season} según los axiomas estocásticos de BaseRuns de Tom Tango.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {/* Selector de Modo Segmentado */}
            <div
              role="tablist"
              aria-label="Modo del optimizador de lineup"
              className="inline-flex items-center p-1 rounded-xl bg-[#070B19] border border-[#1E2B4D]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={optimizerMode === "game_lineup"}
                onClick={() => setOptimizerMode("game_lineup")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                  optimizerMode === "game_lineup"
                    ? "bg-[#FDB827] text-slate-950 shadow-sm"
                    : "text-slate-300 hover:text-slate-100"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Del Juego / Orden del Día</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={optimizerMode === "best_available"}
                disabled={activeRosterPool.length === 0}
                onClick={() => setOptimizerMode("best_available")}
                title={
                  activeRosterPool.length === 0
                    ? "Roster activo no disponible para esta temporada"
                    : "Armar el mejor lineup posible con todo el roster activo disponible"
                }
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDB827]",
                  optimizerMode === "best_available"
                    ? "bg-[#FDB827] text-slate-950 shadow-sm"
                    : activeRosterPool.length === 0
                    ? "text-slate-500 opacity-50 cursor-not-allowed"
                    : "text-slate-300 hover:text-slate-100"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Mejor Posible (Roster Activo)</span>
                {activeRosterPool.length > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums",
                      optimizerMode === "best_available"
                        ? "bg-slate-950/15 text-slate-950"
                        : "bg-[#1E2B4D] text-[#FDB827]"
                    )}
                  >
                    {activeRosterPool.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowTheoryGuide(!showTheoryGuide)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2B4D]/60 hover:bg-[#1E2B4D] text-slate-200 text-xs font-semibold border border-[#1E2B4D] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#FDB827]" />
              <span>Axiomas de The Book</span>
              {showTheoryGuide ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Selector de Alineación Real / Referencia de la Temporada */}
        {(optimizerMode === "game_lineup" ||
          hasTodayLineup ||
          hasRequestedLineup ||
          topFrequentLineups.length > 0 ||
          gameLineups.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E2B4D]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#FDB827]" />
                <span>
                  {optimizerMode === "best_available"
                    ? "Lineup de Referencia:"
                    : "Alineación Real a Evaluar:"}
                </span>
              </span>

              <select
                value={selectedLineupKey}
                onChange={(e) => setSelectedLineupKey(e.target.value)}
                className="bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-1 focus:ring-[#FDB827] focus:outline-none max-w-md"
              >
                {hasTodayLineup && todayLineup && (
                  <optgroup label="Lineup Publicado de Hoy (Game Center)">
                    <option value="today">
                      Hoy ({todayLineup.gameDate}) vs {todayLineup.opp}
                      {todayLineup.gameNumber && todayLineup.gameNumber > 1
                        ? ` · J${todayLineup.gameNumber}`
                        : ""}
                      {` · ${formatGameStatusEs(todayLineup.status).toUpperCase()}`}
                    </option>
                  </optgroup>
                )}
                {showDistinctRequestedOption && requestedLineup && (
                  <optgroup label="Lineup Seleccionado desde Game Center">
                    <option value="requested">
                      {requestedLineup.teamName ? `${requestedLineup.teamName} · ` : ""}
                      {requestedLineup.gameDate} vs {requestedLineup.opp}
                      {requestedLineup.gameNumber && requestedLineup.gameNumber > 1
                        ? ` · J${requestedLineup.gameNumber}`
                        : ""}
                      {requestedLineup.status
                        ? ` · ${formatGameStatusEs(requestedLineup.status).toUpperCase()}`
                        : ""}
                    </option>
                  </optgroup>
                )}
                {topFrequentLineups.length > 0 && (
                  <optgroup label="Alineaciones Titulares Más Frecuentes">
                    {topFrequentLineups.map((top, idx) => (
                      <option key={`top_${idx}`} value={`top_${idx}`}>
                        #{top.rank || idx + 1} Más Usada ({top.games} JJ • {top.record})
                      </option>
                    ))}
                  </optgroup>
                )}
                {gameLineups.length > 0 && (
                  <optgroup label="Juegos Disputados en la Temporada">
                    {gameLineups.map((g, idx) => (
                      <option key={g.gamePk || `game_${idx}`} value={`game_${idx}`}>
                        {g.gameDate} vs {g.opp} ({g.won ? "G" : "P"} {g.scoreStr})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-[#FDB827] block">
                  {contextTitle}
                </span>
                <span className="text-[10px] text-slate-400">
                  {contextSubtitle}
                </span>
              </div>

              {optimizerMode === "game_lineup" && (
                <button
                  type="button"
                  onClick={() => setActivePlayers(initialPlayers)}
                  className="text-xs text-[#FDB827] hover:underline font-mono inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FDB827]/10 border border-[#FDB827]/20"
                  title="Restablece el orden al orden original empleado en el juego"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Restablecer Orden Real</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Controles específicos de Mejor Posible (Roster Activo) */}
        {optimizerMode === "best_available" && activeRosterPool.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-[#1E2B4D]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Toggle Reglas Defensivas */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FDB827]" />
                  <span>Criterio Defensivo:</span>
                </span>
                <div className="inline-flex items-center p-1 rounded-xl bg-[#070B19] border border-[#1E2B4D]">
                  <button
                    type="button"
                    onClick={() => setConstraintMode("defensive_valid")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                      constraintMode === "defensive_valid"
                        ? "bg-[#FDB827] text-slate-950 font-bold"
                        : "text-slate-300 hover:text-slate-100"
                    )}
                  >
                    9 Posiciones Válidas
                  </button>
                  <button
                    type="button"
                    onClick={() => setConstraintMode("pure_bats")}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                      constraintMode === "pure_bats"
                        ? "bg-[#FDB827] text-slate-950 font-bold"
                        : "text-slate-300 hover:text-slate-100"
                    )}
                  >
                    Top 9 Bates Puros
                  </button>
                </div>
              </div>

              {/* Filtro de Muestra Mínima PA */}
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="min-pa-select"
                  className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#FDB827]" />
                  <span>Muestra Mínima:</span>
                </label>
                <select
                  id="min-pa-select"
                  value={minPlateAppearances}
                  onChange={(e) => setMinPlateAppearances(Number(e.target.value))}
                  className="bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs rounded-xl px-3 py-1.5 font-mono font-semibold focus:ring-1 focus:ring-[#FDB827] focus:outline-none cursor-pointer"
                >
                  {MIN_PA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {bestResult && bestResult.effectiveMinPa !== minPlateAppearances && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-[#FDB827] border border-amber-500/30">
                    Aplicado: {bestResult.effectiveMinPa} PA
                  </span>
                )}
              </div>
            </div>

            {/* Panel Colapsable de Chips del Roster Activo */}
            <div className="rounded-xl bg-[#070B19]/80 border border-[#1E2B4D] p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowRosterPanel((prev) => !prev)}
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-[#FDB827] transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-[#FDB827]" />
                  <span>
                    Disponibles en Roster Activo ({availablePoolCount}/
                    {activeRosterPool.length})
                  </span>
                  {showRosterPanel ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Haz clic en un pelotero para excluirlo por lesión o descanso
                  </span>
                  {effectiveExcludedIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetPool}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FDB827]/15 hover:bg-[#FDB827]/25 text-[#FDB827] border border-[#FDB827]/30 text-[11px] font-bold transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>
                        Restablecer Pool ({effectiveExcludedIds.length} fuera)
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {showRosterPanel && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeRosterPool.map((player) => {
                    const isExcluded = excludedIdSet.has(player.playerId);
                    return (
                      <button
                        key={`pool-chip-${player.playerId}`}
                        type="button"
                        onClick={() => handleToggleExcludePlayer(player.playerId)}
                        aria-pressed={!isExcluded}
                        title={
                          isExcluded
                            ? `Reactivar a ${player.playerName}`
                            : `Excluir temporalmente a ${player.playerName}`
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border transition-colors font-medium",
                          isExcluded
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300/80 line-through hover:bg-rose-500/20"
                            : "bg-[#0D152B] border-[#1E2B4D] text-slate-200 hover:border-[#FDB827]/60"
                        )}
                      >
                        <span className="font-semibold">{player.playerName}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {player.position}
                        </span>
                        <span className="font-mono tabular-nums text-[10px] text-slate-400">
                          {player.plateAppearances} PA
                        </span>
                        <span
                          className={cn(
                            "font-mono tabular-nums text-[10px] font-bold",
                            isExcluded ? "text-rose-300" : "text-[#FDB827]"
                          )}
                        >
                          {formatRate(player.woba)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {bestResult?.relaxedConstraintNote && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                <AlertCircle className="w-4 h-4 text-[#FDB827] shrink-0 mt-0.5" />
                <span>{bestResult.relaxedConstraintNote}</span>
              </div>
            )}
          </div>
        )}

        {/* Estado del Lineup del Día (Game Center) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#1E2B4D] text-xs">
          {hasTodayLineup && todayLineup ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border",
                    todayLineup.status === "Live"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : todayLineup.status === "Preview"
                      ? "bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/30"
                      : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                  )}
                >
                  {todayLineup.status === "Live" ? (
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                  ) : todayLineup.status === "Preview" ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Lineup de Hoy: {formatGameStatusEs(todayLineup.status)}
                  </span>
                </span>
                <span className="text-slate-200 font-semibold">
                  vs {todayLineup.opp} ({todayLineup.gameDate})
                </span>
                {todayLineup.gameNumber && todayLineup.gameNumber > 1 && (
                  <span className="px-2 py-0.5 rounded bg-[#1E2B4D] text-[#FDB827] font-mono font-bold text-[11px]">
                    Doble Juego · J{todayLineup.gameNumber}
                  </span>
                )}
              </div>
              {selectedLineupKey !== "today" && (
                <button
                  type="button"
                  onClick={() => setSelectedLineupKey("today")}
                  className="text-xs font-bold text-[#FDB827] hover:underline"
                >
                  Cargar Lineup de Hoy
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
                <span>
                  {todayLineupStatus?.message ||
                    (todayLineupStatus?.hasGameToday
                      ? `Lineup de hoy aún no publicado${
                          todayLineupStatus.opponent
                            ? ` (${todayLineupStatus.opponent})`
                            : ""
                        } — mostrando alineación más frecuente`
                      : "Lineup del día aún no publicado — mostrando alineación más frecuente")}
                </span>
              </span>
              {todayLineupStatus?.hasGameToday &&
                todayLineupStatus.gameNumber &&
                todayLineupStatus.gameNumber > 1 && (
                  <span className="px-2 py-0.5 rounded bg-[#1E2B4D] text-[#FDB827] font-mono font-bold text-[11px]">
                    Doble Juego · J{todayLineupStatus.gameNumber}
                  </span>
                )}
            </div>
          )}
        </div>
      </div>

      {/* ── GUÍA DIDÁCTICA DESPLEGABLE (AXIOMAS DE THE BOOK) ── */}
      {showTheoryGuide && (
        <div className="bg-[#070B19] border border-[#FDB827]/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 text-xs">
          <div className="flex items-center gap-2 text-[#FDB827] font-bold text-sm">
            <Award className="w-4 h-4" />
            <span>Principios de Optimización del Orden al Bate (Tom Tango, Mitchel Lichtman & Andrew Dolphin)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300">
            <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-1">
              <span className="font-bold text-[#FDB827] block">1. El mito del 3er Bate</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                El 3er bate es el más sobrevalorado de la historia: en el 1er inning suele consumir turno con 2 outs y bases vacías tras out de #1 o #2. Debe ser el <strong>5to mejor bateador</strong>, no el mejor.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-1">
              <span className="font-bold text-[#38BDF8] block">2. El poder del 2do Bate</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                El 2do turno es el que más batea con corredor en 1B y sin outs. Exige al <strong>mejor bateador integral (mayor wOBA)</strong> para maximizar avances y evitar doble matanzas.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-1">
              <span className="font-bold text-emerald-400 block">3. Primacía del OBP en Leadoff</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                El 1er bate consume la mayor cantidad de turnos del año (~262 PA). Embasarse (OBP) supera ampliamente a la velocidad pura: regalar el primer out destruye rallies.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-1">
              <span className="font-bold text-rose-400 block">4. Fuerza Bruta en 4to y 5to</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                El cleanup debe ser el jugador con mayor <strong>poder aislado (ISO/SLG)</strong> para remolcar las múltiples situaciones con corredores en scoring position.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-1">
              <span className="font-bold text-amber-300 block">5. El &apos;Segundo Leadoff&apos; de 9no</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                El peor bateador nunca debe ser el 9no: debe ser el 8vo. El 9no bateador debe tener buen OBP para estar en base cuando la rotación vuelve a los bates élite (#1 y #2).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-1">
              <span className="font-bold text-violet-400 block">6. Alternancia de Platoon (Z/D)</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Evitar acumular más de dos bateadores del mismo lado consecutivos dificulta la labor del bullpen rival y los matchups de lanzadores especialistas en las entradas finales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO DEL JUEGO / ORDEN DEL DÍA ── */}
      {optimizerMode === "game_lineup" && activePlayers.length < 9 && (
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-8 text-center text-slate-400 space-y-3">
          <Sparkles className="w-8 h-8 text-[#FDB827] mx-auto opacity-60" />
          <h3 className="text-base font-bold text-slate-200">Alineación no disponible</h3>
          <p className="text-xs max-w-md mx-auto">
            {todayLineupStatus?.message ||
              "No se encontraron los 9 peloteros titulares para el juego seleccionado."}
          </p>
          {hasRosterPoolData && (
            <button
              type="button"
              onClick={() => setOptimizerMode("best_available")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FDB827] text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Armar Mejor Posible (Roster Activo)</span>
            </button>
          )}
        </div>
      )}

      {optimizerMode === "game_lineup" && activePlayers.length >= 9 && (
        <>
          {/* ── 4 KPIS DE IMPACTO PROYECTADO ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ORDEN REAL EMPLEADO (MÁNAGER)
              </span>
              <div className="text-2xl font-black text-slate-200 font-mono tabular-nums">
                {result.currentMetrics.runsPerGame}{" "}
                <span className="text-xs font-normal text-slate-400">R/J</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                {result.currentMetrics.runsPerSeason} Carreras en 56 JJ
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#FDB827]/40 rounded-xl p-4 shadow-md space-y-1 bg-gradient-to-b from-[#FDB827]/5 to-transparent">
              <span className="text-[10px] font-bold text-[#FDB827] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>ORDEN ÓPTIMO TOM TANGO</span>
              </span>
              <div className="text-2xl font-black text-[#FDB827] font-mono tabular-nums">
                {result.optimizedMetrics.runsPerGame}{" "}
                <span className="text-xs font-normal text-slate-400">R/J</span>
              </div>
              <div className="text-[11px] text-amber-300 font-mono tabular-nums">
                {result.optimizedMetrics.runsPerSeason} Carreras en 56 JJ
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>DIFERENCIAL DE CARRERAS</span>
              </span>
              <div
                className={cn(
                  "text-2xl font-black font-mono tabular-nums",
                  result.deltaRunsPerSeason >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {result.deltaRunsPerSeason >= 0
                  ? `+${result.deltaRunsPerSeason}`
                  : result.deltaRunsPerSeason}{" "}
                <span className="text-xs font-normal text-slate-400">Carreras</span>
              </div>
              <div className="text-[11px] text-slate-400">
                {result.deltaRunsPerSeason > 0
                  ? `~+${(result.deltaRunsPerSeason / 10).toFixed(1)} victorias estimadas (Pythag)`
                  : "Orden ya maximizado"}
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                BALANCE PLATOON (Z / D)
              </span>
              <div className="text-2xl font-black text-[#38BDF8] font-mono tabular-nums">
                {result.optimizedMetrics.platoonBalanceScore}%
              </div>
              <div className="text-[11px] text-slate-400">Alternancia frente a relevistas</div>
            </div>
          </div>

          {/* ── COMPARATIVA PARALELA: ORDEN REAL VS TOM TANGO ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* COLUMNA 1: ORDEN REAL EMPLEADO */}
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <span>Orden Real Empleado (Mánager)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {contextTitle} • {contextSubtitle}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  wOBA: {result.currentMetrics.teamWoba}
                </span>
              </div>

              <div className="space-y-2">
                {result.currentLineup.map((slotItem, idx) => (
                  <div
                    key={`curr-${slotItem.slot}-${slotItem.player.playerName}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D] hover:border-slate-700 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#1E2B4D] font-mono font-bold text-slate-200 text-xs shrink-0">
                        {slotItem.slot}
                      </span>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">
                            {slotItem.player.playerName}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {slotItem.player.position}
                          </span>
                          {getBatsBadge(slotItem.player.bats)}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                          <span>AVG: {formatRate(slotItem.player.avg)}</span>
                          <span>OBP: {formatRate(slotItem.player.obp)}</span>
                          <span>SLG: {formatRate(slotItem.player.slg)}</span>
                          <span className="text-[#FDB827] font-bold">
                            wOBA: {formatRate(slotItem.player.woba)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono pr-2 hidden sm:block">
                        <span className="text-xs font-bold text-slate-200">
                          {slotItem.runsContributedSeason} R
                        </span>
                        <span className="text-[10px] text-slate-500 block">56 JJ</span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleSwap(idx, idx - 1)}
                          disabled={idx === 0}
                          className="p-1 rounded bg-[#131E3D] hover:bg-[#1E2B4D] disabled:opacity-30 text-slate-300"
                          title="Subir turno"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleSwap(idx, idx + 1)}
                          disabled={idx === 8}
                          className="p-1 rounded bg-[#131E3D] hover:bg-[#1E2B4D] disabled:opacity-30 text-slate-300"
                          title="Bajar turno"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMNA 2: ORDEN ÓPTIMO TOM TANGO */}
            <div className="bg-[#0D152B] border border-[#FDB827]/40 rounded-2xl p-5 shadow-lg space-y-4 bg-gradient-to-b from-[#FDB827]/5 to-transparent">
              <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#FDB827] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Alineación Optimizada (The Book)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Reasignación matemática para maximizar carreras esperadas
                  </p>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                  wOBA: {result.optimizedMetrics.teamWoba}
                </span>
              </div>

              <div className="space-y-2">
                {result.optimizedLineup.map((slotItem) => {
                  const prevIndex = result.currentLineup.findIndex(
                    (c) => c.player.playerName === slotItem.player.playerName
                  );
                  const originalSlot = prevIndex >= 0 ? prevIndex + 1 : slotItem.slot;
                  const slotDiff = originalSlot - slotItem.slot; // > 0 subió de turno, < 0 bajó

                  return (
                    <div
                      key={`opt-${slotItem.slot}-${slotItem.player.playerName}`}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B19]/80 border border-[#FDB827]/30 hover:border-[#FDB827] transition-all text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#FDB827] font-mono font-black text-slate-950 text-xs shrink-0 shadow-sm">
                          {slotItem.slot}
                        </span>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">
                              {slotItem.player.playerName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {slotItem.player.position}
                            </span>
                            {getBatsBadge(slotItem.player.bats)}
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#1E2B4D] text-[#FDB827]">
                              {slotItem.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                            <span>wOBA: {formatRate(slotItem.player.woba)}</span>
                            <span>OBP: {formatRate(slotItem.player.obp)}</span>
                            <span>SLG: {formatRate(slotItem.player.slg)}</span>
                            <span>ISO: {formatRate(slotItem.player.iso)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-xs font-bold text-[#FDB827]">
                            {slotItem.runsContributedSeason} R
                          </span>
                          <span className="text-[10px] text-slate-400 block font-sans">
                            {slotDiff === 0 ? (
                              <span className="text-slate-400">Mismo slot</span>
                            ) : slotDiff > 0 ? (
                              <span className="text-emerald-400 font-bold">
                                ▲ Subió {slotDiff}
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold">
                                ▼ Bajó {Math.abs(slotDiff)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── MODO MEJOR POSIBLE (ROSTER ACTIVO) ── */}
      {optimizerMode === "best_available" && (
        <>
          {!bestResult || bestResult.optimization.optimizedLineup.length < 9 ? (
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-8 text-center text-slate-300 space-y-3">
              <Users className="w-8 h-8 text-[#FDB827] mx-auto opacity-70" />
              <h3 className="text-base font-bold text-slate-100">
                No hay 9 bateadores elegibles en el Roster Activo
              </h3>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                {bestResult?.relaxedConstraintNote ||
                  "No se alcanzó el mínimo de 9 jugadores activos disponibles para armar la alineación óptima."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {effectiveExcludedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetPool}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FDB827] text-slate-950 text-xs font-bold hover:bg-amber-300 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer Pool</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOptimizerMode("game_lineup")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#070B19] text-slate-200 border border-[#1E2B4D] text-xs font-semibold hover:border-[#FDB827]/60 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 text-[#FDB827]" />
                  <span>Volver a Del Juego / Orden del Día</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 4 KPIs Comparativos */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    LINEUP DE REFERENCIA
                  </span>
                  {referenceLineup ? (
                    <>
                      <div className="text-2xl font-black text-slate-200 font-mono tabular-nums">
                        {bestResult.optimization.currentMetrics.runsPerGame}{" "}
                        <span className="text-xs font-normal text-slate-400">R/J</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                        {bestResult.optimization.currentMetrics.runsPerSeason} Carreras en 56 JJ
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-base font-bold text-slate-300 pt-1">
                        Sin referencia
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Sin lineup base de 9 titulares
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-[#0D152B] border border-[#FDB827]/40 rounded-xl p-4 shadow-md space-y-1 bg-gradient-to-b from-[#FDB827]/5 to-transparent">
                  <span className="text-[10px] font-bold text-[#FDB827] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>MEJOR LINEUP POSIBLE</span>
                  </span>
                  <div className="text-2xl font-black text-[#FDB827] font-mono tabular-nums">
                    {bestResult.optimization.optimizedMetrics.runsPerGame}{" "}
                    <span className="text-xs font-normal text-slate-400">R/J</span>
                  </div>
                  <div className="text-[11px] text-amber-300 font-mono tabular-nums">
                    {bestResult.optimization.optimizedMetrics.runsPerSeason} Carreras en 56 JJ
                  </div>
                </div>

                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Δ CARRERAS PROYECTADAS</span>
                  </span>
                  <div
                    className={cn(
                      "text-2xl font-black font-mono tabular-nums",
                      bestResult.optimization.deltaRunsPerGame >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                    )}
                  >
                    {bestResult.optimization.deltaRunsPerGame >= 0
                      ? `+${bestResult.optimization.deltaRunsPerGame.toFixed(2)}`
                      : bestResult.optimization.deltaRunsPerGame.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-slate-400">R/J</span>
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono tabular-nums">
                    {bestResult.optimization.deltaRunsPerSeason >= 0
                      ? `+${bestResult.optimization.deltaRunsPerSeason.toFixed(1)}`
                      : bestResult.optimization.deltaRunsPerSeason.toFixed(1)}{" "}
                    Carreras / 56J
                  </div>
                </div>

                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
                  <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider">
                    WOBA COLECTIVO & PLATOON
                  </span>
                  <div className="text-2xl font-black text-[#38BDF8] font-mono tabular-nums">
                    {formatRate(bestResult.optimization.optimizedMetrics.teamWoba)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    Balance Z/D:{" "}
                    {bestResult.optimization.optimizedMetrics.platoonBalanceScore}%
                  </div>
                </div>
              </div>

              {/* Comparativa Lado a Lado: Referencia vs Mejor Lineup Posible */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Columna Izquierda: Lineup de Referencia */}
                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3 gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        Lineup de Referencia
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {referenceLineup
                          ? `${contextTitle} • ${contextSubtitle}`
                          : "Sin alineación de 9 titulares publicada"}
                      </p>
                    </div>
                    {referenceLineup && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 shrink-0">
                        wOBA: {formatRate(bestResult.optimization.currentMetrics.teamWoba)}
                      </span>
                    )}
                  </div>

                  {referenceLineup ? (
                    <div className="space-y-2">
                      {bestResult.optimization.currentLineup.map((slotItem) => {
                        const sourceMeta = formatStatsSourceBadge(
                          slotItem.player.statsSource
                        );
                        return (
                          <div
                            key={`ref-${slotItem.slot}-${slotItem.player.playerId}-${slotItem.player.playerName}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D] text-xs gap-2"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#1E2B4D] font-mono font-bold text-slate-200 text-xs shrink-0">
                                {slotItem.slot}
                              </span>

                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-100 truncate">
                                    {slotItem.player.playerName}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1E2B4D] text-slate-300 font-mono">
                                    {slotItem.player.position}
                                  </span>
                                  {getBatsBadge(slotItem.player.bats)}
                                  <span
                                    className={cn(
                                      "text-[9px] font-semibold px-1.5 py-0.2 rounded border",
                                      sourceMeta.className
                                    )}
                                  >
                                    {sourceMeta.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono tabular-nums">
                                  <span>AVG: {formatRate(slotItem.player.avg)}</span>
                                  <span>OBP: {formatRate(slotItem.player.obp)}</span>
                                  <span>SLG: {formatRate(slotItem.player.slg)}</span>
                                  <span className="text-[#FDB827] font-bold">
                                    wOBA: {formatRate(slotItem.player.woba)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right font-mono tabular-nums shrink-0">
                              <span className="text-xs font-bold text-slate-200">
                                {slotItem.runsContributedSeason} R
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                56 JJ
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#070B19]/70 border border-[#1E2B4D] p-6 text-center text-xs text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">
                        Sin lineup base de 9 jugadores para comparar
                      </p>
                      <p>
                        En la columna derecha se muestra el mejor 9 armado directamente desde el roster activo de {teamName}.
                      </p>
                    </div>
                  )}
                </div>

                {/* Columna Derecha: Mejor Lineup Posible (Roster Activo) */}
                <div className="bg-[#0D152B] border border-[#FDB827]/40 rounded-2xl p-5 shadow-lg space-y-4 bg-gradient-to-b from-[#FDB827]/5 to-transparent">
                  <div className="flex flex-wrap items-center justify-between border-b border-[#1E2B4D] pb-3 gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#FDB827] flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Mejor Lineup Posible (Roster Activo)</span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {bestResult.modeUsed === "defensive_valid"
                          ? "9 Posiciones Válidas (C, 1B, 2B, 3B, SS, LF, CF, RF, DH)"
                          : "Top 9 Bates Puros ordenados por wOBA y The Book"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 tabular-nums">
                        {bestResult.optimization.deltaRunsPerGame >= 0
                          ? `+${bestResult.optimization.deltaRunsPerGame.toFixed(2)}`
                          : bestResult.optimization.deltaRunsPerGame.toFixed(2)}{" "}
                        R/J ·{" "}
                        {bestResult.optimization.deltaRunsPerSeason >= 0
                          ? `+${bestResult.optimization.deltaRunsPerSeason.toFixed(1)}`
                          : bestResult.optimization.deltaRunsPerSeason.toFixed(1)}{" "}
                        R/56J
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30 tabular-nums">
                        wOBA: {formatRate(bestResult.optimization.optimizedMetrics.teamWoba)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {bestResult.optimization.optimizedLineup.map((slotItem) => {
                      const assignedPos =
                        bestResult.assignedPositions[slotItem.player.playerId] ||
                        slotItem.player.position;
                      const isNewInNine =
                        referencePlayerIds.size >= 9 &&
                        !referencePlayerIds.has(slotItem.player.playerId);
                      const sourceMeta = formatStatsSourceBadge(
                        slotItem.player.statsSource
                      );
                      const rosterMeta = rosterByPlayerId.get(slotItem.player.playerId);

                      return (
                        <div
                          key={`best-${slotItem.slot}-${slotItem.player.playerId}-${slotItem.player.playerName}`}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[#070B19]/80 border border-[#FDB827]/30 hover:border-[#FDB827] transition-all text-xs gap-2"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#FDB827] font-mono font-black text-slate-950 text-xs shrink-0 shadow-sm">
                              {slotItem.slot}
                            </span>

                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-100">
                                  {slotItem.player.playerName}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30">
                                  {assignedPos}
                                </span>
                                {getBatsBadge(slotItem.player.bats)}
                                {isNewInNine && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                    Nuevo en el 9
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "text-[9px] font-semibold px-1.5 py-0.2 rounded border",
                                    sourceMeta.className
                                  )}
                                >
                                  {sourceMeta.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono tabular-nums flex-wrap">
                                <span className="text-[#FDB827] font-bold">
                                  wOBA: {formatRate(slotItem.player.woba)}
                                </span>
                                <span>OBP: {formatRate(slotItem.player.obp)}</span>
                                <span>SLG: {formatRate(slotItem.player.slg)}</span>
                                {rosterMeta && (
                                  <span>{rosterMeta.plateAppearances} PA</span>
                                )}
                                <span className="text-slate-300 font-sans">
                                  {slotItem.role}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono tabular-nums shrink-0">
                            <span className="text-xs font-bold text-[#FDB827]">
                              {slotItem.runsContributedSeason} R
                            </span>
                            <span className="text-[10px] text-slate-400 block font-sans">
                              {isNewInNine ? (
                                <span className="text-emerald-400 font-semibold">
                                  Entra al 9
                                </span>
                              ) : (
                                "Titular"
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sección Inferior: Banca / No incluidos en este 9 */}
          {benchDisplayPlayers.length > 0 && (
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-[#1E2B4D] pb-3 gap-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#FDB827]" />
                    <span>Banca / No incluidos en este 9</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bateadores restantes del roster activo disponibles para emergentes, reemplazos defensivos o ajustes manuales
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-300">
                  {benchDisplayPlayers.length} peloteros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#1E2B4D] text-slate-400 text-[11px] bg-[#070B19]/50">
                    <tr>
                      <th className="py-2.5 px-3">Pelotero</th>
                      <th className="py-2.5 px-2 text-center">Batea</th>
                      <th className="py-2.5 px-3">Posiciones</th>
                      <th className="py-2.5 px-2 text-center font-mono">PA</th>
                      <th className="py-2.5 px-2 text-center font-mono">OBP</th>
                      <th className="py-2.5 px-2 text-center font-mono">SLG</th>
                      <th className="py-2.5 px-2 text-center font-mono text-[#FDB827]">
                        wOBA
                      </th>
                      <th className="py-2.5 px-3 text-center">Fuente</th>
                      <th className="py-2.5 px-3 text-right">Disponibilidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {benchDisplayPlayers.map((player) => {
                      const isExcluded = excludedIdSet.has(player.playerId);
                      const belowMinPa =
                        !isExcluded &&
                        bestResult &&
                        player.plateAppearances < bestResult.effectiveMinPa;
                      const sourceMeta = formatStatsSourceBadge(player.statsSource);
                      const posList =
                        player.eligiblePositions.length > 0
                          ? player.eligiblePositions.join(" / ")
                          : player.position;

                      return (
                        <tr
                          key={`bench-${player.playerId}`}
                          className={cn(
                            "hover:bg-white/[0.02] transition-colors",
                            isExcluded && "opacity-75"
                          )}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-100">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={cn(isExcluded && "line-through text-slate-400")}>
                                {player.playerName}
                              </span>
                              {isExcluded && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                  Excluido
                                </span>
                              )}
                              {belowMinPa && bestResult && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  &lt; {bestResult.effectiveMinPa} PA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {getBatsBadge(player.bats)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                            {posList}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                            {player.plateAppearances}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                            {formatRate(player.obp)}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-300">
                            {formatRate(player.slg)}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono tabular-nums font-bold text-[#FDB827]">
                            {formatRate(player.woba)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                "text-[10px] font-semibold px-2 py-0.5 rounded border inline-block",
                                sourceMeta.className
                              )}
                            >
                              {sourceMeta.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleToggleExcludePlayer(player.playerId)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors",
                                isExcluded
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                                  : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:border-rose-500/40 hover:text-rose-300"
                              )}
                            >
                              {isExcluded ? (
                                <>
                                  <UserPlus className="w-3 h-3" />
                                  <span>Reactivar</span>
                                </>
                              ) : (
                                <>
                                  <UserMinus className="w-3 h-3" />
                                  <span>Excluir</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TABLA MAESTRA CON JUSTIFICACIÓN DETALLADA SLOT A SLOT ── */}
      {activeBreakdownResult.optimizedLineup.length >= 9 && (
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#FDB827]" />
                <span>Desglose de los 9 Slots Óptimos</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Apalancamiento de carreras, apariciones al plato y rol estratégico según la investigación de Tom Tango
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Base: {LVBP_REGULAR_SEASON_GAMES} Partidos LVBP
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#1E2B4D] text-slate-400 text-[11px] bg-[#070B19]/50">
                <tr>
                  <th className="py-2.5 px-3">Slot</th>
                  <th className="py-2.5 px-3">Bateador Asignado</th>
                  <th className="py-2.5 px-2 text-center">Batea</th>
                  <th className="py-2.5 px-2 text-center font-mono text-[#FDB827]">wOBA</th>
                  <th className="py-2.5 px-2 text-center font-mono">OBP</th>
                  <th className="py-2.5 px-2 text-center font-mono">SLG</th>
                  <th className="py-2.5 px-2 text-center font-mono">ISO</th>
                  <th className="py-2.5 px-2 text-center font-mono">PA / Juego</th>
                  <th className="py-2.5 px-2 text-center font-mono">PA / Temp</th>
                  <th className="py-2.5 px-3 text-right font-mono text-[#FDB827]">R Proyectadas</th>
                  <th className="py-2.5 px-4">Fundamento Táctico (The Book)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeBreakdownResult.optimizedLineup.map((item) => {
                  const displayPos =
                    optimizerMode === "best_available" && bestResult
                      ? bestResult.assignedPositions[item.player.playerId] ||
                        item.player.position
                      : item.player.position;
                  return (
                    <tr
                      key={`matrix-${item.slot}`}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        <span className="flex items-center justify-center w-6 h-6 rounded bg-[#1E2B4D] text-[#FDB827] text-xs font-bold">
                          #{item.slot}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-100">
                        {item.player.playerName}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({displayPos})
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">{getBatsBadge(item.player.bats)}</td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-[#FDB827]">
                        {formatRate(item.player.woba)}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-300">
                        {formatRate(item.player.obp)}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-300">
                        {formatRate(item.player.slg)}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">
                        {formatRate(item.player.iso)}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">
                        {item.paGame.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-center font-mono text-slate-400">
                        {item.paSeason}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#FDB827]">
                        {item.runsContributedSeason} R
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-[11px] leading-relaxed max-w-sm">
                        <span className="font-bold text-[#FDB827] block text-[10px] uppercase">
                          {item.role}
                        </span>
                        {item.explanation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
