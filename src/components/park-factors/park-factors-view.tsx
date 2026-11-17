"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowUpDown,
  BarChart2,
  BookOpen,
  ChevronDown,
  Flame,
  Landmark,
  Loader2,
  MapPin,
  Mountain,
  Shield,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ParkFactorMetricKey,
  ParkFactorScope,
  ParkFactorsResponse,
  ParkMetricFactor,
  StadiumParkFactorRow,
} from "@/types/park-factors";
import { cn } from "@/lib/utils";

interface ParkFactorsViewProps {
  initialData: ParkFactorsResponse;
}

type CalcMode = "stabilized" | "raw";
type ScaleFormat = "base100" | "multiplier";
type SortColumn =
  | "shortName"
  | "runsGames"
  | "runsPerGame"
  | "elevationMeters"
  | "r"
  | "hr"
  | "h"
  | "doubles"
  | "triples"
  | "bb"
  | "so";

const SCOPE_OPTIONS: { id: ParkFactorScope; label: string }[] = [
  { id: "multi", label: "Multi-Año (2024–26)" },
  { id: "2026", label: "2026-27 (En Curso)" },
  { id: "2025", label: "2025-26" },
  { id: "2024", label: "2024-25" },
];

const METRIC_LABELS: Record<ParkFactorMetricKey, string> = {
  r: "Carreras (R)",
  hr: "Jonrones (HR)",
  h: "Hits (H)",
  doubles: "Dobles (2B)",
  triples: "Triples (3B)",
  bb: "Boletos (BB)",
  so: "Ponches (SO)",
};

function getMetricValue(
  metric: ParkMetricFactor | null,
  calcMode: CalcMode
): number | null {
  if (!metric) return null;
  return calcMode === "stabilized" ? metric.stabilized : metric.raw;
}

function formatFactor(
  factor: number | null,
  scaleFormat: ScaleFormat
): string {
  if (factor === null || !Number.isFinite(factor)) return "--";
  if (scaleFormat === "base100") {
    return String(Math.round(factor * 100));
  }
  return factor.toFixed(2);
}

function getFactorBadgeClass(
  factor: number | null,
  isStrikeout = false
): string {
  if (factor === null) {
    return "text-slate-500 bg-[#070B19] border-[#1E2B4D]";
  }
  const idx = Math.round(factor * 100);
  if (idx >= 105) {
    return isStrikeout
      ? "text-cyan-300 bg-cyan-950/50 border-cyan-700/50"
      : "text-[#FDB827] bg-[#FDB827]/15 border-[#FDB827]/40";
  }
  if (idx <= 95) {
    return isStrikeout
      ? "text-[#FDB827] bg-[#FDB827]/15 border-[#FDB827]/40"
      : "text-cyan-300 bg-cyan-950/50 border-cyan-700/50";
  }
  return "text-slate-200 bg-slate-800/60 border-slate-700/70";
}

function getBarColor(
  factor: number,
  isMonumental: boolean,
  isStrikeout = false
): string {
  if (isMonumental) return "#FDB827";
  const idx = Math.round(factor * 100);
  if (idx >= 105) return isStrikeout ? "#38BDF8" : "#F59E0B";
  if (idx <= 95) return isStrikeout ? "#F59E0B" : "#38BDF8";
  return "#64748B";
}

