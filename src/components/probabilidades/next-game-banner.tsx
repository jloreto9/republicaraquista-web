"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Tv,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { NextScheduledGameSummary, OddsFormat, GameProjection } from "@/types/probabilidades";
import { formatOdds } from "@/lib/probabilidades-engine";
import { getTeam } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface NextGameBannerProps {
  nextGame?: NextScheduledGameSummary;
  currentDate: string;
  onSelectDate: (date: string) => void;
  oddsFormat: OddsFormat;
  caracasProjection?: GameProjection;
}

export function NextGameBanner({
  nextGame,
  currentDate,
  onSelectDate,
  oddsFormat,
  caracasProjection,
}: NextGameBannerProps) {
  if (!nextGame) return null;

  const caracas = getTeam(695);
  const isViewingNextGame = currentDate === nextGame.date;

  // Formatear fecha legible en español (ej: Martes, 13 de Octubre de 2026)
  const [yearStr, monthStr, dayStr] = nextGame.date.split("-");
  const dateObj = new Date(
    parseInt(yearStr, 10),
    parseInt(monthStr, 10) - 1,
    parseInt(dayStr, 10)
  );
  const formattedDate = dateObj.toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Extraer métricas del modelo si la proyección actual corresponde a Caracas
  const isCaracasHome = nextGame.isHome;
  const caracasWinProb = caracasProjection
    ? isCaracasHome
      ? caracasProjection.model.homeWinProb
      : caracasProjection.model.awayWinProb
    : 0.545;

  const caracasFairOddsDecimal = caracasProjection
    ? isCaracasHome
      ? caracasProjection.model.fairHomeDecimal
      : caracasProjection.model.fairAwayDecimal
    : 1.83;

  const opponentFairOddsDecimal = caracasProjection
    ? isCaracasHome
      ? caracasProjection.model.fairAwayDecimal
      : caracasProjection.model.fairHomeDecimal
    : 2.10;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0D152B] via-[#091024] to-[#070B19] border border-[#FDB827]/30 p-4 sm:p-5 shadow-xl">
      {/* Glow dorado de fondo */}
      <div className="absolute top-0 right-10 w-48 h-48 bg-[#FDB827]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* ── Columna Izquierda: Identificador del Próximo Juego Oficial ── */}
        <div className="space-y-3 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#FDB827] text-[#070B19] shadow-sm">
              <Sparkles className="w-3 h-3" />
              <span>Próximo Juego Oficial en Calendario</span>
            </span>

            {nextGame.daysUntil > 0 ? (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                ⏳ Faltan {nextGame.daysUntil} día{nextGame.daysUntil > 1 ? "s" : ""}
              </span>
            ) : nextGame.daysUntil === 0 ? (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                ⚡ ¡Hoy es Día de Juego!
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">
                Temporada 2026-2027
              </span>
            )}

            <span className="text-xs text-slate-400 font-medium capitalize">
              • {formattedDate}
            </span>
          </div>

          {/* Duelo de Equipos */}
          <div className="flex items-center space-x-4">
            {/* Leones del Caracas */}
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#070B19] border border-[#FDB827]/40 p-1 flex items-center justify-center shrink-0 shadow-sm">
                <Image
                  src={caracas.logoUrl}
                  alt={caracas.name}
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-sm font-extrabold text-slate-100 block leading-tight">
                  Leones
                </span>
                <span className="text-[10px] font-bold text-[#FDB827] uppercase">
                  {isCaracasHome ? "🏠 Local" : "✈️ Visitante"}
                </span>
              </div>
            </div>

            <span className="text-xs font-black text-slate-500 font-mono">
              {isCaracasHome ? "VS" : "@"}
            </span>

            {/* Rival */}
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#070B19] border border-[#1E2B4D] p-1 flex items-center justify-center shrink-0 shadow-sm">
                <Image
                  src={nextGame.opponentLogo}
                  alt={nextGame.opponentName}
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-sm font-extrabold text-slate-100 block leading-tight truncate max-w-[140px]">
                  {nextGame.opponentName.replace(/del |de /i, "")}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {isCaracasHome ? "✈️ Visitante" : "🏠 Local"}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata de Sede y TV */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FDB827]" />
              <span className="text-slate-300 font-medium">{nextGame.stadiumName}</span>
            </span>

            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FDB827]" />
              <span>{nextGame.timeDisplay}</span>
            </span>

            {nextGame.transmission && (
              <span className="flex items-center space-x-1.5">
                <Tv className="w-3.5 h-3.5 text-slate-400" />
                <span>{nextGame.transmission}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Columna Derecha: Proyección Rápida y Acciones ── */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#1E2B4D]">
          {/* Métricas Rápidas del Modelo */}
          <div className="flex items-center space-x-3 bg-[#070B19]/80 border border-[#1E2B4D] rounded-xl px-3.5 py-2">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Win Prob CAR
              </span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {(caracasWinProb * 100).toFixed(1)}%
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Línea Justa
              </span>
              <span className="text-sm font-black text-[#FDB827] font-mono">
                {formatOdds(caracasFairOddsDecimal, oddsFormat)}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Rival
              </span>
              <span className="text-sm font-bold text-slate-300 font-mono">
                {formatOdds(opponentFairOddsDecimal, oddsFormat)}
              </span>
            </div>
          </div>

          {/* Botones de Navegación y Sincronización */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {!isViewingNextGame ? (
              <button
                onClick={() => onSelectDate(nextGame.date)}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#FDB827] text-[#070B19] hover:bg-[#E5A520] transition-colors shadow-md"
              >
                <span>Ver Cartelera de este Partido</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <span>✓ Jornada Seleccionada</span>
              </div>
            )}

            <Link
              href="/calendario"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#131E3D] hover:bg-[#1a2852] border border-[#1E2B4D] text-slate-200 transition-colors"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#FDB827]" />
              <span>Ver Calendario</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
