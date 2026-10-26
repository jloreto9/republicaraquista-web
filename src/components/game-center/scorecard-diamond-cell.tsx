"use client";

import { useState } from "react";
import { ScorecardCell } from "@/types/scorecard";

interface ScorecardDiamondCellProps {
  cells?: ScorecardCell[];
}

export function ScorecardDiamondCell({ cells }: ScorecardDiamondCellProps) {
  const [activeTooltip, setActiveTooltip] = useState<ScorecardCell | null>(null);

  if (!cells || cells.length === 0) {
    return (
      <div className="w-[84px] h-[84px] min-w-[84px] border-r border-b border-[#1E2B4D]/50 flex items-center justify-center bg-[#070B19]/30">
        <span className="text-slate-700 font-mono text-xs select-none">·</span>
      </div>
    );
  }

  return (
    <div className="flex items-center min-w-[84px] h-[84px] border-r border-b border-[#1E2B4D]/50 bg-[#070B19]/50 divide-x divide-[#1E2B4D]/30 relative">
      {cells.map((cell) => {
        const { diamond, eventCode, outNumber, rbi, countText, isHit, isScoringPlay } = cell;

        // Colores temáticos de la notación
        let textColor = "text-slate-300";
        if (eventCode === "HR" || isScoringPlay) {
          textColor = "text-[#FDB827] font-black";
        } else if (isHit) {
          textColor = "text-emerald-400 font-bold";
        } else if (eventCode === "K" || eventCode === "ꓘ") {
          textColor = "text-rose-400 font-bold";
        } else if (eventCode.startsWith("BB") || eventCode === "IBB" || eventCode === "HBP") {
          textColor = "text-sky-400 font-bold";
        } else if (cell.isOut) {
          textColor = "text-slate-400 font-semibold";
        }

        // Color de las líneas del rombo
        const pathColor = diamond.scored
          ? "#FDB827"
          : isHit
          ? "#10B981"
          : "#60A5FA";

        return (
          <div
            key={cell.playId}
            className="w-[84px] h-[84px] min-w-[84px] relative p-1 flex items-center justify-center hover:bg-[#1E2B4D]/40 transition-colors cursor-pointer group"
            onClick={() => setActiveTooltip(activeTooltip === cell ? null : cell)}
            onMouseEnter={() => setActiveTooltip(cell)}
            onMouseLeave={() => setActiveTooltip(null)}
          >
            {/* Rombo SVG */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id={`goldGrad-${cell.playId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDB827" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#D97706" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id={`emeraldGrad-${cell.playId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Relleno de la zona interior del diamante */}
              <polygon
                points="50,18 82,50 50,82 18,50"
                fill={
                  diamond.scored
                    ? `url(#goldGrad-${cell.playId})`
                    : diamond.reach3B
                    ? `url(#emeraldGrad-${cell.playId})`
                    : "rgba(15, 23, 42, 0.4)"
                }
              />

              {/* Aristas del Rombo Base */}
              {/* Home -> 1B */}
              <line
                x1="50"
                y1="82"
                x2="82"
                y2="50"
                stroke={diamond.reach1B ? pathColor : "#1E2B4D"}
                strokeWidth={diamond.reach1B ? "3.5" : "1.5"}
                strokeLinecap="round"
              />
              {/* 1B -> 2B */}
              <line
                x1="82"
                y1="50"
                x2="50"
                y2="18"
                stroke={diamond.reach2B ? pathColor : "#1E2B4D"}
                strokeWidth={diamond.reach2B ? "3.5" : "1.5"}
                strokeLinecap="round"
              />
              {/* 2B -> 3B */}
              <line
                x1="50"
                y1="18"
                x2="18"
                y2="50"
                stroke={diamond.reach3B ? pathColor : "#1E2B4D"}
                strokeWidth={diamond.reach3B ? "3.5" : "1.5"}
                strokeLinecap="round"
              />
              {/* 3B -> Home */}
              <line
                x1="18"
                y1="50"
                x2="50"
                y2="82"
                stroke={diamond.scored ? pathColor : "#1E2B4D"}
                strokeWidth={diamond.scored ? "3.5" : "1.5"}
                strokeLinecap="round"
              />

              {/* Puntos de Base (Esquinas del diamante) */}
              <circle cx="82" cy="50" r="2.5" fill={diamond.reach1B ? pathColor : "#334155"} />
              <circle cx="50" cy="18" r="2.5" fill={diamond.reach2B ? pathColor : "#334155"} />
              <circle cx="18" cy="50" r="2.5" fill={diamond.reach3B ? pathColor : "#334155"} />
              <polygon points="50,85 47,81 53,81" fill={diamond.scored ? pathColor : "#334155"} />

              {/* Notación Central de la Jugada */}
              <text
                x="50"
                y="53"
                textAnchor="middle"
                dominantBaseline="central"
                className={`font-mono select-none ${
                  eventCode.length > 3 ? "text-[11px]" : "text-[13px]"
                } ${textColor}`}
                fill="currentColor"
              >
                {eventCode}
              </text>

              {/* Conteo de pitcheos (B-S) en la esquina inferior derecha */}
              {countText && (
                <text
                  x="82"
                  y="87"
                  textAnchor="end"
                  className="text-[9px] font-mono fill-slate-500 select-none"
                >
                  {countText}
                </text>
              )}

              {/* Carreras Impulsadas (RBI dots) en la esquina inferior izquierda */}
              {rbi > 0 && (
                <text
                  x="16"
                  y="87"
                  textAnchor="start"
                  className="text-[10px] font-bold font-mono fill-[#FDB827] select-none"
                >
                  {"•".repeat(Math.min(4, rbi))}
                </text>
              )}
            </svg>

            {/* Badge de Out en la esquina superior izquierda (➀, ➁, ➂) */}
            {outNumber !== null && (
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-[9px] font-bold flex items-center justify-center pointer-events-none">
                {outNumber}
              </div>
            )}

            {/* Badge de Carrera Anotada */}
            {diamond.scored && (
              <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#FDB827]/30 border border-[#FDB827]/60 text-[#FDB827] font-bold text-[8px] flex items-center justify-center pointer-events-none">
                R
              </div>
            )}

            {/* Popover / Tooltip al hacer hover o tap */}
            {activeTooltip === cell && (
              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D] shadow-2xl text-left pointer-events-none backdrop-blur-md">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#1E2B4D] mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-[#FDB827] uppercase">
                    Entrada {cell.inning} • {cell.isTopInning ? "Alta" : "Baja"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#1E2B4D] text-slate-300">
                    {cell.eventCode}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-100">{cell.batterName}</div>
                {cell.pitcherName && (
                  <div className="text-[10px] text-slate-400 mb-1">
                    vs. {cell.pitcherName}
                  </div>
                )}
                <div className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                  {cell.description}
                </div>
                {(cell.rbi > 0 || cell.outNumber !== null) && (
                  <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-[#1E2B4D]/60 text-[10px]">
                    {cell.rbi > 0 && (
                      <span className="text-[#FDB827] font-bold">
                        {cell.rbi} CI (Impulsada{cell.rbi > 1 ? "s" : ""})
                      </span>
                    )}
                    {cell.outNumber !== null && (
                      <span className="text-rose-400 font-semibold">
                        Out #{cell.outNumber} de la entrada
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
