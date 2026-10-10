"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  PlayerSplitsProfile,
  PlayerSelectorItem,
  PlayerSplitRow,
  PitcherSplitRow,
} from "@/types/player-splits";
import { SplitTableGroup } from "./split-table-group";
import {
  Search,
  Users,
  Calendar,
  Flame,
  Target,
  Clock,
  Sparkles,
  Loader2,
  ChevronDown,
  Layers,
  MapPin,
  ShieldAlert,
} from "lucide-react";

interface PlayerSplitsViewProps {
  initialPlayerId?: number;
  initialType?: "batter" | "pitcher";
  season?: number;
}

export function PlayerSplitsView({
  initialPlayerId,
  initialType = "batter",
  season = 2025,
}: PlayerSplitsViewProps) {
  const [playerType, setPlayerType] = useState<"batter" | "pitcher">(initialType);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    initialPlayerId || (initialType === "batter" ? 625506 : 682949) // Default Aldrem Corredor o Christian Suarez
  );

  const [playersList, setPlayersList] = useState<PlayerSelectorItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  const [profile, setProfile] = useState<PlayerSplitsProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Cargar lista de jugadores al iniciar
  useEffect(() => {
    let isMounted = true;
    async function fetchPlayers() {
      setLoadingList(true);
      try {
        const res = await fetch(`/api/stats/player-splits?mode=list&season=${season}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.players) {
            setPlayersList(json.players);
            // Si no hay jugador seleccionado o no coincide el tipo
            if (!selectedPlayerId && json.players.length > 0) {
              const firstMatching = json.players.find(
                (p: PlayerSelectorItem) => p.type === playerType
              );
              if (firstMatching) setSelectedPlayerId(firstMatching.id);
            }
          }
        }
      } catch (err) {
        console.error("Error al cargar lista de jugadores:", err);
      } finally {
        if (isMounted) setLoadingList(false);
      }
    }
    fetchPlayers();
    return () => {
      isMounted = false;
    };
  }, [playerType, selectedPlayerId, season]);

  // Cargar perfil del jugador seleccionado
  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      if (!selectedPlayerId) return;
      setLoadingProfile(true);
      try {
        const res = await fetch(
          `/api/stats/player-splits?player_id=${selectedPlayerId}&type=${playerType}&season=${season}`
        );
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.profile) {
            setProfile(json.profile);
          }
        } else {
          if (isMounted) setProfile(null);
        }
      } catch (err) {
        console.error("Error al cargar perfil de splits:", err);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [selectedPlayerId, playerType]);

  // Filtrar lista de jugadores según búsqueda y tipo
  const filteredPlayers = useMemo(() => {
    return playersList
      .filter((p) => p.type === playerType)
      .filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.teamAbbr.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [playersList, playerType, searchQuery]);

  const selectedPlayerMeta = useMemo(() => {
    return playersList.find((p) => p.id === selectedPlayerId);
  }, [playersList, selectedPlayerId]);

  return (
    <div className="space-y-6">
      {/* Barra de Control: Selector de Rol y Buscador de Jugador */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0D152B] p-3 sm:p-4 rounded-xl border border-[#1E2B4D]">
        {/* Conmutador Bateador / Lanzador */}
        <div className="flex items-center space-x-2 bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D] w-full md:w-auto">
          <button
            onClick={() => {
              setPlayerType("batter");
              // Seleccionar primer bateador disponible
              const firstBat = playersList.find((p) => p.type === "batter");
              if (firstBat) setSelectedPlayerId(firstBat.id);
            }}
            className={`flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              playerType === "batter"
                ? "bg-[#FDB827] text-[#070B19] shadow-sm font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Bateadores</span>
          </button>
          <button
            onClick={() => {
              setPlayerType("pitcher");
              // Seleccionar primer pitcher disponible
              const firstPit = playersList.find((p) => p.type === "pitcher");
              if (firstPit) setSelectedPlayerId(firstPit.id);
            }}
            className={`flex-1 md:flex-none flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              playerType === "pitcher"
                ? "bg-[#FDB827] text-[#070B19] shadow-sm font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Lanzadores</span>
          </button>
        </div>

        {/* Buscador Desplegable de Jugador */}
        <div className="relative w-full md:w-80">
          <button
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#070B19] border border-[#1E2B4D] rounded-xl text-xs hover:border-[#FDB827]/50 transition-colors text-left"
          >
            <div className="flex items-center space-x-2 truncate">
              {selectedPlayerMeta ? (
                <>
                  <div className="w-5 h-5 rounded-full overflow-hidden bg-[#131E3D] shrink-0 border border-[#1E2B4D]">
                    <Image
                      src={selectedPlayerMeta.avatarUrl}
                      alt={selectedPlayerMeta.name}
                      width={20}
                      height={20}
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.src = selectedPlayerMeta.teamLogo;
                      }}
                    />
                  </div>
                  <span className="font-semibold text-slate-100 truncate">
                    {selectedPlayerMeta.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#FDB827]">
                    ({selectedPlayerMeta.teamAbbr})
                  </span>
                </>
              ) : (
                <span className="text-slate-400">Seleccionar Jugador...</span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Menú Desplegable con Búsqueda */}
          {isSelectorOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#0D152B] border border-[#1E2B4D] rounded-xl shadow-2xl p-2 space-y-2 max-h-72 flex flex-col">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o equipo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#070B19] border border-[#1E2B4D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]"
                  autoFocus
                />
              </div>

              <div className="overflow-y-auto space-y-1 flex-1 pr-1 custom-scrollbar">
                {filteredPlayers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No se encontraron jugadores.
                  </div>
                ) : (
                  filteredPlayers.map((p) => {
                    const isSelected = p.id === selectedPlayerId;
                    return (
                      <button
                        key={`${p.type}-${p.id}`}
                        onClick={() => {
                          setSelectedPlayerId(p.id);
                          setIsSelectorOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-[#FDB827]/15 border border-[#FDB827]/40 text-[#FDB827]"
                            : "hover:bg-[#131E3D] text-slate-300"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-[#070B19] shrink-0 border border-[#1E2B4D]">
                            <Image
                              src={p.avatarUrl}
                              alt={p.name}
                              width={24}
                              height={24}
                              className="object-cover"
                              unoptimized
                              onError={(e) => {
                                e.currentTarget.src = p.teamLogo;
                              }}
                            />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-semibold leading-tight text-slate-200">
                              {p.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {p.subtitle}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal de Splits */}
      {loadingProfile ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <Loader2 className="w-7 h-7 text-[#FDB827] animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Calculando splits exhaustivos en Supabase...
          </span>
        </div>
      ) : !profile ? (
        <div className="p-12 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-2">
          <ShieldAlert className="w-8 h-8 text-[#FDB827] mx-auto opacity-70" />
          <p className="text-xs font-mono text-slate-400">
            No se encontraron datos de splits para el jugador seleccionado.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Card del Jugador */}
          <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#070B19] border-2 border-[#FDB827]/40 relative shrink-0 shadow-lg">
                <Image
                  src={profile.playerAvatar}
                  alt={profile.playerName}
                  fill
                  className="object-cover"
                  unoptimized
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== profile.teamLogo) {
                      target.src = profile.teamLogo;
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 relative shrink-0">
                    <Image
                      src={profile.teamLogo}
                      alt={profile.teamAbbr}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {profile.teamName}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#131E3D] border border-[#1E2B4D] text-[#FDB827]">
                    {profile.type === "batter" ? "Bateador" : "Lanzador"}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-100 font-sans tracking-tight">
                  {profile.playerName}
                </h2>

                <div className="text-xs font-mono text-[#FDB827] font-semibold">
                  {profile.overview.slashLine}
                </div>
              </div>
            </div>

            {/* Tarjetas KPI Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  {profile.overview.labelPrimary}
                </div>
                <div className="text-lg font-black text-[#FDB827] font-mono mt-0.5">
                  {profile.overview.kpiPrimary}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">
                  {profile.overview.labelSecondary}
                </div>
                <div className="text-lg font-black text-sky-400 font-mono mt-0.5">
                  {profile.overview.kpiSecondary}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[#070B19] border border-[#1E2B4D] text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Juegos</div>
                <div className="text-lg font-black text-slate-200 font-mono mt-0.5">
                  {profile.totalGames}
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de LOB Tracker si el bateador la tiene disponible */}
          {profile.lobStats && (
            <div className="rounded-xl bg-[#0D152B] border border-[#1E2B4D] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-[#FDB827] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                    LOB Tracker • Dejados en Base
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Oportunidades de remolque con tráfico y corredores dejados en base.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono text-center">
                <div className="bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
                  <div className="text-[9px] text-slate-400">3er Out LOB</div>
                  <div className="text-xs font-bold text-slate-200">
                    {profile.lobStats.lobEnding}
                  </div>
                </div>
                <div className="bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
                  <div className="text-[9px] text-slate-400">RISP LOB (3er Out)</div>
                  <div className="text-xs font-bold text-rose-400">
                    {profile.lobStats.rispLobEnding}
                  </div>
                </div>
                <div className="bg-[#070B19] px-2.5 py-1.5 rounded-lg border border-[#1E2B4D]">
                  <div className="text-[9px] text-slate-400">Total RISP LOB</div>
                  <div className="text-xs font-bold text-[#FDB827]">
                    {profile.lobStats.totalRispLob}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtros de Categorías de Splits */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 ${
                categoryFilter === "all"
                  ? "bg-[#FDB827] text-[#070B19]"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              Todos los Splits
            </button>
            <button
              onClick={() => setCategoryFilter("context")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 ${
                categoryFilter === "context"
                  ? "bg-[#FDB827] text-[#070B19]"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              Contexto & Localía
            </button>
            <button
              onClick={() => setCategoryFilter("situational")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 ${
                categoryFilter === "situational"
                  ? "bg-[#FDB827] text-[#070B19]"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              Situacionales PBP (RISP)
            </button>
            <button
              onClick={() => setCategoryFilter("platoon")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 ${
                categoryFilter === "platoon"
                  ? "bg-[#FDB827] text-[#070B19]"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              Platoon
            </button>
            <button
              onClick={() => setCategoryFilter("opponent")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 ${
                categoryFilter === "opponent"
                  ? "bg-[#FDB827] text-[#070B19]"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              Por Rival
            </button>
            <button
              onClick={() => setCategoryFilter("calendar")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 ${
                categoryFilter === "calendar"
                  ? "bg-[#FDB827] text-[#070B19]"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              Calendario & Meses
            </button>
          </div>

          {/* Grillas de Tablas de Splits por Categoría */}
          <div className="space-y-6">
            {profile.type === "batter" ? (
              <>
                {/* 1. Contexto de Juego */}
                {(categoryFilter === "all" || categoryFilter === "context") && (
                  <SplitTableGroup
                    title="Contexto de Juego & Localía"
                    subtitle="Rendimiento en Casa, Carretera, Horario (Día/Noche) y Resultado del Partido"
                    icon={<MapPin className="w-4 h-4" />}
                    batterRows={profile.contextSplits}
                    badgeCount={profile.contextSplits.length}
                  />
                )}

                {/* 2. Situaciones en Base (PBP) */}
                {(categoryFilter === "all" || categoryFilter === "situational") && (
                  <SplitTableGroup
                    title="Situaciones en Base (PBP)"
                    subtitle="Desglose con Bases Limpias, Corredores en Base, RISP, RISP con 2 Outs y Bases Llenas"
                    icon={<Layers className="w-4 h-4" />}
                    batterRows={profile.situationalSplits}
                    badgeCount={profile.situationalSplits.length}
                  />
                )}

                {/* 3. Platoon */}
                {(categoryFilter === "all" || categoryFilter === "platoon") && (
                  <SplitTableGroup
                    title="Platoon (Lateralidad de Lanzadores)"
                    subtitle="Línea de bateo contra lanzadores derechos (RHP) y lanzadores zurdos (LHP)"
                    icon={<Flame className="w-4 h-4" />}
                    batterRows={profile.platoonSplits}
                    badgeCount={profile.platoonSplits.length}
                  />
                )}

                {/* 4. Segmentos de Entradas & Outs */}
                {(categoryFilter === "all" || categoryFilter === "situational") && (
                  <>
                    <SplitTableGroup
                      title="Segmentos de Inning"
                      subtitle="Apertura (Innings 1 al 3), Desarrollo (4 al 6) y Definición / Clutch (7 al 9+)"
                      icon={<Clock className="w-4 h-4" />}
                      batterRows={profile.inningSplits}
                      badgeCount={profile.inningSplits.length}
                    />

                    <SplitTableGroup
                      title="Por Conteo de Outs"
                      subtitle="Rendimiento según el número de outs al consumir el turno"
                      icon={<Target className="w-4 h-4" />}
                      batterRows={profile.outsSplits}
                      badgeCount={profile.outsSplits.length}
                    />
                  </>
                )}

                {/* 5. Por Rival */}
                {(categoryFilter === "all" || categoryFilter === "opponent") && (
                  <SplitTableGroup
                    title="Rendimiento Frente a Cada Rival LVBP"
                    subtitle="Desglose cara a cara contra las franquicias oponentes de la liga"
                    icon={<Users className="w-4 h-4" />}
                    batterRows={profile.opponentSplits}
                    badgeCount={profile.opponentSplits.length}
                  />
                )}

                {/* 6. Calendario */}
                {(categoryFilter === "all" || categoryFilter === "calendar") && (
                  <SplitTableGroup
                    title="Calendario (Meses & Días de la Semana)"
                    subtitle="Consistencia y evolución temporal a lo largo de la zafra de campeonato"
                    icon={<Calendar className="w-4 h-4" />}
                    batterRows={profile.calendarSplits}
                    badgeCount={profile.calendarSplits.length}
                  />
                )}
              </>
            ) : (
              /* LANZADORES */
              <>
                <SplitTableGroup
                  title="Splits de Efectividad & Contexto del Lanzador"
                  subtitle="Desglose completo de ERA, WHIP, BAA, K/9 y BB/9 según localía, horario, rivales y platoon"
                  icon={<Target className="w-4 h-4" />}
                  pitcherRows={profile.pitcherSplits}
                  isPitcher={true}
                  badgeCount={profile.pitcherSplits?.length}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
