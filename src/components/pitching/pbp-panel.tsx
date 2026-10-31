"use client";

import { PitchGameDataResponse, PitchingSplitRow } from "@/types/pitching";
import { Shield, Activity, BarChart2, Users2, Crosshair, Layers } from "lucide-react";

interface PBPPanelProps {
  data: PitchGameDataResponse;
  pitcherName: string;
}

function formatSigned(val: number | undefined | null, digits = 2): string {
  if (val === undefined || val === null || !Number.isFinite(val)) return "—";
  return val >= 0 ? `+${val.toFixed(digits)}` : val.toFixed(digits);
}

function SplitsTableCard({
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
              <th className="py-2.5 px-2">F-Str%</th>
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
                <td
                  className={`py-2 px-2 font-bold ${
                    Number(r.ops) <= 0.65 && r.bf > 0
                      ? "text-emerald-400"
                      : Number(r.ops) >= 0.85 && r.bf > 0
                      ? "text-rose-400"
                      : "text-slate-200"
                  }`}
                >
                  {r.ops}
                </td>
                <td className="py-2 px-2">{r.bf > 0 ? `${r.kPct.toFixed(1)}%` : "—"}</td>
                <td className="py-2 px-2">{r.bf > 0 ? `${r.bbPct.toFixed(1)}%` : "—"}</td>
                <td className="py-2 px-2">
                  {r.bf > 0 ? `${r.fStrikePct.toFixed(1)}%` : "—"}
                </td>
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

export function PBPPanel({ data }: PBPPanelProps) {
  const {
    boxscore,
    contextMetrics,
    contactProfile,
    situationalSplits,
    ttoSplits,
    pbpTable,
    pbpKpis,
    inningsWorkload,
    splitsPlatoon,
  } = data;

  const isSeason = data.timeMode === "season";
  const isStarter = data.isStarter;

  const maxInningPitches = Math.max(
    ...inningsWorkload.map((w) => w.pitches),
    25
  );

  const soBbRatio =
    boxscore.bb > 0
      ? (boxscore.so / boxscore.bb).toFixed(2)
      : boxscore.so > 0
      ? `${boxscore.so}.00`
      : "0.00";

  const recordText = `${boxscore.wins ?? 0}-${boxscore.losses ?? 0}${
    (boxscore.saves ?? 0) > 0 ? ` (${boxscore.saves} SV)` : ""
  }`;

  const activeTtoRows = (ttoSplits || []).filter((r) => r.bf > 0);

  return (
    <div className="w-full space-y-6">
      {/* 1A. Fila Superior de KPIs Clásicos y Eficiencia */}
      {isSeason ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">JJ (GS)</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.gamesPlayed ?? data.gamesCount ?? 0} ({boxscore.gamesStarted ?? 0})
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Récord</span>
              <div className="text-sm sm:text-base font-black text-slate-100 font-mono mt-1">
                {recordText}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">IP</span>
              <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
                {boxscore.ip}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">TBF</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.bf ?? "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#FDB827]/30 rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#FDB827] font-mono font-bold uppercase">ERA</span>
              <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
                {boxscore.era || "0.00"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">WHIP</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.whip || "0.00"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-cyan-500/30 rounded-xl p-3 text-center">
              <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase">FIP</span>
              <div className="text-base sm:text-lg font-black text-cyan-300 font-mono mt-0.5">
                {boxscore.fip || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-emerald-500/30 rounded-xl p-3 text-center">
              <span className="text-[10px] text-emerald-300 font-mono font-bold uppercase">ERA-</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                {boxscore.eraMinus ?? "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">SO / BB</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {soBbRatio}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">HR</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.hr ?? 0}
              </div>
            </div>
          </div>

          {/* 1B. Fila Inferior de Tasas, Comando PBP y Valor Acumulado */}
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">K%</span>
              <div className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5">
                {boxscore.kPct || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">BB%</span>
              <div className="text-sm sm:text-base font-black text-slate-200 font-mono mt-0.5">
                {boxscore.bbPct || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-emerald-500/30 rounded-xl p-3 text-center">
              <span className="text-[10px] text-emerald-300 font-mono font-bold uppercase">K-BB%</span>
              <div className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-0.5">
                {boxscore.kMinusBbPct || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">BABIP</span>
              <div className="text-sm sm:text-base font-black text-slate-100 font-mono mt-0.5">
                {boxscore.babip || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">LOB%</span>
              <div className="text-sm sm:text-base font-black text-slate-100 font-mono mt-0.5">
                {boxscore.lobPct || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">BAA / OPS</span>
              <div className="text-xs sm:text-sm font-black text-slate-100 font-mono mt-1">
                {boxscore.baa || "—"} / {boxscore.opsAgainst || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">F-Strike%</span>
              <div className="text-sm sm:text-base font-black text-slate-100 font-mono mt-0.5">
                {boxscore.fStrikePct || pbpKpis.fpsPct}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#FDB827]/30 rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#FDB827] font-mono font-bold uppercase">CSW%</span>
              <div className="text-sm sm:text-base font-black text-[#FDB827] font-mono mt-0.5">
                {boxscore.cswPct}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-cyan-500/30 rounded-xl p-3 text-center">
              <span className="text-[10px] text-cyan-300 font-mono font-bold uppercase">Whiff%</span>
              <div className="text-sm sm:text-base font-black text-cyan-300 font-mono mt-0.5">
                {boxscore.whiffPct}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">WPA / RE24</span>
              <div className="text-xs sm:text-sm font-black text-emerald-400 font-mono mt-1">
                {formatSigned(contextMetrics?.wpa)} / {formatSigned(contextMetrics?.re24, 1)}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-2">
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">IP</span>
              <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
                {boxscore.ip}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">BF</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.bf ?? "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Hits</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.h}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">C / CL</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.r} / {boxscore.er}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">BB</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.bb}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Ponches (K)</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                {boxscore.so}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">HR</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.hr ?? 0}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">P (Strikes)</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.pitches} ({boxscore.strikes})
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Strike%</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                {boxscore.strikePct || pbpKpis.strikePct}
              </div>
            </div>
          </div>

          {/* 1B. Fila de Impacto Real de Partido y Comando PBP */}
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-9 gap-2">
            <div className="bg-[#0D152B] border border-[#FDB827]/40 rounded-xl p-3 text-center">
              <span className="text-[10px] text-[#FDB827] font-mono font-bold uppercase">
                {isStarter ? "GSv2" : "IR / IRS"}
              </span>
              <div className="text-base sm:text-lg font-black text-[#FDB827] font-mono mt-0.5">
                {isStarter
                  ? `${contextMetrics?.gsv2 ?? boxscore.gsv2 ?? "—"}${
                      contextMetrics?.isQS ? " ★QS" : ""
                    }`
                  : `${contextMetrics?.ir ?? 0} / ${contextMetrics?.irs ?? 0}`}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">WPA</span>
              <div
                className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                  (contextMetrics?.wpa ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatSigned(contextMetrics?.wpa)}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">RE24</span>
              <div
                className={`text-base sm:text-lg font-black font-mono mt-0.5 ${
                  (contextMetrics?.re24 ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {formatSigned(contextMetrics?.re24)}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">aLI (gmLI)</span>
              <div className="text-sm sm:text-base font-black text-slate-100 font-mono mt-1">
                {contextMetrics ? `${contextMetrics.aLI.toFixed(2)} (${contextMetrics.gmLI.toFixed(2)})` : "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">F-Strike%</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.fStrikePct || pbpKpis.fpsPct}
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
              <span className="text-[10px] text-slate-400 font-mono uppercase">SwStr%</span>
              <div className="text-base sm:text-lg font-black text-slate-100 font-mono mt-0.5">
                {boxscore.swStrPct || pbpKpis.swStrPct || "—"}
              </div>
            </div>
            <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-400 font-mono uppercase">PutAway%</span>
              <div className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
                {boxscore.putAwayPct || pbpKpis.putAwayPct || "—"}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tira Contextual de Valor por Rol en Temporada */}
      {isSeason && contextMetrics && (
        <div className="bg-[#002D62]/30 border border-[#1E2B4D] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <span className="text-slate-300 font-semibold">
            {isStarter ? (
              <>
                Rol Abridor • Salidas de Calidad (QS):{" "}
                <strong className="text-[#FDB827]">
                  {contextMetrics.qsCount ?? 0} / {contextMetrics.gsCount ?? boxscore.gamesStarted ?? 0}
                </strong>{" "}
                • GSv2 Promedio:{" "}
                <strong className="text-emerald-400">
                  {contextMetrics.avgGsv2 !== null && contextMetrics.avgGsv2 !== undefined
                    ? contextMetrics.avgGsv2.toFixed(1)
                    : "—"}
                </strong>
              </>
            ) : (
              <>
                Rol Relevista • Heredados (IR / IRS):{" "}
                <strong className="text-[#FDB827]">
                  {contextMetrics.ir} / {contextMetrics.irs}
                  {contextMetrics.irsPct !== null ? ` (${contextMetrics.irsPct.toFixed(1)}%)` : ""}
                </strong>{" "}
                • Shutdowns / Meltdowns (SD / MD):{" "}
                <strong className="text-emerald-400">
                  {contextMetrics.shutdowns ?? 0} / {contextMetrics.meltdowns ?? 0}
                </strong>
              </>
            )}
          </span>
          <span className="text-slate-400">
            Apalancamiento Promedio (aLI):{" "}
            <strong className="text-slate-100">{contextMetrics.aLI.toFixed(2)}</strong> • PutAway%:{" "}
            <strong className="text-cyan-300">{boxscore.putAwayPct || pbpKpis.putAwayPct || "—"}</strong>
          </span>
        </div>
      )}

      {/* 2. Bloque Medio: Destinos PBP + Perfil de Contacto Permitido (BIS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Destinos del Pitcheo PBP */}
        <div className="lg:col-span-7 bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#FDB827]" />
              <h3 className="text-sm font-bold text-slate-100">
                Desglose de Destinos de Pitcheos (PBP)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {pbpKpis.totalPitches} lanzamientos • Strike%: {pbpKpis.strikePct} • F-Str%: {pbpKpis.fpsPct}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E2B4D] text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Destino del Pitcheo</th>
                  <th className="py-2.5 px-3 text-center">Conteo</th>
                  <th className="py-2.5 px-3 text-center">% Uso</th>
                  <th className="py-2.5 px-3">Distribución</th>
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

        {/* Perfil de Contacto Permitido (BIS Oficial) */}
        <div className="lg:col-span-5 bg-[#0D152B]/90 border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#FDB827]" />
                <h3 className="text-sm font-bold text-slate-100">
                  Perfil de Contacto Permitido (BIS)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                BIP: {contactProfile?.bip ?? 0} • GO/AO: {contactProfile?.goAoRatio ?? "—"}
              </span>
            </div>

            {!contactProfile || contactProfile.bip === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500 font-mono">
                Sin bolas puestas en juego registradas
              </div>
            ) : (
              <div className="space-y-4">
                {/* Trayectoria BIS */}
                <div className="grid grid-cols-4 gap-2 text-center font-mono">
                  <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Rodados (GB)</span>
                    <span className="text-sm font-black text-emerald-400">
                      {contactProfile.gbPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">N={contactProfile.gb}</span>
                  </div>
                  <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Líneas (LD)</span>
                    <span className="text-sm font-black text-amber-300">
                      {contactProfile.ldPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">N={contactProfile.ld}</span>
                  </div>
                  <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Elevados (FB)</span>
                    <span className="text-sm font-black text-cyan-300">
                      {contactProfile.fbPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">N={contactProfile.fb}</span>
                  </div>
                  <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-2.5">
                    <span className="text-[10px] text-slate-400 block">Infield (PU)</span>
                    <span className="text-sm font-black text-purple-300">
                      {contactProfile.puPct.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-500 block">N={contactProfile.pu}</span>
                  </div>
                </div>

                {/* Dureza BIS */}
                <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-300 font-semibold">Intensidad del Contacto (Stringer BIS)</span>
                    <span className="text-slate-400">Soft / Med / Hard</span>
                  </div>
                  <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-[#0D152B] border border-[#1E2B4D]">
                    <div
                      style={{ width: `${contactProfile.softPct}%` }}
                      className="bg-emerald-500 h-full transition-all"
                      title={`Suave (Soft): ${contactProfile.softPct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${contactProfile.medPct}%` }}
                      className="bg-amber-400 h-full transition-all"
                      title={`Medio (Med): ${contactProfile.medPct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${contactProfile.hardPct}%` }}
                      className="bg-rose-500 h-full transition-all"
                      title={`Contundente (Hard): ${contactProfile.hardPct.toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                    <span className="text-emerald-400 font-bold">
                      Soft: {contactProfile.softPct.toFixed(1)}%
                    </span>
                    <span className="text-amber-300 font-bold">
                      Med: {contactProfile.medPct.toFixed(1)}%
                    </span>
                    <span className="text-rose-400 font-bold">
                      Hard: {contactProfile.hardPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-3">
            Clasificación oficial de trayectoria y dureza de batted balls (MLB Gameday / LVBP PBP)
          </div>
        </div>
      </div>

      {/* 3. Triple Panel Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Panel A: Carga de Trabajo por Entrada */}
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
                        <div
                          className="w-full bg-[#3B82F6] transition-all"
                          style={{ height: `${ballH}px` }}
                          title={`Inning ${inn.inning}: ${inn.balls} Bolas`}
                        />
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
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 120" preserveAspectRatio="none">
                  <line x1="0" y1="60" x2="200" y2="60" stroke="#FDB827" strokeDasharray="3 3" strokeOpacity="0.4" strokeWidth="1" />
                  <text x="2" y="56" fill="#FDB827" fontSize="8" fontFamily="monospace">1.0 LI (Neutral)</text>

                  {(() => {
                    const step = 200 / (inningsWorkload.length + 1);
                    const points = inningsWorkload
                      .map((w, i) => {
                        const x = (i + 1) * step;
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
                Comando por Mano de Bateador
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">LHB vs RHB</span>
            </div>

            <div className="h-44 flex flex-col justify-around py-1">
              <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">
                    vs Bateadores Zurdos (LHB)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    N={splitsPlatoon.vsLhb.pitches} pitcheos
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

              <div className="bg-[#070B19] border border-[#1E2B4D] rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-200">
                    vs Bateadores Derechos (RHB)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    N={splitsPlatoon.vsRhb.pitches} pitcheos
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
            Efectividad de pitcheo ante ambos lados del plato
          </div>
        </div>
      </div>

      {/* 4. Bloque Inferior: Splits Situacionales + Vueltas al Orden (TTO) */}
      {(situationalSplits?.length || activeTtoRows.length) ? (
        <div
          className={`grid grid-cols-1 ${
            activeTtoRows.length > 0 ? "xl:grid-cols-12" : ""
          } gap-5`}
        >
          {situationalSplits && situationalSplits.length > 0 && (
            <div className={activeTtoRows.length > 0 ? "xl:col-span-7" : ""}>
              <SplitsTableCard
                title={
                  isSeason
                    ? "Splits Situacionales Acumulados (Temporada)"
                    : "Splits Situacionales del Partido"
                }
                subtitle="Platoon, Corredores en Posición Anotadora y Condición"
                rows={situationalSplits}
              />
            </div>
          )}

          {activeTtoRows.length > 0 && (
            <div className={situationalSplits?.length ? "xl:col-span-5" : ""}>
              <SplitsTableCard
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
