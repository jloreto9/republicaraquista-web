"use client";

import React, { useState } from "react";
import { BattedBall } from "@/types/spray";
import { EVENT_COLORS, TRAJECTORY_COLORS, HARDNESS_COLORS } from "@/lib/spray-engine";
import {
  LVBP_STADIUMS,
  getStadiumsList,
  generateStadiumWallSvgPoints,
  evaluateWouldItDong,
} from "@/lib/stadiums-service";
import { Sparkles } from "lucide-react";

interface BaseballDiamondProps {
  battedBalls: BattedBall[];
  colorMode: "event" | "trajectory" | "hardness";
  selectedStadiumId?: string;
  selectedBall?: BattedBall | null;
  onSelectBall?: (ball: BattedBall) => void;
}

export function BaseballDiamond({
  battedBalls,
  colorMode,
  selectedStadiumId = "monumental",
  selectedBall = null,
  onSelectBall,
}: BaseballDiamondProps) {
  const [hoveredBall, setHoveredBall] = useState<BattedBall | null>(null);

  // Dimensiones del SVG y transformación de coordenadas
  // xFt va de -260 a +260
  // yFt va de 0 a 430
  const svgWidth = 600;
  const svgHeight = 520;

  // Escala: transformar (xFt, yFt) a (svgX, svgY)
  // xFt=0 -> svgX = 300
  // yFt=0 -> svgY = 460
  const scale = 1.05;
  const toSvgX = (xFt: number) => 300 + xFt * scale;
  const toSvgY = (yFt: number) => 460 - yFt * scale;

  // Estadio activo
  const isAllStadiums = selectedStadiumId === "all";
  const activeStadium = LVBP_STADIUMS[selectedStadiumId] || LVBP_STADIUMS.monumental;

  // 1. Arco de la barda del outfield para el estadio activo
  const wallPoints = generateStadiumWallSvgPoints(activeStadium, toSvgX, toSvgY, 60);

  // Polígono del campo activo
  const fieldPath = [
    `M ${toSvgX(0)} ${toSvgY(0)}`,
    ...wallPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `Z`,
  ].join(" ");

  // 2. Líneas de foul (según dimensiones de postes del estadio activo)
  const rFoulLeft = activeStadium.lf;
  const rFoulRight = activeStadium.rf;
  const foulLeftX = toSvgX(-rFoulLeft * Math.sin(Math.PI / 4));
  const foulLeftY = toSvgY(rFoulLeft * Math.cos(Math.PI / 4));
  const foulRightX = toSvgX(rFoulRight * Math.sin(Math.PI / 4));
  const foulRightY = toSvgY(rFoulRight * Math.cos(Math.PI / 4));

  // 3. Arcos de todos los estadios (cuando se visualiza modo comparativo "all")
  const allStadiumsList = getStadiumsList("8-teams");

  // 4. Arco de tierra del Infield (radio 95 ft centrado en y=60.5)
  const infieldArcPoints: { x: number; y: number }[] = [];
  const infSteps = 30;
  for (let i = 0; i <= infSteps; i++) {
    const theta = -Math.PI / 3 + (i / infSteps) * ((2 * Math.PI) / 3);
    const xFt = 95 * Math.sin(theta);
    const yFt = 60.5 + 95 * Math.cos(theta);
    infieldArcPoints.push({ x: toSvgX(xFt), y: toSvgY(yFt) });
  }
  const infieldArcPath = infieldArcPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // 5. Diamante y bases
  const homeX = toSvgX(0);
  const homeY = toSvgY(0);
  const base1X = toSvgX(63.64);
  const base1Y = toSvgY(63.64);
  const base2X = toSvgX(0);
  const base2Y = toSvgY(127.28);
  const base3X = toSvgX(-63.64);
  const base3Y = toSvgY(63.64);

  const diamondPath = `M ${homeX} ${homeY} L ${base1X} ${base1Y} L ${base2X} ${base2Y} L ${base3X} ${base3Y} Z`;

  const getColor = (ball: BattedBall): string => {
    if (colorMode === "event") {
      return EVENT_COLORS[ball.eventGroup] || "#94a3b8";
    }
    if (colorMode === "trajectory") {
      return TRAJECTORY_COLORS[ball.trajectory] || "#94a3b8";
    }
    if (colorMode === "hardness") {
      return HARDNESS_COLORS[ball.hardness] || "#94a3b8";
    }
    return "#FDB827";
  };

  const ballForTooltip = hoveredBall || selectedBall;
  const isDeepBall =
    ballForTooltip && ((ballForTooltip.distanceFt || 0) >= 300 || ballForTooltip.event === "Home Run");
  const dongInfo = isDeepBall ? evaluateWouldItDong(ballForTooltip, "8-teams") : null;

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="relative w-full max-w-[620px] aspect-[600/520]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full select-none"
          onMouseLeave={() => setHoveredBall(null)}
        >
          {/* Fondo césped del outfield */}
          <path
            d={fieldPath}
            fill="rgba(16, 185, 129, 0.08)"
            stroke={activeStadium.color || "#10b981"}
            strokeWidth={isAllStadiums ? "1.5" : "2.5"}
            strokeOpacity={isAllStadiums ? "0.3" : "0.6"}
          />

          {/* Si se eligen todos los estadios, superponer las bardas de cada equipo */}
          {isAllStadiums &&
            allStadiumsList.map((stadium) => {
              const pts = generateStadiumWallSvgPoints(stadium, toSvgX, toSvgY, 40);
              const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
              return (
                <path
                  key={stadium.id}
                  d={pathD}
                  fill="none"
                  stroke={stadium.color}
                  strokeWidth="1.8"
                  strokeOpacity="0.7"
                  strokeDasharray="4,3"
                />
              );
            })}

          {/* Líneas de Foul */}
          <line
            x1={homeX}
            y1={homeY}
            x2={foulLeftX}
            y2={foulLeftY}
            stroke="#F8FAFC"
            strokeWidth="2"
            strokeOpacity="0.7"
          />
          <line
            x1={homeX}
            y1={homeY}
            x2={foulRightX}
            y2={foulRightY}
            stroke="#F8FAFC"
            strokeWidth="2"
            strokeOpacity="0.7"
          />

          {/* Arco de tierra de Infield */}
          <path
            d={infieldArcPath}
            fill="none"
            stroke="#d97706"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            strokeOpacity="0.5"
          />

          {/* Diamante de bases */}
          <path
            d={diamondPath}
            fill="rgba(217, 119, 6, 0.12)"
            stroke="#F8FAFC"
            strokeWidth="1.5"
            strokeOpacity="0.7"
          />

          {/* Bases (Almohadillas) */}
          <polygon
            points={`${homeX},${homeY + 2} ${homeX - 5},${homeY - 3} ${homeX - 5},${homeY - 7} ${homeX + 5},${homeY - 7} ${homeX + 5},${homeY - 3}`}
            fill="#FFFFFF"
          />
          <rect
            x={base1X - 4}
            y={base1Y - 4}
            width="8"
            height="8"
            fill="#FFFFFF"
            transform={`rotate(45 ${base1X} ${base1Y})`}
          />
          <rect
            x={base2X - 4}
            y={base2Y - 4}
            width="8"
            height="8"
            fill="#FFFFFF"
            transform={`rotate(45 ${base2X} ${base2Y})`}
          />
          <rect
            x={base3X - 4}
            y={base3Y - 4}
            width="8"
            height="8"
            fill="#FFFFFF"
            transform={`rotate(45 ${base3X} ${base3Y})`}
          />

          {/* Montículo de pitcheo */}
          <circle cx={toSvgX(0)} cy={toSvgY(60.5)} r="4" fill="#d97706" opacity="0.8" />

          {/* Distancias impresas en la barda del estadio activo */}
          {!isAllStadiums && (
            <>
              <text
                x={foulLeftX - 10}
                y={foulLeftY - 5}
                fill="#94A3B8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {activeStadium.lf} ft
              </text>
              <text
                x={toSvgX(0)}
                y={toSvgY(activeStadium.cf) - 8}
                fill="#94A3B8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {activeStadium.cf} ft ({activeStadium.shortName})
              </text>
              <text
                x={foulRightX + 10}
                y={foulRightY - 5}
                fill="#94A3B8"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {activeStadium.rf} ft
              </text>
            </>
          )}

          {/* Batazos / Scatter points */}
          {battedBalls.map((ball, idx) => {
            const bx = toSvgX(ball.xFt);
            const by = toSvgY(ball.yFt);
            const isHovered = hoveredBall === ball;
            const isSelected = selectedBall === ball;
            const ballColor = getColor(ball);

            return (
              <g key={idx} className="cursor-pointer" onClick={() => onSelectBall?.(ball)}>
                {/* Anillo de enfoque cuando el batazo está seleccionado */}
                {isSelected && (
                  <circle
                    cx={bx}
                    cy={by}
                    r="9"
                    fill="none"
                    stroke="#FDB827"
                    strokeWidth="2"
                    className="animate-ping opacity-75"
                  />
                )}
                {isSelected && (
                  <circle
                    cx={bx}
                    cy={by}
                    r="8"
                    fill="none"
                    stroke="#FDB827"
                    strokeWidth="2"
                  />
                )}

                <circle
                  cx={bx}
                  cy={by}
                  r={isHovered ? 6 : ball.event === "Home Run" ? 4.5 : 3.5}
                  fill={ballColor}
                  stroke={isHovered || isSelected ? "#FFFFFF" : "#070B19"}
                  strokeWidth={isHovered || isSelected ? 2 : 1}
                  className="transition-transform duration-100 hover:scale-125"
                  onMouseEnter={() => setHoveredBall(ball)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip interactivo con datos del batazo */}
      {ballForTooltip && (
        <div
          onClick={() => onSelectBall?.(ballForTooltip)}
          className={`mt-3 p-3.5 rounded-xl bg-[#0D152B] border transition-all cursor-pointer shadow-xl text-xs flex flex-wrap items-center justify-between gap-4 max-w-[620px] w-full ${
            selectedBall === ballForTooltip
              ? "border-[#FDB827] shadow-[#FDB827]/10"
              : "border-[#1E2B4D] hover:border-slate-500"
          }`}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: getColor(ballForTooltip) }}
              />
              <span className="font-bold text-slate-100">{ballForTooltip.eventEs}</span>
            </div>

            <div className="text-slate-300">
              <span className="text-slate-400">Bateador:</span>{" "}
              <span className="font-semibold text-slate-100">{ballForTooltip.batterName}</span>
            </div>

            <div className="text-slate-300">
              <span className="text-slate-400">Distancia:</span>{" "}
              <span className="font-mono font-bold text-[#FDB827]">
                {ballForTooltip.distanceFt} ft
              </span>
            </div>

            <div className="text-slate-300">
              <span className="text-slate-400">Ángulo:</span>{" "}
              <span className="font-mono font-semibold text-slate-200">
                {ballForTooltip.sprayAngle}° ({ballForTooltip.direction})
              </span>
            </div>
          </div>

          {/* Badge y Botón de Would It Dong */}
          {dongInfo ? (
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border ${dongInfo.classificationBadgeColor}`}
              >
                {dongInfo.hrParksCount}/8 Parques
              </span>
              <span className="text-[10px] text-[#FDB827] flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3" /> Simular
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">
              {ballForTooltip.trajectoryEs} • {ballForTooltip.hardnessEs}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
