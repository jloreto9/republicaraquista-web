"use client";

import React, { useState } from "react";
import { BattedBall } from "@/types/spray";
import {
  LVBP_STADIUMS,
  getStadiumsList,
  generateStadiumWallSvgPoints,
  evaluateWouldItDong,
} from "@/lib/stadiums-service";
import { EVENT_COLORS, TRAJECTORY_COLORS, HARDNESS_COLORS } from "@/lib/spray-engine";
import { WouldItDongCard } from "./would-it-dong-card";
import { DeepBallsDrawer } from "./deep-balls-drawer";
import { Building2, Sparkles, Filter, Info, ShieldCheck } from "lucide-react";

interface StadiumSimulatorViewProps {
  battedBalls: BattedBall[];
  colorMode: "event" | "trajectory" | "hardness";
  onColorModeChange?: (mode: "event" | "trajectory" | "hardness") => void;
}

export function StadiumSimulatorView({
  battedBalls,
  colorMode = "event",
  onColorModeChange,
}: StadiumSimulatorViewProps) {
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>("monumental");
  const [stadiumMode, setStadiumMode] = useState<"8-teams" | "9-stadiums">("8-teams");
  const [selectedBall, setSelectedBall] = useState<BattedBall | null>(null);
  const [hoveredBall, setHoveredBall] = useState<BattedBall | null>(null);
  const [filterDeepOnly, setFilterDeepOnly] = useState<boolean>(false);

  // Filtrar batazos para el diamante
  const displayedBalls = filterDeepOnly
    ? battedBalls.filter((b) => (b.distanceFt && b.distanceFt >= 300) || b.event === "Home Run")
    : battedBalls;

  const deepBallsCount = battedBalls.filter(
    (b) => (b.distanceFt && b.distanceFt >= 300) || b.event === "Home Run"
  ).length;

  // Si no hay batazo seleccionado, autoseleccionar el más profundo
  const activeBall =
    selectedBall ||
    battedBalls
      .filter((b) => (b.distanceFt && b.distanceFt >= 300) || b.event === "Home Run")
      .sort((a, b) => (b.distanceFt || 0) - (a.distanceFt || 0))[0] ||
    null;

  // Dimensiones SVG
  const svgWidth = 600;
  const svgHeight = 520;
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

  // 2. Líneas de foul
  const rFoulLeft = activeStadium.lf;
  const rFoulRight = activeStadium.rf;
  const foulLeftX = toSvgX(-rFoulLeft * Math.sin(Math.PI / 4));
  const foulLeftY = toSvgY(rFoulLeft * Math.cos(Math.PI / 4));
  const foulRightX = toSvgX(rFoulRight * Math.sin(Math.PI / 4));
  const foulRightY = toSvgY(rFoulRight * Math.cos(Math.PI / 4));

  // 3. Arcos de todos los estadios
  const allStadiumsList = getStadiumsList(stadiumMode);

  // 4. Arco de tierra del Infield
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

  const ballForTooltip = hoveredBall || activeBall;
  const isDeep =
    ballForTooltip && ((ballForTooltip.distanceFt || 0) >= 300 || ballForTooltip.event === "Home Run");
  const dongInfo = isDeep ? evaluateWouldItDong(ballForTooltip, stadiumMode) : null;

  return (
    <div className="p-5 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-6">
      {/* ── Barra Superior de Controles del Emulador ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1E2B4D]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Emulador de Estadios & Simulador de Jonrones
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FDB827]/10 text-[#FDB827] border border-[#FDB827]/20 font-mono font-bold">
              Would It Dong?
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Compara la barda real de cada estadio de la LVBP contra las conexiones del bateador para
            descubrir jonrones y casi-jonrones.
          </p>
        </div>

        {/* Controles de Barda y Modo */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Barda */}
          <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
            <span className="text-[11px] text-slate-400 font-medium">Barda de Estadio:</span>
            <select
              value={selectedStadiumId}
              onChange={(e) => setSelectedStadiumId(e.target.value)}
              className="bg-transparent text-[#FDB827] text-xs font-semibold focus:outline-none cursor-pointer max-w-[210px] truncate"
            >
              <option value="monumental" className="bg-[#070B19] text-slate-200">
                Monumental Simón Bolívar (Caracas)
              </option>
              <option value="universitario" className="bg-[#070B19] text-slate-200">
                Universitario (Caracas UCV)
              </option>
              <option value="valencia" className="bg-[#070B19] text-slate-200">
                José Bernardo Pérez (Valencia)
              </option>
              <option value="barquisimeto" className="bg-[#070B19] text-slate-200">
                Antonio Herrera Gutiérrez (Lara)
              </option>
              <option value="maracay" className="bg-[#070B19] text-slate-200">
                José Pérez Colmenares (Aragua)
              </option>
              <option value="maracaibo" className="bg-[#070B19] text-slate-200">
                Luis Aparicio 'El Grande' (Zulia)
              </option>
              <option value="plc" className="bg-[#070B19] text-slate-200">
                Alfonso 'Chico' Carrasquel (Caribes)
              </option>
              <option value="macuto" className="bg-[#070B19] text-slate-200">
                Forum La Guaira (Macuto)
              </option>
              <option value="margarita" className="bg-[#070B19] text-slate-200">
                Nueva Esparta (Guatamare)
              </option>
              <option value="all" className="bg-[#070B19] text-[#FDB827]">
                ✨ Comparar Todos los Estadios LVBP
              </option>
            </select>
          </div>

          {/* Filtro: Solo Batazos Profundos */}
          <button
            onClick={() => setFilterDeepOnly(!filterDeepOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              filterDeepOnly
                ? "bg-[#FDB827] text-[#070B19] border-[#FDB827]"
                : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:border-slate-500"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Solo Profundos ≥300 ft ({deepBallsCount})</span>
          </button>
        </div>
      </div>

      {/* ── Tarjeta Interactiva del Batazo Seleccionado ── */}
      {activeBall ? (
        <WouldItDongCard ball={activeBall} />
      ) : (
        <div className="p-4 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-xs text-slate-400 text-center flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span>No hay batazos profundos registrados para este bateador en la temporada seleccionada.</span>
        </div>
      )}

      {/* ── Diamante SVG con la Barda Real del Estadio ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>Diamante de Emulación</span>
            <span className="text-slate-500">•</span>
            <span className="text-[#FDB827] font-bold">
              {isAllStadiums ? "Superposición de Todos los Parques" : activeStadium.name}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Haz clic en cualquier punto para enfocar el batazo en el simulador
          </span>
        </div>

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
                  const pathD = pts
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(" ");
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

              {/* Bases */}
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
              {displayedBalls.map((ball, idx) => {
                const bx = toSvgX(ball.xFt);
                const by = toSvgY(ball.yFt);
                const isHovered = hoveredBall === ball;
                const isSelected = activeBall === ball;
                const ballColor = getColor(ball);
                const isHomeRun = ball.event === "Home Run";

                return (
                  <g key={idx} className="cursor-pointer" onClick={() => setSelectedBall(ball)}>
                    {/* Anillo de enfoque cuando el batazo está seleccionado */}
                    {isSelected && (
                      <circle
                        cx={bx}
                        cy={by}
                        r="10"
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
                        r="8.5"
                        fill="none"
                        stroke="#FDB827"
                        strokeWidth="2.5"
                      />
                    )}

                    <circle
                      cx={bx}
                      cy={by}
                      r={isHovered ? 6 : isHomeRun ? 5 : 3.5}
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
              onClick={() => setSelectedBall(ballForTooltip)}
              className={`mt-3 p-3.5 rounded-xl bg-[#070B19] border transition-all cursor-pointer shadow-xl text-xs flex flex-wrap items-center justify-between gap-4 max-w-[620px] w-full ${
                activeBall === ballForTooltip
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

              {/* Badge de Would It Dong */}
              {dongInfo && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border ${dongInfo.classificationBadgeColor}`}
                  >
                    {dongInfo.hrParksCount}/{dongInfo.totalParks} Parques
                  </span>
                  <span className="text-[10px] text-[#FDB827] flex items-center gap-1 font-semibold">
                    <Sparkles className="w-3 h-3" /> Enfocado
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Lista de Batazos Profundos del Bateador ── */}
      <div className="pt-2">
        <DeepBallsDrawer
          battedBalls={battedBalls}
          selectedBall={activeBall}
          onSelectBall={(ball) => setSelectedBall(ball)}
        />
      </div>

      {/* ── Nota Metodológica de Simulación de Parques ── */}
      <div className="p-4 rounded-xl bg-[#070B19]/70 border border-[#1E2B4D] text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Física y Geometría de Emulación Radial</span>
        </div>
        <p>
          El simulador <strong>Would It Dong?</strong> calcula para cada ángulo exacto $\theta \in [-45^\circ, +45^\circ]$ la distancia radial continua $R_S(\theta)$ hacia la barda de cada estadio de la LVBP. Un batazo clasifica como Home Run en el parque $S$ si supera el perímetro fair de dicho parque según su trayectoria y distancia euclidiana en pies.
        </p>
      </div>
    </div>
  );
}
