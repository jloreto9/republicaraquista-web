"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Award,
  Zap,
  Flame,
  TrendingUp,
  Shield,
  Target,
  Lock,
  Check,
  Shuffle,
  BarChart2,
  BookOpen,
  ChevronDown,
  Trophy,
  Search,
} from "lucide-react";
import {
  CollectiveStatsResult,
  CollectiveBattingTeam,
  CollectivePitchingTeam,
  CollectiveFieldingTeam,
} from "@/types/collective";
import { cn } from "@/lib/utils";
import { useSeason } from "@/context/season-context";
import { StatheadCollectiveSearch } from "./stathead-collective-search";

interface ColectivasViewProps {
  initialData: CollectiveStatsResult;
  season?: number;
  initialPhase?: string;
}

const PHASES = [
  { value: "R", label: "Temporada Regular" },
  { value: "L", label: "Round Robin (Todos contra Todos)" },
  { value: "F", label: "Serie Final" },
  { value: "all", label: "Todas las Fases" },
];

export function ColectivasView({
  initialData,
  season = 2026,
  initialPhase = "R",
}: ColectivasViewProps) {
  const { season: globalSeason, setSeason: setGlobalSeason } = useSeason();
  const [data, setData] = useState<CollectiveStatsResult>(initialData);
  const [currentSeason, setCurrentSeason] = useState<number>(globalSeason || season);
  const [phase, setPhase] = useState<string>(initialPhase);
  const [activeTab, setActiveTab] = useState<
    "bateo" | "pitcheo" | "fildeo" | "stathead"
  >("bateo");
  const [viewMode, setViewMode] = useState<"totals" | "per_game">("totals");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Métrica seleccionada para el comparador de barras
  const [battingMetric, setBattingMetric] = useState<keyof CollectiveBattingTeam>("ops");
  const [pitchingMetric, setPitchingMetric] = useState<keyof CollectivePitchingTeam>("era");
  const [fieldingMetric, setFieldingMetric] = useState<keyof CollectiveFieldingTeam>("fpct");

  const fetchData = async (newSeason: number, newPhase: string) => {
    setCurrentSeason(newSeason);
    setPhase(newPhase);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stats/collective?season=${newSeason}&phase=${newPhase}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Error cambiando temporada/fase colectiva:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (globalSeason && globalSeason !== currentSeason) {
      fetchData(globalSeason, phase);
    }
  }, [globalSeason]);

  const handlePhaseChange = (newPhase: string) => {
    fetchData(currentSeason, newPhase);
  };

  return (
    <div className="space-y-6">
      {/* ── Barra de Control Superior: Fase y Tabs ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Controles de Temporada y Fase */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Temporada */}
          <div className="flex items-center space-x-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <span className="text-[11px] font-medium text-slate-400">Temporada:</span>
            <select
              value={currentSeason}
              onChange={(e) => {
                const s = Number(e.target.value);
                setGlobalSeason(s);
                fetchData(s, phase);
              }}
              disabled={isLoading}
              className="bg-transparent text-xs font-bold font-mono text-[#FDB827] outline-none cursor-pointer"
            >
              <option value={2026} className="bg-[#070B19] text-slate-200">2026-27 (En Curso)</option>
              <option value={2025} className="bg-[#070B19] text-slate-200">2025-26</option>
            </select>
          </div>

          {/* Selector de Fase */}
          <div className="flex items-center space-x-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <Trophy className="w-3.5 h-3.5 text-[#FDB827]" />
            <span className="text-[11px] font-medium text-slate-400">Fase:</span>
            <select
              value={phase}
              onChange={(e) => handlePhaseChange(e.target.value)}
              disabled={isLoading}
              className="bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer"
            >
              {PHASES.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#070B19]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Modo: Totales vs Por Juego */}
          <div className="flex items-center space-x-1 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D]">
            <button
              type="button"
              onClick={() => setViewMode("totals")}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                viewMode === "totals"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              📊 Totales
            </button>
            <button
              type="button"
              onClick={() => setViewMode("per_game")}
              className={cn(
                "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                viewMode === "per_game"
                  ? "bg-[#FDB827] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              ⚡ Por Juego (/JJ)
            </button>
          </div>

          {isLoading && (
            <span className="text-[11px] text-[#FDB827] font-mono animate-pulse">
              Actualizando...
            </span>
          )}
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex items-center space-x-1.5 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D] self-start md:self-auto">
          <button
            onClick={() => setActiveTab("bateo")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              activeTab === "bateo"
                ? "bg-[#FDB827] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🏏 Bateo</span>
          </button>
          <button
            onClick={() => setActiveTab("pitcheo")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              activeTab === "pitcheo"
                ? "bg-[#FDB827] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>⚡ Pitcheo</span>
          </button>
          <button
            onClick={() => setActiveTab("fildeo")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              activeTab === "fildeo"
                ? "bg-[#FDB827] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>🧤 Fildeo</span>
          </button>
          <button
            onClick={() => setActiveTab("stathead")}
            className={cn(
              "flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              activeTab === "stathead"
                ? "bg-[#FDB827] text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Search className="w-3.5 h-3.5" />
            <span>🔍 Buscador</span>
          </button>
        </div>
      </div>

      {/* ── CONTENIDO: BATEO COLECTIVO ── */}
      {activeTab === "bateo" && (
        <div className="space-y-6">
          {/* Rejilla de 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="LÍDER AVG LIGA"
              value={data.battingKpis.avgVal}
              teamName={data.battingKpis.avgTeam}
              icon={Award}
            />
            <KPICard
              title="LÍDER OPS LIGA"
              value={data.battingKpis.opsVal}
              teamName={data.battingKpis.opsTeam}
              icon={Zap}
            />
            <KPICard
              title="LÍDER JONRONES"
              value={data.battingKpis.hrVal}
              teamName={data.battingKpis.hrTeam}
              icon={Flame}
            />
            <KPICard
              title="LÍDER ANOTADAS"
              value={data.battingKpis.rVal}
              teamName={data.battingKpis.rTeam}
              icon={TrendingUp}
            />
          </div>

          {/* Tabla de Bateo Colectivo */}
          <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                <span>Tabla Comparativa de Bateo Colectivo (8 Equipos)</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {viewMode === "totals"
                  ? "Totales Acumulados • Ordenado por OPS Descendente"
                  : "Promedios por Equipo por Juego (Stats / JJ) • Ordenado por OPS"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                    <th className="py-2.5 px-3">Equipo</th>
                    <th className="py-2.5 px-2 text-center">JJ</th>
                    <th className="py-2.5 px-2 text-center">PA</th>
                    <th className="py-2.5 px-2 text-center">AB</th>
                    <th className="py-2.5 px-2 text-center text-slate-200 font-bold">R</th>
                    <th className="py-2.5 px-2 text-center text-slate-200 font-bold">H</th>
                    <th className="py-2.5 px-2 text-center">2B</th>
                    <th className="py-2.5 px-2 text-center">3B</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">HR</th>
                    <th className="py-2.5 px-2 text-center">RBI</th>
                    <th className="py-2.5 px-2 text-center">BB</th>
                    <th className="py-2.5 px-2 text-center">SO</th>
                    <th className="py-2.5 px-2 text-center">SB</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">AVG</th>
                    <th className="py-2.5 px-2 text-center">OBP</th>
                    <th className="py-2.5 px-2 text-center">SLG</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">OPS</th>
                    <th className="py-2.5 px-2 text-center">LOB</th>
                    <th className="py-2.5 px-2 text-center">BABIP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.batting.map((t) => (
                    <tr
                      key={t.teamId}
                      className={cn(
                        "hover:bg-white/[0.03] transition-colors",
                        t.isLeones &&
                          "bg-[#FDB827]/[0.08] border-l-4 border-l-[#FDB827] font-semibold"
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-[#070B19] p-0.5 shrink-0 flex items-center justify-center">
                            <Image
                              src={t.logo || "/assets/logo.png"}
                              alt={t.teamName}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <span
                            className={cn(
                              "truncate",
                              t.isLeones ? "text-[#FDB827] font-bold" : "text-slate-100"
                            )}
                          >
                            {t.teamName}
                          </span>
                          {t.isLeones && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                              CAR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.games}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.pa / (t.games || 1)).toFixed(1) : t.pa}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">
                        {viewMode === "per_game" ? (t.ab / (t.games || 1)).toFixed(1) : t.ab}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-100">
                        {viewMode === "per_game" ? (t.r / (t.games || 1)).toFixed(1) : t.r}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-100">
                        {viewMode === "per_game" ? (t.h / (t.games || 1)).toFixed(1) : t.h}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.doubles / (t.games || 1)).toFixed(1) : t.doubles}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.triples / (t.games || 1)).toFixed(2) : t.triples}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                        {viewMode === "per_game" ? (t.hr / (t.games || 1)).toFixed(1) : t.hr}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">
                        {viewMode === "per_game" ? (t.rbi / (t.games || 1)).toFixed(1) : t.rbi}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.bb / (t.games || 1)).toFixed(1) : t.bb}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.so / (t.games || 1)).toFixed(1) : t.so}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.sb / (t.games || 1)).toFixed(1) : t.sb}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{t.avgStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{t.obpStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{t.slgStr}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[#FDB827] font-bold border border-amber-500/20">
                          {t.opsStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.lob / (t.games || 1)).toFixed(1) : t.lob}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.babipStr}</td>
                    </tr>
                  ))}
                </tbody>
                {data.battingSummary && (
                  <tfoot className="border-t-2 border-[#FDB827]/40 bg-[#070B19]/95 text-xs font-mono">
                    {/* Fila 1: Total Liga */}
                    <tr className="border-b border-[#1E2B4D]/70 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-[#FDB827]/15 p-0.5 shrink-0 flex items-center justify-center border border-[#FDB827]/40 shadow-sm">
                            <Trophy className="w-3.5 h-3.5 text-[#FDB827]" />
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-[#FDB827] tracking-wider uppercase text-[11px]">
                              TOTAL LIGA
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                              LVBP
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-[#FDB827] font-bold">{data.battingSummary.total.games}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.pa.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-200">{data.battingSummary.total.ab.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-100">{data.battingSummary.total.r.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-slate-100">{data.battingSummary.total.h.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.doubles.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.triples.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#FDB827]">{data.battingSummary.total.hr.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-200">{data.battingSummary.total.rbi.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.bb.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.so.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.sb.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#FDB827]">{data.battingSummary.total.avgStr}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{data.battingSummary.total.obpStr}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{data.battingSummary.total.slgStr}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FDB827] font-bold border border-amber-500/30">
                          {data.battingSummary.total.opsStr}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.lob.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.battingSummary.total.babipStr}</td>
                    </tr>

                    {/* Fila 2: Promedio por Juego (Partido Completo) */}
                    <tr className="bg-cyan-500/[0.04] hover:bg-cyan-500/[0.07] transition-colors border-t border-cyan-500/20">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-cyan-500/15 p-0.5 shrink-0 flex items-center justify-center border border-cyan-500/30">
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-cyan-400 tracking-wider uppercase text-[11px]">
                                PROM. POR JUEGO
                              </span>
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                9 INN
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400">
                              Partido Completo
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-cyan-400 font-bold">1 PJ</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.pa}</td>
                      <td className="py-2.5 px-2 text-center text-slate-200">{data.battingSummary.perGame.ab}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-cyan-300">{data.battingSummary.perGame.r}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-cyan-300">{data.battingSummary.perGame.h}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.doubles}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.triples}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{data.battingSummary.perGame.hr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-200">{data.battingSummary.perGame.rbi}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.bb}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.so}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.sb}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{data.battingSummary.perGame.avgStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.battingSummary.perGame.obpStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.battingSummary.perGame.slgStr}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30">
                          {data.battingSummary.perGame.opsStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.lob}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.battingSummary.perGame.babipStr}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Gráfico Comparativo Horizontal */}
          <HorizontalBarChart
            title="COMPARADOR GRÁFICO DE OFENSIVA"
            items={data.batting.map((b) => ({
              teamName: b.teamName,
              teamAbbr: b.teamAbbr,
              logo: b.logo,
              value: Number(b[battingMetric] || 0),
              valueStr: String(b[battingMetric] || 0),
              isLeones: b.isLeones,
            }))}
            selectedMetric={String(battingMetric)}
            onMetricChange={(m) => setBattingMetric(m as keyof CollectiveBattingTeam)}
            metricOptions={[
              { value: "ops", label: "OPS Colectivo" },
              { value: "avg", label: "Promedio (AVG)" },
              { value: "obp", label: "Embasado (OBP)" },
              { value: "slg", label: "Slugging (SLG)" },
              { value: "hr", label: "Jonrones (HR)" },
              { value: "r", label: "Carreras Anotadas (R)" },
              { value: "h", label: "Hits Totales (H)" },
              { value: "bb", label: "Boletos (BB)" },
              { value: "sb", label: "Bases Robadas (SB)" },
              { value: "lob", label: "Dejados en Base (LOB)" },
            ]}
          />

          {/* Glosario de Bateo */}
          <GlossarySection
            title="Glosario: Métricas de Bateo Colectivo"
            items={[
              {
                term: "R (Carreras)",
                desc: "Total de anotaciones registradas por el equipo en la fase seleccionada.",
              },
              {
                term: "OPS Colectivo",
                desc: "On-base Plus Slugging global. Mide la potencia combinada de la franquicia.",
              },
              {
                term: "LOB (Left On Base)",
                desc: "Corredores dejados en base que no lograron anotar durante las entradas.",
              },
              {
                term: "BABIP Colectivo",
                desc: "Promedio de bateo en bolas puestas en juego por todo el lineup.",
              },
            ]}
          />
        </div>
      )}

      {/* ── CONTENIDO: PITCHEO COLECTIVO ── */}
      {activeTab === "pitcheo" && (
        <div className="space-y-6">
          {/* Rejilla de 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="MEJOR EFECTIVIDAD"
              value={data.pitchingKpis.eraVal}
              teamName={data.pitchingKpis.eraTeam}
              icon={Shield}
            />
            <KPICard
              title="MEJOR WHIP LIGA"
              value={data.pitchingKpis.whipVal}
              teamName={data.pitchingKpis.whipTeam}
              icon={Target}
            />
            <KPICard
              title="LÍDER EN PONCHES"
              value={data.pitchingKpis.soVal}
              teamName={data.pitchingKpis.soTeam}
              icon={Zap}
            />
            <KPICard
              title="LÍDER EN SALVADOS"
              value={data.pitchingKpis.svVal}
              teamName={data.pitchingKpis.svTeam}
              icon={Lock}
            />
          </div>

          {/* Tabla de Pitcheo Colectivo */}
          <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Staff Monticular y Efectividad Colectiva (8 Equipos)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {viewMode === "totals"
                  ? "Totales Acumulados • Ordenado por ERA Ascendente"
                  : "Promedios por Equipo por Juego (Stats / JJ) • Ordenado por ERA"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                    <th className="py-2.5 px-3">Equipo</th>
                    <th className="py-2.5 px-2 text-center">JJ</th>
                    <th className="py-2.5 px-2 text-center text-emerald-400 font-bold">G</th>
                    <th className="py-2.5 px-2 text-center text-rose-400 font-bold">P</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">ERA</th>
                    <th className="py-2.5 px-2 text-center text-slate-200 font-bold">WHIP</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">SV</th>
                    <th className="py-2.5 px-2 text-center">HLD</th>
                    <th className="py-2.5 px-2 text-center">BS</th>
                    <th className="py-2.5 px-2 text-center">IP</th>
                    <th className="py-2.5 px-2 text-center">H</th>
                    <th className="py-2.5 px-2 text-center">R</th>
                    <th className="py-2.5 px-2 text-center">CL</th>
                    <th className="py-2.5 px-2 text-center">BB</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">SO</th>
                    <th className="py-2.5 px-2 text-center">HR</th>
                    <th className="py-2.5 px-2 text-center">K/9</th>
                    <th className="py-2.5 px-2 text-center">BB/9</th>
                    <th className="py-2.5 px-2 text-center">K/BB</th>
                    <th className="py-2.5 px-2 text-center">BAA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.pitching.map((t) => (
                    <tr
                      key={t.teamId}
                      className={cn(
                        "hover:bg-white/[0.03] transition-colors",
                        t.isLeones &&
                          "bg-[#FDB827]/[0.08] border-l-4 border-l-[#FDB827] font-semibold"
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-[#070B19] p-0.5 shrink-0 flex items-center justify-center">
                            <Image
                              src={t.logo || "/assets/logo.png"}
                              alt={t.teamName}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <span
                            className={cn(
                              "truncate",
                              t.isLeones ? "text-[#FDB827] font-bold" : "text-slate-100"
                            )}
                          >
                            {t.teamName}
                          </span>
                          {t.isLeones && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                              CAR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.games}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-emerald-400">
                        {viewMode === "per_game" ? (t.wins / (t.games || 1)).toFixed(2) : t.wins}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-rose-400">
                        {viewMode === "per_game" ? (t.losses / (t.games || 1)).toFixed(2) : t.losses}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[#FDB827] font-bold border border-amber-500/20">
                          {t.eraStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-slate-100">
                        {t.whipStr}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                        {viewMode === "per_game" ? (t.sv / (t.games || 1)).toFixed(2) : t.sv}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.holds / (t.games || 1)).toFixed(2) : t.holds}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.blownSaves / (t.games || 1)).toFixed(2) : t.blownSaves}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">
                        {viewMode === "per_game" ? (t.ip / (t.games || 1)).toFixed(1) : t.ipStr}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.h / (t.games || 1)).toFixed(1) : t.h}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.r / (t.games || 1)).toFixed(1) : t.r}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.er / (t.games || 1)).toFixed(1) : t.er}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.bb / (t.games || 1)).toFixed(1) : t.bb}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                        {viewMode === "per_game" ? (t.so / (t.games || 1)).toFixed(1) : t.so}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.hr / (t.games || 1)).toFixed(1) : t.hr}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.k9Str}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.bb9Str}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.kbbStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{t.baaStr}</td>
                    </tr>
                  ))}
                </tbody>
                {data.pitchingSummary && (
                  <tfoot className="border-t-2 border-[#FDB827]/40 bg-[#070B19]/95 text-xs font-mono">
                    {/* Fila 1: Total Liga */}
                    <tr className="border-b border-[#1E2B4D]/70 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-[#FDB827]/15 p-0.5 shrink-0 flex items-center justify-center border border-[#FDB827]/40 shadow-sm">
                            <Trophy className="w-3.5 h-3.5 text-[#FDB827]" />
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-[#FDB827] tracking-wider uppercase text-[11px]">
                              TOTAL LIGA
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                              LVBP
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-[#FDB827] font-bold">{data.pitchingSummary.total.games}</td>
                      <td className="py-3 px-2 text-center font-bold text-emerald-400">{data.pitchingSummary.total.wins}</td>
                      <td className="py-3 px-2 text-center font-bold text-rose-400">{data.pitchingSummary.total.losses}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FDB827] font-bold border border-amber-500/30">
                          {data.pitchingSummary.total.eraStr}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-slate-100">{data.pitchingSummary.total.whipStr}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#FDB827]">{data.pitchingSummary.total.sv}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.holds}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.blownSaves}</td>
                      <td className="py-3 px-2 text-center text-slate-200">{data.pitchingSummary.total.ipStr}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.h.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.r.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.er.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.bb.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#FDB827]">{data.pitchingSummary.total.so.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.hr.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.k9Str}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.bb9Str}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.pitchingSummary.total.kbbStr}</td>
                      <td className="py-3 px-2 text-center text-slate-300">{data.pitchingSummary.total.baaStr}</td>
                    </tr>

                    {/* Fila 2: Promedio por Juego (Partido Completo) */}
                    <tr className="bg-cyan-500/[0.04] hover:bg-cyan-500/[0.07] transition-colors border-t border-cyan-500/20">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-cyan-500/15 p-0.5 shrink-0 flex items-center justify-center border border-cyan-500/30">
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-cyan-400 tracking-wider uppercase text-[11px]">
                                PROM. POR JUEGO
                              </span>
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                9 INN
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400">
                              Partido Completo
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-cyan-400 font-bold">1 PJ</td>
                      <td className="py-2.5 px-2 text-center text-emerald-400/80">{data.pitchingSummary.perGame.wins}</td>
                      <td className="py-2.5 px-2 text-center text-rose-400/80">{data.pitchingSummary.perGame.losses}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/30">
                          {data.pitchingSummary.perGame.eraStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-cyan-300">{data.pitchingSummary.perGame.whipStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.pitchingSummary.perGame.sv}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.pitchingSummary.perGame.holds}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.pitchingSummary.perGame.blownSaves}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.pitchingSummary.perGame.ipStr}</td>
                      <td className="py-2.5 px-2 text-center text-cyan-300 font-bold">{data.pitchingSummary.perGame.h}</td>
                      <td className="py-2.5 px-2 text-center text-cyan-300 font-bold">{data.pitchingSummary.perGame.r}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.pitchingSummary.perGame.er}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.pitchingSummary.perGame.bb}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{data.pitchingSummary.perGame.so}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.pitchingSummary.perGame.hr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.pitchingSummary.perGame.k9Str}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.pitchingSummary.perGame.bb9Str}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.pitchingSummary.perGame.kbbStr}</td>
                      <td className="py-2.5 px-2 text-center text-slate-300">{data.pitchingSummary.perGame.baaStr}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Gráfico Comparativo de Pitcheo */}
          <HorizontalBarChart
            title="COMPARADOR GRÁFICO DE PITCHEO"
            items={data.pitching.map((p) => ({
              teamName: p.teamName,
              teamAbbr: p.teamAbbr,
              logo: p.logo,
              value: Number(p[pitchingMetric] || 0),
              valueStr: String(p[pitchingMetric] || 0),
              isLeones: p.isLeones,
            }))}
            selectedMetric={String(pitchingMetric)}
            onMetricChange={(m) => setPitchingMetric(m as keyof CollectivePitchingTeam)}
            metricOptions={[
              { value: "era", label: "Efectividad (ERA)" },
              { value: "whip", label: "WHIP" },
              { value: "so", label: "Ponches (SO)" },
              { value: "k9", label: "Ponches por 9 (K/9)" },
              { value: "bb", label: "Boletos Otorgados (BB)" },
              { value: "kbb", label: "Relación K/BB" },
              { value: "sv", label: "Juegos Salvados (SV)" },
              { value: "baa", label: "Promedio Bateo Oponente (BAA)" },
            ]}
            inverted={pitchingMetric === "era" || pitchingMetric === "whip" || pitchingMetric === "bb"}
          />

          {/* Glosario de Pitcheo */}
          <GlossarySection
            title="Glosario: Métricas de Pitcheo Colectivo"
            items={[
              {
                term: "ERA Colectivo",
                desc: "Carreras limpias permitidas por el staff monticular completo cada 9 entradas.",
              },
              {
                term: "WHIP Colectivo",
                desc: "Tráfico promedio de corredores (hits + bases por bolas) permitidos por entrada.",
              },
              {
                term: "HLD & BS",
                desc: "Holds y Blown Saves: miden la retención o pérdida de ventajas del cuerpo de relevistas.",
              },
              {
                term: "BAA",
                desc: "Batting Average Against: promedio de bateo que le conectan a los lanzadores del equipo.",
              },
            ]}
          />
        </div>
      )}

      {/* ── CONTENIDO: FILDEO COLECTIVO ── */}
      {activeTab === "fildeo" && (
        <div className="space-y-6">
          {/* Rejilla de 4 KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="MEJOR % FILDEO"
              value={data.fieldingKpis.fpctVal}
              teamName={data.fieldingKpis.fpctTeam}
              icon={Check}
            />
            <KPICard
              title="MENOS ERRORES"
              value={data.fieldingKpis.eVal}
              teamName={data.fieldingKpis.eTeam}
              icon={Shield}
            />
            <KPICard
              title="MÁS DOUBLE PLAYS"
              value={data.fieldingKpis.dpVal}
              teamName={data.fieldingKpis.dpTeam}
              icon={Shuffle}
            />
            <KPICard
              title="MEJOR % CAPTURA"
              value={data.fieldingKpis.csPctVal}
              teamName={data.fieldingKpis.csPctTeam}
              icon={Lock}
            />
          </div>

          {/* Tabla de Fildeo Colectivo */}
          <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Solidez Defensiva y Fildeo Colectivo (8 Equipos)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {viewMode === "totals"
                  ? "Totales Acumulados • Ordenado por % de Fildeo (FPCT)"
                  : "Promedios por Equipo por Juego (Stats / JJ) • Ordenado por FPCT"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E2B4D] text-slate-400 text-[11px]">
                    <th className="py-2.5 px-3">Equipo</th>
                    <th className="py-2.5 px-2 text-center">JJ</th>
                    <th className="py-2.5 px-2 text-center">Inn</th>
                    <th className="py-2.5 px-2 text-center">PO</th>
                    <th className="py-2.5 px-2 text-center">A</th>
                    <th className="py-2.5 px-2 text-center text-rose-400 font-bold">E</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">TC</th>
                    <th className="py-2.5 px-2 text-center text-emerald-400 font-bold">FPCT</th>
                    <th className="py-2.5 px-2 text-center">DP</th>
                    <th className="py-2.5 px-2 text-center">TP</th>
                    <th className="py-2.5 px-2 text-center">PB</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">CS</th>
                    <th className="py-2.5 px-2 text-center">SB</th>
                    <th className="py-2.5 px-2 text-center text-[#FDB827] font-bold">CS%</th>
                    <th className="py-2.5 px-2 text-center">RF/9</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.fielding.map((t) => (
                    <tr
                      key={t.teamId}
                      className={cn(
                        "hover:bg-white/[0.03] transition-colors",
                        t.isLeones &&
                          "bg-[#FDB827]/[0.08] border-l-4 border-l-[#FDB827] font-semibold"
                      )}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-[#070B19] p-0.5 shrink-0 flex items-center justify-center">
                            <Image
                              src={t.logo || "/assets/logo.png"}
                              alt={t.teamName}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </div>
                          <span
                            className={cn(
                              "truncate",
                              t.isLeones ? "text-[#FDB827] font-bold" : "text-slate-100"
                            )}
                          >
                            {t.teamName}
                          </span>
                          {t.isLeones && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                              CAR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.games}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (parseFloat(t.innings) / (t.games || 1)).toFixed(1) : t.innings}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">
                        {viewMode === "per_game" ? (t.po / (t.games || 1)).toFixed(1) : t.po}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">
                        {viewMode === "per_game" ? (t.a / (t.games || 1)).toFixed(1) : t.a}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-rose-400">
                        {viewMode === "per_game" ? (t.e / (t.games || 1)).toFixed(1) : t.e}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                        {viewMode === "per_game" ? (t.tc / (t.games || 1)).toFixed(1) : t.tc}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          {t.fpctStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">
                        {viewMode === "per_game" ? (t.dp / (t.games || 1)).toFixed(1) : t.dp}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.tp / (t.games || 1)).toFixed(2) : t.tp}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.pb / (t.games || 1)).toFixed(2) : t.pb}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">
                        {viewMode === "per_game" ? (t.cs / (t.games || 1)).toFixed(2) : t.cs}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">
                        {viewMode === "per_game" ? (t.sb / (t.games || 1)).toFixed(1) : t.sb}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-[#FDB827] font-bold border border-amber-500/20">
                          {t.csPctStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{t.rf9Str}</td>
                    </tr>
                  ))}
                </tbody>
                {data.fieldingSummary && (
                  <tfoot className="border-t-2 border-[#FDB827]/40 bg-[#070B19]/95 text-xs font-mono">
                    {/* Fila 1: Total Liga */}
                    <tr className="border-b border-[#1E2B4D]/70 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-[#FDB827]/15 p-0.5 shrink-0 flex items-center justify-center border border-[#FDB827]/40 shadow-sm">
                            <Trophy className="w-3.5 h-3.5 text-[#FDB827]" />
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-[#FDB827] tracking-wider uppercase text-[11px]">
                              TOTAL LIGA
                            </span>
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                              LVBP
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center text-[#FDB827] font-bold">{data.fieldingSummary.total.games}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.fieldingSummary.total.innings}</td>
                      <td className="py-3 px-2 text-center text-slate-200">{data.fieldingSummary.total.po.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-200">{data.fieldingSummary.total.a.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-rose-400">{data.fieldingSummary.total.e.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#FDB827]">{data.fieldingSummary.total.tc.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          {data.fieldingSummary.total.fpctStr}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-200">{data.fieldingSummary.total.dp.toLocaleString()}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.fieldingSummary.total.tp}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.fieldingSummary.total.pb}</td>
                      <td className="py-3 px-2 text-center font-bold text-[#FDB827]">{data.fieldingSummary.total.cs}</td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.fieldingSummary.total.sb}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FDB827] font-bold border border-amber-500/30">
                          {data.fieldingSummary.total.csPctStr}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400">{data.fieldingSummary.total.rf9Str}</td>
                    </tr>

                    {/* Fila 2: Promedio por Juego (Partido Completo) */}
                    <tr className="bg-cyan-500/[0.04] hover:bg-cyan-500/[0.07] transition-colors border-t border-cyan-500/20">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="relative w-6 h-6 rounded bg-cyan-500/15 p-0.5 shrink-0 flex items-center justify-center border border-cyan-500/30">
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-cyan-400 tracking-wider uppercase text-[11px]">
                                PROM. POR JUEGO
                              </span>
                              <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                9 INN
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400">
                              Partido Completo
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-cyan-400 font-bold">1 PJ</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.fieldingSummary.perGame.innings}</td>
                      <td className="py-2.5 px-2 text-center text-slate-200">{data.fieldingSummary.perGame.po}</td>
                      <td className="py-2.5 px-2 text-center text-slate-200">{data.fieldingSummary.perGame.a}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-rose-400/90">{data.fieldingSummary.perGame.e}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-cyan-300">{data.fieldingSummary.perGame.tc}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                          {data.fieldingSummary.perGame.fpctStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-200">{data.fieldingSummary.perGame.dp}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.fieldingSummary.perGame.tp}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.fieldingSummary.perGame.pb}</td>
                      <td className="py-2.5 px-2 text-center font-bold text-[#FDB827]">{data.fieldingSummary.perGame.cs}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.fieldingSummary.perGame.sb}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">
                          {data.fieldingSummary.perGame.csPctStr}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{data.fieldingSummary.perGame.rf9Str}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Gráfico Comparativo de Fildeo */}
          <HorizontalBarChart
            title="COMPARADOR GRÁFICO DE FILDEO"
            items={data.fielding.map((f) => ({
              teamName: f.teamName,
              teamAbbr: f.teamAbbr,
              logo: f.logo,
              value: Number(f[fieldingMetric] || 0),
              valueStr: String(f[fieldingMetric] || 0),
              isLeones: f.isLeones,
            }))}
            selectedMetric={String(fieldingMetric)}
            onMetricChange={(m) => setFieldingMetric(m as keyof CollectiveFieldingTeam)}
            metricOptions={[
              { value: "fpct", label: "Porcentaje de Fildeo (FPCT)" },
              { value: "e", label: "Errores (E)" },
              { value: "dp", label: "Doble Plays (DP)" },
              { value: "a", label: "Asistencias (A)" },
              { value: "po", label: "Putouts (PO)" },
              { value: "tc", label: "Chances Totales (TC)" },
              { value: "csPct", label: "% Captura Receptores (CS%)" },
            ]}
            inverted={fieldingMetric === "e"}
          />

          {/* Glosario de Fildeo */}
          <GlossarySection
            title="Glosario: Métricas de Fildeo Colectivo"
            items={[
              {
                term: "FPCT Colectivo",
                desc: "Porcentaje de fildeo sin error de toda la franquicia.",
              },
              {
                term: "DP (Double Plays)",
                desc: "Jugadas de dos outs completadas para abortar rallies ofensivos rivales.",
              },
              {
                term: "CS% Colectivo",
                desc: "Eficiencia de la receptoría para atrapar corredores en intento de robo.",
              },
            ]}
          />
        </div>
      )}

      {/* ── CONTENIDO: BUSCADOR STATHEAD CON RANGO DE FECHAS ── */}
      {activeTab === "stathead" && (
        <StatheadCollectiveSearch initialSeason={currentSeason} />
      )}
    </div>
  );
}

