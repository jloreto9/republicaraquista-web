"use client";

import React from "react";
import { RadarAxis } from "@/types/matchup";

interface RadarChartProps {
  axes: RadarAxis[];
  p1Name: string;
  p2Name: string;
}

export function RadarChart({ axes, p1Name, p2Name }: RadarChartProps) {
  if (!axes || axes.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-slate-400 text-xs">
        No hay datos suficientes para graficar el radar.
      </div>
    );
  }

  const size = 460;
  const center = size / 2;
  const radius = 150;
  const numAxes = axes.length;
  const angleStep = (Math.PI * 2) / numAxes;
  const startAngle = -Math.PI / 2; // Arriba

  // Coordenadas de los niveles concéntricos (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (index: number, valuePct: number) => {
    const angle = startAngle + index * angleStep;
    const r = (valuePct / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Puntos polígono Jugador 1
  const p1Points = axes
    .map((ax, i) => {
      const coord = getCoordinates(i, ax.pct1);
      return `${coord.x},${coord.y}`;
    })
    .join(" ");

  // Puntos polígono Jugador 2
  const p2Points = axes
    .map((ax, i) => {
      const coord = getCoordinates(i, ax.pct2);
      return `${coord.x},${coord.y}`;
    })
    .join(" ");

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Leyenda Superior */}
      <div className="flex items-center space-x-6 mb-2 text-xs font-semibold">
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#FDB827] shadow-[0_0_8px_rgba(253,184,39,0.5)] border border-[#FDB827]" />
          <span className="text-[#FDB827] font-mono">{p1Name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#38BDF8] shadow-[0_0_8px_rgba(56,189,248,0.5)] border border-[#38BDF8]" />
          <span className="text-[#38BDF8] font-mono">{p2Name}</span>
        </div>
      </div>

      <div className="relative w-full max-w-[460px] aspect-square">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          <defs>
            <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E2B4D" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#070B19" stopOpacity="0.8" />
            </radialGradient>
          </defs>

          {/* Fondo central */}
          <circle cx={center} cy={center} r={radius} fill="url(#radarGlow)" />

          {/* Rejilla Concéntrica (Telaraña) */}
          {levels.map((lvl, lIdx) => {
            const levelPoints = axes
              .map((_, i) => {
                const angle = startAngle + i * angleStep;
                const r = lvl * radius;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(" ");

            return (
              <g key={`level-${lIdx}`}>
                <polygon
                  points={levelPoints}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1"
                />
                {/* Etiqueta de percentil en el eje superior */}
                <text
                  x={center + 5}
                  y={center - lvl * radius + 4}
                  fill="rgba(148, 163, 184, 0.4)"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {Math.round(lvl * 100)}
                </text>
              </g>
            );
          })}

          {/* Ejes Radiales */}
          {axes.map((ax, i) => {
            const angle = startAngle + i * angleStep;
            const x2 = center + radius * Math.cos(angle);
            const y2 = center + radius * Math.sin(angle);

            // Coordenada para el texto fuera del radio
            const labelR = radius + 32;
            const lx = center + labelR * Math.cos(angle);
            const ly = center + labelR * Math.sin(angle);

            // Alineación de texto según posición angular
            let textAnchor: "middle" | "start" | "end" = "middle";
            if (Math.cos(angle) > 0.3) textAnchor = "start";
            else if (Math.cos(angle) < -0.3) textAnchor = "end";

            return (
              <g key={`axis-${i}`}>
                <line
                  x1={center}
                  y1={center}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  fill="#E2E8F0"
                  fontSize="11"
                  fontWeight="600"
                  className="select-none tracking-tight"
                >
                  {ax.name}
                </text>
              </g>
            );
          })}

          {/* Polígono Jugador 1 (Dorado Caraquista) */}
          <polygon
            points={p1Points}
            fill="rgba(253, 184, 39, 0.22)"
            stroke="#FDB827"
            strokeWidth="2.5"
            className="transition-all duration-300"
          />

          {/* Polígono Jugador 2 (Azul Cielo) */}
          <polygon
            points={p2Points}
            fill="rgba(56, 189, 248, 0.22)"
            stroke="#38BDF8"
            strokeWidth="2.5"
            className="transition-all duration-300"
          />

          {/* Vértices / Nodos Jugador 1 */}
          {axes.map((ax, i) => {
            const coord = getCoordinates(i, ax.pct1);
            return (
              <circle
                key={`p1-node-${i}`}
                cx={coord.x}
                cy={coord.y}
                r="4.5"
                fill="#FDB827"
                stroke="#070B19"
                strokeWidth="1.5"
                className="transition-all duration-300 hover:r-6 cursor-pointer"
              >
                <title>{`${p1Name} - ${ax.name}: ${ax.val1} (P${ax.pct1})`}</title>
              </circle>
            );
          })}

          {/* Vértices / Nodos Jugador 2 */}
          {axes.map((ax, i) => {
            const coord = getCoordinates(i, ax.pct2);
            return (
              <circle
                key={`p2-node-${i}`}
                cx={coord.x}
                cy={coord.y}
                r="4.5"
                fill="#38BDF8"
                stroke="#070B19"
                strokeWidth="1.5"
                className="transition-all duration-300 hover:r-6 cursor-pointer"
              >
                <title>{`${p2Name} - ${ax.name}: ${ax.val2} (P${ax.pct2})`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <div className="text-[11px] text-slate-400 font-mono mt-2">
        Escala: Percentiles relativos 0 a 100 frente a toda la LVBP
      </div>
    </div>
  );
}
