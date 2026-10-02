"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarGameEvent } from "@/types/calendar";
import { getTeam } from "@/lib/constants";
import {
  X,
  MapPin,
  Clock,
  Tv,
  Calendar,
  GitCompare,
  Trophy,
  TrendingUp,
} from "lucide-react";

interface CalendarEventModalProps {
  event: CalendarGameEvent | null;
  onClose: () => void;
}

export function CalendarEventModal({ event, onClose }: CalendarEventModalProps) {
  if (!event) return null;

  const caracas = getTeam(695);
  const opponent = getTeam(event.opponentId);

  // Formatear fecha en español: e.g. "Viernes, 24 de Octubre de 2026"
  const [yearStr, monthStr, dayStr] = event.date.split("-");
  const dateObj = new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10)
  );
  const formattedDate = dateObj.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Glow caraquista */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-[#FDB827]/10 rounded-full blur-2xl pointer-events-none" />

        {/* Encabezado del Modal */}
        <div className="flex items-center justify-between border-b border-[#1E2B4D] pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                event.isHome ? "bg-white" : "bg-[#FDB827]"
              }`}
            />
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
              Detalle del Encuentro
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#131E3D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badge de Local o Visitante con el color requerido */}
        <div className="flex items-center justify-between">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase font-mono ${
              event.isHome
                ? "bg-white/10 text-white border border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.15)]"
                : "bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/40 shadow-[0_0_10px_rgba(253,184,39,0.15)]"
            }`}
          >
            {event.isHome ? "🏠 Juego en Casa (Local)" : "✈️ Juego de Visita (Visitante)"}
          </span>
          <span className="text-xs font-mono text-slate-400 capitalize">
            {formattedDate}
          </span>
        </div>

        {/* Cara a Cara de Equipos */}
        <div className="p-4 rounded-xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-around relative">
          {/* Leones del Caracas */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-14 h-14 relative bg-[#0D152B] border border-[#FDB827]/30 rounded-2xl p-1.5 flex items-center justify-center shadow-md">
              <Image
                src={caracas.logoUrl}
                alt={caracas.name}
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-100">Leones</span>
            <span className="text-[10px] font-mono text-[#FDB827] font-semibold">CAR</span>
          </div>

          {/* Versus o Marcador */}
          <div className="flex flex-col items-center space-y-1">
            {event.result?.isCompleted ? (
              <div className="flex flex-col items-center">
                <span
                  className={`text-xl font-mono font-black ${
                    event.result.won ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {event.result.caracasScore} - {event.result.opponentScore}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#131E3D] text-slate-300 font-mono mt-1">
                  {event.result.status}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-base font-mono font-bold text-slate-400">
                  {event.isHome ? "VS" : "@"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono uppercase">
                  {event.isHome ? "En Caracas" : "En la Carretera"}
                </span>
              </div>
            )}
          </div>

          {/* Rival */}
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-14 h-14 relative bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-1.5 flex items-center justify-center shadow-md">
              <Image
                src={event.opponentLogo || opponent.logoUrl}
                alt={event.opponentName}
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-100 max-w-[90px] truncate">
              {event.opponentName.replace(/del |de /i, "")}
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">
              {event.opponentAbbr}
            </span>
          </div>
        </div>

        {/* Fila de Detalles: Hora, Transmisión, Estadio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Horario */}
          <div className="p-3 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D]/60 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#FDB827] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Horario Oficial</span>
              <span className="font-semibold text-slate-200">{event.timeDisplay}</span>
            </div>
          </div>

          {/* Transmisión TV */}
          <div className="p-3 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D]/60 flex items-start gap-2.5">
            <Tv className="w-4 h-4 text-[#FDB827] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Transmisión TV</span>
              <span className="font-semibold text-slate-200">{event.transmission}</span>
            </div>
          </div>

          {/* Estadio y Ciudad */}
          <div className="sm:col-span-2 p-3 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D]/60 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#FDB827] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Sede / Estadio</span>
              <span className="font-semibold text-slate-200">{event.stadiumName}</span>
              {event.city && (
                <span className="text-[11px] text-slate-400 block">{event.city}</span>
              )}
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-[#1E2B4D]">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link
              href={`/probabilidades?date=${event.date}`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDB827]/15 hover:bg-[#FDB827]/25 border border-[#FDB827]/40 text-[#FDB827] text-xs font-bold transition-all group shadow-sm"
              title="Ver proyección sabermétrica y cuotas de este encuentro"
            >
              <TrendingUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              <span>Ver Líneas & Probabilidades</span>
            </Link>

            <Link
              href={`/matchup`}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] hover:border-[#FDB827]/40 text-slate-200 text-xs font-semibold transition-all group"
            >
              <GitCompare className="w-3.5 h-3.5 text-[#FDB827] group-hover:scale-110 transition-transform" />
              <span>Matchup 360</span>
            </Link>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
