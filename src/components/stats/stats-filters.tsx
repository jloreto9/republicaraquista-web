"use client";

import { LVBP_TEAMS, LVBP_TEAM_IDS } from "@/lib/constants";
import { Filter } from "lucide-react";

interface StatsFiltersProps {
  selectedTeam: string | number;
  onSelectTeam: (teamId: string | number) => void;
  selectedPhase: string;
  onSelectPhase: (phase: string) => void;
  qualifyingOnly?: boolean;
  onToggleQualifying?: (value: boolean) => void;
  activeTab?: "batting" | "pitching" | "splits" | "fielding";
  thresholdLabel?: string;
}

export function StatsFilters({
  selectedTeam,
  onSelectTeam,
  selectedPhase,
  onSelectPhase,
  qualifyingOnly,
  onToggleQualifying,
  activeTab = "batting",
  thresholdLabel,
}: StatsFiltersProps) {
  const phases = [
    { id: "R", label: "Temporada Regular" },
    { id: "L", label: "Round Robin" },
    { id: "F", label: "Serie Final" },
    { id: "all", label: "Todas las Fases" },
  ];

  return (
    <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-3 sm:space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Phase selector */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center space-x-1 mr-1 sm:mr-2 text-xs text-slate-400 font-mono shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#FDB827]" />
            <span className="hidden sm:inline">Fase:</span>
          </div>
          {phases.map((p) => {
            const isActive = selectedPhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPhase(p.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? "bg-[#1E2B4D] text-[#FDB827] border border-[#FDB827]/40 shadow-[0_0_10px_rgba(253,184,39,0.1)]"
                    : "text-slate-300 hover:text-slate-100 hover:bg-[#131E3D]/60"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Team selector & Qualifying toggle */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Team selector dropdown */}
          <div className="flex items-center space-x-2 flex-1 sm:flex-none">
            <span className="text-xs text-slate-400 font-mono shrink-0">
              Franquicia:
            </span>
            <select
              value={selectedTeam}
              onChange={(e) => onSelectTeam(e.target.value)}
              className="flex-1 sm:flex-none bg-[#070B19] text-xs font-semibold text-slate-200 border border-[#1E2B4D] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#FDB827]"
            >
              <option value="all">Toda la LVBP (Overall)</option>
              {LVBP_TEAM_IDS.map((id) => (
                <option key={id} value={id}>
                  {LVBP_TEAMS[id].name}
                </option>
              ))}
            </select>
          </div>

          {/* Qualifying switch toggle */}
          {onToggleQualifying && (activeTab === "batting" || activeTab === "pitching") && (
            <button
              type="button"
              onClick={() => onToggleQualifying(!qualifyingOnly)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border shrink-0 ${
                qualifyingOnly
                  ? "bg-[#1E2B4D] border-[#FDB827]/60 text-[#FDB827] shadow-[0_0_12px_rgba(253,184,39,0.15)]"
                  : "bg-[#070B19] border-[#1E2B4D] text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
              title={
                activeTab === "batting"
                  ? "Regla oficial de bateo: Mínimo 3.1 Apariciones al Plato por juego del equipo"
                  : "Regla oficial de pitcheo: Mínimo 1.0 Entrada Lanzada por juego del equipo"
              }
            >
              <div
                className={`w-6 h-3.5 flex items-center rounded-full p-0.5 transition-colors ${
                  qualifyingOnly ? "bg-[#FDB827]" : "bg-slate-700"
                }`}
              >
                <div
                  className={`bg-[#070B19] w-2.5 h-2.5 rounded-full shadow transform transition-transform ${
                    qualifyingOnly ? "translate-x-2.5" : "translate-x-0"
                  }`}
                />
              </div>
              <span>
                {activeTab === "batting" ? "Solo Calificados (3.1 AP/J)" : "Solo Calificados (1.0 IP/J)"}
              </span>
              {thresholdLabel && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    qualifyingOnly
                      ? "bg-[#FDB827]/20 text-[#FDB827] border border-[#FDB827]/30"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {thresholdLabel}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
