"use client";

import { Calendar as CalendarIcon, Sparkles, Download, RefreshCw, Filter } from "lucide-react";
import { SportsbookId } from "@/types/probabilidades";
import { SPORTSBOOKS_META } from "@/lib/probabilidades-engine";
import { cn } from "@/lib/utils";

interface ProbabilidadesHeaderProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  selectedBook: SportsbookId | "all";
  onSelectBook: (book: SportsbookId | "all") => void;
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
  onOpenSimulator,
  onOpenExport,
  onResetOdds,
  hasCustomOdds,
  mispricedCount,
}: ProbabilidadesHeaderProps) {
  return (
    <div className="space-y-4">
      {/* ── Banner Superior ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-lg">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#FDB827]/15 text-[#FDB827] border border-[#FDB827]/30">
              Terminal Cuantitativa
            </span>
            {mispricedCount > 0 && (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <span>⚡ {mispricedCount} Cuota{mispricedCount > 1 ? "s" : ""} Desfasada{mispricedCount > 1 ? "s" : ""}</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Líneas & Probabilidades <span className="text-[#FDB827]">Sabermétricas</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Proyección multi-factor (ELO + FIP + Parques LVBP), Cuotas Justas y detección de ineficiencias (+EV).
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {hasCustomOdds && (
            <button
              onClick={onResetOdds}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Restaurar cuotas de mercado originales"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restaurar Cuotas</span>
            </button>
          )}

          <button
            onClick={onOpenSimulator}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1E2B4D] text-[#FDB827] hover:bg-[#1E2B4D]/80 border border-[#FDB827]/30 transition-all shadow-[0_0_12px_rgba(253,184,39,0.1)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulador H2H</span>
          </button>

          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#FDB827] text-[#070B19] hover:bg-[#E5A520] transition-colors shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Tarjeta HD</span>
          </button>
        </div>
      </div>

      {/* ── Barra de Filtros: Selector de Fecha y Selector de Casa de Apuestas ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#070B19] border border-[#1E2B4D]">
        {/* Selector de Fecha */}
        <div className="flex items-center space-x-2 text-xs text-slate-300">
          <CalendarIcon className="w-4 h-4 text-[#FDB827]" />
          <span className="font-semibold text-slate-400">Jornada:</span>
          <input
            type="date"
            value={currentDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-[#0D152B] border border-[#1E2B4D] rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#FDB827]"
          />
        </div>

        {/* Filtro de Casa de Apuestas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center space-x-1 text-slate-400 text-xs mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Casa:</span>
          </div>

          <button
            onClick={() => onSelectBook("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all",
              selectedBook === "all"
                ? "bg-[#FDB827] text-[#070B19]"
                : "bg-[#0D152B] text-slate-300 hover:text-white border border-[#1E2B4D]"
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
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                  isSelected
                    ? "bg-[#1E2B4D] text-[#FDB827] border-[#FDB827]/40 shadow-sm"
                    : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border-[#1E2B4D]"
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