export function ParkFactorsView({ initialData }: ParkFactorsViewProps) {
  const [data, setData] = useState<ParkFactorsResponse>(initialData);
  const [scope, setScope] = useState<ParkFactorScope>(initialData.scope);
  const [calcMode, setCalcMode] = useState<CalcMode>("stabilized");
  const [scaleFormat, setScaleFormat] = useState<ScaleFormat>("base100");
  const [chartMetric, setChartMetric] = useState<ParkFactorMetricKey>("r");
  const [sortCol, setSortCol] = useState<SortColumn>("r");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [glossaryOpen, setGlossaryOpen] = useState<boolean>(false);

  const handleScopeChange = async (nextScope: ParkFactorScope) => {
    if (nextScope === scope) return;
    setScope(nextScope);
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/park-factors?scope=${nextScope}`);
      const json = (await res.json()) as {
        success: boolean;
        data?: ParkFactorsResponse;
        error?: string;
      };
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || "No se pudieron cargar los factores.");
      }
      setData(json.data);
      if (!json.data.hasEventFactors && chartMetric !== "r") {
        setChartMetric("r");
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Error de conexión al calcular factores de parque."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (col: SortColumn) => {
    if (sortCol === col) {
      setSortAsc((prev) => !prev);
    } else {
      setSortCol(col);
      setSortAsc(col === "shortName");
    }
  };

  const sortedStadiums = useMemo(() => {
    return [...data.stadiums].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortCol === "shortName") {
        valA = a.shortName;
        valB = b.shortName;
      } else if (
        sortCol === "runsGames" ||
        sortCol === "runsPerGame" ||
        sortCol === "elevationMeters"
      ) {
        valA = a[sortCol];
        valB = b[sortCol];
      } else {
        valA = getMetricValue(a.metrics[sortCol], calcMode) ?? -1;
        valB = getMetricValue(b.metrics[sortCol], calcMode) ?? -1;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });
  }, [data.stadiums, sortCol, sortAsc, calcMode]);

  // KPIs superiores calculados dinámicamente
  const kpis = useMemo(() => {
    const list = data.stadiums;
    if (list.length === 0) return null;

    const byRunsDesc = [...list].sort(
      (a, b) =>
        (getMetricValue(b.metrics.r, calcMode) ?? 0) -
        (getMetricValue(a.metrics.r, calcMode) ?? 0)
    );
    const byRunsAsc = [...list].sort(
      (a, b) =>
        (getMetricValue(a.metrics.r, calcMode) ?? 99) -
        (getMetricValue(b.metrics.r, calcMode) ?? 99)
    );
    const withHr = list.filter((s) => s.metrics.hr !== null);
    const byHrDesc = [...withHr].sort(
      (a, b) =>
        (getMetricValue(b.metrics.hr, calcMode) ?? 0) -
        (getMetricValue(a.metrics.hr, calcMode) ?? 0)
    );
    const withDoubles = list.filter((s) => s.metrics.doubles !== null);
    const byDoublesDesc = [...withDoubles].sort(
      (a, b) =>
        (getMetricValue(b.metrics.doubles, calcMode) ?? 0) -
        (getMetricValue(a.metrics.doubles, calcMode) ?? 0)
    );

    const topRuns = byRunsDesc[0];
    const topPitcher = byRunsAsc[0];
    const topHr = byHrDesc[0] ?? null;
    const topDoubles = byDoublesDesc[0] ?? null;

    return { topRuns, topPitcher, topHr, topDoubles };
  }, [data.stadiums, calcMode]);

  // Datos para el gráfico comparativo
  const chartData = useMemo(() => {
    const effectiveMetric: ParkFactorMetricKey =
      !data.hasEventFactors && chartMetric !== "r" ? "r" : chartMetric;

    return data.stadiums
      .map((s) => {
        const rawFactor = getMetricValue(s.metrics[effectiveMetric], calcMode);
        const factor = rawFactor ?? 1.0;
        const displayValue =
          scaleFormat === "base100"
            ? Math.round(factor * 100)
            : Number(factor.toFixed(3));
        return {
          stadiumId: s.stadiumId,
          name: s.shortName,
          fullName: s.stadiumName,
          teamAbbr: s.teamAbbr,
          factor,
          displayValue,
          games:
            effectiveMetric === "r" ? s.runsGames : s.boxscoreGames,
          isMonumental: s.stadiumId === "monumental",
        };
      })
      .sort((a, b) => b.factor - a.factor);
  }, [data.stadiums, data.hasEventFactors, chartMetric, calcMode, scaleFormat]);

  const neutralRef = scaleFormat === "base100" ? 100 : 1.0;

  return (
    <div className="space-y-6">
      {/* ── Barra de Control Superior ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selector de Ventana Temporal */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-[#FDB827]" />
              Muestra:
            </span>
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={loading}
                onClick={() => handleScopeChange(opt.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  scope === opt.id
                    ? "bg-[#FDB827] text-[#070B19] border-[#FDB827] font-bold shadow-sm"
                    : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:text-slate-100 hover:border-slate-600"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Controles de Estabilización y Escala */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D]">
              <button
                type="button"
                onClick={() => setCalcMode("stabilized")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                  calcMode === "stabilized"
                    ? "bg-[#FDB827] text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title={`Aplica regresión bayesiana (k=${data.priorWeight} juegos) hacia la media de liga para proteger muestras cortas`}
              >
                Estabilizado (k={data.priorWeight})
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("raw")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-bold transition-all",
                  calcMode === "raw"
                    ? "bg-[#FDB827] text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                )}
                title="Factor empírico directo controlado por calidad de equipo sin regresión a la media"
              >
                Crudo Empírico
              </button>
            </div>

            <div className="flex items-center space-x-1 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D]">
              <button
                type="button"
                onClick={() => setScaleFormat("base100")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-bold transition-all font-mono",
                  scaleFormat === "base100"
                    ? "bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/40"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Base 100
              </button>
              <button
                type="button"
                onClick={() => setScaleFormat("multiplier")}
                className={cn(
                  "px-2.5 py-1 rounded text-[11px] font-bold transition-all font-mono",
                  scaleFormat === "multiplier"
                    ? "bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/40"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                1.00x
              </button>
            </div>
          </div>
        </div>

        {/* Metadatos de la muestra consultada */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1E2B4D]/70 text-[11px] text-slate-400 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Carreras:{" "}
              <strong className="text-slate-200">{data.totalRunsGames} JJ</strong>{" "}
              ({data.runsSeasons.join(", ")})
            </span>
            <span>·</span>
            <span>
              Eventos Boxscore:{" "}
              <strong className="text-slate-200">
                {data.hasEventFactors
                  ? `${data.totalBoxscoreGames} JJ (${data.boxscoreSeasons.join(", ")})`
                  : "Solo disponible desde 2025"}
              </strong>
            </span>
            <span>·</span>
            <span>
              Media Liga:{" "}
              <strong className="text-[#FDB827]">{data.leagueRunsPerGame} R/J</strong>
            </span>
          </div>

          {loading && (
            <span className="inline-flex items-center gap-1.5 text-[#FDB827]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Recalculando factores...
            </span>
          )}
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-lg px-3 py-2">
            {errorMsg}
          </div>
        )}
      </div>

      {/* ── Rejilla de 4 KPIs ── */}
      {kpis && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiStadiumCard
            title="MÁS BATEADOR (CARRERAS)"
            value={formatFactor(
              getMetricValue(kpis.topRuns.metrics.r, calcMode),
              scaleFormat
            )}
            stadium={kpis.topRuns}
            subtitle={`${kpis.topRuns.runsPerGame.toFixed(2)} R/J en ${kpis.topRuns.runsGames} JJ`}
            icon={Flame}
            accent="gold"
          />

          {kpis.topHr ? (
            <KpiStadiumCard
              title="MÁS JONRONERO (HR)"
              value={formatFactor(
                getMetricValue(kpis.topHr.metrics.hr, calcMode),
                scaleFormat
              )}
              stadium={kpis.topHr}
              subtitle={`${kpis.topHr.metrics.hr?.perGame.toFixed(2)} HR/J en ${kpis.topHr.boxscoreGames} JJ`}
              icon={TrendingUp}
              accent="gold"
            />
          ) : (
            <KpiStadiumCard
              title="MAYOR ANOTACIÓN BRUTA"
              value={`${kpis.topRuns.runsPerGame.toFixed(2)} R/J`}
              stadium={kpis.topRuns}
              subtitle={`${kpis.topRuns.runsGames} JJ en ronda regular`}
              icon={TrendingUp}
              accent="gold"
            />
          )}

          <KpiStadiumCard
            title="MÁS FAVORABLE AL PITCHEO"
            value={formatFactor(
              getMetricValue(kpis.topPitcher.metrics.r, calcMode),
              scaleFormat
            )}
            stadium={kpis.topPitcher}
            subtitle={`${kpis.topPitcher.runsPerGame.toFixed(2)} R/J en ${kpis.topPitcher.runsGames} JJ`}
            icon={Shield}
            accent="cyan"
          />

          {kpis.topDoubles ? (
            <KpiStadiumCard
              title="LÍDER EN DOBLES (2B)"
              value={formatFactor(
                getMetricValue(kpis.topDoubles.metrics.doubles, calcMode),
                scaleFormat
              )}
              stadium={kpis.topDoubles}
              subtitle={`${kpis.topDoubles.metrics.doubles?.perGame.toFixed(2)} 2B/J en ${kpis.topDoubles.boxscoreGames} JJ`}
              icon={SlidersHorizontal}
              accent="gold"
            />
          ) : (
            <KpiStadiumCard
              title="MAYOR ALTITUD LVBP"
              value={`${
                [...data.stadiums].sort(
                  (a, b) => b.elevationMeters - a.elevationMeters
                )[0]?.elevationMeters ?? 0
              } m`}
              stadium={
                [...data.stadiums].sort(
                  (a, b) => b.elevationMeters - a.elevationMeters
                )[0]
              }
              subtitle="Efecto de altitud sobre el vuelo"
              icon={Mountain}
              accent="cyan"
            />
          )}
        </div>
      )}

      {/* ── Tabla Principal de Factores de Parque ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#070B19]/60">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Índice Empírico por Estadio y Evento ({data.scopeLabel})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {scaleFormat === "base100"
                ? "Referencia neutra = 100 (mayor a 100 favorece al bateo; menor a 100 al pitcheo)"
                : "Referencia neutra = 1.00 (mayor a 1.00 favorece al bateo; menor a 1.00 al pitcheo)"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="inline-flex items-center gap-1 text-[#FDB827]">
              <span className="w-2 h-2 rounded-full bg-[#FDB827]" /> Bateo (≥ 105)
            </span>
            <span className="inline-flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Neutro (96–104)
            </span>
            <span className="inline-flex items-center gap-1 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Pitcheo (≤ 95)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[920px]">
            <thead>
              <tr className="border-b border-[#1E2B4D] bg-[#070B19]/80 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-3 text-center w-9">#</th>
                <th
                  onClick={() => handleSort("shortName")}
                  className="py-3 px-3 cursor-pointer hover:text-[#FDB827]"
                >
                  <span className="inline-flex items-center gap-1">
                    ESTADIO / DIMENSIONES <ArrowUpDown className="w-3 h-3" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort("elevationMeters")}
                  className="py-3 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Altitud sobre el nivel del mar"
                >
                  ALT (m)
                </th>
                <th
                  onClick={() => handleSort("runsGames")}
                  className="py-3 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Juegos disputados en el estadio (Carreras)"
                >
                  JJ
                </th>
                <th
                  onClick={() => handleSort("runsPerGame")}
                  className="py-3 px-2 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Carreras totales anotadas por partido (ambos equipos)"
                >
                  R/J
                </th>
                <th
                  onClick={() => handleSort("r")}
                  className="py-3 px-2.5 text-center cursor-pointer text-[#FDB827] font-bold bg-[#FDB827]/10"
                  title="Factor de Parque de Carreras"
                >
                  PF R
                </th>
                <th
                  onClick={() => handleSort("hr")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Factor de Jonrones (2025-2026)"
                >
                  PF HR
                </th>
                <th
                  onClick={() => handleSort("h")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Factor de Hits Totales"
                >
                  PF H
                </th>
                <th
                  onClick={() => handleSort("doubles")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Factor de Dobles"
                >
                  PF 2B
                </th>
                <th
                  onClick={() => handleSort("triples")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Factor de Triples"
                >
                  PF 3B
                </th>
                <th
                  onClick={() => handleSort("bb")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Factor de Boletos"
                >
                  PF BB
                </th>
                <th
                  onClick={() => handleSort("so")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-[#FDB827]"
                  title="Factor de Ponches"
                >
                  PF SO
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedStadiums.map((s, idx) => {
                const isMonumental = s.stadiumId === "monumental";
                const rVal = getMetricValue(s.metrics.r, calcMode);
                const hrVal = getMetricValue(s.metrics.hr, calcMode);
                const hVal = getMetricValue(s.metrics.h, calcMode);
                const d2Val = getMetricValue(s.metrics.doubles, calcMode);
                const d3Val = getMetricValue(s.metrics.triples, calcMode);
                const bbVal = getMetricValue(s.metrics.bb, calcMode);
                const soVal = getMetricValue(s.metrics.so, calcMode);

                return (
                  <tr
                    key={s.stadiumId}
                    className={cn(
                      "hover:bg-white/[0.03] transition-colors",
                      isMonumental &&
                        "bg-[#FDB827]/[0.07] border-l-4 border-l-[#FDB827]"
                    )}
                  >
                    <td className="py-3 px-3 text-center font-mono text-slate-400 font-bold">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-7 h-7 rounded bg-[#070B19] border border-[#1E2B4D] p-1 shrink-0 flex items-center justify-center">
                          <Image
                            src={s.teamLogo || "/assets/logo.png"}
                            alt={s.teamName}
                            width={22}
                            height={22}
                            className="object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={cn(
                                "font-bold text-xs",
                                isMonumental ? "text-[#FDB827]" : "text-slate-100"
                              )}
                            >
                              {s.stadiumName}
                            </span>
                            {isMonumental && (
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30">
                                CAR
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-500" />
                              {s.city}
                            </span>
                            <span>·</span>
                            <span>
                              LF {s.dimensions.lf}&apos; · CF {s.dimensions.cf}&apos; · RF{" "}
                              {s.dimensions.rf}&apos;
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-300">
                      {s.elevationMeters}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-300">
                      <div>{s.runsGames}</div>
                      {data.hasEventFactors &&
                        s.boxscoreGames > 0 &&
                        s.boxscoreGames !== s.runsGames && (
                          <div
                            className="text-[9px] text-slate-500"
                            title="Juegos disponibles con boxscore de eventos"
                          >
                            ({s.boxscoreGames} box)
                          </div>
                        )}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-semibold text-slate-200">
                      {s.runsPerGame.toFixed(2)}
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono bg-[#FDB827]/5">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-bold text-xs min-w-[44px]",
                          getFactorBadgeClass(rVal)
                        )}
                      >
                        {formatFactor(rVal, scaleFormat)}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-semibold text-xs min-w-[44px]",
                          getFactorBadgeClass(hrVal)
                        )}
                      >
                        {formatFactor(hrVal, scaleFormat)}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-semibold text-xs min-w-[44px]",
                          getFactorBadgeClass(hVal)
                        )}
                      >
                        {formatFactor(hVal, scaleFormat)}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-semibold text-xs min-w-[44px]",
                          getFactorBadgeClass(d2Val)
                        )}
                      >
                        {formatFactor(d2Val, scaleFormat)}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-semibold text-xs min-w-[44px]",
                          getFactorBadgeClass(d3Val)
                        )}
                      >
                        {formatFactor(d3Val, scaleFormat)}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-semibold text-xs min-w-[44px]",
                          getFactorBadgeClass(bbVal)
                        )}
                      >
                        {formatFactor(bbVal, scaleFormat)}
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-mono">
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded border font-semibold text-xs min-w-[44px]",
                          getFactorBadgeClass(soVal, true)
                        )}
                      >
                        {formatFactor(soVal, scaleFormat)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data.alternateVenues.length > 0 && (
          <div className="px-4 py-2.5 bg-[#070B19]/70 border-t border-[#1E2B4D] text-[11px] text-slate-400 font-mono">
            Plazas alternas con muestra mínima:{" "}
            {data.alternateVenues
              .map(
                (v) =>
                  `${v.stadiumName} (${v.games} JJ · ${v.runsPerGame.toFixed(2)} R/J)`
              )
              .join(" · ")}
          </div>
        )}
      </div>

      {/* ── Gráfico Comparativo por Métrica ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2B4D] pb-3">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-[#FDB827]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Comparador Gráfico por Estadio — {METRIC_LABELS[chartMetric]}
            </h4>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-semibold">
              Indicador:
            </span>
            <select
              value={chartMetric}
              onChange={(e) =>
                setChartMetric(e.target.value as ParkFactorMetricKey)
              }
              className="bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#FDB827]"
            >
              {(Object.keys(METRIC_LABELS) as ParkFactorMetricKey[]).map(
                (key) => {
                  const disabled = !data.hasEventFactors && key !== "r";
                  return (
                    <option key={key} value={key} disabled={disabled}>
                      {METRIC_LABELS[key]}
                      {disabled ? " (Solo 2025+)" : ""}
                    </option>
                  );
                }
              )}
            </select>
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 28, left: 16, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1E2B4D"
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={
                  scaleFormat === "base100" ? [60, "auto"] : [0.6, "auto"]
                }
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                stroke="#1E2B4D"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: "#E2E8F0", fontSize: 11, fontWeight: 600 }}
                stroke="#1E2B4D"
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  backgroundColor: "#070B19",
                  borderColor: "#1E2B4D",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                  color: "#F1F5F9",
                }}
                formatter={(value) => [
                  String(value),
                  METRIC_LABELS[chartMetric],
                ]}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as
                    | (typeof chartData)[number]
                    | undefined;
                  return row
                    ? `${row.fullName} (${row.games} JJ)`
                    : String(_label);
                }}
              />
              <ReferenceLine
                x={neutralRef}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{
                  value: scaleFormat === "base100" ? "Neutro 100" : "1.00x",
                  fill: "#94A3B8",
                  fontSize: 10,
                  position: "top",
                }}
              />
              <Bar dataKey="displayValue" radius={[0, 6, 6, 0]} barSize={22}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.stadiumId}
                    fill={getBarColor(
                      entry.factor,
                      entry.isMonumental,
                      chartMetric === "so"
                    )}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Guía Metodológica ── */}
      <div className="bg-[#0D152B]/60 border border-[#1E2B4D] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setGlossaryOpen((prev) => !prev)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-[#FDB827] hover:bg-white/[0.02]"
        >
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4" />
            <span>Guía de Cálculo y Metodología de Factores de Parque</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform",
              glossaryOpen && "rotate-180"
            )}
          />
        </button>

        {glossaryOpen && (
          <div className="px-4 pb-4 pt-2 space-y-2.5 border-t border-[#1E2B4D]/60 text-xs text-slate-300 leading-relaxed">
            <p>
              <strong className="text-slate-100">
                Control por Calidad de Equipos (Local vs. Visita):
              </strong>{" "}
              En lugar de comparar promedios brutos (que confundirían un equipo
              muy ofensivo con un estadio bateador), el modelo ajusta
              iterativamente la fuerza de cada equipo en cada temporada y aísla
              el efecto propio del estadio donde se jugó cada encuentro de ronda
              regular.
            </p>
            <p>
              <strong className="text-slate-100">
                Separación por Estadio Real (UCV vs. Macuto):
              </strong>{" "}
              Cada partido se agrupa por el estadio físico registrado en MLB
              Stats API y Supabase (`venue`), permitiendo medir por separado el
              Estadio Universitario de Caracas y el Forum La Guaira de Macuto.
            </p>
            <p>
              <strong className="text-slate-100">
                Estabilización Bayesiana (k={data.priorWeight} juegos):
              </strong>{" "}
              Como una temporada de LVBP tiene ~28 juegos por parque, el modo
              estabilizado aplica regresión hacia la media neutra (`100` o `1.00`)
              ponderada por el tamaño de muestra (`n / (n + 30)`), evitando
              extremos artificiales en estadios con pocos partidos como Macuto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiStadiumCard({
  title,
  value,
  stadium,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  stadium: StadiumParkFactorRow;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "gold" | "cyan";
}) {
  return (
    <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3.5 shadow-md flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
          {title}
        </span>
        <Icon
          className={cn(
            "w-4 h-4 shrink-0",
            accent === "gold" ? "text-[#FDB827]" : "text-cyan-400"
          )}
        />
      </div>
      <div className="my-2 flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "text-2xl font-black font-mono tracking-tight",
            accent === "gold" ? "text-[#FDB827]" : "text-cyan-300"
          )}
        >
          {value}
        </span>
        <span className="text-[10px] font-mono text-slate-400">{subtitle}</span>
      </div>
      <div className="flex items-center gap-2 pt-1.5 border-t border-[#1E2B4D]/60">
        <div className="relative w-5 h-5 rounded bg-[#070B19] p-0.5 shrink-0 flex items-center justify-center">
          <Image
            src={stadium.teamLogo || "/assets/logo.png"}
            alt={stadium.teamName}
            width={16}
            height={16}
            className="object-contain"
          />
        </div>
        <span className="text-xs font-semibold text-slate-100 truncate">
          {stadium.shortName}
        </span>
      </div>
    </div>
  );
}
