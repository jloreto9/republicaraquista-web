"use client";

import { useMemo } from "react";
import { CalendarGameEvent } from "@/types/calendar";
import { CalendarDayCard } from "./calendar-day-card";

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: CalendarGameEvent[];
  onSelectEvent: (event: CalendarGameEvent) => void;
}

const WEEKDAY_NAMES = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export function CalendarGrid({
  year,
  month,
  events,
  onSelectEvent,
}: CalendarGridProps) {
  // Mapear eventos por día del mes para acceso O(1)
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarGameEvent>();
    events.forEach((ev) => {
      if (ev.month === month && ev.year === year) {
        map.set(ev.dayNumber, ev);
      }
    });
    return map;
  }, [events, month, year]);

  // Cálculo del layout del mes
  const gridCells = useMemo(() => {
    // Primer día del mes
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const jsDay = firstDay.getUTCDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    // Convertir para que Lunes = 0, Domingo = 6
    const firstDayIndex = (jsDay + 6) % 7;

    // Cantidad de días en el mes actual
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    // Cantidad de días en el mes previo
    const daysInPrevMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();

    const cells: Array<{
      dayNumber: number;
      isCurrentMonth: boolean;
      event?: CalendarGameEvent;
    }> = [];

    // Celdas de relleno del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
      });
    }

    // Celdas del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        dayNumber: d,
        isCurrentMonth: true,
        event: eventsByDay.get(d),
      });
    }

    // Celdas de relleno del mes siguiente (completar múltiplos de 7)
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let n = 1; n <= remaining; n++) {
      cells.push({
        dayNumber: n,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month, eventsByDay]);

  return (
    <div className="w-full space-y-3">
      {/* Cabecera de Días de la Semana (LUN a DOM) */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 text-center">
        {WEEKDAY_NAMES.map((name, idx) => {
          const isWeekend = idx >= 5;
          return (
            <div
              key={name}
              className={`py-2 px-1 rounded-lg text-xs font-mono font-bold tracking-wider ${
                isWeekend
                  ? "bg-[#131E3D] text-[#FDB827] border border-[#FDB827]/20"
                  : "bg-[#0D152B] text-slate-300 border border-[#1E2B4D]/60"
              }`}
            >
              <span className="hidden sm:inline">{name}</span>
              <span className="sm:hidden">{name.slice(0, 1)}</span>
            </div>
          );
        })}
      </div>

      {/* Cuadrícula de 7 columnas */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        {gridCells.map((cell, idx) => (
          <CalendarDayCard
            key={`${cell.isCurrentMonth ? "curr" : "pad"}-${cell.dayNumber}-${idx}`}
            dayNumber={cell.dayNumber}
            isCurrentMonth={cell.isCurrentMonth}
            event={cell.event}
            onSelectEvent={onSelectEvent}
          />
        ))}
      </div>
    </div>
  );
}
