"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Calendar,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  SlidersHorizontal,
  Flame,
  Shield,
  Zap,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  CollectiveStatsResult,
  CollectiveBattingTeam,
  CollectivePitchingTeam,
  StatheadDeltaValue,
  StatheadTeamComparison,
} from "@/types/collective";
import { cn } from "@/lib/utils";

interface StatheadCollectiveSearchProps {
  initialSeason: number;
}

type StatGroup = "batting" | "pitching";

export function StatheadCollectiveSearch({
  initialSeason,
}: StatheadCollectiveSearchProps) {
  const [season, setSeason] = useState<number>(initialSeason);
  const [group, setGroup] = useState<StatGroup>("batting");
  const [compareEnabled, setCompareEnabled] = useState<boolean>(true);
  const [compareSeason, setCompareSeason] = useState<number>(initialSeason - 1);

  // Fechas actuales
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  // Por defecto, últimos 14 días o mes actual
  const [startDate, setStartDate] = useState<string>(() => {
    // Si la temporada es previa a hoy, usar fechas de octubre
    return `${initialSeason}-10-12`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return `${initialSeason}-10-31`;
  });

  // Fechas comparación (año anterior)
  const [prevStartDate, setPrevStartDate] = useState<string>(() => {
    return `${initialSeason - 1}-10-12`;
  });
  const [prevEndDate, setPrevEndDate] = useState<string>(() => {
    return `${initialSeason - 1}-10-31`;
  });

  // Datos
  const [currentData, setCurrentData] = useState<CollectiveStatsResult | null>(null);
  const [prevData, setPrevData] = useState<CollectiveStatsResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ordenamiento
  const [sortField, setSortField] = useState<string>("ops");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Sincronizar fechas previas cuando cambian las fechas actuales
  const handleCurrentDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      try {
        const sYear = parseInt(start.split("-")[0], 10);
        const eYear = parseInt(end.split("-")[0], 10);
        const pStartYear = sYear - 1;
        const pEndYear = eYear - 1;
        setPrevStartDate(start.replace(`${sYear}`, `${pStartYear}`));
        setPrevEndDate(end.replace(`${eYear}`, `${pEndYear}`));
      } catch {
        // Fallback silencioso
      }
    }
  };

  // Presets
  const applyPreset = (preset: "7d" | "14d" | "oct" | "nov" | "dic" | "all") => {
    let s = "";
    let e = "";
    if (preset === "7d") {
      const d = new Date();
      const past = new Date(d);
      past.setDate(d.getDate() - 7);
      s = past.toISOString().split("T")[0];
      e = d.toISOString().split("T")[0];
    } else if (preset === "14d") {
      const d = new Date();
      const past = new Date(d);
      past.setDate(d.getDate() - 14);
      s = past.toISOString().split("T")[0];
      e = d.toISOString().split("T")[0];
    } else if (preset === "oct") {
      s = `${season}-10-12`;
      e = `${season}-10-31`;
    } else if (preset === "nov") {
      s = `${season}-11-01`;
      e = `${season}-11-30`;
    } else if (preset === "dic") {
      s = `${season}-12-01`;
      e = `${season}-12-31`;
    } else if (preset === "all") {
      s = `${season}-10-12`;
      e = `${season + 1}-01-31`;
    }

    handleCurrentDateChange(s, e);
  };

  // Ejecutar consulta
  const executeQuery = async () => {
    if (!startDate || !endDate) {
      setErrorMsg("Debes especificar fecha de inicio y fin.");
      return;
    }
    if (startDate > endDate) {
      setErrorMsg("La fecha de inicio no puede ser posterior a la fecha final.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const fetchCurrent = fetch(
        `/api/stats/collective?season=${season}&startDate=${startDate}&endDate=${endDate}`
      ).then((r) => r.json() as Promise<{ success: boolean; data?: CollectiveStatsResult }>);

      let fetchPrev: Promise<{ success: boolean; data?: CollectiveStatsResult } | null> =
        Promise.resolve(null);
      if (compareEnabled && prevStartDate && prevEndDate) {
        fetchPrev = fetch(
          `/api/stats/collective?season=${compareSeason}&startDate=${prevStartDate}&endDate=${prevEndDate}`
        ).then((r) => r.json());
      }

      const [currRes, prevRes] = await Promise.all([fetchCurrent, fetchPrev]);

      if (currRes && currRes.success && currRes.data) {
        setCurrentData(currRes.data);
      } else {
        setErrorMsg("No se pudieron obtener estadísticas para el período actual.");
      }

      if (prevRes && prevRes.success && prevRes.data) {
        setPrevData(prevRes.data);
      } else {
        setPrevData(null);
      }
    } catch (err) {
      console.error("Error en Stathead search:", err);
      setErrorMsg("Error de conexión al consultar estadísticas.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar búsqueda inicial
  useEffect(() => {
    executeQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, group]);

  // Modificar campo por defecto al cambiar de grupo
  useEffect(() => {
    if (group === "batting") {
      setSortField("ops");
      setSortAsc(false);
    } else {
      setSortField("era");
      setSortAsc(true);
    }
  }, [group]);

  // Unión y cálculo de deltas de bateo
  const battingComparisons = useMemo(() => {
    if (!currentData) return [];
    const prevMap = new Map<number, CollectiveBattingTeam>();
    if (prevData?.batting) {
      prevData.batting.forEach((t) => prevMap.set(t.teamId, t));
    }

    return currentData.batting.map((curr) => {
      const prev = prevMap.get(curr.teamId) || null;
      const deltas: Record<string, StatheadDeltaValue> = {};

      const computeDelta = (
        key: keyof CollectiveBattingTeam,
        positiveIsGood = true,
        decimals = 3
      ) => {
        if (!prev) return;
        const cVal = Number(curr[key]) || 0;
        const pVal = Number(prev[key]) || 0;
        const diff = cVal - pVal;
        const sign = diff > 0 ? "+" : "";
        deltas[key as string] = {
          value: diff,
          formatted: `${sign}${diff.toFixed(decimals)}`,
          positiveIsGood,
        };
      };

      computeDelta("avg", true, 3);
      computeDelta("obp", true, 3);
      computeDelta("slg", true, 3);
      computeDelta("ops", true, 3);
      computeDelta("r", true, 0);
      computeDelta("h", true, 0);
      computeDelta("hr", true, 0);
      computeDelta("bb", true, 0);
      computeDelta("so", false, 0);

      return {
        teamId: curr.teamId,
        teamName: curr.teamName,
        teamAbbr: curr.teamAbbr,
        logo: curr.logo,
        isLeones: curr.isLeones,
        current: curr,
        previous: prev,
        deltas,
      };
    });
  }, [currentData, prevData]);

  // Unión y cálculo de deltas de pitcheo
  const pitchingComparisons = useMemo(() => {
    if (!currentData) return [];
    const prevMap = new Map<number, CollectivePitchingTeam>();
    if (prevData?.pitching) {
      prevData.pitching.forEach((t) => prevMap.set(t.teamId, t));
    }

    return currentData.pitching.map((curr) => {
      const prev = prevMap.get(curr.teamId) || null;
      const deltas: Record<string, StatheadDeltaValue> = {};

      const computeDelta = (
        key: keyof CollectivePitchingTeam,
        positiveIsGood = false,
        decimals = 2
      ) => {
        if (!prev) return;
        const cVal = Number(curr[key]) || 0;
        const pVal = Number(prev[key]) || 0;
        const diff = cVal - pVal;
        const sign = diff > 0 ? "+" : "";
        deltas[key as string] = {
          value: diff,
          formatted: `${sign}${diff.toFixed(decimals)}`,
          positiveIsGood,
        };
      };

      computeDelta("era", false, 2);
      computeDelta("whip", false, 2);
      computeDelta("k9", true, 2);
      computeDelta("bb9", false, 2);
      computeDelta("so", true, 0);
      computeDelta("bb", false, 0);
      computeDelta("r", false, 0);
      computeDelta("hr", false, 0);

      return {
        teamId: curr.teamId,
        teamName: curr.teamName,
        teamAbbr: curr.teamAbbr,
        logo: curr.logo,
        isLeones: curr.isLeones,
        current: curr,
        previous: prev,
        deltas,
      };
    });
  }, [currentData, prevData]);

  // Lista ordenada
  const sortedBatting = useMemo(() => {
    return [...battingComparisons].sort((a, b) => {
      const aVal = Number(a.current[sortField as keyof CollectiveBattingTeam]) || 0;
      const bVal = Number(b.current[sortField as keyof CollectiveBattingTeam]) || 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [battingComparisons, sortField, sortAsc]);

  const sortedPitching = useMemo(() => {
    return [...pitchingComparisons].sort((a, b) => {
      const aVal = Number(a.current[sortField as keyof CollectivePitchingTeam]) || 0;
      const bVal = Number(b.current[sortField as keyof CollectivePitchingTeam]) || 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
  }, [pitchingComparisons, sortField, sortAsc]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Para métricas donde menos es mejor (ERA, WHIP, BB/9), ordenar ascendente por defecto
      if (["era", "whip", "bb9", "e"].includes(field)) {
        setSortAsc(true);
      } else {
        setSortAsc(false);
      }
    }
  };

  // Renderizador de Badge Delta
  const renderDelta = (delta?: StatheadDeltaValue, suffix = "") => {
    if (!delta || isNaN(delta.value) || delta.value === 0) {
      return (
        <span className="inline-flex items-center text-[10px] text-slate-500 font-mono">
          <Minus className="w-2.5 h-2.5 mr-0.5 opacity-60" /> 0.0
        </span>
      );
    }

    const isGood = delta.positiveIsGood ? delta.value > 0 : delta.value < 0;
    const colorClass = isGood
      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
      : "text-rose-400 bg-rose-950/40 border-rose-800/40";

    return (
      <span
        className={cn(
          "inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold",
          colorClass
        )}
      >
        {delta.value > 0 ? (
          <TrendingUp className="w-2.5 h-2.5 mr-0.5 shrink-0" />
        ) : (
          <TrendingDown className="w-2.5 h-2.5 mr-0.5 shrink-0" />
        )}
        {delta.formatted}
        {suffix}
      </span>
    );
  };

  // Deltas de la Liga (tfoot summary)
  const leagueBattingDelta = useMemo(() => {
    if (!currentData?.battingSummary || !prevData?.battingSummary) return null;
    const c = currentData.battingSummary;
    const p = prevData.battingSummary;

    const cAvg = Number(c.total.avg) || 0;
    const pAvg = Number(p.total.avg) || 0;
    const cOps = Number(c.total.ops) || 0;
    const pOps = Number(p.total.ops) || 0;

    const cR_PG = parseFloat(c.perGame["r"] || "0");
    const pR_PG = parseFloat(p.perGame["r"] || "0");

    return {
      avg: {
        value: cAvg - pAvg,
        formatted: `${cAvg - pAvg > 0 ? "+" : ""}${(cAvg - pAvg).toFixed(3)}`,
        positiveIsGood: true,
      },
      ops: {
        value: cOps - pOps,
        formatted: `${cOps - pOps > 0 ? "+" : ""}${(cOps - pOps).toFixed(3)}`,
        positiveIsGood: true,
      },
      r_pg: {
        value: cR_PG - pR_PG,
        formatted: `${cR_PG - pR_PG > 0 ? "+" : ""}${(cR_PG - pR_PG).toFixed(1)}`,
        positiveIsGood: true,
      },
    };
  }, [currentData, prevData]);

  const leaguePitchingDelta = useMemo(() => {
    if (!currentData?.pitchingSummary || !prevData?.pitchingSummary) return null;
    const c = currentData.pitchingSummary;
    const p = prevData.pitchingSummary;

    const cEra = Number(c.total.era) || 0;
    const pEra = Number(p.total.era) || 0;
    const cWhip = Number(c.total.whip) || 0;
    const pWhip = Number(p.total.whip) || 0;

    const cSo_PG = parseFloat(c.perGame["so"] || "0");
    const pSo_PG = parseFloat(p.perGame["so"] || "0");

    return {
      era: {
        value: cEra - pEra,
        formatted: `${cEra - pEra > 0 ? "+" : ""}${(cEra - pEra).toFixed(2)}`,
        positiveIsGood: false,
      },
      whip: {
        value: cWhip - pWhip,
        formatted: `${cWhip - pWhip > 0 ? "+" : ""}${(cWhip - pWhip).toFixed(2)}`,
        positiveIsGood: false,
      },
      so_pg: {
        value: cSo_PG - pSo_PG,
        formatted: `${cSo_PG - pSo_PG > 0 ? "+" : ""}${(cSo_PG - pSo_PG).toFixed(1)}`,
        positiveIsGood: true,
      },
    };
  }, [currentData, prevData]);

  return (
    <div className="space-y-6">
      {/* ── Panel Superior de Control Stathead ── */}
      <div className="bg-[#0B132B] border border-[#1E2B4D] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#FDB827]/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E2B4D]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30 uppercase tracking-wider">
                Buscador LVBP
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Comparativa por Rango de Fechas
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight mt-1 flex items-center gap-2">
              <Search className="w-5 h-5 text-[#FDB827]" />
              Filtro por Rango de Fechas y Comparativa
            </h2>
          </div>

          {/* Selector de Grupo: Bateo vs Pitcheo */}
          <div className="flex items-center space-x-1.5 bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D] self-start lg:self-auto">
            <button
              onClick={() => setGroup("batting")}
              className={cn(
                "flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                group === "batting"
                  ? "bg-[#FDB827] text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Bateo Colectivo</span>
            </button>
            <button
              onClick={() => setGroup("pitching")}
              className={cn(
                "flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                group === "pitching"
                  ? "bg-[#FDB827] text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Pitcheo Colectivo</span>
            </button>
          </div>
        </div>

        {/* ── Presets de Acceso Rápido ── */}
        <div className="pt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Accesos Rápidos:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("7d")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111C3D] hover:bg-[#1A2A57] text-slate-300 border border-[#1E2B4D] transition-all"
          >
            Últimos 7 días
          </button>
          <button
            type="button"
            onClick={() => applyPreset("14d")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111C3D] hover:bg-[#1A2A57] text-slate-300 border border-[#1E2B4D] transition-all"
          >
            Últimos 14 días
          </button>
          <button
            type="button"
            onClick={() => applyPreset("oct")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111C3D] hover:bg-[#1A2A57] text-[#FDB827] border border-[#FDB827]/30 transition-all"
          >
            Octubre (12-31)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("nov")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111C3D] hover:bg-[#1A2A57] text-slate-300 border border-[#1E2B4D] transition-all"
          >
            Noviembre
          </button>
          <button
            type="button"
            onClick={() => applyPreset("dic")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111C3D] hover:bg-[#1A2A57] text-slate-300 border border-[#1E2B4D] transition-all"
          >
            Diciembre
          </button>
          <button
            type="button"
            onClick={() => applyPreset("all")}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#111C3D] hover:bg-[#1A2A57] text-slate-300 border border-[#1E2B4D] transition-all"
          >
            Temporada Completa
          </button>
        </div>

        {/* ── Formularios de Rango de Fecha ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 pt-4">
          {/* Rango Temporada Actual */}
          <div className="lg:col-span-5 bg-[#070B19] p-3.5 rounded-xl border border-[#1E2B4D] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
                Temporada {season} (Actual)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Rango Principal</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">
                  Desde:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCurrentDateChange(e.target.value, endDate)}
                  className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-[#FDB827]"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-medium block mb-1">
                  Hasta:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCurrentDateChange(startDate, e.target.value)}
                  className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-[#FDB827]"
                />
              </div>
            </div>
          </div>

          {/* Conmutador y Rango Temporada Anterior */}
          <div className="lg:col-span-5 bg-[#070B19] p-3.5 rounded-xl border border-[#1E2B4D] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => setCompareEnabled(e.target.checked)}
                  className="rounded border-[#1E2B4D] text-[#FDB827] focus:ring-0 focus:ring-offset-0 bg-[#0D152B] cursor-pointer"
                />
                <span className={compareEnabled ? "text-[#FDB827]" : "text-slate-400"}>
                  Comparar con {compareSeason} (Año Previo)
                </span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">Deltas (Δ)</span>
            </div>

            {compareEnabled ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Desde ({compareSeason}):
                  </label>
                  <input
                    type="date"
                    value={prevStartDate}
                    onChange={(e) => setPrevStartDate(e.target.value)}
                    className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-[#FDB827]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-medium block mb-1">
                    Hasta ({compareSeason}):
                  </label>
                  <input
                    type="date"
                    value={prevEndDate}
                    onChange={(e) => setPrevEndDate(e.target.value)}
                    className="w-full bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono outline-none focus:border-[#FDB827]"
                  />
                </div>
              </div>
            ) : (
              <div className="py-2.5 text-center text-xs text-slate-500 italic">
                Comparativa interanual desactivada.
              </div>
            )}
          </div>

          {/* Botón Ejecutar */}
          <div className="lg:col-span-2 flex items-end">
            <button
              onClick={executeQuery}
              disabled={loading}
              className="w-full h-[62px] bg-gradient-to-r from-[#FDB827] to-[#FFA800] hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 text-slate-950" />
                  <span>Filtrar Stats</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-900/50 rounded-lg p-2.5">
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* ── Tarjetas Resumen de Liga (Diferencial General) ── */}
      {compareEnabled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {group === "batting" ? (
            <>
              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Liga • Carreras/Juego
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {currentData?.battingSummary?.perGame["r"] || "0.0"}
                  </span>
                  {renderDelta(leagueBattingDelta?.r_pg, " R/J")}
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  vs {prevData?.battingSummary?.perGame["r"] || "0.0"} en {compareSeason}
                </span>
              </div>

              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Liga • Promedio (AVG)
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-[#FDB827]">
                    {currentData?.battingSummary?.total.avgStr || ".000"}
                  </span>
                  {renderDelta(leagueBattingDelta?.avg)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  vs {prevData?.battingSummary?.total.avgStr || ".000"} en {compareSeason}
                </span>
              </div>

              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Liga • OPS Global
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {currentData?.battingSummary?.total.opsStr || ".000"}
                  </span>
                  {renderDelta(leagueBattingDelta?.ops)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  vs {prevData?.battingSummary?.total.opsStr || ".000"} en {compareSeason}
                </span>
              </div>

              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Juegos Disputados
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {currentData?.battingSummary?.uniqueGames || 0}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Partidos
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  {prevData?.battingSummary?.uniqueGames || 0} partidos en {compareSeason}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Liga • Efectividad (ERA)
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {currentData?.pitchingSummary?.total.eraStr || "0.00"}
                  </span>
                  {renderDelta(leaguePitchingDelta?.era)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  vs {prevData?.pitchingSummary?.total.eraStr || "0.00"} en {compareSeason}
                </span>
              </div>

              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Liga • WHIP Global
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-[#FDB827]">
                    {currentData?.pitchingSummary?.total.whipStr || "0.00"}
                  </span>
                  {renderDelta(leaguePitchingDelta?.whip)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  vs {prevData?.pitchingSummary?.total.whipStr || "0.00"} en {compareSeason}
                </span>
              </div>

              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Liga • Ponches/Juego
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {currentData?.pitchingSummary?.perGame["so"] || "0.0"}
                  </span>
                  {renderDelta(leaguePitchingDelta?.so_pg, " K/J")}
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  vs {prevData?.pitchingSummary?.perGame["so"] || "0.0"} en {compareSeason}
                </span>
              </div>

              <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Innings Pitcheados
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-xl font-black font-mono text-slate-100">
                    {currentData?.pitchingSummary?.total.ipStr || "0.0"}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    IP Total
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  {prevData?.pitchingSummary?.total.ipStr || "0.0"} IP en {compareSeason}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tabla de Resultados Tipo Stathead ── */}
      <div className="bg-[#0B132B] border border-[#1E2B4D] rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#070B19] border-b border-[#1E2B4D] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-200">
              {group === "batting" ? "Ofensiva Colectiva" : "Cuerpo de Lanzadores"}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({startDate} ➔ {endDate})
            </span>
            {compareEnabled && (
              <span className="text-[10px] text-[#FDB827] bg-[#FDB827]/10 px-2 py-0.5 rounded font-mono border border-[#FDB827]/30">
                vs {compareSeason} ({prevStartDate} ➔ {prevEndDate})
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 italic">
            * Haz clic en cualquier columna para ordenar
          </span>
        </div>

        <div className="overflow-x-auto">
          {group === "batting" ? (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0E1738] text-[11px] text-slate-400 border-b border-[#1E2B4D] font-mono">
                  <th className="py-2.5 px-3 font-bold text-slate-300">#</th>
                  <th className="py-2.5 px-3 font-bold text-slate-300">Equipo</th>
                  <th
                    onClick={() => handleSort("games")}
                    className="py-2.5 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    JJ
                  </th>
                  <th
                    onClick={() => handleSort("r")}
                    className="py-2.5 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    R
                  </th>
                  <th
                    onClick={() => handleSort("h")}
                    className="py-2.5 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    H
                  </th>
                  <th
                    onClick={() => handleSort("doubles")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    2B
                  </th>
                  <th
                    onClick={() => handleSort("hr")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    HR
                  </th>
                  <th
                    onClick={() => handleSort("rbi")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    RBI
                  </th>
                  <th
                    onClick={() => handleSort("bb")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    BB
                  </th>
                  <th
                    onClick={() => handleSort("so")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    SO
                  </th>
                  <th
                    onClick={() => handleSort("avg")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold"
                  >
                    AVG
                  </th>
                  <th
                    onClick={() => handleSort("obp")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold"
                  >
                    OBP
                  </th>
                  <th
                    onClick={() => handleSort("slg")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold"
                  >
                    SLG
                  </th>
                  <th
                    onClick={() => handleSort("ops")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-black text-[#FDB827] bg-[#FDB827]/10"
                  >
                    OPS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152042]">
                {sortedBatting.map((item, index) => {
                  const b = item.current;
                  const isLeones = item.isLeones;
                  return (
                    <tr
                      key={item.teamId}
                      className={cn(
                        "hover:bg-[#121E42] transition-colors",
                        isLeones
                          ? "bg-[#FDB827]/10 border-l-4 border-l-[#FDB827] font-medium"
                          : index % 2 === 0
                          ? "bg-[#090F24]"
                          : "bg-[#070B19]"
                      )}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-500 font-bold">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          {item.logo ? (
                            <Image
                              src={item.logo}
                              alt={item.teamAbbr}
                              width={22}
                              height={22}
                              className="w-5 h-5 object-contain"
                            />
                          ) : null}
                          <span
                            className={cn(
                              "font-bold truncate max-w-[130px] sm:max-w-none",
                              isLeones ? "text-[#FDB827]" : "text-slate-200"
                            )}
                          >
                            {item.teamName}
                          </span>
                          {isLeones && (
                            <span className="text-[9px] bg-[#FDB827] text-slate-950 px-1 py-0.2 rounded font-black uppercase">
                              Cueva
                            </span>
                          )}
                        </div>
                      </td>

                      {/* JJ */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                        {b.games}
                      </td>

                      {/* R con Delta */}
                      <td className="py-2.5 px-2.5 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-100 font-bold">{b.r}</span>
                          {compareEnabled && renderDelta(item.deltas["r"])}
                        </div>
                      </td>

                      {/* H con Delta */}
                      <td className="py-2.5 px-2.5 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-100">{b.h}</span>
                          {compareEnabled && renderDelta(item.deltas["h"])}
                        </div>
                      </td>

                      {/* 2B */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {b.doubles}
                      </td>

                      {/* HR con Delta */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-100 font-bold">{b.hr}</span>
                          {compareEnabled && renderDelta(item.deltas["hr"])}
                        </div>
                      </td>

                      {/* RBI */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {b.rbi}
                      </td>

                      {/* BB */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {b.bb}
                      </td>

                      {/* SO */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                        {b.so}
                      </td>

                      {/* AVG con Delta */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200 font-bold">{b.avgStr}</span>
                          {compareEnabled && renderDelta(item.deltas["avg"])}
                        </div>
                      </td>

                      {/* OBP con Delta */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200 font-bold">{b.obpStr}</span>
                          {compareEnabled && renderDelta(item.deltas["obp"])}
                        </div>
                      </td>

                      {/* SLG con Delta */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200 font-bold">{b.slgStr}</span>
                          {compareEnabled && renderDelta(item.deltas["slg"])}
                        </div>
                      </td>

                      {/* OPS con Delta */}
                      <td className="py-2.5 px-3 text-center font-mono bg-[#FDB827]/5">
                        <div className="flex flex-col items-center">
                          <span className="text-[#FDB827] font-black">{b.opsStr}</span>
                          {compareEnabled && renderDelta(item.deltas["ops"])}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* tfoot: Totales de Liga en el Rango */}
              {currentData?.battingSummary && (
                <tfoot className="border-t-2 border-[#1E2B4D] font-mono text-xs">
                  {/* Fila Total Liga */}
                  <tr className="bg-[#101A3D] text-slate-200 font-bold">
                    <td className="py-2.5 px-3 text-slate-400">--</td>
                    <td className="py-2.5 px-3 flex items-center space-x-1.5 font-bold text-[#FDB827]">
                      <span>👑 Total Liga</span>
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      {currentData.battingSummary.uniqueGames}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.battingSummary.total.r}</span>
                        {compareEnabled && renderDelta(leagueBattingDelta?.r_pg, " R/J")}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      {currentData.battingSummary.total.h}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.battingSummary.total.doubles}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.battingSummary.total.hr}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.battingSummary.total.rbi}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.battingSummary.total.bb}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.battingSummary.total.so}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.battingSummary.total.avgStr}</span>
                        {compareEnabled && renderDelta(leagueBattingDelta?.avg)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.battingSummary.total.obpStr}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.battingSummary.total.slgStr}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#FDB827] font-black bg-[#FDB827]/10">
                      <div className="flex flex-col items-center">
                        <span>{currentData.battingSummary.total.opsStr}</span>
                        {compareEnabled && renderDelta(leagueBattingDelta?.ops)}
                      </div>
                    </td>
                  </tr>

                  {/* Fila Promedio por Juego */}
                  <tr className="bg-[#0A1026] text-slate-400 text-[11px]">
                    <td className="py-2 px-3 text-slate-500">--</td>
                    <td className="py-2 px-3 italic">⚡ Promedio por Partido (9 Inn)</td>
                    <td className="py-2 px-2.5 text-center text-slate-500">1.0</td>
                    <td className="py-2 px-2.5 text-center font-bold text-slate-300">
                      {currentData.battingSummary.perGame["r"]} R
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {currentData.battingSummary.perGame["h"]} H
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.battingSummary.perGame["doubles"]}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.battingSummary.perGame["hr"]} HR
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.battingSummary.perGame["rbi"]}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.battingSummary.perGame["bb"]}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.battingSummary.perGame["so"]}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {currentData.battingSummary.total.avgStr}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {currentData.battingSummary.total.obpStr}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {currentData.battingSummary.total.slgStr}
                    </td>
                    <td className="py-2 px-3 text-center text-[#FDB827] bg-[#FDB827]/5">
                      {currentData.battingSummary.total.opsStr}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0E1738] text-[11px] text-slate-400 border-b border-[#1E2B4D] font-mono">
                  <th className="py-2.5 px-3 font-bold text-slate-300">#</th>
                  <th className="py-2.5 px-3 font-bold text-slate-300">Equipo</th>
                  <th
                    onClick={() => handleSort("games")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    JJ
                  </th>
                  <th
                    onClick={() => handleSort("wins")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    G-P
                  </th>
                  <th
                    onClick={() => handleSort("sv")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    SV
                  </th>
                  <th
                    onClick={() => handleSort("ip")}
                    className="py-2.5 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    IP
                  </th>
                  <th
                    onClick={() => handleSort("h")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    H
                  </th>
                  <th
                    onClick={() => handleSort("r")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    R
                  </th>
                  <th
                    onClick={() => handleSort("er")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    ER
                  </th>
                  <th
                    onClick={() => handleSort("bb")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    BB
                  </th>
                  <th
                    onClick={() => handleSort("so")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    SO
                  </th>
                  <th
                    onClick={() => handleSort("hr")}
                    className="py-2.5 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    HR
                  </th>
                  <th
                    onClick={() => handleSort("era")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-black text-[#FDB827] bg-[#FDB827]/10"
                  >
                    ERA
                  </th>
                  <th
                    onClick={() => handleSort("whip")}
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[#FDB827] font-bold"
                  >
                    WHIP
                  </th>
                  <th
                    onClick={() => handleSort("k9")}
                    className="py-2.5 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    K/9
                  </th>
                  <th
                    onClick={() => handleSort("bb9")}
                    className="py-2.5 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  >
                    BB/9
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152042]">
                {sortedPitching.map((item, index) => {
                  const p = item.current;
                  const isLeones = item.isLeones;
                  return (
                    <tr
                      key={item.teamId}
                      className={cn(
                        "hover:bg-[#121E42] transition-colors",
                        isLeones
                          ? "bg-[#FDB827]/10 border-l-4 border-l-[#FDB827] font-medium"
                          : index % 2 === 0
                          ? "bg-[#090F24]"
                          : "bg-[#070B19]"
                      )}
                    >
                      <td className="py-2.5 px-3 font-mono text-slate-500 font-bold">
                        {index + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          {item.logo ? (
                            <Image
                              src={item.logo}
                              alt={item.teamAbbr}
                              width={22}
                              height={22}
                              className="w-5 h-5 object-contain"
                            />
                          ) : null}
                          <span
                            className={cn(
                              "font-bold truncate max-w-[130px] sm:max-w-none",
                              isLeones ? "text-[#FDB827]" : "text-slate-200"
                            )}
                          >
                            {item.teamName}
                          </span>
                          {isLeones && (
                            <span className="text-[9px] bg-[#FDB827] text-slate-950 px-1 py-0.2 rounded font-black uppercase">
                              Cueva
                            </span>
                          )}
                        </div>
                      </td>

                      {/* JJ */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {p.games}
                      </td>

                      {/* G-P */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {p.wins}-{p.losses}
                      </td>

                      {/* SV */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {p.sv}
                      </td>

                      {/* IP */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-100 font-bold">
                        {p.ipStr}
                      </td>

                      {/* H */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-300">
                        {p.h}
                      </td>

                      {/* R */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200">{p.r}</span>
                          {compareEnabled && renderDelta(item.deltas["r"])}
                        </div>
                      </td>

                      {/* ER */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                        {p.er}
                      </td>

                      {/* BB */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-300">{p.bb}</span>
                          {compareEnabled && renderDelta(item.deltas["bb"])}
                        </div>
                      </td>

                      {/* SO */}
                      <td className="py-2.5 px-2 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-100 font-bold">{p.so}</span>
                          {compareEnabled && renderDelta(item.deltas["so"])}
                        </div>
                      </td>

                      {/* HR */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                        {p.hr}
                      </td>

                      {/* ERA con Delta */}
                      <td className="py-2.5 px-3 text-center font-mono bg-[#FDB827]/5">
                        <div className="flex flex-col items-center">
                          <span className="text-[#FDB827] font-black">{p.eraStr}</span>
                          {compareEnabled && renderDelta(item.deltas["era"])}
                        </div>
                      </td>

                      {/* WHIP con Delta */}
                      <td className="py-2.5 px-3 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span className="text-slate-200 font-bold">{p.whipStr}</span>
                          {compareEnabled && renderDelta(item.deltas["whip"])}
                        </div>
                      </td>

                      {/* K/9 */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-300">
                        {p.k9Str}
                      </td>

                      {/* BB/9 */}
                      <td className="py-2.5 px-2.5 text-center font-mono text-slate-400">
                        {p.bb9Str}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* tfoot: Totales de Liga en Pitcheo */}
              {currentData?.pitchingSummary && (
                <tfoot className="border-t-2 border-[#1E2B4D] font-mono text-xs">
                  <tr className="bg-[#101A3D] text-slate-200 font-bold">
                    <td className="py-2.5 px-3 text-slate-400">--</td>
                    <td className="py-2.5 px-3 flex items-center space-x-1.5 font-bold text-[#FDB827]">
                      <span>👑 Total Liga</span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.pitchingSummary.uniqueGames}
                    </td>
                    <td className="py-2.5 px-2 text-center">--</td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.pitchingSummary.total.sv}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      {currentData.pitchingSummary.total.ipStr}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.pitchingSummary.total.h}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.pitchingSummary.total.r}</span>
                        {compareEnabled && renderDelta(itemDelta(leaguePitchingDelta?.era))}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.pitchingSummary.total.er}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.pitchingSummary.total.bb}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.pitchingSummary.total.so}</span>
                        {compareEnabled && renderDelta(leaguePitchingDelta?.so_pg, " K/J")}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      {currentData.pitchingSummary.total.hr}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[#FDB827] font-black bg-[#FDB827]/10">
                      <div className="flex flex-col items-center">
                        <span>{currentData.pitchingSummary.total.eraStr}</span>
                        {compareEnabled && renderDelta(leaguePitchingDelta?.era)}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span>{currentData.pitchingSummary.total.whipStr}</span>
                        {compareEnabled && renderDelta(leaguePitchingDelta?.whip)}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      {currentData.pitchingSummary.total.k9Str}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      {currentData.pitchingSummary.total.bb9Str}
                    </td>
                  </tr>

                  <tr className="bg-[#0A1026] text-slate-400 text-[11px]">
                    <td className="py-2 px-3 text-slate-500">--</td>
                    <td className="py-2 px-3 italic">⚡ Promedio por Partido (9 Inn)</td>
                    <td className="py-2 px-2 text-center text-slate-500">1.0</td>
                    <td className="py-2 px-2 text-center">--</td>
                    <td className="py-2 px-2 text-center">--</td>
                    <td className="py-2 px-2.5 text-center">18.0 IP</td>
                    <td className="py-2 px-2 text-center">
                      {currentData.pitchingSummary.perGame["h"]} H
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.pitchingSummary.perGame["r"]} R
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.pitchingSummary.perGame["er"]} ER
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.pitchingSummary.perGame["bb"]} BB
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.pitchingSummary.perGame["so"]} K
                    </td>
                    <td className="py-2 px-2 text-center">
                      {currentData.pitchingSummary.perGame["hr"]} HR
                    </td>
                    <td className="py-2 px-3 text-center text-[#FDB827] bg-[#FDB827]/5">
                      {currentData.pitchingSummary.total.eraStr}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {currentData.pitchingSummary.total.whipStr}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {currentData.pitchingSummary.total.k9Str}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {currentData.pitchingSummary.total.bb9Str}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function itemDelta(d?: StatheadDeltaValue): StatheadDeltaValue | undefined {
  return d;
}
