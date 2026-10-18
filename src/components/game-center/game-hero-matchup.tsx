"use client";

import Image from "next/image";
import {
  GameCenterTeam,
  GameCenterAvailableGame,
} from "@/types/game-center";
import { RefreshCw, Calendar, MapPin, ChevronDown } from "lucide-react";
import { ShareButton } from "@/components/layout/share-button";

interface GameHeroMatchupProps {
  homeTeam: GameCenterTeam;
  awayTeam: GameCenterTeam;
  status: "Live" | "Final" | "Preview";
  statusLabel: string;
  detailedState: string;
  date: string;
  time: string;
  venue: string;
  availableGames: GameCenterAvailableGame[];
  selectedGamePk: number;
  onSelectGame: (gamePk: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function GameHeroMatchup({
  homeTeam,
  awayTeam,
  status,
  statusLabel,
  detailedState,
  date,
  time,
  venue,
  availableGames,
  selectedGamePk,
  onSelectGame,
  onRefresh,
  isRefreshing,
}: GameHeroMatchupProps) {
  const isLive = status === "Live";
  const isFinal = status === "Final";

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#0D152B] to-[#070B19] border border-[#1E2B4D] shadow-2xl relative overflow-hidden">
      {/* ── BARRA SUPERIOR: SELECTOR DE JUEGOS Y STATUS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#1E2B4D]/80 gap-3">
        {/* Selector de Juegos */}
        <div className="flex items-center space-x-2">
          <label htmlFor="game-select" className="text-xs text-slate-400 font-bold uppercase tracking-wider">
            Partido:
          </label>
          <div className="relative">
            <select
              id="game-select"
              value={selectedGamePk}
              onChange={(e) => onSelectGame(Number(e.target.value))}
              className="bg-[#070B19] text-slate-100 text-xs sm:text-sm font-semibold py-1.5 pl-3 pr-8 rounded-xl border border-[#1E2B4D] focus:outline-none focus:border-[#FDB827] cursor-pointer appearance-none"
            >
              {availableGames.map((g) => (
                <option key={g.gamePk} value={g.gamePk}>
                  {g.date} • {g.opponent} ({g.score}) {g.isLive ? "• [EN VIVO]" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Estatus y Botón de Refresco */}
        <div className="flex items-center space-x-2.5 self-end sm:self-auto">
          <span
            className={`text-xs font-mono font-bold px-3 py-1 rounded-full border flex items-center space-x-1.5 shadow-sm ${
              isLive
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                : isFinal
                ? "bg-slate-800 text-slate-300 border-slate-700"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
            }`}
          >
            {isLive && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <span>{statusLabel}</span>
          </span>

          <ShareButton
            title={`Game Center: ${awayTeam.name} vs ${homeTeam.name}`}
            text={`¡Sigue el juego ${awayTeam.name} (${awayTeam.score}) vs ${homeTeam.name} (${homeTeam.score}) en vivo por REPUBLICARAQUISTAPP! 🦁⚾`}
            compact
          />

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Actualizar datos del juego"
            className="p-1.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-slate-400 hover:text-[#FDB827] hover:border-[#FDB827]/40 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#FDB827]" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* ── ENFRENTAMIENTO CENTRAL Y MARCADOR ── */}
      <div className="grid grid-cols-3 items-center py-2 sm:py-4">
        {/* EQUIPO VISITANTE (AWAY) */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-2xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center p-2.5 relative shadow-lg">
            <Image
              src={awayTeam.logoUrl}
              alt={awayTeam.name}
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <div>
            <h4 className="text-xs sm:text-base font-bold text-slate-100">
              {awayTeam.name}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              {awayTeam.isLeones ? "Leones (Visita)" : "Visitante"}
            </p>
          </div>
        </div>

        {/* MARCADOR Y DETALLE CENTRAL */}
        <div className="flex flex-col items-center text-center">
          <div className="text-3xl sm:text-5xl font-extrabold font-mono tracking-wider text-slate-100 flex items-center space-x-2">
            <span>{awayTeam.score}</span>
            <span className="text-slate-600 font-light">-</span>
            <span>{homeTeam.score}</span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#FDB827] mt-1.5 bg-[#FDB827]/10 px-2.5 py-0.5 rounded-full border border-[#FDB827]/30">
            {detailedState}
          </span>
        </div>

        {/* EQUIPO LOCAL (HOME) */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 sm:w-22 sm:h-22 rounded-2xl bg-[#070B19] border border-[#1E2B4D] flex items-center justify-center p-2.5 relative shadow-lg">
            <Image
              src={homeTeam.logoUrl}
              alt={homeTeam.name}
              width={64}
              height={64}
              className="object-contain"
            />
          </div>
          <div>
            <h4 className="text-xs sm:text-base font-bold text-slate-100">
              {homeTeam.name}
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              {homeTeam.isLeones ? "Leones (Local)" : "Local"}
            </p>
          </div>
        </div>
      </div>

      {/* ── METADATOS INFERIORES: FECHA Y SEDE ── */}
      <div className="mt-4 pt-3 border-t border-[#1E2B4D]/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#FDB827]" />
          <span>{date} • {time}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#FDB827]" />
          <span>{venue}</span>
        </div>
      </div>
    </div>
  );
}
