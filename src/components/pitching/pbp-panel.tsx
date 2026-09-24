"use client";

import { PitchGameDataResponse } from "@/types/pitching";
import { Shield, Activity, BarChart2, Users2 } from "lucide-react";

interface PBPPanelProps {
  data: PitchGameDataResponse;
  pitcherName: string;
}

export function PBPPanel({ data, pitcherName }: PBPPanelProps) {
  const { boxscore, pbpTable, pbpKpis, inningsWorkload, splitsPlatoon } = data;

  const maxInningPitches = Math.max(
    ...inningsWorkload.map((w) => w.pitches),
    25
  );

  return (
    <div className="w-full space-y-6">
      {/* 1. Boxscore KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Entradas</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {boxscore.ip}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Hits</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {boxscore.h}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Carreras</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {boxscore.r}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Limpias (ER)</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {boxscore.er}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Boletos</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {boxscore.bb}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Ponches (K)</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {boxscore.so}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Pitcheos</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {boxscore.pitches}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Strikes</span>
          <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
            {boxscore.strikes}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#FDB827]/30 rounded-xl p-3 text-center shadow-[0_0_12px_rgba(253,184,39,0.1)]">
          <span className="text-[10px] text-[#FDB827] font-mono font-bold uppercase">CSW%</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {boxscore.cswPct}
          </div>
        </div>

        <div className="bg-[#0D152B] border border-[#FDB827]/30 rounded-xl p-3 text-center shadow-[0_0_12px_rgba(253,184,39,0.1)]">
          <span className="text-[10px] text-[#FDB827] font-mono font-bold uppercase">WHIFF%</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {boxscore.whiffPct}
          </div>
        </div>
      </div>

      {/* 2. Middle Row: Sabermetric Table of Pitch Destinations */}
      <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-sm font-bold text-slate-100">
              Desglose Sabermétrico de Destinos de Pitcheos (PBP)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {pbpKpis.totalPitches} lanzamientos totales • Strike%: {pbpKpis.strikePct} • 1stS%: {pbpKpis.fpsPct}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Destino del Pitcheo</th>
                <th className="py-2.5 px-3 text-center">Conteo</th>
                <th className="py-2.5 px-3 text-center">% de Uso Total</th>
                <th className="py-2.5 px-3">Distribución Visual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
              {pbpTable.map((row) => (
                <tr key={row.destination} className="hover:bg-[#1E2B4D]/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.destination}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-100">
                    {row.count}
                  </td>
                  <td className="py-2.5 px-3 text-center text-[#FDB827] font-bold">
                    {row.pct}
                  </td>
                  <td className="py-2.5 px-3 w-1/3">
                    <div className="w-full bg-[#070B19] h-2.5 rounded-full overflow-hidden border border-[#1E2B4D]/60">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: row.pct,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Triple Visual Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Panel A: Inning Workload (Stacked Bars) */}
        <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-[#FDB827]" />
                Carga de Trabajo por Entrada
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Strikes vs Bolas</span>
            </div>

            {inningsWorkload.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500">
                Sin datos de entradas
              </div>
            ) : (
              <div className="h-44 flex items-end justify-around gap-2 pt-4 px-2 border-b border-[#1E2B4D]">
                {inningsWorkload.map((inn) => {
                  const strikeH = (inn.strikes / maxInningPitches) * 120;
                  const ballH = (inn.balls / maxInningPitches) * 120;

                  return (
                    <div key={inn.inning} className="flex-1 flex flex-col items-center gap-1 group">
                      <span className="text-[10px] font-mono text-[#FDB827] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {inn.pitches}P
                      </span>
                      <div className="w-full max-w-[28px] flex flex-col items-center rounded-t-md overflow-hidden bg-[#070B19]">
                        {/* Balls on top */}
                        <div
                          className="w-full bg-[#3B82F6] transition-all"
                          style={{ height: `${ballH}px` }}
                          title={`Inning ${inn.inning}: ${inn.balls} Bolas`}
                        />
                        {/* Strikes at base */}
                        <div
                          className="w-full bg-[#10B981] transition-all"
                          style={{ height: `${strikeH}px` }}
                          title={`Inning ${inn.inning}: ${inn.strikes} Strikes`}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-300 font-bold mt-1">
                        Inn {inn.inning}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-slate-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
              <span>Strikes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" />
              <span>Bolas</span>
            </div>
          </div>
        </div>

        {/* Panel B: Leverage Index por Entrada */}
        <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-[#FDB827]" />
                Presión / Leverage Index (LI)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Cota Neutral 1.0</span>
            </div>

            {inningsWorkload.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500">
                Sin datos de apalancamiento
              </div>
            ) : (
              <div className="h-44 relative flex items-center justify-center border-b border-[#1E2B4D] px-2">
                {/* SVG Line Chart */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 120" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#FDB827" strokeDasharray="3 3" strokeOpacity="0.4" strokeWidth="1" />
                  <text x="2" y="56" fill="#FDB827" fontSize="8" fontFamily="monospace">1.0 LI (Neutral)</text>

                  {/* Polyline */}
                  {(() => {
                    const step = 200 / (inningsWorkload.length + 1);
                    const points = inningsWorkload
                      .map((w, i) => {
                        const x = (i + 1) * step;
                        // Map 0 to 3.0 LI to y (110 to 10)
                        const clampedLi = Math.min(Math.max(w.avgLi, 0), 3.0);
                        const y = 110 - (clampedLi / 3.0) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ");

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#FDB827"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                        {inningsWorkload.map((w, i) => {
                          const x = (i + 1) * step;
                          const clampedLi = Math.min(Math.max(w.avgLi, 0), 3.0);
                          const y = 110 - (clampedLi / 3.0) * 100;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r="4" fill="#0D152B" stroke="#FDB827" strokeWidth="2" />
                              <text x={x} y={y - 8} fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                                {w.avgLi.toFixed(2)}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-3 px-1">
            <span>Baja Presión (&lt; 0.85)</span>
            <span className="text-[#FDB827]">Alta Presión (&gt; 1.50)</span>
          </div>
        </div>

        {/* Panel C: Platoon Splits (vs LHB / vs RHB) */}
        <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Users2 className="w-3.5 h-3.5 text-[#FDB827]" />
                Splits por Mano de Bateador
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">LHB vs RHB</span>
            </div>

            <div className="h-44 flex flex-col justify-around py-1">
              {/* vs Zurdos (LHB) */}
              <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">
                    vs Bateadores Zurdos (LHB)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    N={splitsPlatoon.vsLhb.pitches} lanzamientos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-[#0D152B] p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block">Strike%</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {splitsPlatoon.vsLhb.strikePct}
                    </span>
                  </div>
                  <div className="bg-[#0D152B] p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block">Whiff%</span>
                    <span className="text-xs font-bold text-[#FDB827]">
                      {splitsPlatoon.vsLhb.whiffPct}
                    </span>
                  </div>
                  <div className="bg-[#0D152B] p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block">CSW%</span>
                    <span className="text-xs font-bold text-cyan-400">
                      {splitsPlatoon.vsLhb.cswPct}
                    </span>
                  </div>
                </div>
              </div>

              {/* vs Derechos (RHB) */}
              <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">
                    vs Bateadores Derechos (RHB)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    N={splitsPlatoon.vsRhb.pitches} lanzamientos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-[#0D152B] p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block">Strike%</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {splitsPlatoon.vsRhb.strikePct}
                    </span>
                  </div>
                  <div className="bg-[#0D152B] p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block">Whiff%</span>
                    <span className="text-xs font-bold text-[#FDB827]">
                      {splitsPlatoon.vsRhb.whiffPct}
                    </span>
                  </div>
                  <div className="bg-[#0D152B] p-1.5 rounded">
                    <span className="text-[9px] text-slate-400 block">CSW%</span>
                    <span className="text-xs font-bold text-cyan-400">
                      {splitsPlatoon.vsRhb.cswPct}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-center text-slate-500 font-mono mt-2">
            Métricas de disciplina y contacto por split
          </div>
        </div>
      </div>
    </div>
  );
}
