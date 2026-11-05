"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { LastGameDetail } from "@/types/leones-stats";
import { Trophy, Calendar, MapPin, Zap, ExternalLink } from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LastGameTabProps {
  lastGame: LastGameDetail | null;
}

export function LastGameTab({ lastGame }: LastGameTabProps) {
  const [viewMode, setViewMode] = useState<"general" | "batting" | "pitching">("general");

  if (!lastGame) {
    return (
      <div className="p-8 text-center rounded-2xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400">
        No hay datos de juego reciente disponibles.
      </div>
    );
  }

  const won = lastGame.leonesWon;
  const mvp = lastGame.mvp;
  const topBatter = lastGame.topBatter;
  const topPitcher = lastGame.topPitcher;

  // Jugador activo según la vista seleccionada
  const activePlayer = viewMode === "batting"
    ? (topBatter || mvp)
    : viewMode === "pitching"
    ? (topPitcher || mvp)
    : mvp;

  // Título contextual según victoria/derrota y pestaña activa
  const cardTitle = won
    ? viewMode === "batting"
      ? "Líder Ofensivo"
      : viewMode === "pitching"
      ? "Líder de Pitcheo"
      : "⭐ MVP de Leones"
    : viewMode === "batting"
    ? "Destacado al Bate"
    : viewMode === "pitching"
    ? "Destacado en la Loma"
    : "⭐ Destacado de Leones";

  const isPitcher = activePlayer?.type === "pitcher" || (viewMode === "pitching" && !topBatter);

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

        {/* Footer con fecha, estadio y enlace al Game Center */}
        <div className="pt-4 border-t border-[#1E2B4D] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 font-mono">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>{lastGame.gameDateFormatted}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>{lastGame.venue}</span>
          </div>
          <Link
            href="/game-center"
            className="flex items-center space-x-1 text-[#FDB827] hover:underline font-bold text-[11px] bg-[#FDB827]/10 px-2.5 py-1 rounded-lg border border-[#FDB827]/30"
          >
            <span>Ver en Game Center</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* ── COLUMNA 3: MVP / DESTACADO DE LEONES (MODELO EQUITATIVO TANGO RE24) ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#0D152B] via-[#131E3D] to-[#0D152B] border border-[#FDB827]/50 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E2B4D]">
            <div className="flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-[#FDB827]" />
              <h3 className="text-sm font-bold text-[#FDB827] uppercase tracking-wider">
                {cardTitle}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {isPitcher ? "Tango Game Score" : "Modelo Tango RE24"}
            </span>
          </div>

          {/* Selector de Modo: General / Bateo / Pitcheo */}
          <div className="flex items-center space-x-1 p-1 bg-[#070B19]/80 rounded-xl border border-[#1E2B4D] text-[10px] font-mono mb-4">
            <button
              type="button"
              onClick={() => setViewMode("general")}
              className={cn(
                "flex-1 py-1 px-1.5 rounded-lg font-semibold transition-all text-center",
                viewMode === "general"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              ⭐ {won ? "MVP" : "General"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("batting")}
              className={cn(
                "flex-1 py-1 px-1.5 rounded-lg font-semibold transition-all text-center",
                viewMode === "batting"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              🏏 Bateo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pitching")}
              className={cn(
                "flex-1 py-1 px-1.5 rounded-lg font-semibold transition-all text-center",
                viewMode === "pitching"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm font-bold"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              ⚾ Pitcheo
            </button>
          </div>

          {activePlayer ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-full bg-[#070B19] border-2 border-[#FDB827] overflow-hidden relative shrink-0 shadow-md">
                  <Image
                    src={activePlayer.playerAvatar}
                    alt={activePlayer.playerName}
                    width={56}
                    height={56}
                    className="object-cover"
                    unoptimized
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getMlbFallbackHeadshotUrl(activePlayer.playerId);
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-base font-bold text-slate-100">
                      {activePlayer.playerName}
                    </h4>
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase",
                      isPitcher
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                    )}>
                      {isPitcher ? "Lanzador" : "Bateador"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-emerald-400 font-mono font-bold mt-0.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WPA: {activePlayer.wpaTotal >= 0 ? `+${activePlayer.wpaTotal.toFixed(3)}` : activePlayer.wpaTotal.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Métricas Dinámicas según Bateo o Pitcheo */}
              {isPitcher ? (
                <div className="grid grid-cols-3 gap-2 text-center font-mono py-2 bg-[#070B19]/60 rounded-xl border border-[#1E2B4D]">
                  <div>
                    <p className="text-[10px] text-slate-400">Game Score</p>
                    <p className="text-xs font-bold text-[#FDB827]">
                      {activePlayer.gameScore ?? 50}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Pitcheo WPA</p>
                    <p className="text-xs font-bold text-slate-200">
                      {activePlayer.wpaPit >= 0 ? `+${activePlayer.wpaPit.toFixed(3)}` : activePlayer.wpaPit.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Clutch</p>
                    <p className="text-xs font-bold text-slate-200">
                      {activePlayer.clutch >= 0 ? `+${activePlayer.clutch.toFixed(3)}` : activePlayer.clutch.toFixed(3)}
                    </p>
                  </div>
                </div>
              ) : viewMode === "batting" ? (
                <div className="grid grid-cols-3 gap-2 text-center font-mono py-2 bg-[#070B19]/60 rounded-xl border border-[#1E2B4D]">
                  <div>
                    <p className="text-[10px] text-slate-400">Línea</p>
                    <p className="text-xs font-bold text-slate-100 truncate px-1">
                      {activePlayer.statsSummary || `${activePlayer.wpaBat >= 0 ? `+${activePlayer.wpaBat.toFixed(3)}` : activePlayer.wpaBat.toFixed(3)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Bateo WPA</p>
                    <p className="text-xs font-bold text-slate-200">
                      {activePlayer.wpaBat >= 0 ? `+${activePlayer.wpaBat.toFixed(3)}` : activePlayer.wpaBat.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Clutch</p>
                    <p className="text-xs font-bold text-[#FDB827]">
                      {activePlayer.clutch >= 0 ? `+${activePlayer.clutch.toFixed(3)}` : activePlayer.clutch.toFixed(3)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 text-center font-mono py-2 bg-[#070B19]/60 rounded-xl border border-[#1E2B4D]">
                  <div>
                    <p className="text-[10px] text-slate-400">Bateo</p>
                    <p className="text-xs font-bold text-slate-200">
                      {activePlayer.wpaBat >= 0 ? `+${activePlayer.wpaBat.toFixed(3)}` : activePlayer.wpaBat.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Pitcheo</p>
                    <p className="text-xs font-bold text-slate-200">
                      {activePlayer.wpaPit >= 0 ? `+${activePlayer.wpaPit.toFixed(3)}` : activePlayer.wpaPit.toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Clutch</p>
                    <p className="text-xs font-bold text-[#FDB827]">
                      {activePlayer.clutch >= 0 ? `+${activePlayer.clutch.toFixed(3)}` : activePlayer.clutch.toFixed(3)}
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-300 italic leading-relaxed">
                "{activePlayer.headline}"
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Sin datos disponibles para esta categoría.</p>
          )}
        </div>

        <div className="pt-3 border-t border-[#1E2B4D] text-[10px] text-slate-500 font-mono text-center">
          {won ? "Aporte a la Victoria" : "Mayor Rendimiento Individual"} • Win Probability Added
        </div>
      </div>
    </div>
  );
}
