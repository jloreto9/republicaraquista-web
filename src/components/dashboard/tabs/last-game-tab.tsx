"use client";

import Image from "next/image";
import { LastGameDetail } from "@/types/leones-stats";
import { Trophy, Calendar, MapPin, Zap } from "lucide-react";

interface LastGameTabProps {
  lastGame: LastGameDetail | null;
}

export function LastGameTab({ lastGame }: LastGameTabProps) {
  if (!lastGame) {
    return (
      <div className="p-8 text-center rounded-2xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400">
        No hay datos de juego reciente disponibles.
      </div>
    );
  }

  const won = lastGame.leonesWon;
  const mvp = lastGame.mvp;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* ── COLUMNA 1 & 2: MARCADOR FINAL DEL ÚLTIMO ENCUENTRO ── */}
      <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#1E2B4D]">
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg">🆚</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wider">
                Último Resultado
              </h3>
            </div>
            <span
              className={`text-[11px] font-bold font-mono px-3 py-1 rounded-full border ${
                won
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border-rose-500/30"
              }`}
            >
              {won ? "VICTORIA CARAQUISTA" : "DERROTA"}
            </span>
          </div>

          {/* Enfrentamiento de Equipos */}
          <div className="grid grid-cols-3 items-center py-4">
            {/* Local */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center p-2 relative shadow-md">
                <Image
                  src={lastGame.homeTeamLogo}
                  alt={lastGame.homeTeamName}
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-100">
                  {lastGame.homeTeamName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {lastGame.isHomeLeones ? "Home Club (Local)" : "Rival"}
                </p>
              </div>
            </div>

            {/* Marcador Central */}
            <div className="flex flex-col items-center text-center">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tracking-wider text-slate-100">
                {lastGame.homeScore} - {lastGame.awayScore}
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#FDB827] mt-1 bg-[#FDB827]/10 px-2 py-0.5 rounded border border-[#FDB827]/30">
                FINAL
              </span>
            </div>

            {/* Visitante */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center p-2 relative shadow-md">
                <Image
                  src={lastGame.awayTeamLogo}
                  alt={lastGame.awayTeamName}
                  width={56}
                  height={56}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-100">
                  {lastGame.awayTeamName}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {!lastGame.isHomeLeones ? "Leones (Visita)" : "Rival"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con fecha y estadio */}
        <div className="pt-4 border-t border-[#1E2B4D] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 font-mono">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>{lastGame.gameDateFormatted}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>{lastGame.venue}</span>
          </div>
        </div>
      </div>

      {/* ── COLUMNA 3: MVP DE LEONES (WIN PROBABILITY ADDED) ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0D152B] via-[#131E3D] to-[#0D152B] border border-[#FDB827]/50 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-[#FDB827]" />
              <h3 className="text-sm font-bold text-[#FDB827] uppercase tracking-wider">
                ⭐ MVP de Leones
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Modelo Tango RE24
            </span>
          </div>

          {mvp ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-full bg-[#070B19] border-2 border-[#FDB827] overflow-hidden relative shrink-0 shadow-md">
                  <Image
                    src={mvp.playerAvatar}
                    alt={mvp.playerName}
                    width={56}
                    height={56}
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-100">
                    {mvp.playerName}
                  </h4>
                  <div className="flex items-center space-x-1 text-xs text-emerald-400 font-mono font-bold mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WPA Total: {mvp.wpaTotal >= 0 ? `+${mvp.wpaTotal.toFixed(3)}` : mvp.wpaTotal.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Métricas Desglosadas del MVP */}
              <div className="grid grid-cols-3 gap-2 text-center font-mono py-2 bg-[#070B19]/60 rounded-xl border border-[#1E2B4D]">
                <div>
                  <p className="text-[10px] text-slate-400">Bateo</p>
                  <p className="text-xs font-bold text-slate-200">
                    {mvp.wpaBat >= 0 ? `+${mvp.wpaBat.toFixed(3)}` : mvp.wpaBat.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Pitcheo</p>
                  <p className="text-xs font-bold text-slate-200">
                    {mvp.wpaPit >= 0 ? `+${mvp.wpaPit.toFixed(3)}` : mvp.wpaPit.toFixed(3)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Clutch</p>
                  <p className="text-xs font-bold text-[#FDB827]">
                    {mvp.clutch >= 0 ? `+${mvp.clutch.toFixed(3)}` : mvp.clutch.toFixed(3)}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 italic leading-relaxed">
                "{mvp.headline}"
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Sin datos de MVP para este partido.</p>
          )}
        </div>

        <div className="pt-3 border-t border-[#1E2B4D] text-[10px] text-slate-500 font-mono text-center">
          Win Probability Added • Aporte a la Probabilidad de Victoria
        </div>
      </div>
    </div>
  );
}
