"use client";

import Image from "next/image";
import { GameCenterPlayerMatchup } from "@/types/game-center";
import { Crosshair } from "lucide-react";

interface CurrentMatchupCardProps {
  batter: GameCenterPlayerMatchup | null;
  pitcher: GameCenterPlayerMatchup | null;
}

export function CurrentMatchupCard({
  batter,
  pitcher,
}: CurrentMatchupCardProps) {
  if (!batter && !pitcher) {
    return null;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D]">
        <div className="flex items-center space-x-2">
          <Crosshair className="w-4 h-4 text-[#FDB827]" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
            Duelo en el Plato
          </h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#070B19] px-2.5 py-1 rounded-full border border-[#1E2B4D]">
          ENFRENTAMIENTO DIRECTO
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── BATEADOR EN TURNO ── */}
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D]/70">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#1E2B4D] border-2 border-[#FDB827] shrink-0 shadow-md">
            {batter?.headshotUrl ? (
              <Image
                src={batter.headshotUrl}
                alt={batter.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                B
              </div>
            )}
          </div>

          <div className="overflow-hidden flex-1">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <span className="text-[#FDB827]">AL BATE</span>
              <span>•</span>
              <span>{batter?.position || "BAT"}</span>
              <span>•</span>
              <span>Batea: {batter?.side || "D"}</span>
              {batter?.jerseyNumber && (
                <>
                  <span>•</span>
                  <span>#{batter.jerseyNumber}</span>
                </>
              )}
            </div>
            <h4 className="font-bold text-slate-100 text-sm truncate">
              {batter?.name || "Bateador en espera"}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="bg-[#1E2B4D] text-slate-200 px-2 py-0.5 rounded border border-[#2E3D66]">
                Hoy: {batter?.todaySummary || "0-0"}
              </span>
              {batter?.seasonSlash && (
                <span className="text-slate-400 text-[10px]">
                  ({batter.seasonSlash})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── LANZADOR ACTUANTE ── */}
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D]/70">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[#1E2B4D] border-2 border-slate-400 shrink-0 shadow-md">
            {pitcher?.headshotUrl ? (
              <Image
                src={pitcher.headshotUrl}
                alt={pitcher.name}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                P
              </div>
            )}
          </div>

          <div className="overflow-hidden flex-1">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400 uppercase">
              <span className="text-slate-300">LANZANDO</span>
              <span>•</span>
              <span>PITCHER</span>
              <span>•</span>
              <span>Brazo: {pitcher?.side || "D"}</span>
              {pitcher?.jerseyNumber && (
                <>
                  <span>•</span>
                  <span>#{pitcher.jerseyNumber}</span>
                </>
              )}
            </div>
            <h4 className="font-bold text-slate-100 text-sm truncate">
              {pitcher?.name || "Lanzador en espera"}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="bg-[#1E2B4D] text-slate-200 px-2 py-0.5 rounded border border-[#2E3D66]">
                Labor: {pitcher?.todaySummary || "0.0 IP"}
              </span>
              {pitcher?.seasonSlash && (
                <span className="text-slate-400 text-[10px]">
                  ({pitcher.seasonSlash})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
