"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Shield,
  Activity,
  Flame,
  CheckCircle2,
  HelpCircle,
  Search,
  Filter,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import { BullpenBudgetData, RelieverBudgetItem, RelieverDayUsage } from "@/types/bullpen";
import { cn } from "@/lib/utils";
import { getPlayerHeadshotUrl } from "@/lib/constants";

interface BullpenBudgetTabProps {
  budgetData?: BullpenBudgetData;
  teamName: string;
  season: number;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; order: number; desc: string }
> = {
  SP: {
    label: "Abridor (Rotación)",
    badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/40",
    order: 0,
    desc: "Lanzador abridor de la rotación (Game Started / GS)",
  },
  CL: {
    label: "Cerrador",
    badgeClass: "bg-[#FDB827]/15 text-[#FDB827] border-[#FDB827]/40",
    order: 1,
    desc: "Cerrador oficial para el 9no inning con ventaja",
  },
  SU: {
    label: "Preparador (8vo)",
    badgeClass: "bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/40",
    order: 2,
    desc: "Preparador principal de ventaja para el 8vo inning",
  },
  HL: {
    label: "Alto Apalancamiento",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/40",
    order: 3,
    desc: "Relevo para apagar fuegos en momentos de alta tensión (High Leverage)",
  },
  MR: {
    label: "Relevo Medio",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    order: 4,
    desc: "Relevista para entradas intermedias (innings 5-7)",
  },
  LR: {
    label: "Relevo Largo",
    badgeClass: "bg-slate-700/30 text-slate-400 border-slate-700/50",
    order: 5,
    desc: "Relevista largo o brazos de apoyo para múltiples entradas",
  },
};

