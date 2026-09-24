"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  Shield,
  ClipboardList,
  CreditCard,
  Star,
  LayoutGrid,
  User,
  Calendar,
  BookOpen,
  BarChart2,
} from "lucide-react";
import {
  BullpenAndLineupsData,
  GameLineup,
} from "@/types/bullpen";
import { cn } from "@/lib/utils";

const POS_FULL_MAP: Record<string, string> = {
  "1B": "Primera Base",
  "2B": "Segunda Base",
  "3B": "Tercera Base",
  SS: "Campocorto",
  LF: "Jardín Izquierdo",
  CF: "Jardín Central",
  RF: "Jardín Derecho",
  C: "Receptor",
  DH: "Bateador Designado",
};

interface BullpenViewProps {
  initialData: BullpenAndLineupsData;
  season?: number;
}

export function BullpenView({ initialData, season = 2025 }: BullpenViewProps) {
  const [data] = useState<BullpenAndLineupsData>(initialData);
  const [activeTab, setActiveTab] = useState<"bullpen" | "lineups">("bullpen");
  const [lineupSubtab, setLineupSubtab] = useState<
    "card" | "frequent" | "heatmap" | "player"
  >("card");

  // Dugout Scorecard Selector
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0);
  const selectedGame: GameLineup | null =
    data.lineups.gameLineups[selectedGameIndex] ||
    data.lineups.gameLineups[0] ||
    null;

  // Impacto por Jugador Selector
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>(
    data.lineups.availablePlayers[0] || ""
  );

  const selectedPlayerImpact = useMemo(() => {
    return (
      data.lineups.playerImpacts[selectedPlayerName] || {
        playerName: selectedPlayerName,
        games: 0,
        record: "0G - 0P",
        pct: ".000",
        breakdown: [],
      }
    );
  }, [data.lineups.playerImpacts, selectedPlayerName]);

  return (
    <div className="space-y-6">
      {/* ── Switcher Principal del Módulo ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
            <span>🦁 Leones del Caracas — Bullpen & Lineup Analytics</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20 font-mono">
              {season}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Contención de corredores heredados y optimización de alineaciones 1 al 9.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("bullpen")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              activeTab === "bullpen"
                ? "bg-[#FDB827] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Relevistas (IR/IRS)</span>
          </button>
          <button
            onClick={() => setActiveTab("lineups")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              activeTab === "lineups"
                ? "bg-[#FDB827] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Tracker Lineups 1-9</span>
          </button>
        </div>
      </div>

      {/* ── 1. VISTA DE CORREDORES HEREDADOS DEL BULLPEN ── */}
      {activeTab === "bullpen" && (
        <div className="space-y-6">
          {/* 4 KPIs de Bullpen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                CORREDORES HEREDADOS (IR)
              </span>
              <div className="text-2xl font-black text-[#38BDF8] font-mono">
                {data.bullpen.kpis.totalIr}
              </div>
              <div className="text-[11px] text-slate-400">
                Encontrados en base al ingresar
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                HEREDADOS QUE ANOTARON (IRS)
              </span>
              <div className="text-2xl font-black text-rose-500 font-mono">
                {data.bullpen.kpis.totalIrs}
              </div>
              <div className="text-[11px] text-slate-400">
                Carreras ajenas permitidas
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TASA IRS% COLECTIVA
              </span>
              <div className="text-2xl font-black text-[#FDB827] font-mono">
                {data.bullpen.kpis.irsPct}
              </div>
              <div className="text-[11px] text-slate-400">
                Porcentaje de contención
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                LÍDER APAGAFUEGOS (MÍN. 5 IR)
              </span>
              <div className="text-base font-bold text-slate-100 truncate">
                {data.bullpen.kpis.bestReliever}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold truncate">
                {data.bullpen.kpis.bestRelieverSub}
              </div>
            </div>
          </div>

          {/* Gráfico y Tabla de Relevistas */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* Gráfico IR vs IRS */}
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#1E2B4D] pb-3">
                <BarChart2 className="w-4 h-4 text-[#FDB827]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Comparativa: Heredados (IR) vs Anotaron (IRS)
                </h3>
              </div>

              <div className="space-y-3 pt-1">
                {data.bullpen.relievers.slice(0, 10).map((r) => {
                  const maxIr = Math.max(...data.bullpen.relievers.map((x) => x.ir), 1);
                  const irWidth = Math.max(10, (r.ir / maxIr) * 100);
                  const irsWidth = r.ir > 0 ? (r.irs / r.ir) * irWidth : 0;

                  return (
                    <div key={r.pitcherName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">{r.pitcherName}</span>
                        <div className="flex items-center space-x-2 font-mono text-[11px]">
                          <span className="text-[#38BDF8]">{r.ir} IR</span>
                          <span>/</span>
                          <span className="text-rose-400">{r.irs} IRS</span>
                          <span className="text-[#FDB827] font-bold">({r.irsPct})</span>
                        </div>
                      </div>

                      <div className="relative w-full bg-[#070B19] h-3 rounded-full overflow-hidden border border-white/5">
                        {/* Barra Total IR */}
                        <div
                          className="absolute top-0 left-0 h-full bg-[#38BDF8]/60 rounded-full"
                          style={{ width: `${irWidth}%` }}
                        />
                        {/* Barra IRS (anotados) */}
                        <div
                          className="absolute top-0 left-0 h-full bg-rose-500 rounded-full"
                          style={{ width: `${irsWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-2 text-[10px] font-mono text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8]" />
                  <span>Corredores Heredados (IR)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Anotaron (IRS)</span>
                </div>
              </div>
            </div>

            {/* Tabla por Relevista */}
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center space-x-2 border-b border-[#1E2B4D] pb-3">
                <Shield className="w-4 h-4 text-[#FDB827]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Efectividad por Lanzador Relevista
                </h3>
              </div>

              <div className="max-h-[380px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#0D152B] z-10 border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Lanzador Relevista</th>
                      <th className="py-2 px-2 text-center">Juegos</th>
                      <th className="py-2 px-2 text-center text-[#38BDF8] font-bold">Total IR</th>
                      <th className="py-2 px-2 text-center text-rose-400 font-bold">Total IRS</th>
                      <th className="py-2 px-3 text-right text-[#FDB827] font-bold">% IRS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.bullpen.relievers.map((r) => (
                      <tr key={r.pitcherName} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-semibold text-slate-100 truncate">
                          {r.pitcherName}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-400">
                          {r.appearances}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-[#38BDF8]">
                          {r.ir}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-rose-400">
                          {r.irs}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              r.irsPctNum <= 20
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : r.irsPctNum > 20 && r.irsPctNum <= 40
                                ? "bg-amber-500/10 text-[#FDB827] border-amber-500/30"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            )}
                          >
                            {r.irsPct}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Registro Detallado de Entradas con Corredores en Base */}
          <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                <span>Bitácora de Relevos con Corredores Heredados (Últimas Entradas)</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {data.bullpen.logs.length} Relevos Registrados
              </span>
            </div>

            <div className="overflow-x-auto max-h-[340px]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-[#0D152B] z-10 border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Fecha</th>
                    <th className="py-2 px-3">Rival</th>
                    <th className="py-2 px-2 text-center">Inning</th>
                    <th className="py-2 px-3">Lanzador</th>
                    <th className="py-2 px-2 text-center text-[#38BDF8] font-bold">Heredados (IR)</th>
                    <th className="py-2 px-2 text-center text-rose-400 font-bold">Anotaron (IRS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.bullpen.logs.map((log, idx) => (
                    <tr key={`log-${idx}`} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                        {log.gameDate}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">
                        {log.opp}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[#FDB827] text-[10px] font-bold">
                          Inn {log.inning}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-100">
                        {log.pitcher}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-[#38BDF8]">
                        {log.ir}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-rose-400">
                        {log.irs}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. VISTA DEL TRACKER DE ALINEACIONES 1-9 ── */}
      {activeTab === "lineups" && (
        <div className="space-y-6">
          {/* 4 KPIs de Lineups */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                JUEGOS ANALIZADOS
              </span>
              <div className="text-2xl font-black text-slate-100 font-mono">
                {data.lineups.kpis.totalGames} JJ
              </div>
              <div className="text-[11px] text-slate-400">Muestra de partidos</div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TITULARES UTILIZADOS
              </span>
              <div className="text-2xl font-black text-[#FDB827] font-mono">
                {data.lineups.kpis.totalPlayers}
              </div>
              <div className="text-[11px] text-slate-400">Peloteros en el 1-9</div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                MÁS TITULARIDADES
              </span>
              <div className="text-base font-bold text-slate-100 truncate">
                {data.lineups.kpis.topStarter}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold truncate">
                {data.lineups.kpis.topStarterJj}
              </div>
            </div>

            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                4TO BATE MÁS FRECUENTE
              </span>
              <div className="text-base font-bold text-slate-100 truncate">
                {data.lineups.kpis.topCleanup}
              </div>
              <div className="text-[11px] text-[#FDB827] font-semibold truncate">
                {data.lineups.kpis.topCleanupJj}
              </div>
            </div>
          </div>

          {/* Sub-tabs de Lineups */}
          <div className="flex items-center space-x-2 border-b border-[#1E2B4D] pb-3 overflow-x-auto">
            <button
              onClick={() => setLineupSubtab("card")}
              className={cn(
                "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                lineupSubtab === "card"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Tarjeta de Juego (Scorecard)</span>
            </button>
            <button
              onClick={() => setLineupSubtab("frequent")}
              className={cn(
                "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                lineupSubtab === "frequent"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
              )}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Alineaciones Frecuentes</span>
            </button>
            <button
              onClick={() => setLineupSubtab("heatmap")}
              className={cn(
                "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                lineupSubtab === "heatmap"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matriz de Calor (1 al 9)</span>
            </button>
            <button
              onClick={() => setLineupSubtab("player")}
              className={cn(
                "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                lineupSubtab === "player"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "bg-[#070B19] text-slate-300 hover:text-slate-100 border border-[#1E2B4D]"
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>Impacto por Jugador</span>
            </button>
          </div>

          {/* Subtab 1: Dugout Scorecard */}
          {lineupSubtab === "card" && (
            <div className="space-y-4">
              {/* Selector de Partido */}
              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-[#FDB827]" />
                  <span className="text-xs font-bold text-slate-200">
                    Seleccionar Encuentro:
                  </span>
                </div>
                <select
                  value={selectedGameIndex}
                  onChange={(e) => setSelectedGameIndex(Number(e.target.value))}
                  className="bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#FDB827] w-full sm:w-auto cursor-pointer"
                >
                  {data.lineups.gameLineups.map((g, idx) => (
                    <option key={g.gamePk} value={idx}>
                      {g.gameDate} vs {g.opp} ({g.scoreStr}) — {g.won ? "G" : "P"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGame && (
                <>
                  {/* Banner de Partido */}
                  <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-4 shadow-md flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-[#FDB827]/40 bg-[#0D152B] p-1 flex items-center justify-center shrink-0">
                        <Image
                          src="/assets/logo.png"
                          alt="Leones del Caracas"
                          width={40}
                          height={40}
                          className="object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                          <span>🦁 Leones del Caracas</span>
                          <span className="text-xs text-slate-400 font-normal">
                            vs {selectedGame.opp}
                          </span>
                        </h4>
                        <div className="text-xs text-slate-400 font-mono">
                          📅 {selectedGame.gameDate} • Marcador: {selectedGame.scoreStr}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={cn(
                          "text-xs font-black px-3 py-1 rounded-md border",
                          selectedGame.won
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        )}
                      >
                        {selectedGame.won ? "VICTORIA" : "DERROTA"}
                      </span>
                      {selectedGame.oppLogo && (
                        <div className="relative w-8 h-8 shrink-0">
                          <Image
                            src={selectedGame.oppLogo}
                            alt={selectedGame.opp}
                            width={32}
                            height={32}
                            className="object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grilla 3x3 de Titulares (1 al 9) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedGame.starters.map((st) => (
                      <div
                        key={`starter-${st.order}`}
                        className="bg-[#0D152B] border border-white/5 rounded-lg p-3 flex items-center justify-between shadow-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center font-black text-xs text-white"
                            style={{ backgroundColor: st.badgeColor }}
                          >
                            #{st.order}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-100">
                              {st.playerName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {POS_FULL_MAP[st.position] || st.position}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-[#FDB827] border border-white/10">
                          {st.position}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Subtab 2: Combinaciones Frecuentes */}
          {lineupSubtab === "frequent" && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Combinaciones de Orden al Bate Más Utilizadas
              </div>

              <div className="space-y-4">
                {data.lineups.topFrequentLineups.map((lu) => (
                  <div
                    key={`top-lu-${lu.rank}`}
                    className="bg-[#0D152B] border border-[#FDB827]/20 rounded-xl p-4 shadow-md space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded bg-[#FDB827] text-slate-950 font-black text-xs">
                          Top {lu.rank}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {lu.games} Juegos Disputados
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {lu.record}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#FDB827]">
                          {lu.pct} PCT
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {lu.starters.map((st) => (
                        <div
                          key={`lu-st-${st.order}`}
                          className="bg-[#070B19] rounded-lg p-2 flex items-center space-x-2 border border-white/5 text-xs"
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                            style={{ backgroundColor: st.badgeColor }}
                          >
                            {st.order}
                          </span>
                          <span className="font-semibold text-slate-100 truncate flex-1">
                            {st.playerName}
                          </span>
                          <span className="text-[10px] text-[#FDB827] font-mono">
                            {st.position}
                          </span>
                        </div>
                      ))}
                    </div>

                    {lu.gamesDetail && (
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-white/5 flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{lu.gamesDetail}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 3: Matriz de Calor (1 al 9) */}
          {lineupSubtab === "heatmap" && (
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
                <div className="flex items-center space-x-2">
                  <LayoutGrid className="w-4 h-4 text-[#FDB827]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Distribución de Titularidades por Turno al Bate (1ro al 9no)
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  Top 15 Titulares
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                      <th className="py-2.5 px-3 text-left">Pelotero</th>
                      <th className="py-2.5 px-2">1º</th>
                      <th className="py-2.5 px-2">2º</th>
                      <th className="py-2.5 px-2">3º</th>
                      <th className="py-2.5 px-2 text-[#FDB827] font-bold">4º</th>
                      <th className="py-2.5 px-2">5º</th>
                      <th className="py-2.5 px-2">6º</th>
                      <th className="py-2.5 px-2">7º</th>
                      <th className="py-2.5 px-2">8º</th>
                      <th className="py-2.5 px-2">9º</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-200">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.lineups.heatmap.map((row) => (
                      <tr key={row.player} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 text-left font-semibold text-slate-100 truncate">
                          {row.player}
                        </td>
                        {row.counts.map((cnt, slotIdx) => (
                          <td key={`slot-${slotIdx}`} className="py-2.5 px-2 font-mono">
                              {cnt > 0 ? (
                                <span
                                  className={cn(
                                    "px-1.5 py-0.5 rounded text-[11px] font-bold",
                                    slotIdx === 3
                                      ? "bg-[#FDB827]/20 text-[#FDB827]"
                                      : cnt >= 10
                                      ? "bg-blue-600/30 text-blue-300 font-black"
                                      : "bg-white/5 text-slate-300"
                                  )}
                                >
                                  {cnt}
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          ))}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#FDB827]">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 4: Impacto por Jugador */}
          {lineupSubtab === "player" && (
            <div className="space-y-4">
              {/* Selector de Jugador */}
              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-[#FDB827]" />
                  <span className="text-xs font-bold text-slate-200">
                    Seleccionar Pelotero Titular:
                  </span>
                </div>
                <select
                  value={selectedPlayerName}
                  onChange={(e) => setSelectedPlayerName(e.target.value)}
                  className="bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#FDB827] w-full sm:w-auto cursor-pointer"
                >
                  {data.lineups.availablePlayers.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* KPIs de Impacto */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    JUEGOS COMO TITULAR
                  </span>
                  <div className="text-2xl font-black text-slate-100 font-mono">
                    {selectedPlayerImpact.games} JJ
                  </div>
                </div>

                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    RÉCORD DEL EQUIPO
                  </span>
                  <div className="text-2xl font-black text-[#FDB827] font-mono">
                    {selectedPlayerImpact.record}
                  </div>
                </div>

                <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    % DE VICTORIAS
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {selectedPlayerImpact.pct}
                  </div>
                </div>
              </div>

              {/* Tabla de Desglose por Turno al Bate */}
              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Rendimiento y Récord por Turno al Bate de {selectedPlayerImpact.playerName}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-3">Turno al Bate</th>
                        <th className="py-2.5 px-3 text-center">Titularidades</th>
                        <th className="py-2.5 px-3 text-center text-emerald-400 font-bold">Victorias</th>
                        <th className="py-2.5 px-3 text-center text-rose-400 font-bold">Derrotas</th>
                        <th className="py-2.5 px-3 text-right text-[#FDB827] font-bold">% Victorias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {selectedPlayerImpact.breakdown.map((row) => (
                        <tr key={row.slot} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {row.slot}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {row.starts}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400">
                            {row.wins}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-rose-400">
                            {row.losses}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[#FDB827] font-mono font-bold border border-amber-500/20">
                              {row.pct}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Guía Metodológica del Módulo ── */}
      <div className="bg-[#0D152B]/60 border border-[#1E2B4D] rounded-xl p-4 text-xs text-slate-400 space-y-3">
        <div className="flex items-center space-x-2 text-slate-200 font-bold">
          <BookOpen className="w-4 h-4 text-[#FDB827]" />
          <span>Metodología Sabermétrica: Bullpen y Optimización de Órdenes al Bate</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5 space-y-1">
            <div className="text-[#FDB827] font-bold">🛡️ Corredores Heredados (IR / IRS)</div>
            <p className="text-[11px] leading-relaxed">
              IR son corredores que ya estaban en base cuando entró el relevista; IRS son los que lograron anotar. Una tasa IRS% menor al 20% califica al relevista como &apos;apagafuegos élite&apos;.
            </p>
          </div>
          <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5 space-y-1">
            <div className="text-[#FDB827] font-bold">📋 Optimización de Órdenes (The Book)</div>
            <p className="text-[11px] leading-relaxed">
              Según Tom Tango (*The Book*), los turnos #1 y #2 deben maximizar OBP; el #4 y #5 concentran extrabases y SLG para capitalizar corredores en posición anotadora.
            </p>
          </div>
          <div className="bg-white/[0.02] p-3 rounded-lg border border-white/5 space-y-1">
            <div className="text-[#FDB827] font-bold">📊 Rotación de Alineaciones</div>
            <p className="text-[11px] leading-relaxed">
              Monitorear el récord obtenido con combinaciones exactas de 9 peloteros permite identificar sinergias ofensivas para instancias decisivas de postemporada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
