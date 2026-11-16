"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BattingStats, PitchingStats, FieldingStats } from "@/types/sports";
import { StatsFilters } from "@/components/stats/stats-filters";
import { BattingTable } from "@/components/stats/batting-table";
import { PitchingTable } from "@/components/stats/pitching-table";
import { FieldingTable } from "@/components/stats/fielding-table";
import { AwardsView } from "@/components/stats/awards-view";
import { PlayerSplitsView } from "@/components/stats/splits/player-splits-view";
import { Flame, Target, Shield, Loader2, Sparkles, Zap, Trophy } from "lucide-react";
import { useSeason } from "@/context/season-context";

interface IndividualesViewProps {
  initialBattingStats: BattingStats[];
  initialPitchingStats: PitchingStats[];
  initialFieldingStats?: FieldingStats[];
  initialSeason?: number;
  initialTeamGamesMap?: Record<number, number>;
  initialTeamWinPctMap?: Record<number, number>;
  initialMaxGames?: number;
}

type IndividualesTab = "batting" | "pitching" | "awards" | "splits" | "fielding";

function resolveTabFromParams(params: ReturnType<typeof useSearchParams>): IndividualesTab {
  const tabParam = params?.get("tab");
  if (tabParam === "splits") return "splits";
  if (tabParam === "pitching") return "pitching";
  if (tabParam === "awards" || tabParam === "premios") return "awards";
  if (tabParam === "fielding") return "fielding";
  return "batting";
}

function resolveSplitPlayerFromParams(
  params: ReturnType<typeof useSearchParams>
): { id: number; type: "batter" | "pitcher" } | null {
  if (params?.get("tab") !== "splits") return null;
  const playerParam = params.get("player");
  if (!playerParam) return null;
  return {
    id: Number(playerParam),
    type: params.get("type") === "pitcher" ? "pitcher" : "batter",
  };
}