export function BullpenBudgetTab({
  budgetData,
  teamName,
  season,
}: BullpenBudgetTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [availFilter, setAvailFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"role" | "p3d" | "p5d" | "era">("role");
  const [sortAsc, setSortAsc] = useState(true);

  if (!budgetData || budgetData.relievers.length === 0) {
    return (
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-8 text-center space-y-3">
        <Activity className="w-8 h-8 text-[#FDB827] mx-auto opacity-70" />
        <div className="text-sm font-bold text-slate-200">
          Sin registros recientes de uso de bullpen
        </div>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          No se encontraron partidos recientes con relevos para {teamName} en la
          temporada {season}-{String(season + 1).slice(-2)}. Los datos se actualizarán
          automáticamente al finalizar cada encuentro.
        </p>
      </div>
    );
  }

  const { dates, relievers, kpis } = budgetData;

  const filteredRelievers = useMemo(() => {
    let list = [...relievers];

    // Búsqueda por nombre
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((r) => r.pitcherName.toLowerCase().includes(q));
    }

    // Filtro por rol
    if (roleFilter === "BULLPEN") {
      list = list.filter((r) => r.roleAbbr !== "SP");
    } else if (roleFilter !== "ALL") {
      list = list.filter((r) => r.roleAbbr === roleFilter);
    }

    // Filtro por disponibilidad
    if (availFilter !== "ALL") {
      list = list.filter((r) => r.summary.availabilityStatus === availFilter);
    }

    // Ordenamiento
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "role") {
        const orderA = ROLE_CONFIG[a.roleAbbr]?.order ?? 99;
        const orderB = ROLE_CONFIG[b.roleAbbr]?.order ?? 99;
        comparison = orderA - orderB;
      } else if (sortBy === "p3d") {
        comparison = b.summary.pitchesLast3Days - a.summary.pitchesLast3Days;
      } else if (sortBy === "p5d") {
        comparison = b.summary.pitchesLast5Days - a.summary.pitchesLast5Days;
      } else if (sortBy === "era") {
        const eraA = parseFloat(a.seasonStats.era) || 99;
        const eraB = parseFloat(b.seasonStats.era) || 99;
        comparison = eraA - eraB;
      }

      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [relievers, searchTerm, roleFilter, availFilter, sortBy, sortAsc]);

  const toggleSort = (field: "role" | "p3d" | "p5d" | "era") => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. 4 KPIs Ejecutivos de Salud y Fatiga ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Disponibles */}
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              BRAZOS DISPONIBLES
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {kpis.availableArms}{" "}
            <span className="text-xs text-slate-400 font-normal">
              / {kpis.totalRelievers}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Listos para accionar hoy</span>
            <span className="text-emerald-400/90 font-mono font-semibold text-[10px]">
              {Math.round((kpis.availableArms / Math.max(1, kpis.totalRelievers)) * 100)}%
            </span>
          </div>
        </div>

        {/* KPI 2: Fatiga / Descanso */}
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              ALERTA FATIGA / DESCANSO
            </span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {kpis.unavailableArms}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {kpis.unavailableArms > 0
                ? "Alta exigencia / Back-to-Back"
                : "Sin brazos sobrecargados"}
            </span>
            {kpis.cautionArms > 0 && (
              <span className="text-[#FDB827] font-mono text-[10px]">
                {kpis.cautionArms} en aviso
              </span>
            )}
          </div>
        </div>

        {/* KPI 3: Carga Colectiva 3D */}
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              CARGA STAFF (3 DÍAS)
            </span>
            <Activity className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="text-2xl font-black text-[#38BDF8] font-mono">
            {kpis.teamPitchesLast3Days}{" "}
            <span className="text-xs text-slate-400 font-normal">pitcheos</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Desgaste colectivo reciente
          </div>
        </div>

        {/* KPI 4: Brazo Más Exigido */}
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-md space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              BRAZO MÁS EXIGIDO (3D)
            </span>
            <Zap className="w-3.5 h-3.5 text-[#FDB827]" />
          </div>
          <div className="text-base font-bold text-slate-100 truncate font-mono">
            {kpis.mostWorkedReliever || "Ninguno"}
          </div>
          <div className="text-[11px] text-[#FDB827] font-semibold font-mono">
            {kpis.mostWorkedPitches} pitcheos lanzados
          </div>
        </div>
      </div>

      {/* ── 2. Barra de Leyenda de Carga ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Niveles de Carga */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Carga Diaria:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#070B19] border border-white/10" />
            <span className="text-slate-400 text-[11px]">Descanso / Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
            <span className="text-slate-300 text-[11px]">Ligero (1-15P)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
            <span className="text-slate-300 text-[11px]">Moderado (16-25P)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/40 border border-rose-500/60" />
            <span className="text-slate-300 text-[11px]">Alto (&gt;25P / B2B)</span>
          </div>
        </div>

        {/* Badges de Decisión y Apertura */}
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#1E2B4D]">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Etiquetas:
          </span>
          <span
            className="px-1.5 py-0.5 rounded bg-teal-500/30 text-teal-200 border border-teal-500/40 font-black text-[10px]"
            title="Abridor / Apertura (Game Started)"
          >
            GS
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-black text-[10px]">
            SV
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#38BDF8] text-slate-950 font-black text-[10px]">
            HLD
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#FDB827] text-slate-950 font-black text-[10px]">
            W
          </span>
          <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[10px]">
            L
          </span>
        </div>
      </div>

      {/* ── 3. Filtros y Búsqueda Interactiva ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-3">
        {/* Input de Búsqueda */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar lanzador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070B19] border border-[#1E2B4D] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#FDB827]"
          />
        </div>

        {/* Selectores de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Rol */}
          <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <Filter className="w-3 h-3 text-slate-400" />
            <span className="text-[11px] text-slate-400">Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#070B19]">Todo el Staff (Abridores + Bullpen)</option>
              <option value="BULLPEN" className="bg-[#070B19]">Solo Bullpen (CL, SU, HL, MR, LR)</option>
              <option value="SP" className="bg-[#070B19]">Rotación Abridora (SP)</option>
              <option value="CL" className="bg-[#070B19]">Cerrador (CL)</option>
              <option value="SU" className="bg-[#070B19]">Preparador (SU)</option>
              <option value="HL" className="bg-[#070B19]">Alto Apalancamiento (HL)</option>
              <option value="MR" className="bg-[#070B19]">Relevo Medio (MR)</option>
              <option value="LR" className="bg-[#070B19]">Relevo Largo (LR)</option>
            </select>
          </div>

          {/* Filtro por Disponibilidad */}
          <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <span className="text-[11px] text-slate-400">Estado:</span>
            <select
              value={availFilter}
              onChange={(e) => setAvailFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#070B19]">Todos los Estados</option>
              <option value="available" className="bg-[#070B19]">Disponible</option>
              <option value="caution" className="bg-[#070B19]">Precaución</option>
              <option value="unavailable" className="bg-[#070B19]">Fatiga / Descanso</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. Cuadrícula de Trabajo Rolling ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Jerarquía de Lanzadores y Carga de Trabajo Rolling
            </h3>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Mostrando {filteredRelievers.length} de {relievers.length} lanzadores
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#070B19] text-slate-400 text-[11px] border-b border-[#1E2B4D]">
              <tr>
                {/* Rol */}
                <th
                  onClick={() => toggleSort("role")}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-200 transition-colors w-16"
                  title="Jerarquía de asignación de entradas y roles de lanzamiento"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>ROL</span>
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>

                {/* Lanzador */}
                <th className="py-3 px-3 min-w-[200px]">LANZADOR</th>

                {/* Stats de Temporada */}
                <th
                  onClick={() => toggleSort("era")}
                  className="py-3 px-2 text-center cursor-pointer hover:text-slate-200 transition-colors"
                  title="Efectividad en la temporada"
                >
                  <div className="inline-flex items-center gap-1">
                    <span>ERA</span>
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center" title="WHIP en la temporada">
                  WHIP
                </th>
                <th className="py-3 px-2 text-center text-teal-300 font-bold" title="Juegos Iniciados (Aperturas)">
                  GS
                </th>
                <th className="py-3 px-2 text-center text-[#FDB827] font-bold" title="Salvados">
                  SV
                </th>
                <th className="py-3 px-2 text-center text-[#38BDF8]" title="Holds (Ventajas Mantenidas)">
                  HLD
                </th>

                {/* Columnas Dinámicas de Fechas Recientes (con Días Libres explícitos) */}
                {dates.map((d: { date: string; dayLabel: string; dayOfWeek: string; opponent: string; gamePk: number; isOffDay?: boolean }) => (
                  <th
                    key={d.date}
                    className={cn(
                      "py-2.5 px-2 text-center min-w-[80px] border-l border-[#1E2B4D]/60",
                      d.isOffDay ? "bg-[#060A18]" : "bg-[#0A1024]"
                    )}
                  >
                    <div className="font-mono text-[10px] text-slate-300 font-bold whitespace-nowrap">
                      {d.dayLabel}
                    </div>
                    <div
                      className={cn(
                        "text-[9px] font-semibold truncate",
                        d.isOffDay
                          ? "text-slate-500 italic"
                          : "text-[#FDB827]"
                      )}
                    >
                      {d.isOffDay ? "Día Libre" : d.opponent}
                    </div>
                  </th>
                ))}

                {/* Columnas Rolling */}
                <th
                  onClick={() => toggleSort("p3d")}
                  className="py-3 px-2.5 text-center border-l border-[#1E2B4D] cursor-pointer hover:text-slate-200 transition-colors"
                  title="Pitcheos totales lanzados en los últimos 3 días"
                >
                  <div className="inline-flex items-center gap-1 text-[#38BDF8] font-bold">
                    <span>P 3D</span>
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("p5d")}
                  className="py-3 px-2.5 text-center cursor-pointer hover:text-slate-200 transition-colors"
                  title="Pitcheos totales lanzados en los últimos 5 días"
                >
                  <div className="inline-flex items-center gap-1 text-slate-300">
                    <span>P 5D</span>
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center text-slate-400" title="Innings lanzados en la semana">
                  IP SEM
                </th>

                {/* Estado de Disponibilidad */}
                <th className="py-3 px-3 text-center border-l border-[#1E2B4D] min-w-[130px]">
                  DISPONIBILIDAD
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filteredRelievers.map((r: RelieverBudgetItem) => {
                const roleMeta = ROLE_CONFIG[r.roleAbbr] || ROLE_CONFIG.MR;
                const isHeavyWorked = r.summary.pitchesLast3Days >= 30;

                return (
                  <tr
                    key={r.pitcherId}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Badge de Rol */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={cn(
                          "inline-block font-mono text-[10px] font-black px-2 py-0.5 rounded border tracking-wider",
                          roleMeta.badgeClass
                        )}
                        title={roleMeta.desc}
                      >
                        {r.roleAbbr}
                      </span>
                    </td>

                    {/* Lanzador (Avatar + Nombre + Mano) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center shrink-0">
                          <img
                            src={getPlayerHeadshotUrl(r.pitcherId)}
                            alt={r.pitcherName}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://cdn.tujonron.net/public_photos/no_picture.png";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            href="/pitching"
                            title={`Ver Pitching Summary de ${r.pitcherName}`}
                            className="font-bold text-slate-100 group-hover:text-[#FDB827] transition-colors hover:underline flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{r.pitcherName}</span>
                            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">
                              ↗
                            </span>
                          </Link>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                            <span
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                r.throws === "L"
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                  : "bg-white/5 text-slate-300 border-white/5"
                              )}
                            >
                              {r.throws === "L" ? "Zurdo" : "Derecho"}
                            </span>
                            <span>•</span>
                            <span>{r.seasonStats.games} JJ</span>
                            {r.seasonStats.gs > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-teal-300 font-bold">{r.seasonStats.gs} GS</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Stats de Temporada */}
                    <td className="py-3 px-2 text-center font-mono font-bold text-slate-200">
                      {r.seasonStats.era}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-400">
                      {r.seasonStats.whip}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-teal-300">
                      {r.seasonStats.gs > 0 ? r.seasonStats.gs : "—"}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-[#FDB827]">
                      {r.seasonStats.sv > 0 ? r.seasonStats.sv : "—"}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-[#38BDF8]">
                      {r.seasonStats.holds > 0 ? r.seasonStats.holds : "—"}
                    </td>

                    {/* Columnas de Fechas Diarias (Manejo de Días Libres y Aperturas GS) */}
                    {dates.map((d: { date: string; isOffDay?: boolean }, idx: number) => {
                      if (d.isOffDay) {
                        return (
                          <td
                            key={d.date}
                            className="py-2.5 px-2 text-center border-l border-[#1E2B4D]/30 bg-[#060A18]/50"
                          >
                            <span
                              className="text-slate-600 font-mono text-[11px] select-none"
                              title={`${r.pitcherName}: Día Libre (Descanso de Calendario)`}
                            >
                              —
                            </span>
                          </td>
                        );
                      }

                      const usage: RelieverDayUsage | undefined =
                        r.dailyUsage.find((u) => u.date === d.date) || r.dailyUsage[idx];
                      const pitched = usage && usage.pitched && usage.pitches > 0;

                      if (!pitched || !usage) {
                        return (
                          <td
                            key={d.date}
                            className="py-2.5 px-2 text-center border-l border-[#1E2B4D]/40 bg-[#070B19]/40"
                          >
                            <span className="text-slate-600 font-mono text-[11px]">
                              —
                            </span>
                          </td>
                        );
                      }

                      // Nivel de Carga
                      let cellClass =
                        "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
                      if (usage.loadLevel === "medium") {
                        cellClass =
                          "bg-amber-500/20 text-[#FDB827] border-amber-500/40";
                      } else if (usage.loadLevel === "high") {
                        cellClass =
                          "bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/40";
                      }

                      return (
                        <td
                          key={d.date}
                          className="py-2 px-1 text-center border-l border-[#1E2B4D]/50"
                        >
                          <div
                            className={cn(
                              "rounded-lg p-1.5 border text-center transition-transform hover:scale-105",
                              cellClass
                            )}
                            title={`${r.pitcherName} ${usage.isGS ? "inició el juego (GS) y " : ""}lanzó ${usage.pitches} pitcheos (${usage.strikes} strikes) en ${usage.ip} IP vs ${usage.opponent}`}
                          >
                            <div className="flex items-center justify-center gap-1 font-mono font-black text-xs flex-wrap">
                              <span>{usage.pitches}P</span>
                              {usage.isGS && (
                                <span
                                  className="text-[9px] font-black px-1 rounded bg-teal-500/30 text-teal-200 border border-teal-500/40"
                                  title="Apertura / Juego Iniciado (GS)"
                                >
                                  GS
                                </span>
                              )}
                              {usage.decision && (
                                <span
                                  className={cn(
                                    "text-[9px] font-black px-1 rounded",
                                    usage.decision === "SV" &&
                                      "bg-emerald-500 text-slate-950",
                                    usage.decision === "HLD" &&
                                      "bg-[#38BDF8] text-slate-950",
                                    usage.decision === "W" &&
                                      "bg-[#FDB827] text-slate-950",
                                    usage.decision === "L" &&
                                      "bg-rose-600 text-white"
                                  )}
                                >
                                  {usage.decision}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-300 font-mono opacity-80 mt-0.5">
                              {usage.ip} IP
                            </div>
                          </div>
                        </td>
                      );
                    })}

                    {/* Rolling Pitches 3D */}
                    <td className="py-3 px-2.5 text-center font-mono border-l border-[#1E2B4D]">
                      <span
                        className={cn(
                          "font-bold text-xs px-1.5 py-0.5 rounded",
                          isHeavyWorked
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : r.summary.pitchesLast3Days > 0
                            ? "text-[#38BDF8]"
                            : "text-slate-500"
                        )}
                      >
                        {r.summary.pitchesLast3Days}
                      </span>
                    </td>

                    {/* Rolling Pitches 5D */}
                    <td className="py-3 px-2.5 text-center font-mono text-slate-300 font-semibold">
                      {r.summary.pitchesLast5Days}
                    </td>

                    {/* Rolling IP Sem */}
                    <td className="py-3 px-2 text-center font-mono text-slate-400">
                      {r.summary.totalInningsWeek}
                    </td>

                    {/* Badge de Disponibilidad */}
                    <td className="py-3 px-3 text-center border-l border-[#1E2B4D]">
                      <div className="inline-flex items-center justify-center">
                        {r.summary.availabilityStatus === "available" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Disponible</span>
                          </span>
                        ) : r.summary.availabilityStatus === "caution" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-[#FDB827] border border-amber-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FDB827]" />
                            <span>Precaución</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Fatiga / Descanso</span>
                          </span>
                        )}
                      </div>
                      {r.summary.consecutiveDaysPitched >= 2 && (
                        <div className="text-[9px] text-rose-400 font-semibold font-mono mt-0.5">
                          {r.summary.consecutiveDaysPitched} días seguidos
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Criterios y Metodología ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 border-b border-[#1E2B4D] pb-3">
          <HelpCircle className="w-4 h-4 text-[#FDB827]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Metodología del Bullpen Budget, Días Libres y Trazabilidad de Abridores
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="space-y-1">
            <span className="font-bold text-slate-200">
              1. Trazabilidad de Abridores (GS) & Días Libres:
            </span>
            <p className="leading-relaxed">
              La cuadrícula abarca la rotación abridora identificando cada salida
              iniciada con la etiqueta <strong className="text-teal-300">GS</strong>.
              Los días de descanso de la liga (como los lunes sin jornada) se exhiben
              explícitamente como <strong className="text-slate-300">Día Libre</strong>,
              computando el descanso fisiológico real de los brazos.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-200">
              2. Jerarquía y Asignación de Roles:
            </span>
            <p className="leading-relaxed">
              Los lanzadores se organizan por rol táctico:{" "}
              <strong className="text-teal-300">SP (Abridor)</strong> para los
              brazos de la rotación,{" "}
              <strong className="text-[#FDB827]">CL (Cerrador)</strong> para el
              noveno inning,{" "}
              <strong className="text-[#38BDF8]">SU (Preparador)</strong> para el
              octavo con ventaja, y{" "}
              <strong className="text-purple-400">HL (High Leverage)</strong> para
              entradas de alto apalancamiento.
            </p>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-slate-200">
              3. Criterios de Recuperación y Disponibilidad:
            </span>
            <p className="leading-relaxed">
              Para los abridores tras aperturas de 50+ pitcheos, se exige un ciclo
              de descanso de 4 a 5 días antes de retornar a estado Disponible. Para
              relevistas, se alerta tras 25+ pitcheos o 2 días consecutivos de acción.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
