"use client";

import { useState } from "react";
import { TeamStanding } from "@/types/sports";
import { MonteCarloResults } from "@/lib/monte-carlo";
import { StandingsTable } from "@/components/standings/standings-table";
import { SimulatorCard } from "@/components/standings/simulator-card";
import { Trophy, Dice5 } from "lucide-react";

interface StandingsViewProps {
  standings: TeamStanding[];
  initialSimulation: MonteCarloResults;
  remainingGames?: [number, number][];
}

export function StandingsView({
  standings,
  initialSimulation,
  remainingGames,
}: StandingsViewProps) {
  const [activeTab, setActiveTab] = useState<"standings" | "simulator">(
    "standings"
  );

  return (
    <div className="space-y-6">
      {/* Pestañas de Navegación de Posiciones */}
      <div className="flex items-center gap-2 border-b border-[#1E2B4D] pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("standings")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
            activeTab === "standings"
              ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)]"
              : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
          }`}
        >
          <Trophy className="w-4 h-4 shrink-0" />
          <span>Posiciones Oficiales</span>
        </button>

        <button
          onClick={() => setActiveTab("simulator")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
            activeTab === "simulator"
              ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)]"
              : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
          }`}
        >
          <Dice5 className="w-4 h-4 shrink-0" />
          <span>Simulador de Clasificación</span>
        </button>
      </div>

      {/* Contenido de la Pestaña Activa */}
      {activeTab === "standings" ? (
        <div className="space-y-4">
          <StandingsTable standings={standings} showPythagorean={true} />
          <div className="p-3.5 rounded-lg bg-[#0D152B]/60 border border-[#1E2B4D] text-[11px] text-slate-400 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong className="text-slate-200">xPCT:</strong> Expectativa Pitagórica = CA^1.83 / (CA^1.83 + CP^1.83)
            </span>
            <span className="text-[#FDB827]">
              Fórmula Pitagórica (Exponente 1.83)
            </span>
          </div>
        </div>
      ) : (
        <SimulatorCard
          standings={standings}
          initialResults={initialSimulation}
          remainingGames={remainingGames}
        />
      )}
    </div>
  );
}
