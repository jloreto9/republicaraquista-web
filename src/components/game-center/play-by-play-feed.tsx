"use client";

import { useState, useMemo } from "react";
import { GameCenterPlay } from "@/types/game-center";
import { Activity, Flame, ShieldAlert, Sparkles, Filter } from "lucide-react";

interface PlayByPlayFeedProps {
  plays: GameCenterPlay[];
}

export function PlayByPlayFeed({ plays }: PlayByPlayFeedProps) {
  const [filter, setFilter] = useState<"all" | "hits" | "scoring" | "outs">("all");

  const filteredPlays = useMemo(() => {
    if (filter === "hits") {
      return plays.filter((p) => p.isHit || p.event.includes("Jonrón") || p.event.includes("Doble") || p.event.includes("Triple"));
    }
    if (filter === "scoring") {
      return plays.filter((p) => p.isScoringPlay || p.event.includes("Jonrón"));
    }
    if (filter === "outs") {
      return plays.filter((p) => p.isOut || p.event.includes("Ponche"));
    }
    return plays;
  }, [plays, filter]);

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0D152B] border border-[#1E2B4D] shadow-xl">
      {/* Cabecera y Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-[#1E2B4D] gap-3">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-[#FDB827]" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wider">
            Jugada a Jugada (GameCast Feed)
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            ({filteredPlays.length} eventos)
          </span>
        </div>

        {/* Botones de Filtro */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 text-xs font-medium">
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg border transition-all ${
              filter === "all"
                ? "bg-[#FDB827] text-[#070B19] font-bold border-[#FDB827]"
                : "bg-[#070B19] text-slate-300 border-[#1E2B4D] hover:bg-[#1A264D]"
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("hits")}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1 ${
              filter === "hits"
                ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400"
                : "bg-[#070B19] text-emerald-400 border-[#1E2B4D] hover:bg-[#1A264D]"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Hits / HR</span>
          </button>
          <button
            onClick={() => setFilter("scoring")}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1 ${
              filter === "scoring"
                ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                : "bg-[#070B19] text-[#FDB827] border-[#1E2B4D] hover:bg-[#1A264D]"
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>Carreras</span>
          </button>
          <button
            onClick={() => setFilter("outs")}
            className={`px-2.5 py-1 rounded-lg border transition-all flex items-center space-x-1 ${
              filter === "outs"
                ? "bg-rose-500 text-slate-950 font-bold border-rose-400"
                : "bg-[#070B19] text-rose-400 border-[#1E2B4D] hover:bg-[#1A264D]"
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Ponches / Outs</span>
          </button>
        </div>
      </div>

      {/* Lista de Jugadas */}
      {filteredPlays.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          No hay jugadas registradas bajo este filtro.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-[#1E2B4D]">
          {filteredPlays.map((play) => {
            const isGold = play.badgeColor === "gold";
            const isEmerald = play.badgeColor === "emerald";
            const isCrimson = play.badgeColor === "crimson";
            const isBlue = play.badgeColor === "blue";

            return (
              <div
                key={play.id}
                className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                  play.isScoringPlay
                    ? "bg-[#18264D]/90 border-[#FDB827]/40 shadow-md"
                    : "bg-[#070B19]/70 border-[#1E2B4D]/60 hover:bg-[#0A1126]"
                }`}
              >
                {/* Lado izquierdo: Inning, Badge del Evento y Descripción */}
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center justify-center shrink-0 w-12 pt-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      {play.half === "Alta" ? "▲" : "▼"} {play.inning}
                      {play.inning === 1 ? "ra" : play.inning === 2 ? "da" : play.inning === 3 ? "ra" : "ta"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {play.outs} out{play.outs === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                          isGold
                            ? "bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/50"
                            : isEmerald
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : isCrimson
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                            : isBlue
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                            : "bg-slate-700/30 text-slate-300 border border-slate-600/40"
                        }`}
                      >
                        {play.event}
                      </span>
                      {play.isCaracasBatting && (
                        <span className="text-[9px] font-bold text-[#FDB827] bg-[#FDB827]/10 px-1.5 py-0.2 rounded border border-[#FDB827]/30">
                          LEONES
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 text-xs sm:text-[13px] leading-relaxed">
                      {play.description}
                    </p>
                  </div>
                </div>

                {/* Lado derecho: Marcador en ese instante */}
                <div className="shrink-0 self-end sm:self-center font-mono font-bold text-slate-400 text-[11px] bg-[#070B19] px-2 py-1 rounded border border-[#1E2B4D]">
                  {play.score}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
