"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  PlayerSplitsProfile,
  PlayerSelectorItem,
} from "@/types/player-splits";
import { SplitTableGroup } from "./split-table-group";
import { PlayerGeneralStatsCard } from "./player-general-stats-card";
import { LeverageSplitsCard } from "./leverage-splits-card";
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
  ChevronUp,
  Layers,
  MapPin,
  ShieldAlert,
  SlidersHorizontal,
  Gauge,
  TrendingUp,
  Activity,
  ListOrdered,
  BatteryCharging,
} from "lucide-react";
import { getMlbFallbackHeadshotUrl } from "@/lib/constants";
import { useSeason } from "@/context/season-context";

interface PlayerSplitsViewProps {
  initialPlayerId?: number;
  initialType?: "batter" | "pitcher";
  season?: number;
  syncUrl?: boolean;
}

type SelectorRoleFilter = "all" | "batter" | "pitcher";

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function PlayerSplitsView({
  initialPlayerId,
  initialType = "batter",
  season: seasonProp = 2026,
  syncUrl = false,
}: PlayerSplitsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { season: globalSeason, setSeason: setGlobalSeason } = useSeason();

  const [activeSeason, setActiveSeason] = useState<number>(seasonProp);
  const [prevSeasonProp, setPrevSeasonProp] = useState<number>(seasonProp);
  const [prevGlobalSeason, setPrevGlobalSeason] = useState<number>(globalSeason);

  const [playerType, setPlayerType] = useState<"batter" | "pitcher">(initialType);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(
    initialPlayerId ?? null
  );
  const [prevInitialProps, setPrevInitialProps] = useState<{
    id?: number;
    type: "batter" | "pitcher";
  }>({ id: initialPlayerId, type: initialType });

  const [playersList, setPlayersList] = useState<PlayerSelectorItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectorRoleFilter, setSelectorRoleFilter] = useState<SelectorRoleFilter>("all");
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  const [listLoadedSeason, setListLoadedSeason] = useState<number | null>(null);
  const [profileState, setProfileState] = useState<{
    key: string;
    profile: PlayerSplitsProfile | null;
  }>({ key: "", profile: null });

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showCountMatrix, setShowCountMatrix] = useState<boolean>(false);

  const selectorRef = useRef<HTMLDivElement>(null);

  // Sincronización de props entrantes durante render (patrón oficial React 19)
  if (seasonProp !== prevSeasonProp) {
    setPrevSeasonProp(seasonProp);
    setActiveSeason(seasonProp);
  }
  if (globalSeason !== prevGlobalSeason) {
    setPrevGlobalSeason(globalSeason);
    setActiveSeason(globalSeason);
  }
  if (initialPlayerId !== prevInitialProps.id || initialType !== prevInitialProps.type) {
    setPrevInitialProps({ id: initialPlayerId, type: initialType });
    if (initialType) setPlayerType(initialType);
    if (initialPlayerId) setSelectedPlayerId(initialPlayerId);
  }

  // Sincronizar SeasonContext con el parámetro de URL en /jugadores
  useEffect(() => {
    if (syncUrl && seasonProp !== globalSeason) {
      setGlobalSeason(seasonProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, seasonProp]);

  // Cerrar desplegable al hacer clic fuera
  useEffect(() => {
    if (!isSelectorOpen) return;
    function handleOutsideClick(e: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setIsSelectorOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isSelectorOpen]);

  const loadingList = listLoadedSeason !== activeSeason;

  // Cargar lista real de jugadores activos en la temporada seleccionada
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetch(`/api/stats/player-splits?mode=list&season=${activeSeason}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted) return;
        if (Array.isArray(json?.players)) {
          setPlayersList(json.players);
        } else {
          setPlayersList([]);
        }
        setListLoadedSeason(activeSeason);
      })
      .catch((err) => {
        if (!isMounted || (err instanceof Error && err.name === "AbortError")) return;
        console.error("Error al cargar lista de jugadores:", err);
        setListLoadedSeason(activeSeason);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeSeason]);

  // Derivar jugador efectivo válido dentro de la temporada seleccionada
  const effectivePlayerId = useMemo(() => {
    if (loadingList) return selectedPlayerId;
    const matching = playersList.filter((p) => p.type === playerType);
    if (matching.length === 0) return null;
    if (selectedPlayerId && matching.some((p) => p.id === selectedPlayerId)) {
      return selectedPlayerId;
    }
    return matching[0].id;
  }, [loadingList, playersList, playerType, selectedPlayerId]);

  // Sincronizar URL en /jugadores cuando cambia jugador, tipo o temporada
  useEffect(() => {
    if (!syncUrl || loadingList || !effectivePlayerId) return;
    const targetSearch = `?player=${effectivePlayerId}&type=${playerType}&season=${activeSeason}`;
    if (typeof window !== "undefined" && window.location.search === targetSearch) {
      return;
    }
    router.replace(`${pathname}${targetSearch}`, { scroll: false });
  }, [syncUrl, loadingList, effectivePlayerId, playerType, activeSeason, pathname, router]);

  const profileRequestKey =
    !loadingList && effectivePlayerId
      ? `${effectivePlayerId}-${playerType}-${activeSeason}`
      : "";

  // Cargar perfil del jugador seleccionado
  useEffect(() => {
    if (!profileRequestKey || !effectivePlayerId) return;

    let isMounted = true;
    const controller = new AbortController();

    fetch(
      `/api/stats/player-splits?player_id=${effectivePlayerId}&type=${playerType}&season=${activeSeason}`,
      { signal: controller.signal }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted) return;
        setProfileState({
          key: profileRequestKey,
          profile: json?.profile ?? null,
        });
      })
      .catch((err) => {
        if (!isMounted || (err instanceof Error && err.name === "AbortError")) return;
        console.error("Error al cargar perfil de splits:", err);
        setProfileState({ key: profileRequestKey, profile: null });
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [profileRequestKey, effectivePlayerId, playerType, activeSeason]);

  const loadingProfile =
    Boolean(profileRequestKey) && profileState.key !== profileRequestKey;
  const profile =
    profileRequestKey && profileState.key === profileRequestKey
      ? profileState.profile
      : null;

  // Filtrar lista de jugadores sin acentos en bateadores y lanzadores
  const filteredPlayers = useMemo(() => {
    const q = normalizeSearch(searchQuery.trim());
    return playersList.filter((p) => {
      if (selectorRoleFilter !== "all" && p.type !== selectorRoleFilter) {
        return false;
      }
      if (!q) return true;
      return (
        normalizeSearch(p.name || "").includes(q) ||
        normalizeSearch(p.teamAbbr || "").includes(q) ||
        normalizeSearch(p.subtitle || "").includes(q)
      );
    });
  }, [playersList, selectorRoleFilter, searchQuery]);

  const selectedPlayerMeta = useMemo(() => {
    return playersList.find(
      (p) => p.id === effectivePlayerId && p.type === playerType
    );
  }, [playersList, effectivePlayerId, playerType]);

  const batterCountMatrix = profile?.countMatrixSplits ?? [];
  const pitcherCountMatrix = profile?.pitcherCountMatrixSplits ?? [];

  return (
    <div className="space-y-6">
      {/* Barra de Control: Selector de Rol y Buscador Universal de Jugadores */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0D152B] p-3 sm:p-4 rounded-xl border border-[#1E2B4D]">
        {/* Conmutador Bateador / Lanzador */}
        <div className="flex items-center space-x-2 bg-[#070B19] p-1 rounded-xl border border-[#1E2B4D] w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setPlayerType("batter");
              const firstBat = playersList.find((p) => p.type === "batter");
              setSelectedPlayerId(firstBat ? firstBat.id : null);
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
            type="button"
            onClick={() => {
              setPlayerType("pitcher");
              const firstPit = playersList.find((p) => p.type === "pitcher");
              setSelectedPlayerId(firstPit ? firstPit.id : null);
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

        {/* Buscador Desplegable de Todos los Jugadores (Sin Acentos) */}
        <div ref={selectorRef} className="relative w-full md:w-96">
          <button
            type="button"
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
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#131E3D] border border-[#1E2B4D] text-slate-300 shrink-0">
                    {selectedPlayerMeta.type === "batter" ? "BAT" : "LAN"}
                  </span>
                </>
              ) : (
                <span className="text-slate-400">
                  {loadingList ? "Cargando jugadores activos..." : "Seleccionar Jugador..."}
                </span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </button>

          {/* Menú Desplegable con Búsqueda Universal */}
          {isSelectorOpen && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-[#0D152B] border border-[#1E2B4D] rounded-xl shadow-2xl p-2 space-y-2 max-h-80 flex flex-col">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar bateador o lanzador sin acentos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#070B19] border border-[#1E2B4D] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FDB827]"
                  autoFocus
                />
              </div>

              {/* Filtro de Rol en Buscador */}
              <div className="flex items-center gap-1 bg-[#070B19] p-1 rounded-lg border border-[#1E2B4D]">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "batter", label: "Bateadores" },
                    { id: "pitcher", label: "Lanzadores" },
                  ] as const
                ).map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setSelectorRoleFilter(rf.id)}
                    className={`flex-1 py-1 rounded text-[10px] font-semibold transition-colors ${
                      selectorRoleFilter === rf.id
                        ? "bg-[#FDB827] text-[#070B19] font-bold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto space-y-1 flex-1 pr-1 custom-scrollbar">
                {filteredPlayers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    No se encontraron jugadores activos en esta temporada.
                  </div>
                ) : (
                  filteredPlayers.map((p) => {
                    const isSelected = p.id === effectivePlayerId && p.type === playerType;
                    return (
                      <button
                        key={`${p.type}-${p.id}`}
                        type="button"
                        onClick={() => {
                          if (p.type !== playerType) {
                            setCategoryFilter("all");
                          }
                          setPlayerType(p.type);
                          setSelectedPlayerId(p.id);
                          setIsSelectorOpen(false);
                          setSearchQuery("");
                        }}
                        className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-[#FDB827]/15 border border-[#FDB827]/40 text-[#FDB827]"
                            : "hover:bg-[#131E3D] text-slate-300"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
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
                          <div className="min-w-0">
                            <div className="text-xs font-semibold leading-tight text-slate-200 truncate">
                              {p.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {p.subtitle}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            p.type === "batter"
                              ? "bg-sky-500/10 text-sky-300 border-sky-500/30"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {p.type === "batter" ? "Bateador" : "Lanzador"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido Principal */}
      {loadingProfile || loadingList ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 rounded-xl bg-[#0D152B] border border-[#1E2B4D]">
          <Loader2 className="w-7 h-7 text-[#FDB827] animate-spin" />
          <span className="text-xs font-mono text-slate-400">
            Cargando ficha y splits oficiales del jugador...
          </span>
        </div>
      ) : !profile ? (
        <div className="p-12 text-center rounded-xl bg-[#0D152B] border border-[#1E2B4D] space-y-2">
          <ShieldAlert className="w-8 h-8 text-[#FDB827] mx-auto opacity-70" />
          <p className="text-xs font-mono text-slate-400">
            No se encontraron datos de splits para el jugador seleccionado en la temporada {activeSeason}-{String(activeSeason + 1).slice(-2)}.
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
                <div className="flex flex-wrap items-center gap-2">
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#070B19] border border-[#1E2B4D] text-slate-300">
                    LVBP {profile.season}-{String(profile.season + 1).slice(-2)}
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

          {/* Ficha Superior Estilo Baseball-Reference: Stats Generales, Defensivo y Bitácora */}
          <PlayerGeneralStatsCard profile={profile} />

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
              type="button"
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
              type="button"
              onClick={() => setCategoryFilter("leverage")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "leverage"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Gauge className="w-3 h-3" />
              <span>Presión &amp; Leverage</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("trend")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "trend"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Tendencia Reciente</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("score")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "score"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Marcador e Inercia</span>
            </button>
            <button
              type="button"
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
              type="button"
              onClick={() => setCategoryFilter("situational")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "situational"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Bases &amp; RISP</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("count")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "count"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Target className="w-3 h-3" />
              <span>Conteos &amp; Outs</span>
            </button>
            <button
              type="button"
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
            {profile.type === "batter" ? (
              <button
                type="button"
                onClick={() => setCategoryFilter("lineup")}
                className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                  categoryFilter === "lineup"
                    ? "bg-[#FDB827] text-[#070B19] font-bold"
                    : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
                }`}
              >
                <ListOrdered className="w-3 h-3" />
                <span>Orden al Bate y Bases</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
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
                <button
                  type="button"
                  onClick={() => setCategoryFilter("fatigue")}
                  className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                    categoryFilter === "fatigue"
                      ? "bg-[#FDB827] text-[#070B19] font-bold"
                      : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
                  }`}
                >
                  <BatteryCharging className="w-3 h-3" />
                  <span>Uso y Descanso</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setCategoryFilter("context")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "context"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <MapPin className="w-3 h-3" />
              <span>Localía &amp; Horario</span>
            </button>
            <button
              type="button"
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
              type="button"
              onClick={() => setCategoryFilter("calendar")}
              className={`px-3 py-1.5 rounded-lg font-mono font-semibold transition-colors shrink-0 flex items-center space-x-1.5 ${
                categoryFilter === "calendar"
                  ? "bg-[#FDB827] text-[#070B19] font-bold"
                  : "bg-[#0D152B] text-slate-400 hover:text-slate-200 border border-[#1E2B4D]"
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Calendario &amp; Meses</span>
            </button>
          </div>

          {/* Grillas de Tablas de Splits por Categoría */}
          <div className="space-y-6">
            {/* 0. Presión & Leverage Index (Paralelo vía /api/stats/player-leverage) */}
            {(categoryFilter === "all" || categoryFilter === "leverage") && (
              <LeverageSplitsCard
                playerId={profile.playerId}
                type={profile.type}
                season={profile.season}
                lateCloseBatterRows={profile.lateCloseSplits}
                lateClosePitcherRows={profile.pitcherLateCloseSplits}
              />
            )}

            {profile.type === "batter" ? (
              <>
                {/* Tendencia Reciente */}
                {(categoryFilter === "all" || categoryFilter === "trend") &&
                  profile.trendSplits &&
                  profile.trendSplits.length > 0 && (
                    <SplitTableGroup
                      title="Tendencia Reciente"
                      subtitle="Producción ofensiva en los últimos 7, 15 y 30 días"
                      icon={<TrendingUp className="w-4 h-4" />}
                      batterRows={profile.trendSplits}
                      badgeCount={profile.trendSplits.length}
                    />
                  )}

                {/* Estado del Marcador e Inercia */}
                {(categoryFilter === "all" || categoryFilter === "score") &&
                  profile.scoreSplits &&
                  profile.scoreSplits.length > 0 && (
                    <SplitTableGroup
                      title="Marcador e Inercia del Partido"
                      subtitle="Equipo arriba, empatado, abajo y turnos con la carrera del empate o ventaja"
                      icon={<Activity className="w-4 h-4" />}
                      batterRows={profile.scoreSplits}
                      badgeCount={profile.scoreSplits.length}
                    />
                  )}

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
                  <>
                    <SplitTableGroup
                      title="Situación de Juego y Corredores"
                      subtitle="Desglose con Bases Limpias, Corredores en Base, RISP, RISP con 2 Outs, Bases Llenas y Leadoff"
                      icon={<Layers className="w-4 h-4" />}
                      batterRows={profile.situationalSplits}
                      badgeCount={profile.situationalSplits.length}
                    />
                    {profile.exactBaseSplits && profile.exactBaseSplits.length > 0 && (
                      <SplitTableGroup
                        title="Bases Exactas"
                        subtitle="Combinación exacta de corredores en base (1B, 2B, 3B, 1B+2B, 1B+3B, 2B+3B, <2 outs, etc.)"
                        icon={<Layers className="w-4 h-4" />}
                        batterRows={profile.exactBaseSplits}
                        badgeCount={profile.exactBaseSplits.length}
                      />
                    )}
                  </>
                )}

                {/* 3. Conteos Clave, Avanzados, Matriz 12 Conteos & Outs */}
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
                    {profile.detailedCountSplits && profile.detailedCountSplits.length > 0 && (
                      <SplitTableGroup
                        title="Conteos Avanzados"
                        subtitle="Bateador adelante en la cuenta, atrás en la cuenta y en cuenta pareja"
                        icon={<Target className="w-4 h-4" />}
                        batterRows={profile.detailedCountSplits}
                        badgeCount={profile.detailedCountSplits.length}
                      />
                    )}
                    {batterCountMatrix.length > 0 && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowCountMatrix((prev) => !prev)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0D152B] hover:bg-[#131E3D] border border-[#1E2B4D] hover:border-[#FDB827]/50 text-xs font-mono font-semibold text-slate-200 transition-colors"
                        >
                          <Target className="w-3.5 h-3.5 text-[#FDB827]" />
                          <span>
                            {showCountMatrix
                              ? "Ocultar Matriz de 12 Conteos (0-0 a 3-2)"
                              : `Ver Matriz de 12 Conteos (0-0 a 3-2) (${batterCountMatrix.length})`}
                          </span>
                          {showCountMatrix ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#FDB827]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {showCountMatrix && (
                          <SplitTableGroup
                            title="Matriz Completa de Conteos (0-0 a 3-2)"
                            subtitle="Rendimiento desglosado en cada conteo específico de bolas y strikes"
                            icon={<Target className="w-4 h-4" />}
                            batterRows={batterCountMatrix}
                            badgeCount={batterCountMatrix.length}
                          />
                        )}
                      </div>
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

                {/* Orden al Bate y Bases Exactas */}
                {categoryFilter === "lineup" && (
                  <>
                    {profile.lineupSplits && profile.lineupSplits.length > 0 && (
                      <SplitTableGroup
                        title="Posición en el Orden al Bate y Emergente"
                        subtitle="Producción del 1ro al 9no bate, Bateador Designado (DH) y Emergente (PH)"
                        icon={<ListOrdered className="w-4 h-4" />}
                        batterRows={profile.lineupSplits}
                        badgeCount={profile.lineupSplits.length}
                      />
                    )}
                    {profile.exactBaseSplits && profile.exactBaseSplits.length > 0 && (
                      <SplitTableGroup
                        title="Bases Exactas"
                        subtitle="Combinación exacta de corredores en circulación al tomar el turno"
                        icon={<Layers className="w-4 h-4" />}
                        batterRows={profile.exactBaseSplits}
                        badgeCount={profile.exactBaseSplits.length}
                      />
                    )}
                  </>
                )}
                {categoryFilter === "all" &&
                  profile.lineupSplits &&
                  profile.lineupSplits.length > 0 && (
                    <SplitTableGroup
                      title="Posición en el Orden al Bate y Emergente"
                      subtitle="Producción del 1ro al 9no bate, Bateador Designado (DH) y Emergente (PH)"
                      icon={<ListOrdered className="w-4 h-4" />}
                      batterRows={profile.lineupSplits}
                      badgeCount={profile.lineupSplits.length}
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
                {/* Tendencia Reciente */}
                {(categoryFilter === "all" || categoryFilter === "trend") &&
                  profile.pitcherTrendSplits &&
                  profile.pitcherTrendSplits.length > 0 && (
                    <SplitTableGroup
                      title="Tendencia Reciente"
                      subtitle="Efectividad y comando en los últimos 7, 15 y 30 días"
                      icon={<TrendingUp className="w-4 h-4" />}
                      pitcherRows={profile.pitcherTrendSplits}
                      isPitcher={true}
                      badgeCount={profile.pitcherTrendSplits.length}
                    />
                  )}

                {/* Marcador e Inercia */}
                {(categoryFilter === "all" || categoryFilter === "score") &&
                  profile.pitcherScoreSplits &&
                  profile.pitcherScoreSplits.length > 0 && (
                    <SplitTableGroup
                      title="Marcador e Inercia del Partido"
                      subtitle="Lanzando con ventaja, empate, desventaja o con la carrera del empate/ventaja al bate"
                      icon={<Activity className="w-4 h-4" />}
                      pitcherRows={profile.pitcherScoreSplits}
                      isPitcher={true}
                      badgeCount={profile.pitcherScoreSplits.length}
                    />
                  )}

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
                  <>
                    <SplitTableGroup
                      title="Situación de Juego y Corredores"
                      subtitle="Desglose con Bases Limpias, Corredores en Base, RISP, RISP con 2 Outs, Bases Llenas y Leadoff"
                      icon={<Layers className="w-4 h-4" />}
                      pitcherRows={profile.pitcherSituationalSplits}
                      isPitcher={true}
                      badgeCount={profile.pitcherSituationalSplits?.length}
                    />
                    {profile.pitcherExactBaseSplits &&
                      profile.pitcherExactBaseSplits.length > 0 && (
                        <SplitTableGroup
                          title="Bases Exactas"
                          subtitle="Combinación exacta de corredores en base enfrentados"
                          icon={<Layers className="w-4 h-4" />}
                          pitcherRows={profile.pitcherExactBaseSplits}
                          isPitcher={true}
                          badgeCount={profile.pitcherExactBaseSplits.length}
                        />
                      )}
                  </>
                )}

                {/* 3. Conteos Clave, Avanzados, Matriz 12 Conteos & Outs */}
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
                    {profile.pitcherDetailedCountSplits &&
                      profile.pitcherDetailedCountSplits.length > 0 && (
                        <SplitTableGroup
                          title="Conteos Avanzados"
                          subtitle="Lanzador adelante en la cuenta, atrás en la cuenta y cuenta pareja"
                          icon={<Target className="w-4 h-4" />}
                          pitcherRows={profile.pitcherDetailedCountSplits}
                          isPitcher={true}
                          badgeCount={profile.pitcherDetailedCountSplits.length}
                        />
                      )}
                    {pitcherCountMatrix.length > 0 && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowCountMatrix((prev) => !prev)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0D152B] hover:bg-[#131E3D] border border-[#1E2B4D] hover:border-[#FDB827]/50 text-xs font-mono font-semibold text-slate-200 transition-colors"
                        >
                          <Target className="w-3.5 h-3.5 text-[#FDB827]" />
                          <span>
                            {showCountMatrix
                              ? "Ocultar Matriz de 12 Conteos (0-0 a 3-2)"
                              : `Ver Matriz de 12 Conteos (0-0 a 3-2) (${pitcherCountMatrix.length})`}
                          </span>
                          {showCountMatrix ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[#FDB827]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>

                        {showCountMatrix && (
                          <SplitTableGroup
                            title="Matriz Completa de Conteos (0-0 a 3-2)"
                            subtitle="Dominio monticular desglosado en cada conteo de bolas y strikes"
                            icon={<Target className="w-4 h-4" />}
                            pitcherRows={pitcherCountMatrix}
                            isPitcher={true}
                            badgeCount={pitcherCountMatrix.length}
                          />
                        )}
                      </div>
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
                {(categoryFilter === "all" || categoryFilter === "role") &&
                  profile.pitcherRoleSplits &&
                  profile.pitcherRoleSplits.length > 0 && (
                    <SplitTableGroup
                      title="Rol de Pitcheo"
                      subtitle="Desempeño según rol asignado: Como Abridor (SP) vs Como Relevista (RP)"
                      icon={<Sparkles className="w-4 h-4" />}
                      pitcherRows={profile.pitcherRoleSplits}
                      isPitcher={true}
                      badgeCount={profile.pitcherRoleSplits.length}
                    />
                  )}

                {/* Uso, Descanso y Fatiga */}
                {(categoryFilter === "all" || categoryFilter === "fatigue") && (
                  <>
                    {profile.pitcherRestSplits && profile.pitcherRestSplits.length > 0 && (
                      <SplitTableGroup
                        title="Días de Descanso"
                        subtitle="Rendimiento según días de reposo entre salidas (0 a 5+ días)"
                        icon={<BatteryCharging className="w-4 h-4" />}
                        pitcherRows={profile.pitcherRestSplits}
                        isPitcher={true}
                        badgeCount={profile.pitcherRestSplits.length}
                      />
                    )}
                    {profile.pitcherFatigueSplits &&
                      profile.pitcherFatigueSplits.length > 0 && (
                        <SplitTableGroup
                          title="Uso, Primer Pitcheo y Carga de Lanzamientos"
                          subtitle="Primer lanzamiento vs primer bateador del inning y tramos de conteo de pitcheos (1-15 a 106+)"
                          icon={<BatteryCharging className="w-4 h-4" />}
                          pitcherRows={profile.pitcherFatigueSplits}
                          isPitcher={true}
                          badgeCount={profile.pitcherFatigueSplits.length}
                        />
                      )}
                  </>
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
