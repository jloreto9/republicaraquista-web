"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  GitCompare,
  PieChart,
  Swords,
  Trophy,
  Info,
} from "lucide-react";
import { BattingStats, PitchingStats } from "@/types/sports";
import { LVBP_TEAMS } from "@/lib/constants";
import { compareBatters, comparePitchers, shortenName } from "@/lib/matchup-engine";
import { RadarChart } from "./radar-chart";
import { cn } from "@/lib/utils";

interface MatchupViewProps {
  initialBatters: BattingStats[];
  initialPitchers: PitchingStats[];
  season?: number;
}

const PHASES = [
  { value: "R", label: "Temporada Regular" },
  { value: "L", label: "Round Robin (Todos contra Todos)" },
  { value: "F", label: "Serie Final" },
  { value: "all", label: "Todas las Fases" },
];

export function MatchupView({
  initialBatters,
  initialPitchers,
  season = 2025,
}: MatchupViewProps) {
  const [compareType, setCompareType] = useState<"Bateadores" | "Lanzadores">("Bateadores");
  const [team1, setTeam1] = useState<string>("695"); // Leones por defecto
  const [phase1, setPhase1] = useState<string>("R");
  const [team2, setTeam2] = useState<string>("all"); // Toda la liga
  const [phase2, setPhase2] = useState<string>("R");

  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState<number | null>(null);
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"radar" | "table">("radar");

  // Filtrado de jugadores disponibles para Jugador 1
  const availablePlayers1 = useMemo(() => {
    if (compareType === "Bateadores") {
      let pool = initialBatters;
      if (team1 !== "all") {
        pool = pool.filter((p) => String(p.teamId) === team1);
      }
      return pool.sort((a, b) => b.atBats - a.atBats);
    } else {
      let pool = initialPitchers;
      if (team1 !== "all") {
        pool = pool.filter((p) => String(p.teamId) === team1);
      }
      return pool.sort((a, b) => b.inningsPitched - a.inningsPitched);
    }
  }, [compareType, team1, initialBatters, initialPitchers]);

  // Filtrado de jugadores disponibles para Jugador 2
  const availablePlayers2 = useMemo(() => {
    if (compareType === "Bateadores") {
      let pool = initialBatters;
      if (team2 !== "all") {
        pool = pool.filter((p) => String(p.teamId) === team2);
      }
      return pool.sort((a, b) => b.atBats - a.atBats);
    } else {
      let pool = initialPitchers;
      if (team2 !== "all") {
        pool = pool.filter((p) => String(p.teamId) === team2);
      }
      return pool.sort((a, b) => b.inningsPitched - a.inningsPitched);
    }
  }, [compareType, team2, initialBatters, initialPitchers]);

  // Jugadores activos seleccionados con fallbacks
  const p1 = useMemo(() => {
    if (selectedPlayer1Id) {
      const found = availablePlayers1.find((p) => p.playerId === selectedPlayer1Id);
      if (found) return found;
    }
    return availablePlayers1[0] || null;
  }, [availablePlayers1, selectedPlayer1Id]);

  const p2 = useMemo(() => {
    if (selectedPlayer2Id) {
      const found = availablePlayers2.find((p) => p.playerId === selectedPlayer2Id);
      if (found) return found;
    }
    // Si p1 es el primero y es la misma lista, elegir el segundo
    if (availablePlayers2.length > 1 && p1 && availablePlayers2[0]?.playerId === p1?.playerId) {
      return availablePlayers2[1];
    }
    return availablePlayers2[0] || null;
  }, [availablePlayers2, selectedPlayer2Id, p1]);

  // Comparación matemática
  const comparison = useMemo(() => {
    if (!p1 || !p2) return null;

    const phase1Label = PHASES.find((p) => p.value === phase1)?.label || "Temporada Regular";
    const phase2Label = PHASES.find((p) => p.value === phase2)?.label || "Temporada Regular";

    if (compareType === "Bateadores") {
      return compareBatters(
        p1 as BattingStats,
        p2 as BattingStats,
        initialBatters,
        initialBatters,
        phase1Label,
        phase2Label
      );
    } else {
      return comparePitchers(
        p1 as PitchingStats,
        p2 as PitchingStats,
        initialPitchers,
        initialPitchers,
        phase1Label,
        phase2Label
      );
    }
  }, [p1, p2, compareType, phase1, phase2, initialBatters, initialPitchers]);

  return (
    <div className="space-y-6">
      {/* ── Encabezado y Barra de Control ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2B4D]/60 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-[#FDB827]/10 border border-[#FDB827]/30 text-[#FDB827]">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <span>Matchup 360 Head-to-Head</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20 uppercase font-mono">
                  {season}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Comparador multidimensional sabermétrico con radar polar y veredicto automatizado.
              </p>
            </div>
          </div>

          {/* Toggle Bateadores / Lanzadores */}
          <div className="flex items-center space-x-2 self-start md:self-auto bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D]">
            <button
              onClick={() => {
                setCompareType("Bateadores");
                setSelectedPlayer1Id(null);
                setSelectedPlayer2Id(null);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                compareType === "Bateadores"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              🏏 Bateadores
            </button>
            <button
              onClick={() => {
                setCompareType("Lanzadores");
                setSelectedPlayer1Id(null);
                setSelectedPlayer2Id(null);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                compareType === "Lanzadores"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              ⚡ Lanzadores
            </button>
          </div>
        </div>

        {/* ── Selectores H2H: Jugador 1 VS Jugador 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Jugador 1 Controls */}
          <div className="bg-[#070B19]/80 border border-[#FDB827]/30 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#FDB827] text-slate-950 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-[#FDB827]">Jugador 1</span>
              </div>
              <select
                value={phase1}
                onChange={(e) => setPhase1(e.target.value)}
                className="bg-[#0D152B] border border-[#1E2B4D] text-[11px] text-slate-300 rounded px-2 py-1 outline-none focus:border-[#FDB827]"
              >
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={team1}
                onChange={(e) => {
                  setTeam1(e.target.value);
                  setSelectedPlayer1Id(null);
                }}
                className="bg-[#0D152B] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FDB827]"
              >
                <option value="all">Toda la LVBP</option>
                {Object.entries(LVBP_TEAMS).map(([id, team]) => (
                  <option key={id} value={id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <select
                value={p1?.playerId || ""}
                onChange={(e) => setSelectedPlayer1Id(Number(e.target.value))}
                className="bg-[#0D152B] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FDB827]"
              >
                {availablePlayers1.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.playerName} ({p.teamAbbr})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#0D152B] border border-[#1E2B4D] flex items-center justify-center text-xs font-black text-slate-400 font-mono shadow-md">
              VS
            </div>
          </div>

          {/* Jugador 2 Controls */}
          <div className="bg-[#070B19]/80 border border-[#38BDF8]/30 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-[#38BDF8] text-slate-950 font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold text-[#38BDF8]">Jugador 2</span>
              </div>
              <select
                value={phase2}
                onChange={(e) => setPhase2(e.target.value)}
                className="bg-[#0D152B] border border-[#1E2B4D] text-[11px] text-slate-300 rounded px-2 py-1 outline-none focus:border-[#38BDF8]"
              >
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={team2}
                onChange={(e) => {
                  setTeam2(e.target.value);
                  setSelectedPlayer2Id(null);
                }}
                className="bg-[#0D152B] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#38BDF8]"
              >
                <option value="all">Toda la LVBP</option>
                {Object.entries(LVBP_TEAMS).map(([id, team]) => (
                  <option key={id} value={id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <select
                value={p2?.playerId || ""}
                onChange={(e) => setSelectedPlayer2Id(Number(e.target.value))}
                className="bg-[#0D152B] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#38BDF8]"
              >
                {availablePlayers2.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.playerName} ({p.teamAbbr})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {comparison && (
        <>
          {/* ── Tarjetas de Perfil H2H ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta Jugador 1 */}
            <div className="bg-[#0D152B] border-l-4 border-l-[#FDB827] border-y border-r border-[#1E2B4D] rounded-xl p-4 shadow-md flex items-center space-x-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#FDB827] bg-[#070B19] shrink-0">
                <Image
                  src={comparison.player1.headshot || "/assets/logo.png"}
                  alt={comparison.player1.name}
                  width={64}
                  height={64}
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      comparison.player1.teamLogo || "/assets/logo.png";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {comparison.player1.name}
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/30">
                    {comparison.player1.teamAbbr}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {comparison.player1.team} • {comparison.player1.pos}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-2">
                  {comparison.player1.mainStats.map((st) => (
                    <div
                      key={st.label}
                      className="bg-[#070B19] rounded p-1 text-center border border-white/5"
                    >
                      <div className="text-[9px] text-slate-400 font-mono">{st.label}</div>
                      <div className="text-xs font-bold text-[#FDB827]">{st.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tarjeta Jugador 2 */}
            <div className="bg-[#0D152B] border-r-4 border-r-[#38BDF8] border-y border-l border-[#1E2B4D] rounded-xl p-4 shadow-md flex items-center space-x-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#38BDF8] bg-[#070B19] shrink-0">
                <Image
                  src={comparison.player2.headshot || "/assets/logo.png"}
                  alt={comparison.player2.name}
                  width={64}
                  height={64}
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      comparison.player2.teamLogo || "/assets/logo.png";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-100 truncate">
                    {comparison.player2.name}
                  </h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30">
                    {comparison.player2.teamAbbr}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {comparison.player2.team} • {comparison.player2.pos}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-2">
                  {comparison.player2.mainStats.map((st) => (
                    <div
                      key={st.label}
                      className="bg-[#070B19] rounded p-1 text-center border border-white/5"
                    >
                      <div className="text-[9px] text-slate-400 font-mono">{st.label}</div>
                      <div className="text-xs font-bold text-[#38BDF8]">{st.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Grilla Central: Radar Polar vs Tabla Cara a Cara ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Panel Izquierdo: Radar Polar o Tabla de Percentiles */}
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-[#FDB827]" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Perfil 360° Multidimensional
                  </span>
                </div>
                <div className="flex items-center space-x-1 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D]">
                  <button
                    onClick={() => setActiveTab("radar")}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                      activeTab === "radar"
                        ? "bg-[#FDB827] text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Radar Polar
                  </button>
                  <button
                    onClick={() => setActiveTab("table")}
                    className={cn(
                      "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                      activeTab === "table"
                        ? "bg-[#FDB827] text-slate-950"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    Percentiles
                  </button>
                </div>
              </div>

              {activeTab === "radar" ? (
                <RadarChart
                  axes={comparison.radarAxes}
                  p1Name={`${shortenName(comparison.player1.name)} (${comparison.player1.teamAbbr})`}
                  p2Name={`${shortenName(comparison.player2.name)} (${comparison.player2.teamAbbr})`}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                        <th className="py-2 px-3">Dimensión</th>
                        <th className="py-2 px-3 text-[#FDB827]">
                          {shortenName(comparison.player1.name)}
                        </th>
                        <th className="py-2 px-3 text-[#38BDF8]">
                          {shortenName(comparison.player2.name)}
                        </th>
                        <th className="py-2 px-3 text-right">Líder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {comparison.radarAxes.map((ax) => (
                        <tr key={ax.key} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-medium text-slate-200">{ax.name}</td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className="text-slate-100 font-bold">{ax.val1}</span>
                            <span className="ml-1 text-[10px] text-[#FDB827] font-semibold">
                              (P{ax.pct1})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <span className="text-slate-100 font-bold">{ax.val2}</span>
                            <span className="ml-1 text-[10px] text-[#38BDF8] font-semibold">
                              (P{ax.pct2})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                ax.leaderScheme === "amber" &&
                                  "bg-[#FDB827]/10 text-[#FDB827] border-[#FDB827]/30",
                                ax.leaderScheme === "blue" &&
                                  "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
                                ax.leaderScheme === "gray" &&
                                  "bg-slate-800 text-slate-400 border-slate-700"
                              )}
                            >
                              {ax.leader}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Panel Derecho: Tabla Cara a Cara (Métrica por Métrica) */}
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
                <div className="flex items-center space-x-2">
                  <Swords className="w-4 h-4 text-[#FDB827]" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Desglose Métrica por Métrica
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="text-[#FDB827] font-bold">
                    {comparison.p1Wins} Ganadas
                  </span>
                  <span>•</span>
                  <span className="text-[#38BDF8] font-bold">
                    {comparison.p2Wins} Ganadas
                  </span>
                </div>
              </div>

              <div className="max-h-[460px] overflow-y-auto pr-1 space-y-1">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0D152B] z-10">
                    <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                      <th className="py-2 px-3">Métrica</th>
                      <th className="py-2 px-3 text-center text-[#FDB827]">
                        {shortenName(comparison.player1.name)}
                      </th>
                      <th className="py-2 px-3 text-center text-[#38BDF8]">
                        {shortenName(comparison.player2.name)}
                      </th>
                      <th className="py-2 px-3 text-right">Ventaja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {comparison.h2hRows.map((r, idx) => {
                      if (r.isHeader) {
                        return (
                          <tr key={`header-${idx}`} className="bg-[#070B19]/80">
                            <td
                              colSpan={4}
                              className="py-1.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#FDB827]"
                            >
                              {r.category}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={`row-${idx}`} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-medium text-slate-200">
                            {r.metric}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-100 font-semibold">
                            {r.val1}
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-slate-100 font-semibold">
                            {r.val2}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                r.winnerScheme === "amber" &&
                                  "bg-[#FDB827]/10 text-[#FDB827] border-[#FDB827]/30",
                                r.winnerScheme === "blue" &&
                                  "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30",
                                r.winnerScheme === "gray" &&
                                  "bg-slate-800 text-slate-400 border-slate-700"
                              )}
                            >
                              {r.winner}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Veredicto Sabermétrico Oficial ── */}
          <div className="bg-gradient-to-r from-[#0D152B] via-[#070B19] to-[#0D152B] border border-[#FDB827]/40 rounded-xl p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FDB827]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start space-x-3.5 relative z-10">
              <div className="p-2.5 rounded-lg bg-[#FDB827]/10 border border-[#FDB827]/40 text-[#FDB827] shrink-0 mt-0.5">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#FDB827]">
                  Veredicto Sabermétrico del Enfrentamiento
                </h4>
                <p className="text-sm text-slate-200 font-medium leading-relaxed">
                  {comparison.verdict}
                </p>
                <div className="text-[11px] text-slate-400 pt-1 flex items-center space-x-3">
                  <span>Balance: {comparison.p1Wins} vs {comparison.p2Wins} ({comparison.ties} empates)</span>
                  <span>•</span>
                  <span>Metodología: Tango RE24 & Percentiles Relativos LVBP</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Guía Metodológica ── */}
      <div className="bg-[#0D152B]/60 border border-[#1E2B4D] rounded-xl p-4 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 text-slate-300 font-bold">
          <Info className="w-4 h-4 text-[#FDB827]" />
          <span>Metodología de Radar Sabermétrico 360°</span>
        </div>
        <p>
          Los percentiles de cada eje (P0 a P100) se calculan en base a la distribución de todos los jugadores calificados en la LVBP.
          Para métricas inversas donde menos es mejor (como ERA, WHIP y BB/9), los valores menores obtienen un percentil más alto, garantizando que un área mayor en el radar refleje un rendimiento superior de manera intuitiva y consistente.
        </p>
      </div>
    </div>
  );
}
