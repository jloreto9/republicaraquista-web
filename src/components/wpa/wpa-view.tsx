"use client";

import React, { useState, useEffect } from "react";
import { GameWpaData, SeasonWpaLeader } from "@/types/wpa";
import { WpaChart } from "./wpa-chart";
import { LEONES_KEY_GAMES } from "@/lib/wpa-engine";
import {
  Activity,
  Flame,
  Award,
  Zap,
  TrendingUp,
  ShieldAlert,
  ChevronDown,
  Info,
} from "lucide-react";

interface WpaViewProps {
  initialGameData: GameWpaData | null;
  seasonLeaders: SeasonWpaLeader[];
}

export function WpaView({ initialGameData, seasonLeaders }: WpaViewProps) {
  const [selectedGameId, setSelectedGameId] = useState<number>(
    initialGameData?.gameId || LEONES_KEY_GAMES[0].id
  );
  const [gameData, setGameData] = useState<GameWpaData | null>(initialGameData);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "leaders" | "plays">("chart");
  const [leaderTab, setLeaderTab] = useState<"batter" | "pitcher">("batter");

  useEffect(() => {
    if (selectedGameId === initialGameData?.gameId) return;

    let isMounted = true;
    async function loadGame() {
      setLoading(true);
      try {
        const res = await fetch(`/api/wpa?game_pk=${selectedGameId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setGameData(data);
        }
      } catch (err) {
        console.error("Error loading WPA game:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadGame();
    return () => {
      isMounted = false;
    };
  }, [selectedGameId, initialGameData?.gameId]);

  const plays = gameData?.plays || [];

  // Calcular métricas clave del partido
  const topPositivePlay = [...plays].sort((a, b) => b.wpa - a.wpa)[0];
  const maxSwingPlay = [...plays].sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))[0];
  const avgLi = plays.length > 0 ? plays.reduce((acc, p) => acc + p.li, 0) / plays.length : 1.0;

  // Jugadas cruciales (Pivotal Plays) - Top 7 con mayor WPA absoluto
  const pivotalPlays = [...plays]
    .sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))
    .slice(0, 7);

  const filteredLeaders = seasonLeaders.filter((l) => l.type === leaderTab);

  return (
    <div className="space-y-6">
      {/* Header y Selector de Partido */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#FDB827]" />
            <h1 className="text-xl font-bold text-slate-100">
              Win Expectancy & WPA
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Probabilidad de victoria jugada por jugada, modelo Tango RE24 de 24 estados y apalancamiento (Leverage Index).
          </p>
        </div>

        {/* Selector de Juego */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider shrink-0">
            Partido:
          </label>
          <div className="relative">
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(Number(e.target.value))}
              className="appearance-none bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs font-medium rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#FDB827]/50"
            >
              {LEONES_KEY_GAMES.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.date} — {g.opponent} ({g.score} {g.result})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tarjeta de Resumen del Encuentro */}
      {gameData && (
        <div className="p-4 rounded-xl bg-[#0D152B]/80 border border-[#1E2B4D] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-100">
              {gameData.homeTeam}
            </span>
            <span className="px-2.5 py-1 rounded bg-[#070B19] border border-[#1E2B4D] font-mono font-extrabold text-sm text-[#FDB827]">
              {gameData.homeFinalScore} - {gameData.awayFinalScore}
            </span>
            <span className="font-bold text-sm text-slate-100">
              {gameData.awayTeam}
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 font-mono">
            <span>Fecha: {gameData.gameDate}</span>
            <span>•</span>
            <span>Total Jugadas: {gameData.totalPlays}</span>
            <span>•</span>
            <span className="text-[#FDB827] font-semibold">
              Perspectiva: {gameData.leonesIsHome ? "Leones Local" : "Leones Visitante"}
            </span>
          </div>
        </div>
      )}

      {/* Cuadrantes de KPIs Sabermétricos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>MAYOR IMPACTO POSITIVO</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-emerald-400">
            {topPositivePlay ? `+${(topPositivePlay.wpa * 100).toFixed(1)}%` : "0.0%"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {topPositivePlay ? `${topPositivePlay.batter} (${topPositivePlay.eventType})` : "-"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>SWING WPA MÁS ALTO</span>
            <Zap className="w-4 h-4 text-[#FDB827]" />
          </div>
          <div className="text-xl font-mono font-extrabold text-[#FDB827]">
            {maxSwingPlay ? `±${(Math.abs(maxSwingPlay.wpa) * 100).toFixed(1)}%` : "0.0%"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 truncate">
            {maxSwingPlay ? `${maxSwingPlay.batter} (Inn ${maxSwingPlay.inning})` : "-"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>APALANCAMIENTO PROM.</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-100">
            {avgLi.toFixed(2)} LI
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {avgLi > 1.2 ? "Alta presión (Clutch)" : "Apalancamiento regular"}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>ESTADOS RE24 TANGO</span>
            <ShieldAlert className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-mono font-extrabold text-slate-100">
            24 Estados
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Matriz Outs (0-2) x Bases (0-7)
          </div>
        </div>
      </div>

      {/* Tabs de Navegación del Módulo */}
      <div className="flex border-b border-[#1E2B4D] gap-2">
        <button
          onClick={() => setActiveTab("chart")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "chart"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Curva de Probabilidad & Jugadas Clave
        </button>
        <button
          onClick={() => setActiveTab("leaders")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "leaders"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Líderes de Temporada (WPA & Clutch)
        </button>
        <button
          onClick={() => setActiveTab("plays")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${
            activeTab === "plays"
              ? "bg-[#0D152B] text-[#FDB827] border-t-2 border-[#FDB827] border-x border-[#1E2B4D]"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Bitácora Completa Jugada por Jugada
        </button>
      </div>

      {/* Contenido de Tab 1: Curva y Jugadas Cruciales */}
      {activeTab === "chart" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
            <h2 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#FDB827]" />
              Evolución de Probabilidad de Victoria (Win Expectancy)
            </h2>

            {loading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                Cargando feed analítico de jugadas...
              </div>
            ) : gameData ? (
              <WpaChart plays={gameData.plays} />
            ) : null}
          </div>

          {/* Tabla de Jugadas Clave (Pivotal Plays) */}
          <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#FDB827]" />
                  Momentos Cruciales del Encuentro (Pivotal Plays)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jugadas con el mayor cambio neto en la probabilidad de victoria.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#070B19] border border-[#1E2B4D] text-[#FDB827]">
                Top 7 Jugadas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#1E2B4D] text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Inning</th>
                    <th className="py-2.5 px-3">Outs</th>
                    <th className="py-2.5 px-3">Bases</th>
                    <th className="py-2.5 px-3">Bateador</th>
                    <th className="py-2.5 px-3">Lanzador</th>
                    <th className="py-2.5 px-3">Evento</th>
                    <th className="py-2.5 px-3">WPA</th>
                    <th className="py-2.5 px-3">LI</th>
                    <th className="py-2.5 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2B4D]/60 font-mono">
                  {pivotalPlays.map((p) => (
                    <tr key={p.atbatIndex} className="hover:bg-[#070B19]/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-[#FDB827]/20 text-[#FDB827] font-semibold text-[11px]">
                          {p.isBottom ? "▼" : "▲"} {p.inning}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{p.outsBefore}</td>
                      <td className="py-2.5 px-3 text-[#FDB827] tracking-wider">{p.baseIcons}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-100">{p.batter}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-300">{p.pitcher}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium text-[11px]">
                          {p.eventType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold ${
                            p.wpa >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {p.wpa >= 0 ? `+${(p.wpa * 100).toFixed(1)}%` : `${(p.wpa * 100).toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-200">{p.li.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-100 font-bold">{p.scoreStr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de Tab 2: Líderes de Temporada */}
      {activeTab === "leaders" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FDB827]" />
                Líderes de Probabilidad de Victoria (WPA & Clutch) — Temporada 2025
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Clutch = WPA − (WPA/LI). Mide el desempeño en situaciones de alta presión comparado con situaciones neutrales.
              </p>
            </div>

            <div className="flex bg-[#070B19] rounded-lg p-1 border border-[#1E2B4D]">
              <button
                onClick={() => setLeaderTab("batter")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leaderTab === "batter"
                    ? "bg-[#FDB827] text-[#070B19]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Bateadores
              </button>
              <button
                onClick={() => setLeaderTab("pitcher")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  leaderTab === "pitcher"
                    ? "bg-[#FDB827] text-[#070B19]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Lanzadores
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                  <th className="py-2.5 px-3">Jugador</th>
                  <th className="py-2.5 px-3 text-center">JJ</th>
                  <th className="py-2.5 px-3 text-center">
                    {leaderTab === "batter" ? "PA" : "BF"}
                  </th>
                  <th className="py-2.5 px-3 text-right">WPA Total</th>
                  <th className="py-2.5 px-3 text-right">WPA / LI</th>
                  <th className="py-2.5 px-3 text-right">LI Promedio</th>
                  <th className="py-2.5 px-3 text-right">Clutch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/60 font-mono">
                {filteredLeaders.map((lead, idx) => (
                  <tr key={lead.playerId} className="hover:bg-[#070B19]/50 transition-colors">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-100 flex items-center gap-2">
                      <span className="text-[#FDB827] text-xs font-mono">{idx + 1}.</span>
                      {lead.player}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{lead.games}</td>
                    <td className="py-2.5 px-3 text-center text-slate-200">{lead.paOrBf}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      +{lead.wpa.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{lead.wpaLi.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-200">{lead.liAvg.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          lead.clutch >= 0
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {lead.clutch >= 0 ? `+${lead.clutch.toFixed(2)}` : lead.clutch.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenido de Tab 3: Bitácora Completa */}
      {activeTab === "plays" && (
        <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <h3 className="text-sm font-bold text-slate-100 mb-3">
            Bitácora de Todas las Jugadas del Partido ({plays.length} jugadas)
          </h3>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-[#0D152B] border-b border-[#1E2B4D]">
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Inn</th>
                  <th className="py-2.5 px-3">Outs</th>
                  <th className="py-2.5 px-3">Bases</th>
                  <th className="py-2.5 px-3">Bateador</th>
                  <th className="py-2.5 px-3">Evento</th>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3">WPA</th>
                  <th className="py-2.5 px-3">LI</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D]/60 font-mono">
                {plays.map((p) => (
                  <tr key={p.atbatIndex} className="hover:bg-[#070B19]/50">
                    <td className="py-2 px-3 text-slate-400">{p.atbatIndex + 1}</td>
                    <td className="py-2 px-3 text-[#FDB827]">
                      {p.isBottom ? "▼" : "▲"} {p.inning}
                    </td>
                    <td className="py-2 px-3">{p.outsBefore}</td>
                    <td className="py-2 px-3 text-[#FDB827]">{p.baseIcons}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-200">{p.batter}</td>
                    <td className="py-2 px-3 font-sans">{p.eventType}</td>
                    <td className="py-2 px-3 font-sans text-slate-400 max-w-xs truncate">{p.description}</td>
                    <td className="py-2 px-3">
                      <span className={p.wpa >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {p.wpa >= 0 ? `+${(p.wpa * 100).toFixed(1)}%` : `${(p.wpa * 100).toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="py-2 px-3">{p.li.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-200">{p.scoreStr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guía Metodológica */}
      <div className="p-4 rounded-xl bg-[#0D152B]/60 border border-[#1E2B4D] text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <Info className="w-4 h-4 text-[#FDB827]" />
          <span>Guía Metodológica de Win Expectancy & WPA</span>
        </div>
        <p>
          • <strong>Win Expectancy (WE):</strong> Probabilidad matemática de que un equipo gane el partido dado el inning, ventaja en carreras, outs y corredores en base, basada en la matriz Tango RE24 de 24 estados.
        </p>
        <p>
          • <strong>Win Probability Added (WPA):</strong> Cambio neto en la probabilidad de victoria generado por una jugada (WPA = WE final − WE inicial).
        </p>
        <p>
          • <strong>Leverage Index (LI):</strong> Cuantificación de la tensión o apalancamiento de una jugada. Un valor de 1.0 es el promedio del béisbol profesional; valores &gt;1.5 indican situaciones de alta presión (clutch).
        </p>
      </div>
    </div>
  );
}
