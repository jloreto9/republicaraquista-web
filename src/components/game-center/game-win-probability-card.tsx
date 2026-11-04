"use client";

import { useState } from "react";
import { GameCenterWinProbability, GameCenterWinProbabilityPoint } from "@/types/game-center";
import { TrendingUp, Activity } from "lucide-react";

interface GameWinProbabilityCardProps {
  data?: GameCenterWinProbability;
  homeTeamName: string;
  awayTeamName: string;
  status: string;
}

export function GameWinProbabilityCard({
  data,
  homeTeamName,
  awayTeamName,
  status,
}: GameWinProbabilityCardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<GameCenterWinProbabilityPoint | null>(null);

  const points = data?.trend || [];
  const currentLeonesWp = data?.currentLeonesWp ?? 0.5;
  const currentPct = Math.round(currentLeonesWp * 100);
  const rivalPct = 100 - currentPct;

  const keyPlay = data?.keyPlay;

  // Si no hay datos de jugadas (pre-juego o inicio sin jugadas)
  if (!points || points.length === 0) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Probabilidad de Ganar (Win Expectancy)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {status === "Live" ? "En curso" : "Pre-Juego"}
          </span>
        </div>

        <div className="h-28 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-[#1E2B4D]/60 rounded-xl bg-[#0A1020]/40">
          <span className="text-xs font-bold font-mono text-[#FDB827]">50% – 50%</span>
          <p className="text-[11px] text-slate-400 max-w-xs">
            Paridad inicial. La curva en tiempo real se trazará jugada a jugada mediante la matriz Tango RE24 una vez inicie el encuentro.
          </p>
        </div>
      </div>
    );
  }

  // Dimensiones SVG del gráfico
  const svgWidth = 600;
  const svgHeight = 140;
  const padLeft = 20;
  const padRight = 20;
  const padTop = 30;
  const padBottom = 20;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Coordenadas
  const total = Math.max(points.length, 1);
  const getX = (idx: number) => padLeft + (idx / Math.max(total - 1, 1)) * chartW;
  const getY = (wp: number) => padTop + (1 - Math.max(0, Math.min(1, wp))) * chartH;

  // Path de la línea continua
  const linePoints = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.leonesWp).toFixed(1)}`).join(" ");

  // Path del área sombreada con gradiente
  const areaPath = `M ${getX(0).toFixed(1)},${(padTop + chartH).toFixed(1)} ` +
    points.map((p, i) => `L ${getX(i).toFixed(1)},${getY(p.leonesWp).toFixed(1)}`).join(" ") +
    ` L ${getX(total - 1).toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

  // Identificar el índice de la jugada clave
  let keyPlayIndex = -1;
  if (keyPlay) {
    let maxDeltaFound = 0;
    points.forEach((p, idx) => {
      if (Math.abs(p.deltaWpa) > maxDeltaFound) {
        maxDeltaFound = Math.abs(p.deltaWpa);
        keyPlayIndex = idx;
      }
    });
  }

  const keyPoint = keyPlayIndex >= 0 ? points[keyPlayIndex] : null;
  const keyX = keyPlayIndex >= 0 ? getX(keyPlayIndex) : 0;
  const keyY = keyPlayIndex >= 0 && keyPoint ? getY(keyPoint.leonesWp) : 0;

  // Punto final actual
  const lastIndex = points.length - 1;
  const lastPoint = points[lastIndex];
  const lastX = getX(lastIndex);
  const lastY = lastPoint ? getY(lastPoint.leonesWp) : getY(currentLeonesWp);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl space-y-3 relative overflow-hidden">
      {/* ── HEADER DE LA TARJETA ── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1E2B4D]/60">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-[#FDB827]" />
          <h3 className="text-xs font-bold text-slate-200 tracking-wide">
            Probabilidad de ganar
          </h3>
        </div>

        <div className="flex items-center space-x-2 font-mono">
          <span className="text-xs sm:text-sm font-bold text-[#FDB827]">
            {currentPct}% Leones
          </span>
          <span className="text-[10px] text-slate-500">•</span>
          <span className="text-[11px] text-slate-400 font-medium">
            {rivalPct}% {data?.isLeonesHome ? awayTeamName : homeTeamName}
          </span>
        </div>
      </div>

      {/* ── LIENZO GRÁFICO SVG ── */}
      <div className="relative w-full aspect-[24/7] min-h-[140px] max-h-[180px] select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="leonesGoldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FDB827" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#FDB827" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lineStrokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#E29D12" />
              <stop offset="100%" stopColor="#FDB827" />
            </linearGradient>
          </defs>

          {/* Línea central de paridad (50%) */}
          <line
            x1={padLeft}
            y1={getY(0.5)}
            x2={svgWidth - padRight}
            y2={getY(0.5)}
            stroke="#334155"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.7"
          />

          {/* Área sombreada */}
          <path d={areaPath} fill="url(#leonesGoldGradient)" />

          {/* Curva continua */}
          <polyline
            fill="none"
            stroke="url(#lineStrokeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={linePoints}
          />

          {/* Marcador de Jugada Clave / Cumbre */}
          {keyPoint && keyPlay && (
            <g>
              <line
                x1={keyX}
                y1={keyY}
                x2={keyX}
                y2={Math.max(16, keyY - 24)}
                stroke="#FDB827"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle
                cx={keyX}
                cy={keyY}
                r="4.5"
                fill="#FDB827"
                className="animate-pulse"
              />
              <circle
                cx={keyX}
                cy={keyY}
                r="7"
                fill="none"
                stroke="#FDB827"
                strokeWidth="1.5"
                opacity="0.4"
              />

              {/* Tooltip / Pill de texto sobre la jugada clave */}
              <g transform={`translate(${Math.min(svgWidth - 95, Math.max(95, keyX))}, ${Math.max(16, keyY - 26)})`}>
                <rect
                  x="-85"
                  y="-12"
                  width="170"
                  height="16"
                  rx="4"
                  fill="#070B19"
                  stroke="#FDB827"
                  strokeWidth="0.8"
                  opacity="0.95"
                />
                <text
                  textAnchor="middle"
                  y="0"
                  fill="#FDB827"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {keyPlay.description ? `${keyPlay.description.slice(0, 24)} · ${keyPlay.deltaWpaText}` : `Jugada Clave · ${keyPlay.deltaWpaText}`}
                </text>
              </g>
            </g>
          )}

          {/* Punto final actual en vivo */}
          <circle
            cx={lastX}
            cy={lastY}
            r="4.5"
            fill="#FDB827"
            stroke="#070B19"
            strokeWidth="2"
          />
          <circle
            cx={lastX}
            cy={lastY}
            r="8"
            fill="none"
            stroke="#FDB827"
            strokeWidth="1"
            className="animate-ping"
            opacity="0.6"
          />

          {/* Zonas de hover transparentes sobre cada jugada */}
          {points.map((p, i) => (
            <rect
              key={i}
              x={getX(i) - (chartW / total) / 2}
              y={padTop}
              width={chartW / total}
              height={chartH}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(p)}
              onMouseLeave={() => setHoveredPoint(null)}
              onTouchStart={() => setHoveredPoint(p)}
            />
          ))}
        </svg>

        {/* ── TOOLTIP FLOTANTE INTERACTIVO AL PASAR EL CURSOR ── */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 pointer-events-none bg-[#070B19]/95 border border-[#FDB827]/40 shadow-xl rounded-lg p-2 text-[10px] font-mono z-20 backdrop-blur-md max-w-xs transition-opacity">
            <div className="flex items-center justify-between text-[#FDB827] font-bold border-b border-[#1E2B4D] pb-1 mb-1">
              <span>{hoveredPoint.half} {hoveredPoint.inning}.ª</span>
              <span>{Math.round(hoveredPoint.leonesWp * 100)}% Leones</span>
            </div>
            <p className="text-slate-200 line-clamp-2 text-[10px]">
              {hoveredPoint.description}
            </p>
            <div className="flex items-center justify-between mt-1 text-slate-400 text-[9px]">
              <span>Marcador: {hoveredPoint.scoreStr}</span>
              <span className={hoveredPoint.deltaWpa >= 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {hoveredPoint.deltaWpa >= 0 ? "+" : ""}{Math.round(hoveredPoint.deltaWpa * 100)}% WPA
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── PIE DE TARJETA SABERMÉTRICO ── */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-[#1E2B4D]/40">
        <span>Matriz Tango RE24 • 24 Estados</span>
        <span>Línea media: 50% paridad</span>
      </div>
    </div>
  );
}
