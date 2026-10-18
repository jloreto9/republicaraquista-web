"use client";

import { GameCenterCount } from "@/types/game-center";

interface LiveCountProps {
  count: GameCenterCount;
  inning: number;
  inningHalf: string;
  isTopInning: boolean;
  status: "Live" | "Final" | "Preview";
}

export function LiveCount({
  count,
  inning,
  inningHalf,
  isTopInning,
  status,
}: LiveCountProps) {
  const isFinal = status === "Final";

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#070B19]/80 border border-[#1E2B4D] shadow-inner">
      {/* Indicador de Entrada */}
      <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-[#1E2B4D]/60 w-full justify-center">
        <span
          className={`text-xs font-mono font-bold flex items-center space-x-1 ${
            isFinal ? "text-slate-400" : "text-[#FDB827]"
          }`}
        >
          <span className="text-sm">{isTopInning ? "▲" : "▼"}</span>
          <span>
            {inningHalf} {inning}
            {inning === 1 ? "ra" : inning === 2 ? "da" : inning === 3 ? "ra" : "ta"}
          </span>
        </span>
        {status === "Live" && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </div>

      {/* Indicadores LED de Conteo B - S - O */}
      <div className="grid grid-cols-3 gap-3 w-full text-center">
        {/* BOLAS (B) */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            B
          </span>
          <div className="flex space-x-1">
            {[1, 2, 3].map((b) => {
              const active = count.balls >= b;
              return (
                <div
                  key={`ball-${b}`}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    active
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] border border-emerald-300"
                      : "bg-[#1E2B4D]/60 border border-slate-700/50"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* STRIKES (S) */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            S
          </span>
          <div className="flex space-x-1">
            {[1, 2].map((s) => {
              const active = count.strikes >= s;
              return (
                <div
                  key={`strike-${s}`}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    active
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] border border-amber-300"
                      : "bg-[#1E2B4D]/60 border border-slate-700/50"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* OUTS (O) */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            O
          </span>
          <div className="flex space-x-1">
            {[1, 2].map((o) => {
              const active = count.outs >= o;
              return (
                <div
                  key={`out-${o}`}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    active
                      ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] border border-rose-400"
                      : "bg-[#1E2B4D]/60 border border-slate-700/50"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
