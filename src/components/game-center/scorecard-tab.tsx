"use client";

import { useState } from "react";
import Image from "next/image";
import { GameCenterScorecard, TeamScorecard } from "@/types/scorecard";
import { GameCenterTeam } from "@/types/game-center";
import { ScorecardDiamondCell } from "./scorecard-diamond-cell";
import { Info, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";

interface ScorecardTabProps {
  scorecard?: GameCenterScorecard;
  homeTeam: GameCenterTeam;
  awayTeam: GameCenterTeam;
}

export function ScorecardTab({ scorecard, homeTeam, awayTeam }: ScorecardTabProps) {
  // Inicializar en el equipo de Leones si está jugando, o el visitante por defecto
  const defaultTeam = homeTeam.isLeones ? "home" : "away";
  const [selectedTeam, setSelectedTeam] = useState<"away" | "home">(defaultTeam);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  if (!scorecard) {
    return (
      <div className="p-8 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl text-center space-y-3">
        <Info className="w-8 h-8 text-[#FDB827] mx-auto animate-pulse" />
        <h3 className="text-base font-bold text-slate-100">Hoja de Anotación en Espera</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          La hoja de anotación oficial se construye en vivo a medida que los árbitros y anotadores de la LVBP registran jugadas en la telemetría oficial.
        </p>
      </div>
    );
  }

  const activeTeamData: TeamScorecard = selectedTeam === "away" ? scorecard.away : scorecard.home;
  const maxInnings = Math.max(9, scorecard.maxInnings || 9);
  const inningCols = Array.from({ length: maxInnings }, (_, i) => i + 1);

  return (
    <div className="space-y-6 pb-16">
      {/* ── SELECTOR DE EQUIPO (TOGGLE) ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setSelectedTeam("away")}
            className={`flex-1 sm:flex-initial flex items-center space-x-3 px-4 py-2.5 rounded-xl border transition-all ${
              selectedTeam === "away"
                ? awayTeam.isLeones
                  ? "bg-[#FDB827]/15 border-[#FDB827] text-[#FDB827] shadow-lg shadow-[#FDB827]/10"
                  : "bg-[#1E2B4D] border-slate-500 text-slate-100 shadow-md"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1E2B4D]/40"
            }`}
          >
            <div className="w-6 h-6 relative shrink-0">
              <Image
                src={awayTeam.logoUrl}
                alt={awayTeam.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-none">{awayTeam.name}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Visitante</div>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#070B19]/80 border border-[#1E2B4D]">
              {awayTeam.score}
            </span>
          </button>

          <button
            onClick={() => setSelectedTeam("home")}
            className={`flex-1 sm:flex-initial flex items-center space-x-3 px-4 py-2.5 rounded-xl border transition-all ${
              selectedTeam === "home"
                ? homeTeam.isLeones
                  ? "bg-[#FDB827]/15 border-[#FDB827] text-[#FDB827] shadow-lg shadow-[#FDB827]/10"
                  : "bg-[#1E2B4D] border-slate-500 text-slate-100 shadow-md"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1E2B4D]/40"
            }`}
          >
            <div className="w-6 h-6 relative shrink-0">
              <Image
                src={homeTeam.logoUrl}
                alt={homeTeam.name}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-none">{homeTeam.name}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Home Club</div>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded font-mono font-bold text-xs bg-[#070B19]/80 border border-[#1E2B4D]">
              {homeTeam.score}
            </span>
          </button>
        </div>

        {/* Botón de Ayuda / Glosario Didáctico */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#1E2B4D]/60 hover:bg-[#1E2B4D] border border-slate-700/60 text-slate-300 text-xs font-medium transition-all"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#FDB827]" />
          <span>Simbología de Anotación</span>
          {showLegend ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
        </button>
      </div>

      {/* ── PANEL DESPLEGABLE: GLOSARIO DE ANOTACIÓN ── */}
      {showLegend && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0D152B] to-[#142042] border border-[#1E2B4D] shadow-xl text-xs space-y-3">
          <div className="flex items-center space-x-2 text-[#FDB827] font-bold pb-2 border-b border-[#1E2B4D]">
            <Info className="w-4 h-4" />
            <span>Guía Rápida para Interpretar la Hoja de Anotación</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-slate-300 text-[11px] leading-relaxed">
            <div className="space-y-1">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FDB827]" />
                <span>Rombo de Bases</span>
              </div>
              <p className="text-slate-400">
                Líneas iluminadas en el rombo indican que el bateador avanzó a 1B, 2B o 3B. Si el interior está <span className="text-[#FDB827] font-semibold">sombreado en dorado</span>, anotó carrera.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                <span>Ponches y Boletos</span>
              </div>
              <p className="text-slate-400">
                <strong className="text-rose-400">K</strong>: Ponche tirándole con swing. <br />
                <strong className="text-rose-400">ꓘ</strong>: Ponche cantado (tercer strike mirándola). <br />
                <strong className="text-sky-400">BB</strong>: Boleto | <strong className="text-sky-400">HBP</strong>: Pelotazo.
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                <span>Batazos & Hits</span>
              </div>
              <p className="text-slate-400">
                <strong className="text-emerald-400">1B</strong>, <strong className="text-emerald-400">2B</strong>, <strong className="text-emerald-400">3B</strong>, <strong className="text-[#FDB827]">HR</strong> (Jonrón). <br />
                Los puntos dorados (<strong className="text-[#FDB827]">•</strong>) indican carreras impulsadas (RBI).
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                <span>Outs de Campo</span>
              </div>
              <p className="text-slate-400">
                <strong>6-3</strong> (Short a 1ra), <strong>4-3</strong> (2da a 1ra), <strong>F8</strong> (Fly al center), <strong>L6</strong> (Línea al short), <strong>DP</strong> (Doble Play). El badge circular <strong className="text-rose-400">➀, ➁, ➂</strong> marca el out de la entrada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CUADRÍCULA PRINCIPAL (SCORECARD GRID) ── */}
      <div className="rounded-2xl border border-[#1E2B4D] bg-[#0D152B] shadow-2xl overflow-hidden">
        {/* Cabecera del Equipo Activo */}
        <div className="p-4 bg-gradient-to-r from-[#070B19] to-[#0D152B] border-b border-[#1E2B4D] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 relative shrink-0">
              <Image
                src={activeTeamData.logoUrl}
                alt={activeTeamData.teamName}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Hoja Oficial de Anotación • {activeTeamData.teamName}
              </h3>
              <p className="text-[11px] text-slate-400">
                Cuadrícula tradicional por orden al bate y entradas disputadas. Haz clic en cualquier rombo para ver el detalle de la jugada.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-[#1E2B4D]/60 border border-slate-700/60 text-slate-300">
              {activeTeamData.totals.runs} C • {activeTeamData.totals.hits} H • {activeTeamData.totals.errors} E • {activeTeamData.totals.lob} LOB
            </span>
          </div>
        </div>

        {/* Contenedor de la Tabla con Scroll Horizontal Responsivo */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            {/* ENCABEZADOS DE COLUMNAS */}
            <thead>
              <tr className="bg-[#070B19]/90 border-b border-[#1E2B4D] text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                {/* Columna Sticky de Bateadores */}
                <th className="sticky left-0 z-20 bg-[#070B19] px-4 py-3 min-w-[240px] w-[240px] border-r border-[#1E2B4D] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  Orden al Bate
                </th>

                {/* Columnas de Entradas (1 al 9+) */}
                {inningCols.map((inn) => (
                  <th
                    key={inn}
                    className="px-2 py-3 text-center min-w-[84px] w-[84px] border-r border-[#1E2B4D]/50 font-mono text-slate-300"
                  >
                    {inn}
                  </th>
                ))}

                {/* Columnas Totales del Bateador */}
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">VB</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">C</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">H</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">2B</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">3B</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">HR</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-[#FDB827]">CI</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">BB</th>
                <th className="px-2 py-3 text-center min-w-[34px] border-r border-[#1E2B4D]/40 font-mono text-slate-300">K</th>
                <th className="px-3 py-3 text-center min-w-[50px] font-mono text-slate-300">AVG</th>
              </tr>
            </thead>

            {/* CUERPO DE BATEADORES */}
            <tbody className="divide-y divide-[#1E2B4D]/40 text-xs">
              {activeTeamData.batters.map((batter) => {
                const isSub = batter.isSubstitute;

                return (
                  <tr
                    key={`${batter.id}-${batter.order}`}
                    className="hover:bg-[#1E2B4D]/25 transition-colors group"
                  >
                    {/* Bateador Info (Sticky) */}
                    <td
                      className={`sticky left-0 z-10 bg-[#0D152B] group-hover:bg-[#121D3B] px-4 py-2 border-r border-[#1E2B4D] shadow-[2px_0_5px_rgba(0,0,0,0.3)] ${
                        isSub ? "pl-7 bg-[#0A1024]" : ""
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {/* Indicador de Slot o Flecha de Suplente */}
                        {isSub ? (
                          <span className="text-slate-500 font-mono text-[11px] shrink-0 select-none">
                            ↳
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-md bg-[#1E2B4D] text-[#FDB827] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                            {batter.slot}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 leading-tight">
                            {batter.note && (
                              <span className="text-[10px] text-slate-400 font-mono font-bold">
                                {batter.note}
                              </span>
                            )}
                            <span className="font-bold text-slate-100 truncate text-[12px]">
                              {batter.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-[#1E2B4D]/70 text-slate-300 font-bold">
                              {batter.position}
                            </span>
                            {batter.jersey !== "-" && <span>#{batter.jersey}</span>}
                            <span className="text-slate-500 truncate">{batter.todaySummary}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Celdas de Entradas 1 a 9+ */}
                    {inningCols.map((inn) => (
                      <td key={inn} className="p-0 text-center">
                        <ScorecardDiamondCell cells={batter.innings[inn]} />
                      </td>
                    ))}

                    {/* Estadísticas Totales del Bateador en el Partido */}
                    <td className="px-2 py-2 text-center font-mono font-bold text-slate-200 border-r border-[#1E2B4D]/40">
                      {batter.ab}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-slate-200 border-r border-[#1E2B4D]/40">
                      {batter.r}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-emerald-400 border-r border-[#1E2B4D]/40">
                      {batter.h}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-400 border-r border-[#1E2B4D]/40">
                      {batter.doubles}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-slate-400 border-r border-[#1E2B4D]/40">
                      {batter.triples}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-[#FDB827] border-r border-[#1E2B4D]/40">
                      {batter.hr}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-black text-[#FDB827] border-r border-[#1E2B4D]/40">
                      {batter.rbi}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-sky-400 border-r border-[#1E2B4D]/40">
                      {batter.bb}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-rose-400 border-r border-[#1E2B4D]/40">
                      {batter.so}
                    </td>
                    <td className="px-3 py-2 text-center font-mono text-slate-300">
                      {batter.avg}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* FILAS DE RESUMEN POR ENTRADA AL PIE (R, H, E, LOB) */}
            <tfoot className="border-t-2 border-[#1E2B4D] bg-[#070B19]/90 text-[11px] font-mono">
              {/* Carreras por Entrada */}
              <tr className="border-b border-[#1E2B4D]/40">
                <td className="sticky left-0 z-20 bg-[#070B19] px-4 py-2 font-bold text-slate-200 border-r border-[#1E2B4D] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  Carreras (R)
                </td>
                {inningCols.map((inn) => {
                  const r = activeTeamData.inningsSummary[inn - 1]?.runs ?? 0;
                  return (
                    <td
                      key={inn}
                      className={`text-center py-2 border-r border-[#1E2B4D]/40 font-bold ${
                        r > 0 ? "text-[#FDB827] bg-[#FDB827]/10" : "text-slate-500"
                      }`}
                    >
                      {r}
                    </td>
                  );
                })}
                <td colSpan={10} className="px-3 py-2 font-bold text-right text-slate-400">
                  Total: <span className="text-[#FDB827] font-black text-xs ml-1">{activeTeamData.totals.runs}</span>
                </td>
              </tr>

              {/* Imparables por Entrada */}
              <tr className="border-b border-[#1E2B4D]/40">
                <td className="sticky left-0 z-20 bg-[#070B19] px-4 py-2 font-bold text-slate-300 border-r border-[#1E2B4D] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  Imparables (H)
                </td>
                {inningCols.map((inn) => {
                  const h = activeTeamData.inningsSummary[inn - 1]?.hits ?? 0;
                  return (
                    <td
                      key={inn}
                      className={`text-center py-2 border-r border-[#1E2B4D]/40 font-bold ${
                        h > 0 ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {h}
                    </td>
                  );
                })}
                <td colSpan={10} className="px-3 py-2 font-bold text-right text-slate-400">
                  Total: <span className="text-emerald-400 font-black text-xs ml-1">{activeTeamData.totals.hits}</span>
                </td>
              </tr>

              {/* Errores del rival por Entrada */}
              <tr className="border-b border-[#1E2B4D]/40">
                <td className="sticky left-0 z-20 bg-[#070B19] px-4 py-2 font-bold text-slate-400 border-r border-[#1E2B4D] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  Errores Rival (E)
                </td>
                {inningCols.map((inn) => {
                  const e = activeTeamData.inningsSummary[inn - 1]?.errors ?? 0;
                  return (
                    <td
                      key={inn}
                      className={`text-center py-2 border-r border-[#1E2B4D]/40 ${
                        e > 0 ? "text-rose-400 font-bold" : "text-slate-600"
                      }`}
                    >
                      {e}
                    </td>
                  );
                })}
                <td colSpan={10} className="px-3 py-2 font-bold text-right text-slate-400">
                  Total: <span className="text-rose-400 font-bold text-xs ml-1">{activeTeamData.totals.errors}</span>
                </td>
              </tr>

              {/* Dejados en Base por Entrada */}
              <tr>
                <td className="sticky left-0 z-20 bg-[#070B19] px-4 py-2 font-bold text-slate-400 border-r border-[#1E2B4D] shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                  Dejados en Base (LOB)
                </td>
                {inningCols.map((inn) => {
                  const lob = activeTeamData.inningsSummary[inn - 1]?.lob ?? 0;
                  return (
                    <td
                      key={inn}
                      className={`text-center py-2 border-r border-[#1E2B4D]/40 ${
                        lob > 0 ? "text-sky-300 font-semibold" : "text-slate-600"
                      }`}
                    >
                      {lob}
                    </td>
                  );
                })}
                <td colSpan={10} className="px-3 py-2 font-bold text-right text-slate-400">
                  Total: <span className="text-sky-300 font-bold text-xs ml-1">{activeTeamData.totals.lob}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
