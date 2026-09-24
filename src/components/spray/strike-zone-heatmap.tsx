"use client";

import React, { useState } from "react";
import { PitchEvent, StrikeZoneMetrics } from "@/types/spray";

interface StrikeZoneHeatmapProps {
  pitches: PitchEvent[];
  metrics: StrikeZoneMetrics;
}

export function StrikeZoneHeatmap({ pitches, metrics }: StrikeZoneHeatmapProps) {
  const [viewMode, setViewMode] = useState<"dots" | "heatmap">("dots");

  // Dimensiones de la zona en el SVG
  // xFt va de -1.5 a +1.5
  // zFt va de 0.5 a 4.5
  const svgWidth = 360;
  const svgHeight = 420;

  // Home plate ancho: ~1.417 ft (-0.71 a +0.71)
  // Zona altura: 1.5 ft a 3.4 ft
  const toSvgX = (xFt: number) => 180 + xFt * 110;
  const toSvgY = (zFt: number) => 400 - (zFt - 0.5) * 95;

  const zoneLeft = toSvgX(-0.71);
  const zoneRight = toSvgX(0.71);
  const zoneTop = toSvgY(3.4);
  const zoneBottom = toSvgY(1.5);
  const zoneWidth = zoneRight - zoneLeft;
  const zoneHeight = zoneBottom - zoneTop;

  const callColors: Record<string, string> = {
    Whiff: "#ef4444",
    "Called Strike": "#f59e0b",
    Foul: "#3b82f6",
    "In Play": "#10b981",
    Ball: "#64748b",
    Other: "#94a3b8",
  };

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      {/* Visualización de la Zona */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3 text-xs">
          <button
            onClick={() => setViewMode("dots")}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              viewMode === "dots"
                ? "bg-[#FDB827] text-[#070B19]"
                : "bg-[#070B19] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
            }`}
          >
            Lanzamientos
          </button>
          <button
            onClick={() => setViewMode("heatmap")}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              viewMode === "heatmap"
                ? "bg-[#FDB827] text-[#070B19]"
                : "bg-[#070B19] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
            }`}
          >
            Matriz 3x3
          </button>
        </div>

        <div className="relative w-[320px] aspect-[360/420] bg-[#070B19] rounded-xl border border-[#1E2B4D] p-3 shadow-inner">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full select-none">
            {/* Home Plate en la base */}
            <polygon
              points={`180,410 135,395 135,385 225,385 225,395`}
              fill="#FFFFFF"
              opacity="0.8"
            />

            {/* Recuadro de la Zona de Strike */}
            <rect
              x={zoneLeft}
              y={zoneTop}
              width={zoneWidth}
              height={zoneHeight}
              fill="rgba(253, 184, 39, 0.05)"
              stroke="#FDB827"
              strokeWidth="2"
            />

            {/* Cuadrícula 3x3 de la zona de strike */}
            <line
              x1={zoneLeft + zoneWidth / 3}
              y1={zoneTop}
              x2={zoneLeft + zoneWidth / 3}
              y2={zoneBottom}
              stroke="#1E2B4D"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <line
              x1={zoneLeft + (2 * zoneWidth) / 3}
              y1={zoneTop}
              x2={zoneLeft + (2 * zoneWidth) / 3}
              y2={zoneBottom}
              stroke="#1E2B4D"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <line
              x1={zoneLeft}
              y1={zoneTop + zoneHeight / 3}
              x2={zoneRight}
              y2={zoneTop + zoneHeight / 3}
              stroke="#1E2B4D"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <line
              x1={zoneLeft}
              y1={zoneTop + (2 * zoneHeight) / 3}
              x2={zoneRight}
              y2={zoneTop + (2 * zoneHeight) / 3}
              stroke="#1E2B4D"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />

            {/* Si es modo cuadrícula 3x3 */}
            {viewMode === "heatmap" && (
              <>
                {[0, 1, 2].map((r) =>
                  [0, 1, 2].map((c) => {
                    const zoneIdx = r * 3 + c + 1;
                    const count = metrics.zoneCounts[zoneIdx] || 0;
                    const pct = metrics.totalPitches > 0 ? ((count / metrics.totalPitches) * 100).toFixed(0) : "0";
                    const zx = zoneLeft + c * (zoneWidth / 3) + zoneWidth / 6;
                    const zy = zoneTop + r * (zoneHeight / 3) + zoneHeight / 6;

                    return (
                      <g key={zoneIdx}>
                        <text
                          x={zx}
                          y={zy - 4}
                          fill="#FDB827"
                          fontSize="13"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          Z{zoneIdx}
                        </text>
                        <text
                          x={zx}
                          y={zy + 12}
                          fill="#94A3B8"
                          fontSize="11"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {pct}% ({count})
                        </text>
                      </g>
                    );
                  })
                )}
              </>
            )}

            {/* Si es modo dispersión de lanzamientos */}
            {viewMode === "dots" &&
              pitches.map((p, idx) => {
                const px = toSvgX(p.xFt);
                const py = toSvgY(p.zFt);
                const col = callColors[p.callGroup] || "#94a3b8";

                return (
                  <circle
                    key={idx}
                    cx={px}
                    cy={py}
                    r="4"
                    fill={col}
                    stroke="#070B19"
                    strokeWidth="1"
                    opacity="0.85"
                  />
                );
              })}
          </svg>
        </div>

        {/* Leyenda de lanzamientos */}
        {viewMode === "dots" && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Whiff
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Cantado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Foul
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" /> En Juego
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]" /> Bola
            </span>
          </div>
        )}
      </div>

      {/* Tabla de Métricas de Disciplina en el Plato */}
      <div className="flex-1 w-full space-y-4">
        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          Disciplina en el Plato (Plate Discipline)
        </h4>

        <div className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
            <div className="text-[10px] text-slate-400 uppercase font-sans">En Zona (Zone%)</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{metrics.zonePct}</div>
            <div className="text-[10px] text-slate-400 mt-1">Pitcheos recibidos dentro de zona</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Chase (O-Swing%)</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">{metrics.oSwingPct}</div>
            <div className="text-[10px] text-slate-400 mt-1">Swings a pitcheos fuera de zona</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Swing en Zona (Z-Swing%)</div>
            <div className="text-lg font-bold text-slate-100 mt-0.5">{metrics.zSwingPct}</div>
            <div className="text-[10px] text-slate-400 mt-1">Agresividad a strikes</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Contacto Zona (Z-Contact%)</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{metrics.zContactPct}</div>
            <div className="text-[10px] text-slate-400 mt-1">Contacto a strikes con swing</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Whiff% (Abanicado)</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">{metrics.whiffPct}</div>
            <div className="text-[10px] text-slate-400 mt-1">Abanicadas sobre swings totales</div>
          </div>

          <div className="p-3 rounded-lg bg-[#070B19] border border-[#1E2B4D]">
            <div className="text-[10px] text-slate-400 uppercase font-sans">CSW% (Called + Whiff)</div>
            <div className="text-lg font-bold text-[#FDB827] mt-0.5">{metrics.cswPct}</div>
            <div className="text-[10px] text-slate-400 mt-1">Strikes cantados y abanicados</div>
          </div>
        </div>
      </div>
    </div>
  );
}
