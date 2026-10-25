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
  Calendar,
  Layers,
} from "lucide-react";
import { GameLineup, TopLineup, StarterSlot } from "@/types/bullpen";
import {
  TangoPlayer,
  TangoOptimizationResult,
} from "@/types/tango-lineup";
import {
  resolvePlayerStats,
  optimizeTangoLineup,
  LVBP_REGULAR_SEASON_GAMES,
} from "@/lib/tango-lineup-engine";
import { cn } from "@/lib/utils";

interface TangoLineupOptimizerTabProps {
  gameLineups?: GameLineup[];
  topFrequentLineups?: TopLineup[];
  teamName?: string;
  season?: number;
}

export function TangoLineupOptimizerTab({
  gameLineups = [],
  topFrequentLineups = [],
  teamName = "Leones del Caracas",
  season = 2026,
}: TangoLineupOptimizerTabProps) {
  // Determinar clave inicial por defecto: Priorizar la más frecuente de la temporada, o el último juego disputado
  const defaultKey = useMemo(() => {
    if (topFrequentLineups && topFrequentLineups.length > 0) {
      return "top_0";
    }
    if (gameLineups && gameLineups.length > 0) {
      return "game_0";
    }
    return "top_0";
  }, [topFrequentLineups, gameLineups]);

  const [selectedLineupKey, setSelectedLineupKey] = useState<string>(defaultKey);
  const [showTheoryGuide, setShowTheoryGuide] = useState<boolean>(false);

  // Sincronizar clave si cambian los datos de temporada
  useEffect(() => {
    setSelectedLineupKey(defaultKey);
  }, [defaultKey]);

  // Generar conjunto inicial de 9 jugadores desde la alineación real seleccionada
  const { initialPlayers, contextTitle, contextSubtitle } = useMemo(() => {
    let starters: StarterSlot[] = [];
    let title = "Alineación Real";
    let subtitle = `Temporada ${season}`;

    if (selectedLineupKey.startsWith("top_")) {
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
      if (topFrequentLineups.length > 0 && topFrequentLineups[0].starters.length > 0) {
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
      return resolvePlayerStats(s.playerName, s.position, s.playerId, idx + 1);
    });

    return { initialPlayers: resolved, contextTitle: title, contextSubtitle: subtitle };
  }, [selectedLineupKey, topFrequentLineups, gameLineups, season]);

  // Jugadores activos editables (permiten simular cambios de orden manuales)
  const [activePlayers, setActivePlayers] = useState<TangoPlayer[]>(initialPlayers);

  // Sincronizar si cambia la selección en el dropdown
  useEffect(() => {
    setActivePlayers(initialPlayers);
  }, [initialPlayers]);

  // Ejecutar optimización de Tom Tango
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

  if (activePlayers.length < 9) {
    return (
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-8 text-center text-slate-400 space-y-2">
        <Sparkles className="w-8 h-8 text-[#FDB827] mx-auto opacity-60" />
        <h3 className="text-base font-bold text-slate-200">Alineación no disponible</h3>
        <p className="text-xs">No se encontraron los 9 peloteros titulares para el juego seleccionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO Y CONTROLES ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              Distribución óptima de turnos al bate (1 al 9) evaluando la alineación real empleada por el mánager para {teamName} en {season} según los axiomas estocásticos de BaseRuns de Tom Tango.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
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

        {/* Selector de Alineación Real de la Temporada */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E2B4D]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#FDB827]" />
              <span>Alineación Real a Evaluar:</span>
            </span>

            <select
              value={selectedLineupKey}
              onChange={(e) => setSelectedLineupKey(e.target.value)}
              className="bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:ring-1 focus:ring-[#FDB827] focus:outline-none max-w-md"
            >
              {topFrequentLineups.length > 0 && (
                <optgroup label="⭐ Alineaciones Titulares Más Frecuentes">
                  {topFrequentLineups.map((top, idx) => (
                    <option key={`top_${idx}`} value={`top_${idx}`}>
                      #{top.rank || idx + 1} Más Usada ({top.games} JJ • {top.record})
                    </option>
                  ))}
                </optgroup>
              )}
              {gameLineups.length > 0 && (
                <optgroup label="📅 Juegos Disputados en la Temporada">
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

            <button
              onClick={() => setActivePlayers(initialPlayers)}
              className="text-xs text-[#FDB827] hover:underline font-mono inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FDB827]/10 border border-[#FDB827]/20"
              title="Restablece el orden al orden original empleado en el juego"
            >
              <Shuffle className="w-3 h-3" />
              <span>Restablecer Orden Real</span>
            </button>
          </div>
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

      {/* ── 4 KPIS DE IMPACTO PROYECTADO ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            ORDEN REAL EMPLEADO (MÁNAGER)
          </span>
          <div className="text-2xl font-black text-slate-200 font-mono">
            {result.currentMetrics.runsPerGame}{" "}
            <span className="text-xs font-normal text-slate-400">R/J</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {result.currentMetrics.runsPerSeason} Carreras en 56 JJ
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#FDB827]/40 rounded-xl p-4 shadow-md space-y-1 bg-gradient-to-b from-[#FDB827]/5 to-transparent">
          <span className="text-[10px] font-bold text-[#FDB827] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>ORDEN ÓPTIMO TOM TANGO</span>
          </span>
          <div className="text-2xl font-black text-[#FDB827] font-mono">
            {result.optimizedMetrics.runsPerGame}{" "}
            <span className="text-xs font-normal text-slate-400">R/J</span>
          </div>
          <div className="text-[11px] text-amber-300 font-mono">
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
              "text-2xl font-black font-mono",
              result.deltaRunsPerSeason >= 0 ? "text-emerald-400" : "text-rose-400"
            )}
          >
            {result.deltaRunsPerSeason >= 0 ? `+${result.deltaRunsPerSeason}` : result.deltaRunsPerSeason}{" "}
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
          <div className="text-2xl font-black text-[#38BDF8] font-mono">
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
                      <span>AVG: {slotItem.player.avg.toFixed(3).replace(/^0/, "")}</span>
                      <span>OBP: {slotItem.player.obp.toFixed(3).replace(/^0/, "")}</span>
                      <span>SLG: {slotItem.player.slg.toFixed(3).replace(/^0/, "")}</span>
                      <span className="text-[#FDB827] font-bold">
                        wOBA: {slotItem.player.woba.toFixed(3).replace(/^0/, "")}
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
                        <span>wOBA: {slotItem.player.woba.toFixed(3).replace(/^0/, "")}</span>
                        <span>OBP: {slotItem.player.obp.toFixed(3).replace(/^0/, "")}</span>
                        <span>SLG: {slotItem.player.slg.toFixed(3).replace(/^0/, "")}</span>
                        <span>ISO: {slotItem.player.iso.toFixed(3).replace(/^0/, "")}</span>
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
                          <span className="text-emerald-400 font-bold">▲ Subió {slotDiff}</span>
                        ) : (
                          <span className="text-rose-400 font-bold">▼ Bajó {Math.abs(slotDiff)}</span>
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

      {/* ── TABLA MAESTRA CON JUSTIFICACIÓN DETALLADA SLOT A SLOT ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FDB827]" />
              <span>Desglose Sabermétrico de los 9 Slots Óptimos</span>
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
              {result.optimizedLineup.map((item) => (
                <tr key={`matrix-${item.slot}`} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-200">
                    <span className="flex items-center justify-center w-6 h-6 rounded bg-[#1E2B4D] text-[#FDB827] text-xs font-bold">
                      #{item.slot}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-100">
                    {item.player.playerName}{" "}
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({item.player.position})
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">{getBatsBadge(item.player.bats)}</td>
                  <td className="py-3 px-2 text-center font-mono font-bold text-[#FDB827]">
                    {item.player.woba.toFixed(3).replace(/^0/, "")}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-300">
                    {item.player.obp.toFixed(3).replace(/^0/, "")}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-300">
                    {item.player.slg.toFixed(3).replace(/^0/, "")}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-400">
                    {item.player.iso.toFixed(3).replace(/^0/, "")}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
