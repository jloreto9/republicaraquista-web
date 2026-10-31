"use client";

import { PitchGameDataResponse, PitchingSplitRow } from "@/types/pitching";
import { Zap, Target, Crosshair, BarChart3, Layers } from "lucide-react";

interface StatcastPanelProps {
  data: PitchGameDataResponse;
  pitcherName: string;
}

function formatSigned(val: number | undefined | null, digits = 2): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return "—";
  return val >= 0 ? `+${val.toFixed(digits)}` : val.toFixed(digits);
}

function StatcastSplitsTable({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: PitchingSplitRow[];
}) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#FDB827]" />
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">{subtitle}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1E2B4D]/70 bg-[#070B19]">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-[#0F172A] text-slate-300 font-mono uppercase text-[10px] border-b border-[#1E2B4D]">
              <th className="py-2.5 px-3 text-left text-[#FDB827]">Situación</th>
              <th className="py-2.5 px-2">BF</th>
              <th className="py-2.5 px-2">H</th>
              <th className="py-2.5 px-2">HR</th>
              <th className="py-2.5 px-2">BB</th>
              <th className="py-2.5 px-2">SO</th>
              <th className="py-2.5 px-2">AVG</th>
              <th className="py-2.5 px-2">OPS</th>
              <th className="py-2.5 px-2">K%</th>
              <th className="py-2.5 px-2">BB%</th>
              <th className="py-2.5 px-2 text-[#FDB827]">CSW%</th>
              <th className="py-2.5 px-2 text-cyan-300">Whiff%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E2B4D]/50 font-mono text-slate-200">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-[#1E2B4D]/30 transition-colors">
                <td className="py-2 px-3 text-left font-sans font-semibold text-slate-100 whitespace-nowrap">
                  {r.label}
                </td>
                <td className="py-2 px-2 font-bold text-slate-300">{r.bf}</td>
                <td className="py-2 px-2">{r.h}</td>
                <td className="py-2 px-2">{r.hr}</td>
                <td className="py-2 px-2">{r.bb}</td>
                <td className="py-2 px-2 text-emerald-400 font-bold">{r.so}</td>
                <td className="py-2 px-2">{r.avg}</td>
                <td className="py-2 px-2 font-bold">{r.ops}</td>
                <td className="py-2 px-2">{r.bf > 0 ? `${r.kPct.toFixed(1)}%` : "—"}</td>
                <td className="py-2 px-2">{r.bf > 0 ? `${r.bbPct.toFixed(1)}%` : "—"}</td>
                <td className="py-2 px-2 text-[#FDB827] font-bold">
                  {r.pitches && r.pitches > 0 ? `${r.cswPct.toFixed(1)}%` : "—"}
                </td>
                <td className="py-2 px-2 text-cyan-300 font-bold">
                  {r.pitches && r.pitches > 0 ? `${r.whiffPct.toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StatcastPanel({ data }: StatcastPanelProps) {
  const {
    statcastTable,
    pitches,
    boxscore,
    pbpKpis,
    contextMetrics,
    contactProfile,
    situationalSplits,
    ttoSplits,
  } = data;

  const isSeason = data.timeMode === "season";
  const maxVelo = Math.max(...pitches.map((p) => p.speed || 0), 0);
  const maxSpin = Math.max(...pitches.map((p) => p.spin || 0), 0);
  const activeTtoRows = (ttoSplits || []).filter((r) => r.bf > 0);

  return (
    <div className="w-full space-y-6">
      {/* 1. Resumen Óptico y de Impacto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">IP</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {boxscore.ip}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Pitcheos</span>
          <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
            {data.totalPitches}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">
            {isSeason ? "ERA / FIP" : data.isStarter ? "GSv2" : "IR / IRS"}
          </span>
          <div className="text-sm sm:text-base font-black text-cyan-300 font-mono mt-1">
            {isSeason
              ? `${boxscore.era || "0.00"} / ${boxscore.fip || "—"}`
              : data.isStarter
              ? `${contextMetrics?.gsv2 ?? boxscore.gsv2 ?? "—"}${
                  contextMetrics?.isQS ? " ★QS" : ""
                }`
              : `${contextMetrics?.ir ?? 0} / ${contextMetrics?.irs ?? 0}`}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#FDB827]/30 rounded-xl p-3 text-center">
          <span className="text-[10px] text-[#FDB827] font-mono font-bold uppercase">CSW%</span>
          <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
            {boxscore.cswPct}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-cyan-500/30 rounded-xl p-3 text-center">
          <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase">Whiff%</span>
          <div className="text-base sm:text-lg font-black text-cyan-300 font-mono mt-0.5">
            {boxscore.whiffPct}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Chase / Z-Con</span>
          <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-1">
            {pbpKpis.chasePct || "—"} / {pbpKpis.zContactPct || "—"}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">WPA / RE24</span>
          <div className="text-xs sm:text-sm font-black text-slate-100 font-mono mt-1">
            {formatSigned(contextMetrics?.wpa)} / {formatSigned(contextMetrics?.re24, 1)}
          </div>
        </div>
        <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
          <span className="text-[10px] text-slate-400 font-mono uppercase">Velo / Spin Máx</span>
          <div className="text-xs sm:text-sm font-black text-purple-300 font-mono mt-1">
            {maxVelo ? `${maxVelo.toFixed(1)}` : "—"} / {maxSpin || "—"}
          </div>
        </div>
      </div>

      {/* 2. Tabla de Repertorio y Movimiento (Hawk-Eye / Statcast) */}
      <div className="bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FDB827]" />
            <h3 className="text-sm font-bold text-slate-100">
              Tabla de Repertorio, Movimiento y Disciplina (Hawk-Eye / Statcast)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            PutAway%: {boxscore.putAwayPct || pbpKpis.putAwayPct || "—"} • Estilo Thomas Nestico (@TJStats)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E2B4D] text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Lanzamiento</th>
                <th className="py-2.5 px-2 text-center">#</th>
                <th className="py-2.5 px-2 text-center">Uso%</th>
                <th className="py-2.5 px-2 text-center">Velo</th>
                <th className="py-2.5 px-2 text-center">Máx</th>
                <th className="py-2.5 px-2 text-center">Spin</th>
                <th className="py-2.5 px-2 text-center">iVB (in)</th>
                <th className="py-2.5 px-2 text-center">HB (in)</th>
                <th className="py-2.5 px-2 text-center">Ext (ft)</th>
                <th className="py-2.5 px-2 text-center">Zone%</th>
                <th className="py-2.5 px-2 text-center">Chase%</th>
                <th className="py-2.5 px-2 text-center">Z-Con%</th>
                <th className="py-2.5 px-2 text-center">Whiff%</th>
                <th className="py-2.5 px-2 text-center">CSW%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2B4D]/50 font-mono">
              {statcastTable.map((row) => (
                <tr key={row.pitchName} className="hover:bg-[#1E2B4D]/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-slate-200 flex items-center gap-2 whitespace-nowrap">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.pitchName}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-100">
                    {row.count}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[#FDB827] font-bold">
                    {row.usagePct}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-200">{row.veloAvg}</td>
                  <td className="py-2.5 px-2 text-center text-slate-400">{row.veloMax}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{row.spinAvg}</td>
                  <td className="py-2.5 px-2 text-center text-cyan-400 font-bold">{row.ivb}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{row.hb}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">
                    {row.extAvg ?? "—"}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{row.zonePct}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-300">
                    {row.chasePct || "—"}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">
                    {row.zContactPct || "—"}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[#FDB827] font-bold">
                    {row.whiffPct}
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-100 font-bold">
                    {row.cswPct}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Barra de Calidad de Contacto Óptico (Hawk-Eye) */}
        {contactProfile && contactProfile.bip > 0 && (
          <div className="pt-3 border-t border-[#1E2B4D]/80 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center font-mono">
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">BIP</span>
              <span className="text-xs sm:text-sm font-black text-slate-100">
                {contactProfile.bip}
              </span>
            </div>
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">EV Prom</span>
              <span className="text-xs sm:text-sm font-black text-cyan-300">
                {contactProfile.avgEv !== null && contactProfile.avgEv !== undefined
                  ? `${contactProfile.avgEv.toFixed(1)} mph`
                  : "—"}
              </span>
            </div>
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">EV Máx</span>
              <span className="text-xs sm:text-sm font-black text-slate-200">
                {contactProfile.maxEv !== null && contactProfile.maxEv !== undefined
                  ? `${contactProfile.maxEv.toFixed(1)} mph`
                  : "—"}
              </span>
            </div>
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">HardHit% (≥95)</span>
              <span className="text-xs sm:text-sm font-black text-amber-300">
                {contactProfile.hardHitPct !== null && contactProfile.hardHitPct !== undefined
                  ? `${contactProfile.hardHitPct.toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">Barrel%</span>
              <span className="text-xs sm:text-sm font-black text-rose-400">
                {contactProfile.barrelPct !== null && contactProfile.barrelPct !== undefined
                  ? `${contactProfile.barrelPct.toFixed(1)}%`
                  : "—"}
              </span>
            </div>
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">GB%</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400">
                {contactProfile.gbPct.toFixed(1)}%
              </span>
            </div>
            <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">GO / AO</span>
              <span className="text-xs sm:text-sm font-black text-slate-200">
                {contactProfile.goAoRatio}
              </span>
            </div>
          </div>
        )}
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
                <line x1="-25" y1="0" x2="25" y2="0" stroke="#1E2B4D" strokeWidth="0.8" />
                <line x1="0" y1="-25" x2="0" y2="25" stroke="#1E2B4D" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="10" fill="none" stroke="#1E2B4D" strokeDasharray="1 1" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="20" fill="none" stroke="#1E2B4D" strokeDasharray="1 1" strokeWidth="0.5" />

                <text x="23" y="-1" fill="#64748B" fontSize="2.2" textAnchor="end" fontFamily="monospace">Arm</text>
                <text x="-23" y="-1" fill="#64748B" fontSize="2.2" textAnchor="start" fontFamily="monospace">Glove</text>
                <text x="1" y="-22" fill="#64748B" fontSize="2.2" fontFamily="monospace">+iVB</text>
                <text x="1" y="23" fill="#64748B" fontSize="2.2" fontFamily="monospace">-iVB</text>

                {pitches.map((p, i) => {
                  if (p.hb === null || p.ivb === null) return null;
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
                <polygon
                  points="-0.7,0.1 0.7,0.1 0.7,0.3 0,0.5 -0.7,0.3"
                  fill="#1E2B4D"
                  opacity="0.8"
                />
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
                <line x1="-0.28" y1="0.7" x2="-0.28" y2="2.9" stroke="#1E2B4D" strokeWidth="0.03" />
                <line x1="0.28" y1="0.7" x2="0.28" y2="2.9" stroke="#1E2B4D" strokeWidth="0.03" />
                <line x1="-0.85" y1="1.43" x2="0.85" y2="1.43" stroke="#1E2B4D" strokeWidth="0.03" />
                <line x1="-0.85" y1="2.17" x2="0.85" y2="2.17" stroke="#1E2B4D" strokeWidth="0.03" />

                {pitches.map((p, i) => {
                  if (p.plateX === null || p.plateZ === null) return null;
                  const x = p.plateX;
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

      {/* 4. Splits Situacionales + Vueltas al Orden (TTO) */}
      {(situationalSplits?.length || activeTtoRows.length) ? (
        <div
          className={`grid grid-cols-1 ${
            activeTtoRows.length > 0 ? "xl:grid-cols-12" : ""
          } gap-5`}
        >
          {situationalSplits && situationalSplits.length > 0 && (
            <div className={activeTtoRows.length > 0 ? "xl:col-span-7" : ""}>
              <StatcastSplitsTable
                title={
                  isSeason
                    ? "Splits Situacionales Acumulados (MLB)"
                    : "Splits Situacionales del Partido (MLB)"
                }
                subtitle="Platoon, Corredores en Posición Anotadora y Condición"
                rows={situationalSplits}
              />
            </div>
          )}

          {activeTtoRows.length > 0 && (
            <div className={situationalSplits?.length ? "xl:col-span-5" : ""}>
              <StatcastSplitsTable
                title="Rendimiento por Vuelta al Orden (TTO)"
                subtitle="1ra vs 2da vs 3ra+ Exposición a la Alineación"
                rows={activeTtoRows}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
