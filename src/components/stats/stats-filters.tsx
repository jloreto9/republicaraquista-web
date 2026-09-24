"use client";

import { LVBP_TEAMS, LVBP_TEAM_IDS } from "@/lib/constants";
import { Filter } from "lucide-react";

interface StatsFiltersProps {
  selectedTeam: string | number;
  onSelectTeam: (teamId: string | number) => void;
  selectedPhase: string;
  onSelectPhase: (phase: string) => void;
}

export function StatsFilters({
  selectedTeam,
  onSelectTeam,
  selectedPhase,
  onSelectPhase,
}: StatsFiltersProps) {
  const phases = [
    { id: "R", label: "Temporada Regular" },
    { id: "L", label: "Round Robin" },
    { id: "F", label: "Serie Final" },
    { id: "all", label: "Todas las Fases" },
  ];

  return (
    <div className="p-4 rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Phase selector */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center space-x-1 mr-2 text-xs text-slate-400 font-mono">
            <Filter className="w-3.5 h-3.5 text-[#FDB827]" />
            <span>Fase:</span>
          </div>
          {phases.map((p) => {
            const isActive = selectedPhase === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPhase(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
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

        {/* Team selector dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono shrink-0">
            Franquicia:
          </span>
          <select
            value={selectedTeam}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="bg-[#070B19] text-xs font-semibold text-slate-200 border border-[#1E2B4D] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#FDB827]"
          >
            <option value="all">Toda la LVBP (Overall)</option>
            {LVBP_TEAM_IDS.map((id) => (
              <option key={id} value={id}>
                {LVBP_TEAMS[id].name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
