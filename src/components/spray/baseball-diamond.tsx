"use client";

import React, { useState } from "react";
import { BattedBall } from "@/types/spray";
import { EVENT_COLORS, TRAJECTORY_COLORS, HARDNESS_COLORS } from "@/lib/spray-engine";

interface BaseballDiamondProps {
  battedBalls: BattedBall[];
  colorMode: "event" | "trajectory" | "hardness";
}

export function BaseballDiamond({ battedBalls, colorMode }: BaseballDiamondProps) {
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

  // 1. Arco de la barda del outfield (335 ft en postes a 400 ft en CF)
  const steps = 60;
  const wallPoints: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = -Math.PI / 4 + (i / steps) * (Math.PI / 2);
    const rWall = 400 - 65 * Math.pow(theta / (Math.PI / 4), 2);
    const xFt = rWall * Math.sin(theta);
    const yFt = rWall * Math.cos(theta);
    wallPoints.push({ x: toSvgX(xFt), y: toSvgY(yFt) });
  }

  // Polígono del campo
  const fieldPath = [
    `M ${toSvgX(0)} ${toSvgY(0)}`,
    ...wallPoints.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`),
    `Z`,
  ].join(" ");

  // 2. Líneas de foul (335 ft)
  const rFoul = 335;
  const foulLeftX = toSvgX(-rFoul * Math.sin(Math.PI / 4));
  const foulLeftY = toSvgY(rFoul * Math.cos(Math.PI / 4));
  const foulRightX = toSvgX(rFoul * Math.sin(Math.PI / 4));
  const foulRightY = toSvgY(rFoul * Math.cos(Math.PI / 4));

  // 3. Arco de tierra del Infield (radio 95 ft centrado en y=60.5)
  const infieldArcPoints: { x: number; y: number }[] = [];
  const infSteps = 30;
  for (let i = 0; i <= infSteps; i++) {
    const theta = -Math.PI / 3 + (i / infSteps) * ((2 * Math.PI) / 3);
    const xFt = 95 * Math.sin(theta);
    const yFt = 60.5 + 95 * Math.cos(theta);
    infieldArcPoints.push({ x: toSvgX(xFt), y: toSvgY(yFt) });
  }
  const infieldArcPath = infieldArcPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  // 4. Diamante y bases
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
            stroke="#10b981"
            strokeWidth="2.5"
            strokeOpacity="0.4"
          />

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
          {/* Home plate */}
          <polygon
            points={`${homeX},${homeY + 2} ${homeX - 5},${homeY - 3} ${homeX - 5},${homeY - 7} ${homeX + 5},${homeY - 7} ${homeX + 5},${homeY - 3}`}
            fill="#FFFFFF"
          />
          {/* 1B */}
          <rect x={base1X - 4} y={base1Y - 4} width="8" height="8" fill="#FFFFFF" transform={`rotate(45 ${base1X} ${base1Y})`} />
          {/* 2B */}
          <rect x={base2X - 4} y={base2Y - 4} width="8" height="8" fill="#FFFFFF" transform={`rotate(45 ${base2X} ${base2Y})`} />
          {/* 3B */}
          <rect x={base3X - 4} y={base3Y - 4} width="8" height="8" fill="#FFFFFF" transform={`rotate(45 ${base3X} ${base3Y})`} />

          {/* Montículo de pitcheo */}
          <circle cx={toSvgX(0)} cy={toSvgY(60.5)} r="4" fill="#d97706" opacity="0.8" />

          {/* Distancias impresas en la barda */}
          <text x={foulLeftX - 10} y={foulLeftY - 5} fill="#64748B" fontSize="10" fontFamily="monospace">
            335 ft
          </text>
          <text x={toSvgX(0)} y={toSvgY(400) - 8} fill="#64748B" fontSize="10" fontFamily="monospace" textAnchor="middle">
            400 ft
          </text>
          <text x={foulRightX + 10} y={foulRightY - 5} fill="#64748B" fontSize="10" fontFamily="monospace">
            335 ft
          </text>

          {/* Batazos / Scatter points */}
          {battedBalls.map((ball, idx) => {
            const bx = toSvgX(ball.xFt);
            const by = toSvgY(ball.yFt);
            const isHovered = hoveredBall === ball;
            const ballColor = getColor(ball);

            return (
              <circle
                key={idx}
                cx={bx}
                cy={by}
                r={isHovered ? 6 : ball.event === "Home Run" ? 4.5 : 3.5}
                fill={ballColor}
                stroke={isHovered ? "#FFFFFF" : "#070B19"}
                strokeWidth={isHovered ? 2 : 1}
                className="cursor-pointer transition-transform duration-100"
                onMouseEnter={() => setHoveredBall(ball)}
              />
            );
          })}
        </svg>
      </div>

      {/* Tooltip con datos del batazo */}
      {hoveredBall && (
        <div className="mt-3 p-3 rounded-lg bg-[#0D152B] border border-[#1E2B4D] shadow-xl text-xs flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getColor(hoveredBall) }}
            />
            <span className="font-bold text-slate-100">{hoveredBall.eventEs}</span>
          </div>

          <div className="text-slate-300">
            <span className="text-slate-400">Bateador:</span>{" "}
            <span className="font-semibold text-slate-100">{hoveredBall.batterName}</span>
          </div>

          <div className="text-slate-300">
            <span className="text-slate-400">Distancia:</span>{" "}
            <span className="font-mono font-bold text-[#FDB827]">{hoveredBall.distanceFt} ft</span>
          </div>

          <div className="text-slate-300">
            <span className="text-slate-400">Trayectoria:</span>{" "}
            <span className="font-semibold text-slate-200">{hoveredBall.trajectoryEs}</span>
          </div>

          <div className="text-slate-300">
            <span className="text-slate-400">Dureza BIS:</span>{" "}
            <span className="font-semibold text-slate-200">{hoveredBall.hardnessEs}</span>
          </div>

          <div className="text-slate-300">
            <span className="text-slate-400">Dirección:</span>{" "}
            <span className="font-semibold text-slate-200">{hoveredBall.direction}</span>
          </div>
        </div>
      )}
    </div>
  );
}
