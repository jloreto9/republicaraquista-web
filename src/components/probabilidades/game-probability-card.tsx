"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GameProjection,
  SportsbookId,
  SportsbookOdds,
} from "@/types/probabilidades";
import { SPORTSBOOKS_META } from "@/lib/probabilidades-engine";
import {
  MapPin,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GameProbabilityCardProps {
  game: GameProjection;
  selectedBook: SportsbookId | "all";
  onUpdateOdd: (
    gameId: string,
    sportsbookId: SportsbookId,
    field: keyof SportsbookOdds,
    val: number
  ) => void;
}

export function GameProbabilityCard({
  game,
  selectedBook,
  onUpdateOdd,
}: GameProbabilityCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showPitcherStats, setShowPitcherStats] = useState(false);

  const homeWinPct = Math.round(game.model.homeWinProb * 100);
  const awayWinPct = Math.round(game.model.awayWinProb * 100);

  const booksToDisplay: SportsbookId[] =
    selectedBook === "all"
      ? ["juegaenlinea", "betcris", "sellatuparley", "apuestasroyal"]
      : [selectedBook];

  const mispricedInGame = game.assessments.filter((a) => a.rating === "mispriced");

  return (
    <div
      className={cn(
        "rounded-2xl bg-[#0D152B] border transition-all shadow-md overflow-hidden",
        mispricedInGame.length > 0
          ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.08)]"
          : "border-[#1E2B4D] hover:border-[#FDB827]/40"
      )}
    >
      {/* ── 1. Barra Superior: Estadio, Factor de Parque y Badges ── */}
      <div className="px-4 py-2.5 bg-[#070B19]/80 border-b border-[#1E2B4D] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-[#FDB827] shrink-0" />
          <span className="font-semibold text-slate-200">{game.stadium}</span>
          <span className="text-slate-400">({game.city})</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E2B4D] text-slate-300">
            Parque: {game.parkFactor.runFactor.toFixed(2)}x carreras
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {mispricedInGame.length > 0 && (
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Zap className="w-3 h-3" />
              <span>Línea Desfasada Detectada</span>
            </span>
          )}
          {game.gameTime && (
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {game.gameTime}
            </span>
          )}
        </div>
      </div>

      {/* ── 2. Duelo Principal: Equipos, Logos y Abridores ── */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Equipo Visitante (Away) */}
          <div className="md:col-span-5 flex items-center space-x-3.5">
            <div className="relative w-12 h-12 rounded-xl bg-[#070B19] border border-[#1E2B4D] p-1 flex items-center justify-center shrink-0">
              {game.awayTeamLogo ? (
                <Image
                  src={game.awayTeamLogo}
                  alt={game.awayTeamName}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              ) : (
                <span className="font-black text-xs text-slate-300">{game.awayTeamAbbr}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base text-slate-100 truncate">
                  {game.awayTeamName}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ({game.awayTeamAbbr})
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-slate-300">{game.awayPitcher.name}</span>
                <span className="text-[10px] font-mono text-slate-400">({game.awayPitcher.throws})</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#1E2B4D] text-[#FDB827] font-mono">
                  FIP {game.awayPitcher.fip.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* VS Central y Carreras Esperadas */}
          <div className="md:col-span-2 flex flex-col items-center justify-center py-2 md:py-0 border-y md:border-y-0 md:border-x border-[#1E2B4D]/60">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Carreras Proy.
            </span>
            <div className="text-sm font-black font-mono text-slate-200 mt-0.5 flex items-center space-x-2">
              <span className={cn(game.model.awayExpectedRuns > game.model.homeExpectedRuns && "text-[#FDB827]")}>
                {game.model.awayExpectedRuns.toFixed(1)}
              </span>
              <span className="text-slate-400 font-light">-</span>
              <span className={cn(game.model.homeExpectedRuns > game.model.awayExpectedRuns && "text-[#FDB827]")}>
                {game.model.homeExpectedRuns.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Total: {game.model.totalExpectedRuns.toFixed(1)}
            </span>
          </div>

          {/* Equipo Local (Home) */}
          <div className="md:col-span-5 flex items-center justify-start md:justify-end space-x-3.5">
            <div className="flex-1 min-w-0 md:text-right">
              <div className="flex items-center md:justify-end space-x-2">
                <span className="text-xs font-mono font-bold text-slate-400">
                  ({game.homeTeamAbbr})
                </span>
                <span className="font-extrabold text-base text-slate-100 truncate">
                  {game.homeTeamName}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center md:justify-end gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#1E2B4D] text-[#FDB827] font-mono">
                  FIP {game.homePitcher.fip.toFixed(2)}
                </span>
                <span className="text-[10px] font-mono text-slate-400">({game.homePitcher.throws})</span>
                <span className="font-semibold text-slate-300">{game.homePitcher.name}</span>
              </div>
            </div>

            <div className="relative w-12 h-12 rounded-xl bg-[#070B19] border border-[#1E2B4D] p-1 flex items-center justify-center shrink-0">
              {game.homeTeamLogo ? (
                <Image
                  src={game.homeTeamLogo}
                  alt={game.homeTeamName}
                  width={40}
                  height={40}
                  className="object-contain"
                />
              ) : (
                <span className="font-black text-xs text-slate-300">{game.homeTeamAbbr}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Barra Visual de Probabilidad Sabermétrica (Fair Odds) ── */}
        <div className="mt-4 pt-3 border-t border-[#1E2B4D]">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-300">{game.awayTeamAbbr} {awayWinPct}%</span>
              <span className="text-[11px] font-normal text-slate-400">
                (Cuota Justa: <strong className="text-[#FDB827]">{game.model.fairAwayDecimal.toFixed(2)}</strong> / {game.model.fairAwayAmerican > 0 ? `+${game.model.fairAwayAmerican}` : game.model.fairAwayAmerican})
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-normal text-slate-400">
                (Cuota Justa: <strong className="text-[#FDB827]">{game.model.fairHomeDecimal.toFixed(2)}</strong> / {game.model.fairHomeAmerican > 0 ? `+${game.model.fairHomeAmerican}` : game.model.fairHomeAmerican})
              </span>
              <span className="text-slate-300">{game.homeTeamAbbr} {homeWinPct}%</span>
            </div>
          </div>

          {/* Barra de progreso de dos colores */}
          <div className="h-2.5 w-full bg-[#070B19] rounded-full overflow-hidden flex border border-[#1E2B4D]">
            <div
              className="h-full bg-slate-400 transition-all"
              style={{ width: `${awayWinPct}%` }}
              title={`${game.awayTeamAbbr}: ${awayWinPct}%`}
            />
            <div
              className="h-full bg-[#FDB827] transition-all"
              style={{ width: `${homeWinPct}%` }}
              title={`${game.homeTeamAbbr}: ${homeWinPct}%`}
            />
          </div>
        </div>

        {/* ── 4. Comparador de Cuotas de Mercado (4 Casas) ── */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Comparador de Mercado & Cuotas en Vivo</span>
            </span>
            <span className="text-[10px] text-slate-400">
              * Haz clic en cualquier cuota para editarla y recalcular tu +EV
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#070B19] text-slate-400 border border-[#1E2B4D] text-[11px]">
                  <th className="p-2.5 font-semibold">Casa de Apuestas</th>
                  <th className="p-2.5 font-semibold text-center">{game.awayTeamAbbr} (ML)</th>
                  <th className="p-2.5 font-semibold text-center">{game.homeTeamAbbr} (ML)</th>
                  <th className="p-2.5 font-semibold text-center">Over {game.model.recommendedTotal}</th>
                  <th className="p-2.5 font-semibold text-center">Under {game.model.recommendedTotal}</th>
                  <th className="p-2.5 font-semibold text-center">Mejor Ventaja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2B4D] border border-[#1E2B4D]">
                {booksToDisplay.map((bId) => {
                  const meta = SPORTSBOOKS_META[bId];
                  const ob = game.oddsByBook[bId];
                  if (!ob) return null;

                  const isBestHome = game.bestOdds.bestHomeMl.sportsbookId === bId;
                  const isBestAway = game.bestOdds.bestAwayMl.sportsbookId === bId;

                  // Buscar si esta casa tiene cuota desfasada en este juego
                  const bookAlert = game.assessments.find(
                    (a) => a.sportsbookId === bId && a.rating === "mispriced"
                  );

                  return (
                    <tr
                      key={bId}
                      className={cn(
                        "hover:bg-[#131E3D]/50 transition-colors",
                        bookAlert && "bg-amber-500/5"
                      )}
                    >
                      {/* Nombre de la casa con badge */}
                      <td className="p-2.5 font-medium flex items-center space-x-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: meta.badgeBg, color: meta.textColor }}
                        >
                          {meta.name}
                        </span>
                        {bookAlert && (
                          <span className="text-amber-400" title="Cuota Desfasada">
                            ⚡
                          </span>
                        )}
                      </td>

                      {/* Cuota Visitante */}
                      <td className="p-2.5 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.01"
                            min="1.01"
                            value={ob.awayMl}
                            onChange={(e) =>
                              onUpdateOdd(game.gameId, bId, "awayMl", parseFloat(e.target.value) || 1.01)
                            }
                            className={cn(
                              "w-16 px-1.5 py-0.5 text-center font-bold font-mono rounded bg-[#070B19] border text-xs focus:outline-none focus:border-[#FDB827]",
                              isBestAway
                                ? "border-emerald-500 text-emerald-300 bg-emerald-950/20"
                                : "border-[#1E2B4D] text-slate-200"
                            )}
                          />
                          {isBestAway && (
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Top</span>
                          )}
                        </div>
                      </td>

                      {/* Cuota Local */}
                      <td className="p-2.5 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="number"
                            step="0.01"
                            min="1.01"
                            value={ob.homeMl}
                            onChange={(e) =>
                              onUpdateOdd(game.gameId, bId, "homeMl", parseFloat(e.target.value) || 1.01)
                            }
                            className={cn(
                              "w-16 px-1.5 py-0.5 text-center font-bold font-mono rounded bg-[#070B19] border text-xs focus:outline-none focus:border-[#FDB827]",
                              isBestHome
                                ? "border-emerald-500 text-emerald-300 bg-emerald-950/20"
                                : "border-[#1E2B4D] text-slate-200"
                            )}
                          />
                          {isBestHome && (
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Top</span>
                          )}
                        </div>
                      </td>

                      {/* Over */}
                      <td className="p-2.5 text-center font-mono">
                        <input
                          type="number"
                          step="0.01"
                          min="1.01"
                          value={ob.overOdds ?? 1.9}
                          onChange={(e) =>
                            onUpdateOdd(game.gameId, bId, "overOdds", parseFloat(e.target.value) || 1.01)
                          }
                          className="w-14 px-1.5 py-0.5 text-center font-bold rounded bg-[#070B19] border border-[#1E2B4D] text-slate-300 text-xs focus:outline-none focus:border-[#FDB827]"
                        />
                      </td>

                      {/* Under */}
                      <td className="p-2.5 text-center font-mono">
                        <input
                          type="number"
                          step="0.01"
                          min="1.01"
                          value={ob.underOdds ?? 1.9}
                          onChange={(e) =>
                            onUpdateOdd(game.gameId, bId, "underOdds", parseFloat(e.target.value) || 1.01)
                          }
                          className="w-14 px-1.5 py-0.5 text-center font-bold rounded bg-[#070B19] border border-[#1E2B4D] text-slate-300 text-xs focus:outline-none focus:border-[#FDB827]"
                        />
                      </td>

                      {/* Estado / Semáforo de Ventaja */}
                      <td className="p-2.5 text-center">
                        {bookAlert ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ⚡ +{bookAlert.evPercent}% EV
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Eficiente</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 5. Alerta Explicativa de Ineficiencias de Mercado (Expandible) ── */}
        {mispricedInGame.length > 0 && (
          <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Diagnóstico Cuantitativo del Desbalance:</span>
            </div>
            {mispricedInGame.map((m, idx) => (
              <p key={idx} className="text-slate-300 pl-5 leading-relaxed text-[11px]">
                • <strong className="text-amber-200">{m.sportsbookName}</strong>: {m.explanation}
              </p>
            ))}
          </div>
        )}

        {/* ── 6. Botón de Desglose Avanzado de Métricas ── */}
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#1E2B4D]/60 text-xs">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-1 text-slate-400 hover:text-[#FDB827] transition-colors"
          >
            <span>Líneas Secundarias (Runline, Totales y Kelly)</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowPitcherStats(!showPitcherStats)}
            className="flex items-center space-x-1 text-slate-400 hover:text-[#FDB827] transition-colors"
          >
            <span>Duelo Monticular (K/9, BB/9, WHIP)</span>
            {showPitcherStats ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Desglose Secundario Expandible */}
        {showDetails && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Runline */}
            <div className="p-2.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="font-bold text-slate-300 mb-1 text-[11px] uppercase">Runline Proyectado</div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>{game.homeTeamAbbr} -1.5:</span>
                <span className="font-bold text-slate-200">
                  {(game.model.runlineHomeProb * 100).toFixed(1)}% (Cuota {game.model.fairRunlineHomeDecimal.toFixed(2)})
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] mt-1">
                <span>{game.awayTeamAbbr} +1.5:</span>
                <span className="font-bold text-slate-200">
                  {(game.model.runlineAwayProb * 100).toFixed(1)}% (Cuota {game.model.fairRunlineAwayDecimal.toFixed(2)})
                </span>
              </div>
            </div>

            {/* Totales */}
            <div className="p-2.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="font-bold text-slate-300 mb-1 text-[11px] uppercase">Totales (Over/Under)</div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Over {game.model.recommendedTotal}:</span>
                <span className="font-bold text-slate-200">
                  {(game.model.overProb * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px] mt-1">
                <span>Under {game.model.recommendedTotal}:</span>
                <span className="font-bold text-slate-200">
                  {(game.model.underProb * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Criterio de Kelly */}
            <div className="p-2.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="font-bold text-slate-300 mb-1 text-[11px] uppercase">Gestión de Bankroll</div>
              <div className="text-[11px] text-slate-400">
                Ponderación recomendada: <strong className="text-[#FDB827]">Quarter-Kelly (1/4)</strong>. Nunca arriesgar más del 5% del capital por encuentro individual.
              </div>
            </div>
          </div>
        )}

        {/* Desglose de Abridores Expandible */}
        {showPitcherStats && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {/* Away Starter */}
            <div className="p-2.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="font-bold text-slate-200 mb-1">
                {game.awayPitcher.name} ({game.awayTeamAbbr})
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-center text-slate-300">
                <div>ERA: <strong className="text-white">{game.awayPitcher.era.toFixed(2)}</strong></div>
                <div>FIP: <strong className="text-[#FDB827]">{game.awayPitcher.fip.toFixed(2)}</strong></div>
                <div>WHIP: <strong className="text-white">{game.awayPitcher.whip.toFixed(2)}</strong></div>
                <div>K/9: <strong className="text-white">{game.awayPitcher.k9.toFixed(1)}</strong></div>
              </div>
            </div>

            {/* Home Starter */}
            <div className="p-2.5 rounded-lg bg-[#0D152B] border border-[#1E2B4D]">
              <div className="font-bold text-slate-200 mb-1">
                {game.homePitcher.name} ({game.homeTeamAbbr})
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-center text-slate-300">
                <div>ERA: <strong className="text-white">{game.homePitcher.era.toFixed(2)}</strong></div>
                <div>FIP: <strong className="text-[#FDB827]">{game.homePitcher.fip.toFixed(2)}</strong></div>
                <div>WHIP: <strong className="text-white">{game.homePitcher.whip.toFixed(2)}</strong></div>
                <div>K/9: <strong className="text-white">{game.homePitcher.k9.toFixed(1)}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
