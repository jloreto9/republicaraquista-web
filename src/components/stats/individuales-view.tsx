"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { BattingStats, PitchingStats } from "@/types/sports";
import { StatsFilters } from "@/components/stats/stats-filters";
import { BattingTable } from "@/components/stats/batting-table";
import { PitchingTable } from "@/components/stats/pitching-table";
import { PlayerSplitsView } from "@/components/stats/splits/player-splits-view";
import { Flame, Target, Shield, Loader2, Sparkles, Zap } from "lucide-react";
import { useSeason } from "@/context/season-context";

interface IndividualesViewProps {
  initialBattingStats: BattingStats[];
  initialPitchingStats: PitchingStats[];
  initialSeason?: number;
  initialTeamGamesMap?: Record<number, number>;
  initialMaxGames?: number;
}

export function IndividualesView({
  initialBattingStats,
  initialPitchingStats,
  initialSeason = 2026,
  initialTeamGamesMap = {},
  initialMaxGames = 56,
}: IndividualesViewProps) {
  const { season: globalSeason, setSeason: setGlobalSeason } = useSeason();
  const [season, setSeason] = useState<number>(globalSeason || initialSeason);
  const isFirstMount = useRef(true);
  const [activeTab, setActiveTab] = useState<"batting" | "pitching" | "splits" | "fielding">(
    "batting"
  );
  const [selectedPhase, setSelectedPhase] = useState<string>("R");
  const [selectedTeam, setSelectedTeam] = useState<string | number>("all");
  const [qualifyingOnly, setQualifyingOnly] = useState<boolean>(true); // Activado por defecto

  const [teamGamesMap, setTeamGamesMap] = useState<Record<number, number>>(initialTeamGamesMap);
  const [maxGames, setMaxGames] = useState<number>(initialMaxGames);

  const [battingStats, setBattingStats] = useState<BattingStats[]>(initialBattingStats);
  const [pitchingStats, setPitchingStats] = useState<PitchingStats[]>(initialPitchingStats);
  const [loading, setLoading] = useState<boolean>(false);

  // Estado para pre-seleccionar jugador al navegar a splits desde las tablas
  const [targetSplitPlayer, setTargetSplitPlayer] = useState<{
    id: number;
    type: "batter" | "pitcher";
  } | null>(null);

  // Sincronizar si la temporada global cambia desde el Header u otra vista
  useEffect(() => {
    if (globalSeason && globalSeason !== season) {
      setSeason(globalSeason);
    }
  }, [globalSeason]);

  // Carga reactiva de estadísticas al cambiar filtros o temporada
  useEffect(() => {
    let isMounted = true;
    async function fetchStats() {
      if (activeTab === "splits") return;
      setLoading(true);
      try {
        const teamParam = selectedTeam === "all" ? "all" : selectedTeam;
        if (activeTab === "batting") {
          const res = await fetch(
            `/api/stats/batting?season=${season}&phase=${selectedPhase}&team_id=${teamParam}&limit=250`
          );
          if (res.ok) {
            const json = await res.json();
            if (isMounted) {
              setBattingStats(json.data || json.stats || []);
              if (json.teamGamesMap) setTeamGamesMap(json.teamGamesMap);
              if (typeof json.maxGames === "number" && json.maxGames > 0) {
                setMaxGames(json.maxGames);
              }
            }
          }
        } else if (activeTab === "pitching") {
          const res = await fetch(
            `/api/stats/pitching?season=${season}&phase=${selectedPhase}&team_id=${teamParam}&limit=250`
          );
          if (res.ok) {
            const json = await res.json();
            if (isMounted) {
              setPitchingStats(json.data || json.stats || []);
              if (json.teamGamesMap) setTeamGamesMap(json.teamGamesMap);
              if (typeof json.maxGames === "number" && json.maxGames > 0) {
                setMaxGames(json.maxGames);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar estadísticas individuales:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (
        selectedPhase !== "R" ||
        selectedTeam !== "all" ||
        (activeTab === "pitching" && pitchingStats.length === 0)
      ) {
        fetchStats();
      }
      return;
    }

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedPhase, selectedTeam, season]);

  // Juegos de referencia del equipo seleccionado o el máximo de la liga
  const currentTeamGames = useMemo(() => {
    if (selectedTeam !== "all") {
      const g = teamGamesMap[Number(selectedTeam)];
      if (typeof g === "number") return g;
    }
    return maxGames;
  }, [selectedTeam, teamGamesMap, maxGames]);

  // Umbrales oficiales de calificación (3.1 AP/Juego para bateo, 1.0 IP/Juego para pitcheo)
  const minPaThreshold = Math.round(currentTeamGames * 3.1);
  const minIpThreshold = Number((currentTeamGames * 1.0).toFixed(1));

  // Label para el botón toggle de StatsFilters
  const thresholdBadgeLabel =
    activeTab === "batting"
      ? `≥ ${minPaThreshold} AP`
      : activeTab === "pitching"
      ? `≥ ${minIpThreshold.toFixed(1)} IP`
      : undefined;

  // Filtrado de bateadores
  const displayedBattingStats = useMemo(() => {
    if (!qualifyingOnly) return battingStats;
    return battingStats.filter((b) => {
      const tGames = teamGamesMap[b.teamId];
      const teamGames =
        selectedTeam !== "all"
          ? currentTeamGames
          : (typeof tGames === "number" ? tGames : maxGames);
      const reqPa = Math.max(0, Math.round(teamGames * 3.1));
      const playerPa =
        b.plateAppearances ?? b.pa ?? ((b.atBats || 0) + (b.walks || 0));
      return playerPa >= reqPa;
    });
  }, [battingStats, qualifyingOnly, selectedTeam, teamGamesMap, maxGames, currentTeamGames]);

  // Filtrado de lanzadores
  const displayedPitchingStats = useMemo(() => {
    if (!qualifyingOnly) return pitchingStats;
    return pitchingStats.filter((p) => {
      const tGames = teamGamesMap[p.teamId];
      const teamGames =
        selectedTeam !== "all"
          ? currentTeamGames
          : (typeof tGames === "number" ? tGames : maxGames);
      const reqIp = Math.max(0, teamGames * 1.0);
      return (p.inningsPitched || 0) >= (reqIp > 0 ? reqIp - 0.05 : 0);
    });
  }, [pitchingStats, qualifyingOnly, selectedTeam, teamGamesMap, maxGames, currentTeamGames]);

  const handleSelectBatterForSplits = (playerId: number) => {
    setTargetSplitPlayer({ id: playerId, type: "batter" });
    setActiveTab("splits");
  };

  const handleSelectPitcherForSplits = (playerId: number) => {
    setTargetSplitPlayer({ id: playerId, type: "pitcher" });
    setActiveTab("splits");
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#1E2B4D] pb-3 sm:pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex items-center gap-1.5 sm:space-x-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("batting")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "batting"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Bateo Sabermétrico</span>
            <span className="sm:hidden">Bateo</span>
          </button>

          <button
            onClick={() => setActiveTab("pitching")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "pitching"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Pitcheo & Efectividad</span>
            <span className="sm:hidden">Pitcheo</span>
          </button>

          <button
            onClick={() => setActiveTab("splits")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "splits"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0 text-[#FDB827]" />
            <span className="hidden sm:inline">Splits Situacionales</span>
            <span className="sm:hidden">Splits</span>
          </button>

          <button
            onClick={() => setActiveTab("fielding")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "fielding"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Fildeo & Defensa</span>
            <span className="sm:hidden">Fildeo</span>
          </button>
        </div>

        {/* Selector de Temporada */}
        <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
          <Sparkles className="w-3.5 h-3.5 text-[#FDB827]" />
          <span className="text-[11px] text-slate-400 font-medium">Temporada:</span>
          <select
            value={season}
            onChange={(e) => {
              const s = Number(e.target.value);
              setSeason(s);
              setGlobalSeason(s);
            }}
            className="bg-transparent text-[#FDB827] text-xs font-bold font-mono focus:outline-none cursor-pointer"
          >
            <option value={2026} className="bg-[#070B19] text-slate-200">2026-27 (En Curso)</option>
            <option value={2025} className="bg-[#070B19] text-slate-200">2025-26</option>
          </select>
        </div>
      </div>

      {/* Barra de Filtros General (para Bateo y Pitcheo) */}
      {activeTab !== "splits" && (
        <StatsFilters
          selectedPhase={selectedPhase}
          onSelectPhase={setSelectedPhase}
          selectedTeam={selectedTeam}
          onSelectTeam={setSelectedTeam}
          qualifyingOnly={qualifyingOnly}
          onToggleQualifying={setQualifyingOnly}
          activeTab={activeTab}
          thresholdLabel={thresholdBadgeLabel}
        />
      )}

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Mostrando {displayedBattingStats.length} de {battingStats.length} bateadores{" "}
                {qualifyingOnly ? "(solo calificados)" : "(todos)"}
              </span>
              {qualifyingOnly && (
                <span className="bg-[#1E2B4D] text-[#FDB827] text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[#FDB827]/30">
                  Mínimo: {minPaThreshold} AP ({currentTeamGames} J × 3.1)
                </span>
              )}
            </div>
            <span className="text-[#FDB827]">Orden por defecto: OPS descendente</span>
          </div>
          {displayedBattingStats.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs space-y-3">
              <p>
                Ningún bateador alcanza el mínimo requerido de {minPaThreshold} AP ({currentTeamGames} juegos × 3.1) con los filtros actuales.
              </p>
              <button
                type="button"
                onClick={() => setQualifyingOnly(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-[#070B19] text-xs font-semibold transition-all border border-[#FDB827]/30"
              >
                Ver todos los bateadores
              </button>
            </div>
          ) : (
            <BattingTable
              stats={displayedBattingStats}
              onSelectPlayerForSplits={handleSelectBatterForSplits}
            />
          )}
        </div>
      ) : activeTab === "pitching" ? (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Mostrando {displayedPitchingStats.length} de {pitchingStats.length} lanzadores{" "}
                {qualifyingOnly ? "(solo calificados)" : "(todos)"}
              </span>
              {qualifyingOnly && (
                <span className="bg-[#1E2B4D] text-[#FDB827] text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[#FDB827]/30">
                  Mínimo: {minIpThreshold.toFixed(1)} IP ({currentTeamGames} J × 1.0)
                </span>
              )}
            </div>
            <span className="text-[#FDB827]">Orden por defecto: ERA ascendente</span>
          </div>
          {displayedPitchingStats.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs space-y-3">
              <p>
                Ningún lanzador alcanza el mínimo requerido de {minIpThreshold.toFixed(1)} IP ({currentTeamGames} juegos × 1.0) con los filtros actuales.
              </p>
              <button
                type="button"
                onClick={() => setQualifyingOnly(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-[#070B19] text-xs font-semibold transition-all border border-[#FDB827]/30"
              >
                Ver todo el cuerpo de lanzadores
              </button>
            </div>
          ) : (
            <PitchingTable
              stats={displayedPitchingStats}
              onSelectPlayerForSplits={handleSelectPitcherForSplits}
            />
          )}
        </div>
      ) : activeTab === "splits" ? (
        <PlayerSplitsView
          initialPlayerId={targetSplitPlayer?.id}
          initialType={targetSplitPlayer?.type}
          season={season}
        />
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