export function IndividualesView({
  initialBattingStats,
  initialPitchingStats,
  initialFieldingStats = [],
  initialSeason = 2026,
  initialTeamGamesMap = {},
  initialTeamWinPctMap = {},
  initialMaxGames = 56,
}: IndividualesViewProps) {
  const { season: globalSeason, setSeason: setGlobalSeason } = useSeason();
  const season = globalSeason || initialSeason;
  const loadedScopeRef = useRef<{ season: number; phase: string }>({
    season: initialSeason,
    phase: "R",
  });
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString() ?? "";
  const [prevSearchParamsKey, setPrevSearchParamsKey] = useState(searchParamsKey);
  const [activeTab, setActiveTab] = useState<IndividualesTab>(() =>
    resolveTabFromParams(searchParams)
  );
  const [selectedPhase, setSelectedPhase] = useState<string>("R");
  const [selectedTeam, setSelectedTeam] = useState<string | number>("all");
  const [qualifyingOnly, setQualifyingOnly] = useState<boolean>(true); // Activado por defecto

  const [teamGamesMap, setTeamGamesMap] = useState<Record<number, number>>(initialTeamGamesMap);
  const [teamWinPctMap, setTeamWinPctMap] =
    useState<Record<number, number>>(initialTeamWinPctMap);
  const [maxGames, setMaxGames] = useState<number>(initialMaxGames);

  const [battingStats, setBattingStats] = useState<BattingStats[]>(initialBattingStats);
  const [pitchingStats, setPitchingStats] = useState<PitchingStats[]>(initialPitchingStats);
  const [fieldingStats, setFieldingStats] = useState<FieldingStats[]>(initialFieldingStats);
  const [loading, setLoading] = useState<boolean>(false);

  // Estado para pre-seleccionar jugador al navegar a splits desde las tablas
  const [targetSplitPlayer, setTargetSplitPlayer] = useState<{
    id: number;
    type: "batter" | "pitcher";
  } | null>(() => resolveSplitPlayerFromParams(searchParams));

  if (searchParamsKey !== prevSearchParamsKey) {
    setPrevSearchParamsKey(searchParamsKey);
    if (searchParams?.get("tab")) {
      setActiveTab(resolveTabFromParams(searchParams));
    }
    const nextSplit = resolveSplitPlayerFromParams(searchParams);
    if (nextSplit) {
      setTargetSplitPlayer(nextSplit);
    }
  }

  // Carga reactiva del pool completo de liga al cambiar temporada o fase
  useEffect(() => {
    if (
      loadedScopeRef.current.season === season &&
      loadedScopeRef.current.phase === selectedPhase
    ) {
      return;
    }

    let isMounted = true;
    async function fetchLeagueStats() {
      setLoading(true);
      try {
        const [batRes, pitRes, fldRes] = await Promise.all([
          fetch(
            `/api/stats/batting?season=${season}&phase=${selectedPhase}&team_id=all&limit=500`
          ),
          fetch(
            `/api/stats/pitching?season=${season}&phase=${selectedPhase}&team_id=all&limit=500`
          ),
          fetch(
            `/api/stats/fielding?season=${season}&phase=${selectedPhase}&team_id=all&limit=1000`
          ),
        ]);

        if (!isMounted) return;

        if (batRes.ok) {
          const batJson = await batRes.json();
          if (isMounted) {
            setBattingStats(batJson.data || batJson.stats || []);
            if (batJson.teamGamesMap) setTeamGamesMap(batJson.teamGamesMap);
            if (batJson.teamWinPctMap) setTeamWinPctMap(batJson.teamWinPctMap);
            if (typeof batJson.maxGames === "number" && batJson.maxGames > 0) {
              setMaxGames(batJson.maxGames);
            }
          }
        }

        if (pitRes.ok) {
          const pitJson = await pitRes.json();
          if (isMounted) {
            setPitchingStats(pitJson.data || pitJson.stats || []);
            if (pitJson.teamGamesMap) setTeamGamesMap(pitJson.teamGamesMap);
            if (pitJson.teamWinPctMap) setTeamWinPctMap(pitJson.teamWinPctMap);
            if (typeof pitJson.maxGames === "number" && pitJson.maxGames > 0) {
              setMaxGames(pitJson.maxGames);
            }
          }
        }

        if (fldRes.ok) {
          const fldJson = await fldRes.json();
          if (isMounted) {
            setFieldingStats(fldJson.data || fldJson.stats || []);
          }
        }

        if (batRes.ok || pitRes.ok || fldRes.ok) {
          loadedScopeRef.current = { season, phase: selectedPhase };
        }
      } catch (err) {
        console.error("Error al cargar estadísticas individuales:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchLeagueStats();
    return () => {
      isMounted = false;
    };
  }, [selectedPhase, season]);

  // Juegos de referencia del equipo seleccionado o el máximo de la liga
  const currentTeamGames = useMemo(() => {
    if (selectedTeam !== "all") {
      const g = teamGamesMap[Number(selectedTeam)];
      if (typeof g === "number") return g;
    }
    return maxGames;
  }, [selectedTeam, teamGamesMap, maxGames]);

  // Umbrales oficiales de calificación (3.1 AP/J bateo, 1.0 IP/J pitcheo, 0.5 TC/J fildeo)
  const minPaThreshold = Math.round(currentTeamGames * 3.1);
  const minIpThreshold = Number((currentTeamGames * 1.0).toFixed(1));
  const minTcThreshold = currentTeamGames > 0 ? Math.max(5, Math.round(currentTeamGames * 0.5)) : 0;

  // Label para el botón toggle de StatsFilters
  const thresholdBadgeLabel =
    activeTab === "batting"
      ? `≥ ${minPaThreshold} AP`
      : activeTab === "pitching"
      ? `≥ ${minIpThreshold.toFixed(1)} IP`
      : activeTab === "fielding"
      ? `≥ ${minTcThreshold} TC`
      : undefined;

  const teamBattingStats = useMemo(() => {
    if (selectedTeam === "all") return battingStats;
    const targetId = Number(selectedTeam);
    return battingStats.filter((b) => b.teamId === targetId);
  }, [battingStats, selectedTeam]);

  const teamPitchingStats = useMemo(() => {
    if (selectedTeam === "all") return pitchingStats;
    const targetId = Number(selectedTeam);
    return pitchingStats.filter((p) => p.teamId === targetId);
  }, [pitchingStats, selectedTeam]);

  const teamFieldingStats = useMemo(() => {
    if (selectedTeam === "all") return fieldingStats;
    const targetId = Number(selectedTeam);
    return fieldingStats.filter((f) => f.teamId === targetId);
  }, [fieldingStats, selectedTeam]);

  // Filtrado de bateadores
  const displayedBattingStats = useMemo(() => {
    if (!qualifyingOnly) return teamBattingStats;
    return teamBattingStats.filter((b) => {
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
  }, [teamBattingStats, qualifyingOnly, selectedTeam, teamGamesMap, maxGames, currentTeamGames]);

  // Filtrado de lanzadores
  const displayedPitchingStats = useMemo(() => {
    if (!qualifyingOnly) return teamPitchingStats;
    return teamPitchingStats.filter((p) => {
      const tGames = teamGamesMap[p.teamId];
      const teamGames =
        selectedTeam !== "all"
          ? currentTeamGames
          : (typeof tGames === "number" ? tGames : maxGames);
      const reqIp = Math.max(0, teamGames * 1.0);
      return (p.inningsPitched || 0) >= (reqIp > 0 ? reqIp - 0.05 : 0);
    });
  }, [teamPitchingStats, qualifyingOnly, selectedTeam, teamGamesMap, maxGames, currentTeamGames]);

  // Filtrado de defensores
  const displayedFieldingStats = useMemo(() => {
    if (!qualifyingOnly) return teamFieldingStats;
    return teamFieldingStats.filter((f) => {
      const tGames = teamGamesMap[f.teamId];
      const teamGames =
        selectedTeam !== "all"
          ? currentTeamGames
          : (typeof tGames === "number" ? tGames : maxGames);
      const reqTc = teamGames > 0 ? Math.max(5, Math.round(teamGames * 0.5)) : 0;
      return (f.totalChances || 0) >= reqTc;
    });
  }, [teamFieldingStats, qualifyingOnly, selectedTeam, teamGamesMap, maxGames, currentTeamGames]);

  const handleSelectBatterForSplits = (playerId: number) => {
    setTargetSplitPlayer({ id: playerId, type: "batter" });
    setActiveTab("splits");
  };

  const handleSelectPitcherForSplits = (playerId: number) => {
    setTargetSplitPlayer({ id: playerId, type: "pitcher" });
    setActiveTab("splits");
  };

  const handleSelectFielderForSplits = (playerId: number) => {
    const isPitcherOnly =
      fieldingStats.some((f) => f.playerId === playerId && f.position === "P") &&
      !battingStats.some((b) => b.playerId === playerId && b.atBats > 0);
    setTargetSplitPlayer({ id: playerId, type: isPitcherOnly ? "pitcher" : "batter" });
    setActiveTab("splits");
  };

  return (
    <div className="space-y-6">
      {/* Selector de Pestañas Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-[#1E2B4D] pb-3 sm:pb-4">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("batting")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "batting"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Bateo</span>
          </button>

          <button
            onClick={() => setActiveTab("pitching")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "pitching"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span>Pitcheo</span>
          </button>

          <button
            onClick={() => setActiveTab("awards")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "awards"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Trophy
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === "awards" ? "text-[#070B19]" : "text-[#FDB827]"
              }`}
            />
            <span>Premios</span>
          </button>

          <button
            onClick={() => setActiveTab("splits")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "splits"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Zap
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === "splits" ? "text-[#070B19]" : "text-[#FDB827]"
              }`}
            />
            <span>Splits</span>
          </button>

          <button
            onClick={() => setActiveTab("fielding")}
            className={`flex items-center justify-center sm:justify-start space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "fielding"
                ? "bg-[#FDB827] text-[#070B19] shadow-[0_0_15px_rgba(253,184,39,0.25)] font-bold"
                : "bg-[#0D152B] text-slate-300 hover:text-slate-100 hover:bg-[#131E3D] border border-[#1E2B4D]"
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Fildeo</span>
          </button>
        </div>

        {/* Selector de Temporada */}
        <div className="flex items-center gap-1.5 bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
          <Sparkles className="w-3.5 h-3.5 text-[#FDB827]" />
          <span className="text-[11px] text-slate-400 font-medium">Temporada:</span>
          <select
            value={season}
            onChange={(e) => {
              setGlobalSeason(Number(e.target.value));
            }}
            className="bg-transparent text-[#FDB827] text-xs font-bold font-mono focus:outline-none cursor-pointer"
          >
            <option value={2026} className="bg-[#070B19] text-slate-200">2026-27 (En Curso)</option>
            <option value={2025} className="bg-[#070B19] text-slate-200">2025-26</option>
          </select>
        </div>
      </div>

      {/* Barra de Filtros General (para Bateo, Pitcheo, Premios y Fildeo) */}
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
                Mostrando {displayedBattingStats.length} de {teamBattingStats.length} bateadores{" "}
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
                Mostrando {displayedPitchingStats.length} de {teamPitchingStats.length} lanzadores{" "}
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
      ) : activeTab === "awards" ? (
        <AwardsView
          battingStats={battingStats}
          pitchingStats={pitchingStats}
          teamGamesMap={teamGamesMap}
          teamWinPctMap={teamWinPctMap}
          maxGames={maxGames}
          selectedTeam={selectedTeam}
          onSelectBatterForSplits={handleSelectBatterForSplits}
          onSelectPitcherForSplits={handleSelectPitcherForSplits}
        />
      ) : activeTab === "splits" ? (
        <PlayerSplitsView
          initialPlayerId={targetSplitPlayer?.id}
          initialType={targetSplitPlayer?.type}
          season={season}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-slate-400 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                Mostrando {displayedFieldingStats.length} de {teamFieldingStats.length} registros defensivos{" "}
                {qualifyingOnly ? "(solo calificados)" : "(todos)"}
              </span>
              {qualifyingOnly && minTcThreshold > 0 && (
                <span className="bg-[#1E2B4D] text-[#FDB827] text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-[#FDB827]/30">
                  Mínimo: {minTcThreshold} TC
                </span>
              )}
            </div>
            <span className="text-[#FDB827]">Orden por defecto: TC descendente</span>
          </div>
          {displayedFieldingStats.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] text-slate-400 text-xs space-y-3">
              <p>
                Ningún defensor alcanza el mínimo requerido de {minTcThreshold} lances totales (TC) con los filtros actuales.
              </p>
              <button
                type="button"
                onClick={() => setQualifyingOnly(false)}
                className="px-3 py-1.5 rounded-lg bg-[#1E2B4D] hover:bg-[#FDB827] text-[#FDB827] hover:text-[#070B19] text-xs font-semibold transition-all border border-[#FDB827]/30"
              >
                Ver todos los registros defensivos
              </button>
            </div>
          ) : (
            <FieldingTable
              stats={displayedFieldingStats}
              onSelectPlayerForSplits={handleSelectFielderForSplits}
            />
          )}
        </div>
      )}
    </div>
  );
}
