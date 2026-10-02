"use client";

import { ValueAssessment, OddsFormat } from "@/types/probabilidades";
import { SPORTSBOOKS_META, formatOdds } from "@/lib/probabilidades-engine";
import { Zap, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopPicksBannerProps {
  picks: ValueAssessment[];
  mispricedAlerts: ValueAssessment[];
  oddsFormat: OddsFormat;
  onScrollToGame?: (gameId: string) => void;
}

export function TopPicksBanner({ picks, mispricedAlerts, oddsFormat }: TopPicksBannerProps) {
  if (picks.length === 0 && mispricedAlerts.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-[#0D152B]/70 border border-[#1E2B4D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2.5 text-slate-300">
          <span className="p-1.5 rounded-lg bg-[#1E2B4D] text-[#FDB827] shrink-0">
            <Info className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-slate-200">
              Líneas de Mercado Pendientes de Apertura
            </span>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Las casas de apuestas (JEL, BCR, STP, ROY) aún no han publicado sus líneas oficiales para esta jornada. Consulta las <strong>Cuotas Justas del Modelo Sabermétrico</strong> en cada partido o introduce tus cuotas en la tabla para comparar el valor (+EV).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Sección de Alertas: Cuotas Desfasadas (Ineficiencias de Mercado) ── */}
      {mispricedAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 shadow-lg space-y-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="w-5 h-5 animate-bounce" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>Alerta de Ineficiencia Sabermétrica</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500 text-[#070B19] font-black">
                  {mispricedAlerts.length} Cuota{mispricedAlerts.length > 1 ? "s" : ""} Mal Puesta{mispricedAlerts.length > 1 ? "s" : ""}
                </span>
              </h3>
              <p className="text-xs text-amber-300/80">
                La casa de apuestas está desestimando factores críticos de pitcheo o parque. Retorno esperado anormal (+EV &ge; 12%).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mispricedAlerts.map((alert, idx) => {
              const meta = SPORTSBOOKS_META[alert.sportsbookId];

              return (
                <div
                  key={`alert-${idx}`}
                  className="p-3.5 rounded-xl bg-[#0D152B] border border-amber-500/30 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: meta.badgeBg, color: meta.textColor }}
                        >
                          {alert.sportsbookName}
                        </span>
                        <span className="text-xs font-bold text-slate-100">{alert.label}</span>
                      </div>
                      <div className="flex items-baseline space-x-3 mt-1.5">
                        <span className="text-lg font-black text-amber-400">
                          {formatOdds(alert.marketOdds, oddsFormat)}
                        </span>
                        <span className="text-xs text-slate-400">
                          Justa: <span className="font-semibold text-slate-200">{formatOdds(alert.fairOdds, oddsFormat)}</span>
                        </span>
                        <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                          +{alert.evPercent}% EV
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Stake Sugerido</div>
                      <div className="text-sm font-black text-[#FDB827]">{alert.kellyStakePercent}%</div>
                      <div className="text-[9px] text-slate-400 font-mono">Quarter-Kelly</div>
                    </div>
                  </div>

                  {alert.explanation && (
                    <div className="text-[11px] text-slate-300/90 bg-[#070B19]/70 p-2.5 rounded-lg border border-amber-500/20 flex items-start space-x-1.5 leading-relaxed">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{alert.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Carrusel / Grid de Top Picks de Valor Sólido ── */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Picks de Mayor Valor Sabermétrico (+EV)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Filtro de ventaja matemática real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {picks.slice(0, 4).map((pick, i) => {
            const meta = SPORTSBOOKS_META[pick.sportsbookId];
            const isMis = pick.rating === "mispriced";

            return (
              <div
                key={`pick-${i}`}
                className={cn(
                  "p-3 rounded-xl bg-[#0D152B] border transition-all hover:border-[#FDB827]/40 flex flex-col justify-between space-y-2",
                  isMis ? "border-amber-500/50" : "border-[#1E2B4D]"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: meta.badgeBg, color: meta.textColor }}
                    >
                      {pick.sportsbookName}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-black px-1.5 py-0.5 rounded",
                        isMis
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      )}
                    >
                      +{pick.evPercent}% EV
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-100 mt-2 truncate">
                    {pick.label}
                  </div>

                  <div className="flex items-baseline justify-between mt-1 text-xs">
                    <span className="text-slate-400">Cuota Mercado:</span>
                    <span className="font-extrabold text-white text-sm">{formatOdds(pick.marketOdds, oddsFormat)}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-[11px] text-slate-400">
                    <span>Cuota Justa:</span>
                    <span className="font-semibold text-slate-300">{formatOdds(pick.fairOdds, oddsFormat)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1E2B4D] flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono">Kelly (1/4):</span>
                  <span className="font-bold text-[#FDB827]">{pick.kellyStakePercent}% del bankroll</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
