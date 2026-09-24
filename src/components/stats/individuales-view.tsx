"use client";

import { useState, useEffect } from "react";
import { BattingStats, PitchingStats } from "@/types/sports";
import { StatsFilters } from "@/components/stats/stats-filters";
import { BattingTable } from "@/components/stats/batting-table";
import { PitchingTable } from "@/components/stats/pitching-table";
import { Flame, Target, Shield, Loader2, Sparkles } from "lucide-react";

interface IndividualesViewProps {
  initialBattingStats: BattingStats[];
  initialPitchingStats: PitchingStats[];
}

export function IndividualesView({
  initialBattingStats,
  initialPitchingStats,
}: IndividualesViewProps) {
  const [activeTab, setActiveTab] = useState<"batting" | "pitching" | "fielding">("batting");
  const [selectedPhase, setSelectedPhase] = useState<string>("R");
  const [selectedTeam, setSelectedTeam] = useState<string | number>("all");

  const [battingStats, setBattingStats] = useState<BattingStats[]>(initialBattingStats);
  const [pitchingStats, setPitchingStats] = useState<PitchingStats[]>(initialPitchingStats);
  const [loading, setLoading] = useState<boolean>(false);

  // Carga reactiva de estadísticas al cambiar filtros
  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      setLoading(true);
      try {
        const teamParam = selectedTeam === "all" ? "all" : selectedTeam;
        if (activeTab === "batting") {
          const res = await fetch(
            `/api/stats/batting?season=2025&phase=${selectedPhase}&team_id=${teamParam}&limit=60`
          );
          if (res.ok) {
            const json = await res.json();
            if (isMounted) setBattingStats(json.data || json.stats || []);
          }
        } else if (activeTab === "pitching") {
          const res = await fetch(
            `/api/stats/pitching?season=2025&phase=${selectedPhase}&team_id=${teamParam}&limit=60`
          );
          if (res.ok) {
            const json = await res.json();
            if (isMounted) setPitchingStats(json.data || json.stats || []);
          }
        }
      } catch (err) {
        console.error("Error al cargar estadísticas individuales:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // Si los filtros cambiaron con respecto al estado inicial
    if (selectedPhase !== "R" || selectedTeam !== "all" || (activeTab === "pitching" && pitchingStats.length === 0)) {
      fetchStats();
    }
    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedPhase, selectedTeam, pitchingStats.length]);

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#1E2B4D] pb-3 sm:pb-4">
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("batting")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "batting"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)]"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Bateo Sabermétrico</span>
            <span className="sm:hidden">Bateo</span>
          </button>

          <button
            onClick={() => setActiveTab("pitching")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "pitching"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)]"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Pitcheo & Efectividad</span>
            <span className="sm:hidden">Pitcheo</span>
          </button>

          <button
            onClick={() => setActiveTab("fielding")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "fielding"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)]"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Fildeo & Defensa</span>
            <span className="sm:hidden">Fildeo</span>
          </button>
        </div>

        {/* Badge Informativo */}
        <div className="flex items-center justify-center sm:justify-start space-x-2 text-[10px] sm:text-[11px] font-mono text-slate-400 bg-[#070B19] px-3 py-1.5 rounded-lg border border-[#1E2B4D]">
          <Sparkles className="w-3.5 h-3.5 text-[#FDB827]" />
          <span>Líderes Oficiales • Temporada 2025</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <StatsFilters
        selectedPhase={selectedPhase}
        onSelectPhase={setSelectedPhase}
        selectedTeam={selectedTeam}
        onSelectTeam={setSelectedTeam}
      />

      {/* Contenedor de Datos con Spinner */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center space-y-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <Loader2 className="w-6 h-6 text-[#FDB827] animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Consultando registros en Supabase...
          </span>
        </div>
      ) : activeTab === "batting" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Mostrando {battingStats.length} bateadores clasificados</span>
            <span className="text-[#FDB827]">Orden por defecto: OPS descendente</span>
          </div>
          <BattingTable stats={battingStats} />
        </div>
      ) : activeTab === "pitching" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Mostrando {pitchingStats.length} lanzadores clasificados</span>
            <span className="text-[#FDB827]">Orden por defecto: ERA ascendente</span>
          </div>
          <PitchingTable stats={pitchingStats} />
        </div>
      ) : (
        <div className="p-12 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-3">
          <Shield className="w-8 h-8 text-[#FDB827] mx-auto opacity-80" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Módulo de Fildeo & Defensa Individual
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Las estadísticas defensivas (PO, A, E, TC, FPCT y RF/9) están siendo procesadas por el
            pipeline diario de jugadas de la LVBP. La tabla defensiva completa estará activa en la
            próxima sincronización de la base de datos.
          </p>
        </div>
      )}
    </div>
  );
}
