"use client";

import Image from "next/image";
import { CalendarGameEvent } from "@/types/calendar";
import { getPrimaryBroadcastBadge } from "@/lib/calendar-parser";
import { ChannelIconStack } from "./channel-logo";
import { Clock, Tv, MapPin } from "lucide-react";

interface CalendarDayCardProps {
  dayNumber: number;
  isCurrentMonth: boolean;
  event?: CalendarGameEvent;
  onSelectEvent?: (event: CalendarGameEvent) => void;
}

export function CalendarDayCard({
  dayNumber,
  isCurrentMonth,
  event,
  onSelectEvent,
}: CalendarDayCardProps) {
  // Celda de días fuera del mes (del mes anterior o siguiente)
  if (!isCurrentMonth) {
    return (
      <div className="min-h-[110px] sm:min-h-[135px] p-2 rounded-xl bg-[#070B19]/30 border border-[#1E2B4D]/30 opacity-25 select-none pointer-events-none">
        <span className="text-[11px] font-mono font-medium text-slate-600">
          {dayNumber}
        </span>
      </div>
    );
  }

  // Día sin juego de Leones (Día Libre / Descanso)
  if (!event) {
    return (
      <div className="min-h-[110px] sm:min-h-[135px] p-2.5 rounded-xl bg-[#070B19]/60 border border-[#1E2B4D]/40 flex flex-col justify-between transition-colors hover:border-[#1E2B4D]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-400">
            {dayNumber}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
          <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            Libre
          </span>
        </div>
      </div>
    );
  }

  // Día con juego de Leones del Caracas
  const isHome = event.isHome;
  const hasResult = Boolean(event.result?.isCompleted);
  const won = Boolean(event.result?.won);

  return (
    <div
      onClick={() => onSelectEvent && onSelectEvent(event)}
      className={`min-h-[110px] sm:min-h-[135px] p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none group relative overflow-hidden shadow-md ${
        isHome
          ? "bg-[#0D152B] border-2 border-white/70 hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          : "bg-[#0D152B] border-2 border-[#FDB827]/70 hover:border-[#FDB827] shadow-[0_0_15px_rgba(253,184,39,0.1)] hover:shadow-[0_0_20px_rgba(253,184,39,0.25)]"
      }`}
    >
      {/* Sombra de fondo contextual */}
      <div
        className={`absolute -top-10 -right-10 w-20 h-20 rounded-full blur-2xl pointer-events-none ${
          isHome ? "bg-white/10" : "bg-[#FDB827]/15"
        }`}
      />

      {/* Cabecera de la celda: Número de día y Badge Local/Visita */}
      <div className="flex items-center justify-between z-10">
        <span
          className={`text-xs sm:text-sm font-mono font-black ${
            isHome ? "text-white" : "text-[#FDB827]"
          }`}
        >
          {dayNumber}
        </span>

        {/* Badge Canónico: Blanco para Local, Dorado para Visita */}
        <span
          className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
            isHome
              ? "bg-white text-[#070B19] shadow-sm font-extrabold"
              : "bg-[#FDB827] text-[#070B19] shadow-sm font-extrabold"
          }`}
        >
          {isHome ? "CASA" : "VISITA"}
        </span>
      </div>

      {/* Contenido Central: Logo del rival y enfrentamiento */}
      <div className="my-1.5 flex items-center space-x-2 z-10">
        <div className="w-7 h-7 sm:w-8 sm:h-8 relative shrink-0 rounded-lg p-0.5 bg-[#070B19] border border-[#1E2B4D] group-hover:scale-110 transition-transform">
          <Image
            src={event.opponentLogo}
            alt={event.opponentName}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span
              className={`text-[10px] sm:text-xs font-mono font-bold leading-tight truncate ${
                isHome ? "text-slate-100" : "text-[#FDB827]"
              }`}
            >
              {isHome ? "vs." : "@"} {event.opponentAbbr}
            </span>
          </div>

          <span className="text-[9px] sm:text-[10px] text-slate-400 truncate leading-tight">
            {event.opponentName.replace(/del |de /i, "")}
          </span>
        </div>
      </div>

      {/* Pie de la celda: Hora / Resultado / Transmisión */}
      <div className="pt-1.5 border-t border-[#1E2B4D]/60 flex items-center justify-between text-[10px] font-mono z-10">
        {hasResult ? (
          <div className="flex items-center gap-1 w-full justify-between">
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                won
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-700/50"
                  : "bg-rose-950 text-rose-400 border border-rose-700/50"
              }`}
            >
              {won ? "G" : "P"} {event.result?.caracasScore}-{event.result?.opponentScore}
            </span>
            <span className="text-[8px] text-slate-400 uppercase">Final</span>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-slate-200">
              <Clock className="w-3 h-3 text-[#FDB827] shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-tight text-slate-100">
                {event.timeDisplay}
              </span>
            </div>

            {event.transmission && event.transmission !== "Por confirmar" ? (
              <ChannelIconStack
                transmission={event.transmission}
                maxIcons={2}
                iconSize={18}
              />
            ) : (
              <span className="text-[8px] font-mono text-slate-400 truncate max-w-[55px]">
                {event.city}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
