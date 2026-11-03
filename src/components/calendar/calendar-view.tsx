"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  CalendarApiResponse,
  CalendarGameEvent,
} from "@/types/calendar";
import { LVBP_TEAMS } from "@/lib/constants";
import { getVenezuelanToday } from "@/lib/utils";
import { CalendarSubscribeBar } from "./calendar-subscribe-bar";
import { CalendarGrid } from "./calendar-grid";
import { CalendarEventModal } from "./calendar-event-modal";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  Home,
  Plane,
} from "lucide-react";

interface CalendarViewProps {
  initialData: CalendarApiResponse;
}

export function CalendarView({ initialData }: CalendarViewProps) {
  const months = initialData.months || [];
  const todayVet = useMemo(() => getVenezuelanToday(), []);

  const monthNumbers = useMemo(() => months.map((m) => m.month), [months]);
  const minMonth = monthNumbers.length > 0 ? Math.min(...monthNumbers) : 10;
  const maxMonth = monthNumbers.length > 0 ? Math.max(...monthNumbers) : 12;

  // Mes activo: si el mes actual de Venezuela está en el calendario, seleccionarlo automáticamente
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const today = getVenezuelanToday();
    const available = (initialData.months || []).map((m) => m.month);
    if (available.includes(today.month)) {
      return today.month;
    }
    return available[0] ?? 10;
  });

  const [filterCondition, setFilterCondition] = useState<"all" | "home" | "away">("all");
  const [filterOpponent, setFilterOpponent] = useState<string>("all");
  const [activeModalEvent, setActiveModalEvent] = useState<CalendarGameEvent | null>(null);

  const currentMonthData = useMemo(() => {
    return (
      months.find((m) => m.month === selectedMonth) ||
      months[0] || {
        year: 2026,
        month: 10,
        monthName: "Octubre",
        totalGames: 0,
        homeGames: 0,
        awayGames: 0,
        events: [],
      }
    );
  }, [months, selectedMonth]);

  // Filtrar eventos por condición y rival
  const filteredEvents = useMemo(() => {
    return initialData.events.filter((ev) => {
      // Filtro de condición
      if (filterCondition === "home" && !ev.isHome) return false;
      if (filterCondition === "away" && ev.isHome) return false;

      // Filtro de rival
      if (filterOpponent !== "all" && ev.opponentId !== Number(filterOpponent)) {
        return false;
      }

      return true;
    });
  }, [initialData.events, filterCondition, filterOpponent]);

  // Conteo de juegos del mes filtrados
  const monthFilteredEvents = useMemo(() => {
    return filteredEvents.filter((ev) => ev.month === selectedMonth);
  }, [filteredEvents, selectedMonth]);

  // Navegación entre meses
  const handlePrevMonth = () => {
    const idx = monthNumbers.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(monthNumbers[idx - 1]);
    } else if (selectedMonth > minMonth) {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const idx = monthNumbers.indexOf(selectedMonth);
    if (idx >= 0 && idx < monthNumbers.length - 1) {
      setSelectedMonth(monthNumbers[idx + 1]);
    } else if (selectedMonth < maxMonth) {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Barra de Suscripción Oficial (Android, iOS, .ics) ── */}
      <CalendarSubscribeBar />

      {/* ── 2. Barra de Navegación de Meses y Filtros ── */}
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Selector de Mes con Botones Prev/Next y Acceso a Hoy */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              disabled={selectedMonth <= minMonth}
              className="p-2 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Tabs de los meses disponibles */}
            <div className="flex items-center space-x-1 sm:space-x-2 bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D]">
              {months.map((m) => {
                const isActive = m.month === selectedMonth;
                const isCurrentMonthTab = m.month === todayVet.month;
                return (
                  <button
                    key={m.month}
                    onClick={() => setSelectedMonth(m.month)}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold font-mono transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-[#1E2B4D] text-[#FDB827] shadow-[0_0_12px_rgba(253,184,39,0.15)] border border-[#FDB827]/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-[#131E3D]"
                    }`}
                  >
                    <span>{m.monthName}</span>
                    {isCurrentMonthTab && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse shrink-0"
                        title="Mes actual"
                      />
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isActive
                          ? "bg-[#070B19] text-[#FDB827]"
                          : "bg-[#131E3D] text-slate-400"
                      }`}
                    >
                      {m.totalGames}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextMonth}
              disabled={selectedMonth >= maxMonth}
              className="p-2 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-300 hover:text-[#FDB827] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Botón de acceso directo a Hoy (si no se está viendo el mes actual) */}
            {monthNumbers.includes(todayVet.month) && selectedMonth !== todayVet.month && (
              <button
                onClick={() => setSelectedMonth(todayVet.month)}
                className="px-2.5 py-1.5 rounded-xl bg-[#070B19] border border-sky-400/50 text-sky-300 hover:bg-sky-400/10 text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                title="Volver al mes actual"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                <span>Hoy</span>
              </button>
            )}
          </div>

          {/* Filtros de Condición (Todos / Casa / Visita) y Rival */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filtro Casa / Visita */}
            <div className="flex items-center bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D]">
              <button
                onClick={() => setFilterCondition("all")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCondition === "all"
                    ? "bg-[#1E2B4D] text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Todos ({initialData.totalGames})
              </button>

              <button
                onClick={() => setFilterCondition("home")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCondition === "home"
                    ? "bg-white text-[#070B19] font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Filtrar juegos en el Estadio Monumental"
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>Casa ({initialData.homeGames})</span>
              </button>

              <button
                onClick={() => setFilterCondition("away")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterCondition === "away"
                    ? "bg-[#FDB827] text-[#070B19] font-bold shadow-sm"
                    : "text-slate-400 hover:text-[#FDB827]"
                }`}
                title="Filtrar juegos de visita en la carretera"
              >
                <span className="w-2 h-2 rounded-full bg-[#FDB827]" />
                <span>Visita ({initialData.awayGames})</span>
              </button>
            </div>

            {/* Selector de Rival */}
            <div className="relative">
              <select
                value={filterOpponent}
                onChange={(e) => setFilterOpponent(e.target.value)}
                className="appearance-none bg-[#070B19] border border-[#1E2B4D] text-slate-200 text-xs font-medium rounded-xl px-3 py-2 pr-8 focus:outline-none focus:border-[#FDB827]/50"
              >
                <option value="all">Todos los rivales</option>
                {Object.values(LVBP_TEAMS)
                  .filter((t) => t.id !== 695)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Leyenda y Resumen del Mes Activo */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E2B4D]/60 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-mono text-[11px]">Leyenda Oficial:</span>

            {/* Leyenda Casa (Blanco) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#070B19] border border-white/60">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="font-bold text-slate-100 font-mono text-[10px]">
                En Casa (Blanco)
              </span>
            </div>

            {/* Leyenda Visita (Dorado) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#070B19] border border-[#FDB827]/60">
              <span className="w-2 h-2 rounded-full bg-[#FDB827]" />
              <span className="font-bold text-[#FDB827] font-mono text-[10px]">
                De Visita (Dorado)
              </span>
            </div>

            {/* Leyenda Día Actual (Hoy) */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#070B19] border border-sky-400/70 shadow-[0_0_8px_rgba(56,189,248,0.25)]">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="font-bold text-sky-300 font-mono text-[10px]">
                Día Actual (Hoy)
              </span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Mostrando{" "}
            <span className="text-[#FDB827] font-bold">
              {monthFilteredEvents.length}
            </span>{" "}
            juegos en {currentMonthData.monthName} {currentMonthData.year}
          </div>
        </div>
      </div>

      {/* ── 3. Cuadrícula de Calendario Mensual (Lun-Dom) ── */}
      <CalendarGrid
        year={currentMonthData.year}
        month={selectedMonth}
        events={filteredEvents}
        onSelectEvent={(ev) => setActiveModalEvent(ev)}
      />

      {/* ── 4. Modal de Detalle de Partido ── */}
      <CalendarEventModal
        event={activeModalEvent}
        onClose={() => setActiveModalEvent(null)}
      />
    </div>
  );
}
