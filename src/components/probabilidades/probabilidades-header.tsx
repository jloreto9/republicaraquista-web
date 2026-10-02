"use client";

import { Calendar as CalendarIcon, Sparkles, Download, RefreshCw, Filter, SlidersHorizontal } from "lucide-react";
import { SportsbookId, OddsFormat } from "@/types/probabilidades";
import { SPORTSBOOKS_META } from "@/lib/probabilidades-engine";
import { cn } from "@/lib/utils";

interface ProbabilidadesHeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  selectedBook: SportsbookId | "all";
  onSelectBook: (book: SportsbookId | "all") => void;
  oddsFormat: OddsFormat;
  onOddsFormatChange: (fmt: OddsFormat) => void;
  onOpenSimulator: () => void;
  onOpenExport: () => void;
  onResetOdds: () => void;
  hasCustomOdds: boolean;
  mispricedCount: number;
}

export function ProbabilidadesHeader({
  currentDate,
  onDateChange,
  selectedBook,
  onSelectBook,
  oddsFormat,
  onOddsFormatChange,
  onOpenSimulator,
  onOpenExport,
  onResetOdds,
  hasCustomOdds,
  mispricedCount,
}: ProbabilidadesHeaderProps) {
  return (
    <div className="bg-[#0D152B] border border-[#1E2B4D] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
      {/* ── Fila 1: Estado del Mercado, Alertas y Acciones Rápidas ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#1E2B4D]/70">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/30">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Panel de Control & Filtros</span>
          </div>

          {mispricedCount > 0 ? (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
              <span>⚡ {mispricedCount} Cuota{mispricedCount > 1 ? "s" : ""} Desfasada{mispricedCount > 1 ? "s" : ""}</span>
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#070B19] text-slate-400 border border-[#1E2B4D]">
              <span>Mercado Calibrado</span>
            </span>
          )}
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {hasCustomOdds && (
            <button
              onClick={onResetOdds}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Restaurar cuotas de mercado originales"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Cuotas</span>
            </button>
          )}

          <button
            onClick={onOpenSimulator}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1E2B4D] text-[#FDB827] hover:bg-[#1E2B4D]/80 border border-[#FDB827]/30 transition-all shadow-[0_0_12px_rgba(253,184,39,0.1)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulador H2H</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#FDB827] text-[#070B19] hover:bg-[#E5A520] transition-colors shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Tarjeta HD</span>
          </button>
        </div>
      </div>

      {/* ── Fila 2: Filtros de Fecha, Formato de Cuota y Casa de Apuestas ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Selector de Fecha y Formato */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 text-xs text-slate-300 bg-[#070B19] px-2.5 py-1.5 rounded-xl border border-[#1E2B4D]">
            <CalendarIcon className="w-4 h-4 text-[#FDB827]" />
            <span className="font-semibold text-slate-400">Jornada:</span>
            <input
              type="date"
              value={currentDate}
              min="2026-10-12"
              max="2026-12-27"
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
            />
          </div>

          <div className="hidden sm:flex items-center space-x-1 text-[11px]">
            <button
              onClick={() => onDateChange("2026-10-12")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors font-mono",
                currentDate === "2026-10-12"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#070B19] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              )}
            >
              12 Oct (Inaugural)
            </button>
            <button
              onClick={() => onDateChange("2026-10-13")}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-colors font-mono",
                currentDate === "2026-10-13"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#070B19] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              )}
            >
              13 Oct (Debut CAR)
            </button>
          </div>

          {/* Conmutador de Formato: Americano (-120) vs Decimal (1.83) */}
          <div className="flex items-center space-x-1 p-0.5 rounded-xl bg-[#070B19] border border-[#1E2B4D]">
            <span className="text-[10px] text-slate-400 font-bold uppercase px-2 hidden sm:inline">Línea:</span>
            <button
              onClick={() => onOddsFormatChange("american")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                oddsFormat === "american"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Americana (-120)
            </button>
            <button
              onClick={() => onOddsFormatChange("decimal")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                oddsFormat === "decimal"
                  ? "bg-[#FDB827] text-[#070B19] shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              Decimal (1.83)
            </button>
          </div>
        </div>

        {/* Filtro de Casa de Apuestas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center space-x-1 text-slate-400 text-xs mr-1">
            <Filter className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>Casa:</span>
          </div>

          <button
            onClick={() => onSelectBook("all")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              selectedBook === "all"
                ? "bg-[#FDB827] text-[#070B19] shadow-sm"
                : "bg-[#070B19] text-slate-300 hover:text-white border border-[#1E2B4D]"
            )}
          >
            Todas (Comparador)
          </button>

          {(["juegaenlinea", "betcris", "sellatuparley", "apuestasroyal"] as SportsbookId[]).map((bId) => {
            const meta = SPORTSBOOKS_META[bId];
            const isSelected = selectedBook === bId;

            return (
              <button
                key={bId}
                onClick={() => onSelectBook(bId)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                  isSelected
                    ? "bg-[#1E2B4D] text-[#FDB827] border-[#FDB827]/40 shadow-sm"
                    : "bg-[#070B19] text-slate-400 hover:text-slate-200 border-[#1E2B4D]"
                )}
              >
                {meta.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
