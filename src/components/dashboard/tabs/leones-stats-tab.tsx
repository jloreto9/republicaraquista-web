"use client";

import Image from "next/image";
import { LeonesAdvancedStats, WeeklyRecord, BroadcastChannelRecord } from "@/types/leones-stats";
import { Calendar, Tv, ShieldCheck } from "lucide-react";

interface LeonesStatsTabProps {
  stats: LeonesAdvancedStats;
  weeklyRecords: WeeklyRecord[];
  channelRecords: BroadcastChannelRecord[];
  seasonLabel?: string;
}

export function LeonesStatsTab({
  stats,
  weeklyRecords,
  channelRecords,
  seasonLabel = "25-26",
}: LeonesStatsTabProps) {
  return (
    <div className="space-y-6">
      {/* ── CUADRÍCULA PRINCIPAL: ESTADÍSTICAS DE SITUACIÓN (FIDELIDAD TOTAL A LA IMAGEN) ── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#0D152B]/90 border border-[#1E2B4D] shadow-xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#1E2B4D]">
          <div className="flex items-center space-x-2.5">
            <span className="text-xl">🦁</span>
            <h3 className="text-base sm:text-lg font-bold text-slate-100">
              Leones del Caracas {seasonLabel}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#FDB827] bg-[#FDB827]/10 px-2.5 py-1 rounded-full border border-[#FDB827]/30">
            Estadísticas de Situación
          </span>
        </div>

        {/* 3 Columnas de Desglose Situacional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-xs sm:text-sm">
          {/* Columna 1: Condiciones Generales & Racha */}
          <div className="space-y-2 text-slate-300 font-mono">
            <p className="font-bold text-slate-100 text-sm sm:text-base text-[#FDB827]">
              Juego N°{stats.totalGames} ({stats.record})
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Home Club:</span>
              <span className="font-semibold text-slate-200">{stats.homeRecord}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Visitante:</span>
              <span className="font-semibold text-slate-200">{stats.awayRecord}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">De noche:</span>
              <span className="font-semibold text-slate-200">{stats.nightRecord}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">De día:</span>
              <span className="font-semibold text-slate-200">{stats.dayRecord}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Blanqueo:</span>
              <span className="font-semibold text-slate-200">{stats.shutouts}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Racha:</span>
              <span className="font-semibold text-amber-400">{stats.streak}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">En extrainning:</span>
              <span className="font-semibold text-slate-200">{stats.extraInning}</span>
            </p>
            <p className="flex justify-between pt-0.5">
              <span className="text-slate-400">Ult-10J:</span>
              <span className="font-semibold text-slate-200">{stats.last10}</span>
            </p>
          </div>

          {/* Columna 2: Presión & Decisiones de Pitcheo */}
          <div className="space-y-2 text-slate-300 font-mono">
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Por 1 Carrera:</span>
              <span className="font-semibold text-slate-200">{stats.oneRun}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Remontados:</span>
              <span className="font-semibold text-emerald-400">{stats.remontados}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Arriba:</span>
              <span className="font-semibold text-slate-200">{stats.up}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Terreneadas:</span>
              <span className="font-semibold text-[#FDB827]">{stats.terreneadas}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Abridores:</span>
              <span className="font-semibold text-slate-200">{stats.starters}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Relevistas:</span>
              <span className="font-semibold text-slate-200">{stats.relievers}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Salvados:</span>
              <span className="font-semibold text-slate-200">{stats.saves}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">OCT:</span>
              <span className="font-semibold text-slate-200">{stats.oct}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">NOV:</span>
              <span className="font-semibold text-slate-200">{stats.nov}</span>
            </p>
            <p className="flex justify-between pt-0.5">
              <span className="text-slate-400">DEC:</span>
              <span className="font-semibold text-slate-200">{stats.dec}</span>
            </p>
          </div>

          {/* Columna 3: Por Día de Semana */}
          <div className="space-y-2 text-slate-300 font-mono">
            <p className="font-semibold text-slate-200 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 text-[#FDB827]">
              <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
              <span>Por Día de Semana:</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Lunes:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.lunes}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Martes:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.martes}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Miércoles:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.miercoles}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Jueves:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.jueves}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Viernes:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.viernes}</span>
            </p>
            <p className="flex justify-between border-b border-[#1E2B4D]/40 pb-1">
              <span className="text-slate-400">Sábado:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.sabado}</span>
            </p>
            <p className="flex justify-between pt-0.5">
              <span className="text-slate-400">Domingo:</span>
              <span className="font-semibold text-slate-200">{stats.daysRecord.domingo}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── SUB-PANEL: RÉCORD POR CANAL DE TRANSMISIÓN (TV & STREAMING) ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B]/80 border border-[#1E2B4D] shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1E2B4D] pb-3">
          <div className="flex items-center space-x-2">
            <Tv className="w-4 h-4 text-[#FDB827]" />
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Récord por Canal de Transmisión
            </h4>
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono bg-[#070B19] px-2.5 py-1 rounded-lg border border-[#1E2B4D]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sin contar BeisbolPlay (transmite los 56 juegos)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {channelRecords.map((ch) => (
            <div
              key={ch.channelKey}
              className="p-3 rounded-xl bg-[#070B19]/80 border border-[#1E2B4D] hover:border-[#FDB827]/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#0D152B] border border-[#1E2B4D] flex items-center justify-center p-1 shrink-0 overflow-hidden relative">
                  <Image
                    src={ch.logoUrl}
                    alt={ch.channelName}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">
                    {ch.channelName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {ch.scheduledGames} {ch.scheduledGames === 1 ? "juego" : "juegos"}
                  </p>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-[#1E2B4D]/50 font-mono">
                <span className="text-xs font-bold text-[#FDB827]">
                  {ch.record}
                </span>
                <span className="text-[11px] text-slate-400">
                  {ch.pct} PCT
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABLA INFERIOR: DESGLOSE SEMANA A SEMANA ISO ── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B]/80 border border-[#1E2B4D] shadow-lg space-y-3">
        <div className="flex items-center space-x-2 border-b border-[#1E2B4D] pb-3">
          <Calendar className="w-4 h-4 text-[#FDB827]" />
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Desglose Semana a Semana de Campeonato
          </h4>
        </div>

        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400">
                <th className="py-2.5 px-3">Semana</th>
                <th className="py-2.5 px-2 text-center">Juegos</th>
                <th className="py-2.5 px-2 text-center">G</th>
                <th className="py-2.5 px-2 text-center">P</th>
                <th className="py-2.5 px-2 text-center">PCT</th>
                <th className="py-2.5 px-2 text-center">CF</th>
                <th className="py-2.5 px-2 text-center">CP</th>
                <th className="py-2.5 px-2 text-center">DIF</th>
                <th className="py-2.5 px-3 text-right">Récord</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/50 text-slate-200">
              {weeklyRecords.map((week) => (
                <tr
                  key={week.weekNum}
                  className="hover:bg-[#131E3D]/40 transition-colors"
                >
                  <td className="py-2 px-3 font-semibold text-slate-100 whitespace-nowrap">
                    {week.semana}
                  </td>
                  <td className="py-2 px-2 text-center text-slate-400">{week.juegos}</td>
                  <td className="py-2 px-2 text-center text-emerald-400 font-bold">{week.w}</td>
                  <td className="py-2 px-2 text-center text-rose-400 font-bold">{week.l}</td>
                  <td className="py-2 px-2 text-center text-[#FDB827]">{week.pct}</td>
                  <td className="py-2 px-2 text-center text-slate-300">{week.cf}</td>
                  <td className="py-2 px-2 text-center text-slate-300">{week.cp}</td>
                  <td
                    className={`py-2 px-2 text-center font-bold ${
                      week.dif.startsWith("+")
                        ? "text-emerald-400"
                        : week.dif.startsWith("-")
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {week.dif}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-100 whitespace-nowrap">
                    {week.record}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
