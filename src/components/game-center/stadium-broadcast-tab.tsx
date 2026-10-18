"use client";

import { useRadio } from "@/context/radio-context";
import { Radio, Tv, MapPin, Wind, Volume2, Play, Pause } from "lucide-react";
import Image from "next/image";

interface StadiumBroadcastTabProps {
  venue: string;
  venueCity: string;
}

export function StadiumBroadcastTab({
  venue,
  venueCity,
}: StadiumBroadcastTabProps) {
  const { isPlaying, togglePlay, currentStation } = useRadio();

  const isMonumental = venue.toLowerCase().includes("monumental");
  const isUniversitario = venue.toLowerCase().includes("universitario");

  const stadiumCapacity = isMonumental
    ? "40,000 espectadores (Mayor aforo de Latinoamérica)"
    : isUniversitario
    ? "20,723 espectadores"
    : "15,000+ espectadores";

  const fieldDimensions = isMonumental
    ? "LF: 338 ft • CF: 407 ft • RF: 338 ft"
    : isUniversitario
    ? "LF: 347 ft • CF: 385 ft • RF: 347 ft"
    : "LF: 330 ft • CF: 400 ft • RF: 330 ft";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* ── COLUMNA 1: ESTADIO & SEDE ── */}
      <div className="p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-[#1E2B4D]">
            <MapPin className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
              Sede del Encuentro
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold text-[#FDB827] uppercase tracking-wider">
                PARQUE OFICIAL
              </p>
              <h4 className="text-lg font-bold text-slate-100 mt-0.5">
                {venue}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {venueCity}, Venezuela
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CAPACIDAD
                </span>
                <span className="text-xs font-semibold text-slate-200 mt-1 block">
                  {stadiumCapacity}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  DIMENSIONES
                </span>
                <span className="text-xs font-semibold text-slate-200 mt-1 block font-mono">
                  {fieldDimensions}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D] flex items-center space-x-3 text-xs text-slate-300">
              <Wind className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                Superficie de juego reglamentaria con estándares certificados por Major League Baseball.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── COLUMNA 2: TRANSMISIÓN (TV & CIRCUITO RADIAL) ── */}
      <div className="p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-[#1E2B4D]">
            <Radio className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
              Transmisión en Vivo
            </h3>
          </div>

          <div className="space-y-4">
            {/* Tarjeta de Radio en Vivo */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#121E42] to-[#0A1126] border border-[#FDB827]/40 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-[#FDB827] bg-[#FDB827]/15 px-2 py-0.5 rounded border border-[#FDB827]/30">
                  CIRCUITO RADIAL OFICIAL
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>

              <h4 className="text-sm sm:text-base font-bold text-slate-100">
                {currentStation.name} • {currentStation.frequency}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Voz oficial de los Leones del Caracas para toda Venezuela y el mundo.
              </p>

              <button
                onClick={togglePlay}
                className={`mt-3 w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
                  isPlaying
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                    : "bg-[#FDB827] text-[#070B19] hover:bg-amber-400 shadow-md"
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pausar Circuito Radial</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Sintonizar en Vivo ({currentStation.frequency})</span>
                  </>
                )}
              </button>
            </div>

            {/* Opciones de Televisión */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                SEÑAL DE TELEVISIÓN / STREAMING
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center space-x-2">
                  <Tv className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">ByM Sport</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center space-x-2">
                  <Tv className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">BeisbolPlay</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center space-x-2">
                  <Tv className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">1Baseball</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070B19] border border-[#1E2B4D] flex items-center space-x-2">
                  <Tv className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-200">Televen / IVC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
