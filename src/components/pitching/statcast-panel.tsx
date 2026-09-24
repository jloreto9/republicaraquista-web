"use client";

import { PitchGameDataResponse } from "@/types/pitching";
import { Zap, Target, Crosshair, BarChart3 } from "lucide-react";

interface StatcastPanelProps {
  data: PitchGameDataResponse;
  pitcherName: string;
}

export function StatcastPanel({ data, pitcherName }: StatcastPanelProps) {
  const { statcastTable, pitches, boxscore } = data;

  return (
    <div className="w-full space-y-6">
      {/* 1. Statcast Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Pitcheos Totales</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {data.totalPitches}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Repertorio</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {statcastTable.length} Tipos
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">
            {data.timeMode === "season" ? "ERA Acumulada" : "CSW% Global"}
          </span>
          <div className="text-base sm:text-lg font-black text-cyan-400 font-mono mt-0.5">
            {data.timeMode === "season" ? boxscore.era || "0.00" : boxscore.cswPct}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">
            {data.timeMode === "season" ? "WHIP Acumulado" : "Whiff% Global"}
          </span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {data.timeMode === "season" ? boxscore.whip || "0.00" : boxscore.whiffPct}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Velo Máxima</span>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
            {Math.max(...pitches.map((p) => p.speed || 0), 0) || "—"} mph
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Spin Máximo</span>
          <div className="text-base sm:text-lg font-black text-purple-400 font-mono mt-0.5">
            {Math.max(...pitches.map((p) => p.spin || 0), 0) || "—"} rpm
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Sabermetric Repertory Table (Thomas Nestico Style) */}
      <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-sm font-bold text-slate-100">
              Tabla Sabermétrica de Repertorio (Hawk-Eye / Statcast)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Estilo Thomas Nestico (@TJStats)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Lanzamiento</th>
                <th className="py-2.5 px-3 text-center">Conteo</th>
                <th className="py-2.5 px-3 text-center">Uso %</th>
                <th className="py-2.5 px-3 text-center">Velo Avg</th>
                <th className="py-2.5 px-3 text-center">Velo Max</th>
                <th className="py-2.5 px-3 text-center">Spin (rpm)</th>
                <th className="py-2.5 px-3 text-center">iVB (in)</th>
                <th className="py-2.5 px-3 text-center">HB (in)</th>
                <th className="py-2.5 px-3 text-center">Whiff%</th>
                <th className="py-2.5 px-3 text-center">CSW%</th>
                <th className="py-2.5 px-3 text-center">Zone%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
              {statcastTable.map((row) => (
                <tr key={row.pitchName} className="hover:bg-[#1E2B4D]/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.pitchName}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-100">
                    {row.count}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#FDB827] font-bold">
                    {row.usagePct}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-200">
                    {row.veloAvg}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400">
                    {row.veloMax}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {row.spinAvg}
                  </td>
                  <td className="py-2.5 px-3 text-center text-cyan-400 font-bold">
                    {row.ivb}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                    {row.hb}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#FDB827] font-bold">
                    {row.whiffPct}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-200">
                    {row.cswPct}
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {row.zonePct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Triple Visual Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Panel A: Pitch Movement Chart (iVB vs HB) */}
        <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Crosshair className="w-3.5 h-3.5 text-[#FDB827]" />
                Movimiento (iVB vs HB)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Pulgadas (±25 in)</span>
            </div>

            <div className="h-60 relative flex items-center justify-center border border-[#1E2B4D] rounded-xl bg-[#070B19] overflow-hidden p-2">
              <svg className="w-full h-full" viewBox="-25 -25 50 50">
                {/* Axes */}
                <line x1="-25" y1="0" x2="25" y2="0" stroke="#1E2B4D" strokeWidth="0.8" />
                <line x1="0" y1="-25" x2="0" y2="25" stroke="#1E2B4D" strokeWidth="0.8" />
                {/* Reference circles */}
                <circle cx="0" cy="0" r="10" fill="none" stroke="#1E2B4D" strokeDasharray="1 1" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="20" fill="none" stroke="#1E2B4D" strokeDasharray="1 1" strokeWidth="0.5" />

                {/* Axis Labels */}
                <text x="23" y="-1" fill="#64748B" fontSize="2.2" textAnchor="end" fontFamily="monospace">Arm</text>
                <text x="-23" y="-1" fill="#64748B" fontSize="2.2" textAnchor="start" fontFamily="monospace">Glove</text>
                <text x="1" y="-22" fill="#64748B" fontSize="2.2" fontFamily="monospace">+iVB</text>
                <text x="1" y="23" fill="#64748B" fontSize="2.2" fontFamily="monospace">-iVB</text>

                {/* Pitches Scatter */}
                {pitches.map((p, i) => {
                  if (p.hb === null || p.ivb === null) return null;
                  // Invert y because SVG y goes down
                  const color = statcastTable.find((s) => s.pitchName === p.pitchName)?.color || "#FDB827";
                  return (
                    <circle
                      key={i}
                      cx={p.hb}
                      cy={-p.ivb}
                      r="1.2"
                      fill={color}
                      stroke="#070B19"
                      strokeWidth="0.3"
                      opacity="0.85"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[10px] text-slate-300 font-mono">
            {statcastTable.slice(0, 4).map((s) => (
              <div key={s.pitchName} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span>{s.pitchName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel B: Strike Zone Scatter */}
        <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[#FDB827]" />
                Ubicación en Zona de Strike
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Vista del Receptor</span>
            </div>

            <div className="h-60 relative flex items-center justify-center border border-[#1E2B4D] rounded-xl bg-[#070B19] overflow-hidden p-2">
              <svg className="w-full h-full" viewBox="-2 -0.5 4 4.5">
                {/* Home Plate */}
                <polygon
                  points="-0.7,0.1 0.7,0.1 0.7,0.3 0,0.5 -0.7,0.3"
                  fill="#1E2B4D"
                  opacity="0.8"
                />

                {/* Strike Zone Box: X from -0.85 to 0.85, Y from 1.5 to 3.5 (invert Y in SVG) */}
                {/* SVG origin at top-left: let's map Y: 0 is ground (rendered at y=4.0) and 4.0 is at y=0 */}
                <rect
                  x="-0.85"
                  y="0.7"
                  width="1.7"
                  height="2.2"
                  fill="rgba(253, 184, 39, 0.05)"
                  stroke="#FDB827"
                  strokeWidth="0.05"
                  strokeDasharray="0.1 0.1"
                />
                {/* 3x3 Grid */}
                <line x1="-0.28" y1="0.7" x2="-0.28" y2="2.9" stroke="#1E2B4D" strokeWidth="0.03" />
                <line x1="0.28" y1="0.7" x2="0.28" y2="2.9" stroke="#1E2B4D" strokeWidth="0.03" />
                <line x1="-0.85" y1="1.43" x2="0.85" y2="1.43" stroke="#1E2B4D" strokeWidth="0.03" />
                <line x1="-0.85" y1="2.17" x2="0.85" y2="2.17" stroke="#1E2B4D" strokeWidth="0.03" />

                {/* Pitches */}
                {pitches.map((p, i) => {
                  if (p.plateX === null || p.plateZ === null) return null;
                  const x = p.plateX;
                  // Invert Z: 4ft -> 0.2, 0ft -> 4.2
                  const y = 4.2 - p.plateZ;
                  const color = statcastTable.find((s) => s.pitchName === p.pitchName)?.color || "#FDB827";

                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="0.1"
                      fill={color}
                      stroke="#070B19"
                      strokeWidth="0.02"
                      opacity="0.9"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-3 px-1">
            <span>Zona Reglamentaria (17 pulg)</span>
            <span className="text-[#FDB827]">Vista Catcher</span>
          </div>
        </div>

        {/* Panel C: Pitch Velocity Distribution */}
        <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-[#FDB827]" />
                Velocidad & Uso de Repertorio
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">mph promedio</span>
            </div>

            <div className="h-60 flex flex-col justify-around py-1">
              {statcastTable.slice(0, 5).map((row) => (
                <div key={row.pitchName} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                      {row.pitchName}
                    </span>
                    <span className="text-slate-400">
                      {row.veloAvg !== "—" ? `${row.veloAvg} mph` : ""} • <strong className="text-[#FDB827]">{row.usagePct}</strong>
                    </span>
                  </div>
                  <div className="w-full bg-[#070B19] h-2.5 rounded-full overflow-hidden border border-[#1E2B4D]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: row.usagePct,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-500 font-mono mt-2">
            Métricas de velocidad y porcentaje de repertorio
          </div>
        </div>
      </div>
    </div>
  );
}
