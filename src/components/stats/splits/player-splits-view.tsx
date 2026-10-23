"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  PlayerSplitsProfile,
  PlayerSelectorItem,
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
  SlidersHorizontal,
} from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";

interface PlayerSplitsViewProps {
  initialPlayerId?: number;
  initialType?: "batter" | "pitcher";
  season?: number;
}

export function PlayerSplitsView({
  initialPlayerId,
  initialType = "batter",
  season = 2026,
}: PlayerSplitsViewProps) {
  const [playerType, setPlayerType] = useState<"batter" | "pitcher">(initialType);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    initialPlayerId || (initialType === "batter" ? 605612 : 660508)
  );

  const [playersList, setPlayersList] = useState<PlayerSelectorItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  const [profile, setProfile] = useState<PlayerSplitsProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [loadingList, setLoadingList] = useState<boolean>(false);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Sincronizar props entrantes si cambian por navegación externa
  useEffect(() => {
    if (initialType) setPlayerType(initialType);
    if (initialPlayerId) setSelectedPlayerId(initialPlayerId);
  }, [initialPlayerId, initialType]);

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
  }, [selectedPlayerId, playerType, season]);

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
              const firstBat = playersList.find((p) => p.type === "batter");
              setSelectedPlayerId(firstBat ? firstBat.id : 605612);
              setCategoryFilter("all");
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
              const firstPit = playersList.find((p) => p.type === "pitcher");
              setSelectedPlayerId(firstPit ? firstPit.id : 660508);
              setCategoryFilter("all");
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
                        const target = e.currentTarget;
                        const fallback = getMlbFallbackHeadshotUrl(selectedPlayerMeta.id);
                        if (target.src !== fallback && !target.src.includes("mlbstatic.com")) {
                          target.src = fallback;
                        } else {
                          target.src = selectedPlayerMeta.teamLogo;
                        }
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
                  placeholder="Buscar jugador..."
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
                                const target = e.currentTarget;
                                const fallback = getMlbFallbackHeadshotUrl(p.id);
                                if (target.src !== fallback && !target.src.includes("mlbstatic.com")) {
                                  target.src = fallback;
                                } else {
                                  target.src = p.teamLogo;
                                }
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
            Cargando splits del jugador...
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
                    const mlbFallback = getMlbFallbackHeadshotUrl(profile.playerId);
                    if (target.src !== mlbFallback && !target.src.includes("mlbstatic.com")) {
                      target.src = mlbFallback;
                    } else if (target.src !== profile.teamLogo) {
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

          {/* Pills de Filtrado por Categoría de Splits */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "all"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Todos los Splits</span>
            </button>
            <button
              onClick={() => setCategoryFilter("platoon")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "platoon"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Platoon</span>
            </button>
            <button
              onClick={() => setCategoryFilter("situational")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "situational"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Bases & RISP</span>
            </button>
            <button
              onClick={() => setCategoryFilter("count")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "count"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Target className="w-3 h-3" />
              <span>Conteos & Outs</span>
            </button>
            <button
              onClick={() => setCategoryFilter("inning")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "inning"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Por Entrada</span>
            </button>
            {profile.type === "pitcher" && (
              <button
                onClick={() => setCategoryFilter("role")}
                className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                  categoryFilter === "role"
                    ? "bg-[#FDB827] text-[#070B19] font-bold"
                    : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Rol (SP / RP)</span>
              </button>
            )}
            <button
              onClick={() => setCategoryFilter("context")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "context"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>Localía & Horario</span>
            </button>
            <button
              onClick={() => setCategoryFilter("opponent")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "opponent"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Por Rival</span>
            </button>
            <button
              onClick={() => setCategoryFilter("calendar")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "calendar"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Calendario & Meses</span>
            </button>
          </div>

          {/* Grillas de Tablas de Splits por Categoría */}
          <div className="space-y-6">
            {profile.type === "batter" ? (
              <>
                {/* 1. Platoon (Lateralidad) */}
                {(categoryFilter === "all" || categoryFilter === "platoon") && (
                  <SplitTableGroup
                    title="Lateralidad (Platoon)"
                    subtitle="Línea de bateo contra lanzadores derechos (RHP) y zurdos (LHP)"
                    icon={<Flame className="w-4 h-4" />}
                    batterRows={profile.platoonSplits}
                    badgeCount={profile.platoonSplits.length}
                  />
                )}

                {/* 2. Situaciones en Base & RISP */}
                {(categoryFilter === "all" || categoryFilter === "situational") && (
                  <SplitTableGroup
                    title="Situación de Juego y Corredores"
                    subtitle="Desglose con Bases Limpias, Corredores en Base, RISP, RISP con 2 Outs, Bases Llenas y Leadoff"
                    icon={<Layers className="w-4 h-4" />}
                    batterRows={profile.situationalSplits}
                    badgeCount={profile.situationalSplits.length}
                  />
                )}

                {/* 3. Conteos Clave & Outs */}
                {(categoryFilter === "all" || categoryFilter === "count") && (
                  <>
                    {profile.countSplits && profile.countSplits.length > 0 && (
                      <SplitTableGroup
                        title="Conteos Clave"
                        subtitle="Primer Pitcheo (0-0), Con 2 Strikes y Cuenta Completa (3-2)"
                        icon={<Target className="w-4 h-4" />}
                        batterRows={profile.countSplits}
                        badgeCount={profile.countSplits.length}
                      />
                    )}
                    <SplitTableGroup
                      title="Por Conteo de Outs"
                      subtitle="Rendimiento según el número de outs al consumir el turno"
                      icon={<Target className="w-4 h-4" />}
                      batterRows={profile.outsSplits}
                      badgeCount={profile.outsSplits.length}
                    />
                  </>
                )}

                {/* 4. Por Entradas */}
                {(categoryFilter === "all" || categoryFilter === "inning") && (
                  <SplitTableGroup
                    title="Por Entradas"
                    subtitle="Desglose de producción según el inning del juego"
                    icon={<Clock className="w-4 h-4" />}
                    batterRows={profile.inningSplits}
                    badgeCount={profile.inningSplits.length}
                  />
                )}

                {/* 5. Contexto & Localía */}
                {(categoryFilter === "all" || categoryFilter === "context") && (
                  <SplitTableGroup
                    title="Localía y Horario"
                    subtitle="Rendimiento en Casa, Carretera, Horario (Día/Noche) y Resultado del Partido"
                    icon={<MapPin className="w-4 h-4" />}
                    batterRows={profile.contextSplits}
                    badgeCount={profile.contextSplits.length}
                  />
                )}

                {/* 6. Por Rival */}
                {(categoryFilter === "all" || categoryFilter === "opponent") && (
                  <SplitTableGroup
                    title="Por Equipo Rival"
                    subtitle="Desglose cara a cara contra las franquicias oponentes"
                    icon={<Users className="w-4 h-4" />}
                    batterRows={profile.opponentSplits}
                    badgeCount={profile.opponentSplits.length}
                  />
                )}

                {/* 7. Calendario */}
                {(categoryFilter === "all" || categoryFilter === "calendar") && (
                  <SplitTableGroup
                    title="Calendario y Días de la Semana"
                    subtitle="Consistencia y evolución temporal a lo largo de los meses y días de juego"
                    icon={<Calendar className="w-4 h-4" />}
                    batterRows={profile.calendarSplits}
                    badgeCount={profile.calendarSplits.length}
                  />
                )}
              </>
            ) : (
              /* LANZADORES */
              <>
                {/* 1. Platoon (Lateralidad) */}
                {(categoryFilter === "all" || categoryFilter === "platoon") && (
                  <SplitTableGroup
                    title="Lateralidad (Platoon)"
                    subtitle="Efectividad y dominio contra bateadores derechos (RHB) y zurdos (LHB)"
                    icon={<Flame className="w-4 h-4" />}
                    pitcherRows={profile.pitcherPlatoonSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherPlatoonSplits?.length}
                  />
                )}

                {/* 2. Situación de Juego y Corredores */}
                {(categoryFilter === "all" || categoryFilter === "situational") && (
                  <SplitTableGroup
                    title="Situación de Juego y Corredores"
                    subtitle="Desglose con Bases Limpias, Corredores en Base, RISP, RISP con 2 Outs, Bases Llenas y Leadoff"
                    icon={<Layers className="w-4 h-4" />}
                    pitcherRows={profile.pitcherSituationalSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherSituationalSplits?.length}
                  />
                )}

                {/* 3. Conteos Clave & Outs */}
                {(categoryFilter === "all" || categoryFilter === "count") && (
                  <>
                    {profile.pitcherCountSplits && profile.pitcherCountSplits.length > 0 && (
                      <SplitTableGroup
                        title="Conteos Clave"
                        subtitle="Primer Pitcheo (0-0), Con 2 Strikes y Cuenta Completa (3-2)"
                        icon={<Target className="w-4 h-4" />}
                        pitcherRows={profile.pitcherCountSplits}
                        isPitcher={true}
                        badgeCount={profile.pitcherCountSplits.length}
                      />
                    )}
                    {profile.pitcherOutsSplits && profile.pitcherOutsSplits.length > 0 && (
                      <SplitTableGroup
                        title="Por Conteo de Outs"
                        subtitle="Dominio monticular con 0 Outs, 1 Out y 2 Outs"
                        icon={<Target className="w-4 h-4" />}
                        pitcherRows={profile.pitcherOutsSplits}
                        isPitcher={true}
                        badgeCount={profile.pitcherOutsSplits.length}
                      />
                    )}
                  </>
                )}

                {/* 4. Por Entradas */}
                {(categoryFilter === "all" || categoryFilter === "inning") && (
                  <SplitTableGroup
                    title="Por Entradas"
                    subtitle="Rendimiento y resistencia monticular según el inning del juego"
                    icon={<Clock className="w-4 h-4" />}
                    pitcherRows={profile.pitcherInningSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherInningSplits?.length}
                  />
                )}

                {/* 5. Rol (Abridor vs Relevista) */}
                {(categoryFilter === "all" || categoryFilter === "role") && profile.pitcherRoleSplits && profile.pitcherRoleSplits.length > 0 && (
                  <SplitTableGroup
                    title="Rol de Pitcheo"
                    subtitle="Desempeño según rol asignado: Como Abridor (SP) vs Como Relevista (RP)"
                    icon={<Sparkles className="w-4 h-4" />}
                    pitcherRows={profile.pitcherRoleSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherRoleSplits.length}
                  />
                )}

                {/* 6. Contexto & Localía */}
                {(categoryFilter === "all" || categoryFilter === "context") && (
                  <SplitTableGroup
                    title="Localía y Horario"
                    subtitle="Rendimiento en Casa, Carretera, Horario (Día/Noche) y Resultado del Partido"
                    icon={<MapPin className="w-4 h-4" />}
                    pitcherRows={profile.pitcherContextSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherContextSplits?.length}
                  />
                )}

                {/* 7. Por Rival */}
                {(categoryFilter === "all" || categoryFilter === "opponent") && (
                  <SplitTableGroup
                    title="Por Equipo Rival"
                    subtitle="Desglose monticular cara a cara contra las franquicias oponentes"
                    icon={<Users className="w-4 h-4" />}
                    pitcherRows={profile.pitcherOpponentSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherOpponentSplits?.length}
                  />
                )}

                {/* 8. Calendario */}
                {(categoryFilter === "all" || categoryFilter === "calendar") && (
                  <SplitTableGroup
                    title="Calendario y Días de la Semana"
                    subtitle="Consistencia y evolución temporal a lo largo de los meses y días de juego"
                    icon={<Calendar className="w-4 h-4" />}
                    pitcherRows={profile.pitcherCalendarSplits}
                    isPitcher={true}
                    badgeCount={profile.pitcherCalendarSplits?.length}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
