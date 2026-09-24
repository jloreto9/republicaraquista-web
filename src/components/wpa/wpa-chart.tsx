"use client";

import React, { useState } from "react";
import { WpaPlay } from "@/types/wpa";

interface WpaChartProps {
  plays: WpaPlay[];
}

export function WpaChart({ plays }: WpaChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!plays || plays.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No hay datos de Win Expectancy disponibles para este partido.
      </div>
    );
  }

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Iniciar en 50% (x=0, y=0.5)
  const points = [
    { x: 0, y: 0.5, play: null },
    ...plays.map((p, idx) => ({
      x: idx + 1,
      y: p.wpAfter,
      play: p,
    })),
  ];

  const totalPoints = points.length;

  const getX = (idx: number) => padding.left + (idx / (totalPoints - 1)) * chartWidth;
  const getY = (val: number) => padding.top + (1 - val) * chartHeight;
  const yMid = getY(0.5);

  // Construir polígonos de relleno para Leones (> 0.5) y Rival (< 0.5)
  // Generar path de línea continuo
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p.y).toFixed(1)}`).join(" ");

  // Área sobre 50%
  const upperArea = [
    `M ${getX(0)} ${yMid}`,
    ...points.map((p, i) => `L ${getX(i).toFixed(1)} ${getY(Math.max(0.5, p.y)).toFixed(1)}`),
    `L ${getX(totalPoints - 1)} ${yMid}`,
    "Z",
  ].join(" ");

  // Área bajo 50%
  const lowerArea = [
    `M ${getX(0)} ${yMid}`,
    ...points.map((p, i) => `L ${getX(i).toFixed(1)} ${getY(Math.min(0.5, p.y)).toFixed(1)}`),
    `L ${getX(totalPoints - 1)} ${yMid}`,
    "Z",
  ].join(" ");

  const activePlay = hoverIndex !== null && hoverIndex > 0 ? points[hoverIndex]?.play : null;

  return (
    <div className="relative w-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-2">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FDB827]/40 border border-[#FDB827]" />
          <span className="text-slate-200 font-medium">Ventaja Leones (&gt;50%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#CE1141]/40 border border-[#CE1141]" />
          <span className="text-slate-200 font-medium">Ventaja Rival (&lt;50%)</span>
        </div>
      </div>

      <div className="relative w-full aspect-[8/3] max-h-[340px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="leonesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDB827" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FDB827" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="rivalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#CE1141" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#CE1141" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Líneas horizontales de referencia */}
          {[1.0, 0.75, 0.5, 0.25, 0.0].map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke={val === 0.5 ? "#FDB827" : "#1E2B4D"}
                strokeWidth={val === 0.5 ? "1.5" : "1"}
                strokeDasharray={val === 0.5 ? "4,4" : undefined}
                strokeOpacity={val === 0.5 ? 0.7 : 0.5}
              />
              <text
                x={padding.left - 8}
                y={getY(val) + 4}
                fill="#64748B"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="end"
              >
                {(val * 100).toFixed(0)}%
              </text>
            </g>
          ))}

          {/* Rellenos de área */}
          <path d={upperArea} fill="url(#leonesGrad)" />
          <path d={lowerArea} fill="url(#rivalGrad)" />

          {/* Línea principal de Win Expectancy */}
          <path d={linePath} fill="none" stroke="#FDB827" strokeWidth="2.5" />

          {/* Línea de cursor interactivo */}
          {hoverIndex !== null && (
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={height - padding.bottom}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeDasharray="2,2"
              strokeOpacity="0.8"
            />
          )}

          {/* Puntos y áreas de hover transparentes */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(p.y)}
              r={hoverIndex === i ? 5 : 2}
              fill={hoverIndex === i ? "#FFFFFF" : p.y >= 0.5 ? "#FDB827" : "#CE1141"}
              stroke="#070B19"
              strokeWidth="1.5"
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}

          {/* Eje X (Innings y jugadas) */}
          <text
            x={padding.left}
            y={height - 10}
            fill="#64748B"
            fontSize="10"
            fontFamily="monospace"
          >
            Inicio (1er Inning)
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            fill="#64748B"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            Final del Encuentro
          </text>
        </svg>
      </div>

      {/* Tooltip flotante con detalles de la jugada */}
      {activePlay && (
        <div className="mt-3 p-3 rounded-lg bg-[#0D152B] border border-[#1E2B4D] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-[#FDB827]/20 text-[#FDB827] font-mono font-bold">
              {activePlay.isBottom ? "▼ Baja" : "▲ Alta"} {activePlay.inning}
            </span>
            <span className="font-mono text-slate-300 font-semibold">{activePlay.outsBefore} Outs</span>
            <span className="font-mono text-[#FDB827] tracking-wider">{activePlay.baseIcons}</span>
            <span className="font-bold text-slate-100">{activePlay.scoreStr}</span>
          </div>

          <div className="flex-1 text-slate-200">
            <span className="font-semibold text-[#FDB827]">{activePlay.batter}</span> vs{" "}
            <span className="text-slate-300">{activePlay.pitcher}</span>:{" "}
            <span className="text-slate-300 italic">{activePlay.description}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Prob. Leones</span>
              <span className="font-bold font-mono text-sm text-slate-100">
                {(activePlay.wpAfter * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">WPA Jugada</span>
              <span
                className={`font-bold font-mono text-sm ${
                  activePlay.wpa >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {activePlay.wpa >= 0 ? `+${(activePlay.wpa * 100).toFixed(1)}%` : `${(activePlay.wpa * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Apalancamiento (LI)</span>
              <span className="font-bold font-mono text-sm text-[#FDB827]">{activePlay.li.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
