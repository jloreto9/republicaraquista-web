"use client";

import React from "react";
import { BattedBall } from "@/types/spray";
import { evaluateWouldItDong } from "@/lib/stadiums-service";
import { Flame, ChevronRight, Ruler, Compass } from "lucide-react";

interface DeepBallsDrawerProps {
  battedBalls: BattedBall[];
  selectedBall: BattedBall | null;
  onSelectBall: (ball: BattedBall) => void;
}

export function DeepBallsDrawer({
  battedBalls,
  selectedBall,
  onSelectBall,
}: DeepBallsDrawerProps) {
  // Filtrar batazos de más de 300 pies o jonrones
  const deepBalls = [...battedBalls]
    .filter((b) => (b.distanceFt && b.distanceFt >= 300) || b.event === "Home Run")
    .sort((a, b) => (b.distanceFt || 0) - (a.distanceFt || 0));

  if (deepBalls.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-center text-xs text-slate-400">
        No hay registros de batazos profundos (≥300 ft) para este filtro.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#FDB827]" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Batazos Profundos Evaluados (≥300 ft)
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20">
            {deepBalls.length} conexiones
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Haz clic en cualquier batazo para simularlo en los estadios
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
        {deepBalls.map((ball, idx) => {
          const evalResult = evaluateWouldItDong(ball, "8-teams");
          const isSelected = selectedBall === ball;

          return (
            <button
              key={idx}
              onClick={() => onSelectBall(ball)}
              className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? "bg-[#1E2B4D]/60 border-[#FDB827] shadow-md shadow-[#FDB827]/10"
                  : "bg-[#070B19] border-[#1E2B4D] hover:border-slate-500 hover:bg-[#0D152B]"
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      ball.event === "Home Run"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-slate-700/40 text-slate-300 border border-slate-600/40"
                    }`}
                  >
                    {ball.eventEs || ball.event}
                  </span>
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {ball.batterName}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1 text-[#FDB827] font-bold">
                    <Ruler className="w-3 h-3" /> {ball.distanceFt} ft
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Compass className="w-3 h-3 text-blue-400" /> {ball.sprayAngle}° ({ball.direction})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] px-2 py-1 rounded-md border font-mono font-bold ${evalResult.classificationBadgeColor}`}
                >
                  {evalResult.hrParksCount}/8 HR
                </span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    isSelected ? "text-[#FDB827] translate-x-0.5" : "text-slate-500"
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