// ── Componente de Tarjeta KPI ────────────────────────────────────────────────
function KPICard({
  title,
  value,
  teamName,
  icon: Icon,
}: {
  title: string;
  value: string;
  teamName: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <Icon className="w-4 h-4 text-[#FDB827]" />
      </div>
      <div className="my-1.5">
        <div className="text-xl font-black text-slate-100 font-mono tracking-tight">
          {value}
        </div>
        <div className="text-xs font-semibold text-[#FDB827] truncate">{teamName}</div>
      </div>
    </div>
  );
}

// ── Comparador Gráfico Horizontal de Barras ──────────────────────────────────
function HorizontalBarChart({
  title,
  items,
  selectedMetric,
  onMetricChange,
  metricOptions,
  inverted = false,
}: {
  title: string;
  items: {
    teamName: string;
    teamAbbr: string;
    logo: string;
    value: number;
    valueStr: string;
    isLeones: boolean;
  }[];
  selectedMetric: string;
  onMetricChange: (m: string) => void;
  metricOptions: { value: string; label: string }[];
  inverted?: boolean;
}) {
  // Ordenar los equipos según la métrica seleccionada
  const sorted = [...items].sort((a, b) =>
    inverted ? a.value - b.value : b.value - a.value
  );

  const maxVal = Math.max(...sorted.map((s) => s.value), 0.001);

  return (
    <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2B4D] pb-3">
        <div className="flex items-center space-x-2">
          <BarChart2 className="w-4 h-4 text-[#FDB827]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {title}
          </h4>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold">Métrica:</span>
          <select
            value={selectedMetric}
            onChange={(e) => onMetricChange(e.target.value)}
            className="bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FDB827]"
          >
            {metricOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2.5 pt-1">
        {sorted.map((item, idx) => {
          const widthPct = Math.max(8, Math.min(100, (item.value / maxVal) * 100));

          return (
            <div key={item.teamAbbr} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-slate-400 w-3">{idx + 1}</span>
                  <div className="relative w-4 h-4 shrink-0">
                    <Image
                      src={item.logo || "/assets/logo.png"}
                      alt={item.teamName}
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  </div>
                  <span
                    className={cn(
                      "font-semibold truncate",
                      item.isLeones ? "text-[#FDB827]" : "text-slate-200"
                    )}
                  >
                    {item.teamName}
                  </span>
                  {item.isLeones && (
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827]">
                      CAR
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold text-slate-100">{item.valueStr}</span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full bg-[#070B19] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    item.isLeones
                      ? "bg-gradient-to-r from-[#FDB827]/70 to-[#FDB827]"
                      : "bg-gradient-to-r from-blue-600/70 to-blue-400"
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Glosario Metodológico ───────────────────────────────────────────────────
function GlossarySection({
  title,
  items,
}: {
  title: string;
  items: { term: string; desc: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#0D152B]/60 border border-[#1E2B4D] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-[#FDB827] hover:bg-white/[0.02]"
      >
        <div className="flex items-center space-x-2">
          <BookOpen className="w-4 h-4" />
          <span>📖 {title}</span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[#1E2B4D]/60 text-xs">
          {items.map((it) => (
            <div key={it.term} className="text-slate-300">
              <span className="font-bold text-slate-100">{it.term}:</span>{" "}
              <span className="text-slate-400">{it.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
