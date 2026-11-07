"use client";

import Image from "next/image";
import { CalendarGameEvent } from "@/types/calendar";
import { getPrimaryBroadcastBadge } from "@/lib/calendar-parser";
import { ChannelIconStack } from "./channel-logo";
import { Clock, Tv, MapPin, AlertCircle, Layers } from "lucide-react";

interface CalendarDayCardProps {
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday?: boolean;
  event?: CalendarGameEvent;
  onSelectEvent?: (event: CalendarGameEvent) => void;
}

export function CalendarDayCard({
  dayNumber,
  isCurrentMonth,
  isToday = false,
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
      <div
        className={`min-h-[110px] sm:min-h-[135px] p-2.5 rounded-xl flex flex-col justify-between transition-colors ${
          isToday
            ? "bg-[#0D152B] border-2 border-sky-400 ring-2 ring-sky-400/50 shadow-[0_0_20px_rgba(56,189,248,0.35)]"
            : "bg-[#070B19]/60 border border-[#1E2B4D]/40 hover:border-[#1E2B4D]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs font-mono font-bold ${
                isToday ? "text-sky-400 font-black" : "text-slate-400"
              }`}
            >
              {dayNumber}
            </span>
            {isToday && (
              <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-sky-400 text-[#070B19] tracking-wider animate-pulse shadow-sm">
                HOY
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
          <span
            className={`text-[10px] font-mono tracking-wider uppercase ${
              isToday ? "text-sky-300 font-bold" : "text-slate-400"
            }`}
          >
            Libre
          </span>
        </div>
      </div>
    );
  }

  // Día con juego de Leones del Caracas
  const isHome = event.isHome;
  const isPostponed = Boolean(event.result?.isPostponed);
  const isDoubleHeader = Boolean(event.isDoubleHeader && event.doubleHeaderGames && event.doubleHeaderGames.length > 1);
  const hasResult = Boolean(event.result?.isCompleted);
  const won = Boolean(event.result?.won);

  return (
    <div
      onClick={() => onSelectEvent && onSelectEvent(event)}
      className={`min-h-[110px] sm:min-h-[135px] p-2.5 rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 select-none group relative overflow-hidden shadow-md ${
        isToday ? "ring-2 ring-sky-400 border-sky-400 shadow-[0_0_22px_rgba(56,189,248,0.4)]" : ""
      } ${
        isPostponed && !hasResult
          ? "bg-[#0D152B] border-2 border-amber-500/70 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.12)]"
          : isDoubleHeader
          ? "bg-[#0D152B] border-2 border-[#FDB827] shadow-[0_0_18px_rgba(253,184,39,0.18)]"
          : isHome
          ? "bg-[#0D152B] border-2 border-white/70 hover:border-white shadow-[0_0_15px_rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          : "bg-[#0D152B] border-2 border-[#FDB827]/70 hover:border-[#FDB827] shadow-[0_0_15px_rgba(253,184,39,0.1)] hover:shadow-[0_0_20px_rgba(253,184,39,0.25)]"
      }`}
    >
      {/* Sombra de fondo contextual */}
      <div
        className={`absolute -top-10 -right-10 w-20 h-20 rounded-full blur-2xl pointer-events-none ${
          isToday
            ? "bg-sky-400/25"
            : isPostponed
            ? "bg-amber-500/15"
            : isDoubleHeader
            ? "bg-[#FDB827]/20"
            : isHome
            ? "bg-white/10"
            : "bg-[#FDB827]/15"
        }`}
      />

      {/* Cabecera de la celda: Número de día y Badges */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs sm:text-sm font-mono font-black ${
              isToday ? "text-sky-400 font-black" : isHome ? "text-white" : "text-[#FDB827]"
            }`}
          >
            {dayNumber}
          </span>
          {isToday && (
            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-sky-400 text-[#070B19] tracking-wider animate-pulse shadow-sm">
              HOY
            </span>
          )}
        </div>

        {/* Badges Canónicos */}
        <div className="flex items-center gap-1">
          {isDoubleHeader && (
            <span className="text-[8.5px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-[#FDB827] text-[#070B19] uppercase tracking-wider shadow-sm">
              DOBLE
            </span>
          )}
          {isPostponed && !hasResult && (
            <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider">
              POSP
            </span>
          )}
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
        {/* Caso A: Doble Juego con 2 compromisos completados */}
        {isDoubleHeader && event.doubleHeaderGames && event.doubleHeaderGames.length > 1 ? (
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between text-[8px] text-slate-400">
              <span className="text-[#FDB827] font-bold">DOBLE JUEGO</span>
              <span className="text-[7.5px] px-1 rounded bg-[#131E3D] text-slate-300">2J Final</span>
            </div>
            <div className="flex items-center gap-1 w-full justify-between">
              {event.doubleHeaderGames.map((dh) => (
                <span
                  key={dh.gamePk}
                  className={`px-1 py-0.5 rounded font-bold text-[8.5px] ${
                    dh.result.won
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-700/50"
                      : "bg-rose-950 text-rose-400 border border-rose-700/50"
                  }`}
                >
                  J{dh.gameNumber}: {dh.result.won ? "G" : "P"} {dh.result.caracasScore}-{dh.result.opponentScore}
                </span>
              ))}
            </div>
          </div>
        ) : isPostponed ? (
          /* Caso B: Juego Pospuesto / Suspendido */
          <div className="flex items-center gap-1 w-full justify-between">
            <span
              className={`px-1.5 py-0.5 rounded font-bold text-[8.5px] ${
                hasResult
                  ? won
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-600/50"
                    : "bg-rose-950 text-rose-300 border border-rose-600/50"
                  : "bg-amber-950 text-amber-300 border border-amber-600/50"
              }`}
            >
              {hasResult
                ? `POSP • ${won ? "G" : "P"} ${event.result?.caracasScore}-${event.result?.opponentScore}`
                : "POSPUESTO"}
            </span>
            <span className="text-[8px] text-amber-400 font-bold uppercase truncate max-w-[65px]">
              {event.result?.rescheduledToDate
                ? event.result.rescheduledToDate.slice(5).replace("-", "/")
                : event.result?.postponedReason || "Lluvia"}
            </span>
          </div>
        ) : hasResult ? (
          /* Caso C: Juego Individual Completado Normal */
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
          /* Caso D: Juego Programado Futuro */
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
                maxIcons={3}
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
